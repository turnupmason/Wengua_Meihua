import { safeStore } from './storage';

export type Lang = 'zh' | 'en';
export type Quality = 'auto' | 'high' | 'medium' | 'low' | '2d';

export interface Settings {
  lang: Lang;
  sound: boolean;
  reducedMotion: boolean;
  haptics: boolean;
  quality: Quality;
  /** Calendar boundary policies applied to new casts (each cast stores the policy it used). */
  ziHour: 'zi-starts-next-day' | 'zi-late-same-day';
  calendarClock: 'local-wallclock' | 'china-standard-time';
  /** auto: the full ritual until the first reading is done, then quick. */
  ritualMode: 'auto' | 'full' | 'quick';
}

const KEY = 'wengua.settings.v1';

function prefersReducedMotion(): boolean {
  try {
    return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  } catch {
    return false;
  }
}

function defaultLang(): Lang {
  try {
    return (globalThis.navigator?.language || '').toLowerCase().startsWith('zh') ? 'zh' : 'en';
  } catch {
    return 'en';
  }
}

export function defaultSettings(): Settings {
  return { lang: defaultLang(), sound: true, reducedMotion: prefersReducedMotion(), haptics: true, quality: 'auto', ziHour: 'zi-starts-next-day', calendarClock: 'local-wallclock', ritualMode: 'auto' };
}

export function loadSettings(): Settings {
  const base = defaultSettings();
  try {
    const saved = JSON.parse(safeStore().getItem(KEY) || '{}');
    return {
      lang: saved.lang === 'zh' || saved.lang === 'en' ? saved.lang : base.lang,
      sound: typeof saved.sound === 'boolean' ? saved.sound : base.sound,
      reducedMotion: typeof saved.reducedMotion === 'boolean' ? saved.reducedMotion : base.reducedMotion,
      haptics: typeof saved.haptics === 'boolean' ? saved.haptics : base.haptics,
      quality: ['auto', 'high', 'medium', 'low', '2d'].includes(saved.quality) ? saved.quality : base.quality,
      ziHour: saved.ziHour === 'zi-late-same-day' ? 'zi-late-same-day' : base.ziHour,
      calendarClock: saved.calendarClock === 'china-standard-time' ? 'china-standard-time' : base.calendarClock,
      ritualMode: saved.ritualMode === 'full' || saved.ritualMode === 'quick' ? saved.ritualMode : 'auto',
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
