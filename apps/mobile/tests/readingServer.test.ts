// The 断语 server (server/reading.ts, worker/index.ts): one cast's 断语 at a time, in full or as
// the 简断, after a real sign-in check; the library itself is never served.
import { describe, expect, it } from 'vitest';
import { answerReading, handleReadingRequest, parseBody, verifiedUser, type Access, type CastRequest } from '../server/reading';
import worker from '../worker/index';
import { judgmentFor, type ProductJudgment } from '../src/domain/judgment';
import { questionById } from '../src/domain/questionCatalog';
import { readFromDisk, testKnowledge } from './helpers';

const INTERVIEW = 'career.interview.interview-pass';
const OPTIONS = {
  questionId: INTERVIEW,
  context: {},
  primaryId: 48,
  movingLine: 5,
  monthBranch: '亥',
  monthOrder: 'winter-water',
  castingDate: '2026-11-11',
  timingScale: 'day',
  timingContext: { castingMethod: 'pre-heaven', periodMethod: 'element-qi' },
};
const BODY = { castId: 'cast-1', localDay: '2026-11-11', options: OPTIONS };

const fixed = (a: Access) => {
  const seen: { castId: string; request: CastRequest; ready: boolean }[] = [];
  return { seen, deps: { readJSON: readFromDisk, access: async (castId: string, request: CastRequest, _day: string, ready: boolean) => (seen.push({ castId, request, ready }), a) } };
};

describe('/api/reading answers', () => {
  it('gives the whole 断语 to a reader who may read it', async () => {
    const { deps, seen } = fixed({ access: 'full', reason: 'member' });
    const a = await answerReading(BODY, deps);
    expect(a.status).toBe(200);
    expect(a.body).toMatchObject({ access: 'full', reason: 'member' });
    const content = a.body.content as { paragraphs: string[]; short: string; timingSection: unknown };
    expect(content.paragraphs.length).toBeGreaterThan(2);
    expect(content.short).toBeTruthy();
    // What is fixed for the cast: question, chart, month, day, method.
    expect(seen[0]).toMatchObject({ castId: 'cast-1', ready: true, request: { q: INTERVIEW, hex: 48, line: 5, month: '亥', date: '2026-11-11', method: 'pre-heaven' } });
  });

  it('gives only the 简断 otherwise: no 详断, 应期 or 计算说明 leaves the server', async () => {
    const full = await answerReading(BODY, fixed({ access: 'full', reason: 'member' }).deps);
    const brief = await answerReading(BODY, fixed({ access: 'brief' }).deps);
    expect(brief.body.access).toBe('brief');
    const sent = JSON.stringify(brief.body);
    const whole = full.body.content as { paragraphs: string[]; short: string };
    for (const p of whole.paragraphs) expect(sent).not.toContain(p.slice(3, 40));
    expect(sent).toContain(whole.short);
    expect(brief.body.content).not.toHaveProperty('timingSection');
    expect(brief.body.content).not.toHaveProperty('calculationExplanation');
  });

  it('turns the answers into the app’s 断语: whole, or 简断 only (partial)', async () => {
    const { library } = await testKnowledge();
    expect(library).toBeTruthy();
    const as = (a: Access) => ({
      getContent: async () => {
        const r = await answerReading(BODY, fixed(a).deps);
        return { ...(r.body.content as object), access: r.body.access, ...(r.body.reason ? { accessReason: r.body.reason } : {}) } as never;
      },
    });
    const input = { questionId: INTERVIEW, primaryId: 48, movingLine: 5, method: 'classical-time', monthBranch: '亥', dayGanzhi: '己丑', localWallClock: '2026-11-11T09:00' };
    const whole = (await judgmentFor(as({ access: 'full', reason: 'gift' }), questionById(INTERVIEW)!, input)) as ProductJudgment;
    expect(whole).toMatchObject({ state: 'ready', grantedBy: 'gift' });
    expect(whole.partial).toBeUndefined();
    expect(whole.paragraphs.length).toBeGreaterThan(2);
    const brief = (await judgmentFor(as({ access: 'brief' }), questionById(INTERVIEW)!, input)) as ProductJudgment;
    expect(brief).toMatchObject({ state: 'ready', partial: true, paragraphs: [], timing: null, calculation: [] });
    expect(brief.short).toBe(whole.short);
    expect(brief.decisionId).toBe(whole.decisionId);
  });

  it('carries the collated 小过九四 wording into the saved full 断语', async () => {
    const questionId = 'search.missing-contact.contact';
    const options = { ...OPTIONS, questionId, primaryId: 62, movingLine: 4 };
    const body = { ...BODY, options };
    const whole = await answerReading(body, fixed({ access: 'full', reason: 'member' }).deps);
    const brief = await answerReading(body, fixed({ access: 'brief' }).deps);
    const movingLineText = '无咎，弗过遇之，往厉必戒，勿用永贞。';
    expect(whole.body.content).toHaveProperty('movingLineText', movingLineText);
    expect(brief.body.content).not.toHaveProperty('movingLineText');
    const repository = { getContent: async () => ({ ...(whole.body.content as object), access: 'full' }) as never };
    const cast = { ...options, method: 'classical-time', dayGanzhi: '己丑', localWallClock: '2026-11-11T09:00' };
    const judgment = await judgmentFor(repository, questionById(questionId)!, cast);
    expect(judgment).toMatchObject({ state: 'ready', movingLineText });
  });

  it('says nothing is written, and charges nothing, for a chart with no 断语', async () => {
    const { deps, seen } = fixed({ access: 'none' });
    const a = await answerReading({ ...BODY, options: { ...OPTIONS, questionId: 'career.interview.job-offer' } }, deps);
    expect(a.status).toBe(200);
    expect(a.body.content).toMatchObject({ predictionAllowed: false });
    expect(seen[0]?.ready ?? false).toBe(false);
  });

  it('refuses over the daily limit, too many lookups, and a cast id used for another chart', async () => {
    expect((await answerReading(BODY, fixed({ access: 'limit', limit: 1 }).deps)).body).toEqual({ access: 'limit', limit: 1 });
    expect((await answerReading(BODY, fixed({ access: 'busy' }).deps)).status).toBe(429);
    expect((await answerReading(BODY, fixed({ access: 'mismatch' }).deps)).status).toBe(409);
  });

  it('accepts only a well-formed lookup', () => {
    expect(parseBody(BODY)).not.toBeNull();
    expect(parseBody({ ...BODY, castId: '../x' })).toBeNull();
    expect(parseBody({ ...BODY, localDay: 'today' })).toBeNull();
    expect(parseBody({ ...BODY, options: { ...OPTIONS, primaryId: 65 } })).toBeNull();
    expect(parseBody({ ...BODY, options: { ...OPTIONS, movingLine: 0 } })).toBeNull();
    expect(parseBody({ ...BODY, options: { ...OPTIONS, monthBranch: 'x' } })).toBeNull();
    expect(parseBody({ ...BODY, options: { ...OPTIONS, timingContext: { castingMethod: 'other' } } })).toBeNull();
    expect(parseBody({ ...BODY, options: { ...OPTIONS, context: { 'a b': 1 } } })).toBeNull();
  });
});

