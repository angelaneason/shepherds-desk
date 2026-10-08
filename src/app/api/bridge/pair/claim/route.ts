// Phone Bridge: claim a pairing code (phone, bearer token, unsigned: the
// phone has no registered key yet; this call registers it).
//   POST { code, public_key, display_name, model?, fcm_token? }
//     -> { device_id, device, config }
// V1: one active phone per account, so any previous phone is disconnected.
import { audit, fail, getBearerUser, getBridgeServiceClient, ok, readJson } from '@/lib/bridge/auth'
import { hashPairingCode, normalizePairingCode, parseP256PublicKey } from '@/lib/bridge/crypto'
import { getEffectiveConfig } from '@/lib/bridge/limits'
import { publicDevice, revokeDevice } from '@/lib/bridge/service'
import { bridgeSecret } from '@/lib/bridge/unlock'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

export async function POST(request: Request) {
  try {
    const user = await getBearerUser(request)
    if (!user) return fail(401, 'unauthorized', 'Sign in on the phone first')

    const body = await readJson(request)
    if (!body) return fail(400, 'bad_json')
    const code = normalizePairingCode(str(body.code, 32))
    const publicKey = str(body.public_key, 400)
    const displayName = str(body.display_name, 60)
    const model = str(body.model, 100) || null
    const fcmToken = str(body.fcm_token, 4096) || null

    if (code.length < 6) return fail(400, 'invalid_code', 'Enter the code shown on the web')
    if (!displayName) return fail(400, 'display_name_required', 'Name this phone')
    if (!parseP256PublicKey(publicKey)) return fail(400, 'invalid_public_key', 'public_key must be base64 SPKI DER, EC P-256')

    const admin = getBridgeServiceClient()
    const now = new Date().toISOString()

    // Consume the code atomically: unused, unexpired, same account.
    const { data: claimed, error: claimErr } = await admin
      .from('bridge_pairing_codes')
      .update({ used_at: now })
      .eq('code_hash', hashPairingCode(bridgeSecret('pairing'), code))
      .eq('profile_id', user.id)
      .is('used_at', null)
      .gt('expires_at', now)
      .select('id')
    if (claimErr) throw claimErr
    if (!claimed?.length) {
      return fail(400, 'invalid_code', 'This code is wrong, expired, already used, or for another account')
    }

    // One active phone per account
    const { data: actives } = await admin
      .from('bridge_devices').select('id').eq('profile_id', user.id).eq('status', 'active')
    for (const d of actives || []) {
      await revokeDevice(user.id, d.id)
      await audit({ profile_id: user.id, event: 'revoked', device_id: d.id, status: 'replaced_by_new_pairing' })
    }

    const { data: device, error: devErr } = await admin
      .from('bridge_devices')
      .insert({
        profile_id: user.id,
        display_name: displayName,
        model,
        public_key: publicKey.replace(/\s+/g, ''),
        fcm_token: fcmToken,
        last_seen_at: now,
      })
      .select('*')
      .single()
    if (devErr) throw devErr

    await admin.from('bridge_pairing_codes').update({ device_id: device.id }).eq('id', claimed[0].id)
    await audit({ profile_id: user.id, event: 'paired', device_id: device.id, status: 'active' })

    return ok({ device_id: device.id, device: publicDevice(device), config: await getEffectiveConfig(user.id) })
  } catch (e) {
    console.error('[bridge] pair/claim error', (e as Error)?.message)
    return fail(500, 'server_error', 'Could not pair this phone')
  }
}
