import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { sendPastorsWifeFollowUpEmail } from '@/lib/email'

function getServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Check if requester is admin
async function verifyAdmin() {
  const supabaseServer = await createClient()
  const { data: { user }, error } = await supabaseServer.auth.getUser()
  if (error || !user) return null

  const { data: profile } = await supabaseServer
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single() as any

  const adminEmails = ['angelaneason@gmail.com', 'tinyneason@gmail.com']
  const userEmail = (user.email || '').toLowerCase()
  const isAdminUser = profile?.role === 'admin' || adminEmails.includes(userEmail)

  if (!isAdminUser) return null
  return { user, profile }
}

// GET - List all pastor referrals across the entire platform
export async function GET() {
  try {
    const auth = await verifyAdmin()
    if (!auth) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const admin = getServiceClient()

    // Fetch all referrals and all profiles to map referrers
    const [referralsRes, profilesRes] = await Promise.all([
      admin.from('referrals').select('*').order('created_at', { ascending: false }),
      admin.from('profiles').select('id, full_name, church_name, email')
    ])

    if (referralsRes.error) {
      return NextResponse.json({ error: referralsRes.error.message }, { status: 500 })
    }

    const profilesMap = new Map((profilesRes.data || []).map((p: any) => [p.id, p]))

    const referrals = (referralsRes.data || []).map((r: any) => {
      const referrer = profilesMap.get(r.referrer_id)
      const referredUser = r.referred_id ? profilesMap.get(r.referred_id) : null
      return {
        ...r,
        referrer_name: referrer?.full_name || 'Pastor',
        referrer_church: referrer?.church_name || '',
        referrer_email: referrer?.email || '',
        referred_user_name: referredUser?.full_name || null
      }
    })

    const tracked = referrals.filter((r: any) => r.referred_email)
    const stats = {
      total: tracked.length,
      pending: tracked.filter((r: any) => r.status === 'pending').length,
      signedUp: tracked.filter((r: any) => r.status === 'signed_up' || r.status === 'subscribed').length,
      subscribed: tracked.filter((r: any) => r.status === 'subscribed').length
    }

    return NextResponse.json({ referrals, stats })
  } catch (error: any) {
    console.error('Error fetching admin referrals:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Send follow-ups or create VIP pastor invites
export async function POST(request: Request) {
  try {
    const auth = await verifyAdmin()
    if (!auth) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { action, referralId, name, email, customNote } = await request.json()
    const admin = getServiceClient()

    // 1. Send Follow-Up Note (From Pastor's Wife)
    if (action === 'send_followup') {
      if (!referralId) {
        return NextResponse.json({ error: 'Referral ID is required' }, { status: 400 })
      }

      const { data: referral, error: refErr } = await admin
        .from('referrals')
        .select('*')
        .eq('id', referralId)
        .single() as any

      if (refErr || !referral) {
        return NextResponse.json({ error: 'Referral record not found' }, { status: 404 })
      }

      if (!referral.referred_email || !referral.referred_email.includes('@')) {
        return NextResponse.json({ error: 'No valid email address recorded for this referral' }, { status: 400 })
      }

      // Get referrer profile
      const { data: referrerProfile } = await admin
        .from('profiles')
        .select('full_name')
        .eq('id', referral.referrer_id)
        .single() as any

      const referrerName = referrerProfile?.full_name ? `Pastor ${referrerProfile.full_name}` : undefined

      const isPastorTiny = (auth.user.email || '').toLowerCase().includes('tinyneason')
      const senderName = isPastorTiny ? 'Pastor Tiny Neason' : 'Angie'
      const senderRole = isPastorTiny ? 'pastor' as const : 'pastors_wife' as const

      const emailResult = await sendPastorsWifeFollowUpEmail({
        to: referral.referred_email.trim(),
        pastorName: name || undefined,
        referrerName,
        referralCode: referral.referral_code,
        customNote,
        senderName,
        senderRole
      })

      if (!emailResult.success) {
        return NextResponse.json({ error: emailResult.error || 'Failed to send follow-up email' }, { status: 500 })
      }

      return NextResponse.json({ success: true, emailId: emailResult.id })
    }

    // 2. Create and Send VIP Invitation
    if (action === 'create_vip_invite') {
      if (!email || !email.includes('@')) {
        return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
      }

      const randomCode = 'VIP-' + Math.random().toString(36).substring(2, 7).toUpperCase()

      const { data: newReferral, error: createErr } = await admin
        .from('referrals')
        .insert({
          referrer_id: auth.user.id,
          referral_code: randomCode,
          referred_email: email.trim(),
          status: 'pending'
        } as any)
        .select()
        .single()

      if (createErr) {
        return NextResponse.json({ error: createErr.message }, { status: 500 })
      }

      const isPastorTiny = (auth.user.email || '').toLowerCase().includes('tinyneason')
      const senderName = isPastorTiny ? 'Pastor Tiny Neason' : 'Angie'
      const senderRole = isPastorTiny ? 'pastor' as const : 'pastors_wife' as const
      const defaultNote = isPastorTiny
        ? 'I would love to personally invite you to The Shepherd\'s Desk as my VIP fellow pastor and guest!'
        : 'I would love to personally welcome you to The Shepherd\'s Desk as our VIP guest!'

      // Send the personal Founder / Pastor invitation
      const emailResult = await sendPastorsWifeFollowUpEmail({
        to: email.trim(),
        pastorName: name?.trim() || undefined,
        referrerName: isPastorTiny ? 'Pastor Tiny Neason' : 'Angie (Founder & Pastor\'s Wife)',
        referralCode: randomCode,
        customNote: customNote?.trim() || defaultNote,
        senderName,
        senderRole
      })

      return NextResponse.json({
        success: true,
        referral: newReferral,
        emailSent: emailResult.success,
        emailError: emailResult.error
      })
    }

    // 3. Delete Referral Record
    if (action === 'delete_referral') {
      if (!referralId) return NextResponse.json({ error: 'Referral ID is required' }, { status: 400 })
      await admin.from('referrals').delete().eq('id', referralId)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('Error in POST admin referrals:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}