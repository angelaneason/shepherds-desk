-- Migration 009 PRE-FLIGHT CHECK (read-only — changes nothing)
-- Run this in the Supabase SQL editor BEFORE 009_people_model.sql and send
-- the results back. Each query returns one result grid.

-- A. Every foreign key that points at members, with its delete rule.
--    confdeltype: a = NO ACTION, r = RESTRICT, c = CASCADE, n = SET NULL, d = SET DEFAULT
--    Expected today: care_tasks.member_id and prayer_requests.member_id only.
SELECT
  conrelid::regclass                         AS table_name,
  conname                                    AS constraint_name,
  confdeltype                                AS on_delete_code,
  CASE confdeltype WHEN 'a' THEN 'NO ACTION' WHEN 'r' THEN 'RESTRICT'
                   WHEN 'c' THEN 'CASCADE'   WHEN 'n' THEN 'SET NULL'
                   WHEN 'd' THEN 'SET DEFAULT' END AS on_delete,
  pg_get_constraintdef(oid)                  AS definition
FROM pg_constraint
WHERE contype = 'f' AND confrelid = 'public.members'::regclass
ORDER BY 1, 2;

-- B. prayer_requests columns (confirms member_id + person_name exist and nullability)
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'prayer_requests'
ORDER BY ordinal_position;

-- C. Current legacy status counts. Expected: active 16, visitor 4, inactive 1.
SELECT status, count(*) FROM public.members GROUP BY status ORDER BY status;

-- D. Has 009 (or part of it) already been applied? Expected: 0 rows.
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'members'
  AND column_name IN ('is_member', 'archived_at', 'do_not_text', 'phone_e164', 'source');

-- E. Row-level security policies that delete_person relies on
--    (owner must be able to UPDATE/DELETE their care_tasks, prayer_requests,
--    calendar_events and members).
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('members', 'care_tasks', 'prayer_requests', 'calendar_events')
ORDER BY tablename, cmd;
