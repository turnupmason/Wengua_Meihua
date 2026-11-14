/**
 * 应期回访: a written 断语 names dates (应期) for what it says will happen. When those days come, the
 * visitor is asked whether it happened, and the answer is kept beside the reading, so a record shows
 * what the hexagram said then and what happened later. Misses are kept as plainly as hits.
 *
 * The cast record itself stays frozen; answers live here, keyed by castId and the window's place in
 * the 应期参考. Local to the device, like history; deleted with it.
 */
import type { CastRecord } from './cast';
import { safeStore, type KeyValueStore } from './storage';

const KEY = 'wengua.followup.v1';
/** After this many days past a window, it is no longer asked about (it stays answerable in 问事录). */
export const ASK_FOR_DAYS = 30;
/** The evening of a window's last day, when the day's news is in. */
export const REMIND_HOUR = 20;

/** 应了 / 没应 / 说不准 */
export type Outcome = 'happened' | 'not' | 'unsure';
export const OUTCOMES: readonly Outcome[] = ['happened', 'not', 'unsure'];

export interface Answer {
  outcome: Outcome;
  /** When it was recorded (ISO). */
  at: string;
}

/** One dated window of a record's 应期参考. */
export interface TimingRef {
  castId: string;
  /** Its place in the record's 应期参考. */
  index: number;
  event: string;
  valence: string;
  text: string;
  dates: string[];
  first: string;
  last: string;
}

interface Entry {
  answers: Record<string, Answer>;
  /** 稍后再说: not asked again on this local day. */
  laterOn?: string;
}

const pad = (n: number) => String(n).padStart(2, '0');
/** The device's local calendar day, as YYYY-MM-DD. */
export const localDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 864e5);

/** A record's dated windows (none for a record without a written 断语 or without 应期). */
export function timingOf(r: Pick<CastRecord, 'castId' | 'judgment'>): TimingRef[] {
  const j = r.judgment;
  if (j?.state !== 'ready' || !j.timing) return [];
  return j.timing.windows.flatMap((w, index) => {
    const dates = [...new Set(w.dates.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)))].sort();
    if (!dates.length) return [];
    return [{ castId: r.castId, index, event: w.event, valence: w.valence, text: w.text, dates, first: dates[0], last: dates[dates.length - 1] }];
  });
}

/** When to remind about a window: its last day, in the evening, device time. */
export function reminderAt(w: Pick<TimingRef, 'last'>): Date {
  const [y, m, d] = w.last.split('-').map(Number);
  return new Date(y, m - 1, d, REMIND_HOUR, 0, 0);
}

/** Whether a window's days have begun (only then is 应了/没应 asked). */
export const hasBegun = (w: Pick<TimingRef, 'first'>, today: string) => w.first <= today;

/** Whether a window is to be asked about now: begun, and not more than ASK_FOR_DAYS past. */
export const isAsking = (w: Pick<TimingRef, 'first' | 'last'>, today: string) => hasBegun(w, today) && daysBetween(w.last, today) <= ASK_FOR_DAYS;

function isEntry(x: unknown): x is Entry {
  const e = x as Entry;
  return !!e && typeof e === 'object' && !!e.answers && typeof e.answers === 'object';
}

export function createFollowups(store: KeyValueStore = safeStore('local', true), now: () => Date = () => new Date()) {
  function all(): Record<string, Entry> {
    try {
      const raw = JSON.parse(store.getItem(KEY) || '{}');
      const out: Record<string, Entry> = {};
      if (raw && typeof raw === 'object')
        for (const [k, v] of Object.entries(raw)) {
          if (!isEntry(v)) continue;
          const answers: Record<string, Answer> = {};
          for (const [i, a] of Object.entries(v.answers))
            if (a && OUTCOMES.includes((a as Answer).outcome) && typeof (a as Answer).at === 'string') answers[i] = a as Answer;
          out[k] = { answers, ...(typeof v.laterOn === 'string' ? { laterOn: v.laterOn } : {}) };
        }
      return out;
    } catch {
      return {};
    }
  }
  const write = (items: Record<string, Entry>) => store.setItem(KEY, JSON.stringify(items));

  return {
    answerOf(castId: string, index: number): Answer | null {
      return all()[castId]?.answers[String(index)] ?? null;
    },
    answers(castId: string): Record<string, Answer> {
      return all()[castId]?.answers ?? {};
    },
    /** Records (or, with null, clears) what happened for one window. */
    answer(castId: string, index: number, outcome: Outcome | null) {
      const items = all();
      const e = items[castId] ?? { answers: {} };
      if (outcome) e.answers[String(index)] = { outcome, at: now().toISOString() };
      else delete e.answers[String(index)];
      items[castId] = e;
      write(items);
    },
    /** 稍后再说: this cast is not asked about again today. */
    later(castId: string) {
      const items = all();
      items[castId] = { ...(items[castId] ?? { answers: {} }), laterOn: localDay(now()) };
      write(items);
    },
    /**
     * Windows to ask about now, the most recent first: begun, not answered, not put off today, and
     * not older than ASK_FOR_DAYS.
     */
    due(records: readonly CastRecord[]): TimingRef[] {
      const today = localDay(now());
      const items = all();
      return records
        .flatMap(timingOf)
        .filter((w) => isAsking(w, today) && !items[w.castId]?.answers[String(w.index)] && items[w.castId]?.laterOn !== today)
        .sort((a, b) => (a.last === b.last ? a.index - b.index : a.last < b.last ? 1 : -1));
    },
    /** What the visitor has recorded so far, across the records still kept. */
    tally(records: readonly CastRecord[]): Record<Outcome, number> {
      const items = all();
      const out: Record<Outcome, number> = { happened: 0, not: 0, unsure: 0 };
      for (const w of records.flatMap(timingOf)) {
        const a = items[w.castId]?.answers[String(w.index)];
        if (a) out[a.outcome]++;
      }
      return out;
    },
    remove(castId: string) {
      const items = all();
      delete items[castId];
      write(items);
    },
    clear() {
      store.removeItem(KEY);
    },
  };
}

export type Followups = ReturnType<typeof createFollowups>;

/** Reminders still to come: windows not yet answered whose evening reminder is in the future. */
export function upcomingReminders(records: readonly CastRecord[], followups: Followups, now: Date): (TimingRef & { at: Date })[] {
  return records
    .flatMap(timingOf)
    .filter((w) => !followups.answerOf(w.castId, w.index))
    .map((w) => ({ ...w, at: reminderAt(w) }))
    .filter((w) => w.at.getTime() > now.getTime())
    .sort((a, b) => a.at.getTime() - b.at.getTime());
}
