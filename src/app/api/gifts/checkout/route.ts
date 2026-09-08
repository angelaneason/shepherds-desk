import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function generateGiftCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let part1 = '';
  let part2 = '';
  for (let i = 0; i < 4; i++) {
    part1 += chars.charAt(Math.floor(Math.random() * chars.length));
    part2 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `GIFT-${part1}-${part2}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      giverName,
      giverEmail,
      recipientName,
      recipientEmail,
      recipientChurch,
      personalMessage,
      planDuration = 12,
      deliveryMethod = 'email',
      deliveryDate
    } = body;

    if (!giverName?.trim() || !giverEmail?.trim() || !recipientName?.trim()) {
      return NextResponse.json(
        { error: 'Giver Name, Giver Email, and Pastor Name are required.' },
        { status: 400 }
      );
    }

    const durationMonths = Number(planDuration) === 6 ? 6 : 12;
    const unitAmount = durationMonths === 6 ? 7900 : 14900;
    const durationLabel = durationMonths === 6 ? '6 Months' : '1 Full Year';
    const giftCode = generateGiftCode();

    const admin = getAdminClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://theshepherdsdesk.app';

    // Insert pending gift subscription record
    const { data: giftRecord, error: dbError } = await admin
      .from('gift_subscriptions')
      .insert({
        code: giftCode,
        giver_name: giverName.trim(),
        giver_email: giverEmail.trim().toLowerCase(),
        recipient_name: recipientName.trim(),
        recipient_email: recipientEmail?.trim() ? recipientEmail.trim().toLowerCase() : null,
        recipient_church: recipientChurch?.trim() || null,
        personal_message: personalMessage?.trim() || null,
        plan_duration_months: durationMonths,
        amount_paid: unitAmount,
        delivery_method: deliveryMethod === 'print' ? 'print' : 'email',
        delivery_date: deliveryDate || null,
        status: 'pending_payment',
      } as any)
      .select()
      .single();

    if (dbError) {
      console.error('Error creating pending gift subscription in db:', dbError);
      return NextResponse.json({ error: 'Database error creating gift package.' }, { status: 500 });
    }

    // Create Stripe Checkout Session (one-time payment)
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: giverEmail.trim().toLowerCase(),
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `The Shepherd's Desk - ${durationLabel} Pastoral Gift Subscription`,
              description: `Dedicated to Pastor ${recipientName.trim()} with gratitude from ${giverName.trim()}`,
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      metadata: {
        is_gift: 'true',
        gift_id: giftRecord.id,
        gift_code: giftCode,
        giver_name: giverName.trim(),
        giver_email: giverEmail.trim().toLowerCase(),
        recipient_name: recipientName.trim(),
        recipient_email: recipientEmail?.trim() || '',
        plan_duration: String(durationMonths),
        delivery_method: deliveryMethod,
      },
      success_url: `${appUrl}/gift/success?session_id={CHECKOUT_SESSION_ID}&code=${giftCode}`,
      cancel_url: `${appUrl}/gift?cancelled=true`,
    });

    // Save Stripe session ID to gift record
    await admin
      .from('gift_subscriptions')
      .update({ stripe_session_id: session.id } as any)
      .eq('id', giftRecord.id);

    return NextResponse.json({ url: session.url, code: giftCode });
  } catch (err: any) {
    console.error('Stripe gift checkout error:', err);
    return NextResponse.json({ error: err.message || 'Failed to initiate checkout.' }, { status: 500 });
  }
}
