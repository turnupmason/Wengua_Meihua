/**
 * App Store purchases through RevenueCat (iOS app only; see membership.ts for the products).
 *
 * - The RevenueCat user is the Supabase account (a guest has an anonymous one), so a purchase
 *   always has an owner and follows the visitor to a real account (accounts.ts, adopt-guest).
 * - 月度 / 年度会员 give the entitlement `member`; RevenueCat reads it from the App Store.
 * - 单次 / 十次 give reading credits. The server counts them from RevenueCat's record of the
 *   purchases (edge function claim-purchases) and spends them (spend_credit), so they cannot be
 *   made up on the device.
 */
import { Purchases, type CustomerInfo } from '@revenuecat/purchases-capacitor';
import { CLOUD, supabase } from './cloud';
import { ensureGuestAccount } from './accounts';
import { MEMBER_ENTITLEMENT, PRODUCTS, type PlanId, type ProductId, type PurchaseProvider, type ServerState } from '../domain/membership';

let configured: Promise<string> | null = null;

/** Configures RevenueCat for the current account (made as a guest if there is none). */
async function ready(): Promise<string> {
  const user = await ensureGuestAccount();
  if (!user) throw new Error('no-account');
  if (!configured) {
    configured = Purchases.configure({ apiKey: CLOUD.revenueCatIosKey, appUserID: user.id }).then(() => user.id);
    return configured;
  }
  const current = await configured;
  if (current !== user.id) {
    await Purchases.logIn({ appUserID: user.id });
    configured = Promise.resolve(user.id);
  }
  return user.id;
}

function subscriptionOf(info: CustomerInfo): { plan: PlanId; expiresAt: string | null } {
  const e = info.entitlements.active[MEMBER_ENTITLEMENT];
  if (!e) return { plan: 'free', expiresAt: null };
  return { plan: e.productIdentifier === 'wengua.member.yearly' ? 'yearly' : 'monthly', expiresAt: e.expirationDate ?? null };
}

/** Credits and unlocks from the server, after it has counted any new purchase. */
async function credits(): Promise<{ credits: number; unlocked: string[] }> {
  const sb = await supabase();
  const { data, error } = await sb.functions.invoke('claim-purchases', { body: {} });
  if (error) throw error;
  return { credits: Number(data?.credits ?? 0), unlocked: Array.isArray(data?.unlocked) ? data.unlocked : [] };
}

async function state(info?: CustomerInfo): Promise<ServerState> {
  await ready();
  const ci = info ?? (await Purchases.getCustomerInfo()).customerInfo;
  return { ...subscriptionOf(ci), ...(await credits()) };
}

const cancelled = (e: unknown) => {
  const x = e as { userCancelled?: boolean; code?: string | number };
  return !!x?.userCancelled || String(x?.code) === '1';
};

export const appStore: PurchaseProvider = {
  available: true,
  isTest: false,
  async buy(product: ProductId) {
    try {
      await ready();
      const { products } = await Purchases.getProducts({ productIdentifiers: [product] });
      const p = products.find((x) => x.identifier === product);
      if (!p) return { ok: false, error: 'product-not-found' };
      const res = await Purchases.purchaseStoreProduct({ product: p });
      return { ok: true, product, state: await state(res.customerInfo) };
    } catch (e) {
      return cancelled(e) ? { ok: false, cancelled: true } : { ok: false, error: (e as Error)?.message ?? 'purchase-failed' };
    }
  },
  async restore() {
    await ready();
    const { customerInfo } = await Purchases.restorePurchases();
    const sub = subscriptionOf(customerInfo);
    return sub.plan === 'free' ? null : sub;
  },
  async prices() {
    try {
      await ready();
      const ids = Object.keys(PRODUCTS) as ProductId[];
      const { products } = await Purchases.getProducts({ productIdentifiers: ids });
      return Object.fromEntries(products.map((p) => [p.identifier, p.priceString])) as Partial<Record<ProductId, string>>;
    } catch {
      return {};
    }
  },
  async sync() {
    try {
      return await state();
    } catch {
      return null;
    }
  },
  async unlock(castId: string) {
    const sb = await supabase();
    const { data, error } = await sb.rpc('spend_credit', { p_cast_id: castId });
    if (error || !data?.ok) return null;
    return state();
  },
  async manage() {
    // The App Store's own page for the visitor's subscriptions.
    window.open('https://apps.apple.com/account/subscriptions', '_system');
  },
};
