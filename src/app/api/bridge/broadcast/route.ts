// Phone Bridge: create a broadcast that the phone will send (web, requires bridge unlock).
//   POST { body, member_ids, allow_archived? }
//     -> { broadcast_id, total, sendable, skipped: {reason: count}, warn, segments, fcm }
// Filtering (Do Not Text, no phone, invalid phone, duplicate number) and the
// limits run in create_bridge_broadcast() on the server. Nothing is sent until
// the pastor approves on the phone. The audit log records the request without text.
import { audit, browserSessionLabel, fail, getBridgeServiceClient, isUuid, ok, readJson } from '@/lib/bridge/auth'
import { sendBridgeFcm } from '@/lib/bridge/fcm'
import { cleanOutgoingBody, getEffectiveConfig } from '@/lib/bridge/limits'
import { getActiveDevice } from '@/lib/bridge/service'
import { requireUnlockedWebUser } from '@/lib/bridge/unlock'
import { smsSegments } from '@/lib/broadcasts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MESSAGES: Record<string, [number, string]> = {
  empty_message: [400, 'Write a message first'],
  message_too_long: [400, 'Message is too long'],
  no_recipients: [400, 'Pick at least one person'],
  too_many_recipients: [400, 'Too many people picked'],
  no_device: [409, 'No phone is connected to Phone Bridge'],
  broadcast_daily_limit: [429, 'Daily broadcast limit reached. Try again tomorrow.'],
  no_people_found: [404, 'None of the picked people were found'],
  nobody_textable: [409, 'Nobody in this list can be texted'],
  max_recipients: [409, 'Too many people for one Phone Bridge broadcast'],
  daily_text_limit: [429, 'Daily Phone Bridge limit reached. Try again later.'],
}

export async function POST(request: Request) {
  try {
    const auth = await requireUnlockedWebUser(request)
    if (!auth.ok) return auth.response
    const user = auth.user

    const input = await readJson<{ body?: unknown; member_ids?: unknown; allow_archived?: unknown }>(request)
    if (!input) return fail(400, 'bad_json')
    const text = cleanOutgoingBody(typeof input.body === 'string' ? input.body : '')
    if (!text) return fail(400, 'empty_message', MESSAGES.empty_message[1])
    const ids = Array.isArray(input.member_ids) ? Array.from(new Set(input.member_ids.filter(isUuid))) : []
    if (!ids.length) return fail(400, 'no_recipients', MESSAGES.no_recipients[1])

    const device = await getActiveDevice(user.id)
    if (!device) return fail(409, 'no_device', MESSAGES.no_device[1])

    const { data, error } = await getBridgeServiceClient().rpc('create_bridge_broadcast', {
      p_profile_id: user.id,
      p_body: text,
      p_member_ids: ids,
      p_device_id: device.id,
      p_allow_archived: input.allow_archived === true,
    })
    if (error) {
      const code = /bridge:([a-z_]+)/.exec(error.message || '')?.[1]
      if (code && MESSAGES[code]) {
        const config = code === 'max_recipients' ? await getEffectiveConfig(user.id) : null
        return fail(MESSAGES[code][0], code, MESSAGES[code][1], config ? { max_recipients: config.max_recipients } : undefined)
      }
      throw error
    }

    const result = data as { broadcast_id: string; total: number; sendable: number; skipped: Record<string, number>; warn: boolean }
    const label = browserSessionLabel(request)
    await audit({
      profile_id: user.id,
      event: 'broadcast_requested',
      browser_session_label: label,
      broadcast_id: result.broadcast_id,
      device_id: device.id,
      status: `awaiting_phone_approval:${result.sendable}`,
    })

    const fcm = await sendBridgeFcm(device.fcm_token, { type: 'broadcast', broadcast_id: result.broadcast_id })
    return ok({
      ...result,
      segments: smsSegments(text),
      device: { id: device.id, display_name: device.display_name },
      fcm,
    })
  } catch (e) {
    console.error('[bridge] broadcast error', (e as Error)?.message)
    return fail(500, 'server_error', 'Could not start the broadcast')
  }
}
