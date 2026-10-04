-- 007: Run the phone-notification job every 15 minutes
-- ---------------------------------------------------------------
-- BEFORE RUNNING: replace PASTE_YOUR_CRON_SECRET_HERE (below) with the same
-- value you put in Vercel as the CRON_SECRET environment variable.
--
-- If you get "extension does not exist", turn on pg_cron and pg_net first:
-- Supabase Dashboard -> Database -> Extensions -> search "pg_cron" and "pg_net" -> Enable.
-- ---------------------------------------------------------------

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Remove an older copy of this job if it exists (safe to re-run)
do $$
begin
  perform cron.unschedule('shepherds-desk-notifications');
exception when others then
  null;
end $$;

select cron.schedule(
  'shepherds-desk-notifications',
  '*/15 * * * *',
  $$
  select net.http_get(
    url := 'https://www.theshepherdsdesk.app/api/cron/notifications?secret=PASTE_YOUR_CRON_SECRET_HERE',
    timeout_milliseconds := 55000
  );
  $$
);

-- To check that it's running:
--   select * from cron.job;
--   select * from cron.job_run_details order by start_time desc limit 10;
