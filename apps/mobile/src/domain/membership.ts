/**
 * Membership. Free visitors cast one hexagram a day and see a one-line 断语 summary; members cast
 * up to three a day and read every 断语 in full; anyone may unlock the full 断语 of one reading with
 * a reading credit (bought one at a time, or ten in a pack).
 * There is no "unlimited" tier on purpose: 初筮告，再三渎，渎则不告 — the app also asks before the
 * same fixed question is cast again within seven days (sameMatter.ts).
 *
 * Purchases go through a PurchaseProvider. In the iOS app (services/store.ts) RevenueCat confirms the
 * subscription from the App Store, and the server (Supabase) keeps the credits and which readings
 * they opened; what is kept here is a copy of that, refreshed from the server (applyServer).
 */
import { safeStore, type KeyValueStore } from './storage';
import { storeReady } from '../services/cloud';

export type PlanId = 'free' | 'monthly' | 'yearly';
export type ProductId = 'wengua.member.monthly' | 'wengua.member.yearly' | 'wengua.reading.single' | 'wengua.reading.pack10';

export interface Product {
  id: ProductId;
  kind: 'subscription' | 'consumable';
  /**
   * Shown until the App Store's own localized price is read (the user's launch prices,
   * 2026-11-14; the US store first, so dollars in both languages).
   */
  price: { zh: string; en: string };
  months?: number;
  /** Reading credits a consumable gives. */
  credits?: number;
}

export const PRODUCTS: Record<ProductId, Product> = {
  'wengua.member.monthly': { id: 'wengua.member.monthly', kind: 'subscription', price: { zh: '$9.99 / 月', en: '$9.99 / month' }, months: 1 },
  'wengua.member.yearly': { id: 'wengua.member.yearly', kind: 'subscription', price: { zh: '$69.99 / 年', en: '$69.99 / year' }, months: 12 },
  'wengua.reading.single': { id: 'wengua.reading.single', kind: 'consumable', price: { zh: '$0.99', en: '$0.99' }, credits: 1 },
  'wengua.reading.pack10': { id: 'wengua.reading.pack10', kind: 'consumable', price: { zh: '$4.99', en: '$4.99' }, credits: 10 },
};
/** The RevenueCat entitlement both plans give. */
export const MEMBER_ENTITLEMENT = 'member';

export const DAILY_LIMIT: Record<'free' | 'member', number> = { free: 1, member: 3 };

/**
 * 内测 (2026-11-14, the user: "目前我们还在测试，不要加会员，准备上架了再弄"): every reading is
 * open and casts are not limited; no paywall or membership entry is shown. Since 2026-11-17 it ends
 * by itself where purchases can be made: the iOS app built with the RevenueCat and Supabase keys
 * (services/cloud.ts). The web preview and builds without keys stay open.
 */
export const OPEN_BETA = !storeReady();
export const REPEAT_DAYS = 7;

export interface Entitlement {
  plan: PlanId;
  /** ISO time the subscription runs until (null for free). */
  expiresAt: string | null;
  /** Readings whose full 断语 were bought one at a time. */
  unlocked: string[];
  /** The first written reading, given in full once so a newcomer sees what 详断 is (never twice). */
  firstGift?: string;
  /** Reading credits not yet spent. */
  credits?: number;
}

/** What the server says this account has (subscription from the App Store, credits and unlocks). */
export interface ServerState {
  plan: PlanId;
  expiresAt: string | null;
  credits: number;
  unlocked: string[];
}

const ENT_KEY = 'wengua.entitlement.v1';
const USAGE_KEY = 'wengua.usage.v1';
const FREE: Entitlement = { plan: 'free', expiresAt: null, unlocked: [] };

