/**
 * Who is visiting. Signing in goes through an AuthProvider so a real account service (phone
 * code, WeChat, Apple) can be plugged in later; the built-in provider keeps a local profile —
 * a 道号 (display name) or a guest — on this device only.
 */
import { safeStore } from './storage';
import { newCastId } from './cast';

export type SignInMethod = 'local' | 'guest' | 'phone' | 'wechat' | 'apple' | 'google' | 'email';

export interface Profile {
  id: string;
  method: SignInMethod;
  /** 道号 shown in the hall; empty for a guest. */
  name: string;
  createdAt: string;
  /** The online account (Apple, Google or email sign-in); absent for a name kept on this device. */
  userId?: string;
  email?: string | null;
}

export interface AuthProvider {
  /** Methods this provider can actually complete; the login screen shows only these. */
  methods: SignInMethod[];
  /** Resolves null when sign-in continues elsewhere (the web's Apple / Google redirect). */
  signIn(method: SignInMethod, input: { name?: string; email?: string; code?: string }): Promise<Profile | null>;
  /** Email sign-in: sends the six-digit code. */
  sendCode?(email: string): Promise<void>;
}

const KEY = 'wengua.profile.v1';

export function loadProfile(): Profile | null {
  try {
    const p = JSON.parse(safeStore().getItem(KEY) || 'null');
    return p && typeof p.id === 'string' && typeof p.method === 'string' ? (p as Profile) : null;
  } catch {
    return null;
  }
}

export function saveProfile(p: Profile) {
  safeStore().setItem(KEY, JSON.stringify(p));
}

export function clearProfile() {
  safeStore().removeItem(KEY);
}

/** Local, on-device sign-in: a 道号 or a guest. Nothing leaves the device. */
export const localAuth: AuthProvider = {
  methods: ['local', 'guest'],
  async signIn(method, { name = '' }) {
    if (method !== 'local' && method !== 'guest') throw new Error(`Sign-in method not available: ${method}`);
    const clean = name.trim().slice(0, 16);
    if (method === 'local' && !clean) throw new RangeError('A name is required');
    const p: Profile = { id: newCastId(), method, name: method === 'guest' ? '' : clean, createdAt: new Date().toISOString() };
    saveProfile(p);
    return p;
  },
};
