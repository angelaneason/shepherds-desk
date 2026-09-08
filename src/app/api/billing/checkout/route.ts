import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const isAnnual = body?.plan === 'annual';

    // Monthly: $14.99/mo | Annual: $12.99/mo ($155.88 billed annually in advance)
    const unitAmount = isAnnual ? 15588 : 1499;
    const interval = isAnnual ? 'year' : 'month';
    const planName = isAnnual ? "The Shepherd's Desk Pro (Annual)" : "The Shepherd's Desk Pro (Monthly)";
    const planDescription = isAnnual 
      ? '$12.99/month ($155.88 billed annually in advance) - Includes 30-Day Free Trial'
      : '$14.99/month - Includes 30-Day Free Trial';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: planName,
              description: planDescription,
            },
            unit_amount: unitAmount,
            recurring: {
              interval: interval as 'month' | 'year',
            },
          },
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 30,
        metadata: {
          supabase_user_id: user.id,
          plan: isAnnual ? 'annual' : 'monthly',
        },
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://theshepherdsdesk.app'}/settings?billing=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://theshepherdsdesk.app'}/settings?billing=cancelled`,
      customer_email: user.email,
      metadata: {
        supabase_user_id: user.id,
        plan: isAnnual ? 'annual' : 'monthly',
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
