/**
 * 断语 handed out one at a time (2026-11-18). The written 断语 never travel with the web page or
 * the app: a cast asks here for its one 断语, and gets it in full or as the one-line 简断,
 * according to what the account may read (reading_access() in Supabase: free, member, credit,
 * first-reading gift, daily limit, request rate).
 *
 * The same code answers in the Cloudflare Worker (worker/index.ts, app.wengualabs.com) and in the
 * Vite dev server (vite.config.ts). The lookup is the repository's own product interface
 * (createProductRepository().getContent), unchanged; this only decides how much of its answer
 * leaves the server.
 */
import { createLibrary, createProductRepository, resolveMonthSlot } from '@knowledge';

export type ReadJSON = (path: string) => Promise<unknown>;

export type Access =
  | { access: 'full'; reason: 'member' | 'unlock' | 'gift' }
  | { access: 'brief' }
  | { access: 'none' }
  | { access: 'limit'; limit: number }
  | { access: 'busy' }
  | { access: 'mismatch' };

/** What is asked, fixed at a cast's first lookup (reading_access compares it on every later one). */
export interface CastRequest {
  q: string;
  ctx: Record<string, string | number>;
  hex: number;
  line: number;
  month: string;
  date: string;
  method: string;
}

export interface ReadingDeps {
  readJSON: ReadJSON;
  access(castId: string, request: CastRequest, localDay: string, ready: boolean): Promise<Access>;
}

/** The answer sent back: an HTTP status and a JSON body. */
export interface Answer {
  status: number;
  body: Record<string, unknown>;
}

const CORE = ['data/catalog.json', 'data/meihua-sections.json', 'data/domains.json'] as const;
const BRANCHES = '子丑寅卯辰巳午未申酉戌亥';
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const CAST_ID = /^[A-Za-z0-9._:-]{1,80}$/;
const QUESTION_ID = /^[a-z0-9][a-z0-9._-]{1,120}$/;
const METHODS = ['pre-heaven', 'post-heaven', 'manual'];

type Product = ReturnType<typeof createProductRepository>;
const products = new WeakMap<ReadJSON, Promise<Product>>();

/** One library and product interface per reader (kept for the life of the Worker isolate). */
function productFor(readJSON: ReadJSON): Promise<Product> {
  let p = products.get(readJSON);
  if (!p) {
    p = Promise.all(CORE.map((path) => readJSON(path))).then(([catalog, sections, domains]) =>
      createProductRepository({ library: createLibrary({ catalog, sections, domains } as never), readJSON } as never),
    );
    p.catch(() => products.delete(readJSON));
    products.set(readJSON, p);
  }
  return p;
}

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/** Checks the body and turns it into the product lookup and the request kept for the cast. */
export function parseBody(body: unknown): { castId: string; localDay: string; options: Record<string, unknown>; request: CastRequest } | null {
  if (!isObject(body) || !isObject(body.options)) return null;
  const { castId, localDay } = body;
  const o = body.options;
  if (typeof castId !== 'string' || !CAST_ID.test(castId) || typeof localDay !== 'string' || !DAY.test(localDay)) return null;
  if (typeof o.questionId !== 'string' || !QUESTION_ID.test(o.questionId)) return null;
  if (!Number.isInteger(o.primaryId) || (o.primaryId as number) < 1 || (o.primaryId as number) > 64) return null;
  if (!Number.isInteger(o.movingLine) || (o.movingLine as number) < 1 || (o.movingLine as number) > 6) return null;
  if (typeof o.monthBranch !== 'string' || o.monthBranch.length !== 1 || !BRANCHES.includes(o.monthBranch)) return null;
  if (typeof o.castingDate !== 'string' || !DAY.test(o.castingDate)) return null;
  const method = isObject(o.timingContext) ? o.timingContext.castingMethod : undefined;
  if (typeof method !== 'string' || !METHODS.includes(method)) return null;
  const ctx: Record<string, string | number> = {};
  if (o.context !== undefined) {
    if (!isObject(o.context) || Object.keys(o.context).length > 8) return null;
    for (const [k, v] of Object.entries(o.context)) {
      if (!/^[A-Za-z][A-Za-z0-9]{0,40}$/.test(k)) return null;
      if (typeof v === 'string' && v.length <= 80) ctx[k] = v;
      else if (Number.isInteger(v)) ctx[k] = v as number;
      else return null;
    }
  }
  const options = {
    questionId: o.questionId,
    context: ctx,
    primaryId: o.primaryId,
    movingLine: o.movingLine,
    monthBranch: o.monthBranch,
    // The 气 of the month is the engine's, never the caller's.
    monthOrder: resolveMonthSlot({ monthBranch: o.monthBranch } as never)?.qi,
    castingDate: o.castingDate,
    timingScale: 'day',
    timingContext: { castingMethod: method, periodMethod: 'element-qi' },
  };
  const request: CastRequest = { q: o.questionId, ctx, hex: o.primaryId as number, line: o.movingLine as number, month: o.monthBranch, date: o.castingDate, method };
  return { castId, localDay, options, request };
}

