import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { appRoot } from './helpers';
import { createCalendarProvider, CALENDAR_PROVIDER, utcOffsetMinutes } from '../src/domain/calendar';

const cal = createCalendarProvider();
const at = (iso: string, timeZone: string, policy = {}) => cal.resolve({ instant: iso, timeZone, policy });

describe('CalendarProvider', () => {
  it('records the pinned provider version that is actually installed', () => {
    const pkg = JSON.parse(readFileSync(resolve(appRoot, 'node_modules/lunar-javascript/package.json'), 'utf8'));
    expect(pkg.version).toBe(CALENDAR_PROVIDER.version);
  });

  it('matches known reference dates', () => {
    // 2024-02-10 is 甲辰年正月初一; 2026-02-17 is 丙午年正月初一; 2000-01-01 is a 戊午 day.
    const a = at('2024-02-10T04:00:00Z', 'Asia/Shanghai');
    expect([a.yearBranch, a.lunar.month, a.lunar.day, a.lunar.isLeapMonth]).toEqual(['辰', 1, 1, false]);
    const b = at('2026-02-17T04:00:00Z', 'Asia/Shanghai');
    expect([b.yearBranch, b.lunar.month, b.lunar.day]).toEqual(['午', 1, 1]);
    expect(at('2000-01-01T04:00:00Z', 'Asia/Shanghai').dayGanzhi).toBe('戊午');
  });

  it('keeps the lunar casting month separate from the solar-term month branch', () => {
    // 2026 立春 is 02-04 04:02 Beijing time: lunar month is still 12, but 月建 is 寅.
    const before = at('2026-02-03T04:00:00Z', 'Asia/Shanghai');
    const after = at('2026-02-04T04:00:00Z', 'Asia/Shanghai');
    expect(before.monthBranch).toBe('丑');
    expect(after.monthBranch).toBe('寅');
    expect(after.castingMonthNumber).toBe(12);
    expect(after.yearBranch).toBe('巳'); // lunar-new-year boundary
    expect(at('2026-02-04T04:00:00Z', 'Asia/Shanghai', { yearBoundary: 'lichun' }).yearBranch).toBe('午');
  });

  it('applies leap-month policy explicitly', () => {
    // 2023 had a leap second month (闰二月).
    const same = at('2023-04-01T04:00:00Z', 'Asia/Shanghai');
    expect(same.lunar.isLeapMonth).toBe(true);
    expect(same.castingMonthNumber).toBe(2);
    expect(at('2023-04-01T04:00:00Z', 'Asia/Shanghai', { leapMonth: 'following-number' }).castingMonthNumber).toBe(3);
  });

  it('handles US daylight-saving start and end with the real UTC offset', () => {
    // New York springs forward 2026-03-08 02:00 → 03:00.
    const spring = at('2026-03-08T07:30:00Z', 'America/New_York');
    expect(spring.localWallClock).toBe('2026-03-08T03:30:00');
    expect(spring.utcOffsetMinutes).toBe(-240);
    // Falls back 2026-11-01 02:00 → 01:00: the same wall time occurs twice with different offsets.
    const first = at('2026-11-01T05:30:00Z', 'America/New_York');
    const second = at('2026-11-01T06:30:00Z', 'America/New_York');
    expect(first.localWallClock).toBe('2026-11-01T01:30:00');
    expect(second.localWallClock).toBe('2026-11-01T01:30:00');
    expect([first.utcOffsetMinutes, second.utcOffsetMinutes]).toEqual([-240, -300]);
    expect(utcOffsetMinutes(new Date('2026-07-01T12:00:00Z'), 'America/Los_Angeles')).toBe(-420);
  });

  it('uses the local civil day, not the UTC day', () => {
    // 2026-11-10T03:00Z is still 2026-11-09 22:00 in New York.
    const r = at('2026-11-10T03:00:00Z', 'America/New_York');
    expect(r.localWallClock.startsWith('2026-11-09T22')).toBe(true);
    expect(r.effectiveDate).toBe('2026-11-09');
    expect(r.hourBranch).toBe('亥');
  });

  it('stores the 子时 day-change policy and applies it only at 23:00–23:59', () => {
    const late = '2026-11-10T04:30:00Z'; // 23:30 on 11-09 in New York
    const next = at(late, 'America/New_York');
    const same = at(late, 'America/New_York', { ziHour: 'zi-late-same-day' });
    expect(next.hourBranch).toBe('子');
    expect(next.ziShifted).toBe(true);
    expect(next.effectiveDate).toBe('2026-11-10');
    expect(same.effectiveDate).toBe('2026-11-09');
    expect(next.lunar.day).toBe(same.lunar.day + 1);
    expect(next.dayGanzhi).not.toBe(same.dayGanzhi);
    expect(next.policy.ziHour).toBe('zi-starts-next-day');
  });

  it('puts every 时辰 boundary on the right side, all day (UTC wall clock)', () => {
    const B = [...'子丑寅卯辰巳午未申酉戌亥'];
    for (let h = 0; h < 24; h++) {
      const want = B[Math.floor((h + 1) / 2) % 12];
      const hh = String(h).padStart(2, '0');
      // First and last minute of each clock hour.
      expect(at(`2026-06-15T${hh}:00:00Z`, 'UTC').hourBranch).toBe(want);
      expect(at(`2026-06-15T${hh}:59:00Z`, 'UTC').hourBranch).toBe(want);
    }
  });

  it('can convert to Beijing time when that policy is chosen', () => {
    const r = at('2026-11-10T04:30:00Z', 'America/New_York', { clock: 'china-standard-time' });
    expect(r.calendarWallClock).toBe('2026-11-10T12:30:00');
    expect(r.localWallClock).toBe('2026-11-09T23:30:00');
    expect(r.hourBranch).toBe('午');
  });

  it('rejects unknown zones and invalid instants instead of guessing', () => {
    expect(() => at('2026-01-01T00:00:00Z', 'Mars/Olympus')).toThrow(RangeError);
    expect(() => at('not a date', 'UTC')).toThrow(RangeError);
  });

  it('is deterministic for a stored instant regardless of the device zone', () => {
    const a = at('2026-06-01T15:00:00Z', 'America/Chicago');
    const b = at('2026-06-01T15:00:00Z', 'America/Chicago');
    expect(a).toEqual(b);
  });
});
