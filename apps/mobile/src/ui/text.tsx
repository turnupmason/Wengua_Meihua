import type { Strings } from '../domain/i18n';
import { DOMAIN_EN, RELATION_EN } from '../domain/i18n';
import type { Lang } from '../domain/settings';
import type { RelationView } from '../domain/relation';

/** Front text is always rawGrade (e.g. 姤 shows 中卦); English adds the five-tier class from canonicalGrade. */
export function DisplayGradeText({ grade, lang, t }: { grade: { rawGrade: string; canonicalGrade: string }; lang: Lang; t: Strings }) {
  return (
    <span className="grade">
      {grade.rawGrade}
      {lang === 'en' && <small className="grade-tier"> · {t.tierLabels[grade.canonicalGrade]}</small>}
    </span>
  );
}

/** 体/用 tag beside a trigram: the role, its meaning (自己·主 / 事情·事), and the trigram with its element. */
export function RoleTag({ isBody, t, trigram, element }: { isBody: boolean; t: Strings; trigram: string; element: string }) {
  const [role, meaning] = (isBody ? t.bodyTag : t.useTag).split(/[：:]\s*/);
  return (
    <span className={`role-tag ${isBody ? 'role-body' : 'role-use'}`} aria-label={`${isBody ? t.bodyTag : t.useTag} ${trigram}${element}`}>
      <b>{role}</b>
      <small>{meaning}</small>
      <small className="role-trigram">
        {trigram}
        {element}
      </small>
    </span>
  );
}

export function relationText(relation: { type: string; label: string; phrase: string }, lang: Lang) {
  if (lang === 'en' && RELATION_EN[relation.type]) return RELATION_EN[relation.type];
  return { label: relation.label, phrase: relation.phrase };
}

export function domainTitle(domain: { id: string; title: string }, lang: Lang) {
  return lang === 'en' ? `${DOMAIN_EN[domain.id] ?? domain.id} · ${domain.title}` : domain.title;
}

/** For screen readers: the relation itself (体克用…), not a rule-only verdict that could contradict the 断语. */
export function relationAria(r: RelationView, lang: Lang) {
  return relationText(r, lang).label;
}
