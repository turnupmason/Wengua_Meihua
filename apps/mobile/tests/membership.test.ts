import { describe, expect, it } from 'vitest';
import { createMembership } from '../src/domain/membership';

function memStore() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
}
const at = (s: string) => new Date(s);

describe('membership', () => {
  it('free visitors cast once a day; members three times', () => {
    const ms = createMembership(memStore());
    const now = at('2026-11-10T09:00:00');
    expect(ms.canCast(now)).toBe(true);
    ms.recordCast('一', now);
    expect(ms.canCast(now)).toBe(false);
    expect(ms.canCast(at('2026-11-11T09:00:00'))).toBe(true);
    ms.grant('wengua.member.monthly', null, now);
    expect(ms.isMember(now)).toBe(true);
    ms.recordCast('二', now);
    ms.recordCast('三', now);
    expect(ms.castsToday(now)).toBe(3);
    expect(ms.canCast(now)).toBe(false);
  });

  it('a month runs out; a year extends from the current end', () => {
    const ms = createMembership(memStore());
    const now = at('2026-01-15T00:00:00');
    ms.grant('wengua.member.monthly', null, now);
    expect(ms.isMember(at('2026-02-20T00:00:00'))).toBe(false);
    ms.grant('wengua.member.yearly', null, now);
    expect(new Date(ms.entitlement().expiresAt!).getFullYear()).toBe(2027);
    expect(ms.entitlement().plan).toBe('yearly');
  });

  it('a single unlock opens one reading only', () => {
    const ms = createMembership(memStore());
    ms.grant('wengua.reading.single', 'cast-a');
    expect(ms.canReadFull('cast-a')).toBe(true);
    expect(ms.canReadFull('cast-b')).toBe(false);
  });

  it('counts a charged cast by its question_id, per local day', () => {
    const ms = createMembership(memStore());
    ms.recordCast('career.exam.pass', at('2026-11-01T10:00:00'));
    expect(ms.castsToday(at('2026-11-01T20:00:00'))).toBe(1);
    expect(ms.castsToday(at('2026-11-02T08:00:00'))).toBe(0);
  });
});

describe('test-store helpers', () => {
  it('reset today’s count and end a subscription without touching single unlocks', () => {
    const m = createMembership(memStore());
    const now = new Date('2026-11-11T10:00:00');
    m.grant('wengua.member.yearly', null, now);
    m.grant('wengua.reading.single', 'c1', now);
    for (let i = 0; i < 3; i++) m.recordCast(`q${i}`, now);
    expect(m.canCast(now)).toBe(false);
    m.resetToday(now);
    expect(m.castsToday(now)).toBe(0);
    expect(m.canCast(now)).toBe(true);
    m.endSubscription();
    expect(m.isMember(now)).toBe(false);
    expect(m.canReadFull('c1', now)).toBe(true);
  });
});
