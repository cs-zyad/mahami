-- Mahami Plus now advertises 50 smart conversions per month instead of 20.
alter table public.smart_scan_accounts
  alter column monthly_limit set default 50;

update public.smart_scan_accounts
set monthly_limit = 50,
    updated_at = now()
where monthly_limit = 20;
