/**
 * The six 问事 domains, as the rest of the app reads them. The questions themselves live in the
 * QuestionCatalog (questionCatalog.ts); this file only keeps what older records need: their
 * domain ids ('family' and 'seek' are now 'home' and 'search') and the outcome words used by the
 * 体用 structural sentence for questions written freely before the catalog existed.
 */
import { DOMAINS, domainById, questionById, type DomainId } from './questionCatalog';

export type TopicId = DomainId;

export interface Topic {
  id: DomainId;
  zh: string;
  en: string;
  caution?: { zh: string; en: string };
}

export const TOPICS: readonly Topic[] = DOMAINS.map((d) => ({ id: d.domain_id, zh: d.label.zh, en: d.label.en, ...(d.caution ? { caution: d.caution } : {}) }));

/** A domain by id (older ids included). */
export const topicById = (id: string | null | undefined): Topic | null => {
  const d = domainById(id);
  return d ? TOPICS.find((x) => x.id === d.domain_id) ?? null : null;
};

/** Older preset questions (before the catalog), so their records still read the same way. */
const LEGACY_PRESETS: Record<string, { zh: string; en: string }> = {
  '这份工作能拿到吗？': { zh: '拿到这份工作', en: 'get this job' },
  '今年能升职加薪吗？': { zh: '今年升职加薪', en: 'be promoted this year' },
  '这个项目能做成吗？': { zh: '把这个项目做成', en: 'make this project succeed' },
  '这次考试能通过吗？': { zh: '通过这次考试', en: 'pass this exam' },
  '要不要换工作？': { zh: '顺利换到新工作', en: 'change jobs smoothly' },
  '近期财运如何？': { zh: '近期得财', en: 'gain financially soon' },
  '这笔投资能赚吗？': { zh: '从这笔投资获利', en: 'profit from this investment' },
  '这笔生意能谈成吗？': { zh: '谈成这笔生意', en: 'close this deal' },
  '借出的钱能收回吗？': { zh: '收回借出的钱', en: 'get the money back' },
  '我们能走到一起吗？': { zh: '走到一起', en: 'end up together' },
  '这段婚事能成吗？': { zh: '成就这段婚事', en: 'see this marriage happen' },
  '他/她对我有意吗？': { zh: '得到对方的心意', en: 'win their affection' },
  '这段关系还能挽回吗？': { zh: '挽回这段关系', en: 'save this relationship' },
  '这次的病能好转吗？': { zh: '病情好转', en: 'recover' },
  '家人的身体会好起来吗？': { zh: '家人康复', en: 'see your family member recover' },
  '近期身体要注意什么？': { zh: '身体安康', en: 'stay well' },
  '家中近来是否平安？': { zh: '家中平安', en: 'keep the home at peace' },
  '这次搬家合适吗？': { zh: '搬家顺利', en: 'move smoothly' },
  '这套房子能买吗？': { zh: '顺利买下这套房子', en: 'buy this home well' },
  '家人关系能和睦吗？': { zh: '家人和睦', en: 'keep the family in harmony' },
  '丢的东西能找回吗？': { zh: '找回失物', en: 'find what was lost' },
  '等的人会回来吗？': { zh: '等到对方归来', en: 'see them return' },
  '失联的人能联系上吗？': { zh: '联系上对方', en: 'reach them' },
};

/** Outcome words by classical category, for older questions written freely. */
const DOMAIN_OUTCOME: Record<string, { zh: string; en: string }> = {
  'domain-02': { zh: '如愿', en: 'get what you hope for' },
  'domain-03': { zh: '家宅安宁', en: 'keep the home at peace' },
  'domain-04': { zh: '居所顺遂', en: 'settle well' },
  'domain-05': { zh: '成就姻缘', en: 'see the match succeed' },
  'domain-06': { zh: '生产顺利', en: 'see a smooth birth' },
  'domain-07': { zh: '如意', en: 'have it go as hoped' },
  'domain-08': { zh: '谋事成功', en: 'succeed in the plan' },
  'domain-09': { zh: '求名得成', en: 'win the position' },
  'domain-10': { zh: '得财', en: 'gain financially' },
  'domain-11': { zh: '交易成功', en: 'close the deal' },
  'domain-12': { zh: '出行顺利', en: 'travel smoothly' },
  'domain-13': { zh: '等到对方归来', en: 'see them return' },
  'domain-14': { zh: '见到所求之人', en: 'meet the person' },
  'domain-15': { zh: '找回失物', en: 'find what was lost' },
  'domain-16': { zh: '病情好转', en: 'recover' },
  'domain-17': { zh: '官司得理', en: 'win the case' },
  'domain-18': { zh: '安葬顺遂', en: 'see the burial go well' },
};

/** What the asked matter coming out well means, for the 体用 structural sentence. */
export function outcomeFor(question: string, _topicId: string | undefined, domainId: string, lang: 'zh' | 'en', questionId?: string) {
  const q = questionById(questionId);
  if (q) return q.outcome[lang];
  return (LEGACY_PRESETS[question.trim()] ?? DOMAIN_OUTCOME[domainId] ?? { zh: '事成', en: 'succeed' })[lang];
}
