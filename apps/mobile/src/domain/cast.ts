/**
 * Casting and freezing. A cast is computed once, deep-frozen, saved, and then only re-read.
 * Skipping the ritual, replaying it, or resuming from background always uses the same record.
 */
import type { Library, Reading } from '../knowledge/knowledge';
import { outcomeFor } from './topics';
import { CATALOG_VERSION, questionById, questionWording } from './questionCatalog';
import { seasonOf, type CastJudgment, type JudgmentInput, type Season } from './judgment';
import { createCalendarProvider, type CalendarPolicy, type CalendarProvider, type CalendarResult } from './calendar';
import { methodNumbers, type ClassicalMethod, type MethodInputs } from './methods';

export const CAST_SCHEMA = 'wengua.cast/1';
export const APP_VERSION = '0.1.0';

export type CastMethod = ClassicalMethod | 'manual';
export type MutualPolicy = 'inner-lines' | 'pure-use-changed';

export interface CastRequest {
  method: CastMethod;
  /** Text shown for the question (for a catalog question, its wording as shown at casting time). */
  question?: string;
  /** The fixed question chosen by tapping (QuestionCatalog). Required for every visitor cast. */
  questionId?: string;
  /** Answers to the question's fixed-option conditions, if it has any. */
  conditions?: Record<string, string>;
  domainId?: string;
  /** Which of the six 问事 domains it was asked under ('pro' = a classical category). */
  topicId?: string;
  /** The matter this belongs to (a new id when omitted). */
  eventId?: string;
  /** Explicit instant of casting (ISO string or Date). Never inferred inside the engine. */
  instant: Date | string;
  timeZone: string;
  calendarPolicy?: Partial<CalendarPolicy>;
  mutualPolicy?: MutualPolicy;
  /** 物数占例: the counted number (kept for older callers; same as inputs.count). */
  objectCount?: number;
  /** Inputs for the chosen classical method (see methods.ts). */
  inputs?: MethodInputs;
  /** True when the user chose the moment (e.g. 屋宅初创、器物初成之时) instead of now. */
  customInstant?: boolean;
  /** Manual debug mode: explicit hexagram and line, plus optional explicit context. */
  manual?: { primaryId: number; movingLine: number; monthBranch?: string; dayGanzhi?: string };
}

export type { CastJudgment };

export interface StageSnapshot { id: number; name: string; displayGrade: string; canonicalGrade: string }

/**
 * The reading exactly as it was given at casting time. Later rule or content updates never
 * rewrite it; follow-up notes are kept apart (journal.ts). Evidence ids point at the passages used.
 */
export interface ReadingSnapshot {
  ruleId: string;
  /** Plain conclusion, e.g. 「先难后易」 / 「以不顺为主」. Empty for 天时 (read by images). */
  headline: string;
  leadText: string;
  summary: string;
  /** The one-line answer to the question, as shown. */
  conclusion: string;
  verdictCode: string | null;
  stoneLine: string;
  stages: { stage: string; scope: string; label: string; evidence: string }[];
  evidence: string[];
  /** Version of the written 断语 given at casting (null when none was given). */
  judgmentVersion: string | null;
}

export interface CastRecord {
  schema: typeof CAST_SCHEMA;
  castId: string;
  createdAt: string;
  timeZone: string;
  utcOffsetMinutes: number | null;
  localWallClock: string | null;
  question: string;
  domainId: string;
  /**
   * Fixed question (absent on older records, whose free-written question is kept as written and
   * never matched to a catalog question: see recordKind).
   */
  questionId?: string;
  subtypeId?: string;
  catalogVersion?: string;
  conditions?: Record<string, string>;
  /** 时令 of the casting month (from the actual casting time). */
  season?: Season | null;
  /** The 断语 given at casting time, frozen as given (catalog questions only; see withJudgment). */
  judgment?: CastJudgment;
  /** Six-domain choice at casting time (absent on older records). */
  topicId?: string;
  /** Which real-world matter this is; casts about the same matter share it (absent on older records). */
  eventId?: string;
  method: CastMethod;
  methodSources: string[];
  rawInputs: Record<string, unknown>;
  calendar: CalendarResult | null;
  /** Context actually passed to createReading. Missing values stay missing (shown as 待提供). */
  context: { monthBranch: string | null; dayGanzhi: string | null; voidBasis: 'day-ganzhi' | 'explicit' | null };
  primaryId: number;
  movingLine: number;
  mutualPolicy: MutualPolicy;
  stages: { primary: StageSnapshot; mutual: StageSnapshot; changed: StageSnapshot };
  body: { trigram: string; element: string; side: string };
  use: { trigram: string; element: string; side: string };
  contentVersion: string;
  ruleProfile: { id: string; version: string };
  appVersion: string;
  /** The casting moment was chosen by the user rather than taken as now. */
  customInstant?: boolean;
  /** The reading as given (absent on records made before 2026-11-11). */
  snapshot?: ReadingSnapshot;
}

