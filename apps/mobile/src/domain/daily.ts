/**
 * 今日一卦 and 卦册.
 *
 * 今日一卦: the hexagram of the moment the visitor first comes into the hall on a day, by the
 * classical 年月日时起例 (the same as a time cast). It asks nothing and predicts nothing: it is read
 * for its 卦辞, 象 and the moving line, as something to think on. It is not counted against the day's
 * casts and is fixed for that local day.
 *
 * 卦册: which of the sixty-four the visitor has met — in a cast (本、互、变) or as 今日一卦. Kept
 * apart from history, so deleting records does not take them away.
 */
import type { CalendarProvider, CalendarPolicy } from './calendar';
import { localDay } from './followup';
import { safeStore, type KeyValueStore } from './storage';

const DAILY_KEY = 'wengua.daily.v1';
const MET_KEY = 'wengua.met.v1';

export interface DailyHexagram {
  /** Local calendar day it belongs to (YYYY-MM-DD). */
  day: string;
  primaryId: number;
  movingLine: number;
  /** When it was taken (ISO) and the 年月日时 it was taken by, as shown. */
  at: string;
  timeLabel: string;
  /** Opened on that day (the hall stops offering it). */
  seen: boolean;
}

interface TimeCaster {
  castByTimeParts(t: { yearBranchNumber: number; lunarMonth: number; lunarDay: number; hourBranchNumber: number }): { primaryId: number; movingLine: number };
}

export function createDaily(store: KeyValueStore = safeStore('local'), now: () => Date = () => new Date()) {
  const read = (): DailyHexagram | null => {
    try {
      const d = JSON.parse(store.getItem(DAILY_KEY) || 'null');
      return d && typeof d.day === 'string' && Number.isInteger(d.primaryId) && Number.isInteger(d.movingLine) ? (d as DailyHexagram) : null;
    } catch {
      return null;
    }
  };
  return {
    /** Today's hexagram: taken on the first call of the day, the same for the rest of it. */
    today(library: TimeCaster, calendar: CalendarProvider, timeZone: string, policy?: Partial<CalendarPolicy>): DailyHexagram {
      const at = now();
      const day = localDay(at);
      const kept = read();
      if (kept?.day === day) return kept;
      const c = calendar.resolve({ instant: at, timeZone, policy });
      const cast = library.castByTimeParts({ yearBranchNumber: c.yearBranchNumber, lunarMonth: c.castingMonthNumber, lunarDay: c.lunar.day, hourBranchNumber: c.hourBranchNumber });
      const d: DailyHexagram = { day, primaryId: cast.primaryId, movingLine: cast.movingLine, at: at.toISOString(), timeLabel: `${c.lunar.label} ${c.hourBranch}时`, seen: false };
      store.setItem(DAILY_KEY, JSON.stringify(d));
      return d;
    },
    markSeen() {
      const d = read();
      if (d && !d.seen) store.setItem(DAILY_KEY, JSON.stringify({ ...d, seen: true }));
    },
  };
}

export type Daily = ReturnType<typeof createDaily>;

export interface MetEntry {
  /** First met (ISO). */
  at: string;
  via: 'cast' | 'daily';
}

export function createCollection(store: KeyValueStore = safeStore('local'), now: () => Date = () => new Date()) {
  const all = (): Record<number, MetEntry> => {
    try {
      const raw = JSON.parse(store.getItem(MET_KEY) || '{}');
      const out: Record<number, MetEntry> = {};
      if (raw && typeof raw === 'object')
        for (const [k, v] of Object.entries(raw)) {
          const id = Number(k);
          const e = v as MetEntry;
          if (Number.isInteger(id) && id >= 1 && id <= 64 && e && typeof e.at === 'string' && (e.via === 'cast' || e.via === 'daily')) out[id] = e;
        }
      return out;
    } catch {
      return {};
    }
  };
  return {
    all,
    count: () => Object.keys(all()).length,
    has: (id: number) => !!all()[id],
    /** Records these hexagrams as met; returns the ones met for the first time, in the order given. */
    meet(ids: readonly number[], via: MetEntry['via']): number[] {
      const items = all();
      const fresh: number[] = [];
      const at = now().toISOString();
      for (const id of ids) {
        if (!Number.isInteger(id) || id < 1 || id > 64 || items[id] || fresh.includes(id)) continue;
        items[id] = { at, via };
        fresh.push(id);
      }
      if (fresh.length) store.setItem(MET_KEY, JSON.stringify(items));
      return fresh;
    },
    clear: () => store.removeItem(MET_KEY),
  };
}

export type Collection = ReturnType<typeof createCollection>;
