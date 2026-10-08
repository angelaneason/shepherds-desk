// Phone Bridge: browser unlock.
//   POST { password }  -> sets the 8 h unlock cookie; audit 'unlocked'
//   GET                -> { unlocked, expires_at }
import { audit, browserSessionLabel, fail, getWebUser, ok, readJson } from '@/lib/bridge/auth'
import { getUnlockState, setUnlockCookie, UNLOCK_TTL_MS, verifyPassword } from '@/lib/bridge/unlock'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const user = await getWebUser(request)
  if (!user) return fail(401, 'unauthorized', 'Please sign in')
  const state = getUnlockState(request, user.id)
  return ok({ unlocked: !!state, expires_at: state ? new Date(state.expiresAt).toISOString() : null })
}

export async function POST(request: Request) {
  try {
    const user = await getWebUser(request)
    if (!user) return fail(401, 'unauthorized', 'Please sign in')
    if (!user.email) return fail(400, 'no_password_login', 'This account has no email/password sign-in')

    const body = await readJson<{ password?: unknown }>(request)
    const password = typeof body?.password === 'string' ? body.password : ''
    if (!password) return fail(400, 'password_required', 'Enter your password')

    if (!(await verifyPassword(user.email, password))) {
      return fail(401, 'wrong_password', 'That password is not correct')
    }

    const expiresAt = Date.now() + UNLOCK_TTL_MS
    const response = ok({ unlocked: true, expires_at: new Date(expiresAt).toISOString() })
    setUnlockCookie(response, request, user.id, expiresAt)
    await audit({ profile_id: user.id, event: 'unlocked', browser_session_label: browserSessionLabel(request) })
    return response
  } catch (e) {
    console.error('[bridge] unlock error', (e as Error)?.message)
    return fail(500, 'server_error', 'Could not unlock Phone Bridge')
  }
}
