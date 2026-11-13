/**
 * QuestionCatalog: every question a visitor can ask, chosen by tapping. It is the repository's
 * formal product catalog (data/product-categories.json: six categories, 31 subcategories,
 * 82 questions), read as-is; this file only adds what the catalog does not carry (English labels,
 * the names of fixed options, cautions; see product-catalog.labels.json). Nothing is typed in.
 *
 * Each question keeps its catalog id; casts, the 断语 lookup (createProductRepository) and 问事录
 * key on it, never on the wording. A question is one of:
 * - narrative: cast a hexagram, then read the written 断语 for exactly this question, chart and month;
 * - reference / guidance: a written explanation shown at once, with no cast and no prediction.
 */
import raw from '../../../../data/product-categories.json';
import labels from '../data/product-catalog.labels.json';

export type DomainId = 'career' | 'wealth' | 'relationships' | 'health' | 'home' | 'search';
export type Text2 = { zh: string; en: string };
export type QuestionMode = 'narrative' | 'reference' | 'guidance';

export interface CatalogCondition {
  /** e.g. 'objectKind' (the catalog's context field) */
  condition_id: string;
  label: Text2;
  kind: 'option' | 'year';
  options: { option_id: string; label: Text2 }[];
}

export interface CatalogQuestion {
  question_id: string;
  question_text: Text2;
  question_type: string;
  mode: QuestionMode;
  /** What the question does and does not answer (Chinese, from the catalog). */
  answer_scope: string;
  /** 《梅花易数》 category the chart is read under (null for a guidance question with no classical source). */
  classical_domain_id: string | null;
  /** Sections of 《梅花易数》 the question draws on. */
  source_section_ids: string[];
  /** Real-world steps shown with the question (Chinese, from the catalog). */
  practical_advice: string[];
  /** The explanation itself, for reference and guidance questions (Chinese). */
  paragraphs: string[];
  /** A written 断语 library exists for this question (others are still being written). */
  authored: boolean;
  enabled: boolean;
  /** Fixed options the question needs first (never typed, never asked by AI). */
  conditions?: CatalogCondition[];
}

export interface CatalogSubtype {
  subtype_id: string;
  label: Text2;
  /** 'missing-person': show real-world help first; a reading is never evidence of where someone is. */
  safety?: 'missing-person';
  questions: CatalogQuestion[];
}

export interface CatalogDomain {
  domain_id: DomainId;
  label: Text2;
  caution?: Text2;
  subtypes: CatalogSubtype[];
}

// ——— The catalog file, as published by the repository ———

interface ProductField {
  label: string;
  options?: string[];
  type?: 'year';
  required: boolean;
}
interface ProductQuestion {
  id: string;
  question: string;
  question_type: string;
  mode: QuestionMode;
  answerScope: string;
  chartSourceDomainId: string | null;
  sourceDomainIds: string[];
  sourceSections: { domainId: string; sectionId: string }[];
  contextFields: Record<string, ProductField>;
  practicalAdvice: string[];
  referenceParagraphs?: string[];
  guidanceParagraphs?: string[];
  manuscriptIndexPath?: string;
  archived?: boolean;
}
interface ProductFile {
  productCatalogVersion: string;
  contentVersion: string;
  objectPracticalAdvice: Record<string, string[]>;
  categories: { id: string; label: string; subcategories: { id: string; label: string; questions: ProductQuestion[] }[] }[];
}
interface Labels {
  categories: Record<string, string>;
  subcategories: Record<string, string>;
  questions: Record<string, string>;
  contextFields: Record<string, { label: Text2; options?: Record<string, Text2> }>;
  cautions: Record<string, Text2>;
  safety: Record<string, 'missing-person'>;
}

const file = raw as unknown as ProductFile;
const names = labels as unknown as Labels;

export const CATALOG_VERSION = `product-${file.productCatalogVersion}/${file.contentVersion}`;

/** A 「所问年份」 is chosen from this year and the next (no typing). */
function yearOptions(now = new Date()) {
  const y = now.getFullYear();
  return [y, y + 1].map((n) => ({ option_id: String(n), label: { zh: `${n}年`, en: String(n) } }));
}

