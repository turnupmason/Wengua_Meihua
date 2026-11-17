/**
 * The online services (2026-11-17, for the App Store release): Supabase keeps accounts and the
 * reading credits bought in packs; RevenueCat checks App Store purchases and subscriptions. Keys
 * come from the build's environment (see `.env.example`); without them the app works as before,
 * on this device only, and every reading stays open (OPEN_BETA).
 */
import { Capacitor } from '@capacitor/core';
import type { SupabaseClient } from '@supabase/supabase-js';

const env = (import.meta.env ?? {}) as Record<string, string | undefined>;

export const CLOUD = {
  supabaseUrl: env.VITE_SUPABASE_URL ?? '',
  supabaseAnonKey: env.VITE_SUPABASE_ANON_KEY ?? '',
  revenueCatIosKey: env.VITE_REVENUECAT_IOS_KEY ?? '',
  googleIosClientId: env.VITE_GOOGLE_IOS_CLIENT_ID ?? '',
  googleWebClientId: env.VITE_GOOGLE_WEB_CLIENT_ID ?? '',
};

/**
 * The privacy policy and terms the App Store asks to be linked beside subscriptions. The policy is
 * public/legal/privacy.html, published on the company site as https://wengualabs.com/privacy
 * (site/privacy.html is the same file); the terms are Apple's standard licence unless our own are
 * given (VITE_TERMS_URL).
 */
export const LEGAL = {
  privacy: env.VITE_PRIVACY_URL || 'https://wengualabs.com/privacy',
  terms: env.VITE_TERMS_URL || 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/',
};

const native = () => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};
export const isIos = () => native() && Capacitor.getPlatform() === 'ios';

/** Accounts can be made (Supabase configured). */
export const accountsReady = () => !!(CLOUD.supabaseUrl && CLOUD.supabaseAnonKey);
/** Purchases can be made: the iOS app with RevenueCat and accounts configured. */
export const storeReady = () => isIos() && !!CLOUD.revenueCatIosKey && accountsReady();
/** Native Apple / Google sign-in (the iOS app). */
export const nativeSignIn = () => isIos();

let client: Promise<SupabaseClient> | null = null;
/** The Supabase client, loaded on first use so the web preview without keys never pulls it in. */
export function supabase(): Promise<SupabaseClient> {
  if (!accountsReady()) return Promise.reject(new Error('accounts-not-configured'));
  client ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(CLOUD.supabaseUrl, CLOUD.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: !native(), storageKey: 'wengua.auth.v1' },
    }),
  );
  return client;
}
