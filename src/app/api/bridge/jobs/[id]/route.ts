// Phone Bridge: fetch a 1:1 job (phone, signed).
//   GET -> { job: { id, body, to_e164, member: {id, full_name, first_name},
//                   browser_session_label, created_at, expires_at, segments, status } }
// Only while the job is queued / awaiting approval and not expired; else 410.
import { fail, getBridgeServiceClient, isUuid, ok } from '@/lib/bridge/auth'
import { verifySignedRequest } from '@/lib/bridge/deviceSig'
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

    const { data: job } = await getBridgeServiceClient()
      .from('bridge_send_jobs')
      .select('id, profile_id, device_id, member_id, body, to_e164, segments, status, browser_session_label, created_at, expires_at, members(full_name)')
      .eq('id', id)
      .eq('profile_id', device.profile_id)
      .maybeSingle()
    if (!job || job.device_id !== device.id) return fail(404, 'not_found', 'Job not found')

    const live = ['queued', 'awaiting_approval'].includes(job.status) && new Date(job.expires_at).getTime() > Date.now()
    if (!live || !job.body || !job.to_e164) {
      return fail(410, 'gone', 'This text is no longer waiting to be sent', { status: job.status })
    }

    const m = job.members as unknown as { full_name?: string } | null
    const fullName = m?.full_name || ''
    return ok({
      job: {
        id: job.id,
        body: job.body,
        to_e164: job.to_e164,
        segments: job.segments,
        status: job.status,
        member: { id: job.member_id, full_name: fullName, first_name: firstName(fullName) },
        browser_session_label: job.browser_session_label,
        created_at: job.created_at,
        expires_at: job.expires_at,
      },
    })
  } catch (e) {
    console.error('[bridge] job fetch error', (e as Error)?.message)
    return fail(500, 'server_error')
  }
}
