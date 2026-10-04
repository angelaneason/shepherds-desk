-- Migration 006: Push notifications, broadcast, referral notes/status,
-- automatic sign-up matching, and saved referral message templates.
-- Created: 2026-10-04
-- Safe to run more than once.

-- ─── 1. Push tokens ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  platform TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_profile ON public.push_tokens(profile_id);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own push tokens" ON public.push_tokens;
CREATE POLICY "Users can manage own push tokens" ON public.push_tokens
  FOR ALL USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);

-- ─── 2. Per-type notification preferences ───────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notification_preferences JSONB NOT NULL DEFAULT '{
    "referral": true,
    "sermon": true,
    "care": true,
    "study": true,
    "calendar": true,
    "announcement": true,
    "broadcast": true
  }'::jsonb;

-- Allow the new notification types in the in-app notification bell
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('study', 'care', 'sermon', 'announcement', 'system', 'referral', 'calendar', 'broadcast'));

-- Deduplication key so each scheduled reminder is pushed only once
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS dedupe_key TEXT;
-- Full (non-partial) unique index so upserts can target it; NULL keys never collide.
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedupe
  ON public.notifications(profile_id, dedupe_key);

-- ─── 3. Referral notes, Not Interested status, invite contact + sign-up email ─

ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS invite_name TEXT;
ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS invite_email TEXT;
ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS invite_phone TEXT;
ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS signup_email TEXT;
ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE public.referrals DROP CONSTRAINT IF EXISTS referrals_status_check;
ALTER TABLE public.referrals ADD CONSTRAINT referrals_status_check
  CHECK (status IN ('pending', 'signed_up', 'subscribed', 'not_interested'));

-- Pastors can update (notes/status) and delete their own referral records
DROP POLICY IF EXISTS "Users can update their own referrals" ON public.referrals;
CREATE POLICY "Users can update their own referrals" ON public.referrals
  FOR UPDATE USING (auth.uid() = referrer_id) WITH CHECK (auth.uid() = referrer_id);

DROP POLICY IF EXISTS "Users can delete their own referrals" ON public.referrals;
CREATE POLICY "Users can delete their own referrals" ON public.referrals
  FOR DELETE USING (auth.uid() = referrer_id);

-- Helper: digits-only phone (last 10 digits) for matching
CREATE OR REPLACE FUNCTION public.normalize_phone(p TEXT)
RETURNS TEXT AS $$
  SELECT CASE
    WHEN p IS NULL THEN NULL
    WHEN length(regexp_replace(p, '\D', '', 'g')) < 7 THEN NULL
    ELSE right(regexp_replace(p, '\D', '', 'g'), 10)
  END;
$$ LANGUAGE sql IMMUTABLE;

-- Backfill invite_email / invite_phone / invite_name from existing "Name (contact)" labels
UPDATE public.referrals
SET invite_email = lower(trim(substring(referred_email FROM '([A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,})')))
WHERE invite_email IS NULL
  AND referred_email ~ '[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}';

UPDATE public.referrals
SET invite_phone = public.normalize_phone(substring(referred_email FROM '\(([^)]*)\)'))
WHERE invite_phone IS NULL
  AND invite_email IS NULL
  AND public.normalize_phone(substring(referred_email FROM '\(([^)]*)\)')) IS NOT NULL;

UPDATE public.referrals
SET invite_name = trim(split_part(referred_email, '(', 1))
WHERE invite_name IS NULL
  AND referred_email LIKE '%(%';

-- Existing signed-up records: the referred_email was overwritten by the sign-up email
UPDATE public.referrals r
SET signup_email = p.email
FROM public.profiles p
WHERE r.referred_id = p.id AND r.signup_email IS NULL;

CREATE INDEX IF NOT EXISTS idx_referrals_invite_email ON public.referrals(lower(invite_email));
CREATE INDEX IF NOT EXISTS idx_referrals_invite_phone ON public.referrals(invite_phone);

-- ─── 4. Automatic sign-up matching ──────────────────────────────────────────
-- When a new account is created, mark any pending invite sent to the same
-- email (case-insensitive) or phone number as Signed Up.

CREATE OR REPLACE FUNCTION public.match_referral_on_signup()
RETURNS TRIGGER AS $$
DECLARE
  new_email TEXT := lower(trim(COALESCE(NEW.email, '')));
  new_phone TEXT := public.normalize_phone(COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone'));
BEGIN
  UPDATE public.referrals
  SET status = 'signed_up',
      referred_id = NEW.id,
      signup_email = NEW.email,
      converted_at = now(),
      updated_at = now()
  WHERE status = 'pending'
    AND referred_id IS NULL
    AND referrer_id <> NEW.id
    AND (
      (new_email <> '' AND lower(trim(invite_email)) = new_email)
      OR (new_phone IS NOT NULL AND invite_phone = new_phone)
    );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block a sign-up because of referral matching
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Runs after handle_new_user (alphabetical order: on_auth_user_created < on_auth_user_match_referral)
DROP TRIGGER IF EXISTS on_auth_user_match_referral ON auth.users;
CREATE TRIGGER on_auth_user_match_referral
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.match_referral_on_signup();

-- ─── 5. Saved referral message templates ────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.referral_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  visibility TEXT NOT NULL CHECK (visibility IN ('admin', 'all')) DEFAULT 'all',
  is_default BOOLEAN NOT NULL DEFAULT false,
  owner_email TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.referral_templates ENABLE ROW LEVEL SECURITY;

-- Any signed-in pastor can read templates shared with all pastors.
-- Admin-only templates and all writes go through the admin API (service role).
DROP POLICY IF EXISTS "Pastors can read shared templates" ON public.referral_templates;
CREATE POLICY "Pastors can read shared templates" ON public.referral_templates
  FOR SELECT USING (auth.role() = 'authenticated' AND visibility = 'all');

-- Seed with the current built-in messages (only if the table is empty)
INSERT INTO public.referral_templates (name, subject, body, visibility, is_default, owner_email)
SELECT * FROM (VALUES
  (
    'Standard Invite',
    'Try The Shepherd''s Desk',
    'I''ve been using The Shepherd''s Desk to organize my sermons, schedule, and pastoral care — and it''s been a game-changer. Try it free: {link}',
    'all',
    true,
    NULL
  ),
  (
    'Bro. Tiny – Personal',
    'A personal note from Bro. Tiny: The Shepherd''s Desk',
    E'Hey {name}, this is Bro. Tiny.\n\nSister Angie and I have developed an app called The Shepherd’s Desk to help pastors stay encouraged, organized, and supported in the work of ministry. We built it with pastors like you in mind because we know how much you carry for the church, the people, and the calling God has placed on your life.\n\nI’d love for you to take a look and see if it could be a blessing to you and your ministry: {link}\n\nBlessings,\nBro. Tiny',
    'admin',
    false,
    'tinyneason@gmail.com'
  )
) AS seed(name, subject, body, visibility, is_default, owner_email)
WHERE NOT EXISTS (SELECT 1 FROM public.referral_templates);
