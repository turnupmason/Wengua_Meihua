import { describe, expect, it } from 'vitest';
import { createMembership } from '../src/domain/membership';

function memStore() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
}
const at = (s: string) => new Date(s);

describe('membership', () => {
  it('free visitors cast once a day; members three times', () => {
    const ms = createMembership(memStore(), { openBeta: false });
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
    const ms = createMembership(memStore(), { openBeta: false });
    const now = at('2026-01-15T00:00:00');
    ms.grant('wengua.member.monthly', null, now);
    expect(ms.isMember(at('2026-02-20T00:00:00'))).toBe(false);
    ms.grant('wengua.member.yearly', null, now);
    expect(new Date(ms.entitlement().expiresAt!).getFullYear()).toBe(2027);
    expect(ms.entitlement().plan).toBe('yearly');
  });

  it('a single unlock opens one reading only', () => {
    const ms = createMembership(memStore(), { openBeta: false });
    ms.grant('wengua.reading.single', 'cast-a');
    expect(ms.canReadFull('cast-a')).toBe(true);
    expect(ms.canReadFull('cast-b')).toBe(false);
  });

  it('counts a charged cast by its question_id, per local day', () => {
    const ms = createMembership(memStore(), { openBeta: false });
    ms.recordCast('career.exam.pass', at('2026-11-01T10:00:00'));
    expect(ms.castsToday(at('2026-11-01T20:00:00'))).toBe(1);
    expect(ms.castsToday(at('2026-11-02T08:00:00'))).toBe(0);
  });
});

describe('test-store helpers', () => {
  it('reset today’s count and end a subscription without touching single unlocks', () => {
    const m = createMembership(memStore(), { openBeta: false });
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

describe('内测 (OPEN_BETA)', () => {
  it('opens every reading and does not limit casts while the app is in testing', async () => {
    const { OPEN_BETA } = await import('../src/domain/membership');
    expect(OPEN_BETA).toBe(true);
    const m = createMembership(memStore());
    for (let i = 0; i < 5; i++) m.recordCast('career.interview');
    expect(m.canCast()).toBe(true);
    expect(m.canReadFull('any-cast')).toBe(true);
    expect(m.giftFirst('c1')).toBe(false);
  });
});

describe('reading credits (2026-11-17)', () => {
  it('a pack gives ten; each opens one reading, the same reading only once', () => {
    const m = createMembership(memStore(), { openBeta: false });
    m.grant('wengua.reading.pack10', 'c1');
    expect(m.canReadFull('c1')).toBe(true);
    expect(m.credits()).toBe(9);
    expect(m.useCredit('c1')).toBe(true);
    expect(m.credits()).toBe(9);
    expect(m.useCredit('c2')).toBe(true);
    expect(m.credits()).toBe(8);
    expect(m.canReadFull('c3')).toBe(false);
  });

  it('cannot open a reading without a credit', () => {
    const m = createMembership(memStore(), { openBeta: false });
    expect(m.useCredit('c1')).toBe(false);
    expect(m.canReadFull('c1')).toBe(false);
  });

  it('takes the server’s subscription, credits and opened readings as they are', () => {
    const m = createMembership(memStore(), { openBeta: false });
    const now = new Date('2026-11-17T10:00:00Z');
    m.applyServer({ plan: 'yearly', expiresAt: '2027-11-17T10:00:00Z', credits: 4, unlocked: ['a', 'b'] });
    expect(m.isMember(now)).toBe(true);
    expect(m.credits()).toBe(4);
    expect(m.canReadFull('b', now)).toBe(true);
    m.applyServer({ plan: 'free', expiresAt: null, credits: 0, unlocked: [] });
    expect(m.isMember(now)).toBe(false);
    // An opened reading stays opened.
    expect(m.canReadFull('a', now)).toBe(true);
  });

  it('prices are the launch prices until the App Store says its own', async () => {
    const { PRODUCTS } = await import('../src/domain/membership');
    expect(Object.fromEntries(Object.values(PRODUCTS).map((p) => [p.id, p.price.en]))).toEqual({
      'wengua.member.monthly': '$9.99 / month',
      'wengua.member.yearly': '$69.99 / year',
      'wengua.reading.single': '$0.99',
      'wengua.reading.pack10': '$4.99',
    });
  });
});
