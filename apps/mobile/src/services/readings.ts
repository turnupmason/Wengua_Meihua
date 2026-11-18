/**
 * 断语 from the server (2026-11-18). The library is not shipped with the page or the app; each
 * cast asks /api/reading for its one 断语 (server/reading.ts) and gets it in full, or only the
 * 简断 when the account may not read more (free plan: one written reading a day; members, a credit
 * or the first-reading gift: in full). The server keeps the count, so clearing this device's data
 * changes nothing.
 *
 * The answer has the shape of the product interface's own getContent result (the fields
 * domain/judgment.ts reads), so judgmentFor works the same with either.
 */
import { CLOUD, accountsReady, native, supabase } from './cloud';
import { ensureGuestAccount } from './accounts';
import type { ProductRepository } from '../knowledge/knowledge';

/** Readings come from the server wherever accounts are configured. */
export const serverReadings = () => accountsReady();

/** Where /api/reading lives: the page's own site on the web, app.wengualabs.com from the iOS app. */
const apiBase = () => (CLOUD.apiBase ? CLOUD.apiBase.replace(/\/$/, '') : native() ? 'https://app.wengualabs.com' : '');

export type ReadingAccess = 'full' | 'brief';
export type FullReason = 'member' | 'unlock' | 'gift';

/** Thrown when today's readings are used up on the server (the visitor is shown the plans). */
export class DailyLimitError extends Error {
  constructor(readonly limit: number) {
    super('daily-limit');
  }
}

async function token(): Promise<string | null> {
  const sb = await supabase();
  let { data } = await sb.auth.getSession();
  if (!data.session) {
    // Every reading belongs to an account; a visitor who has not signed in gets a guest one.
    await ensureGuestAccount();
    ({ data } = await sb.auth.getSession());
  }
  return data.session?.access_token ?? null;
}

/**
 * The product interface, answered by the server for one cast. `castId` and the device's day of the
 * cast travel with the lookup: the server fixes what a cast id asked the first time it is used.
 */
export function remoteProduct(castId: string, localDay: string): Pick<ProductRepository, 'getContent'> {
  return {
    async getContent(options) {
      const send = async () => {
        const auth = await token();
        if (!auth) throw new Error('no-account');
        return fetch(`${apiBase()}/api/reading`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${auth}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ castId, localDay, options }),
        });
      };
      let res = await send();
      // A token that expired a moment ago: refresh once and ask again.
      if (res.status === 401) {
        await (await supabase()).auth.refreshSession().catch(() => undefined);
        res = await send();
      }
      if (!res.ok) throw new Error(`reading ${res.status}`);
      const body = (await res.json()) as { access: string; reason?: FullReason; limit?: number; content?: Record<string, unknown> };
      if (body.access === 'limit') throw new DailyLimitError(body.limit ?? 1);
      if (!body.content) throw new Error('reading-empty');
      return { ...body.content, access: body.access === 'full' ? 'full' : 'brief', ...(body.reason ? { accessReason: body.reason } : {}) } as never;
    },
  };
}
