import { withSupabase } from 'npm:@supabase/server';

const headers = { 'Content-Type': 'application/json; charset=utf-8' };
const entitlementId = 'mahami_plus';

type RevenueCatEntitlement = {
  expires_date?: string | null;
  purchase_date?: string | null;
  product_identifier?: string | null;
};

function respond(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers });
}

const syncSubscription = withSupabase({ auth: 'user' }, async (_req, ctx) => {
  const userId = String(ctx.jwtClaims?.sub ?? '');
  if (!userId) return respond(401, { error: 'authentication_required' });

  const revenueCatSecret = Deno.env.get('REVENUECAT_SECRET_API_KEY');
  if (!revenueCatSecret) return respond(503, { error: 'revenuecat_not_configured' });

  const response = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${revenueCatSecret}`,
    },
  });

  if (!response.ok) {
    console.error('RevenueCat customer sync failed', response.status);
    return respond(502, { error: 'revenuecat_sync_failed' });
  }

  const payload = await response.json() as {
    subscriber?: { entitlements?: Record<string, RevenueCatEntitlement> };
  };
  const entitlement = payload.subscriber?.entitlements?.[entitlementId];
  const expiresAt = entitlement?.expires_date ? new Date(entitlement.expires_date) : null;
  const isActive = !!entitlement && (!expiresAt || expiresAt.getTime() > Date.now());
  const periodStart = entitlement?.purchase_date && !Number.isNaN(Date.parse(entitlement.purchase_date))
    ? entitlement.purchase_date
    : new Date().toISOString();
  const periodEnd = isActive
    ? (entitlement?.expires_date ?? '2099-12-31T23:59:59.999Z')
    : null;

  const { error } = await ctx.supabaseAdmin.rpc('apply_revenuecat_subscription', {
    p_user_id: userId,
    p_is_active: isActive,
    p_status: isActive ? 'active' : 'inactive',
    p_product_id: entitlement?.product_identifier ?? null,
    p_customer_id: userId,
    p_period_start: isActive ? periodStart : null,
    p_period_end: periodEnd,
  });

  if (error) {
    console.error('Supabase subscription update failed', error.code);
    return respond(500, { error: 'subscription_update_failed' });
  }

  return respond(200, { active: isActive, period_end: periodEnd });
});

export default { fetch: syncSubscription };
