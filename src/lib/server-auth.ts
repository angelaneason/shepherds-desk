import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

export const ADMIN_EMAILS = ['angelaneason@gmail.com', 'tinyneason@gmail.com']

export function getServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * Returns the signed-in user for a request.
 * Supports the mobile app (Authorization: Bearer <token>) and the web app (cookies).
 */
export async function getRequestUser(request?: Request) {
  if (request) {
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '').trim()
      const { data: { user }, error } = await getServiceClient().auth.getUser(token)
      if (!error && user) return user
    }
  }

  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (!error && user) return user
  } catch {
    // ignore
  }

  return null
}

/** Returns the user if they are an admin, otherwise null. */
export async function verifyAdminUser(request?: Request) {
  const user = await getRequestUser(request)
  if (!user) return null

  const email = (user.email || '').toLowerCase()
  if (ADMIN_EMAILS.includes(email)) return user

  const { data: profile } = await getServiceClient()
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as any

  return profile?.role === 'admin' ? user : null
}
