/**
 * Local-only cast history. Questions never leave the device; export is an explicit user action.
 */
import { CAST_SCHEMA, type CastRecord } from './cast';
import { safeStore, type KeyValueStore } from './storage';

const KEY = 'wengua.history.v1';
const ACTIVE_KEY = 'wengua.activeCast.v1';
const MAX = 500;

function isCastRecord(x: unknown): x is CastRecord {
  const r = x as CastRecord;
  return !!r && r.schema === CAST_SCHEMA && typeof r.castId === 'string' && Number.isInteger(r.primaryId) && Number.isInteger(r.movingLine)
    && r.movingLine >= 1 && r.movingLine <= 6 && !!r.stages?.primary && !!r.stages?.mutual && !!r.stages?.changed;
}

export function createHistory(store: KeyValueStore = safeStore('local'), session: KeyValueStore = safeStore('session')) {
  function list(): CastRecord[] {
    try {
      const raw = JSON.parse(store.getItem(KEY) || '[]');
      return Array.isArray(raw) ? raw.filter(isCastRecord) : [];
    } catch {
      return [];
    }
  }
  function write(items: CastRecord[]) {
    store.setItem(KEY, JSON.stringify(items.slice(0, MAX)));
  }
  return {
    list,
    get(castId: string): CastRecord | null {
      return list().find((r) => r.castId === castId) ?? null;
    },
    /** Saving the same cast twice keeps the original (records are immutable once frozen). */
    save(record: CastRecord) {
      const items = list();
      if (items.some((r) => r.castId === record.castId)) return;
      write([record, ...items]);
    },
    remove(castId: string) {
      write(list().filter((r) => r.castId !== castId));
      if (this.getActive()?.castId === castId) this.clearActive();
    },
    clear() {
      store.removeItem(KEY);
      this.clearActive();
    },
    exportJSON(): string {
      return JSON.stringify({ format: 'wengua-history', exportedAt: new Date().toISOString(), records: list() }, null, 2);
    },
    /** The cast whose ritual is in progress (survives reload; cleared when the user leaves). */
    setActive(castId: string, phase: string) {
      session.setItem(ACTIVE_KEY, JSON.stringify({ castId, phase }));
    },
    getActive(): { castId: string; phase: string } | null {
      try {
        const v = JSON.parse(session.getItem(ACTIVE_KEY) || 'null');
        return v && typeof v.castId === 'string' ? v : null;
      } catch {
        return null;
      }
    },
    clearActive() {
      session.removeItem(ACTIVE_KEY);
    },
  };
}

export type History = ReturnType<typeof createHistory>;
