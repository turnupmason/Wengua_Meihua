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
