// Phone Bridge: phone check-in (signed).
//   POST { fcm_token?, approve_every_send?, sim_label? }
//     -> { device, config, do_not_text: [e164...], pending_jobs, pending_broadcasts }
// do_not_text feeds the phone's local block list (re-checked before every send).
// pending_* lets the phone catch up if an FCM push was missed.
import { fail, getBridgeServiceClient, ok } from '@/lib/bridge/auth'
import { verifySignedRequest } from '@/lib/bridge/deviceSig'
import { getEffectiveConfig } from '@/lib/bridge/limits'
import { doNotTextNumbers, pendingWork, publicDevice } from '@/lib/bridge/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const v = await verifySignedRequest(request)
    if (!v.ok) return v.response
    const { device, json } = v.ctx
    if (!json) return fail(400, 'bad_json')

    const patch: Record<string, unknown> = { last_seen_at: new Date().toISOString() }
    if (typeof json.fcm_token === 'string' && json.fcm_token.trim()) patch.fcm_token = json.fcm_token.trim().slice(0, 4096)
    if (typeof json.approve_every_send === 'boolean') patch.approve_every_send = json.approve_every_send
    if (typeof json.sim_label === 'string') patch.sim_label = json.sim_label.trim().slice(0, 60) || null

    const { data: updated, error } = await getBridgeServiceClient()
      .from('bridge_devices').update(patch).eq('id', device.id).select('*').single()
    if (error) throw error

    const [config, doNotText, pending] = await Promise.all([
      getEffectiveConfig(device.profile_id),
      doNotTextNumbers(device.profile_id),
      pendingWork(device.profile_id, device.id),
    ])
    return ok({ device: publicDevice(updated), config, do_not_text: doNotText, ...pending })
  } catch (e) {
    console.error('[bridge] heartbeat error', (e as Error)?.message)
    return fail(500, 'server_error', 'Check-in failed')
  }
}
