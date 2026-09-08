import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET: Validate gift code and fetch presentation details
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code')?.trim().toUpperCase();

    if (!code) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 });
    }

    const admin = getAdminClient();
    const { data: gift, error } = await admin
      .from('gift_subscriptions')
      .select('id, code, giver_name, recipient_name, recipient_church, personal_message, plan_duration_months, status, delivery_method, created_at')
      .eq('code', code)
      .single();

    if (error || !gift) {
      return NextResponse.json({ error: 'Gift subscription not found.' }, { status: 404 });
    }

    return NextResponse.json({ gift });
  } catch (err: any) {
    console.error('Error fetching gift info:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

// POST: Redeem gift subscription to active user's account
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'You must be logged in to claim this gift subscription.' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const code = body?.code?.trim().toUpperCase();

    if (!code) {
      return NextResponse.json({ error: 'Redemption code is required.' }, { status: 400 });
    }

    const admin = getAdminClient();

    // Fetch gift subscription
    const { data: gift, error: fetchErr } = await admin
      .from('gift_subscriptions')
      .select('*')
      .eq('code', code)
      .single();

    if (fetchErr || !gift) {
      return NextResponse.json({ error: 'Invalid gift code.' }, { status: 404 });
    }

    if (gift.status === 'redeemed') {
      return NextResponse.json(
        { error: 'This gift subscription has already been redeemed.' },
        { status: 400 }
      );
    }

    if (gift.status !== 'paid') {
      return NextResponse.json(
        { error: 'This gift has not yet been processed or completed payment.' },
        { status: 400 }
      );
    }

    // Calculate expiration date
    const monthsToAdd = gift.plan_duration_months || 12;

    // Check existing profile expiration
    const { data: profile } = await admin
      .from('profiles')
      .select('subscription_expires_at')
      .eq('id', user.id)
      .single();

    let baseDate = new Date();
    if (profile?.subscription_expires_at) {
      const currentExpiry = new Date(profile.subscription_expires_at);
      if (currentExpiry > baseDate) {
        baseDate = currentExpiry;
      }
    }

    const newExpiry = new Date(baseDate);
    newExpiry.setMonth(newExpiry.getMonth() + monthsToAdd);

    // Update gift subscription to redeemed
    const { error: updateGiftErr } = await admin
      .from('gift_subscriptions')
      .update({
        status: 'redeemed',
        redeemed_by_profile_id: user.id,
        redeemed_at: new Date().toISOString(),
      } as any)
      .eq('id', gift.id);

    if (updateGiftErr) {
      console.error('Error updating gift status:', updateGiftErr);
      return NextResponse.json({ error: 'Failed to claim gift.' }, { status: 500 });
    }

    // Update user's profile with active subscription
    await admin
      .from('profiles')
      .update({
        subscription_tier: 'gift_pro',
        subscription_status: 'active',
        subscription_expires_at: newExpiry.toISOString(),
      } as any)
      .eq('id', user.id);

    return NextResponse.json({
      success: true,
      message: `Gift redeemed successfully! Your subscription is active until ${newExpiry.toLocaleDateString()}.`,
      expiresAt: newExpiry.toISOString(),
      gift: {
        giverName: gift.giver_name,
        planDurationMonths: gift.plan_duration_months,
      },
    });
  } catch (err: any) {
    console.error('Error redeeming gift:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
