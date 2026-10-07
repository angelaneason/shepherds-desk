-- Migration 010: Saved broadcasts (Phase 1)
-- Created: 2026-10-07
--
-- Replaces the old "group text" broadcast (one sms: link with every number,
-- which exposed everyone's phone number to everyone). TSD never creates a
-- group SMS. A broadcast is now saved, then handed off ONE PERSON AT A TIME
-- (channel = 'sms_handoff'). Phase 6 adds channel = 'bridge'.
--
--   broadcasts            one row per broadcast (text, time, counts, status)
--   broadcast_recipients  one row per person included
--
-- Rules carried over from migration 009:
--   * broadcast_recipients.member_id -> members is NO ACTION (never cascade).
--     delete_person() detaches it and keeps a name snapshot.
--   * Do Not Text people are skipped by the SERVER when the broadcast is
--     created (create_broadcast), so a modified client cannot get around it.
--   * No phone number is copied for handoff broadcasts; the app reads the
--     person's current number at the moment it opens their text.
--
-- Run in the Supabase SQL editor. One transaction: all or nothing.

BEGIN;

-- ─── 1. Tables ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.broadcasts (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id            uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body                  text NOT NULL CHECK (length(btrim(body)) > 0 AND length(body) <= 2000),
  channel               text NOT NULL DEFAULT 'sms_handoff' CHECK (channel IN ('sms_handoff', 'bridge')),
  device_id             uuid,            -- bridge only (Phase 3 adds the FK)
  device_label_snapshot text,            -- e.g. "Angie's Galaxy"
  status                text NOT NULL DEFAULT 'draft' CHECK (status IN (
                          'draft', 'awaiting_phone_approval', 'sending', 'paused',
                          'completed', 'completed_with_issues', 'cancelled', 'expired')),
  approved_at           timestamptz,
  started_at            timestamptz,
  completed_at          timestamptz,
  total                 int NOT NULL DEFAULT 0,
  pending               int NOT NULL DEFAULT 0,   -- not_opened / queued / sending
  opened                int NOT NULL DEFAULT 0,   -- handoff: text opened in the messaging app
  sent                  int NOT NULL DEFAULT 0,   -- bridge
  delivered             int NOT NULL DEFAULT 0,   -- bridge
  failed                int NOT NULL DEFAULT 0,   -- bridge
  skipped               int NOT NULL DEFAULT 0,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.broadcast_recipients (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id   uuid NOT NULL REFERENCES public.broadcasts(id) ON DELETE CASCADE,
  profile_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- NO ACTION: deleting a person never silently removes broadcast history.
  member_id      uuid REFERENCES public.members(id) ON DELETE NO ACTION,
  name_snapshot  text NOT NULL,          -- name at send time; "Deleted contact" after Delete everything
  was_archived   boolean NOT NULL DEFAULT false,  -- included on purpose via Show archived
  position       int NOT NULL DEFAULT 0, -- order in the step-through
  to_e164        text,                   -- bridge only; wiped at final status
  status         text NOT NULL DEFAULT 'not_opened' CHECK (status IN (
                   'not_opened', 'opened', 'skipped',                              -- handoff
                   'queued', 'sending', 'sent', 'delivered', 'failed', 'cancelled')), -- bridge
  skip_reason    text CHECK (skip_reason IN ('do_not_text', 'no_phone', 'invalid_phone', 'duplicate_number', 'user_skipped')),
  error_code     text,
  segments       int,
  opened_at      timestamptz,
  sent_at        timestamptz,
  delivered_at   timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (broadcast_id, member_id)
);

CREATE INDEX IF NOT EXISTS broadcasts_profile_created_idx ON public.broadcasts (profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS broadcast_recipients_broadcast_idx ON public.broadcast_recipients (broadcast_id, position);
CREATE INDEX IF NOT EXISTS broadcast_recipients_member_idx ON public.broadcast_recipients (member_id) WHERE member_id IS NOT NULL;

-- ─── 2. Row level security ─────────────────────────────────────────────────

ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_recipients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own broadcasts" ON public.broadcasts;
CREATE POLICY "Users manage own broadcasts" ON public.broadcasts
  FOR ALL
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "Users manage own broadcast recipients" ON public.broadcast_recipients;
CREATE POLICY "Users manage own broadcast recipients" ON public.broadcast_recipients
  FOR ALL
  USING (profile_id = auth.uid())
  WITH CHECK (
    profile_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.broadcasts b WHERE b.id = broadcast_id AND b.profile_id = auth.uid())
    AND (member_id IS NULL OR EXISTS (SELECT 1 FROM public.members m WHERE m.id = member_id AND m.profile_id = auth.uid()))
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.broadcasts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.broadcast_recipients TO authenticated;

-- ─── 3. Recipient bookkeeping ──────────────────────────────────────────────

-- Before each recipient update: timestamps, and wipe any copied number once
-- the recipient reaches a final status.
CREATE OR REPLACE FUNCTION public.broadcast_recipients_before_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.status = 'opened' AND OLD.status IS DISTINCT FROM 'opened' THEN
    NEW.opened_at := now();
  END IF;
  IF NEW.status <> 'skipped' THEN
    NEW.skip_reason := NULL;
  END IF;
  IF NEW.status IN ('opened', 'skipped', 'sent', 'delivered', 'failed', 'cancelled') THEN
    NEW.to_e164 := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS broadcast_recipients_before_update ON public.broadcast_recipients;
CREATE TRIGGER broadcast_recipients_before_update
  BEFORE UPDATE ON public.broadcast_recipients
  FOR EACH ROW EXECUTE FUNCTION public.broadcast_recipients_before_update();

-- Recompute a broadcast's counts from its recipients. A handoff broadcast
-- that is in progress becomes 'completed' once nobody is left to open.
CREATE OR REPLACE FUNCTION public.broadcast_recount(p_broadcast_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE public.broadcasts b
  SET total      = c.total,
      pending    = c.pending,
      opened     = c.opened,
      sent       = c.sent,
      delivered  = c.delivered,
      failed     = c.failed,
      skipped    = c.skipped,
      updated_at = now()
  FROM (
    SELECT count(*)                                                        AS total,
           count(*) FILTER (WHERE status IN ('not_opened', 'queued', 'sending')) AS pending,
           count(*) FILTER (WHERE status = 'opened')                       AS opened,
           count(*) FILTER (WHERE status IN ('sent', 'delivered'))         AS sent,
           count(*) FILTER (WHERE status = 'delivered')                    AS delivered,
           count(*) FILTER (WHERE status = 'failed')                       AS failed,
           count(*) FILTER (WHERE status = 'skipped')                      AS skipped
    FROM public.broadcast_recipients
    WHERE broadcast_id = p_broadcast_id
  ) c
  WHERE b.id = p_broadcast_id;

  UPDATE public.broadcasts
  SET status = 'completed', completed_at = now()
  WHERE id = p_broadcast_id
    AND channel = 'sms_handoff'
    AND status IN ('sending', 'paused')
    AND pending = 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.broadcast_recipients_after_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  PERFORM public.broadcast_recount(COALESCE(NEW.broadcast_id, OLD.broadcast_id));
  RETURN NULL;
END;
$$;

-- Inserts are counted once at the end of create_broadcast(), not per row.
DROP TRIGGER IF EXISTS broadcast_recipients_after_change ON public.broadcast_recipients;
CREATE TRIGGER broadcast_recipients_after_change
  AFTER UPDATE OF status OR DELETE ON public.broadcast_recipients
  FOR EACH ROW EXECUTE FUNCTION public.broadcast_recipients_after_change();

-- ─── 4. create_broadcast(): save a broadcast, server-side filtering ────────
-- Takes the people the pastor picked. Only the caller's own people are used.
-- Each person is recorded; people who can't be texted are recorded as
-- skipped with a reason (Do Not Text, no phone, invalid phone, or a number
-- already used by someone earlier in the list). Returns the broadcast id.

CREATE OR REPLACE FUNCTION public.create_broadcast(p_body text, p_member_ids uuid[])
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_uid   uuid := auth.uid();
  v_id    uuid;
  v_count int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '28000';
  END IF;
  IF p_body IS NULL OR btrim(p_body) = '' THEN
    RAISE EXCEPTION 'Message is empty' USING ERRCODE = '22023';
  END IF;
  IF p_member_ids IS NULL OR cardinality(p_member_ids) = 0 THEN
    RAISE EXCEPTION 'Pick at least one person' USING ERRCODE = '22023';
  END IF;
  IF cardinality(p_member_ids) > 500 THEN
    RAISE EXCEPTION 'Too many recipients (max 500)' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.broadcasts (profile_id, body, channel, status)
  VALUES (v_uid, btrim(p_body), 'sms_handoff', 'draft')
  RETURNING id INTO v_id;

  WITH picked AS (
    SELECT m.id, m.full_name, m.archived_at, m.do_not_text, m.phone, m.phone_e164,
           row_number() OVER (PARTITION BY m.phone_e164, m.do_not_text ORDER BY m.full_name, m.id) AS dup_rank
    FROM public.members m
    WHERE m.id = ANY (p_member_ids)
      AND m.profile_id = v_uid
  ), classified AS (
    SELECT p.*,
           CASE
             WHEN p.do_not_text                                   THEN 'do_not_text'
             WHEN p.phone IS NULL OR btrim(p.phone) = ''          THEN 'no_phone'
             WHEN p.phone_e164 IS NULL                            THEN 'invalid_phone'
             WHEN p.dup_rank > 1                                  THEN 'duplicate_number'
           END AS reason
    FROM picked p
  )
  INSERT INTO public.broadcast_recipients
    (broadcast_id, profile_id, member_id, name_snapshot, was_archived, position, status, skip_reason)
  SELECT v_id, v_uid, c.id, c.full_name, c.archived_at IS NOT NULL,
         row_number() OVER (ORDER BY (c.reason IS NOT NULL), c.full_name, c.id),
         CASE WHEN c.reason IS NULL THEN 'not_opened' ELSE 'skipped' END,
         c.reason
  FROM classified c;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count = 0 THEN
    RAISE EXCEPTION 'None of the selected people were found' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.broadcasts SET status = 'sending', started_at = now() WHERE id = v_id;
  PERFORM public.broadcast_recount(v_id);
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_broadcast(text, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_broadcast(text, uuid[]) TO authenticated;
REVOKE ALL ON FUNCTION public.broadcast_recount(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.broadcast_recount(uuid) TO authenticated;

-- ─── 5. person_link_summary(): now also counts broadcasts ─────────────────

CREATE OR REPLACE FUNCTION public.person_link_summary(p_member_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_member public.members%ROWTYPE;
BEGIN
  SELECT * INTO v_member
  FROM public.members
  WHERE id = p_member_id AND profile_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Person not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN jsonb_build_object(
    'full_name',        v_member.full_name,
    'care_tasks',       (SELECT count(*) FROM public.care_tasks WHERE member_id = p_member_id),
    'care_tasks_open',  (SELECT count(*) FROM public.care_tasks WHERE member_id = p_member_id AND status <> 'completed'),
    'calendar_events',  (SELECT count(*) FROM public.calendar_events ce
                           WHERE ce.care_task_id IN (SELECT id FROM public.care_tasks WHERE member_id = p_member_id)
                              OR ce.id IN (SELECT calendar_event_id FROM public.care_tasks
                                           WHERE member_id = p_member_id AND calendar_event_id IS NOT NULL)),
    'prayer_requests',  (SELECT count(*) FROM public.prayer_requests WHERE member_id = p_member_id),
    'broadcasts',       (SELECT count(DISTINCT broadcast_id) FROM public.broadcast_recipients WHERE member_id = p_member_id),
    'has_notes',        (v_member.notes IS NOT NULL AND btrim(v_member.notes) <> ''),
    'is_archived',      (v_member.archived_at IS NOT NULL)
  );
END;
$$;

-- ─── 6. delete_person(): now also handles broadcast history ───────────────
-- Broadcast recipient rows are NEVER deleted with a person, so a saved
-- broadcast's counts never change:
--   'keep'       → member_id cleared, name_snapshot kept ("Jane Doe (deleted)")
--   'delete_all' → member_id cleared, name_snapshot = 'Deleted contact'
-- Everything else is unchanged from migration 009.

CREATE OR REPLACE FUNCTION public.delete_person(p_member_id uuid, p_history_mode text DEFAULT 'keep')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_name        text;
  v_task_ids    uuid[];
  v_event_ids   uuid[];
  v_prayer_ids  uuid[];
  v_tasks       int := 0;
  v_events      int := 0;
  v_prayers     int := 0;
  v_broadcasts  int := 0;
BEGIN
  IF p_history_mode NOT IN ('keep', 'delete_all') THEN
    RAISE EXCEPTION 'Invalid history mode: %', p_history_mode USING ERRCODE = '22023';
  END IF;

  SELECT full_name INTO v_name
  FROM public.members
  WHERE id = p_member_id AND profile_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Person not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT coalesce(array_agg(id), '{}') INTO v_task_ids
  FROM public.care_tasks WHERE member_id = p_member_id;

  SELECT coalesce(array_agg(id), '{}') INTO v_prayer_ids
  FROM public.prayer_requests WHERE member_id = p_member_id;

  -- Broadcast history: always kept as rows (both modes)
  UPDATE public.broadcast_recipients
  SET member_id     = NULL,
      to_e164       = NULL,
      name_snapshot = CASE WHEN p_history_mode = 'keep' THEN COALESCE(NULLIF(btrim(name_snapshot), ''), v_name)
                           ELSE 'Deleted contact' END
  WHERE member_id = p_member_id;
  GET DIAGNOSTICS v_broadcasts = ROW_COUNT;

  IF p_history_mode = 'keep' THEN
    UPDATE public.care_tasks
    SET member_name_snapshot = v_name,
        member_id = NULL
    WHERE id = ANY (v_task_ids);
    GET DIAGNOSTICS v_tasks = ROW_COUNT;

    UPDATE public.prayer_requests
    SET person_name = COALESCE(NULLIF(btrim(person_name), ''), v_name),
        member_id = NULL
    WHERE id = ANY (v_prayer_ids);
    GET DIAGNOSTICS v_prayers = ROW_COUNT;

  ELSE
    -- Calendar events that were created for this person's care tasks
    SELECT coalesce(array_agg(DISTINCT eid), '{}') INTO v_event_ids
    FROM (
      SELECT id AS eid FROM public.calendar_events WHERE care_task_id = ANY (v_task_ids)
      UNION
      SELECT calendar_event_id FROM public.care_tasks
      WHERE id = ANY (v_task_ids) AND calendar_event_id IS NOT NULL
    ) s;

    -- Break the task ↔ event links in both directions before deleting
    UPDATE public.calendar_events SET care_task_id = NULL WHERE care_task_id = ANY (v_task_ids);
    UPDATE public.care_tasks SET calendar_event_id = NULL WHERE id = ANY (v_task_ids);

    -- Other care tasks that point at one of the prayers being deleted keep
    -- existing; only their link to the deleted prayer is cleared.
    UPDATE public.care_tasks SET prayer_request_id = NULL
    WHERE prayer_request_id = ANY (v_prayer_ids) AND NOT (id = ANY (v_task_ids));

    DELETE FROM public.care_tasks WHERE id = ANY (v_task_ids);
    GET DIAGNOSTICS v_tasks = ROW_COUNT;

    DELETE FROM public.calendar_events WHERE id = ANY (v_event_ids);
    GET DIAGNOSTICS v_events = ROW_COUNT;

    DELETE FROM public.prayer_requests WHERE id = ANY (v_prayer_ids);
    GET DIAGNOSTICS v_prayers = ROW_COUNT;
  END IF;

  DELETE FROM public.members WHERE id = p_member_id;

  RETURN jsonb_build_object(
    'history_mode',     p_history_mode,
    'care_tasks',       v_tasks,
    'calendar_events',  v_events,
    'prayer_requests',  v_prayers,
    'broadcast_recipients', v_broadcasts
  );
END;
$$;

REVOKE ALL ON FUNCTION public.delete_person(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_person(uuid, text) TO authenticated;
REVOKE ALL ON FUNCTION public.person_link_summary(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.person_link_summary(uuid) TO authenticated;

-- ─── 7. Safety check (same rule as 009) ────────────────────────────────────
DO $$
DECLARE bad text;
BEGIN
  SELECT string_agg(conrelid::regclass || '.' || conname, ', ') INTO bad
  FROM pg_constraint
  WHERE contype = 'f'
    AND confrelid = 'public.members'::regclass
    AND confdeltype NOT IN ('a', 'r');   -- a = NO ACTION, r = RESTRICT
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'Foreign keys to members must not cascade/set null: %', bad;
  END IF;
END $$;

COMMIT;

-- ─── Verification (run after COMMIT) ────────────────────────────────────────
-- Every FK to members must be NO ACTION ('a') or RESTRICT ('r'):
-- SELECT conrelid::regclass, conname, confdeltype
-- FROM pg_constraint WHERE contype = 'f' AND confrelid = 'public.members'::regclass;
