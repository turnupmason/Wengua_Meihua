/**
 * CalendarProvider: turns an explicit instant + IANA time zone into the calendar facts
 * that casting and month-strength need. Every boundary choice is an explicit, stored policy.
 *
 * Library: lunar-javascript (MIT, https://github.com/6tail/lunar-javascript), pinned in package.json.
 * It computes lunar dates and solar terms for the civil date/time it is given (in China Standard Time).
 */
import { Solar } from 'lunar-javascript';

export const CALENDAR_PROVIDER = Object.freeze({
  id: 'lunar-javascript',
  version: '1.7.7',
  license: 'MIT',
  source: 'https://github.com/6tail/lunar-javascript',
  adapterVersion: '1.0.0',
});

const BRANCHES = [...'子丑寅卯辰巳午未申酉戌亥'];

export interface CalendarPolicy {
  /**
   * local-wallclock: the user's local date/time is fed to the Chinese calendar as-is (common practice abroad).
   * china-standard-time: the instant is first converted to Asia/Shanghai.
   * Neither is claimed to be "the" classical rule; the choice is stored with each cast.
   */
  clock: 'local-wallclock' | 'china-standard-time';
  /** zi-starts-next-day: 23:00–23:59 belongs to the next day (子时换日). zi-late-same-day: 晚子时 stays on the civil day. */
  ziHour: 'zi-starts-next-day' | 'zi-late-same-day';
  /** How a leap month counts in 年月日时起例. */
  leapMonth: 'same-number' | 'following-number';
  /** Year branch for casting numbers: from lunar new year (正月初一) or from 立春. */
  yearBoundary: 'lunar-new-year' | 'lichun';
  /** Month branch for strength (月建) always changes at the exact 节 solar term; kept separate from the lunar casting month. */
  monthBuild: 'solar-term-exact';
}

export const DEFAULT_CALENDAR_POLICY: Readonly<CalendarPolicy> = Object.freeze({
  clock: 'local-wallclock',
  ziHour: 'zi-starts-next-day',
  leapMonth: 'same-number',
  yearBoundary: 'lunar-new-year',
  monthBuild: 'solar-term-exact',
});

export interface WallClock {
  year: number; month: number; day: number; hour: number; minute: number; second: number;
}

export interface CalendarResult {
  provider: typeof CALENDAR_PROVIDER;
  policy: CalendarPolicy;
  instantUtc: string;
  timeZone: string;
  utcOffsetMinutes: number;
  /** The user's own local wall clock at the instant (always recorded, whatever the policy). */
  localWallClock: string;
  /** Wall clock actually fed to the calendar (local or Asia/Shanghai). */
  calendarWallClock: string;
  /** Civil date used for lunar date and day pillar after the 子时 policy. */
  effectiveDate: string;
  ziShifted: boolean;
  lunar: { year: number; month: number; isLeapMonth: boolean; day: number; label: string };
  yearBranch: string;
  yearBranchNumber: number;
  /** Lunar month number used by 年月日时起例 (after leap policy). */
  castingMonthNumber: number;
  hourBranch: string;
  hourBranchNumber: number;
  /** 月建 for strength, by exact solar term. */
  monthBranch: string;
  dayGanzhi: string;
  notes: string[];
}

const pad = (n: number, w = 2) => String(n).padStart(w, '0');
const fmt = (w: WallClock) => `${w.year}-${pad(w.month)}-${pad(w.day)}T${pad(w.hour)}:${pad(w.minute)}:${pad(w.second)}`;

/** Wall-clock parts of an instant in an IANA zone; throws RangeError for an unknown zone. */
export function wallClockAt(instant: Date, timeZone: string): WallClock {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric',
  }).formatToParts(instant);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour') % 24, minute: get('minute'), second: get('second') };
}

export function utcOffsetMinutes(instant: Date, timeZone: string): number {
  const w = wallClockAt(instant, timeZone);
  const asUtc = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second);
  return Math.round((asUtc - Math.floor(instant.getTime() / 1000) * 1000) / 60000);
}

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function addDays(w: WallClock, days: number): WallClock {
  const d = new Date(Date.UTC(w.year, w.month - 1, w.day + days, w.hour, w.minute, w.second));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), hour: d.getUTCHours(), minute: d.getUTCMinutes(), second: d.getUTCSeconds() };
}

