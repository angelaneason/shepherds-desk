// Phone Bridge: create a pairing code (web, requires bridge unlock).
//   POST -> { code, qr_payload: "tsdbridge://pair?code=...", expires_at }
// Only an HMAC of the code is stored. Single use, 5 minutes.
import { fail, getBridgeServiceClient, ok } from '@/lib/bridge/auth'
import { generatePairingCode, hashPairingCode } from '@/lib/bridge/crypto'
import { bridgeSecret, requireUnlockedWebUser } from '@/lib/bridge/unlock'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const auth = await requireUnlockedWebUser(request)
    if (!auth.ok) return auth.response
    const admin = getBridgeServiceClient()

    // Only the newest code is valid: drop this account's unused codes.
    await admin.from('bridge_pairing_codes').delete().eq('profile_id', auth.user.id).is('used_at', null)

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()
    for (let attempt = 0; attempt < 3; attempt++) {
      const code = generatePairingCode(8)
      const { error } = await admin.from('bridge_pairing_codes').insert({
        profile_id: auth.user.id,
        code_hash: hashPairingCode(bridgeSecret('pairing'), code),
        expires_at: expiresAt,
      })
      if (!error) {
        return ok({ code, qr_payload: `tsdbridge://pair?code=${code}`, expires_at: expiresAt })
      }
      if (error.code !== '23505') throw error
    }
    return fail(500, 'server_error', 'Could not create a pairing code')
  } catch (e) {
    console.error('[bridge] pair/code error', (e as Error)?.message)
    return fail(500, 'server_error', 'Could not create a pairing code')
  }
}
