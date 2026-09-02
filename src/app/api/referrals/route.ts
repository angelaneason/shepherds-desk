import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

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

    // Update with the new user's info
    const { error: updateError } = await admin
      .from('referrals')
      .update({
        referred_email: email,
        referred_id: userId || null,
        status: 'signed_up'
      } as any)
      .eq('id', referral.id)

    if (updateError) {
      console.error('Error updating referral:', updateError.message)
      return NextResponse.json({ error: 'Failed to update referral' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Unexpected error in PATCH referrals:', error?.message || error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
