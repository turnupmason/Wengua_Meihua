// A guest (anonymous account) has just signed in for real: their credits and opened readings move
// to the real account, and the guest account is removed. Body: { guestToken } — the guest
// session's access token, read on the device before signing in.
import { admin, balance, cors, json, userOf } from '../_shared/common.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const user = await userOf(req.headers.get('Authorization'));
  if (!user || user.is_anonymous) return json({ error: 'not signed in' }, 401);
  const { guestToken } = await req.json().catch(() => ({}));
  const guest = await userOf(guestToken);
  const db = admin();
  // Only an anonymous account, and never the same one.
  if (!guest || !guest.is_anonymous || guest.id === user.id) return json(await balance(db, user.id));

  await db.from('credit_grants').update({ user_id: user.id }).eq('user_id', guest.id);
  const { data: opened } = await db.from('unlocks').select('cast_id').eq('user_id', guest.id);
  if (opened?.length) await db.from('unlocks').upsert(opened.map((o) => ({ user_id: user.id, cast_id: o.cast_id })), { onConflict: 'user_id,cast_id', ignoreDuplicates: true });
  await db.auth.admin.deleteUser(guest.id);
  return json(await balance(db, user.id));
});
