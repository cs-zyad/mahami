create table if not exists public.smart_scan_accounts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'plus')),
  subscription_status text not null default 'inactive'
    check (subscription_status in ('inactive', 'trialing', 'active', 'past_due', 'canceled')),
  subscription_provider text,
  subscription_product_id text,
  subscription_customer_id text,
  subscription_period_start timestamptz,
  subscription_period_end timestamptz,
  monthly_limit smallint not null default 20 check (monthly_limit between 1 and 200),
  free_lifetime_limit smallint not null default 2 check (free_lifetime_limit between 0 and 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.smart_scan_usage (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  user_id uuid not null references auth.users (id) on delete cascade,
  allowance_type text not null check (allowance_type in ('free', 'monthly')),
  status text not null default 'reserved' check (status in ('reserved', 'succeeded', 'failed')),
  extracted_task_count smallint not null default 0 check (extracted_task_count between 0 and 100),
  failure_code text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists smart_scan_usage_user_created_idx
  on public.smart_scan_usage (user_id, created_at desc);

insert into public.smart_scan_accounts (user_id)
select id from auth.users
on conflict (user_id) do nothing;

create or replace function public.handle_new_smart_scan_account()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.smart_scan_accounts (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_smart_scan on auth.users;
create trigger on_auth_user_created_smart_scan
  after insert on auth.users
  for each row execute procedure public.handle_new_smart_scan_account();

alter table public.smart_scan_accounts enable row level security;
alter table public.smart_scan_usage enable row level security;

revoke all on table public.smart_scan_accounts from anon, authenticated;
revoke all on table public.smart_scan_usage from anon, authenticated;
grant select on table public.smart_scan_accounts to authenticated;
grant select on table public.smart_scan_usage to authenticated;

drop policy if exists "smart_scan_accounts_select_own" on public.smart_scan_accounts;
create policy "smart_scan_accounts_select_own"
  on public.smart_scan_accounts for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "smart_scan_usage_select_own" on public.smart_scan_usage;
create policy "smart_scan_usage_select_own"
  on public.smart_scan_usage for select
  to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.get_my_smart_scan_status()
returns table (
  plan text,
  subscription_status text,
  allowance_type text,
  usage_limit integer,
  used integer,
  remaining integer,
  period_end timestamptz
)
language sql
security invoker
set search_path = ''
stable
as $$
  with account as (
    select a.*,
      (
        a.plan = 'plus'
        and a.subscription_status in ('trialing', 'active', 'past_due', 'canceled')
        and a.subscription_period_start is not null
        and a.subscription_period_end > now()
      ) as has_plus
    from public.smart_scan_accounts a
    where a.user_id = (select auth.uid())
  ), calculated as (
    select
      a.plan,
      a.subscription_status,
      case when a.has_plus then 'monthly' else 'free' end as allowance_type,
      case when a.has_plus then a.monthly_limit else a.free_lifetime_limit end::integer as usage_limit,
      case
        when a.has_plus then (
          select count(*)::integer
          from public.smart_scan_usage u
          where u.user_id = a.user_id
            and u.allowance_type = 'monthly'
            and (u.status = 'succeeded' or (u.status = 'reserved' and u.created_at > now() - interval '15 minutes'))
            and u.created_at >= a.subscription_period_start
            and u.created_at < a.subscription_period_end
        )
        else (
          select count(*)::integer
          from public.smart_scan_usage u
          where u.user_id = a.user_id
            and u.allowance_type = 'free'
            and (u.status = 'succeeded' or (u.status = 'reserved' and u.created_at > now() - interval '15 minutes'))
        )
      end as used,
      case when a.has_plus then a.subscription_period_end else null end as period_end
    from account a
  )
  select
    c.plan,
    c.subscription_status,
    c.allowance_type,
    c.usage_limit,
    c.used,
    greatest(c.usage_limit - c.used, 0)::integer as remaining,
    c.period_end
  from calculated c;
$$;

create or replace function public.reserve_smart_scan(
  p_user_id uuid,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  account public.smart_scan_accounts%rowtype;
  paid boolean;
  selected_allowance text;
  current_usage integer;
  selected_limit integer;
begin
  select * into account
  from public.smart_scan_accounts
  where user_id = p_user_id
  for update;

  if not found then
    insert into public.smart_scan_accounts (user_id)
    values (p_user_id)
    returning * into account;
  end if;

  if exists (
    select 1 from public.smart_scan_usage where request_id = p_request_id and user_id = p_user_id
  ) then
    return jsonb_build_object('allowed', false, 'code', 'duplicate_request');
  end if;

  paid := account.plan = 'plus'
    and account.subscription_status in ('trialing', 'active', 'past_due', 'canceled')
    and account.subscription_period_start is not null
    and account.subscription_period_end > now();

  if paid then
    selected_allowance := 'monthly';
    selected_limit := account.monthly_limit;
    select count(*)::integer into current_usage
    from public.smart_scan_usage
    where user_id = p_user_id
      and allowance_type = 'monthly'
      and (status = 'succeeded' or (status = 'reserved' and created_at > now() - interval '15 minutes'))
      and created_at >= account.subscription_period_start
      and created_at < account.subscription_period_end;
  else
    selected_allowance := 'free';
    selected_limit := account.free_lifetime_limit;
    select count(*)::integer into current_usage
    from public.smart_scan_usage
    where user_id = p_user_id
      and allowance_type = 'free'
      and (status = 'succeeded' or (status = 'reserved' and created_at > now() - interval '15 minutes'));
  end if;

  if current_usage >= selected_limit then
    return jsonb_build_object(
      'allowed', false,
      'code', 'limit_reached',
      'allowance_type', selected_allowance,
      'limit', selected_limit,
      'used', current_usage,
      'remaining', 0,
      'period_end', account.subscription_period_end
    );
  end if;

  insert into public.smart_scan_usage (request_id, user_id, allowance_type)
  values (p_request_id, p_user_id, selected_allowance);

  return jsonb_build_object(
    'allowed', true,
    'allowance_type', selected_allowance,
    'limit', selected_limit,
    'used', current_usage + 1,
    'remaining', greatest(selected_limit - current_usage - 1, 0),
    'period_end', account.subscription_period_end
  );
end;
$$;

create or replace function public.complete_smart_scan(
  p_user_id uuid,
  p_request_id uuid,
  p_task_count integer
)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.smart_scan_usage
  set status = 'succeeded',
      extracted_task_count = greatest(least(p_task_count, 100), 0)::smallint,
      completed_at = now(),
      failure_code = null
  where user_id = p_user_id
    and request_id = p_request_id
    and status = 'reserved';
$$;

create or replace function public.fail_smart_scan(
  p_user_id uuid,
  p_request_id uuid,
  p_failure_code text
)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.smart_scan_usage
  set status = 'failed',
      failure_code = left(coalesce(p_failure_code, 'analysis_failed'), 100),
      completed_at = now()
  where user_id = p_user_id
    and request_id = p_request_id
    and status = 'reserved';
$$;

revoke execute on function public.handle_new_smart_scan_account() from public, anon, authenticated;
revoke execute on function public.get_my_smart_scan_status() from public, anon;
grant execute on function public.get_my_smart_scan_status() to authenticated;

revoke execute on function public.reserve_smart_scan(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.complete_smart_scan(uuid, uuid, integer) from public, anon, authenticated;
revoke execute on function public.fail_smart_scan(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.reserve_smart_scan(uuid, uuid) to service_role;
grant execute on function public.complete_smart_scan(uuid, uuid, integer) to service_role;
grant execute on function public.fail_smart_scan(uuid, uuid, text) to service_role;

comment on table public.smart_scan_accounts is
  'Server-managed Mahami Plus entitlement and smart scan allowance for each user.';

comment on table public.smart_scan_usage is
  'One row per reserved smart image analysis. Failed analyses do not consume allowance.';

create table if not exists public.revenuecat_webhook_events (
  event_id text primary key,
  event_type text not null,
  app_user_id text,
  received_at timestamptz not null default now()
);

alter table public.revenuecat_webhook_events enable row level security;
revoke all on table public.revenuecat_webhook_events from anon, authenticated;

comment on table public.revenuecat_webhook_events is
  'Idempotency log for authenticated RevenueCat subscription webhooks.';
