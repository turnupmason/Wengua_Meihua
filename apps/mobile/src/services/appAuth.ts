/**
 * The sign-in the app uses: the ways kept on this device (a 道号, or as a guest) and, when accounts
 * are configured, 通过 Apple 登录, Google and an email code. A guest or a 道号 also gets an anonymous
 * account in the background (for purchases).
 */
import { localAuth, saveProfile, type AuthProvider, type Profile, type SignInMethod } from '../domain/profile';
import { accountsReady } from './cloud';
import { currentUser, ensureGuestAccount, sendEmailCode, signInWith, verifyEmailCode, type CloudUser } from './accounts';

const profileOf = (u: CloudUser, method: SignInMethod): Profile => ({
  id: u.id,
  method,
  name: u.name || (u.email ? u.email.split('@')[0].slice(0, 16) : ''),
  createdAt: new Date().toISOString(),
  userId: u.id,
  email: u.email,
});

export function createAppAuth(): AuthProvider {
  const online = accountsReady();
  return {
    methods: online ? ['apple', 'google', 'email', 'local', 'guest'] : localAuth.methods,
    async signIn(method, input) {
      if (method === 'local' || method === 'guest') {
        const p = await localAuth.signIn(method, input);
        if (online) void ensureGuestAccount();
        return p;
      }
      if (!online) throw new Error(`Sign-in method not available: ${method}`);
      const user =
        method === 'apple' || method === 'google'
          ? await signInWith(method)
          : method === 'email'
            ? await verifyEmailCode(input.email ?? '', input.code ?? '')
            : null;
      if (!user) return null;
      const p = profileOf(user, method);
      saveProfile(p);
      return p;
    },
    sendCode: online ? (email) => sendEmailCode(email) : undefined,
  };
}

/**
 * After the web's Apple / Google redirect the session is there but no profile was saved: make it.
 * Null when there is no real (non-guest) account.
 */
export async function profileFromSession(): Promise<Profile | null> {
  if (!accountsReady()) return null;
  try {
    const u = await currentUser();
    if (!u || u.anonymous) return null;
    const p = profileOf(u, u.provider === 'apple' || u.provider === 'google' ? u.provider : 'email');
    saveProfile(p);
    return p;
  } catch {
    return null;
  }
}
