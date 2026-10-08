// Phone Bridge: browser "bridge unlock" (server only).
//
// Before a browser can make the phone send anything, the pastor re-enters
// their password once per ~8 hours. The proof is an httpOnly, SameSite=Strict
// cookie holding an HMAC over (profile_id, expiry). SameSite=Strict also
// keeps other sites from triggering sends (CSRF).
//
// Secret: env BRIDGE_UNLOCK_SECRET, or (until that is added) a key derived
// from SUPABASE_SERVICE_ROLE_KEY. Changing either signs everyone out of the
// bridge unlock, nothing else.

import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import type { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { signUnlockToken, verifyUnlockToken } from './crypto'
import { fail, getWebUser } from './auth'

export const UNLOCK_COOKIE = 'tsd_bridge_unlock'
export const UNLOCK_TTL_MS = 8 * 60 * 60 * 1000

/** Per-purpose server secret (unlock cookie, pairing-code hashes). */
export function bridgeSecret(purpose: 'unlock' | 'pairing') {
  const base = process.env.BRIDGE_UNLOCK_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!base) throw new Error('BRIDGE_UNLOCK_SECRET / SUPABASE_SERVICE_ROLE_KEY not set')
  return crypto.createHmac('sha256', base).update(`tsd-bridge-${purpose}-v1`).digest('hex')
}

/** Checks the password with a throwaway client (does not touch the browser's session). */
export async function verifyPassword(email: string, password: string) {
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  return !error && !!data?.user
}

function readCookie(request: Request, name: string) {
  const header = request.headers.get('cookie') || ''
  for (const part of header.split(';')) {
    const i = part.indexOf('=')
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim())
  }
  return null
}

export function getUnlockState(request: Request, profileId: string) {
  return verifyUnlockToken(bridgeSecret('unlock'), readCookie(request, UNLOCK_COOKIE), profileId)
}

export function setUnlockCookie(response: NextResponse, request: Request, profileId: string, expiresAt = Date.now() + UNLOCK_TTL_MS) {
  const isHttps = new URL(request.url).protocol === 'https:' || process.env.NODE_ENV === 'production'
  response.cookies.set(UNLOCK_COOKIE, signUnlockToken(bridgeSecret('unlock'), profileId, expiresAt), {
    httpOnly: true,
    secure: isHttps,
    sameSite: 'strict',
    path: '/api/bridge',
    expires: new Date(expiresAt),
  })
  return expiresAt
}

/**
 * For web routes that can cause a text to be sent: signed-in user AND a valid
 * unlock cookie for that same user.
 */
export async function requireUnlockedWebUser(
  request: Request,
): Promise<{ ok: true; user: User; unlockExpiresAt: number } | { ok: false; response: NextResponse }> {
  const user = await getWebUser(request)
  if (!user) return { ok: false, response: fail(401, 'unauthorized', 'Please sign in') }
  const state = getUnlockState(request, user.id)
  if (!state) return { ok: false, response: fail(403, 'bridge_locked', 'Enter your password to unlock Phone Bridge') }
  return { ok: true, user, unlockExpiresAt: state.expiresAt }
}
