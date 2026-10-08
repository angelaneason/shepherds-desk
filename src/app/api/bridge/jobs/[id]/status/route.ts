// Phone Bridge: report a 1:1 job status (phone, signed).
//   POST { status: awaiting_approval|approved|rejected|sending|sent|delivered|failed, error_code? }
//     -> { job_id, status, changed }
// Legal transitions only; repeating the current status is a 200 no-op.
// 'approved' is recorded in the audit log and moves the job to 'sending'.
// Final statuses wipe the text and number (DB trigger).
import { audit, fail, getBridgeServiceClient, isUuid, ok, type AuditEvent } from '@/lib/bridge/auth'
import { verifySignedRequest } from '@/lib/bridge/deviceSig'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Incoming = 'awaiting_approval' | 'approved' | 'rejected' | 'sending' | 'sent' | 'delivered' | 'failed'
const INCOMING: Incoming[] = ['awaiting_approval', 'approved', 'rejected', 'sending', 'sent', 'delivered', 'failed']

// current DB status -> DB statuses it may move to
const NEXT: Record<string, string[]> = {
  queued: ['awaiting_approval', 'sending', 'rejected', 'sent', 'delivered', 'failed'],
  awaiting_approval: ['sending', 'rejected', 'sent', 'delivered', 'failed'],
  sending: ['sent', 'delivered', 'failed'],
  sent: ['delivered'],
  // The phone finished after the server had already expired the job: record what happened.
  expired: ['sent', 'delivered', 'failed'],
  delivered: [],
  failed: [],
  rejected: [],
  cancelled: [],
}

const AUDIT: Partial<Record<Incoming, AuditEvent>> = {
  approved: 'approved', rejected: 'rejected', sent: 'sent', delivered: 'delivered', failed: 'failed',
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const v = await verifySignedRequest(request)
    if (!v.ok) return v.response
    const { device, json } = v.ctx
    const { id } = await params
    if (!isUuid(id)) return fail(404, 'not_found')
    if (!json) return fail(400, 'bad_json')

    const incoming = json.status as Incoming
    if (!INCOMING.includes(incoming)) return fail(400, 'invalid_status')
    const target = incoming === 'approved' ? 'sending' : incoming
    const errorCode = typeof json.error_code === 'string' ? json.error_code.slice(0, 100) : null

    const admin = getBridgeServiceClient()
    const { data: job } = await admin
      .from('bridge_send_jobs')
      .select('id, profile_id, device_id, member_id, status, expires_at')
      .eq('id', id)
      .eq('profile_id', device.profile_id)
      .maybeSingle()
    if (!job || job.device_id !== device.id) return fail(404, 'not_found', 'Job not found')

    if (job.status === target) return ok({ job_id: id, status: job.status, changed: false })

    const expired = new Date(job.expires_at).getTime() <= Date.now()
    if (expired && ['queued', 'awaiting_approval'].includes(job.status) && ['awaiting_approval', 'sending', 'rejected'].includes(target)) {
      const { data: x } = await admin.from('bridge_send_jobs')
        .update({ status: 'expired' }).eq('id', id).eq('status', job.status).select('id')
      if (x?.length) {
        await audit({ profile_id: job.profile_id, event: 'expired', member_id: job.member_id, job_id: id, device_id: device.id, status: 'expired' })
      }
      return fail(410, 'expired', 'This text expired before it was approved')
    }

    if (!(NEXT[job.status] || []).includes(target)) {
      return fail(409, 'illegal_transition', `Cannot go from ${job.status} to ${incoming}`, { status: job.status })
    }

    const patch: Record<string, unknown> = { status: target }
    if (errorCode && target === 'failed') patch.error_code = errorCode
    const { data: updated, error } = await admin
      .from('bridge_send_jobs')
      .update(patch)
      .eq('id', id)
      .eq('status', job.status)   // no lost updates if two reports race
      .select('status')
    if (error) throw error
    if (!updated?.length) return fail(409, 'conflict', 'Job changed at the same time; fetch and retry')

    const event = AUDIT[incoming]
    if (event) {
      await audit({ profile_id: job.profile_id, event, member_id: job.member_id, job_id: id, device_id: device.id, status: errorCode || target })
    }
    return ok({ job_id: id, status: target, changed: true })
  } catch (e) {
    console.error('[bridge] job status error', (e as Error)?.message)
    return fail(500, 'server_error')
  }
}
