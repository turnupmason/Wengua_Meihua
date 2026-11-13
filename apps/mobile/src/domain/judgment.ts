/**
 * The 断语 of a cast: asked once, right after casting, from the repository's product interface
 * (createProductRepository().getContent) and frozen into the record exactly as given.
 *
 * The lookup is exact: product question + 本卦 + 动爻 + the actual month branch (月令) + the
 * casting day (date conversion). A question, chart or month with no written 断语 comes back as
 * pending, and nothing stands in for it: no other question's, line's or month's text, and no
 * generic text. The app never writes, completes or rewrites a 断语.
 */
import { getCivilDay, resolveMonthSlot, seasonalStrength, type ProductRepository } from '@knowledge';
import type { CatalogQuestion } from './questionCatalog';
import { productContext } from './questionCatalog';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter' | 'earth';

/** 时令 of a month branch, as the engine's 卦气旺衰 reads it. */
export function seasonOf(monthBranch: string | null | undefined): Season | null {
  if (!monthBranch) return null;
  try {
    return (seasonalStrength('木', { monthBranch: monthBranch as never }).season as Season | undefined) ?? null;
  } catch {
    return null;
  }
}

/** One date window of the 应期参考, as shown (its event, 吉/凶 and the dates already worked out). */
export interface TimingWindow {
  event: string;
  valence: string;
  text: string;
  dates: string[];
}

/** A written 断语, as given at casting time. */
export interface ProductJudgment {
  state: 'ready';
  source: 'product';
  questionId: string;
  /** The catalog question whose 断语 this is, when the cast was for an entry (求职录用 → interview-pass). */
  contentQuestionId?: string;
  /** The chart it was written for (checked against the cast when frozen). */
  primaryId: number;
  movingLine: number;
  manuscriptVersion: string | null;
  decisionId: string | null;
  title: string;
  /** 简断 */
  short: string;
  /** 详断, as written (e.g. 「开局：…」「过程：…」「结局：…」「总断：…」). */
  paragraphs: string[];
  /** 应期参考 (shown on its own, never mixed into 详断); null when the record has none. */
  timing: { referenceNote: string; windows: TimingWindow[] } | null;
  /** 计算说明, as given (shown collapsed, through readableCalculation). */
  calculation: string[];
  /** Titles of the 《梅花易数》 sections the 断语 draws on. */
  sources: string[];
  castingDate: string;
  dayGanzhi: string;
  monthBranch: string | null;
}

export type MissingReason =
  /** No written 断语 for this exact question, chart, month and casting context. */
  | 'pending-authoring'
  /** A draft exists but has not passed its review; it is not shown. */
  | 'pending-review'
  /** The 断语 needs something this cast cannot give (e.g. a dating method for this casting method). */
  | 'requires-context'
  /** The library could not be read on this device. */
  | 'unavailable'
  /** Older records (before the formal catalog). */
  | 'unknown-question'
  | 'no-script';

export type CastJudgment = ProductJudgment | { state: 'missing'; season: Season | null; reason: MissingReason };

/** What a cast tells the product interface. */
export interface JudgmentInput {
  questionId: string;
  primaryId: number;
  movingLine: number;
  method: string;
  monthBranch: string | null;
  dayGanzhi: string | null;
  /** Local wall clock of the cast, e.g. 2026-11-11T09:30. */
  localWallClock: string | null;
  conditions?: Record<string, string>;
}

