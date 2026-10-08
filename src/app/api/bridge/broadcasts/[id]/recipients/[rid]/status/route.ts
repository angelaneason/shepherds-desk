// Phone Bridge: per-person status during a bridge broadcast (phone, signed).
//   POST { status: sending|sent|delivered|failed|skipped|cancelled, skip_reason?, error_code?, segments? }
//     -> { recipient_id, status, changed }
// Idempotent: repeating the current status is a 200 no-op, and a final status
// never moves backwards. The phone uses the recipient id as its duplicate
// protection key. Counts and auto-complete are maintained by DB triggers;
// the copied number is wiped by trigger at a final status.
import { audit, fail, getBridgeServiceClient, isUuid, ok, type AuditEvent } from '@/lib/bridge/auth'
import { verifySignedRequest } from '@/lib/bridge/deviceSig'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Incoming = 'sending' | 'sent' | 'delivered' | 'failed' | 'skipped' | 'cancelled'
const INCOMING: Incoming[] = ['sending', 'sent', 'delivered', 'failed', 'skipped', 'cancelled']

// current status -> statuses it may move to
const NEXT: Record<string, Incoming[]> = {
  queued: ['sending', 'sent', 'delivered', 'failed', 'skipped', 'cancelled'],
  sending: ['sent', 'delivered', 'failed', 'cancelled'],
  sent: ['delivered'],
  delivered: [],
  failed: [],
  skipped: [],
  cancelled: [],
}

// The phone may only skip for reasons it can see itself.
const PHONE_SKIP_REASONS = ['do_not_text', 'user_skipped']

const AUDIT: Partial<Record<Incoming, AuditEvent>> = { sent: 'sent', delivered: 'delivered', failed: 'failed' }

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; rid: string }> },
) {
  try {
    const v = await verifySignedRequest(request)
    if (!v.ok) return v.response
    const { device, json } = v.ctx
    const { id, rid } = await params
    if (!isUuid(id) || !isUuid(rid)) return fail(404, 'not_found')
    if (!json) return fail(400, 'bad_json')

    const target = json.status as Incoming
    if (!INCOMING.includes(target)) return fail(400, 'invalid_status')
    const skipReason = target === 'skipped'
      ? (PHONE_SKIP_REASONS.includes(String(json.skip_reason)) ? String(json.skip_reason) : 'do_not_text')
      : null
    const errorCode = typeof json.error_code === 'string' ? json.error_code.slice(0, 100) : null
    const segments = Number.isInteger(json.segments) && (json.segments as number) > 0 && (json.segments as number) < 50
      ? (json.segments as number) : null

    const admin = getBridgeServiceClient()
    const { data: b } = await admin
      .from('broadcasts')
      .select('id, profile_id, channel, status, device_id')
      .eq('id', id)
      .eq('profile_id', device.profile_id)
      .maybeSingle()
    if (!b || b.channel !== 'bridge' || b.device_id !== device.id) return fail(404, 'not_found', 'Broadcast not found')

    const { data: r } = await admin
      .from('broadcast_recipients')
      .select('id, member_id, status')
      .eq('id', rid)
      .eq('broadcast_id', id)
      .maybeSingle()
    if (!r) return fail(404, 'not_found', 'Recipient not found')

    if (r.status === target) return ok({ recipient_id: rid, status: r.status, changed: false })
    if (!(NEXT[r.status] || []).includes(target)) {
      // Late or repeated reports for a person already finished are harmless.
      return ok({ recipient_id: rid, status: r.status, changed: false, ignored: `${r.status} -> ${target}` })
    }
    // New sends are only allowed while the broadcast is running.
    if (['sending', 'sent'].includes(target) && r.status === 'queued' && b.status !== 'sending') {
      return fail(409, 'broadcast_not_sending', `Broadcast is ${b.status}`, { status: b.status })
    }

    const patch: Record<string, unknown> = { status: target, skip_reason: skipReason }
    if (target === 'failed' && errorCode) patch.error_code = errorCode
    if (segments) patch.segments = segments

    const { data: updated, error } = await admin
      .from('broadcast_recipients')
      .update(patch)
      .eq('id', rid)
      .eq('status', r.status)
      .select('status')
    if (error) throw error
    if (!updated?.length) return fail(409, 'conflict', 'Recipient changed at the same time; fetch and retry')

    const event = AUDIT[target]
    if (event) {
      await audit({
        profile_id: b.profile_id, event, member_id: r.member_id, broadcast_id: id,
        broadcast_recipient_id: rid, device_id: device.id, status: errorCode || target,
      })
    }
    return ok({ recipient_id: rid, status: target, changed: true })
  } catch (e) {
    console.error('[bridge] recipient status error', (e as Error)?.message)
    return fail(500, 'server_error')
  }
}