function conditionsOf(q: ProductQuestion): CatalogCondition[] | undefined {
  const out = Object.entries(q.contextFields).map(([id, f]): CatalogCondition => {
    const l = names.contextFields[id];
    const label = l?.label ?? { zh: f.label, en: f.label };
    if (f.type === 'year') return { condition_id: id, label, kind: 'year', options: yearOptions() };
    return { condition_id: id, label, kind: 'option', options: (f.options ?? []).map((o) => ({ option_id: o, label: l?.options?.[o] ?? { zh: o, en: o } })) };
  });
  return out.length ? out : undefined;
}

function toQuestion(q: ProductQuestion): CatalogQuestion {
  const conditions = conditionsOf(q);
  return {
    question_id: q.id,
    question_text: { zh: q.question, en: names.questions[q.id] ?? q.question },
    question_type: q.question_type,
    mode: q.mode,
    answer_scope: q.answerScope,
    classical_domain_id: q.chartSourceDomainId ?? q.sourceDomainIds[0] ?? null,
    source_section_ids: q.sourceSections.map((s) => s.sectionId),
    practical_advice: [...q.practicalAdvice],
    paragraphs: [...(q.referenceParagraphs ?? q.guidanceParagraphs ?? [])],
    authored: q.mode === 'narrative' && !!q.manuscriptIndexPath,
    enabled: !q.archived,
    ...(conditions ? { conditions } : {}),
  };
}

export const DOMAINS: readonly CatalogDomain[] = file.categories.map((c) => ({
  domain_id: c.id as DomainId,
  label: { zh: c.label, en: names.categories[c.id] ?? c.label },
  ...(names.cautions[c.id] ? { caution: names.cautions[c.id] } : {}),
  subtypes: c.subcategories.map((s) => ({
    subtype_id: s.id,
    label: { zh: s.label, en: names.subcategories[s.id] ?? s.label },
    ...(names.safety[s.id] ? { safety: names.safety[s.id] } : {}),
    questions: s.questions.map(toQuestion),
  })),
}));
export const DOMAIN_IDS = DOMAINS.map((d) => d.domain_id);

/** A question with where it sits in the catalog. */
export interface ResolvedQuestion extends CatalogQuestion {
  domain_id: DomainId;
  subtype_id: string;
}

const byQuestion = new Map<string, ResolvedQuestion>();
const bySubtype = new Map<string, CatalogSubtype & { domain_id: DomainId }>();
for (const d of DOMAINS)
  for (const s of d.subtypes) {
    bySubtype.set(s.subtype_id, { ...s, domain_id: d.domain_id });
    for (const q of s.questions) byQuestion.set(q.question_id, { ...q, domain_id: d.domain_id, subtype_id: s.subtype_id });
  }

export const allSubtypes = () => [...bySubtype.values()];
export const allQuestions = () => [...byQuestion.values()];
/** Older records keep question ids from before the formal catalog; those are not looked up here. */
export const questionById = (id: string | null | undefined) => (id ? byQuestion.get(id) ?? null : null);
export const subtypeById = (id: string | null | undefined) => (id ? bySubtype.get(id) ?? null : null);

/** Older records used other ids for three of the six domains. */
const LEGACY_DOMAIN: Record<string, DomainId> = { love: 'relationships', family: 'home', seek: 'search' };
export function domainById(id: string | null | undefined): CatalogDomain | null {
  if (!id) return null;
  const k = (LEGACY_DOMAIN[id] ?? id) as DomainId;
  return DOMAINS.find((d) => d.domain_id === k) ?? null;
}

/** Questions a visitor can pick under a subtype. */
export const enabledQuestions = (s: CatalogSubtype) => s.questions.filter((q) => q.enabled);

/**
 * What a question offers now: a written 断语 library, one still being written, or an
 * explanation to read (reference / guidance, no cast).
 */
export type Readiness = 'written' | 'pending' | 'reference' | 'guidance';
export const readinessOf = (q: CatalogQuestion): Readiness => (q.mode !== 'narrative' ? q.mode : q.authored ? 'written' : 'pending');

