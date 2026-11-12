/**
 * A reference or guidance question, read at once: the catalog's explanation, its real-world
 * steps and where it comes from. No hexagram is cast, nothing is predicted, no reading is counted,
 * and no ritual or payment stands between the visitor and practical help (health references,
 * finding someone, retracing a lost item).
 */
import type { Strings } from '../domain/i18n';
import type { Lang } from '../domain/settings';
import { cautionsFor, practicalAdviceFor, questionWording, type ResolvedQuestion } from '../domain/questionCatalog';

interface Props {
  t: Strings;
  lang: Lang;
  question: ResolvedQuestion;
  conditions: Record<string, string>;
  /** Title of a 《梅花易数》 section by id (e.g. mh-077 → 失物占第十五). */
  sectionTitle: (id: string) => string | null;
  onClose: () => void;
}

export function ReferenceSheet({ t, lang, question: q, conditions, sectionTitle, onClose }: Props) {
  const cautions = cautionsFor(q.question_id, lang);
  const advice = practicalAdviceFor(q.question_id, conditions);
  const sources = q.source_section_ids.map(sectionTitle).filter((x): x is string => !!x);
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <section className="sheet reference-sheet" role="dialog" aria-label={questionWording(q, conditions, lang)} onClick={(e) => e.stopPropagation()}>
        <header className="sheet-head">
          <div className="ask-sheet-title">
            <p className="sheet-kicker">{q.mode === 'guidance' ? t.guidanceKicker : t.referenceKicker}</p>
            <h2>{questionWording(q, conditions, lang)}</h2>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={t.close}>
            ✕
          </button>
        </header>
        <div className="sheet-body reference-body">
          {cautions.map((c) => (
            <p key={c} className="ask-safety" role="note">
              {c}
            </p>
          ))}
          <div className="reference-text" lang="zh">
            {q.paragraphs.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
          {lang === 'en' && <p className="read-meta">{t.zhOnly}</p>}
          {advice.length > 0 && (
            <>
              <h3>{t.practicalTitle}</h3>
              <ul className="reference-advice" lang="zh">
                {advice.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </>
          )}
          {sources.length > 0 && (
            <p className="read-meta">
              {t.referenceSources}：{sources.map((s) => `《梅花易数·${s}》`).join('、')}
            </p>
          )}
          <p className="read-meta">{t.referenceNoCast}</p>
          <button type="button" className="enter-seal small" onClick={onClose}>
            {t.done}
          </button>
        </div>
      </section>
    </div>
  );
}
