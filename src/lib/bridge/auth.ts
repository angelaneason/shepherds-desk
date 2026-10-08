// Phone Bridge: auth helpers (server only).
//
// Web calls:   the signed-in user (Supabase cookie session or bearer token,
//              same as the rest of the web API) + a bridge-unlock cookie for
//              anything that can make a phone send a text (see unlock.ts).
// Phone calls: a bearer Supabase access token (same account) + a device
//              signature (see deviceSig.ts). pair/claim is the only unsigned
//              phone call, because the phone has no registered key yet.

import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getRequestUser } from '@/lib/server-auth'

let serviceClient: SupabaseClient | null = null

/** Service-role client (bypasses RLS). Every query must scope by profile_id itself. */
export function getBridgeServiceClient(): SupabaseClient {
  if (!serviceClient) {
    serviceClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return serviceClient
}

/** User from `Authorization: Bearer <supabase access token>` only (phone calls). */
export async function getBearerUser(request: Request): Promise<User | null> {
  const header = request.headers.get('authorization') || ''
  if (!header.startsWith('Bearer ')) return null
  const token = header.slice(7).trim()
  if (!token) return null
  const { data, error } = await getBridgeServiceClient().auth.getUser(token)
  if (error || !data?.user) return null
  return data.user
}

/** User for web calls: cookie session (web app) or bearer token. */
export async function getWebUser(request: Request): Promise<User | null> {
  return (await getRequestUser(request)) as User | null
}

// ─── JSON helpers ───────────────────────────────────────────────────────────

export const ok = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } })

/** Error response with a stable machine-readable code. */
export const fail = (status: number, error: string, message?: string, extra?: Record<string, unknown>) =>
  NextResponse.json({ error, ...(message ? { message } : {}), ...(extra || {}) }, { status, headers: { 'Cache-Control': 'no-store' } })

export async function readJson<T = Record<string, unknown>>(request: Request): Promise<T | null> {
  try {
    const text = await request.text()
    if (!text) return {} as T
    const parsed = JSON.parse(text)
    return parsed && typeof parsed === 'object' ? (parsed as T) : null
  } catch {
    return null
  }
}

export const isUuid = (v: unknown): v is string =>
  typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)

/** Short, human label for the browser that started an action, e.g. "Chrome on Windows". */
export function browserSessionLabel(request: Request) {
  const ua = request.headers.get('user-agent') || ''
  const browser =
    /Edg\//.test(ua) ? 'Edge' :
    /OPR\/|Opera/.test(ua) ? 'Opera' :
    /Firefox\//.test(ua) ? 'Firefox' :
    /Chrome\//.test(ua) ? 'Chrome' :
    /Safari\//.test(ua) ? 'Safari' : 'Browser'
  const os =
    /Windows/.test(ua) ? 'Windows' :
    /iPhone|iPad|iPod/.test(ua) ? 'iOS' :
    /Mac OS X|Macintosh/.test(ua) ? 'Mac' :
    /Android/.test(ua) ? 'Android' :
    /CrOS/.test(ua) ? 'ChromeOS' :
    /Linux/.test(ua) ? 'Linux' : ''
  return os ? `${browser} on ${os}` : browser
}

// ─── Audit log (metadata only; never pass message text here) ────────────────

export type AuditEvent =
  | 'paired' | 'unlocked' | 'send_requested' | 'approved' | 'rejected'
  | 'sent' | 'delivered' | 'failed' | 'revoked' | 'expired'
  | 'broadcast_requested' | 'broadcast_approved' | 'broadcast_paused'
  | 'broadcast_resumed' | 'broadcast_cancelled' | 'broadcast_completed'

export async function audit(entry: {
  profile_id: string
  event: AuditEvent
  actor_profile_id?: string | null
  browser_session_label?: string | null
  member_id?: string | null
  job_id?: string | null
  broadcast_id?: string | null
  broadcast_recipient_id?: string | null
  device_id?: string | null
  status?: string | null
}) {
  const { error } = await getBridgeServiceClient().from('bridge_audit_log').insert({
    actor_profile_id: entry.profile_id,
    ...entry,
  })
  if (error) console.error('[bridge] audit insert failed:', entry.event, error.message)
}
