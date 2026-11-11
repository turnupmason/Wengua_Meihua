/**
 * QuestionCatalog: every question a visitor can ask, chosen by tapping — six domains, 52 subtypes,
 * and the fixed questions under each. Nothing is typed in. Each question has a permanent
 * `question_id`; the 断语 database, the cast record and 问事录 all key on it, never on the wording,
 * so the wording can be edited later without losing old records.
 *
 * Rules kept here (and checked by tests):
 * - ids never change once published; retired questions stay in the file with `enabled: false`;
 * - a subtype may show more than one question only when each extra question has its own approved
 *   断语 or names, in `shares_scripts_of`, the question whose 断语 it explicitly shares;
 * - `classical_domain_id` is the 《梅花易数》 category whose passage is quoted as evidence.
 */
import raw from '../data/question-catalog.json';

export type DomainId = 'career' | 'wealth' | 'love' | 'health' | 'home' | 'search';
export type Text2 = { zh: string; en: string };

export interface CatalogCondition {
  /** e.g. 'lost_where' */
  condition_id: string;
  label: Text2;
  options: { option_id: string; label: Text2 }[];
}

export interface CatalogQuestion {
  question_id: string;
  question_text: Text2;
  /** What a good result would mean, for the 体用 structural sentence in 专业依据. */
  outcome: Text2;
  classical_domain_id: string;
  enabled: boolean;
  /** Explicit, author-approved sharing of another question's 断语 (never implied by the subtype). */
  shares_scripts_of?: string;
  /** Extra facts the 断语 needs, chosen from fixed buttons (never typed, never asked by AI). */
  conditions?: CatalogCondition[];
}

export interface CatalogSubtype {
  subtype_id: string;
  label: Text2;
  /** 'missing-person': show real-world help first; the reading is never evidence of where someone is. */
  safety?: 'missing-person';
  questions: CatalogQuestion[];
}

export interface CatalogDomain {
  domain_id: DomainId;
  label: Text2;
  caution?: Text2;
  subtypes: CatalogSubtype[];
}

interface CatalogFile {
  catalog_version: string;
  rule_profile_id: string;
  domains: CatalogDomain[];
}

const file = raw as CatalogFile;

export const CATALOG_VERSION = file.catalog_version;
export const DOMAINS: readonly CatalogDomain[] = file.domains;
export const DOMAIN_IDS = DOMAINS.map((d) => d.domain_id);

/** A question with everything needed to cast and to look up its 断语. */
export interface ResolvedQuestion extends CatalogQuestion {
  domain_id: DomainId;
  subtype_id: string;
  rule_profile_id: string;
}

const byQuestion = new Map<string, ResolvedQuestion>();
const bySubtype = new Map<string, CatalogSubtype & { domain_id: DomainId }>();
for (const d of DOMAINS)
  for (const s of d.subtypes) {
    bySubtype.set(s.subtype_id, { ...s, domain_id: d.domain_id });
    for (const q of s.questions) byQuestion.set(q.question_id, { ...q, domain_id: d.domain_id, subtype_id: s.subtype_id, rule_profile_id: file.rule_profile_id });
  }

export const allSubtypes = () => [...bySubtype.values()];
export const allQuestions = () => [...byQuestion.values()];
export const questionById = (id: string | null | undefined) => (id ? byQuestion.get(id) ?? null : null);
export const subtypeById = (id: string | null | undefined) => (id ? bySubtype.get(id) ?? null : null);

/** Older records used 'family' and 'seek' for two of the six domains. */
const LEGACY_DOMAIN: Record<string, DomainId> = { family: 'home', seek: 'search' };
export function domainById(id: string | null | undefined): CatalogDomain | null {
  if (!id) return null;
  const k = (LEGACY_DOMAIN[id] ?? id) as DomainId;
  return DOMAINS.find((d) => d.domain_id === k) ?? null;
}

/** Questions a visitor can pick under a subtype. */
export const enabledQuestions = (s: CatalogSubtype) => s.questions.filter((q) => q.enabled);

/** Real-world help shown before and with readings about a missing person. */
export const SAFETY: Record<'missing-person', Text2> = {
  'missing-person': {
    zh: '如有人员失联或可能处于危险，请立即拨打 911 报警，并联系家人、学校或单位。如失联的是未成年人，也可致电美国国家失踪与受虐儿童中心（NCMEC）1-800-843-5678。卦象不能说明真实位置或安全状况，不能代替报警与搜寻。',
    en: 'If someone is missing or may be in danger, call 911 now and contact family, school or work. If the missing person is a child, you can also call the National Center for Missing & Exploited Children (NCMEC) at 1-800-843-5678. A reading cannot show where someone is or whether they are safe, and is no substitute for reporting and searching.',
  },
};

/** Cautions for a question: its domain's, plus real-world help for missing persons. */
export function cautionsFor(questionId: string | null | undefined, lang: 'zh' | 'en', legacyDomain?: string | null): string[] {
  const q = questionById(questionId);
  const d = domainById(q?.domain_id ?? legacyDomain);
  const s = subtypeById(q?.subtype_id);
  return [...(s?.safety ? [SAFETY[s.safety][lang]] : []), ...(d?.caution ? [d.caution[lang]] : [])];
}

/** Problems with the catalog itself (run by tests and by the 断语 import). */
export function catalogProblems(c: CatalogFile = file): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const ID = /^[a-z]+(\.[a-z0-9_]+)+$/;
  for (const d of c.domains) {
    for (const s of d.subtypes) {
      if (!s.subtype_id.startsWith(`${d.domain_id}.`)) out.push(`${s.subtype_id}: not under ${d.domain_id}`);
      if (seen.has(s.subtype_id)) out.push(`${s.subtype_id}: duplicate id`);
      seen.add(s.subtype_id);
      if (!s.questions.some((q) => q.enabled)) out.push(`${s.subtype_id}: no enabled question`);
      for (const q of s.questions) {
        if (!ID.test(q.question_id) || !q.question_id.startsWith(`${s.subtype_id}.`)) out.push(`${q.question_id}: id must start with ${s.subtype_id}.`);
        if (seen.has(q.question_id)) out.push(`${q.question_id}: duplicate id`);
        seen.add(q.question_id);
        if (!q.question_text.zh.trim() || !q.question_text.en.trim()) out.push(`${q.question_id}: missing text`);
        if (!/^domain-(0[2-9]|1[0-8])$/.test(q.classical_domain_id)) out.push(`${q.question_id}: bad classical_domain_id`);
        if (q.shares_scripts_of && !c.domains.some((dd) => dd.subtypes.some((ss) => ss.questions.some((qq) => qq.question_id === q.shares_scripts_of && !qq.shares_scripts_of))))
          out.push(`${q.question_id}: shares_scripts_of must name a question that has its own 断语`);
      }
    }
  }
  return out;
}
