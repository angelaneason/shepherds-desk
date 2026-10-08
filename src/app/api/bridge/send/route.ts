// Phone Bridge: 1:1 text through the phone (web, requires bridge unlock).
//   POST { member_id, body, allow_archived? } -> { job_id, expires_at, segments, fcm }
// The text is stored only until the phone reports a final result (or 10 min).
// The audit log records the request without the text.
import { audit, browserSessionLabel, fail, getBridgeServiceClient, isUuid, ok, readJson } from '@/lib/bridge/auth'
import { sendBridgeFcm } from '@/lib/bridge/fcm'
import { cleanOutgoingBody, getEffectiveConfig, textsLast24h } from '@/lib/bridge/limits'
import { getActiveDevice } from '@/lib/bridge/service'
import { requireUnlockedWebUser } from '@/lib/bridge/unlock'
import { smsSegments } from '@/lib/broadcasts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const auth = await requireUnlockedWebUser(request)
    if (!auth.ok) return auth.response
    const user = auth.user

    const input = await readJson<{ member_id?: unknown; body?: unknown; allow_archived?: unknown }>(request)
    if (!input) return fail(400, 'bad_json')
    if (!isUuid(input.member_id)) return fail(400, 'member_required', 'Pick a person')
    const text = cleanOutgoingBody(typeof input.body === 'string' ? input.body : '')
    if (!text) return fail(400, 'empty_message', 'Write a message first')
    if (text.length > 2000) return fail(400, 'message_too_long', 'Message is too long')

    const admin = getBridgeServiceClient()
    const { data: member } = await admin
      .from('members')
      .select('id, full_name, phone, phone_e164, do_not_text, archived_at')
      .eq('id', input.member_id)
      .eq('profile_id', user.id)
      .maybeSingle()
    if (!member) return fail(404, 'member_not_found', 'Person not found')
    if (member.archived_at && input.allow_archived !== true) return fail(409, 'archived', 'This person is archived')
    if (member.do_not_text) return fail(409, 'do_not_text', 'This person is marked Do not text')
    if (!member.phone || !String(member.phone).trim()) return fail(409, 'no_phone', 'This person has no phone number')
    if (!member.phone_e164) return fail(409, 'invalid_phone', 'This phone number is not valid')

    const device = await getActiveDevice(user.id)
    if (!device) return fail(409, 'no_device', 'No phone is connected to Phone Bridge')

    const config = await getEffectiveConfig(user.id)
    if ((await textsLast24h(user.id)) >= config.max_texts_per_day) {
      return fail(429, 'daily_text_limit', 'Daily Phone Bridge limit reached. Try again later.')
    }

    const label = browserSessionLabel(request)
    const segments = smsSegments(text)
    const expiresAt = new Date(Date.now() + config.job_timeout_min * 60 * 1000).toISOString()
    const { data: job, error } = await admin
      .from('bridge_send_jobs')
      .insert({
        profile_id: user.id,
        device_id: device.id,
        member_id: member.id,
        body: text,
        to_e164: member.phone_e164,
        segments,
        status: 'queued',
        browser_session_label: label,
        expires_at: expiresAt,
      })
      .select('id, expires_at')
      .single()
    if (error) throw error

    await audit({
      profile_id: user.id,
      event: 'send_requested',
      browser_session_label: label,
      member_id: member.id,
      job_id: job.id,
      device_id: device.id,
      status: 'queued',
    })

    const fcm = await sendBridgeFcm(device.fcm_token, { type: 'job', job_id: job.id })
    return ok({
      job_id: job.id,
      expires_at: job.expires_at,
      segments,
      segment_warning: segments > config.segment_warning,
      device: { id: device.id, display_name: device.display_name },
      fcm,
    })
  } catch (e) {
    console.error('[bridge] send error', (e as Error)?.message)
    return fail(500, 'server_error', 'Could not send through the phone')
  }
}