export function createMembership(store: KeyValueStore = safeStore('local'), { openBeta = OPEN_BETA }: { openBeta?: boolean } = {}) {
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
      if (openBeta) return true;
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
      if (openBeta) return true;
      const e = read();
      return api.isMember(now) || (!!castId && (e.unlocked.includes(castId) || e.firstGift === castId));
    },
    /**
     * The first cast given a written 断语 is read in full for free, once per device (deleting
     * history does not give it again). Members need no gift. Returns whether this cast got it.
     */
    giftFirst(castId: string, now = new Date()): boolean {
      const e = read();
      if (openBeta || e.firstGift || api.isMember(now)) return false;
      e.firstGift = castId;
      write(e);
      return true;
    },
    /** Whether this cast's 详断 is the first-reading gift. */
    isGift(castId: string | null) {
      return !!castId && read().firstGift === castId;
    },
    /** Reading credits not yet spent. */
    credits() {
      return read().credits ?? 0;
    },
    /** Opens this reading with one credit (kept on the device; in the app the server does this). */
    useCredit(castId: string) {
      const e = read();
      if (e.unlocked.includes(castId)) return true;
      if ((e.credits ?? 0) < 1) return false;
      e.credits = (e.credits ?? 0) - 1;
      e.unlocked = [castId, ...e.unlocked].slice(0, 1000);
      write(e);
      return true;
    },
    /** Replaces the copy kept here with the server's (after sign-in, a purchase or restore). */
    applyServer(state: ServerState) {
      const e = read();
      write({ ...e, plan: state.plan, expiresAt: state.expiresAt, credits: state.credits, unlocked: [...new Set([...state.unlocked, ...e.unlocked])].slice(0, 1000) });
    },
    /** Applies a completed purchase (test store; in the app the server's state is applied). */
    grant(product: ProductId, castId: string | null, now = new Date()) {
      const e = read();
      const p = PRODUCTS[product];
      if (p.kind === 'consumable') {
        e.credits = (e.credits ?? 0) + (p.credits ?? 1);
        write(e);
        if (castId) api.useCredit(castId);
        return read();
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

export interface PurchaseResult {
  ok: boolean;
  product?: ProductId;
  /** The visitor closed the App Store sheet: say nothing. */
  cancelled?: boolean;
  error?: string;
  /** The server's state after the purchase (the app); the test store leaves it out. */
  state?: ServerState;
}

export interface PurchaseProvider {
  /** False until a real store is connected (the paywall then explains purchases are not open yet). */
  available: boolean;
  /** Development test store: grants immediately, never charges. */
  isTest: boolean;
  buy(product: ProductId): Promise<PurchaseResult>;
  restore(): Promise<{ plan: PlanId; expiresAt: string | null } | null>;
  /** The store's localized prices, when it can say them. */
  prices?(): Promise<Partial<Record<ProductId, string>>>;
  /** The server's state for the signed-in account (subscription, credits, unlocks). */
  sync?(): Promise<ServerState | null>;
  /** Spends one credit on this reading, on the server. */
  unlock?(castId: string): Promise<ServerState | null>;
  /** Opens the App Store's subscription management. */
  manage?(): Promise<void>;
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

/**
 * The iOS app with its keys: the App Store through RevenueCat (services/store.ts, loaded only
 * there). Development: the test store. Otherwise purchases are not open.
 */
export const purchaseProvider: PurchaseProvider = storeReady() ? appStoreProxy() : import.meta.env?.DEV ? testStore : noStore;

/** Loads the App Store provider on first use, so the web build never pulls in RevenueCat. */
function appStoreProxy(): PurchaseProvider {
  const real = () => import('../services/store').then((m) => m.appStore);
  return {
    available: true,
    isTest: false,
    buy: async (p) => (await real()).buy(p),
    restore: async () => (await real()).restore(),
    prices: async () => (await real()).prices?.() ?? {},
    sync: async () => (await real()).sync?.() ?? null,
    unlock: async (id) => (await real()).unlock?.(id) ?? null,
    manage: async () => (await real()).manage?.(),
  };
}
