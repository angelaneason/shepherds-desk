// Phone Bridge: current device card (web).
//   GET -> { device: {...} | null }
import { fail, getWebUser, ok } from '@/lib/bridge/auth'
import { getActiveDevice, publicDevice } from '@/lib/bridge/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const user = await getWebUser(request)
  if (!user) return fail(401, 'unauthorized', 'Please sign in')
  return ok({ device: publicDevice(await getActiveDevice(user.id)) })
}
