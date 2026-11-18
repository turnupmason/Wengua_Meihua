// Counts the caller's reading credits from RevenueCat's record of their App Store purchases, and
// copies their membership (the `member` entitlement's end) for reading_access(). Each store
// transaction is granted once (its id is the key); a transaction RevenueCat now reports for this
// account is moved here. Returns { plan, expiresAt, credits, unlocked }.
// Secret: REVENUECAT_SECRET_KEY (RevenueCat → API keys → secret key, v1).
import { admin, balance, cors, json, userOf } from '../_shared/common.ts';

const UNITS: Record<string, number> = { 'wengua.reading.single': 1, 'wengua.reading.pack10': 10 };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const user = await userOf(req.headers.get('Authorization'));
  if (!user) return json({ error: 'not signed in' }, 401);

  const rc = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(user.id)}`, {
    headers: { Authorization: `Bearer ${Deno.env.get('REVENUECAT_SECRET_KEY')}`, 'Content-Type': 'application/json' },
  });
  if (!rc.ok) return json({ error: 'store record unavailable' }, 502);
  const body = await rc.json();
  const bought = (body?.subscriber?.non_subscriptions ?? {}) as Record<string, { id: string; store_transaction_id?: string; purchase_date?: string; is_sandbox?: boolean }[]>;

  const rows = Object.entries(bought).flatMap(([productId, list]) =>
    UNITS[productId]
      ? list.map((p) => ({ transaction_id: p.store_transaction_id || p.id, user_id: user.id, product_id: productId, units: UNITS[productId], purchased_at: p.purchase_date ?? null }))
      : [],
  );
  const db = admin();
  // Membership: when the `member` entitlement runs until (null: never had it).
  const ent = body?.subscriber?.entitlements?.member as { expires_date?: string | null; product_identifier?: string } | undefined;
  const expiresAt = ent?.expires_date ?? null;
  const { error: memberError } = await db.from('memberships').upsert({ user_id: user.id, expires_at: expiresAt, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (memberError) return json({ error: memberError.message }, 500);
  const active = !!expiresAt && new Date(expiresAt).getTime() > Date.now();
  const plan = !active ? 'free' : ent?.product_identifier === 'wengua.member.yearly' ? 'yearly' : 'monthly';
  if (rows.length) {
    const { error } = await db.from('credit_grants').upsert(rows, { onConflict: 'transaction_id' });
    if (error) return json({ error: error.message }, 500);
  }
  return json({ plan, expiresAt: active ? expiresAt : null, ...(await balance(db, user.id)) });
});
