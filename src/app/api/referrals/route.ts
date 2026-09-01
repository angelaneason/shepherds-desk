import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: referrals, error } = await supabase
      .from('referrals')
      .select('*')
      .eq('referrer_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching referrals:', error)
      return NextResponse.json({ error: 'Failed to fetch referrals' }, { status: 500 })
    }

    return NextResponse.json(referrals)
  } catch (error) {
    console.error('Unexpected error in GET referrals:', error)
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

    // Get user profile for name
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single() as any

    const nameStr = profile?.full_name ? profile.full_name.substring(0, 3).toUpperCase() : 'USR'
    const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase()
    const referralCode = `${nameStr}${randomStr}`

    // Insert referral
    const { data: referral, error } = await supabase
      .from('referrals')
      .insert({
        referrer_id: user.id,
        referral_code: referralCode,
        status: 'pending'
      } as any)
      .select()
      .single()

    if (error) {
      console.error('Error creating referral:', error)
      return NextResponse.json({ error: 'Failed to create referral' }, { status: 500 })
    }

    return NextResponse.json(referral)
  } catch (error) {
    console.error('Unexpected error in POST referrals:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
