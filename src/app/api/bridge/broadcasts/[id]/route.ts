// Phone Bridge: fetch a broadcast for approval / sending (phone, signed).
//   GET -> { broadcast: {id, body, status, total, ...}, recipients: [...queued], config }
// Only while the broadcast is waiting for approval, sending or paused, and
// only for the phone it was created for. Recipients listed are the ones still
// queued (or mid-send), in order. The phone fills in {first_name} itself.
import { fail, getBridgeServiceClient, isUuid, ok } from '@/lib/bridge/auth'
import { verifySignedRequest } from '@/lib/bridge/deviceSig'
import { getEffectiveConfig } from '@/lib/bridge/limits'
import { firstName } from '@/lib/bridge/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const v = await verifySignedRequest(request)
    if (!v.ok) return v.response
    const { device } = v.ctx
    const { id } = await params
    if (!isUuid(id)) return fail(404, 'not_found')

    const admin = getBridgeServiceClient()
    const { data: b } = await admin
      .from('broadcasts')
      .select('id, profile_id, body, channel, status, device_id, device_label_snapshot, created_at, approved_at, started_at, total, sent, delivered, failed, skipped')
      .eq('id', id)
      .eq('profile_id', device.profile_id)
      .maybeSingle()
    if (!b || b.channel !== 'bridge' || (b.device_id && b.device_id !== device.id)) {
      return fail(404, 'not_found', 'Broadcast not found')
    }
    if (!['awaiting_phone_approval', 'sending', 'paused'].includes(b.status)) {
      return fail(410, 'not_active', 'This broadcast is no longer active', { status: b.status })
    }

    const config = await getEffectiveConfig(device.profile_id)
    if (b.status === 'awaiting_phone_approval') {
      const deadline = new Date(b.created_at).getTime() + config.approval_timeout_min * 60 * 1000
      if (Date.now() > deadline) return fail(410, 'expired', 'This broadcast expired before it was approved')
    }

    const { data: rows, error } = await admin
      .from('broadcast_recipients')
      .select('id, name_snapshot, position, status, to_e164, members(full_name)')
      .eq('broadcast_id', id)
      .in('status', ['queued', 'sending'])
      .order('position')
    if (error) throw error

    const recipients = (rows || [])
      .filter(r => r.to_e164)
      .map(r => {
        const name = (r.members as unknown as { full_name?: string } | null)?.full_name || r.name_snapshot
        return { id: r.id, name, first_name: firstName(name), to_e164: r.to_e164, position: r.position, status: r.status }
      })

    return ok({
      broadcast: {
        id: b.id, body: b.body, status: b.status, created_at: b.created_at,
        approved_at: b.approved_at, started_at: b.started_at,
        total: b.total, sent: b.sent, delivered: b.delivered, failed: b.failed, skipped: b.skipped,
        approval_deadline: new Date(new Date(b.created_at).getTime() + config.approval_timeout_min * 60 * 1000).toISOString(),
      },
      recipients,
      config,
    })
  } catch (e) {
    console.error('[bridge] broadcast fetch error', (e as Error)?.message)
    return fail(500, 'server_error')
  }
}
