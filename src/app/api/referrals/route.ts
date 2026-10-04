import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { notifyUsers } from '@/lib/push'

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json([], { status: 200 })
    }

    const admin = getServiceClient()
    const { data: referrals, error } = await admin
      .from('referrals')
      .select('*')
      .eq('referrer_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching referrals:', error.message)
      return NextResponse.json({ error: 'Failed to fetch referrals' }, { status: 500 })
    }

    return NextResponse.json(referrals || [])
  } catch (error: any) {
    console.error('Unexpected error in GET referrals:', error?.message || error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = getServiceClient()

    // Check if this pastor already has a referral code — reuse it
    const { data: existing } = await admin
      .from('referrals')
      .select('*')
      .eq('referrer_id', user.id)
      .is('referred_email', null)
      .eq('status', 'pending')
      .limit(1)
      .single() as any

    if (existing) {
      return NextResponse.json(existing)
    }

    // Get user profile for name
    const { data: profile } = await admin
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single() as any

    const nameStr = profile?.full_name ? profile.full_name.substring(0, 3).toUpperCase() : 'USR'
    const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase()
    const referralCode = `${nameStr}${randomStr}`

    const { data: referral, error } = await admin
      .from('referrals')
      .insert({
        referrer_id: user.id,
        referral_code: referralCode,
        status: 'pending'
      } as any)
      .select()
      .single()

    if (error) {
      console.error('Error creating referral:', error.message, error.code)
      return NextResponse.json({ error: 'Failed to create referral' }, { status: 500 })
    }

    return NextResponse.json(referral)
  } catch (error: any) {
    console.error('Unexpected error in POST referrals:', error?.message || error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - called after signup to link a new user to a referral code
export async function PATCH(request: Request) {
  try {
    const { referralCode, email, userId } = await request.json()
    if (!referralCode || !email) {
      return NextResponse.json({ error: 'Missing referralCode or email' }, { status: 400 })
    }

    const admin = getServiceClient()

    // Find the referral by code
    const { data: referral, error: findError } = await admin
      .from('referrals')
      .select('*')
      .eq('referral_code', referralCode)
      .single() as any

    if (findError || !referral) {
      return NextResponse.json({ error: 'Referral code not found' }, { status: 404 })
    }

    // If this new account was already matched to an invite (e.g. by email at sign-up), stop here
    if (userId) {
      const { data: alreadyLinked } = await admin
        .from('referrals')
        .select('id')
        .eq('referred_id', userId)
        .limit(1) as any
      if (alreadyLinked && alreadyLinked.length > 0) {
        return NextResponse.json({ success: true, alreadyMatched: true })
      }
    }

    // The pastor's personal/group link (no specific invitee) or a link that was already
    // used by someone else: record this sign-up as its own row so the original stays intact.
    const isSharedLink = !referral.referred_email || (referral.referred_id && referral.referred_id !== userId)
    let targetId = referral.id

    if (isSharedLink) {
      const suffix = Math.random().toString(36).substring(2, 6).toUpperCase()
      const { data: created, error: insertError } = await admin
        .from('referrals')
        .insert({
          referrer_id: referral.referrer_id,
          referral_code: `${referral.referral_code}-${suffix}`,
          referred_email: email,
          invite_email: String(email).trim().toLowerCase(),
          signup_email: email,
          referred_id: userId || null,
          status: 'signed_up',
          converted_at: new Date().toISOString()
        } as any)
        .select('id')
        .single() as any
      if (insertError || !created) {
        console.error('Error recording shared-link signup:', insertError?.message)
        return NextResponse.json({ error: 'Failed to update referral' }, { status: 500 })
      }
      targetId = created.id
    }

    // Update with the new user's info.
    // Keep the original invite label (e.g. "Pastor David (555-123-4567)") and store
    // the address they actually signed up with separately.
    const { error: updateError } = isSharedLink ? { error: null } : await admin
      .from('referrals')
      .update({
        referred_email: referral.referred_email || email,
        signup_email: email,
        referred_id: userId || null,
        status: referral.status === 'subscribed' ? 'subscribed' : 'signed_up',
        converted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as any)
      .eq('id', referral.id)

    if (updateError) {
      console.error('Error updating referral:', updateError.message)
      return NextResponse.json({ error: 'Failed to update referral' }, { status: 500 })
    }

    // Instantly let the referring pastor know
    try {
      const who = referral.invite_name || email
      await notifyUsers(
        [referral.referrer_id],
        {
          type: 'referral',
          title: '🎉 Your referral signed up!',
          body: `${who} just joined The Shepherd's Desk. Thank you for sharing!`,
          link: 'Referrals'
        },
        { dedupeKey: `referral:${targetId}` }
      )
    } catch (notifyErr: any) {
      console.error('Referral notify failed:', notifyErr?.message || notifyErr)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Unexpected error in PATCH referrals:', error?.message || error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