/** The question as worded for the chosen options (「今年」 becomes the chosen year). */
export function questionWording(q: CatalogQuestion, conditions: Record<string, string> | undefined, lang: 'zh' | 'en') {
  const year = conditions?.targetYear;
  if (!year) return q.question_text[lang];
  return lang === 'en' ? q.question_text.en.replace('this year', `in ${year}`) : q.question_text.zh.replace('今年', `${year}年`);
}

/** The chosen options as the product repository takes them (years as numbers). */
export function productContext(q: CatalogQuestion, conditions: Record<string, string> | undefined): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const c of q.conditions ?? []) {
    const v = conditions?.[c.condition_id];
    if (v) out[c.condition_id] = c.kind === 'year' ? Number(v) : v;
  }
  return out;
}

/** Real-world help shown before and with readings about a missing person. */
export const SAFETY: Record<'missing-person', Text2> = {
  'missing-person': {
    zh: '如有人员失联或可能处于危险，请立即拨打 911 报警，并联系家人、学校或单位。如失联的是未成年人，也可致电美国国家失踪与受虐儿童中心（NCMEC）1-800-843-5678。卦象不能说明真实位置或安全状况，不能代替报警与搜寻。',
    en: 'If someone is missing or may be in danger, call 911 now and contact family, school or work. If the missing person is a child, you can also call the National Center for Missing & Exploited Children (NCMEC) at 1-800-843-5678. A reading cannot show where someone is or whether they are safe, and is no substitute for reporting and searching.',
  },
};

/** Cautions for a question: real-world help for missing persons, plus its domain's caution. */
export function cautionsFor(questionId: string | null | undefined, lang: 'zh' | 'en', legacyDomain?: string | null): string[] {
  const q = questionById(questionId);
  const d = domainById(q?.domain_id ?? legacyDomain);
  const s = subtypeById(q?.subtype_id);
  return [...(s?.safety ? [SAFETY[s.safety][lang]] : []), ...(d?.caution ? [d.caution[lang]] : [])];
}

/** The catalog's practical steps for a question, including those for the chosen kind of item (Chinese). */
export function practicalAdviceFor(questionId: string | null | undefined, conditions?: Record<string, string>): string[] {
  const q = questionById(questionId);
  if (!q) return [];
  const kind = conditions?.objectKind;
  return [...q.practical_advice, ...(kind ? file.objectPracticalAdvice[kind] ?? [] : [])];
}

/** Problems with the catalog or its labels (run by tests). */
export function catalogProblems(c: ProductFile = file, l: Labels = names): string[] {
  const out: string[] = [];
  const known = new Set<string>();
  for (const cat of c.categories) {
    known.add(cat.id);
    if (!l.categories[cat.id]) out.push(`${cat.id}: no English label`);
    for (const s of cat.subcategories) {
      known.add(s.id);
      if (!l.subcategories[s.id]) out.push(`${s.id}: no English label`);
      for (const q of s.questions) {
        known.add(q.id);
        if (!l.questions[q.id]) out.push(`${q.id}: no English wording`);
        if (q.mode === 'narrative' && !(q.chartSourceDomainId ?? q.sourceDomainIds[0])) out.push(`${q.id}: no classical category to cast under`);
        if (q.mode !== 'narrative' && !(q.referenceParagraphs ?? q.guidanceParagraphs)?.length) out.push(`${q.id}: explanation missing`);
        for (const [id, f] of Object.entries(q.contextFields)) {
          const fl = l.contextFields[id];
          if (!fl) out.push(`${q.id}: no label for option field ${id}`);
          else if (f.type !== 'year') for (const o of f.options ?? []) if (!fl.options?.[o]) out.push(`${q.id}: no label for ${id}=${o}`);
          if (f.type !== 'year' && !f.options?.length) out.push(`${q.id}: ${id} has no fixed options`);
        }
      }
    }
  }
  for (const id of [...Object.keys(l.categories), ...Object.keys(l.subcategories), ...Object.keys(l.questions), ...Object.keys(l.safety), ...Object.keys(l.cautions)])
    if (!known.has(id)) out.push(`${id}: label for an id the catalog does not have`);
  return out;
}
