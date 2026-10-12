-- Migration 012: Sunday Announcements Archive
-- Created: 2026-10-12
-- Supports saved Sunday announcements curated from calendar events and custom pastoral items.

CREATE TABLE IF NOT EXISTS public.sunday_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sunday_date DATE NOT NULL,
  title TEXT NOT NULL,
  script_spoken TEXT NOT NULL,
  script_bulletin TEXT NOT NULL,
  script_sms TEXT NOT NULL,
  included_event_ids UUID[] DEFAULT '{}',
  custom_items JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.sunday_announcements ENABLE ROW LEVEL SECURITY;

-- Allow pastors to manage only their own Sunday announcements
CREATE POLICY "Users can manage own sunday announcements" 
  ON public.sunday_announcements FOR ALL 
  USING (auth.uid() = profile_id);

-- Performance index for sorting by date
CREATE INDEX IF NOT EXISTS idx_sunday_announcements_profile_date 
  ON public.sunday_announcements(profile_id, sunday_date DESC);
