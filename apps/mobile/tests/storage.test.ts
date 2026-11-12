/** Records are acknowledged only once written: a failed write is reported, never hidden or trimmed. */
import { describe, expect, it } from 'vitest';
import { PersistenceError, safeStore, type KeyValueStore } from '../src/domain/storage';
import { createHistory } from '../src/domain/history';
import { createJournal } from '../src/domain/journal';
import type { CastRecord } from '../src/domain/cast';
import { memoryStore } from './helpers';

const full = (): KeyValueStore => ({
  getItem: () => null,
  setItem: () => {
    throw new DOMException('quota', 'QuotaExceededError');
  },
  removeItem: () => {},
});

const rec = (castId: string) =>
  ({ schema: 'wengua.cast/1', castId, primaryId: 1, movingLine: 1, stages: { primary: {}, mutual: {}, changed: {} } }) as unknown as CastRecord;

describe('durable storage', () => {
  it('throws on a failed write when persistence is required, and keeps no phantom copy', () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: full() });
    try {
      const store = safeStore('local', true);
      expect(() => store.setItem('k', 'v')).toThrow(PersistenceError);
      expect(store.getItem('k')).toBeNull();
      // Settings and other conveniences may still fall back to memory.
      const loose = safeStore('local');
      loose.setItem('k', 'v');
      expect(loose.getItem('k')).toBeNull();
    } finally {
      if (original) Object.defineProperty(globalThis, 'localStorage', original);
    }
  });

  it('reports a history or journal write that failed instead of acting as if saved', () => {
    expect(() => createHistory(full(), memoryStore()).save(rec('a'))).toThrow();
    expect(() => createJournal(full()).save('a', '记一笔')).toThrow();
  });

  it('keeps every record: nothing beyond 500 is silently dropped', () => {
    const history = createHistory(memoryStore(), memoryStore());
    for (let i = 0; i < 520; i++) history.save(rec(`c${i}`));
    expect(history.list()).toHaveLength(520);
    expect(history.get('c0')).toBeTruthy();
  });
});
