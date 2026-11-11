/**
 * The conclusion, first thing under the stone table: a plain headline (先难后易 …), whether the
 * matter is mainly smooth or not, one sentence for start → process → end, and three stage chips
 * (目前 / 经过 / 结果) that open the reading view at that stage. All from `reading.synthesis`
 * (用 weighs most, then 互, then 变); nothing is recomputed here.
 */
import type { Reading } from '../knowledge/knowledge';
import type { Strings } from '../domain/i18n';
import { SYNTH_EN } from '../domain/i18n';
import type { Lang } from '../domain/settings';
import { outcomeFor, topicById } from '../domain/topics';
import type { ReadingSnapshot } from '../domain/cast';

/** 求名占第九 → 求名占 */
const bookName = (title: string) => title.replace(/第.+$/, '');

/**
 * The answer to the visitor's own question, first: the classical category's sentence for this
 * 体用 relation (e.g. 《求名占》：用克体，名不可成), then how the end (变卦) turns. Weather reads
 * the trigram images instead. Nothing here is invented: the quote is the source text and the end
 * clause follows 《体用互变之诀》 (变克体 末后不吉；变生体、比和 临终吉利).
 */
export function answerText(reading: Reading, question: string, t: Strings, lang: Lang) {
  const q = question.trim();
  if (!q) return null;
  const y = reading.synthesis;
  if (!y.applicable) {
    const w = weatherText(reading, lang);
    return w ? `${t.answerFor(q)}：${w.headline}。` : null;
  }
  const p = reading.domainPassage;
  // A passage that only names the relation (e.g. 「用生体」) says nothing to the asker: use the stage summary.
  const start = p && p.quote.length > 4 ? t.answerClassical(bookName(reading.domain.title), p.quote) : synthText(reading, lang)?.summary.replace(/。$/, '') ?? '';
  const end = y.stages[2].tone;
  const clause = end === y.lead ? t.answerEndSame[end] : t.answerEnd[end];
  return lang === 'en' ? `${t.answerFor(q)}: ${start}. ${clause}` : `${t.answerFor(q)}：${start}；${clause}`;
}

export function topicCaution(topicId: string | undefined, lang: Lang) {
  const c = topicById(topicId)?.caution;
  return c ? c[lang] : null;
}

export type SynthStage = 'use' | 'mutual' | 'changed';

/** 天时: no 体用; the trigram images of all six trigrams decide (全观诸卦). */
export function weatherText(reading: Reading, lang: Lang) {
  const y = reading.synthesis;
  if (y.applicable || !y.weather) return null;
  const w = y.weather;
  if (lang !== 'en') return { headline: w.headline, summary: w.summary, stages: w.stages.map((s) => ({ stage: s.stage, short: s.images.join(' · ') })) };
  return {
    headline: w.top.map((t) => SYNTH_EN.weather[t]).join(', '),
    summary: `Most frequent: ${w.top.join(', ')}`,
    stages: w.stages.map((s) => ({ stage: s.stage, short: s.trigrams.map((t) => SYNTH_EN.weather[t]).join(' · ') })),
  };
}

export function synthText(reading: Reading, lang: Lang) {
  const y = reading.synthesis;
  if (!y.applicable) return null;
  if (lang !== 'en') return { headline: y.headline, lead: y.leadText, summary: y.summary, stages: y.stages.map((s) => ({ ...s, short: s.main.stageLabel })) };
  const word = { use: 'Start', mutual: 'Process', changed: 'End' } as const;
  return {
    headline: SYNTH_EN.headline[y.headline] ?? y.headline,
    lead: SYNTH_EN.lead[y.lead],
    summary: y.stages.map((s) => `${word[s.stage]}: ${SYNTH_EN.stage[s.main.type]}`).join(' · '),
    stages: y.stages.map((s) => ({ ...s, short: SYNTH_EN.stage[s.main.type] })),
  };
}

/**
 * One sentence that answers the question (e.g. 「前期阻力较大，后续有缓和机会，但目前不足以断定
 * 一定能拿到这份工作。」). A record's frozen snapshot wins, so later rule updates never change
 * what was said at the time.
 */
export function conclusionText(reading: Reading, question: string, topicId: string | undefined, lang: Lang, snapshot?: ReadingSnapshot, questionId?: string) {
  if (snapshot && lang !== 'en') return snapshot.conclusion;
  const y = reading.synthesis;
  if (!y.applicable) return weatherText(reading, lang)?.headline ?? null;
  const outcome = outcomeFor(question, topicId, reading.domain.id, lang, questionId);
  const tpl = lang === 'en' ? SYNTH_EN.verdict[y.verdict.code] ?? '' : y.verdict.template;
  return tpl.replace('{outcome}', outcome);
}

export function Verdict({ reading, t, lang, onStage, question = '', topicId, snapshot }: { reading: Reading; t: Strings; lang: Lang; onStage: (s: SynthStage) => void; question?: string; topicId?: string; snapshot?: ReadingSnapshot }) {
  const txt = synthText(reading, lang);
  const answer = answerText(reading, question, t, lang);
  const caution = topicCaution(topicId, lang);
  const conclusion = conclusionText(reading, question, topicId, lang, snapshot);
  const asked = question.trim();
  if (!txt) {
    const w = weatherText(reading, lang);
    return (
      <section className="verdict lead-weather" aria-label={t.weatherKicker}>
        <div className="verdict-head">
          <h2 className="verdict-headline">{w?.headline ?? t.verdictNoBodyUse}</h2>
          <span className="verdict-lead tone-weather">{t.weatherKicker}</span>
        </div>
        {asked && <p className="verdict-asked">{asked}</p>}
        {w && <p className="verdict-summary">{answer ?? w.summary}</p>}
        {w && (
          <div className="verdict-stages">
            {w.stages.map((s) => (
              <button key={s.stage} type="button" className="stage-chip tone-weather" onClick={() => onStage(s.stage)} aria-label={`${t.verdictStage[s.stage]} ${s.short}，${t.verdictWhy}`}>
                <small>{t.verdictStage[s.stage]}</small>
                <b>{s.short}</b>
              </button>
            ))}
          </div>
        )}
      </section>
    );
  }
  const y = reading.synthesis;
  return (
    <section className={`verdict lead-${y.applicable ? y.lead : ''}`} aria-label={t.verdictKicker}>
      <div className="verdict-head">
        <h2 className="verdict-headline">{snapshot && lang !== 'en' ? snapshot.headline : txt.headline}</h2>
        <span className={`verdict-lead tone-${y.applicable ? y.lead : ''}`}>{snapshot && lang !== 'en' ? snapshot.leadText : txt.lead}</span>
      </div>
      {asked && <p className="verdict-asked">{asked}</p>}
      <p className="verdict-summary verdict-conclusion">{conclusion ?? txt.summary}</p>
      {caution && <p className="verdict-caution">{caution}</p>}
      <div className="verdict-stages">
        {txt.stages.map((s) => (
          <button key={s.stage} type="button" className={`stage-chip tone-${s.tone}`} onClick={() => onStage(s.stage)} aria-label={`${t.verdictStage[s.stage]} ${s.short}，${t.verdictWhy}`}>
            <small>{t.verdictStage[s.stage]}</small>
            <b>{s.short}</b>
          </button>
        ))}
      </div>
    </section>
  );
}
