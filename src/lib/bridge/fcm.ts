// Phone Bridge: FCM HTTP v1 sender (server only).
//
// Data-only, high priority messages carrying IDs only: never message text or
// phone numbers. The phone fetches the details over a signed HTTPS request.
//
// Config: env FCM_SERVICE_ACCOUNT_JSON = the Firebase service account JSON
// (the whole file contents, one line). Without it, sends are skipped and
// reported as { sent: false, reason: 'fcm_not_configured' }; the phone still
// picks up pending work on its next heartbeat.

import { buildServiceAccountJwt, GOOGLE_TOKEN_URL } from './crypto'

type ServiceAccount = { project_id: string; client_email: string; private_key: string }

export type FcmResult =
  | { sent: true; message_id?: string }
  | { sent: false; reason: 'fcm_not_configured' | 'no_token' | 'token_invalid' | 'auth_failed' | 'send_failed'; detail?: string }

let cachedToken: { token: string; expiresAt: number } | null = null

function loadServiceAccount(): ServiceAccount | null {
  const raw = process.env.FCM_SERVICE_ACCOUNT_JSON
  if (!raw) return null
  try {
    const sa = JSON.parse(raw)
    if (!sa.project_id || !sa.client_email || !sa.private_key) return null
    // Env UIs sometimes keep "\n" escaped inside the key
    return { ...sa, private_key: String(sa.private_key).replace(/\\n/g, '\n') }
  } catch {
    console.error('[bridge] FCM_SERVICE_ACCOUNT_JSON is not valid JSON')
    return null
  }
}

async function getAccessToken(sa: ServiceAccount): Promise<string | null> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.token
  const assertion = buildServiceAccountJwt(sa.client_email, sa.private_key)
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }).toString(),
  })
  if (!res.ok) {
    console.error('[bridge] FCM token exchange failed', res.status, await res.text().catch(() => ''))
    return null
  }
  const body = (await res.json()) as { access_token: string; expires_in: number }
  cachedToken = { token: body.access_token, expiresAt: Date.now() + (body.expires_in || 3600) * 1000 }
  return cachedToken.token
}

/** Sends a data-only message. `data` values must be IDs / short codes only. */
export async function sendBridgeFcm(
  fcmToken: string | null | undefined,
  data: { type: 'job' | 'broadcast' | 'revoked' | 'sync'; job_id?: string; broadcast_id?: string },
): Promise<FcmResult> {
  const sa = loadServiceAccount()
  if (!sa) {
    console.warn('[bridge] FCM not configured (FCM_SERVICE_ACCOUNT_JSON missing); skipping push', data.type)
    return { sent: false, reason: 'fcm_not_configured' }
  }
  if (!fcmToken) return { sent: false, reason: 'no_token' }

  try {
    const accessToken = await getAccessToken(sa)
    if (!accessToken) return { sent: false, reason: 'auth_failed' }

    const stringData: Record<string, string> = {}
    for (const [k, v] of Object.entries(data)) if (v != null) stringData[k] = String(v)

    const res = await fetch(`https://fcm.googleapis.com/v1/projects/${encodeURIComponent(sa.project_id)}/messages:send`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          token: fcmToken,
          data: stringData,
          android: { priority: 'HIGH', ttl: '600s' },
        },
      }),
    })
    if (res.ok) {
      const body = (await res.json().catch(() => ({}))) as { name?: string }
      return { sent: true, message_id: body.name }
    }
    const text = await res.text().catch(() => '')
    if (res.status === 401) cachedToken = null
    if (res.status === 404 || /UNREGISTERED|INVALID_ARGUMENT/.test(text)) {
      return { sent: false, reason: 'token_invalid', detail: `${res.status}` }
    }
    console.error('[bridge] FCM send failed', res.status, text.slice(0, 300))
    return { sent: false, reason: 'send_failed', detail: `${res.status}` }
  } catch (e) {
    console.error('[bridge] FCM error', (e as Error)?.message)
    return { sent: false, reason: 'send_failed', detail: (e as Error)?.message }
  }
}
