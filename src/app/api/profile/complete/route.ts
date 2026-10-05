import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const normalizePhone = (p: string) => {
  const digits = (p || '').replace(/\D/g, '')
  return digits.length >= 10 ? digits.slice(-10) : null
}

// GET: does the signed-in pastor still need to fill in their name / phone?
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ needsProfile: false })

  const admin = getServiceClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('full_name, church_id')
    .eq('id', user.id)
    .single() as any

  let churchName: string | null = null
  if (profile?.church_id) {
    const { data: church } = await admin.from('churches').select('name').eq('id', profile.church_id).single() as any
    churchName = church?.name || null
  }

  const name = (profile?.full_name || '').trim()
  const phone = (user.user_metadata?.phone || user.phone || '') as string
  const needsProfile = !name || name.toLowerCase() === 'pastor' || !normalizePhone(phone)

  return NextResponse.json({
    needsProfile,
    fullName: name.toLowerCase() === 'pastor' ? '' : name,
    phone,
    churchName: churchName === 'My Church' ? '' : (churchName || ''),
  })
}

// POST: save name / phone / church, then connect any pending invite sent to this phone or email
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { fullName, phone, churchName, invitedBy } = await request.json()
  if (!fullName?.trim()) return NextResponse.json({ error: 'Please enter your name.' }, { status: 400 })
  const normPhone = normalizePhone(phone || '')
  if (!normPhone) return NextResponse.json({ error: 'Please enter your 10-digit mobile number.' }, { status: 400 })

  const admin = getServiceClient()

  await (admin.from('profiles') as any).update({ full_name: fullName.trim() }).eq('id', user.id)

  if (churchName?.trim()) {
    const { data: profile } = await admin.from('profiles').select('church_id').eq('id', user.id).single() as any
    if (profile?.church_id) {
      await (admin.from('churches') as any).update({ name: churchName.trim() }).eq('id', profile.church_id)
    }
  }

  await admin.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...(user.user_metadata || {}),
      full_name: fullName.trim(),
      phone: phone.trim(),
      ...(invitedBy?.trim() ? { invited_by: invitedBy.trim() } : {}),
    },
  })

  // Connect a pending invite (same logic as the sign-up trigger)
  const email = (user.email || '').toLowerCase().trim()
  let matched = 0
  const { data: candidates } = await admin
    .from('referrals')
    .select('id, invite_email, invite_phone')
    .eq('status', 'pending')
    .is('referred_id', null)
    .neq('referrer_id', user.id) as any

  const ids = (candidates || [])
    .filter((r: any) => (r.invite_phone && r.invite_phone === normPhone) || (email && (r.invite_email || '').toLowerCase().trim() === email))
    .map((r: any) => r.id)

  if (ids.length) {
    const now = new Date().toISOString()
    const { error } = await (admin.from('referrals') as any)
      .update({ status: 'signed_up', referred_id: user.id, signup_email: user.email, converted_at: now, updated_at: now })
      .in('id', ids)
    if (!error) matched = ids.length
  }

  return NextResponse.json({ success: true, matched })
}
