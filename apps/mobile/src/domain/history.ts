/**
 * Local-only cast history. Questions never leave the device; export is an explicit user action.
 */
import { CAST_SCHEMA, type CastRecord } from './cast';
import { safeStore, type KeyValueStore } from './storage';

const KEY = 'wengua.history.v1';
const ACTIVE_KEY = 'wengua.activeCast.v1';

function isCastRecord(x: unknown): x is CastRecord {
  const r = x as CastRecord;
  return !!r && r.schema === CAST_SCHEMA && typeof r.castId === 'string' && Number.isInteger(r.primaryId) && Number.isInteger(r.movingLine)
    && r.movingLine >= 1 && r.movingLine <= 6 && !!r.stages?.primary && !!r.stages?.mutual && !!r.stages?.changed;
}

export function createHistory(store: KeyValueStore = safeStore('local', true), session: KeyValueStore = safeStore('session')) {
  function read(): unknown[] {
    const raw: unknown = JSON.parse(store.getItem(KEY) || '[]');
    if (!Array.isArray(raw)) throw new Error('Invalid history data');
    return raw;
  }
  function list(): CastRecord[] {
    try {
      return read().filter(isCastRecord);
    } catch {
      return [];
    }
  }
  function write(items: unknown[]) {
    store.setItem(KEY, JSON.stringify(items));
  }
  return {
    list,
    get(castId: string): CastRecord | null {
      return list().find((r) => r.castId === castId) ?? null;
    },
    /** Saving the same cast twice keeps the original (records are immutable once frozen). */
    save(record: CastRecord) {
      const items = read();
      if (items.some((r) => isCastRecord(r) && r.castId === record.castId)) return;
      write([record, ...items]);
    },
    /** The one change a saved record takes: a 「整理中」 cast given its 断语 once written (see fillJudgment). */
    fill(record: CastRecord) {
      const items = read();
      const at = items.findIndex((r) => isCastRecord(r) && r.castId === record.castId);
      const was = at >= 0 ? (items[at] as CastRecord).judgment : undefined;
      if (was?.state !== 'missing' || record.judgment?.state !== 'ready') return;
      items[at] = record;
      write(items);
    },
    remove(castId: string) {
      write(read().filter((r) => !isCastRecord(r) || r.castId !== castId));
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