const BRANCH_SET = new Set([...'子丑寅卯辰巳午未申酉戌亥']);
const KNOWN = new Set<string>(['classical-time', 'object-count', 'sound-count', 'text', 'zhang-chi', 'chi-cun', 'object-direction']);

function deepFreeze<T>(x: T): T {
  if (x && typeof x === 'object' && !Object.isFrozen(x)) {
    Object.freeze(x);
    for (const v of Object.values(x as Record<string, unknown>)) deepFreeze(v);
  }
  return x;
}

export function newCastId(): string {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  const bytes = new Uint8Array(16);
  if (c?.getRandomValues) c.getRandomValues(bytes);
  else for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function readingFromCast(library: Library, record: CastRecord): Readonly<Reading> {
  return library.createReading({
    primaryId: record.primaryId,
    movingLine: record.movingLine,
    domainId: record.domainId,
    calendar: record.context.monthBranch ? { monthBranch: record.context.monthBranch as never } : {},
    applyVoid: record.ruleProfile.id !== 'classical-body-use',
    voidContext: record.context.dayGanzhi ? { ganzhi: record.context.dayGanzhi } : {},
    mutualPolicy: record.mutualPolicy,
    question: record.question,
    castId: record.castId,
  });
}

/** Compares a saved snapshot with what the current engine computes for the same inputs. */
export function snapshotDrift(record: CastRecord, reading: Reading): string[] {
  const drift: string[] = [];
  for (const s of ['primary', 'mutual', 'changed'] as const) {
    if (reading.stages[s].id !== record.stages[s].id) drift.push(`${s}-id`);
    if (reading.stages[s].baseGrade !== record.stages[s].displayGrade) drift.push(`${s}-grade`);
  }
  if (reading.body.trigram !== record.body.trigram) drift.push('body');
  return drift;
}

export function freezeCast(
  library: Library,
  request: CastRequest,
  { calendarProvider = createCalendarProvider(), castId = newCastId(), now = new Date() }: { calendarProvider?: CalendarProvider; castId?: string; now?: Date } = {},
): Readonly<CastRecord> {
  const cq = questionById(request.questionId);
  if (request.questionId && !cq) throw new RangeError(`Unknown question: ${request.questionId}`);
  if (cq && !cq.enabled) throw new RangeError(`Question not open: ${cq.question_id}`);
  // Reference and guidance questions are read, not cast.
  if (cq && cq.mode !== 'narrative') throw new RangeError(`Question is read, not cast: ${cq.question_id}`);
  // A catalog question decides its own classical category and domain.
  const domainId = cq?.classical_domain_id || request.domainId || 'domain-02';
  const topicId = cq?.domain_id ?? request.topicId;
  const mutualPolicy = request.mutualPolicy || 'inner-lines';
  const instant = typeof request.instant === 'string' ? new Date(request.instant) : request.instant;
  if (Number.isNaN(instant.getTime())) throw new RangeError('A valid casting instant is required');

  let calendar: CalendarResult | null = null;
  let primaryId: number;
  let movingLine: number;
  let methodSources: string[];
  let rawInputs: Record<string, unknown>;
  let context: CastRecord['context'];

  if (request.method === 'manual') {
    const m = request.manual;
    if (!m) throw new TypeError('Manual cast requires primaryId and movingLine');
    if (m.monthBranch && !BRANCH_SET.has(m.monthBranch)) throw new RangeError('Invalid month branch');
    primaryId = m.primaryId;
    movingLine = m.movingLine;
    methodSources = ['manual-debug (not a classical casting method)'];
    rawInputs = { ...m };
    context = { monthBranch: m.monthBranch || null, dayGanzhi: m.dayGanzhi || null, voidBasis: m.dayGanzhi ? 'explicit' : null };
  } else {
    calendar = calendarProvider.resolve({ instant, timeZone: request.timeZone, policy: request.calendarPolicy });
    context = { monthBranch: calendar.monthBranch, dayGanzhi: calendar.dayGanzhi, voidBasis: 'day-ganzhi' };
    const time = { yearBranchNumber: calendar.yearBranchNumber, lunarMonth: calendar.castingMonthNumber, lunarDay: calendar.lunar.day, hourBranchNumber: calendar.hourBranchNumber };
    const inputs: MethodInputs = { ...request.inputs, ...(request.objectCount !== undefined && request.inputs?.count === undefined ? { count: request.objectCount } : {}) };
    if (request.method === 'classical-time' && !inputs.surnameStrokes) {
      const cast = library.castByTimeParts(time);
      primaryId = cast.primaryId;
      movingLine = cast.movingLine;
      methodSources = [...cast.sourceSectionTitles, '卦以八除', '爻以六除'];
      rawInputs = { ...time, upperNumber: cast.upperNumber, lowerNumber: cast.lowerNumber };
    } else if (KNOWN.has(request.method)) {
      const n = methodNumbers(request.method as ClassicalMethod, inputs, time);
      const cast = library.castByTrigramNumbers({ upperNumber: n.upperNumber, lowerNumber: n.lowerNumber, movingTotal: n.movingTotal });
      primaryId = cast.primaryId;
      movingLine = cast.movingLine;
      methodSources = [...n.sources, ...cast.sourceSectionTitles];
      rawInputs = { ...n.inputs, upperNumber: n.upperNumber, lowerNumber: n.lowerNumber, movingTotal: n.movingTotal };
    } else {
      throw new RangeError(`Unknown casting method: ${String(request.method)}`);
    }
  }

  context = { ...context, voidBasis: null };
  const reading = library.createReading({
    primaryId, movingLine, domainId, mutualPolicy, applyVoid: false,
    calendar: context.monthBranch ? { monthBranch: context.monthBranch as never } : {},
  });
  const snap = (s: 'primary' | 'mutual' | 'changed'): StageSnapshot => ({
    id: reading.stages[s].id,
    name: reading.stages[s].name,
    displayGrade: reading.stages[s].detail.grade.rawGrade,
    canonicalGrade: reading.stages[s].detail.grade.canonicalGrade,
  });
  const profile = reading.profile as { id?: string; version?: string };
  const question = (request.question || (cq ? questionWording(cq, request.conditions, 'zh') : '')).slice(0, 500);
  const season = seasonOf(context.monthBranch);
  const snapshot = snapshotOf(reading, question, topicId, domainId, cq?.question_id);

  return deepFreeze({
    schema: CAST_SCHEMA,
    castId,
    createdAt: now.toISOString(),
    timeZone: request.timeZone,
    utcOffsetMinutes: calendar?.utcOffsetMinutes ?? null,
    localWallClock: calendar?.localWallClock ?? null,
    question,
    domainId,
    ...(cq
      ? {
          questionId: cq.question_id,
          subtypeId: cq.subtype_id,
          catalogVersion: CATALOG_VERSION,
          ...(request.conditions && Object.keys(request.conditions).length ? { conditions: { ...request.conditions } } : {}),
        }
      : {}),
    season,
    ...(topicId ? { topicId } : {}),
    eventId: request.eventId || newCastId(),
    method: request.method,
    methodSources,
    rawInputs,
    calendar,
    context,
    primaryId,
    movingLine,
    mutualPolicy,
    stages: { primary: snap('primary'), mutual: snap('mutual'), changed: snap('changed') },
    body: { ...reading.body },
    use: { ...reading.use },
    contentVersion: library.contentVersion,
    ruleProfile: { id: String(profile.id), version: String(profile.version) },
    appVersion: APP_VERSION,
    ...(request.customInstant ? { customInstant: true } : {}),
    snapshot,
  } satisfies CastRecord);
}

/** What a frozen cast tells the 断语 lookup (judgmentFor). */
export const judgmentInput = (r: CastRecord): JudgmentInput | null =>
  r.questionId
    ? { questionId: r.questionId, primaryId: r.primaryId, movingLine: r.movingLine, method: r.method, monthBranch: r.context.monthBranch, dayGanzhi: r.context.dayGanzhi, localWallClock: r.localWallClock, conditions: r.conditions }
    : null;

/**
 * The cast with the 断语 it was given, frozen together. Called once, right after casting and
 * before the record is saved; a record that already has its 断语 is never given another.
 */
export function withJudgment(record: Readonly<CastRecord>, judgment: CastJudgment): Readonly<CastRecord> {
  if (!record.questionId) throw new TypeError('Only a catalog question is given a 断语');
  if (record.judgment) throw new Error('This cast already has its 断语');
  if (judgment.state === 'ready' && (judgment.questionId !== record.questionId || judgment.primaryId !== record.primaryId || judgment.movingLine !== record.movingLine))
    throw new Error('This 断语 was written for another question or chart');
  const judgmentVersion = judgment.state === 'ready' ? `${judgment.manuscriptVersion ?? '-'}#${judgment.decisionId ?? '-'}` : null;
  const snapshot = record.snapshot ? { ...record.snapshot, judgmentVersion } : undefined;
  return deepFreeze({ ...structuredClone(record), judgment: structuredClone(judgment), ...(snapshot ? { snapshot } : {}) } as CastRecord);
}

/**
 * A cast made while its 断语 was still being written (「整理中」) is given the 断语 once it exists,
 * read for the original cast (same chart, month and casting day). Nothing else about the record
 * changes, and a record that already has a 断语 is never rewritten.
 */
export function fillJudgment(record: Readonly<CastRecord>, judgment: CastJudgment): Readonly<CastRecord> {
  const was = record.judgment;
  if (was?.state !== 'missing' || (was.reason !== 'pending-authoring' && was.reason !== 'pending-review'))
    throw new Error('Only a 断语 still being written is filled in later');
  if (judgment.state !== 'ready') throw new Error('Only a written 断语 fills a record');
  const { judgment: _was, ...rest } = record;
  return withJudgment(rest as CastRecord, judgment);
}

/** Freezes what the reading says now, in Chinese (the language of the record). */
export function snapshotOf(reading: Reading, question: string, topicId: string | undefined, domainId: string, questionId?: string): ReadingSnapshot {
  const y = reading.synthesis;
  const evidence = [`line:${reading.primaryId}:${reading.movingLine}`, ...(reading.domainPassage ? [`domain:${reading.domain.id}:${reading.domainPassage.sectionId}`] : []), ...y.sourceSectionTitles.map((t) => `section:${t}`)];
  if (!y.applicable) {
    const w = y.weather;
    return { ruleId: y.ruleId, headline: w.headline, leadText: '', summary: w.summary, conclusion: w.headline, verdictCode: null, stoneLine: w.stoneLine, stages: w.stages.map((s) => ({ stage: s.stage, scope: s.stage, label: s.images.join('·'), evidence: s.phrase })), evidence, judgmentVersion: null };
  }
  return {
    ruleId: y.ruleId,
    headline: y.headline,
    leadText: y.leadText,
    summary: y.summary,
    conclusion: conclusionOf(y, question, topicId, domainId, questionId),
    verdictCode: y.verdict.code,
    stoneLine: y.stoneLine,
    stages: y.stages.map((s) => ({ stage: s.stage, scope: s.scope, label: s.main.stageLabel, evidence: s.evidence })),
    evidence,
    judgmentVersion: null,
  };
}

/**
 * The 体用 sentence. For a question of the formal catalog it is the structure alone (开局…，过程…；
 * 结局…), never an answer to the question: only the written 断语 answers it.
 */
function conclusionOf(y: Extract<Reading['synthesis'], { applicable: true }>, question: string, topicId: string | undefined, domainId: string, questionId?: string) {
  const outcome = outcomeFor(question, topicId, domainId, 'zh', questionId);
  return outcome ? y.verdict.template.replace('{outcome}', outcome) : y.summary;
}

/** A record made from a fixed question, or an older one whose question was written freely. */
export const recordKind = (r: Pick<CastRecord, 'questionId'>): 'catalog' | 'legacy-free-text' => (r.questionId ? 'catalog' : 'legacy-free-text');

/** Only a cast given an approved 断语 counts toward today's readings. */
export const chargesToday = (r: Pick<CastRecord, 'judgment' | 'questionId'>) => !!r.questionId && r.judgment?.state === 'ready';
