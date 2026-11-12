/** Guarded storage: private mode, blocked storage or quota errors never break the app. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class PersistenceError extends Error {
  constructor(cause?: unknown) {
    super('Could not write to device storage', { cause });
  }
}

/** Durable records require a successful write before the UI acknowledges them. */
export function safeStore(kind: 'local' | 'session' = 'local', requirePersistence = false): KeyValueStore {
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
      } catch (error) {
        if (requirePersistence) throw new PersistenceError(error);
        return memory.get(key) ?? null;
      }
    },
    setItem(key, value) {
      try {
        if (!backing && requirePersistence) throw new PersistenceError();
        backing?.setItem(key, value);
      } catch (error) {
        if (requirePersistence) throw new PersistenceError(error);
      }
      memory.set(key, value);
    },
    removeItem(key) {
      try {
        if (!backing && requirePersistence) throw new PersistenceError();
        backing?.removeItem(key);
      } catch (error) {
        if (requirePersistence) throw new PersistenceError(error);
      }
      memory.delete(key);
    },
  };
}
