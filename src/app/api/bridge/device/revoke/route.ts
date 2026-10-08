// Phone Bridge: disconnect a phone.
//   Web (requires bridge unlock):  POST { device_id? }  (defaults to the active phone)
//   Phone (signed):                POST {}             (disconnects itself)
// Unfinished 1:1 jobs are cancelled (text wiped) and bridge broadcasts still
// waiting for that phone are cancelled. Audit 'revoked'.
import { audit, browserSessionLabel, fail, isUuid, ok, readJson } from '@/lib/bridge/auth'
import { isSignedRequest, verifySignedRequest } from '@/lib/bridge/deviceSig'
import { sendBridgeFcm } from '@/lib/bridge/fcm'
import { getActiveDevice, revokeDevice } from '@/lib/bridge/service'
import { requireUnlockedWebUser } from '@/lib/bridge/unlock'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    if (isSignedRequest(request)) {
      const v = await verifySignedRequest(request)
      if (!v.ok) return v.response
      const { device } = v.ctx
      await revokeDevice(device.profile_id, device.id)
      await audit({ profile_id: device.profile_id, event: 'revoked', device_id: device.id, status: 'revoked_from_phone' })
      return ok({ revoked: true, device_id: device.id })
    }

    const auth = await requireUnlockedWebUser(request)
    if (!auth.ok) return auth.response
    const body = (await readJson<{ device_id?: unknown }>(request)) || {}
    let deviceId = isUuid(body.device_id) ? body.device_id : null
    let fcmToken: string | null = null
    if (!deviceId) {
      const active = await getActiveDevice(auth.user.id)
      if (!active) return fail(404, 'no_device', 'No phone is connected')
      deviceId = active.id
      fcmToken = active.fcm_token
    }
    const revoked = await revokeDevice(auth.user.id, deviceId)
    if (!revoked) return fail(404, 'no_device', 'That phone is not connected')
    await audit({
      profile_id: auth.user.id,
      event: 'revoked',
      device_id: deviceId,
      browser_session_label: browserSessionLabel(request),
      status: 'revoked_from_web',
    })
    // Best effort: tell the phone so it can clear its local pairing.
    if (fcmToken) await sendBridgeFcm(fcmToken, { type: 'revoked' })
    return ok({ revoked: true, device_id: deviceId })
  } catch (e) {
    console.error('[bridge] revoke error', (e as Error)?.message)
    return fail(500, 'server_error', 'Could not disconnect the phone')
  }
}