describe('sign-in check', () => {
  const URL = 'https://example.supabase.co';
  const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const text = (o: unknown) => b64(new TextEncoder().encode(JSON.stringify(o)));

  async function signer() {
    const pair = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])) as CryptoKeyPair;
    const jwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
    const fetcher = (async () => new Response(JSON.stringify({ keys: [{ ...jwk, kid: 'k1', alg: 'ES256' }] }))) as unknown as typeof fetch;
    const sign = async (payload: Record<string, unknown>, kid = 'k1') => {
      const head = `${text({ alg: 'ES256', kid, typ: 'JWT' })}.${text(payload)}`;
      const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, pair.privateKey, new TextEncoder().encode(head)));
      return `Bearer ${head}.${b64(sig)}`;
    };
    return { fetcher, sign };
  }
  const later = () => Math.floor(Date.now() / 1000) + 600;

  it('accepts a token Supabase signed, and knows a guest', async () => {
    const { fetcher, sign } = await signer();
    const token = await sign({ sub: 'u1', role: 'authenticated', exp: later(), iss: `${URL}/auth/v1`, is_anonymous: true });
    expect(await verifiedUser(token, URL, fetcher)).toEqual({ sub: 'u1', anonymous: true });
  });

  it('refuses a missing, expired, forged or anonymous-role token', async () => {
    const { fetcher, sign } = await signer();
    const other = await signer();
    expect(await verifiedUser(null, URL, fetcher)).toBeNull();
    expect(await verifiedUser('Bearer x.y.z', URL, fetcher)).toBeNull();
    expect(await verifiedUser(await sign({ sub: 'u1', role: 'authenticated', exp: 1 }), URL, fetcher)).toBeNull();
    expect(await verifiedUser(await other.sign({ sub: 'u1', role: 'authenticated', exp: later() }), URL, fetcher)).toBeNull();
    expect(await verifiedUser(await sign({ sub: 'u1', role: 'anon', exp: later() }), URL, fetcher)).toBeNull();
  });

  it('opens no 断语 file for a request that is not signed in', async () => {
    let read = 0;
    const answer = await handleReadingRequest(
      { method: 'POST', authorization: null, json: async () => BODY },
      { supabaseUrl: URL, supabaseAnonKey: 'k', readJSON: async (p) => (read++, readFromDisk(p)) },
    );
    expect(answer.status).toBe(401);
    expect(read).toBe(0);
  });
});

describe('the Worker', () => {
  const assets = { fetch: async (r: Request | string) => new Response(`asset ${typeof r === 'string' ? r : new URL(r.url).pathname}`) };
  const env = { ASSETS: assets, SUPABASE_URL: 'https://example.supabase.co', SUPABASE_ANON_KEY: 'k' };

  it('never serves the packed library to a browser', async () => {
    const res = await worker.fetch(new Request('https://app.wengualabs.com/_data/data/authored-readings/interview-pass/hex-048.json'), env);
    expect(res.status).toBe(404);
  });

  it('serves the page itself from the assets', async () => {
    const res = await worker.fetch(new Request('https://app.wengualabs.com/index.html'), env);
    expect(await res.text()).toBe('asset /index.html');
  });

  it('answers the app’s preflight from the iOS app, and no other site', async () => {
    const ok = await worker.fetch(new Request('https://app.wengualabs.com/api/reading', { method: 'OPTIONS', headers: { Origin: 'capacitor://localhost' } }), env);
    expect(ok.headers.get('Access-Control-Allow-Origin')).toBe('capacitor://localhost');
    const other = await worker.fetch(new Request('https://app.wengualabs.com/api/reading', { method: 'OPTIONS', headers: { Origin: 'https://evil.example' } }), env);
    expect(other.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('asks for a sign-in before anything else', async () => {
    const res = await worker.fetch(new Request('https://app.wengualabs.com/api/reading', { method: 'POST', body: JSON.stringify(BODY) }), env);
    expect(res.status).toBe(401);
  });
});
