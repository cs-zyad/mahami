import { withSupabase } from 'npm:@supabase/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const jsonHeaders = {
  ...corsHeaders,
  'Content-Type': 'application/json; charset=utf-8',
};

function respond(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

const deleteAccount = withSupabase({ auth: 'user' }, async (req, ctx) => {
  if (req.method !== 'POST') return respond(405, { error: 'method_not_allowed' });

  const userId = String(ctx.jwtClaims?.sub ?? '');
  if (!userId) return respond(401, { error: 'authentication_required' });

  // Rows in the app's tables cascade from auth.users, so removing the user clears their data.
  const { error } = await ctx.supabaseAdmin.auth.admin.deleteUser(userId);
  if (error) {
    console.error('account deletion failed', error.message);
    return respond(500, { error: 'delete_failed' });
  }

  return respond(200, { deleted: true });
});

export default {
  fetch(req: Request) {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    return deleteAccount(req);
  },
};
