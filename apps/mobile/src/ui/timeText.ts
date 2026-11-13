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

/**
 * When a record was cast, as a list shows it beside its title: 「今天 13:38」, 「昨天 09:05」, 「11月12日
 * 20:23」, and the year only when it is not this one. `wall` is the cast's own wall clock
 * (2026-11-13T13:38); `now` is today on this device.
 */
export function recordWhen(wall: string | null | undefined, lang: Lang, now = new Date()): string {
  if (!wall) return '';
  const [date, time = ''] = wall.split('T');
  const [y, m, d] = date.split('-').map(Number);
  const hm = time.slice(0, 5);
  const p = (n: number) => String(n).padStart(2, '0');
  const today = `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
  const yd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const yesterday = `${yd.getFullYear()}-${p(yd.getMonth() + 1)}-${p(yd.getDate())}`;
  const en = lang === 'en';
  if (date === today) return `${en ? 'Today' : '今天'} ${hm}`;
  if (date === yesterday) return `${en ? 'Yesterday' : '昨天'} ${hm}`;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const year = y === now.getFullYear() ? '' : en ? ` ${y}` : `${y}年`;
  return en ? `${months[m - 1]} ${d}${year} ${hm}` : `${year}${m}月${d}日 ${hm}`;
}

/** A record's time zone, shown only when it is not the one this device is in now (cast while travelling). */
export function otherTimeZone(timeZone: string | null | undefined): string | null {
  if (!timeZone) return null;
  try {
    return timeZone === Intl.DateTimeFormat().resolvedOptions().timeZone ? null : timeZone;
  } catch {
    return timeZone;
  }
}
