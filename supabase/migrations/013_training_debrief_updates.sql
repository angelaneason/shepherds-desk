-- Migration 013: Training Debrief Improvements
-- 1. Sermon Speaker Attribution (My Sermon vs. Other Speaker / Guest)
ALTER TABLE public.sermons
  ADD COLUMN IF NOT EXISTS speaker_name TEXT,
  ADD COLUMN IF NOT EXISTS is_own_sermon BOOLEAN DEFAULT true;

-- 2. Support Tickets Table (Questions, Bug Reports, Enhancement Requests)
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  church_id UUID REFERENCES public.churches(id) ON DELETE SET NULL,
  user_name TEXT,
  user_email TEXT,
  category TEXT NOT NULL DEFAULT 'question' CHECK (category IN ('question', 'bug', 'enhancement')),
  message TEXT NOT NULL,
  page_url TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Users can insert their own support tickets and view their own tickets
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'support_tickets' AND policyname = 'Users can create support tickets'
  ) THEN
    CREATE POLICY "Users can create support tickets" ON public.support_tickets
      FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'support_tickets' AND policyname = 'Users can view own support tickets'
  ) THEN
    CREATE POLICY "Users can view own support tickets" ON public.support_tickets
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;
