import { safeStore } from './storage';

export type Lang = 'zh' | 'en';
export type Quality = 'auto' | 'high' | 'medium' | 'low' | '2d';

export interface Settings {
  lang: Lang;
  /** Set once someone picks a language in 设置; until then the app is in Chinese. */
  langChosen: boolean;
  sound: boolean;
  reducedMotion: boolean;
  haptics: boolean;
  quality: Quality;
  /** Calendar boundary policies applied to new casts (each cast stores the policy it used). */
  ziHour: 'zi-starts-next-day' | 'zi-late-same-day';
  calendarClock: 'local-wallclock' | 'china-standard-time';
  /** auto: the full ritual until the first reading is done, then quick. */
  ritualMode: 'auto' | 'full' | 'quick';
  /** 应期提醒: a phone notification on the evening a 应期 ends (native app only; asked for first). */
  timingReminders: boolean;
}

const KEY = 'wengua.settings.v1';

function prefersReducedMotion(): boolean {
  try {
    return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  } catch {
    return false;
  }
}

export function defaultSettings(): Settings {
  return { lang: 'zh', langChosen: false, sound: true, reducedMotion: prefersReducedMotion(), haptics: true, quality: 'auto', ziHour: 'zi-starts-next-day', calendarClock: 'local-wallclock', ritualMode: 'auto', timingReminders: false };
}

export function loadSettings(): Settings {
  const base = defaultSettings();
  try {
    const saved = JSON.parse(safeStore().getItem(KEY) || '{}');
    return {
      // The app is for Chinese readers: Chinese unless a language was picked by hand (a language saved
      // only because the device was set to it, before 2026-11-13, does not count).
      lang: saved.langChosen === true && (saved.lang === 'zh' || saved.lang === 'en') ? saved.lang : base.lang,
      langChosen: saved.langChosen === true,
      sound: typeof saved.sound === 'boolean' ? saved.sound : base.sound,
      reducedMotion: typeof saved.reducedMotion === 'boolean' ? saved.reducedMotion : base.reducedMotion,
      haptics: typeof saved.haptics === 'boolean' ? saved.haptics : base.haptics,
      quality: ['auto', 'high', 'medium', 'low', '2d'].includes(saved.quality) ? saved.quality : base.quality,
      ziHour: saved.ziHour === 'zi-late-same-day' ? 'zi-late-same-day' : base.ziHour,
      calendarClock: saved.calendarClock === 'china-standard-time' ? 'china-standard-time' : base.calendarClock,
      ritualMode: saved.ritualMode === 'full' || saved.ritualMode === 'quick' ? saved.ritualMode : 'auto',
      timingReminders: saved.timingReminders === true,
    };
  } catch {
    return base;
  }
}

/** Pace of the next cast: the full ritual until a first reading exists, then quick (unless chosen). */
export function effectivePace(mode: Settings['ritualMode'], hasReadings: boolean): 'full' | 'quick' {
  return mode === 'auto' ? (hasReadings ? 'quick' : 'full') : mode;
}

export function saveSettings(s: Settings) {
  safeStore().setItem(KEY, JSON.stringify(s));
}
