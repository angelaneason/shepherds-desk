-- Migration 009: People model (Phase 0)
-- Created: 2026-10-07
--
-- Final People model:
--   is_member    = ⭐ church member, or an ordinary contact (no label)
--   archived_at  = hidden from normal working lists/pickers (reversible)
--   do_not_text  = TSD may not initiate texts to this person
--
-- Also:
--   * phone_e164 (normalized phone) maintained automatically by trigger
--   * legacy members.status kept ONLY for backward compatibility; it is now
--     derived from the new fields and must not be used by new UI
--   * every foreign key that points at members uses NO ACTION (never CASCADE /
--     SET NULL), so linked history can never disappear as a side effect.
--     People are deleted only through public.delete_person(), which handles
--     every linked record explicitly.
--
-- Run in the Supabase SQL editor. The whole script is one transaction:
-- if any step fails, nothing is changed.

BEGIN;

-- ─── 1. New person attributes ───────────────────────────────────────────────

ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS is_member                boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS member_status_changed_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_at              timestamptz,
  ADD COLUMN IF NOT EXISTS archived_by              uuid,
  ADD COLUMN IF NOT EXISTS do_not_text              boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS do_not_text_updated_at   timestamptz,
  ADD COLUMN IF NOT EXISTS phone_e164               text,
  ADD COLUMN IF NOT EXISTS source                   text        NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS updated_at               timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'members_source_check') THEN
    ALTER TABLE public.members
      ADD CONSTRAINT members_source_check
      CHECK (source IN ('manual', 'phone_import', 'csv_import', 'legacy'));
  END IF;
END $$;

-- ─── 2. Phone normalization (E.164, US default country code) ────────────────

CREATE OR REPLACE FUNCTION public.to_e164(p text, default_cc text DEFAULT '1')
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p IS NULL OR btrim(p) = '' THEN NULL
    -- Already international: +<8..15 digits>
    WHEN btrim(p) LIKE '+%' AND length(regexp_replace(p, '\D', '', 'g')) BETWEEN 8 AND 15
      THEN '+' || regexp_replace(p, '\D', '', 'g')
    -- 10-digit national number
    WHEN length(regexp_replace(p, '\D', '', 'g')) = 10
      THEN '+' || default_cc || regexp_replace(p, '\D', '', 'g')
    -- 11 digits starting with the country code (e.g. 1-555-123-4567)
    WHEN length(regexp_replace(p, '\D', '', 'g')) = 11
         AND left(regexp_replace(p, '\D', '', 'g'), length(default_cc)) = default_cc
      THEN '+' || regexp_replace(p, '\D', '', 'g')
    ELSE NULL
  END;
$$;

-- ─── 3. One-time migration of existing people ───────────────────────────────
--   Active   → ⭐ Member, not archived
--   Visitor  → no ⭐,     not archived
--   Inactive → no ⭐,     archived
-- Guarded so re-running the script never re-maps people edited in the new UI.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.members WHERE source <> 'manual' OR member_status_changed_at IS NOT NULL OR archived_at IS NOT NULL) THEN
    UPDATE public.members
    SET is_member                = (status = 'active'),
        member_status_changed_at = CASE WHEN status = 'active' THEN created_at END,
        archived_at              = CASE WHEN status = 'inactive' THEN now() END,
        source                   = 'legacy';
  END IF;
END $$;

UPDATE public.members SET phone_e164 = public.to_e164(phone);

-- New rows default to "contact"; legacy clients that still send status are
-- mapped by the trigger below.
ALTER TABLE public.members ALTER COLUMN status SET DEFAULT 'visitor';

-- ─── 4. Keep derived fields in sync on every write ──────────────────────────

CREATE OR REPLACE FUNCTION public.members_before_write()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.phone_e164 := public.to_e164(NEW.phone);

  IF TG_OP = 'INSERT' THEN
    -- Backward compatibility: older app versions send only the legacy status.
    IF NEW.status = 'active' THEN
      NEW.is_member := true;
    ELSIF NEW.status = 'inactive' AND NEW.archived_at IS NULL THEN
      NEW.archived_at := now();
    END IF;

    IF NEW.is_member THEN
      NEW.member_status_changed_at := COALESCE(NEW.member_status_changed_at, now());
    END IF;
    IF NEW.do_not_text THEN
      NEW.do_not_text_updated_at := COALESCE(NEW.do_not_text_updated_at, now());
    END IF;
    IF NEW.archived_at IS NOT NULL THEN
      NEW.archived_by := COALESCE(NEW.archived_by, auth.uid());
    END IF;
  ELSE
    IF NEW.is_member IS DISTINCT FROM OLD.is_member THEN
      NEW.member_status_changed_at := now();
    END IF;
    IF NEW.do_not_text IS DISTINCT FROM OLD.do_not_text THEN
      NEW.do_not_text_updated_at := now();
    END IF;
    IF NEW.archived_at IS NOT NULL AND OLD.archived_at IS NULL THEN
      NEW.archived_by := COALESCE(auth.uid(), NEW.archived_by);
    ELSIF NEW.archived_at IS NULL THEN
      NEW.archived_by := NULL;
    END IF;
    NEW.updated_at := now();
  END IF;

  -- Legacy status is derived (read-only for compatibility).
  NEW.status := CASE
    WHEN NEW.archived_at IS NOT NULL THEN 'inactive'
    WHEN NEW.is_member THEN 'active'
    ELSE 'visitor'
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS members_before_write ON public.members;
CREATE TRIGGER members_before_write
  BEFORE INSERT OR UPDATE ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.members_before_write();

