import { withSupabase } from 'npm:@supabase/server';

const headers = { 'Content-Type': 'application/json; charset=utf-8' };
const entitlementId = 'mahami_plus';
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type RevenueCatEvent = {
  id?: string;
  type?: string;
  app_user_id?: string;
  original_app_user_id?: string;
  aliases?: string[];
  product_id?: string;
  entitlement_ids?: string[];
  period_type?: string;
  purchased_at_ms?: number;
  expiration_at_ms?: number | null;
};

function respond(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers });
}

const webhook = withSupabase({ auth: 'none' }, async (req, ctx) => {
  if (req.method !== 'POST') return respond(405, { error: 'method_not_allowed' });

  const expectedAuthorization = Deno.env.get('REVENUECAT_WEBHOOK_AUTH');
  if (!expectedAuthorization || req.headers.get('authorization') !== expectedAuthorization) {
    return respond(401, { error: 'invalid_webhook_authorization' });
  }

  let event: RevenueCatEvent;
  try {
    const payload = await req.json() as { event?: RevenueCatEvent };
    if (!payload.event) return respond(400, { error: 'event_required' });
    event = payload.event;
  } catch {
    return respond(400, { error: 'invalid_json' });
  }

  if (!event.id || !event.type) return respond(400, { error: 'invalid_event' });

  const { data: existingEvent } = await ctx.supabaseAdmin
    .from('revenuecat_webhook_events')
    .select('event_id')
    .eq('event_id', event.id)
    .maybeSingle();
  if (existingEvent) return respond(200, { ok: true, duplicate: true });

  const recordEvent = async () => ctx.supabaseAdmin.from('revenuecat_webhook_events').insert({
    event_id: event.id,
    event_type: event.type,
    app_user_id: event.app_user_id ?? null,
  });

  if (!event.entitlement_ids?.includes(entitlementId)) {
    await recordEvent();
    return respond(200, { ok: true, ignored: true });
  }

  const possibleUserIds = [event.app_user_id, event.original_app_user_id, ...(event.aliases ?? [])];
  const userId = possibleUserIds.find((value): value is string => typeof value === 'string' && uuidPattern.test(value));
  if (!userId) {
    await recordEvent();
    return respond(200, { ok: true, ignored: true, reason: 'no_supabase_user_id' });
  }

  const expiration = typeof event.expiration_at_ms === 'number' ? new Date(event.expiration_at_ms) : null;
  const revoked = ['EXPIRATION', 'REFUND', 'SUBSCRIPTION_PAUSED'].includes(event.type);
  const active = !revoked && (!expiration || expiration.getTime() > Date.now());
  const canceledButActive = event.type === 'CANCELLATION' && active;
  const status = active
    ? (event.period_type === 'TRIAL' ? 'trialing' : canceledButActive ? 'canceled' : event.type === 'BILLING_ISSUE' ? 'past_due' : 'active')
    : 'inactive';

  const { error: updateError } = await ctx.supabaseAdmin.rpc('apply_revenuecat_subscription', {
    p_user_id: userId,
    p_is_active: active,
    p_status: status,
    p_product_id: event.product_id ?? null,
    p_customer_id: event.app_user_id ?? userId,
    p_period_start: typeof event.purchased_at_ms === 'number'
      ? new Date(event.purchased_at_ms).toISOString()
      : null,
    p_period_end: active
      ? (expiration?.toISOString() ?? '2099-12-31T23:59:59.999Z')
      : null,
  });

  if (updateError) {
    console.error('RevenueCat webhook update failed', updateError.code);
    return respond(500, { error: 'subscription_update_failed' });
  }

  const { error: eventLogError } = await recordEvent();
  if (eventLogError && eventLogError.code !== '23505') return respond(500, { error: 'event_log_failed' });

  return respond(200, { ok: true });
});

export default { fetch: webhook };
