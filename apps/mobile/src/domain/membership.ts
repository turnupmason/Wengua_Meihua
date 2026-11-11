/**
 * Membership. Free visitors cast one hexagram a day and see a one-line 断语 summary; members cast
 * up to three a day and read every 断语 in full; anyone may unlock the full 断语 of one reading.
 * There is no "unlimited" tier on purpose: 初筮告，再三渎，渎则不告 — the app also asks before the
 * same fixed question is cast again within seven days (sameMatter.ts).
 *
 * Purchases go through a PurchaseProvider (App Store / Google Play in the native app). Everything
 * here is kept on the device; once accounts exist the entitlement must be confirmed by the server
 * from the store receipt, and these counts should be enforced there too.
 */
import { safeStore, type KeyValueStore } from './storage';

export type PlanId = 'free' | 'monthly' | 'yearly';
export type ProductId = 'wengua.member.monthly' | 'wengua.member.yearly' | 'wengua.reading.single';

export interface Product {
  id: ProductId;
  kind: 'subscription' | 'consumable';
  /** Display prices (store tiers: ¥6 / ¥28 / ¥198 in China; $0.99 / $4.99 / $39.99 elsewhere). */
  price: { zh: string; en: string };
  months?: number;
}

export const PRODUCTS: Record<ProductId, Product> = {
  'wengua.member.monthly': { id: 'wengua.member.monthly', kind: 'subscription', price: { zh: '¥28 / 月', en: '$4.99 / month' }, months: 1 },
  'wengua.member.yearly': { id: 'wengua.member.yearly', kind: 'subscription', price: { zh: '¥198 / 年', en: '$39.99 / year' }, months: 12 },
  'wengua.reading.single': { id: 'wengua.reading.single', kind: 'consumable', price: { zh: '¥6 / 次', en: '$0.99 each' } },
};

export const DAILY_LIMIT: Record<'free' | 'member', number> = { free: 1, member: 3 };
export const REPEAT_DAYS = 7;

export interface Entitlement {
  plan: PlanId;
  /** ISO time the subscription runs until (null for free). */
  expiresAt: string | null;
  /** Readings whose full 断语 were bought one at a time. */
  unlocked: string[];
}

const ENT_KEY = 'wengua.entitlement.v1';
const USAGE_KEY = 'wengua.usage.v1';
const FREE: Entitlement = { plan: 'free', expiresAt: null, unlocked: [] };

export function createMembership(store: KeyValueStore = safeStore('local')) {
  const read = (): Entitlement => {
    try {
      const e = JSON.parse(store.getItem(ENT_KEY) || 'null');
      return e && typeof e.plan === 'string' && Array.isArray(e.unlocked) ? (e as Entitlement) : { ...FREE };
    } catch {
      return { ...FREE };
    }
  };
  const write = (e: Entitlement) => store.setItem(ENT_KEY, JSON.stringify(e));
  /** Append-only log of charged casts (time + question_id), separate from history so deleting history does not reset the count. */
  const usage = (): { at: string; q: string }[] => {
    try {
      const u = JSON.parse(store.getItem(USAGE_KEY) || '[]');
      return Array.isArray(u) ? u : [];
    } catch {
      return [];
    }
  };

  const api = {
    entitlement: read,
    isMember(now = new Date()): boolean {
      const e = read();
      return e.plan !== 'free' && !!e.expiresAt && new Date(e.expiresAt).getTime() > now.getTime();
    },
    dailyLimit(now = new Date()) {
      return api.isMember(now) ? DAILY_LIMIT.member : DAILY_LIMIT.free;
    },
    /** Casts made today (local calendar day). */
    castsToday(now = new Date()) {
      const day = now.toDateString();
      return usage().filter((u) => new Date(u.at).toDateString() === day).length;
    },
    canCast(now = new Date()) {
      return api.castsToday(now) < api.dailyLimit(now);
    },
    /**
     * Counts one cast against today's readings. Called only when the cast was given an approved
     * 断语: a reading whose 断语 is still being written is never charged.
     */
    recordCast(questionId: string, now = new Date()) {
      const u = usage();
      u.unshift({ at: now.toISOString(), q: questionId.slice(0, 200) });
      store.setItem(USAGE_KEY, JSON.stringify(u.slice(0, 400)));
    },
    /** Full 断语 for this reading: members, or a single unlock. */
    canReadFull(castId: string | null, now = new Date()) {
      return api.isMember(now) || (!!castId && read().unlocked.includes(castId));
    },
    /** Applies a completed purchase. */
    grant(product: ProductId, castId: string | null, now = new Date()) {
      const e = read();
      const p = PRODUCTS[product];
      if (p.kind === 'consumable') {
        if (castId && !e.unlocked.includes(castId)) e.unlocked = [castId, ...e.unlocked].slice(0, 1000);
      } else {
        const from = e.expiresAt && new Date(e.expiresAt) > now ? new Date(e.expiresAt) : now;
        const until = new Date(from);
        until.setMonth(until.getMonth() + (p.months ?? 1));
        e.plan = product === 'wengua.member.yearly' ? 'yearly' : 'monthly';
        e.expiresAt = until.toISOString();
      }
      write(e);
      return e;
    },
    /** Test store only: forget today's casts so the flow can be tried again. */
    resetToday(now = new Date()) {
      const day = now.toDateString();
      store.setItem(USAGE_KEY, JSON.stringify(usage().filter((u) => new Date(u.at).toDateString() !== day)));
    },
    /** Test store only: back to the free plan (single unlocks are kept). */
    endSubscription() {
      write({ ...read(), plan: 'free', expiresAt: null });
    },
    /** Replaces the subscription state with what the store reports (restore purchases). */
    restore(state: { plan: PlanId; expiresAt: string | null }) {
      write({ ...read(), ...state });
    },
  };
  return api;
}

export type Membership = ReturnType<typeof createMembership>;

// ---------------- purchases ----------------

export interface PurchaseResult { ok: boolean; product?: ProductId; error?: string }

export interface PurchaseProvider {
  /** False until a real store is connected (the paywall then explains purchases are not open yet). */
  available: boolean;
  /** Development test store: grants immediately, never charges. */
  isTest: boolean;
  buy(product: ProductId): Promise<PurchaseResult>;
  restore(): Promise<{ plan: PlanId; expiresAt: string | null } | null>;
}

/** Development builds only: completes "purchases" locally so every flow can be tried. */
export const testStore: PurchaseProvider = {
  available: true,
  isTest: true,
  async buy(product) {
    return { ok: true, product };
  },
  async restore() {
    return null;
  },
};

/** Production until App Store / Google Play billing is connected. */
export const noStore: PurchaseProvider = {
  available: false,
  isTest: false,
  async buy() {
    return { ok: false, error: 'store-not-connected' };
  },
  async restore() {
    return null;
  },
};

export const purchaseProvider: PurchaseProvider = import.meta.env?.DEV ? testStore : noStore;
