/** Guarded storage: private mode, blocked storage or quota errors never break the app. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function safeStore(kind: 'local' | 'session' = 'local'): KeyValueStore {
  let backing: Storage | null = null;
  try {
    backing = kind === 'local' ? globalThis.localStorage : globalThis.sessionStorage;
  } catch {
    backing = null;
  }
  const memory = new Map<string, string>();
  return {
    getItem(key) {
      try {
        return backing ? backing.getItem(key) : memory.get(key) ?? null;
      } catch {
        return memory.get(key) ?? null;
      }
    },
    setItem(key, value) {
      memory.set(key, value);
      try {
        backing?.setItem(key, value);
      } catch {
        /* keep the in-memory copy */
      }
    },
    removeItem(key) {
      memory.delete(key);
      try {
        backing?.removeItem(key);
      } catch {
        /* ignore */
      }
    },
  };
}
