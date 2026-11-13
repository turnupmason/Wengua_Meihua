/** Readable casting time: 乙巳年 九月 二十 · 酉时（17–19时）. */
import type { CalendarResult } from '../domain/calendar';
import type { Lang } from '../domain/settings';
export { deviceTimeZone } from '../domain/calendar';

const BRANCHES = '子丑寅卯辰巳午未申酉戌亥';

/** Clock hours covered by the n-th 时辰 (子 = 1: 23–1). */
export function hourRange(branchNumber: number): [number, number] {
  const start = (2 * (branchNumber - 1) + 23) % 24;
  return [start, (start + 2) % 24];
}

export function castTimeText(cal: CalendarResult, lang: Lang): string {
  const [a, b] = hourRange(cal.hourBranchNumber);
  const branch = cal.hourBranch || BRANCHES[cal.hourBranchNumber - 1];
  return lang === 'en' ? `${cal.lunar.label} · ${branch} hour (${a}–${b}h)` : `${cal.lunar.label.replace(/ /g, "")} · ${branch}时 ${a}–${b}点`;
}

/** Short form carved on the table: 乙巳年九月二十 酉时. */
export function castTimeShort(cal: CalendarResult): string {
  return `${cal.lunar.label.replace(/\s+/g, '')} ${cal.hourBranch}时`;
}

/** Characters the lunar calendar can print at runtime, listed so the font subset includes them. */
export const CALENDAR_GLYPHS = '甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥年月日时点正一二三四五六七八九十冬腊初廿卅闰';

/** A record's time zone, shown only when it is not the one this device is in now (cast while travelling). */
export function otherTimeZone(timeZone: string | null | undefined): string | null {
  if (!timeZone) return null;
  try {
    return timeZone === Intl.DateTimeFormat().resolvedOptions().timeZone ? null : timeZone;
  } catch {
    return timeZone;
  }
}
