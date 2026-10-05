-- Prayer requests: the app versions in the stores send 'Health'/'Urgent' (capitalized),
-- but the check constraints only allow lowercase. Normalize before the constraint runs
-- so saves from every app version succeed.
create or replace function public.normalize_prayer_request()
returns trigger
language plpgsql
as $$
begin
  new.category := lower(coalesce(new.category, 'other'));
  new.priority := lower(coalesce(new.priority, 'normal'));
  return new;
end;
$$;

drop trigger if exists normalize_prayer_request on public.prayer_requests;
create trigger normalize_prayer_request
  before insert or update on public.prayer_requests
  for each row execute function public.normalize_prayer_request();
