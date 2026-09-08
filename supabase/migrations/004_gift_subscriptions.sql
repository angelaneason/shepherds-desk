-- Migration 004: Gift Subscriptions & Extended Profile Subscriptions
-- Created: 2026-09-08

CREATE TABLE IF NOT EXISTS gift_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  giver_name TEXT NOT NULL,
  giver_email TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  recipient_email TEXT,
  recipient_church TEXT,
  personal_message TEXT,
  plan_duration_months INTEGER NOT NULL DEFAULT 12,
  amount_paid INTEGER NOT NULL DEFAULT 14900,
  delivery_method TEXT NOT NULL DEFAULT 'email' CHECK (delivery_method IN ('email', 'print')),
  delivery_date DATE,
  status TEXT NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('pending_payment', 'paid', 'redeemed', 'expired')),
  stripe_session_id TEXT,
  stripe_payment_intent TEXT,
  redeemed_by_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  redeemed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_gift_subscriptions_code ON gift_subscriptions(code);
CREATE INDEX IF NOT EXISTS idx_gift_subscriptions_status ON gift_subscriptions(status);

-- Enable RLS
ALTER TABLE gift_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow public read of gift subscription by code (for certificate display and redemption lookup)
DROP POLICY IF EXISTS "Public read gift by code" ON gift_subscriptions;
CREATE POLICY "Public read gift by code" ON gift_subscriptions
  FOR SELECT USING (true);

-- Allow insert from public (or service role) for checkout initiation
DROP POLICY IF EXISTS "Public insert gift" ON gift_subscriptions;
CREATE POLICY "Public insert gift" ON gift_subscriptions
  FOR INSERT WITH CHECK (true);

-- Profile table columns for subscription tracking
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'standard';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;
