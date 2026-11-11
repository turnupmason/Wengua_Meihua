/**
 * 梅花易数 casting methods, each taken literally from its section in the bundled text
 * (data/meihua-sections.json). Every method reduces to the engine's own primitives
 * (castByTimeParts / castByTrigramNumbers: 卦以八除, 爻以六除); this file only turns the
 * user's inputs into those numbers and records which section justified them.
 *
 * Trigram numbers are the 先天 numbers 乾1 兑2 离3 震4 巽5 坎6 艮7 坤8.
 */

export type ClassicalMethod =
  | 'classical-time'
  | 'object-count'
  | 'sound-count'
  | 'text'
  | 'zhang-chi'
  | 'chi-cun'
  | 'object-direction';

export const METHODS: ClassicalMethod[] = ['classical-time', 'object-count', 'sound-count', 'text', 'object-direction', 'chi-cun', 'zhang-chi'];

export const TRIGRAMS = ['乾', '兑', '离', '震', '巽', '坎', '艮', '坤'] as const;
export type TrigramId = (typeof TRIGRAMS)[number];
export const trigramNumber = (t: TrigramId) => TRIGRAMS.indexOf(t) + 1;

/** A few things that belong to each trigram, from 八卦万物属类（并为上卦）. */
export const TRIGRAM_EXAMPLES: Record<TrigramId, string> = {
  乾: '老人 · 官贵 · 头 · 金宝珠玉 · 圆物 · 大赤色',
  兑: '少女 · 舌 · 羊 · 毁折之物 · 带口之器',
  离: '中女 · 火 · 目 · 文书 · 有壳之物 · 红赤紫色',
  震: '长男 · 足 · 竹木 · 草木 · 乐器 · 青碧绿色',
  巽: '长女 · 股 · 鸡 · 绳 · 直物 · 香气',
  坎: '中男 · 耳 · 水 · 豕 · 鱼 · 黑色',
  艮: '少男 · 童子 · 手指 · 狗 · 山 · 土',
  坤: '老妇 · 腹 · 牛 · 土 · 方物 · 布帛 · 黄色',
};

/** 后天八卦方位 (离南坎北，震东兑西; the corners by the same figure). */
export const DIRECTIONS: { trigram: TrigramId; label: string; en: string }[] = [
  { trigram: '离', label: '南', en: 'S' },
  { trigram: '坤', label: '西南', en: 'SW' },
  { trigram: '兑', label: '西', en: 'W' },
  { trigram: '乾', label: '西北', en: 'NW' },
  { trigram: '坎', label: '北', en: 'N' },
  { trigram: '艮', label: '东北', en: 'NE' },
  { trigram: '震', label: '东', en: 'E' },
  { trigram: '巽', label: '东南', en: 'SE' },
];

export interface MethodInputs {
  /** 起卦加数例: optional surname strokes added to the year-month-day-hour numbers. */
  surnameStrokes?: number;
  /** 物数占例 / 声音占例: the counted number. */
  count?: number;
  /** 字占: the written words (normally the question itself, 书写来意). */
  text?: string;
  /** 字占 under eleven characters: upper and lower numbers by strokes or 平仄, per the rule shown. */
  textUpper?: number;
  textLower?: number;
  /** 丈尺占 (丈, 尺) or 尺寸占 (尺, 寸). */
  major?: number;
  minor?: number;
  /** 端法后天 / 为人占 / 自己占 / 占动物: the thing seen and the direction it came from. */
  objectTrigram?: TrigramId;
  directionTrigram?: TrigramId;
}

export interface TimeNumbers { yearBranchNumber: number; lunarMonth: number; lunarDay: number; hourBranchNumber: number }

export interface MethodNumbers {
  upperNumber: number;
  lowerNumber: number;
  movingTotal: number;
  sources: string[];
  inputs: Record<string, unknown>;
}

const whole = (v: unknown, name: string, min = 1, max = 99999) => {
  if (typeof v !== 'number' || !Number.isSafeInteger(v) || v < min || v > max) throw new RangeError(`${name} must be a whole number ${min}..${max}`);
  return v;
};

/** Han characters only (punctuation, spaces and Latin letters are not counted). */
export const hanCount = (text: string) => (text.match(/\p{Script=Han}/gu) || []).length;

/** How 字占 splits n characters: fewer on top (天轻清), more below (地重浊). */
export function textSplit(n: number): { upper: number; lower: number } {
  const upper = Math.floor(n / 2);
  return { upper, lower: n - upper };
}

