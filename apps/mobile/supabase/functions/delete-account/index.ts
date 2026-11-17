// Deletes the caller's account; their credits and opened readings go with it (on delete cascade).
// App Store rule 5.1.1(v): an app that lets people make an account lets them delete it in the app.
// A running App Store subscription is not ended by this: the app tells the visitor to cancel it in
// their Apple account settings.
import { admin, cors, json, userOf } from '../_shared/common.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const user = await userOf(req.headers.get('Authorization'));
  if (!user) return json({ error: 'not signed in' }, 401);
  const { error } = await admin().auth.admin.deleteUser(user.id);
  if (error) return json({ error: error.message }, 500);
  return json({ deleted: true });
});
