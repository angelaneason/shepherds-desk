-- Migration 011: Phone Bridge backend (Phase 3)
-- Created: 2026-10-07
--
-- Server side of the Phone Bridge (the separate Android app that sends
-- texts from the pastor's own phone). The HTTP endpoints live in the Next.js
-- app under /api/bridge/* and use the service role; this migration provides
-- the tables, RLS, guards and housekeeping they rely on.
--
--   bridge_devices          paired phones (one active phone per account in V1)
--   bridge_pairing_codes    5 minute, single use pairing codes (hash only)
--   bridge_send_jobs        1:1 texts, EPHEMERAL: body/number wiped at a final
--                           status or at expiry; row deleted after 24 h
--   bridge_audit_log        90 day, metadata-only log. NO message text column
--   bridge_config           configurable limits: global row + admin-set
--                           per-account overrides
--   bridge_request_nonces   replay protection for device-signed requests
--
-- Also:
--   * broadcasts.device_id gets its FK to bridge_devices (NO ACTION)
--   * create_bridge_broadcast(): server-side filtering + limits for bridge
--     broadcasts (service role only; called by /api/bridge/broadcast after the
--     browser's bridge-unlock check)
--   * browsers can no longer create or drive bridge broadcasts directly
--     (only the server, after unlock, and the phone, via signed requests)
--   * delete_person() / person_link_summary() extended for bridge rows
--   * pg_cron jobs (names start with "bridge-")
--
-- Rules carried over from 009/010: every FK to members is NO ACTION. The
-- script ends with the same safety check and aborts if that is violated.
--
-- Run in the Supabase SQL editor. One transaction: all or nothing.
-- Requires pg_cron (already enabled by migration 007). If pg_cron is missing
-- the cron section is skipped with a NOTICE and the rest still applies.

BEGIN;

-- ─── 1. Tables ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.bridge_devices (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id          uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  display_name        text NOT NULL CHECK (length(btrim(display_name)) BETWEEN 1 AND 60),
  model               text CHECK (model IS NULL OR length(model) <= 100),
  public_key          text NOT NULL,      -- base64 SPKI DER, EC P-256 (Android Keystore)
  fcm_token           text,
  approve_every_send  boolean NOT NULL DEFAULT false,   -- mirror of the phone setting
  status              text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  sim_label           text CHECK (sim_label IS NULL OR length(sim_label) <= 60),
  last_seen_at        timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  revoked_at          timestamptz
);

CREATE INDEX IF NOT EXISTS bridge_devices_profile_idx ON public.bridge_devices (profile_id, status);
-- V1: at most one active phone per account
CREATE UNIQUE INDEX IF NOT EXISTS bridge_devices_one_active_idx
  ON public.bridge_devices (profile_id) WHERE status = 'active';

CREATE TABLE IF NOT EXISTS public.bridge_pairing_codes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  code_hash   text NOT NULL UNIQUE,     -- HMAC/SHA-256 of the code, never the code itself
  expires_at  timestamptz NOT NULL DEFAULT (now() + interval '5 minutes'),
  used_at     timestamptz,
  device_id   uuid REFERENCES public.bridge_devices(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bridge_pairing_codes_profile_idx ON public.bridge_pairing_codes (profile_id);

CREATE TABLE IF NOT EXISTS public.bridge_send_jobs (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id             uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  device_id              uuid NOT NULL REFERENCES public.bridge_devices(id) ON DELETE NO ACTION,
  -- NO ACTION: delete_person() removes these rows explicitly.
  member_id              uuid REFERENCES public.members(id) ON DELETE NO ACTION,
  body                   text CHECK (body IS NULL OR length(body) <= 2000),   -- wiped at final status / expiry
  to_e164                text,                                                -- wiped at final status / expiry
  segments               int,
  status                 text NOT NULL DEFAULT 'queued' CHECK (status IN (
                           'queued', 'awaiting_approval', 'sending', 'sent', 'delivered',
                           'failed', 'expired', 'rejected', 'cancelled')),
  error_code             text CHECK (error_code IS NULL OR length(error_code) <= 100),
  browser_session_label  text CHECK (browser_session_label IS NULL OR length(browser_session_label) <= 100),
  created_at             timestamptz NOT NULL DEFAULT now(),
  expires_at             timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  finished_at            timestamptz
);

CREATE INDEX IF NOT EXISTS bridge_send_jobs_profile_idx ON public.bridge_send_jobs (profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS bridge_send_jobs_device_status_idx ON public.bridge_send_jobs (device_id, status);
CREATE INDEX IF NOT EXISTS bridge_send_jobs_member_idx ON public.bridge_send_jobs (member_id) WHERE member_id IS NOT NULL;

-- Metadata only. There is deliberately NO body/text column. Do not add one.
CREATE TABLE IF NOT EXISTS public.bridge_audit_log (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id              uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_profile_id        uuid,
  browser_session_label   text CHECK (browser_session_label IS NULL OR length(browser_session_label) <= 100),
  event                   text NOT NULL CHECK (event IN (
                            'paired', 'unlocked', 'send_requested', 'approved', 'rejected',
                            'sent', 'delivered', 'failed', 'revoked', 'expired',
                            'broadcast_requested', 'broadcast_approved', 'broadcast_paused',
                            'broadcast_resumed', 'broadcast_cancelled', 'broadcast_completed')),
  -- NO ACTION: delete_person() clears it ("Deleted contact").
  member_id               uuid REFERENCES public.members(id) ON DELETE NO ACTION,
  job_id                  uuid,        -- no FK: jobs are deleted after 24 h, the log is kept 90 days
  broadcast_id            uuid,        -- no FK: a saved broadcast can be deleted by the user
  broadcast_recipient_id  uuid,        -- no FK (same reason)
  device_id               uuid REFERENCES public.bridge_devices(id) ON DELETE NO ACTION,
  status                  text CHECK (status IS NULL OR length(status) <= 60),
  at                      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bridge_audit_log_profile_at_idx ON public.bridge_audit_log (profile_id, at DESC);
CREATE INDEX IF NOT EXISTS bridge_audit_log_member_idx ON public.bridge_audit_log (member_id) WHERE member_id IS NOT NULL;

-- Limits (plan §6). Initial testing defaults, not promises to users.
-- profile_id NULL = the global defaults row. A row with a profile_id is a
-- full per-account override (set by an admin only).
CREATE TABLE IF NOT EXISTS public.bridge_config (
  id                               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id                       uuid UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  delay_min_secs                   int  NOT NULL DEFAULT 8   CHECK (delay_min_secs >= 1),
  delay_max_secs                   int  NOT NULL DEFAULT 15  CHECK (delay_max_secs >= 1),
  max_recipients                   int  NOT NULL DEFAULT 100 CHECK (max_recipients >= 1),
  warn_recipients                  int  NOT NULL DEFAULT 50  CHECK (warn_recipients >= 1),
  max_texts_per_day                int  NOT NULL DEFAULT 200 CHECK (max_texts_per_day >= 1),
  max_broadcasts_per_day           int  NOT NULL DEFAULT 3   CHECK (max_broadcasts_per_day >= 0),
  quiet_start                      time NOT NULL DEFAULT '21:00',
  quiet_end                        time NOT NULL DEFAULT '08:00',
  auto_pause_consecutive_failures  int  NOT NULL DEFAULT 3   CHECK (auto_pause_consecutive_failures >= 1),
  segment_warning                  int  NOT NULL DEFAULT 3   CHECK (segment_warning >= 1),
  approval_timeout_min             int  NOT NULL DEFAULT 30  CHECK (approval_timeout_min >= 1),
  job_timeout_min                  int  NOT NULL DEFAULT 10  CHECK (job_timeout_min >= 1),
  updated_at                       timestamptz NOT NULL DEFAULT now(),
  CHECK (delay_max_secs >= delay_min_secs)
);

-- Exactly one global row
CREATE UNIQUE INDEX IF NOT EXISTS bridge_config_one_global_idx ON public.bridge_config ((profile_id IS NULL)) WHERE profile_id IS NULL;

INSERT INTO public.bridge_config (profile_id)
SELECT NULL
WHERE NOT EXISTS (SELECT 1 FROM public.bridge_config WHERE profile_id IS NULL);

CREATE TABLE IF NOT EXISTS public.bridge_request_nonces (
  device_id  uuid NOT NULL REFERENCES public.bridge_devices(id) ON DELETE CASCADE,
  nonce      text NOT NULL CHECK (length(nonce) BETWEEN 8 AND 128),
  at         timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (device_id, nonce)
);

CREATE INDEX IF NOT EXISTS bridge_request_nonces_at_idx ON public.bridge_request_nonces (at);

-- broadcasts.device_id existed since 010 without an FK ("Phase 3 adds the FK").
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'broadcasts_device_id_fkey') THEN
    ALTER TABLE public.broadcasts
      ADD CONSTRAINT broadcasts_device_id_fkey
      FOREIGN KEY (device_id) REFERENCES public.bridge_devices(id) ON DELETE NO ACTION;
  END IF;
END $$;

-- ─── 2. Row level security and grants ──────────────────────────────────────
-- All writes to bridge tables go through the server (service role), except
-- that an owner may rename or revoke their own device.

ALTER TABLE public.bridge_devices        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bridge_pairing_codes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bridge_send_jobs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bridge_audit_log      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bridge_config         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bridge_request_nonces ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.bridge_devices, public.bridge_pairing_codes, public.bridge_send_jobs,
              public.bridge_audit_log, public.bridge_config, public.bridge_request_nonces
  FROM anon, authenticated;

GRANT SELECT ON public.bridge_devices, public.bridge_pairing_codes, public.bridge_send_jobs,
                public.bridge_audit_log, public.bridge_config
  TO authenticated;
GRANT UPDATE (display_name, status, revoked_at) ON public.bridge_devices TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.bridge_config TO authenticated;   -- RLS: admins only
GRANT ALL ON public.bridge_devices, public.bridge_pairing_codes, public.bridge_send_jobs,
             public.bridge_audit_log, public.bridge_config, public.bridge_request_nonces
  TO service_role;

-- Devices
DROP POLICY IF EXISTS "Owner reads own bridge devices" ON public.bridge_devices;
CREATE POLICY "Owner reads own bridge devices" ON public.bridge_devices
  FOR SELECT USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "Owner renames or revokes own bridge device" ON public.bridge_devices;
CREATE POLICY "Owner renames or revokes own bridge device" ON public.bridge_devices
  FOR UPDATE USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());

-- Pairing codes / jobs / audit: owner read only
DROP POLICY IF EXISTS "Owner reads own pairing codes" ON public.bridge_pairing_codes;
CREATE POLICY "Owner reads own pairing codes" ON public.bridge_pairing_codes
  FOR SELECT USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "Owner reads own bridge jobs" ON public.bridge_send_jobs;
CREATE POLICY "Owner reads own bridge jobs" ON public.bridge_send_jobs
  FOR SELECT USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "Owner reads own bridge audit log" ON public.bridge_audit_log;
CREATE POLICY "Owner reads own bridge audit log" ON public.bridge_audit_log
  FOR SELECT USING (profile_id = auth.uid());

-- Config: everyone signed in reads the global row and their own override;
-- only admins write.
CREATE OR REPLACE FUNCTION public.bridge_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
      OR lower(coalesce(auth.jwt() ->> 'email', '')) IN ('angelaneason@gmail.com', 'tinyneason@gmail.com');
$$;
REVOKE ALL ON FUNCTION public.bridge_is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bridge_is_admin() TO authenticated, service_role;

DROP POLICY IF EXISTS "Read global and own bridge config" ON public.bridge_config;
CREATE POLICY "Read global and own bridge config" ON public.bridge_config
  FOR SELECT USING (profile_id IS NULL OR profile_id = auth.uid() OR public.bridge_is_admin());

DROP POLICY IF EXISTS "Admins write bridge config" ON public.bridge_config;
CREATE POLICY "Admins write bridge config" ON public.bridge_config
  FOR ALL USING (public.bridge_is_admin()) WITH CHECK (public.bridge_is_admin());

-- bridge_request_nonces: no policies at all = service role only.

-- ─── 3. Device guard: owners may only rename or revoke ─────────────────────

CREATE OR REPLACE FUNCTION public.bridge_devices_before_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    IF NEW.status IS DISTINCT FROM OLD.status AND NOT (OLD.status = 'active' AND NEW.status = 'revoked') THEN
      RAISE EXCEPTION 'A disconnected phone cannot be reconnected; pair it again' USING ERRCODE = '42501';
    END IF;
  END IF;
  IF NEW.status = 'revoked' AND OLD.status = 'active' THEN
    NEW.revoked_at := now();
  ELSIF NEW.status = 'active' THEN
    NEW.revoked_at := NULL;
  ELSE
    NEW.revoked_at := OLD.revoked_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bridge_devices_before_update ON public.bridge_devices;
CREATE TRIGGER bridge_devices_before_update
  BEFORE UPDATE ON public.bridge_devices
  FOR EACH ROW EXECUTE FUNCTION public.bridge_devices_before_update();

-- When a phone is disconnected (by the server or directly by the owner),
-- every unfinished 1:1 job for it is cancelled (which also wipes its text).
CREATE OR REPLACE FUNCTION public.bridge_devices_after_revoke()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'revoked' AND OLD.status IS DISTINCT FROM 'revoked' THEN
    UPDATE public.bridge_send_jobs
    SET status = 'cancelled', error_code = COALESCE(error_code, 'device_revoked')
    WHERE device_id = NEW.id AND status IN ('queued', 'awaiting_approval', 'sending');
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS bridge_devices_after_revoke ON public.bridge_devices;
CREATE TRIGGER bridge_devices_after_revoke
  AFTER UPDATE OF status ON public.bridge_devices
  FOR EACH ROW EXECUTE FUNCTION public.bridge_devices_after_revoke();

-- ─── 4. 1:1 job wipe rule ──────────────────────────────────────────────────
-- Text and number are wiped the moment a job reaches a final status.
-- ('sent' counts as final for the text: 'delivered' may still follow.)

CREATE OR REPLACE FUNCTION public.bridge_send_jobs_before_write()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('sent', 'delivered', 'failed', 'expired', 'rejected', 'cancelled') THEN
    NEW.body        := NULL;
    NEW.to_e164     := NULL;
    NEW.finished_at := COALESCE(NEW.finished_at, now());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bridge_send_jobs_before_write ON public.bridge_send_jobs;
CREATE TRIGGER bridge_send_jobs_before_write
  BEFORE INSERT OR UPDATE ON public.bridge_send_jobs
  FOR EACH ROW EXECUTE FUNCTION public.bridge_send_jobs_before_write();

-- ─── 5. Broadcast recipients: timestamps + number wipe (extends 010) ──────
-- Same as 010 plus sent_at / delivered_at. The copied number (to_e164) is
-- wiped as soon as a recipient reaches a final status.

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
  IF NEW.status IN ('sent', 'delivered') AND NEW.sent_at IS NULL THEN
    NEW.sent_at := now();
  END IF;
  IF NEW.status = 'delivered' AND NEW.delivered_at IS NULL THEN
    NEW.delivered_at := now();
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
-- (trigger broadcast_recipients_before_update from 010 keeps pointing here)

-- ─── 6. Bridge broadcasts are server/phone driven only ─────────────────────
-- 010's RLS lets a signed-in user write their own broadcasts. For the bridge
-- channel that would let a browser skip the bridge-unlock check, the limits
-- and the server-side filtering. These guards apply only to direct browser /
-- app writes (roles authenticated/anon); the service role, pg_cron and
-- SECURITY DEFINER housekeeping are unaffected. Handoff broadcasts work
-- exactly as before. delete_person() can still detach bridge recipients.

CREATE OR REPLACE FUNCTION public.bridge_guard_broadcasts()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.channel = 'bridge' OR NEW.device_id IS NOT NULL THEN
      RAISE EXCEPTION 'Phone Bridge broadcasts can only be created by the server' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.channel IS DISTINCT FROM OLD.channel
     OR NEW.device_id IS DISTINCT FROM OLD.device_id
     OR NEW.device_label_snapshot IS DISTINCT FROM OLD.device_label_snapshot THEN
    RAISE EXCEPTION 'Channel and device of a broadcast cannot be changed' USING ERRCODE = '42501';
  END IF;
  IF OLD.channel = 'bridge' THEN
    IF NEW.body IS DISTINCT FROM OLD.body OR NEW.approved_at IS DISTINCT FROM OLD.approved_at THEN
      RAISE EXCEPTION 'A Phone Bridge broadcast cannot be edited' USING ERRCODE = '42501';
    END IF;
    -- The browser may only cancel an unfinished bridge broadcast.
    IF NEW.status IS DISTINCT FROM OLD.status
       AND NOT (NEW.status = 'cancelled' AND OLD.status IN ('awaiting_phone_approval', 'sending', 'paused')) THEN
      RAISE EXCEPTION 'Phone Bridge broadcast status is set by the phone' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bridge_guard_broadcasts ON public.broadcasts;
CREATE TRIGGER bridge_guard_broadcasts
  BEFORE INSERT OR UPDATE ON public.broadcasts
  FOR EACH ROW EXECUTE FUNCTION public.bridge_guard_broadcasts();

-- Named "bridge_guard_*" so it fires before "broadcast_recipients_before_update"
-- (BEFORE triggers run in name order) and sees the row as the client sent it.
CREATE OR REPLACE FUNCTION public.bridge_guard_broadcast_recipients()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_channel text;
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;
  SELECT channel INTO v_channel FROM public.broadcasts WHERE id = NEW.broadcast_id;
  IF TG_OP = 'INSERT' THEN
    IF v_channel = 'bridge' OR NEW.to_e164 IS NOT NULL THEN
      RAISE EXCEPTION 'Phone Bridge recipients can only be added by the server' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.broadcast_id IS DISTINCT FROM OLD.broadcast_id THEN
    RAISE EXCEPTION 'A recipient cannot be moved to another broadcast' USING ERRCODE = '42501';
  END IF;
  IF NEW.to_e164 IS NOT NULL AND NEW.to_e164 IS DISTINCT FROM OLD.to_e164 THEN
    RAISE EXCEPTION 'Recipient numbers are set by the server only' USING ERRCODE = '42501';
  END IF;
  IF v_channel = 'bridge' AND (
       NEW.status IS DISTINCT FROM OLD.status
    OR NEW.skip_reason IS DISTINCT FROM OLD.skip_reason
    OR NEW.error_code IS DISTINCT FROM OLD.error_code
    OR NEW.segments IS DISTINCT FROM OLD.segments
    OR NEW.sent_at IS DISTINCT FROM OLD.sent_at
    OR NEW.delivered_at IS DISTINCT FROM OLD.delivered_at
    OR NEW.position IS DISTINCT FROM OLD.position) THEN
    RAISE EXCEPTION 'Phone Bridge recipient status is set by the phone' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bridge_guard_broadcast_recipients ON public.broadcast_recipients;
CREATE TRIGGER bridge_guard_broadcast_recipients
  BEFORE INSERT OR UPDATE ON public.broadcast_recipients
  FOR EACH ROW EXECUTE FUNCTION public.bridge_guard_broadcast_recipients();

-- When a bridge broadcast ends without finishing (cancelled from the web or
-- the phone, or expired before approval), everyone still waiting becomes
-- 'cancelled', which also wipes their copied numbers.
CREATE OR REPLACE FUNCTION public.broadcasts_after_bridge_stop()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.channel = 'bridge'
     AND NEW.status IN ('cancelled', 'expired')
     AND OLD.status IS DISTINCT FROM NEW.status THEN
    UPDATE public.broadcast_recipients
    SET status = 'cancelled'
    WHERE broadcast_id = NEW.id AND status IN ('queued', 'sending');
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS broadcasts_after_bridge_stop ON public.broadcasts;
CREATE TRIGGER broadcasts_after_bridge_stop
  AFTER UPDATE OF status ON public.broadcasts
  FOR EACH ROW EXECUTE FUNCTION public.broadcasts_after_bridge_stop();

-- ─── 7. broadcast_recount(): also finishes bridge broadcasts ──────────────
-- Same as 010, plus: a bridge broadcast that is sending/paused finishes once
-- nobody is left in the queue ('completed', or 'completed_with_issues' when
-- any text failed).

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

  UPDATE public.broadcasts
  SET status = CASE WHEN failed > 0 THEN 'completed_with_issues' ELSE 'completed' END,
      completed_at = now()
  WHERE id = p_broadcast_id
    AND channel = 'bridge'
    AND status IN ('sending', 'paused')
    AND pending = 0;
END;
$$;

REVOKE ALL ON FUNCTION public.broadcast_recount(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.broadcast_recount(uuid) TO authenticated, service_role;

-- ─── 8. Config + usage helpers ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.bridge_effective_config(p_profile_id uuid)
RETURNS public.bridge_config
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.*
  FROM public.bridge_config c
  WHERE c.profile_id = p_profile_id OR c.profile_id IS NULL
  ORDER BY c.profile_id NULLS LAST
  LIMIT 1;
$$;

-- Bridge texts in the last 24 hours (1:1 jobs that were not refused or
-- abandoned, plus broadcast texts queued/sent in broadcasts from that window).
CREATE OR REPLACE FUNCTION public.bridge_texts_last_24h(p_profile_id uuid)
RETURNS int
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    (SELECT count(*) FROM public.bridge_send_jobs j
      WHERE j.profile_id = p_profile_id
        AND j.created_at > now() - interval '24 hours'
        AND j.status NOT IN ('rejected', 'expired', 'cancelled'))
    +
    (SELECT count(*) FROM public.broadcast_recipients r
      JOIN public.broadcasts b ON b.id = r.broadcast_id
      WHERE b.profile_id = p_profile_id
        AND b.channel = 'bridge'
        AND (b.created_at > now() - interval '24 hours' OR r.sent_at > now() - interval '24 hours')
        AND r.status IN ('queued', 'sending', 'sent', 'delivered', 'failed'))
  )::int;
$$;

REVOKE ALL ON FUNCTION public.bridge_effective_config(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bridge_effective_config(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.bridge_texts_last_24h(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bridge_texts_last_24h(uuid) TO service_role;

-- ─── 9. create_bridge_broadcast(): server-side filtering + limits ─────────
-- Called by /api/bridge/broadcast with the service role, after the browser's
-- bridge-unlock check. Same filtering as create_broadcast() (Do Not Text, no
-- phone, invalid phone, duplicate number), plus:
--   * archived people are ignored unless p_allow_archived (Show archived)
--   * max_recipients, max_broadcasts_per_day, max_texts_per_day
--   * channel 'bridge', status 'awaiting_phone_approval', device snapshot
--   * to_e164 copied for each recipient that will be texted (wiped later)
-- Errors are raised as 'bridge:<code>' so the API can map them.
-- Returns {broadcast_id, total, sendable, skipped: {reason: count}}.

CREATE OR REPLACE FUNCTION public.create_bridge_broadcast(
  p_profile_id     uuid,
  p_body           text,
  p_member_ids     uuid[],
  p_device_id      uuid,
  p_allow_archived boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_cfg       public.bridge_config;
  v_device    public.bridge_devices%ROWTYPE;
  v_id        uuid;
  v_count     int;
  v_sendable  int;
  v_today     int;
  v_skipped   jsonb;
BEGIN
  IF p_profile_id IS NULL THEN
    RAISE EXCEPTION 'bridge:not_signed_in' USING ERRCODE = '28000';
  END IF;
  IF p_body IS NULL OR btrim(p_body) = '' THEN
    RAISE EXCEPTION 'bridge:empty_message' USING ERRCODE = '22023';
  END IF;
  IF length(p_body) > 2000 THEN
    RAISE EXCEPTION 'bridge:message_too_long' USING ERRCODE = '22023';
  END IF;
  IF p_member_ids IS NULL OR cardinality(p_member_ids) = 0 THEN
    RAISE EXCEPTION 'bridge:no_recipients' USING ERRCODE = '22023';
  END IF;
  IF cardinality(p_member_ids) > 500 THEN
    RAISE EXCEPTION 'bridge:too_many_recipients' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_device FROM public.bridge_devices
  WHERE id = p_device_id AND profile_id = p_profile_id AND status = 'active';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'bridge:no_device' USING ERRCODE = 'P0002';
  END IF;

  v_cfg := public.bridge_effective_config(p_profile_id);

  SELECT count(*) INTO v_today FROM public.broadcasts
  WHERE profile_id = p_profile_id AND channel = 'bridge'
    AND created_at > now() - interval '24 hours'
    AND status <> 'expired';
  IF v_today >= v_cfg.max_broadcasts_per_day THEN
    RAISE EXCEPTION 'bridge:broadcast_daily_limit' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.broadcasts (profile_id, body, channel, status, device_id, device_label_snapshot)
  VALUES (p_profile_id, btrim(p_body), 'bridge', 'awaiting_phone_approval', v_device.id, v_device.display_name)
  RETURNING id INTO v_id;

  WITH picked AS (
    SELECT m.id, m.full_name, m.archived_at, m.do_not_text, m.phone, m.phone_e164,
           row_number() OVER (PARTITION BY m.phone_e164, m.do_not_text ORDER BY m.full_name, m.id) AS dup_rank
    FROM public.members m
    WHERE m.id = ANY (p_member_ids)
      AND m.profile_id = p_profile_id
      AND (p_allow_archived OR m.archived_at IS NULL)
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
    (broadcast_id, profile_id, member_id, name_snapshot, was_archived, position, status, skip_reason, to_e164)
  SELECT v_id, p_profile_id, c.id, c.full_name, c.archived_at IS NOT NULL,
         row_number() OVER (ORDER BY (c.reason IS NOT NULL), c.full_name, c.id),
         CASE WHEN c.reason IS NULL THEN 'queued' ELSE 'skipped' END,
         c.reason,
         CASE WHEN c.reason IS NULL THEN c.phone_e164 END
  FROM classified c;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count = 0 THEN
    RAISE EXCEPTION 'bridge:no_people_found' USING ERRCODE = 'P0002';
  END IF;

  SELECT count(*) INTO v_sendable FROM public.broadcast_recipients
  WHERE broadcast_id = v_id AND status = 'queued';

  IF v_sendable = 0 THEN
    RAISE EXCEPTION 'bridge:nobody_textable' USING ERRCODE = 'P0001';
  END IF;
  IF v_sendable > v_cfg.max_recipients THEN
    RAISE EXCEPTION 'bridge:max_recipients' USING ERRCODE = 'P0001';
  END IF;
  -- This broadcast's own recipients are already counted by the helper.
  IF public.bridge_texts_last_24h(p_profile_id) > v_cfg.max_texts_per_day THEN
    RAISE EXCEPTION 'bridge:daily_text_limit' USING ERRCODE = 'P0001';
  END IF;

  PERFORM public.broadcast_recount(v_id);

  SELECT coalesce(jsonb_object_agg(skip_reason, n), '{}'::jsonb) INTO v_skipped
  FROM (SELECT skip_reason, count(*) AS n FROM public.broadcast_recipients
        WHERE broadcast_id = v_id AND status = 'skipped' GROUP BY skip_reason) s;

  RETURN jsonb_build_object(
    'broadcast_id', v_id,
    'total',        v_count,
    'sendable',     v_sendable,
    'skipped',      v_skipped,
    'warn',         v_sendable > v_cfg.warn_recipients
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_bridge_broadcast(uuid, text, uuid[], uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_bridge_broadcast(uuid, text, uuid[], uuid, boolean) TO service_role;

-- ─── 10. delete_person() / person_link_summary(): bridge rows ─────────────
-- Bridge rows are only readable (not writable) by their owner, so the
-- bridge part of a person delete runs in this SECURITY DEFINER helper. It
-- only touches rows of a person the caller owns:
--   bridge_send_jobs  → deleted (temporary records), both modes
--   bridge_audit_log  → member_id cleared ("Deleted contact"), both modes

CREATE OR REPLACE FUNCTION public.bridge_detach_member(p_member_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_jobs  int := 0;
  v_audit int := 0;
BEGIN
  SELECT profile_id INTO v_owner FROM public.members WHERE id = p_member_id;
  IF v_owner IS NULL THEN
    RETURN jsonb_build_object('bridge_jobs', 0, 'bridge_audit', 0);
  END IF;
  -- (current_user is the function owner here, so check the caller's JWT.
  --  Signed-in callers may only detach their own people; the service role
  --  and pg_cron have no auth.uid().)
  IF auth.uid() IS NOT NULL AND v_owner IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Person not found' USING ERRCODE = 'P0002';
  END IF;

  DELETE FROM public.bridge_send_jobs WHERE member_id = p_member_id;
  GET DIAGNOSTICS v_jobs = ROW_COUNT;

  UPDATE public.bridge_audit_log SET member_id = NULL WHERE member_id = p_member_id;
  GET DIAGNOSTICS v_audit = ROW_COUNT;

  RETURN jsonb_build_object('bridge_jobs', v_jobs, 'bridge_audit', v_audit);
END;
$$;

REVOKE ALL ON FUNCTION public.bridge_detach_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bridge_detach_member(uuid) TO authenticated, service_role;

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
    'bridge_jobs',      (SELECT count(*) FROM public.bridge_send_jobs WHERE member_id = p_member_id),
    'has_notes',        (v_member.notes IS NOT NULL AND btrim(v_member.notes) <> ''),
    'is_archived',      (v_member.archived_at IS NOT NULL)
  );
END;
$$;

-- Same as 010, plus the bridge step (both modes) before the person is removed.
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
  v_bridge      jsonb;
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

  -- Phone Bridge: 1:1 jobs deleted, audit rows become "Deleted contact" (both modes)
  v_bridge := public.bridge_detach_member(p_member_id);

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
    'broadcast_recipients', v_broadcasts,
    'bridge_jobs',      COALESCE((v_bridge ->> 'bridge_jobs')::int, 0),
    'bridge_audit',     COALESCE((v_bridge ->> 'bridge_audit')::int, 0)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.delete_person(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_person(uuid, text) TO authenticated;
REVOKE ALL ON FUNCTION public.person_link_summary(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.person_link_summary(uuid) TO authenticated;

-- ─── 11. Housekeeping functions (run by pg_cron) ──────────────────────────

-- Every minute: expire 1:1 jobs past expires_at (text wiped by trigger),
-- wipe any leftover text past expiry, and expire bridge broadcasts nobody
-- approved within the approval timeout.
CREATE OR REPLACE FUNCTION public.bridge_expire_tick()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  WITH e AS (
    UPDATE public.bridge_send_jobs
    SET status = 'expired'
    WHERE status IN ('queued', 'awaiting_approval') AND expires_at < now()
    RETURNING id, profile_id, member_id, device_id
  )
  INSERT INTO public.bridge_audit_log (profile_id, event, member_id, job_id, device_id, status)
  SELECT profile_id, 'expired', member_id, id, device_id, 'expired' FROM e;

  -- Backstop: no 1:1 text survives past its expiry, whatever its status.
  UPDATE public.bridge_send_jobs
  SET body = NULL, to_e164 = NULL
  WHERE expires_at < now() AND (body IS NOT NULL OR to_e164 IS NOT NULL);

  WITH x AS (
    UPDATE public.broadcasts b
    SET status = 'expired', completed_at = now()
    WHERE b.channel = 'bridge'
      AND b.status = 'awaiting_phone_approval'
      AND b.created_at < now() - make_interval(mins => (public.bridge_effective_config(b.profile_id)).approval_timeout_min)
    RETURNING b.id, b.profile_id, b.device_id
  )
  INSERT INTO public.bridge_audit_log (profile_id, event, broadcast_id, device_id, status)
  SELECT profile_id, 'expired', id, device_id, 'expired' FROM x;
END;
$$;

-- Hourly: delete 1:1 job rows older than 24 h, used/expired pairing codes,
-- nonces older than 15 min, and wipe any number left on finished broadcasts.
CREATE OR REPLACE FUNCTION public.bridge_hourly_cleanup()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.bridge_send_jobs WHERE created_at < now() - interval '24 hours';
  DELETE FROM public.bridge_pairing_codes WHERE used_at IS NOT NULL OR expires_at < now();
  DELETE FROM public.bridge_request_nonces WHERE at < now() - interval '15 minutes';
  UPDATE public.broadcast_recipients r
  SET to_e164 = NULL
  FROM public.broadcasts b
  WHERE b.id = r.broadcast_id
    AND r.to_e164 IS NOT NULL
    AND b.status IN ('completed', 'completed_with_issues', 'cancelled', 'expired');
END;
$$;

-- Daily: the audit log is kept 90 days.
CREATE OR REPLACE FUNCTION public.bridge_daily_purge()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.bridge_audit_log WHERE at < now() - interval '90 days';
$$;

REVOKE ALL ON FUNCTION public.bridge_expire_tick()    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.bridge_hourly_cleanup() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.bridge_daily_purge()    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bridge_expire_tick()    TO service_role;
GRANT EXECUTE ON FUNCTION public.bridge_hourly_cleanup() TO service_role;
GRANT EXECUTE ON FUNCTION public.bridge_daily_purge()    TO service_role;

-- ─── 12. pg_cron schedules ────────────────────────────────────────────────

DO $$
DECLARE j text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE NOTICE 'pg_cron is not enabled: bridge cron jobs were NOT scheduled. Enable pg_cron and re-run this migration.';
    RETURN;
  END IF;

  FOREACH j IN ARRAY ARRAY['bridge-expire', 'bridge-hourly-cleanup', 'bridge-daily-purge'] LOOP
    BEGIN
      PERFORM cron.unschedule(j);
    EXCEPTION WHEN others THEN
      NULL;  -- not scheduled yet
    END;
  END LOOP;

  PERFORM cron.schedule('bridge-expire',         '* * * * *',  'SELECT public.bridge_expire_tick()');
  PERFORM cron.schedule('bridge-hourly-cleanup', '7 * * * *',  'SELECT public.bridge_hourly_cleanup()');
  PERFORM cron.schedule('bridge-daily-purge',    '17 4 * * *', 'SELECT public.bridge_daily_purge()');
END $$;

-- ─── 13. Realtime (live status on the web later) ──────────────────────────

DO $$
DECLARE t text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    RAISE NOTICE 'supabase_realtime publication not found; skipped';
    RETURN;
  END IF;
  FOREACH t IN ARRAY ARRAY['broadcasts', 'broadcast_recipients', 'bridge_send_jobs'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
                   WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;

-- ─── 14. Safety checks (same rule as 009/010) ─────────────────────────────
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

  -- The audit log must never hold message text.
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'bridge_audit_log'
               AND column_name IN ('body', 'text', 'message', 'content', 'to_e164', 'phone')) THEN
    RAISE EXCEPTION 'bridge_audit_log must not have a text or phone column';
  END IF;
END $$;

COMMIT;

-- ─── Verification (run after COMMIT) ────────────────────────────────────────
-- SELECT * FROM public.bridge_config;                          -- one global row
-- SELECT jobname, schedule FROM cron.job WHERE jobname LIKE 'bridge-%';
-- SELECT conrelid::regclass, conname, confdeltype
-- FROM pg_constraint WHERE contype = 'f' AND confrelid = 'public.members'::regclass;
-- Then: node supabase/checks/phase3_verify.cjs