type Content = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

/** The fields the app reads when there is nothing written to give. */
const noneOf = (c: Content) => ({ status: c.status, predictionAllowed: false });

/** 简断 only: what the paywall shows. No 详断, 应期 or 计算说明 leaves the server. */
const briefOf = (c: Content) => ({
  status: c.status,
  predictionAllowed: true,
  manuscriptVersion: c.manuscriptVersion ?? null,
  decision: { id: c.decision?.id ?? null },
  title: c.title ?? '',
  short: typeof c.short === 'string' ? c.short : '',
  paragraphs: [],
  sourceSections: (c.sourceSections ?? []).map((s: { title?: string }) => ({ title: s.title ?? '' })),
});

/** The whole 断语, as the app shows it. */
const fullOf = (c: Content) => ({
  ...briefOf(c),
  paragraphs: [...(c.narrativeParagraphs ?? c.paragraphs ?? [])],
  timingSection: c.timingSection
    ? {
        referenceNote: c.timingSection.referenceNote,
        ...(c.timingSection.phaseNotes ? { phaseNotes: [...c.timingSection.phaseNotes] } : {}),
        windows: (c.timingSection.windows ?? []).map((w: Content) => ({ event: w.event, valence: w.valence, text: w.text, displayedDates: [...(w.displayedDates ?? [])] })),
      }
    : null,
  calculationExplanation: { paragraphs: [...(c.calculationExplanation?.paragraphs ?? [])] },
});

/** Answers one lookup: { access, reason?, content } or an error. */
export async function answerReading(body: unknown, deps: ReadingDeps): Promise<Answer> {
  const parsed = parseBody(body);
  if (!parsed) return { status: 400, body: { error: 'bad-request' } };
  const product = await productFor(deps.readJSON);
  let content: Content;
  try {
    content = (await product.getContent(parsed.options as never)) as Content;
  } catch {
    return { status: 400, body: { error: 'bad-request' } };
  }
  const ready = content.predictionAllowed === true;
  const acc = await deps.access(parsed.castId, parsed.request, parsed.localDay, ready);
  switch (acc.access) {
    case 'busy':
      return { status: 429, body: { error: 'busy' } };
    case 'mismatch':
      return { status: 409, body: { error: 'mismatch' } };
    case 'limit':
      return { status: 200, body: { access: 'limit', limit: acc.limit } };
    case 'none':
      return { status: 200, body: { access: 'none', content: noneOf(content) } };
    case 'brief':
      return { status: 200, body: { access: 'brief', content: ready ? briefOf(content) : noneOf(content) } };
    case 'full':
      return { status: 200, body: { access: 'full', reason: acc.reason, content: ready ? fullOf(content) : noneOf(content) } };
  }
}

/** reading_access() in Supabase, asked as the caller (their own token). */
export function supabaseAccess(url: string, anonKey: string, authorization: string, fetcher: typeof fetch = fetch): ReadingDeps['access'] {
  return async (castId, request, localDay, ready) => {
    const res = await fetcher(`${url}/rest/v1/rpc/reading_access`, {
      method: 'POST',
      headers: { apikey: anonKey, Authorization: authorization, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_cast_id: castId, p_request: request, p_local_day: localDay, p_ready: ready }),
    });
    if (res.status === 401 || res.status === 403) throw new AccessError(401);
    if (!res.ok) throw new AccessError(502);
    return (await res.json()) as Access;
  };
}

