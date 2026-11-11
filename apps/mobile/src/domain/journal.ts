/**
 * 卦册: casts the visitor chose to keep (收卦入册), with dated notes on what happened next.
 * Cast records themselves stay immutable in history; the journal only adds a bookmark and
 * notes keyed by castId. Local to the device, like history; deleted with it.
 */
import { safeStore, type KeyValueStore } from './storage';

const KEY = 'wengua.journal.v1';
const MAX_NOTE = 2000;

export interface JournalNote {
  at: string;
  text: string;
}

export interface JournalEntry {
  castId: string;
  savedAt: string;
  notes: JournalNote[];
}

function isEntry(x: unknown): x is JournalEntry {
  const e = x as JournalEntry;
  return !!e && typeof e.castId === 'string' && typeof e.savedAt === 'string' && Array.isArray(e.notes);
}

export function createJournal(store: KeyValueStore = safeStore('local'), now: () => Date = () => new Date()) {
  function all(): Record<string, JournalEntry> {
    try {
      const raw = JSON.parse(store.getItem(KEY) || '{}');
      const out: Record<string, JournalEntry> = {};
      if (raw && typeof raw === 'object') for (const [k, v] of Object.entries(raw)) if (isEntry(v) && v.castId === k) out[k] = v;
      return out;
    } catch {
      return {};
    }
  }
  function write(items: Record<string, JournalEntry>) {
    store.setItem(KEY, JSON.stringify(items));
  }
  return {
    all,
    get(castId: string): JournalEntry | null {
      return all()[castId] ?? null;
    },
    has(castId: string) {
      return !!all()[castId];
    },
    /** Keeps the cast; an optional note is added with today's time. Saving again only adds the note. */
    save(castId: string, note = ''): JournalEntry {
      const items = all();
      const at = now().toISOString();
      const e = items[castId] ?? { castId, savedAt: at, notes: [] };
      const text = note.trim().slice(0, MAX_NOTE);
      if (text) e.notes = [...e.notes, { at, text }];
      items[castId] = e;
      write(items);
      return e;
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

export type Journal = ReturnType<typeof createJournal>;