/** The rule that applies to a short text, quoted from 一字占至十一字占. */
export function shortTextRule(n: number): string {
  if (n <= 0) return '';
  if (n === 1) return '一字：左画数为上卦，右画数为下卦，全画取爻（楷书）';
  if (n === 2) return '二字：一字为上卦，一字为下卦';
  if (n === 3) return '三字：一字为上卦，二字为下卦';
  if (n >= 11) return '';
  const { upper, lower } = textSplit(n);
  return `${n}字：前${upper}字为上卦，后${lower}字为下卦，以平仄计数（平一、上二、去三、入四）`;
}

/**
 * Numbers for every method except 年月日时 itself (which the engine computes from the time
 * parts directly unless a surname is added).
 */
export function methodNumbers(method: ClassicalMethod, x: MethodInputs, time: TimeNumbers): MethodNumbers {
  const h = time.hourBranchNumber;
  switch (method) {
    case 'classical-time': {
      // 年月日为上卦，加时为下卦，总数取爻; 起卦加数例: the surname strokes join both sums.
      const s = x.surnameStrokes ? whole(x.surnameStrokes, 'surnameStrokes', 1, 99) : 0;
      const upper = time.yearBranchNumber + time.lunarMonth + time.lunarDay + s;
      return {
        upperNumber: upper,
        lowerNumber: upper + h,
        movingTotal: upper + h,
        sources: s ? ['年月日时起例', '起卦加数例'] : ['年月日时起例'],
        inputs: { ...time, ...(s ? { surnameStrokes: s } : {}) },
      };
    }
    case 'object-count': {
      // 以此数起作上卦，以时数配作下卦，卦数并时数总除六取动爻.
      const n = whole(x.count, 'count', 1, 9999);
      return { upperNumber: n, lowerNumber: h, movingTotal: n + h, sources: ['物数占例'], inputs: { count: n, hourBranchNumber: h } };
    }
    case 'sound-count': {
      // 数得几数，起作上卦，加时数配作下卦; 动爻 by the same total.
      const n = whole(x.count, 'count', 1, 9999);
      return { upperNumber: n, lowerNumber: n + h, movingTotal: n + h, sources: ['声音占例'], inputs: { count: n, hourBranchNumber: h } };
    }
    case 'text': {
      const text = (x.text || '').trim();
      const n = hanCount(text);
      if (n === 0) throw new RangeError('字占 needs written characters');
      if (n >= 11) {
        // 十一字以上止用字数：均平则半为上卦、半为下卦，不匀则少一字为上卦；合二卦总数取爻.
        const { upper, lower } = textSplit(n);
        return { upperNumber: upper, lowerNumber: lower, movingTotal: n, sources: ['字占', '一字占至十一字占'], inputs: { characters: n, upper, lower } };
      }
      const u = whole(x.textUpper, 'textUpper', 1, 999);
      const l = whole(x.textLower, 'textLower', 1, 999);
      return { upperNumber: u, lowerNumber: l, movingTotal: u + l, sources: ['字占', '一字占至十一字占'], inputs: { characters: n, upper: u, lower: l, rule: shortTextRule(n) } };
    }
    case 'zhang-chi': {
      // 以丈数为上卦，尺数为下卦，合丈尺之数取爻，寸数不用.
      const a = whole(x.major, '丈', 1, 999);
      const b = whole(x.minor, '尺', 1, 999);
      return { upperNumber: a, lowerNumber: b, movingTotal: a + b, sources: ['丈尺占'], inputs: { zhang: a, chi: b } };
    }
    case 'chi-cun': {
      // 以尺数为上卦，寸数为下卦，合尺寸之数加时取爻，分数不用.
      const a = whole(x.major, '尺', 1, 999);
      const b = whole(x.minor, '寸', 1, 999);
      return { upperNumber: a, lowerNumber: b, movingTotal: a + b + h, sources: ['尺寸占'], inputs: { chi: a, cun: b, hourBranchNumber: h } };
    }
    case 'object-direction': {
      // 以物为上卦，方位为下卦，合物卦之数与方卦之数加时数以取动爻.
      const o = x.objectTrigram;
      const d = x.directionTrigram;
      if (!o || !TRIGRAMS.includes(o)) throw new RangeError('Choose the trigram of what was seen');
      if (!d || !TRIGRAMS.includes(d)) throw new RangeError('Choose the direction it came from');
      const on = trigramNumber(o);
      const dn = trigramNumber(d);
      return {
        upperNumber: on,
        lowerNumber: dn,
        movingTotal: on + dn + h,
        sources: ['物卦起例（端法后天起卦）', '为人占', '八卦万物属类（并为上卦）'],
        inputs: { objectTrigram: o, directionTrigram: d, hourBranchNumber: h },
      };
    }
  }
}
