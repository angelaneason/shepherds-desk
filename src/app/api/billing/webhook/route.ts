import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { sendGiftPastorNotificationEmail, sendGiftGiverReceiptEmail } from '@/lib/email';

function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error: any) {
    console.error(`Webhook signature verification failed: ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const admin = getAdminClient();

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as any;

      // Handle Gift Subscriptions
      if (session.metadata?.is_gift === 'true') {
        const giftId = session.metadata.gift_id;
        const giftCode = session.metadata.gift_code;
        const giverName = session.metadata.giver_name;
        const giverEmail = session.metadata.giver_email;
        const recipientName = session.metadata.recipient_name;
        const recipientEmail = session.metadata.recipient_email;
        const planDurationMonths = Number(session.metadata.plan_duration) || 12;
        const deliveryMethod = session.metadata.delivery_method || 'email';

        console.log(`[Gift Webhook] Processing gift ${giftId} (${giftCode}) from ${giverName} to Pastor ${recipientName}`);

        // Update gift subscription to 'paid'
        const { data: updatedGift, error: giftUpdateErr } = await admin
          .from('gift_subscriptions')
          .update({
            status: 'paid',
            stripe_payment_intent: session.payment_intent || null,
          } as any)
          .eq('id', giftId)
          .select()
          .single();

        if (giftUpdateErr) {
          console.error('[Gift Webhook] Error updating gift subscription status to paid:', giftUpdateErr);
        }

        // 1. Send receipt email to the giver with link to their certificate
        if (giverEmail) {
          try {
            await sendGiftGiverReceiptEmail({
              to: giverEmail,
              giverName,
              recipientName,
              planDurationMonths,
              redemptionCode: giftCode,
              deliveryMethod,
            });
            console.log(`[Gift Webhook] Sent giver receipt email to ${giverEmail}`);
          } catch (e) {
            console.error('[Gift Webhook] Error sending giver receipt email:', e);
          }
        }

        // 2. If delivery method is email and recipient email is provided, send email directly to pastor
        if (deliveryMethod === 'email' && recipientEmail) {
          try {
            await sendGiftPastorNotificationEmail({
              to: recipientEmail,
              recipientName,
              giverName,
              personalMessage: updatedGift?.personal_message || '',
              planDurationMonths,
              redemptionCode: giftCode,
            });
            console.log(`[Gift Webhook] Sent pastor notification email to ${recipientEmail}`);
          } catch (e) {
            console.error('[Gift Webhook] Error sending pastor gift email:', e);
          }
        }

        break;
      }

      // Standard user subscription checkout
      const userId = session.metadata?.supabase_user_id;
      const customerId = session.customer;

      if (userId) {
        // Save Stripe customer ID to profile
        await admin.from('profiles').update({
          stripe_customer_id: customerId,
        } as any).eq('id', userId);

        // Mark referral as converted/subscribed
        await admin.from('referrals').update({
          status: 'subscribed',
          converted_at: new Date().toISOString(),
        } as any).eq('referred_id', userId);
      }
      break;
    }
    case 'customer.subscription.updated': {
      const subscription = event.data.object as any;
      console.log('Subscription updated:', subscription.id);
      break;
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as any;
      console.log('Subscription deleted:', subscription.id);
      break;
    }
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
