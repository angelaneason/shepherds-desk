-- Migration: 005_performance_indexes.sql
-- Optimizes query performance across all high-traffic tables with composite indexes.
-- Accelerates RLS policies and eliminates sequential table scans.

-- 1. Calendar Events (Accelerates dashboard month, today, and study event queries)
CREATE INDEX IF NOT EXISTS idx_calendar_events_profile_start 
  ON public.calendar_events (profile_id, start_time ASC);

CREATE INDEX IF NOT EXISTS idx_calendar_events_profile_type_start 
  ON public.calendar_events (profile_id, event_type, start_time ASC);

-- 2. Sermons (Accelerates next sermon lookup, list sorting, and status filtering)
CREATE INDEX IF NOT EXISTS idx_sermons_author_preach_date 
  ON public.sermons (author_id, preach_date ASC);

CREATE INDEX IF NOT EXISTS idx_sermons_author_created 
  ON public.sermons (author_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sermons_author_status 
  ON public.sermons (author_id, status);

-- 3. Care Tasks (Accelerates pastoral care pipeline and overdue/pending task alerts)
CREATE INDEX IF NOT EXISTS idx_care_tasks_profile_status_due 
  ON public.care_tasks (profile_id, status, due_date ASC);

-- 4. Ideas / Quick Capture (Accelerates personal reminders and notes retrieval)
CREATE INDEX IF NOT EXISTS idx_ideas_profile_created 
  ON public.ideas (profile_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ideas_profile_archived 
  ON public.ideas (profile_id, archived, created_at DESC);

-- 5. Notifications (Accelerates unread badge counts and recent notifications)
CREATE INDEX IF NOT EXISTS idx_notifications_profile_created 
  ON public.notifications (profile_id, created_at DESC);

-- 6. Church Members (Accelerates member lookups in pastoral care)
CREATE INDEX IF NOT EXISTS idx_members_profile_name 
  ON public.members (profile_id, full_name ASC);
