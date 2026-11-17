// Shared by the functions: CORS for the app's WebView, the caller's account, the admin client.
import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2.119.0';

export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

export const admin = (): SupabaseClient => createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

/** The account a bearer token belongs to (null when it is missing or expired). */
export async function userOf(token: string | null | undefined): Promise<User | null> {
  if (!token) return null;
  const { data, error } = await admin().auth.getUser(token.replace(/^Bearer\s+/i, ''));
  return error ? null : data.user;
}

/** Credits left and the readings they opened. */
export async function balance(db: SupabaseClient, userId: string) {
  const [{ data: grants }, { data: unlocks }] = await Promise.all([
    db.from('credit_grants').select('units').eq('user_id', userId),
    db.from('unlocks').select('cast_id').eq('user_id', userId),
  ]);
  const bought = (grants ?? []).reduce((n, g) => n + Number(g.units), 0);
  const opened = (unlocks ?? []).map((u) => String(u.cast_id));
  return { credits: bought - opened.length, unlocked: opened };
}
