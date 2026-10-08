// Phone Bridge: pure crypto helpers (server only, no Supabase / Next imports
// so they can be unit-tested with plain Node: see scripts/bridge-unit-test.mts).
//
// ─── Device request signing (contract for the Kotlin bridge app, Phase 4) ───
//
// Every phone -> server request after pairing is signed with the phone's
// Android Keystore key (EC P-256, created at pairing, never leaves the
// hardware). The public key is sent once, at pair/claim, as base64 of the
// X.509 SubjectPublicKeyInfo DER (Kotlin: Base64.encodeToString(
// keyPair.public.encoded, Base64.NO_WRAP)).
//
// Headers on every signed request (plus the normal Supabase bearer token):
//   Authorization:      Bearer <supabase access token of the same account>
//   X-Bridge-Device:    <device_id returned by pair/claim>
//   X-Bridge-Timestamp: <Unix time in milliseconds, e.g. 1791417600000>
//   X-Bridge-Nonce:     <random, 16-64 chars, URL-safe; never reused>
//   X-Bridge-Signature: <base64 (standard, with padding) of the DER ECDSA
//                        signature, i.e. exactly what
//                        Signature.getInstance("SHA256withECDSA").sign() returns>
//
// Canonical string that is signed (UTF-8, fields joined by "\n", no trailing
// newline):
//   METHOD          upper case, e.g. "POST"
//   PATHNAME        URL path only, no host, no query, e.g. "/api/bridge/jobs/<id>/status"
//   TIMESTAMP       the exact X-Bridge-Timestamp header value
//   NONCE           the exact X-Bridge-Nonce header value
//   BODY_SHA256     lower-case hex SHA-256 of the exact raw request body bytes
//                   ("" for GET, which hashes to e3b0c442...b855)
//
// Example:
//   POST\n/api/bridge/device/heartbeat\n1791417600000\nq8Xr2...\n<sha256hex(body)>
//
// The server rejects the request when: the timestamp is more than 120 s from
// server time, the nonce was already used by this device, the device is
// revoked or belongs to another account than the bearer token, or the
// signature does not verify.

import crypto from 'node:crypto'

export const SIG_MAX_SKEW_MS = 120_000

export const sha256Hex = (data: string | Buffer) =>
  crypto.createHash('sha256').update(data).digest('hex')

export function canonicalString(method: string, pathname: string, timestamp: string, nonce: string, rawBody: string | Buffer) {
  return `${method.toUpperCase()}\n${pathname}\n${timestamp}\n${nonce}\n${sha256Hex(rawBody ?? '')}`
}

/** Parses a base64 SPKI DER public key and checks it is EC P-256. Returns null if not. */
export function parseP256PublicKey(publicKeyB64: string): crypto.KeyObject | null {
  try {
    const der = Buffer.from(publicKeyB64.replace(/\s+/g, ''), 'base64')
    if (der.length < 60 || der.length > 200) return null
    const key = crypto.createPublicKey({ key: der, format: 'der', type: 'spki' })
    if (key.asymmetricKeyType !== 'ec') return null
    if (key.asymmetricKeyDetails?.namedCurve !== 'prime256v1') return null
    return key
  } catch {
    return null
  }
}

/** Verifies a base64 DER ECDSA P-256 / SHA-256 signature over `data`. */
export function verifyDeviceSignature(publicKeyB64: string, data: string, signatureB64: string) {
  const key = parseP256PublicKey(publicKeyB64)
  if (!key) return false
  try {
    const sig = Buffer.from(signatureB64, 'base64')
    if (sig.length < 8 || sig.length > 80) return false
    return crypto.verify('sha256', Buffer.from(data, 'utf8'), { key, dsaEncoding: 'der' }, sig)
  } catch {
    return false
  }
}

export function timestampFresh(timestamp: string, now = Date.now()) {
  if (!/^\d{12,14}$/.test(timestamp)) return false
  return Math.abs(now - Number(timestamp)) <= SIG_MAX_SKEW_MS
}

export const nonceValid = (nonce: string) => /^[A-Za-z0-9_\-]{16,64}$/.test(nonce)

// ─── FCM service-account JWT (RS256) ────────────────────────────────────────

const b64url = (input: Buffer | string) =>
  Buffer.from(input).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')

export const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging'
export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'

/** Builds the signed JWT assertion exchanged for a Google OAuth access token. */
export function buildServiceAccountJwt(clientEmail: string, privateKeyPem: string, nowSec = Math.floor(Date.now() / 1000)) {
  const header = { alg: 'RS256', typ: 'JWT' }
  const claims = { iss: clientEmail, scope: FCM_SCOPE, aud: GOOGLE_TOKEN_URL, iat: nowSec, exp: nowSec + 3600 }
  const unsigned = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claims))}`
  const signature = crypto.sign('RSA-SHA256', Buffer.from(unsigned), privateKeyPem)
  return `${unsigned}.${b64url(signature)}`
}

// ─── Bridge-unlock token (cookie value) ─────────────────────────────────────
// Format: <profile_id>.<expiry ms>.<hex HMAC-SHA256(secret, "<profile_id>.<expiry ms>")>

export function signUnlockToken(secret: string, profileId: string, expiresAtMs: number) {
  const payload = `${profileId}.${expiresAtMs}`
  const mac = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  return `${payload}.${mac}`
}

export function verifyUnlockToken(secret: string, token: string | undefined | null, profileId: string, now = Date.now()) {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [pid, exp, mac] = parts
  if (pid !== profileId || !/^\d+$/.test(exp)) return null
  const expected = crypto.createHmac('sha256', secret).update(`${pid}.${exp}`).digest('hex')
  const a = Buffer.from(mac, 'hex')
  const b = Buffer.from(expected, 'hex')
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  const expiresAt = Number(exp)
  if (expiresAt <= now) return null
  return { expiresAt }
}

// ─── Pairing codes ──────────────────────────────────────────────────────────

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'   // no 0/O, 1/I/L

export function generatePairingCode(length = 8) {
  let out = ''
  for (let i = 0; i < length; i++) out += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)]
  return out
}

export const normalizePairingCode = (code: string) => (code || '').toUpperCase().replace(/[^A-Z0-9]/g, '')

export const hashPairingCode = (secret: string, code: string) =>
  crypto.createHmac('sha256', secret).update(`pair:${normalizePairingCode(code)}`).digest('hex')