export interface CalendarProvider {
  readonly info: typeof CALENDAR_PROVIDER;
  resolve(input: { instant: Date | string; timeZone: string; policy?: Partial<CalendarPolicy> }): CalendarResult;
}

export function createCalendarProvider(): CalendarProvider {
  return {
    info: CALENDAR_PROVIDER,
    resolve({ instant, timeZone, policy: partial }) {
      const policy: CalendarPolicy = { ...DEFAULT_CALENDAR_POLICY, ...partial };
      const at = typeof instant === 'string' ? new Date(instant) : instant;
      if (Number.isNaN(at.getTime())) throw new RangeError('A valid instant is required');
      if (!isValidTimeZone(timeZone)) throw new RangeError(`Unknown IANA time zone: ${timeZone}`);

      const local = wallClockAt(at, timeZone);
      const wall = policy.clock === 'china-standard-time' ? wallClockAt(at, 'Asia/Shanghai') : local;
      const notes: string[] = [];
      if (policy.clock === 'local-wallclock' && timeZone !== 'Asia/Shanghai') {
        notes.push('Local wall clock fed to the Chinese calendar; lunar dates and solar terms are tabulated for China Standard Time.');
      }

      // 子时 policy only moves the civil date; the hour branch is 子 either way.
      const ziShifted = policy.ziHour === 'zi-starts-next-day' && wall.hour === 23;
      const effective = ziShifted ? addDays(wall, 1) : wall;
      const effLunar = Solar.fromYmdHms(effective.year, effective.month, effective.day, ziShifted ? 0 : effective.hour, effective.minute, effective.second).getLunar();
      // Exact-moment lookups (solar terms) use the real wall time, not the shifted date.
      const exact = Solar.fromYmdHms(wall.year, wall.month, wall.day, wall.hour, wall.minute, wall.second).getLunar();

      const rawMonth: number = effLunar.getMonth();
      const isLeap = rawMonth < 0;
      let castingMonthNumber = Math.abs(rawMonth);
      if (isLeap && policy.leapMonth === 'following-number') {
        if (castingMonthNumber === 12) throw new RangeError('Leap 12th month cannot be counted as month 13 for casting; choose the same-number policy');
        castingMonthNumber += 1;
      }
      if (isLeap) notes.push(`Leap month counted as ${castingMonthNumber} (${policy.leapMonth}).`);

      const yearBranch: string = policy.yearBoundary === 'lichun' ? exact.getYearZhiExact() : effLunar.getYearZhi();
      const hourBranch: string = exact.getTimeZhi();
      const monthBranch: string = exact.getMonthZhiExact();
      const dayGanzhi: string = effLunar.getDayInGanZhi();
      if (ziShifted) notes.push('23:00–23:59 counted as the next day (子时换日).');

      return Object.freeze({
        provider: CALENDAR_PROVIDER,
        policy,
        instantUtc: at.toISOString(),
        timeZone,
        utcOffsetMinutes: utcOffsetMinutes(at, timeZone),
        localWallClock: fmt(local),
        calendarWallClock: fmt(wall),
        effectiveDate: `${effective.year}-${pad(effective.month)}-${pad(effective.day)}`,
        ziShifted,
        lunar: {
          year: effLunar.getYear(), month: Math.abs(rawMonth), isLeapMonth: isLeap, day: effLunar.getDay(),
          label: `${effLunar.getYearInGanZhi()}年 ${isLeap ? '闰' : ''}${effLunar.getMonthInChinese()}月 ${effLunar.getDayInChinese()}`,
        },
        yearBranch,
        yearBranchNumber: BRANCHES.indexOf(yearBranch) + 1,
        castingMonthNumber,
        hourBranch,
        hourBranchNumber: BRANCHES.indexOf(hourBranch) + 1,
        monthBranch,
        dayGanzhi,
        notes,
      });
    },
  };
}

export function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}
