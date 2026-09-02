import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// POST - Log who the pastor shared their link with
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, email } = await request.json()
    if (!name && !email) {
      return NextResponse.json({ error: 'Name or email is required' }, { status: 400 })
    }

    const admin = getServiceClient()

    // Get the pastor's referral code
    const { data: existing } = await admin
      .from('referrals')
      .select('referral_code')
      .eq('referrer_id', user.id)
      .limit(1)
      .single() as any

    if (!existing) {
      return NextResponse.json({ error: 'Generate your invite link first' }, { status: 400 })
    }

    // Create a tracked share record
    const displayEmail = email || name
    const { data: referral, error } = await admin
      .from('referrals')
      .insert({
        referrer_id: user.id,
        referral_code: existing.referral_code,
        referred_email: displayEmail,
        status: 'pending'
      } as any)
      .select()
      .single()

    if (error) {
      // If unique constraint on referral_code, generate a variant
      if (error.code === '23505') {
        const variant = existing.referral_code + Math.random().toString(36).substring(2, 4).toUpperCase()
        const { data: r2, error: e2 } = await admin
          .from('referrals')
          .insert({
            referrer_id: user.id,
            referral_code: variant,
            referred_email: displayEmail,
            status: 'pending'
          } as any)
          .select()
          .single()
        
        if (e2) {
          console.error('Error logging share:', e2.message)
          return NextResponse.json({ error: 'Failed to log share' }, { status: 500 })
        }
        return NextResponse.json(r2)
      }
      
      console.error('Error logging share:', error.message)
      return NextResponse.json({ error: 'Failed to log share' }, { status: 500 })
    }

    return NextResponse.json(referral)
  } catch (error: any) {
    console.error('Unexpected error logging share:', error?.message || error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
