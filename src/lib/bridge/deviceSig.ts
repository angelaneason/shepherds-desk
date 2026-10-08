// Phone Bridge: verification of device-signed requests (server only).
//
// The full wire contract for the Kotlin app (headers, canonical string,
// key and signature encodings) is documented at the top of ./crypto.ts.
// Summary:
//   canonical = `${METHOD}\n${pathname}\n${timestamp}\n${nonce}\n${sha256hex(rawBody)}`
//   X-Bridge-Signature = base64(DER ECDSA P-256 SHA-256 over canonical)
//                        (Android Keystore "SHA256withECDSA")
// Rejected when |now - timestamp| > 120 s, the nonce was used before, the
// device is revoked, or the device belongs to another account than the
// bearer token.

import type { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { canonicalString, nonceValid, timestampFresh, verifyDeviceSignature } from './crypto'
import { fail, getBearerUser, getBridgeServiceClient, isUuid } from './auth'

export { canonicalString, verifyDeviceSignature } from './crypto'

export type BridgeDevice = {
  id: string
  profile_id: string
  display_name: string
  model: string | null
  public_key: string
  fcm_token: string | null
  approve_every_send: boolean
  status: 'active' | 'revoked'
  sim_label: string | null
  last_seen_at: string | null
  created_at: string
  revoked_at: string | null
}

export type SignedRequest = {
  user: User
  device: BridgeDevice
  rawBody: string
  /** Parsed JSON body ({} when empty). null if the body is not valid JSON. */
  json: Record<string, unknown> | null
}

export const isSignedRequest = (request: Request) => !!request.headers.get('x-bridge-signature')

/**
 * Verifies a phone request. Reads the body (do not read it again; use the
 * returned rawBody/json). Returns either the verified context or an error
 * response to return as-is.
 */
export async function verifySignedRequest(
  request: Request,
): Promise<{ ok: true; ctx: SignedRequest } | { ok: false; response: NextResponse }> {
  const deviceId = request.headers.get('x-bridge-device') || ''
  const timestamp = request.headers.get('x-bridge-timestamp') || ''
  const nonce = request.headers.get('x-bridge-nonce') || ''
  const signature = request.headers.get('x-bridge-signature') || ''

  if (!isUuid(deviceId) || !timestamp || !nonce || !signature) {
    return { ok: false, response: fail(401, 'signature_missing', 'Signed request headers are missing') }
  }
  if (!timestampFresh(timestamp)) {
    return { ok: false, response: fail(401, 'stale_timestamp', 'Request timestamp is too far from server time') }
  }
  if (!nonceValid(nonce)) {
    return { ok: false, response: fail(401, 'bad_nonce', 'Nonce must be 16-64 URL-safe characters') }
  }

  const user = await getBearerUser(request)
  if (!user) return { ok: false, response: fail(401, 'unauthorized', 'Sign in again on the phone') }

  const rawBody = await request.text()
  const admin = getBridgeServiceClient()

  const { data: device, error } = await admin
    .from('bridge_devices')
    .select('*')
    .eq('id', deviceId)
    .maybeSingle()
  if (error) return { ok: false, response: fail(500, 'server_error', error.message) }
  if (!device || device.profile_id !== user.id) {
    return { ok: false, response: fail(403, 'unknown_device', 'This phone is not paired with this account') }
  }
  if (device.status !== 'active') {
    return { ok: false, response: fail(403, 'device_revoked', 'This phone was disconnected. Pair it again from the web.') }
  }

  const pathname = new URL(request.url).pathname
  const canonical = canonicalString(request.method, pathname, timestamp, nonce, rawBody)
  if (!verifyDeviceSignature(device.public_key, canonical, signature)) {
    return { ok: false, response: fail(401, 'bad_signature', 'Request signature did not verify') }
  }

  // Replay protection: the (device, nonce) pair can be used once.
  const { error: nonceErr } = await admin.from('bridge_request_nonces').insert({ device_id: device.id, nonce })
  if (nonceErr) {
    if (nonceErr.code === '23505') return { ok: false, response: fail(401, 'replayed', 'This request was already used') }
    return { ok: false, response: fail(500, 'server_error', nonceErr.message) }
  }

  await admin.from('bridge_devices').update({ last_seen_at: new Date().toISOString() }).eq('id', device.id)

  let json: Record<string, unknown> | null = {}
  if (rawBody) {
    try {
      const parsed = JSON.parse(rawBody)
      json = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null
    } catch {
      json = null
    }
  }

  return { ok: true, ctx: { user, device: device as BridgeDevice, rawBody, json } }
}