CREATE INDEX IF NOT EXISTS idx_members_profile_archived ON public.members (profile_id, archived_at);
CREATE INDEX IF NOT EXISTS idx_members_profile_is_member ON public.members (profile_id, is_member);
CREATE INDEX IF NOT EXISTS idx_members_profile_phone_e164 ON public.members (profile_id, phone_e164);

-- ─── 5. Name snapshot for care tasks (used only when a person is deleted) ──

ALTER TABLE public.care_tasks
  ADD COLUMN IF NOT EXISTS member_name_snapshot text;

-- care_tasks.member_id must allow NULL so history can be kept after deletion.
ALTER TABLE public.care_tasks ALTER COLUMN member_id DROP NOT NULL;

-- ─── 6. Relationships to members: no cascading, ever ───────────────────────
-- Replace the existing foreign keys on care_tasks.member_id and
-- prayer_requests.member_id (whatever their current names/rules) with
-- NO ACTION foreign keys. NO ACTION (checked at end of statement) still
-- blocks deleting a person who has linked records, while allowing whole-account
-- deletion (profile → members/care_tasks cascades) to complete.

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.conname, c.conrelid::regclass AS tbl
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
    WHERE c.contype = 'f'
      AND c.confrelid = 'public.members'::regclass
      AND c.conrelid IN ('public.care_tasks'::regclass, 'public.prayer_requests'::regclass)
      AND a.attname = 'member_id'
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.tbl, r.conname);
  END LOOP;
END $$;

ALTER TABLE public.care_tasks
  ADD CONSTRAINT care_tasks_member_id_fkey
  FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE NO ACTION;

ALTER TABLE public.prayer_requests
  ADD CONSTRAINT prayer_requests_member_id_fkey
  FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE NO ACTION;

-- Safety check: abort the whole migration if ANY foreign key to members
-- would still cascade, set null or set default on delete.
DO $$
DECLARE bad text;
BEGIN
  SELECT string_agg(conrelid::regclass || '.' || conname, ', ')
  INTO bad
  FROM pg_constraint
  WHERE contype = 'f'
    AND confrelid = 'public.members'::regclass
    AND confdeltype NOT IN ('a', 'r');   -- a = NO ACTION, r = RESTRICT
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'Foreign keys to members must not cascade/set null: %', bad;
  END IF;
END $$;

-- ─── 7. person_link_summary(): counts shown in the Delete confirmation ─────

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
    'has_notes',        (v_member.notes IS NOT NULL AND btrim(v_member.notes) <> ''),
    'is_archived',      (v_member.archived_at IS NOT NULL)
  );
END;
$$;

-- ─── 8. delete_person(): the ONLY supported way to delete a person ─────────
-- history_mode:
--   'keep'       (default) Person record removed. Linked history is kept and
--                detached, retaining a NAME-ONLY snapshot so it stays
--                understandable ("Jane Doe (deleted)"):
--                  care_tasks       → member_name_snapshot = full name
--                  prayer_requests  → person_name kept (already a name snapshot)
--                  calendar_events  → unchanged (titles already contain the name)
--   'delete_all' Person record removed AND their care tasks, the calendar
--                events created for those tasks, and their prayer requests are
--                permanently deleted.
-- Phone, email, address and notes are always removed with the person; they are
-- never copied into any snapshot.

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
    'prayer_requests',  v_prayers
  );
END;
$$;

REVOKE ALL ON FUNCTION public.delete_person(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_person(uuid, text) TO authenticated;
REVOKE ALL ON FUNCTION public.person_link_summary(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.person_link_summary(uuid) TO authenticated;

COMMIT;

-- ─── Verification (run after COMMIT) ────────────────────────────────────────
-- Expected today: 16 members (⭐), 4 contacts, 1 archived.
-- SELECT
--   count(*) FILTER (WHERE is_member AND archived_at IS NULL)     AS starred_members,
--   count(*) FILTER (WHERE NOT is_member AND archived_at IS NULL) AS contacts,
--   count(*) FILTER (WHERE archived_at IS NOT NULL)               AS archived,
--   count(*) FILTER (WHERE phone IS NOT NULL AND phone_e164 IS NULL) AS unparsed_phones
-- FROM public.members;
--
-- Every FK to members must be NO ACTION ('a') or RESTRICT ('r'):
-- SELECT conrelid::regclass, conname, confdeltype
-- FROM pg_constraint WHERE contype = 'f' AND confrelid = 'public.members'::regclass;
