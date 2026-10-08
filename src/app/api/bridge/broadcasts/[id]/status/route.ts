// Phone Bridge: broadcast-level status from the phone (signed).
//   POST { action: approved | paused | resumed | cancelled | completed }
//     -> { broadcast_id, status, changed }
// approved  : awaiting_phone_approval -> sending (after BiometricPrompt on the phone).
//             Too late (past the approval timeout) -> 410 expired, nothing is sent.
// paused    : sending -> paused     resumed: paused -> sending
// cancelled : any unfinished -> cancelled (a DB trigger cancels everyone still queued)
// completed : the phone finished its queue; counts are recomputed and the
//             broadcast becomes completed / completed_with_issues.
// Repeating the current state is a 200 no-op.
import { audit, fail, getBridgeServiceClient, isUuid, ok, type AuditEvent } from '@/lib/bridge/auth'
import { verifySignedRequest } from '@/lib/bridge/deviceSig'
import { getEffectiveConfig } from '@/lib/bridge/limits'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Action = 'approved' | 'paused' | 'resumed' | 'cancelled' | 'completed'
const ACTIONS: Action[] = ['approved', 'paused', 'resumed', 'cancelled', 'completed']

const RULES: Record<Action, { from: string[]; to: string | null; event: AuditEvent }> = {
  approved: { from: ['awaiting_phone_approval'], to: 'sending', event: 'broadcast_approved' },
  paused: { from: ['sending'], to: 'paused', event: 'broadcast_paused' },
  resumed: { from: ['paused'], to: 'sending', event: 'broadcast_resumed' },
  cancelled: { from: ['awaiting_phone_approval', 'sending', 'paused'], to: 'cancelled', event: 'broadcast_cancelled' },
  completed: { from: ['sending', 'paused'], to: null, event: 'broadcast_completed' },
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const v = await verifySignedRequest(request)
    if (!v.ok) return v.response
    const { device, json } = v.ctx
    const { id } = await params
    if (!isUuid(id)) return fail(404, 'not_found')
    if (!json) return fail(400, 'bad_json')
    const action = json.action as Action
    if (!ACTIONS.includes(action)) return fail(400, 'invalid_action')

    const admin = getBridgeServiceClient()
    const { data: b } = await admin
      .from('broadcasts')
      .select('id, profile_id, channel, status, device_id, created_at')
      .eq('id', id)
      .eq('profile_id', device.profile_id)
      .maybeSingle()
    if (!b || b.channel !== 'bridge' || b.device_id !== device.id) return fail(404, 'not_found', 'Broadcast not found')

    const rule = RULES[action]
    const doneAlready =
      (rule.to && b.status === rule.to) ||
      (action === 'completed' && ['completed', 'completed_with_issues'].includes(b.status))
    if (doneAlready) return ok({ broadcast_id: id, status: b.status, changed: false })
    if (!rule.from.includes(b.status)) {
      return fail(409, 'illegal_transition', `Cannot ${action} a broadcast that is ${b.status}`, { status: b.status })
    }

    const now = new Date().toISOString()

    if (action === 'approved') {
      const config = await getEffectiveConfig(device.profile_id)
      const deadline = new Date(b.created_at).getTime() + config.approval_timeout_min * 60 * 1000
      if (Date.now() > deadline) {
        await admin.from('broadcasts').update({ status: 'expired', completed_at: now })
          .eq('id', id).eq('status', 'awaiting_phone_approval')
        return fail(410, 'expired', 'This broadcast expired before it was approved')
      }
    }

    if (action === 'completed') {
      const { error: rcErr } = await admin.rpc('broadcast_recount', { p_broadcast_id: id })
      if (rcErr) throw rcErr
      const { data: after } = await admin.from('broadcasts').select('status').eq('id', id).single()
      await audit({ profile_id: b.profile_id, event: rule.event, broadcast_id: id, device_id: device.id, status: after?.status || null })
      return ok({ broadcast_id: id, status: after?.status, changed: after?.status !== b.status })
    }

    const patch: Record<string, unknown> = { status: rule.to }
    if (action === 'approved') { patch.approved_at = now; patch.started_at = now }
    if (action === 'cancelled') patch.completed_at = now

    const { data: updated, error } = await admin
      .from('broadcasts')
      .update(patch)
      .eq('id', id)
      .eq('status', b.status)   // no lost updates if two reports race
      .select('status')
    if (error) throw error
    if (!updated?.length) return fail(409, 'conflict', 'Broadcast changed at the same time; fetch and retry')

    await audit({ profile_id: b.profile_id, event: rule.event, broadcast_id: id, device_id: device.id, status: rule.to })
    return ok({ broadcast_id: id, status: rule.to, changed: true })
  } catch (e) {
    console.error('[bridge] broadcast status error', (e as Error)?.message)
    return fail(500, 'server_error')
  }
}
