/**
 * Accounts (Supabase Auth): 通过 Apple 登录, Google, and a six-digit code sent by email. A guest or a
 * 道号 kept on this device gets an anonymous account in the background, so purchases have an owner;
 * when that visitor later signs in for real, what the guest bought moves to the real account
 * (edge function `adopt-guest`). Apple and Google sign in natively on iOS and by redirect on the web.
 */
import { CLOUD, accountsReady, nativeSignIn, supabase } from './cloud';

export type CloudMethod = 'apple' | 'google' | 'email';

export interface CloudUser {
  id: string;
  email: string | null;
  name: string;
  anonymous: boolean;
  /** apple, google or email */
  provider: string;
}

const toUser = (u: { id: string; email?: string | null; is_anonymous?: boolean; user_metadata?: Record<string, unknown>; app_metadata?: Record<string, unknown> }): CloudUser => ({
  id: u.id,
  email: u.email ?? null,
  name: String(u.user_metadata?.full_name ?? u.user_metadata?.name ?? '').slice(0, 16),
  anonymous: !!u.is_anonymous,
  provider: String(u.app_metadata?.provider ?? 'email'),
});

/** A random nonce, and its SHA-256 (Apple and Google get the hash; Supabase checks the raw one). */
async function nonces() {
  const raw = Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) => b.toString(16).padStart(2, '0')).join('');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  const hashed = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  return { raw, hashed };
}

let social: Promise<typeof import('@capgo/capacitor-social-login')['SocialLogin']> | null = null;
function socialLogin() {
  social ??= import('@capgo/capacitor-social-login').then(async ({ SocialLogin }) => {
    await SocialLogin.initialize({
      apple: {},
      ...(CLOUD.googleIosClientId ? { google: { iOSClientId: CLOUD.googleIosClientId, iOSServerClientId: CLOUD.googleWebClientId, webClientId: CLOUD.googleWebClientId, mode: 'online' as const } } : {}),
    });
    return SocialLogin;
  });
  return social;
}

/** The current account, if any (a stored session is refreshed as needed). */
export async function currentUser(): Promise<CloudUser | null> {
  if (!accountsReady()) return null;
  const sb = await supabase();
  const { data } = await sb.auth.getSession();
  return data.session ? toUser(data.session.user) : null;
}

/** A guest's account in the background: kept if there is one, made if not. Never throws. */
export async function ensureGuestAccount(): Promise<CloudUser | null> {
  try {
    const now = await currentUser();
    if (now) return now;
    const sb = await supabase();
    const { data, error } = await sb.auth.signInAnonymously();
    return error || !data.user ? null : toUser(data.user);
  } catch {
    return null;
  }
}

/** Moves a guest's purchases to the account just signed in to (then the guest account is removed). */
async function adopt(guestToken: string | null) {
  if (!guestToken) return;
  const sb = await supabase();
  await sb.functions.invoke('adopt-guest', { body: { guestToken } }).catch(() => undefined);
}

async function guestToken(): Promise<string | null> {
  const sb = await supabase();
  const { data } = await sb.auth.getSession();
  return data.session?.user.is_anonymous ? data.session.access_token : null;
}

/** Signs in with Apple or Google. On the web this leaves the page (redirect) and resolves null. */
export async function signInWith(method: 'apple' | 'google'): Promise<CloudUser | null> {
  const sb = await supabase();
  const guest = await guestToken();
  if (!nativeSignIn()) {
    const { error } = await sb.auth.signInWithOAuth({ provider: method, options: { redirectTo: window.location.origin } });
    if (error) throw error;
    return null;
  }
  const SocialLogin = await socialLogin();
  const { raw, hashed } = await nonces();
  const res =
    method === 'apple'
      ? await SocialLogin.login({ provider: 'apple', options: { scopes: ['email', 'name'], nonce: hashed } })
      : await SocialLogin.login({ provider: 'google', options: { scopes: ['email', 'profile'], nonce: hashed } });
  const r = res.result as { idToken?: string | null; accessToken?: { token?: string } | null; profile?: { givenName?: string | null; familyName?: string | null; name?: string | null } };
  if (!r.idToken) throw new Error('no-id-token');
  const { data, error } = await sb.auth.signInWithIdToken({ provider: method, token: r.idToken, nonce: raw, ...(method === 'google' && r.accessToken?.token ? { access_token: r.accessToken.token } : {}) });
  if (error || !data.user) throw error ?? new Error('sign-in-failed');
  // Apple gives the name only the first time; keep it.
  const given = [r.profile?.givenName, r.profile?.familyName].filter(Boolean).join(' ') || r.profile?.name || '';
  if (given && !data.user.user_metadata?.full_name) await sb.auth.updateUser({ data: { full_name: given } }).catch(() => undefined);
  await adopt(guest);
  return { ...toUser(data.user), name: toUser(data.user).name || given.slice(0, 16) };
}

/** Sends a six-digit sign-in code to this address (the Supabase email template carries {{ .Token }}). */
export async function sendEmailCode(email: string) {
  const sb = await supabase();
  const { error } = await sb.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } });
  if (error) throw error;
}

export async function verifyEmailCode(email: string, code: string): Promise<CloudUser> {
  const sb = await supabase();
  const guest = await guestToken();
  const { data, error } = await sb.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });
  if (error || !data.user) throw error ?? new Error('sign-in-failed');
  await adopt(guest);
  return toUser(data.user);
}

export async function signOutAccount() {
  if (!accountsReady()) return;
  try {
    const sb = await supabase();
    await sb.auth.signOut();
    if (nativeSignIn()) await (await socialLogin()).logout({ provider: 'google' }).catch(() => undefined);
  } catch {
    /* signed out locally regardless */
  }
}

/** Deletes the account and everything kept for it on the server (App Store rule 5.1.1(v)). */
export async function deleteAccount() {
  const sb = await supabase();
  const { error } = await sb.functions.invoke('delete-account', { body: {} });
  if (error) throw error;
  await sb.auth.signOut().catch(() => undefined);
}

export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());
