import { NextResponse } from 'next/server'
import { getServiceClient, verifyAdminUser } from '@/lib/server-auth'
import { notifyUsers } from '@/lib/push'

export const maxDuration = 60

// GET - How many people a broadcast would reach
export async function GET(request: Request) {
  const adminUser = await verifyAdminUser(request)
  if (!adminUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = getServiceClient()
  const [{ count: totalUsers }, { data: tokenRows }] = await Promise.all([
    admin.from('profiles').select('id', { count: 'exact', head: true }) as any,
    admin.from('push_tokens').select('profile_id') as any,
  ])
  const phoneUsers = new Set((tokenRows || []).map((r: any) => r.profile_id)).size

  return NextResponse.json({ totalUsers: totalUsers || 0, phoneUsers })
}

// POST - Send a message to every user (phone push + in-app bell)
export async function POST(request: Request) {
  try {
    const adminUser = await verifyAdminUser(request)
    if (!adminUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { title, message, link } = await request.json()
    if (!title?.trim() || !message?.trim()) {
      return NextResponse.json({ error: 'Title and message are required' }, { status: 400 })
    }
    if (title.length > 80 || message.length > 500) {
      return NextResponse.json({ error: 'Title max 80 characters, message max 500' }, { status: 400 })
    }

    const admin = getServiceClient()
    const ids: string[] = []
    let from = 0
    // Page through all profiles
    while (true) {
      const { data, error } = await admin.from('profiles').select('id').range(from, from + 999) as any
      if (error) throw error
      for (const p of data || []) ids.push(p.id)
      if (!data || data.length < 1000) break
      from += 1000
    }

    const result = await notifyUsers(ids, {
      type: 'broadcast',
      title: title.trim(),
      body: message.trim(),
      link: link || undefined,
    })

    return NextResponse.json({ success: true, ...result, totalUsers: ids.length })
  } catch (error: any) {
    console.error('Broadcast error:', error?.message || error)
    return NextResponse.json({ error: 'Failed to send broadcast' }, { status: 500 })
  }
}
