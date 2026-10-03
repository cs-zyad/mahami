-- smart_scan_accounts has RLS on, no insert/update policy, and all privileges
-- revoked from anon and authenticated. The edge functions that record a
-- subscription wrote to the table directly and were refused with 42501, so a
-- paid subscription never reached the account row.
--
-- Writes go through a security definer function, the way reserve_smart_scan
-- and complete_smart_scan already do.
--
-- p_is_active drives the plan; p_status carries the finer state the webhook
-- distinguishes (trialing, past_due, canceled) and the sync path leaves at
-- active or inactive.

create or replace function public.apply_revenuecat_subscription(
  p_user_id uuid,
  p_is_active boolean,
  p_status text,
  p_product_id text,
  p_customer_id text,
  p_period_start timestamptz,
  p_period_end timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.smart_scan_accounts%rowtype;
begin
  if p_status not in ('inactive', 'trialing', 'active', 'past_due', 'canceled') then
    raise exception 'invalid subscription status: %', p_status;
  end if;

  insert into public.smart_scan_accounts (
    user_id,
    plan,
    subscription_status,
    subscription_provider,
    subscription_product_id,
    subscription_customer_id,
    subscription_period_start,
    subscription_period_end,
    updated_at
  )
  values (
    p_user_id,
    case when p_is_active then 'plus' else 'free' end,
    p_status,
    'revenuecat',
    p_product_id,
    p_customer_id,
    case when p_is_active then coalesce(p_period_start, now()) else null end,
    case when p_is_active then p_period_end else null end,
    now()
  )
  on conflict (user_id) do update set
    plan = excluded.plan,
    subscription_status = excluded.subscription_status,
    subscription_provider = excluded.subscription_provider,
    subscription_product_id = excluded.subscription_product_id,
    subscription_customer_id = excluded.subscription_customer_id,
    subscription_period_start = excluded.subscription_period_start,
    subscription_period_end = excluded.subscription_period_end,
    updated_at = excluded.updated_at
  returning * into result;

  return jsonb_build_object(
    'active', result.plan = 'plus',
    'period_end', result.subscription_period_end
  );
end;
$$;

revoke all on function public.apply_revenuecat_subscription(uuid, boolean, text, text, text, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.apply_revenuecat_subscription(uuid, boolean, text, text, text, timestamptz, timestamptz) to service_role;
