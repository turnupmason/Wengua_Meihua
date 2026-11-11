import { describe, expect, it } from 'vitest';
import { ritualReducer, INITIAL_RITUAL, type RitualState } from '../src/domain/ritual';

const step = (s: RitualState, ...events: Parameters<typeof ritualReducer>[1][]) => events.reduce(ritualReducer, s);

describe('ritual state machine', () => {
  it('runs idle → entering → revealing → reading, with the cast frozen on entry', () => {
    let s = step(INITIAL_RITUAL, { type: 'BEGIN', castId: 'c1' });
    expect(s).toMatchObject({ phase: 'entering', castId: 'c1' });
    s = step(s, { type: 'PHASE_DONE', phase: 'entering' });
    expect(s.phase).toBe('revealing');
    s = step(s, { type: 'PHASE_DONE', phase: 'revealing' });
    expect(s.phase).toBe('reading');
  });

  it('ignores duplicate and stale events (idempotent)', () => {
    const s = step(INITIAL_RITUAL, { type: 'BEGIN', castId: 'a' }, { type: 'BEGIN', castId: 'b' });
    expect(s).toMatchObject({ phase: 'entering', castId: 'a' });
    expect(step(s, { type: 'PHASE_DONE', phase: 'revealing' })).toBe(s);
    const r = step(s, { type: 'PHASE_DONE', phase: 'entering' }, { type: 'PHASE_DONE', phase: 'entering' });
    expect(r.phase).toBe('revealing');
  });

  it('cannot advance without a frozen cast', () => {
    const s: RitualState = { phase: 'entering', castId: null, skipped: false };
    expect(step(s, { type: 'PHASE_DONE', phase: 'entering' })).toBe(s);
  });

  it('skip keeps the existing cast id', () => {
    const s = step(INITIAL_RITUAL, { type: 'BEGIN', castId: 'orig' }, { type: 'SKIP', castId: 'new' });
    expect(s).toMatchObject({ phase: 'reading', castId: 'orig', skipped: true });
    expect(step(s, { type: 'SKIP', castId: 'x' })).toBe(s);
  });

  it('resume restores the same cast and refuses a different one', () => {
    const r = step(INITIAL_RITUAL, { type: 'RESUME', castId: 'c9', phase: 'entering' });
    expect(r).toMatchObject({ phase: 'entering', castId: 'c9' });
    expect(step(r, { type: 'RESUME', castId: 'other', phase: 'reading' })).toBe(r);
    expect(step(r, { type: 'RESET' })).toEqual(INITIAL_RITUAL);
  });

  it('a cast saved mid-incense by an older version resumes at the bestowal', () => {
    for (const old of ['awaiting', 'kneeling', 'incense', 'planting', 'bowing']) {
      expect(step(INITIAL_RITUAL, { type: 'RESUME', castId: 'c', phase: old }).phase).toBe('revealing');
    }
  });
});
