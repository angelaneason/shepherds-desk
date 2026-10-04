import { NextResponse } from 'next/server'
import { getRequestUser, getServiceClient } from '@/lib/server-auth'

// POST - Save this phone's Expo push token for the signed-in user
export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { token, platform } = await request.json()
    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'token is required' }, { status: 400 })
    }

    const admin = getServiceClient()
    // A phone can only belong to one account at a time (handles sign-out / sign-in as someone else)
    const { error } = await admin
      .from('push_tokens')
      .upsert(
        { token, profile_id: user.id, platform: platform || null, updated_at: new Date().toISOString() },
        { onConflict: 'token' }
      )

    if (error) {
      console.error('Error saving push token:', error.message)
      return NextResponse.json({ error: 'Failed to save push token' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in push register:', error?.message || error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Remove this phone's token (called on sign out)
export async function DELETE(request: Request) {
  try {
    const user = await getRequestUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { token } = await request.json().catch(() => ({ token: null }))
    const admin = getServiceClient()
    let query = admin.from('push_tokens').delete().eq('profile_id', user.id)
    if (token) query = query.eq('token', token)
    await query

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in push unregister:', error?.message || error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