const addDays = (date: string, n: number) => {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/**
 * The civil date whose day 干支 is the cast's. Usually the local date; after 23:00, when 子时
 * starts the next day, it is the next one. The interface uses it to convert reference dates.
 */
export function castingDateOf(localWallClock: string | null, dayGanzhi: string | null): string | null {
  if (!localWallClock || !dayGanzhi) return null;
  const date = localWallClock.slice(0, 10);
  return [date, addDays(date, 1), addDays(date, -1)].find((d) => getCivilDay(d).dayGanzhi === dayGanzhi) ?? null;
}

/** 物象方位 (object + direction) is a 后天 method; the others count numbers, 先天. */
const castingMethodOf = (method: string) => (method === 'object-direction' ? 'post-heaven' : method === 'manual' ? 'manual' : 'pre-heaven');

/**
 * The 计算说明 as a reader sees it: the interface's own lines, without its bookkeeping (the
 * 判断口径 / 稿件版本 line and rule-set version ids) and with source ids (mh-117) given as the
 * section's title (《体用总诀》). Nothing else in the text changes.
 */
export function readableCalculation(lines: readonly string[], sectionTitle: (id: string) => string | null): string[] {
  return lines
    .filter((l) => !/^判断口径：/.test(l))
    .map((l) =>
      l
        .replace(/，?版本[A-Za-z0-9][A-Za-z0-9.\-]*/g, '')
        .replace(/mh-\d{3}/g, (id) => {
          const title = sectionTitle(id);
          return title ? `《${title}》` : '古籍';
        }),
    );
}

/** The four parts of a 计算说明, in reading order. */
export type CalcGroup = 'calendar' | 'chart' | 'bodyUse' | 'timing';
const CALC_ORDER: CalcGroup[] = ['calendar', 'chart', 'bodyUse', 'timing'];

/**
 * The 计算说明 in four labelled parts: 历法 (月令, 起卦日), 卦象 (本互变), 体用 (旺衰, 生克 and how
 * they weigh) and 取期 (the lines after the interface's 判断口径 line: 吉应 / 凶应 and why a step has
 * no date). Lines read as readableCalculation gives them; empty parts are left out.
 */
export function calculationGroups(lines: readonly string[], sectionTitle: (id: string) => string | null): { group: CalcGroup; lines: string[] }[] {
  const parts = new Map<CalcGroup, string[]>();
  let timing = false;
  for (const line of lines) {
    if (/^判断口径：/.test(line)) {
      timing = true;
      continue;
    }
    const group: CalcGroup = /^(月令|起卦日)：/.test(line) ? 'calendar' : /^本互变：/.test(line) ? 'chart' : timing || /^(吉应|凶应) · /.test(line) ? 'timing' : 'bodyUse';
    parts.set(group, [...(parts.get(group) ?? []), ...readableCalculation([line], sectionTitle)]);
  }
  return CALC_ORDER.filter((g) => parts.get(g)?.length).map((group) => ({ group, lines: parts.get(group)! }));
}

const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * A window's dates as a reader scans them: consecutive days joined (11月21–22日), a month named once
 * (11月14日、17日), the year only when it is not the casting year.
 */
export function windowDates(dates: readonly string[], castingDate: string | null, lang: 'zh' | 'en'): string {
  const runs: [string, string][] = [];
  for (const d of [...new Set(dates)].sort()) {
    const last = runs[runs.length - 1];
    if (last && addDays(last[1], 1) === d) last[1] = d;
    else runs.push([d, d]);
  }
  const year = castingDate?.slice(0, 4);
  let shownMonth = '';
  return runs
    .map(([a, b]) => {
      const [ay, am, ad] = [a.slice(0, 4), Number(a.slice(5, 7)), Number(a.slice(8, 10))];
      const [by, bm, bd] = [b.slice(0, 4), Number(b.slice(5, 7)), Number(b.slice(8, 10))];
      const key = a.slice(0, 7);
      const fresh = key !== shownMonth;
      shownMonth = b.slice(0, 7);
      if (lang === 'en') {
        const head = `${fresh ? `${MONTHS_EN[am - 1]} ` : ''}${ad}`;
        const tail = a === b ? '' : am === bm && ay === by ? `–${bd}` : `–${MONTHS_EN[bm - 1]} ${bd}`;
        return `${head}${tail}${ay !== year ? ` ${ay}` : ''}`;
      }
      const head = `${ay !== year && fresh ? `${ay}年` : ''}${fresh ? `${am}月` : ''}${ad}`;
      if (a === b) return `${head}日`;
      return am === bm && ay === by ? `${head}–${bd}日` : `${head}日–${by !== ay ? `${by}年` : ''}${bm}月${bd}日`;
    })
    .join(lang === 'en' ? ', ' : '、');
}

const missing = (monthBranch: string | null, reason: MissingReason): CastJudgment => ({ state: 'missing', season: seasonOf(monthBranch), reason });

/** Asks the product interface for this cast's 断语. Never throws: a failure is reported as unavailable. */
export async function judgmentFor(product: Pick<ProductRepository, 'getContent'>, question: CatalogQuestion, c: JudgmentInput): Promise<CastJudgment> {
  if (question.mode !== 'narrative') return missing(c.monthBranch, 'unknown-question');
  // An entry reads the 断语 of the catalog question it carries; none written yet, none given.
  const contentId = question.content_id === undefined ? question.question_id : question.content_id;
  if (!contentId) return missing(c.monthBranch, 'pending-authoring');
  const castingDate = castingDateOf(c.localWallClock, c.dayGanzhi);
  if (!castingDate || !c.monthBranch) return missing(c.monthBranch, 'requires-context');
  try {
    // No 旬空: the base 断语 are read as the classical method has it (no includeHistoricalInterviewVoid).
    const content = await product.getContent({
      questionId: contentId,
      context: productContext(question, c.conditions),
      primaryId: c.primaryId,
      movingLine: c.movingLine,
      monthBranch: c.monthBranch as never,
      monthOrder: resolveMonthSlot({ monthBranch: c.monthBranch as never })?.qi,
      castingDate,
      timingScale: 'day',
      timingContext: { castingMethod: castingMethodOf(c.method) as never, periodMethod: 'element-qi' },
    });
    if (!content.predictionAllowed) {
      const s = content.status;
      return missing(c.monthBranch, s === 'pending-review' || s === 'review-preview' ? 'pending-review' : s === 'requires-context' ? 'requires-context' : 'pending-authoring');
    }
    const timing = content.timingSection;
    const decision = content.decision as { id?: string } | undefined;
    return {
      state: 'ready',
      source: 'product',
      questionId: question.question_id,
      ...(contentId !== question.question_id ? { contentQuestionId: contentId } : {}),
      primaryId: c.primaryId,
      movingLine: c.movingLine,
      manuscriptVersion: content.manuscriptVersion ?? null,
      decisionId: decision?.id ?? null,
      title: content.title ?? '',
      short: content.short ?? content.paragraphs[0] ?? '',
      paragraphs: [...(content.narrativeParagraphs ?? content.paragraphs)],
      timing: timing
        ? {
            referenceNote: timing.referenceNote,
            windows: timing.windows.map((w) => ({ event: w.event, valence: w.valence, text: w.text, dates: [...w.displayedDates] })),
          }
        : null,
      calculation: [...(content.calculationExplanation?.paragraphs ?? [])],
      sources: (content.sourceSections as { title?: string }[]).map((s) => s.title ?? '').filter(Boolean),
      castingDate,
      dayGanzhi: c.dayGanzhi!,
      monthBranch: c.monthBranch,
    };
  } catch (e) {
    console.error('断语 lookup failed', e);
    return missing(c.monthBranch, 'unavailable');
  }
}