export class AccessError extends Error {
  constructor(readonly status: number) {
    super(`access ${status}`);
  }
}

// ---------------- sign-in check ----------------

/** Supabase signs its access tokens with ES256; the public keys are at /auth/v1/.well-known/jwks.json. */
type Jwk = JsonWebKey & { kid?: string; alg?: string };
const keyCache = new Map<string, { at: number; keys: Promise<Map<string, CryptoKey>> }>();

function keysOf(supabaseUrl: string, fetcher: typeof fetch): Promise<Map<string, CryptoKey>> {
  const cached = keyCache.get(supabaseUrl);
  // Keys rotate rarely; read them again after an hour.
  if (cached && Date.now() - cached.at < 3600_000) return cached.keys;
  {
    const k = fetcher(`${supabaseUrl}/auth/v1/.well-known/jwks.json`)
      .then((r) => (r.ok ? (r.json() as Promise<{ keys: Jwk[] }>) : Promise.reject(new Error('jwks'))))
      .then(async ({ keys }) => {
        const out = new Map<string, CryptoKey>();
        for (const j of keys ?? []) {
          if (j.kty !== 'EC' || j.crv !== 'P-256' || !j.kid) continue;
          out.set(j.kid, await crypto.subtle.importKey('jwk', { kty: j.kty, crv: j.crv, x: j.x, y: j.y }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']));
        }
        return out;
      });
    k.catch(() => keyCache.delete(supabaseUrl));
    keyCache.set(supabaseUrl, { at: Date.now(), keys: k });
    return k;
  }
}

const b64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));

/**
 * The account a bearer token belongs to, checked here before any 断语 file is opened (so an
 * unsigned request costs nothing). Returns null for a missing, forged or expired token.
 */
export async function verifiedUser(authorization: string | null, supabaseUrl: string, fetcher: typeof fetch = fetch): Promise<{ sub: string; anonymous: boolean } | null> {
  const token = authorization?.replace(/^Bearer\s+/i, '') ?? '';
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const header = JSON.parse(new TextDecoder().decode(b64url(parts[0])));
    const payload = JSON.parse(new TextDecoder().decode(b64url(parts[1])));
    if (header.alg !== 'ES256' || typeof header.kid !== 'string') return null;
    const key = (await keysOf(supabaseUrl, fetcher)).get(header.kid);
    if (!key) return null;
    const ok = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, b64url(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
    if (!ok) return null;
    if (typeof payload.exp !== 'number' || payload.exp * 1000 < Date.now()) return null;
    if (payload.role !== 'authenticated' || typeof payload.sub !== 'string') return null;
    if (payload.iss && payload.iss !== `${supabaseUrl}/auth/v1`) return null;
    return { sub: payload.sub, anonymous: payload.is_anonymous === true };
  } catch {
    return null;
  }
}

/** The whole request: sign-in check, then the lookup. Used by the Worker and the dev server. */
export async function handleReadingRequest(
  req: { method: string; authorization: string | null; json(): Promise<unknown> },
  env: { supabaseUrl: string; supabaseAnonKey: string; readJSON: ReadJSON; fetcher?: typeof fetch },
): Promise<Answer> {
  if (req.method !== 'POST') return { status: 405, body: { error: 'method' } };
  if (!env.supabaseUrl || !env.supabaseAnonKey) return { status: 503, body: { error: 'not-configured' } };
  const user = await verifiedUser(req.authorization, env.supabaseUrl, env.fetcher);
  if (!user) return { status: 401, body: { error: 'sign-in' } };
  const body = await req.json().catch(() => null);
  try {
    return await answerReading(body, { readJSON: env.readJSON, access: supabaseAccess(env.supabaseUrl, env.supabaseAnonKey, req.authorization!, env.fetcher) });
  } catch (e) {
    if (e instanceof AccessError) return { status: e.status, body: { error: e.status === 401 ? 'sign-in' : 'unavailable' } };
    return { status: 500, body: { error: 'unavailable' } };
  }
}
