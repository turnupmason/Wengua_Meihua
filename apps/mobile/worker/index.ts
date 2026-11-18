/**
 * app.wengualabs.com (Cloudflare Worker `wengua-app`, apps/mobile/wrangler.jsonc).
 *
 * - /api/reading: one cast's 断语, after the sign-in and entitlement checks (server/reading.ts).
 * - /_data/*: the 断语 library and the data the lookup reads. Packed beside the page
 *   (scripts/pack-web.mjs) but never served: only this Worker reads it, through the ASSETS binding.
 * - Everything else is the web app itself (static files, straight from the assets).
 */
import { handleReadingRequest } from '../server/reading';

interface Env {
  ASSETS: { fetch(input: Request | string): Promise<Response> };
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
}

/** The web app itself and the iOS app (Capacitor serves it from capacitor://localhost). */
const ORIGINS = new Set(['https://app.wengualabs.com', 'capacitor://localhost', 'http://localhost', 'http://localhost:5173']);

const corsOf = (origin: string | null): Record<string, string> =>
  origin && ORIGINS.has(origin)
    ? {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Headers': 'authorization, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Max-Age': '86400',
        Vary: 'Origin',
      }
    : {};

const readers = new Map<string, (path: string) => Promise<unknown>>();
/** Reads a file of the packed library (one reader per origin, so the parsed library is kept). */
function readerFor(env: Env, origin: string) {
  let r = readers.get(origin);
  if (!r) {
    r = async (path: string) => {
      if (!/^(data|sources)\/[A-Za-z0-9/_.-]+\.json$/.test(path) || path.includes('..')) throw new Error('bad path');
      const res = await env.ASSETS.fetch(new Request(`${origin}/_data/${path}`));
      if (!res.ok) throw new Error(`missing ${path}`);
      return res.json();
    };
    readers.set(origin, r);
  }
  return r;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const cors = corsOf(request.headers.get('Origin'));
    if (url.pathname.startsWith('/_data/')) return new Response('Not found', { status: 404 });
    if (url.pathname === '/api/reading') {
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
      const answer = await handleReadingRequest(
        { method: request.method, authorization: request.headers.get('Authorization'), json: () => request.json() },
        { supabaseUrl: env.SUPABASE_URL, supabaseAnonKey: env.SUPABASE_ANON_KEY, readJSON: readerFor(env, url.origin) },
      );
      return new Response(JSON.stringify(answer.body), {
        status: answer.status,
        headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
      });
    }
    if (url.pathname.startsWith('/api/')) return new Response('Not found', { status: 404 });
    return env.ASSETS.fetch(request);
  },
};
