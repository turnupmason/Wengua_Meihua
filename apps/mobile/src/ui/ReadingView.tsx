/**
 * 读卦: the same reading as the stone table, set out to be read.
 * - 简断: the written 断语 given at casting (its title and 简断), or plainly why there is none.
 * - 详断: the same record's 开局 / 过程 / 结局 / 总断, its 应期参考 (each window with its event,
 *   吉凶 and dates, shown apart), the 计算说明 (collapsed) and the classics it draws on (members
 *   or a single unlock read it in full).
 * - 专业依据: the three stages with their hexagrams (every line tappable), the 体用 structure
 *   worked out by the rules (labelled as such, never as a 断语), the basis, the moving line's text
 *   and the category passage. Older free-written records keep their structural reading.
 * The 断语 text comes only from the stored record; nothing here writes or rewrites one.
 */
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { JudgmentView } from './DetailSheet';
import type { Reading } from '../knowledge/knowledge';
import type { Strings } from '../domain/i18n';
import { ELEMENT_EN, SYNTH_EN } from '../domain/i18n';
import type { Lang } from '../domain/settings';
import type { StageKey } from '../domain/layout';
import type { LinePick } from '../scene/StoneTable';
import { HexagramSVG } from './HexagramSVG';
import { topicById } from '../domain/topics';
import { cautionsFor, practicalAdviceFor, questionById, subtypeById } from '../domain/questionCatalog';
import { labelled, missingText } from './judgmentText';
import { calculationGroups, windowBody, windowDates } from '../domain/judgment';
import { answerText, conclusionText, synthText, weatherText, type SynthStage } from './Verdict';
import type { ReadingSnapshot } from '../domain/cast';
import { DisplayGradeText, domainTitle } from './text';

type SRel = Reading['synthesis'] extends infer Y ? (Y extends { applicable: true; stages: readonly (infer S)[] } ? S : never) : never;

const ROLE_EN: Record<string, string> = { 用卦: 'Use', 体互: 'Body-mutual', 用互: 'Use-mutual', 变卦: 'Changed' };
const roleName = (title: string, lang: Lang) => (lang === 'en' ? ROLE_EN[title] ?? title : title === '用卦' ? '用' : title);

const HEX_STAGE: Record<SynthStage, StageKey> = { use: 'primary', mutual: 'mutual', changed: 'changed' };

/** 金克木 / 木生火 / 同为木: the elements behind a relation, in its real direction. */
function elementRelation(type: string, body: string, other: string, lang: Lang) {
  const el = (e: string) => (lang === 'en' ? ELEMENT_EN[e] ?? e : e);
  if (type === 'equal') return lang === 'en' ? `both ${el(body)}` : `同为${body}`;
  const verb = (k: string) => (lang === 'en' ? (k === '克' ? ' controls ' : ' feeds ') : k);
  switch (type) {
    case 'use_controls_body':
      return `${el(other)}${verb('克')}${el(body)}`;
    case 'body_controls_use':
      return `${el(body)}${verb('克')}${el(other)}`;
    case 'use_generates_body':
      return `${el(other)}${verb('生')}${el(body)}`;
    default:
      return `${el(body)}${verb('生')}${el(other)}`;
  }
}

/** First paragraph of 天时占第一 without its heading: 凡占天时，不分体用，全观诸卦…兑多则不雨亦阴。… */
function weatherRuleText(text: string) {
  return text.replace(/^【[^】]*】\s*/, '').split(/\r?\n/)[0];
}

interface Props {
  reading: Reading;
  blocked?: boolean;
  question: string;
  /** The fixed question (absent on older free-written records). */
  questionId?: string;
  /** Its fixed options, as chosen (e.g. the kind of item lost). */
  conditions?: Record<string, string>;
  topicId?: string;
  /** The reading as given at casting time (old records may not have one). */
  snapshot?: ReadingSnapshot;
  /** The 断语 for this cast, as given at casting time. */
  judgment: JudgmentView;
  /** Opens membership / single unlock for the full 断语. */
  onUnlock: () => void;
  /** Title of a 《梅花易数》 section by id (for sources named by id in the 计算说明). */
  sectionTitle?: (id: string) => string | null;
  /** Open a 《梅花易数》 section (by title) in the 藏经阁, highlighting the quoted sentence. */
  onOpenSection?: (title: string, quote?: string) => void;
  /** Open a hexagram (and line) in the 藏经阁. */
  onOpenBook?: (hexagramId: number, line: number | null, stage?: StageKey) => void;
  castTime: string;
  t: Strings;
  lang: Lang;
  focus: SynthStage | null;
  saved: boolean;
  onPick: (p: LinePick) => void;
  onSave: () => void;
  onClose: () => void;
}

/**
 * The 断语 title, clause by clause: a clause stays on one line where it fits, and the size follows
 * the longest clause, so the line breaks after a comma rather than inside a phrase.
 */
function ScriptTitle({ title }: { title: string }) {
  const clauses = title.split(/(?<=[，、；])/);
  const longest = Math.max(...clauses.map((c) => [...c].length));
  return (
    <h2 className="script-title" lang="zh" aria-label={title} style={{ '--clause': longest } as CSSProperties}>
      {clauses.map((c, i) => (
        <span key={i}>{c}</span>
      ))}
    </h2>
  );
}

export function ReadingView({ blocked = false, reading, question, questionId, conditions, topicId, snapshot, judgment, onUnlock, sectionTitle = () => null, onOpenBook, onOpenSection, castTime, t, lang, focus, saved, onPick, onSave, onClose }: Props) {
  const y = reading.synthesis;
  const txt = synthText(reading, lang);
  const wtxt = weatherText(reading, lang);
  // A question of the formal catalog is answered only by its written 断语, never by a sentence
  // applying a classical line to it; older free-written records keep theirs.
  const answer = questionById(questionId) ? null : answerText(reading, question, t, lang);
  const conclusion = conclusionText(reading, question, topicId, lang, snapshot, questionId);
  const stale = !!snapshot && snapshot.ruleId !== y.ruleId;
  const authored = judgment.state === 'ready' ? judgment : null;
  const miss = judgment.state === 'missing' ? missingText(t, judgment.reason) : null;
  const legacy = judgment.state === 'legacy';
  const advice = practicalAdviceFor(questionId, conditions);
  // Layers: 简断 always; 详断 and 专业依据 open on demand (专业依据 opens itself for a stage chip).
  const [openDetail, setOpenDetail] = useState(false);
  const [openPro, setOpenPro] = useState(focus !== null);
  useEffect(() => {
    if (focus) setOpenPro(true);
  }, [focus]);
  const cautions = cautionsFor(questionId, lang, topicId);
  const tp = topicById(topicId);
  const topicLabel = tp ? (lang === 'en' ? tp.en : tp.zh) : null;
  // The entry chosen (求职录用) goes under the question its 断语 answers.
  const entry = subtypeById(questionById(questionId)?.subtype_id)?.label[lang] ?? null;
  const entryLabel = entry && entry !== question ? entry : null;
  const refs = useRef<Partial<Record<SynthStage, HTMLElement | null>>>({});
  const body = useRef<HTMLDivElement>(null);
  const backButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    backButton.current?.focus({ preventScroll: true });
  }, []);
  useEffect(() => {
    const el = focus ? refs.current[focus] : null;
    if (el) el.scrollIntoView?.({ block: 'start' });
    else if (body.current) body.current.scrollTop = 0;
  }, [focus]);

  const moving = reading.selectedMovingLine;
  const useSideWord = lang === 'en' ? (reading.use.side === 'lower' ? 'lower' : 'upper') : reading.use.side === 'lower' ? '下卦' : '上卦';
  const elementName = (e: string) => (lang === 'en' ? ELEMENT_EN[e] ?? e : e);
  const tri = (r: { trigram: string; element: string }) => `${r.trigram}${elementName(r.element)}`;
  const bodyTri = tri(reading.body);

  const weather = !y.applicable ? y.weather : null;
  const detailRef = useRef<HTMLDetailsElement>(null);
  const openDetailLayer = () => {
    setOpenDetail(true);
    window.setTimeout(() => detailRef.current?.scrollIntoView?.({ block: 'start', behavior: 'smooth' }), 30);
  };
  // A 《梅花易数》 section the 断语 draws on, linked into the 藏经阁.
  const sourceItem = (title: string) => (
    <li key={title}>
      {onOpenSection ? (
        <button type="button" className="read-link" onClick={() => onOpenSection(title)}>
          《梅花易数·{title}》 ↗
        </button>
      ) : (
        `《梅花易数·${title}》`
      )}
    </li>
  );
  const j = authored?.judgment;
  const valence = (v: string) => (v === '吉' ? t.valenceGood : v === '凶' ? t.valenceBad : v);
  // 体用 structure by the rules: in 详断 for older records (as they were shown), else in 专业依据.
  const structural = y.applicable ? (
    <section className="read-judge" aria-labelledby="rj-title">
      <h3 id="rj-title">{legacy ? t.judgeTitle : t.structuralTitle}</h3>
      {!legacy && <p className="read-meta">{t.structuralNote}</p>}
      <table className="judge-table">
        <tbody>
          {y.stages.map((s) => (
            <tr key={s.stage} className={`tone-${s.tone}`}>
              <th scope="row">{t.verdictStage[s.stage]}</th>
              <td>
                <b>{s.main.stageLabel}</b>
                <span>{lang === 'en' ? SYNTH_EN.stage[s.main.type] : s.evidence}</span>
              </td>
            </tr>
          ))}
          <tr className="judge-sum">
            <th scope="row">{t.judgeOverall}</th>
            <td>
              <span>{conclusion}</span>
            </td>
          </tr>
        </tbody>
      </table>
      {y.verdict.caveat && lang !== 'en' && <p className="judge-caveat">{y.verdict.caveat}</p>}
      {y.verdict.conditions.length > 0 && lang !== 'en' && (
        <>
          <h4>{t.judgeConditions}</h4>
          <ul>
            {y.verdict.conditions.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </>
      )}
      {answer && <p className="read-classical">{answer}</p>}
      {y.classical && lang !== 'en' && <p className="read-classical">《体用总诀》：{y.classical}</p>}
      {stale && <p className="judge-stale">{t.snapshotRuleChanged}</p>}
    </section>
  ) : null;
  const stageCard = (key: SynthStage) => {
    const s = y.applicable ? (y.stages.find((x) => x.stage === key) as SRel) : null;
    const w = weather?.stages.find((x) => x.stage === key) ?? null;
    const hs = HEX_STAGE[key];
    const st = reading.stages[hs];
    const rows = s ? [s.main, ...(s.secondary ? [s.secondary] : [])] : [];
    return (
      <section key={key} ref={(el) => void (refs.current[key] = el)} className={`read-stage tone-${s ? s.tone : 'weather'} ${focus === key ? 'is-focus' : ''}`} aria-labelledby={`rs-${key}`}>
        <div className="read-stage-head">
          <span className="read-stage-word">{t.verdictStage[key]}</span>
          <h3 id={`rs-${key}`}>
            <small>{t[`stage_${hs}`]}</small> {st.name}
          </h3>
          <DisplayGradeText grade={st.detail.grade} lang={lang} t={t} />
          {onOpenBook && (
            <button type="button" className="read-link" onClick={() => onOpenBook(st.id, hs === 'primary' ? reading.movingLine : null, hs)}>
              {t.openOriginal(st.name, hs === 'primary' ? moving.label : null)}
            </button>
          )}
        </div>
        <div className="read-stage-body">
          <HexagramSVG
            bits={st.bitsBottomUp}
            hexagramId={st.id}
            title={st.name}
            movingLine={hs === 'primary' ? reading.movingLine : null}
            correspondingLine={hs === 'changed' ? reading.movingLine : null}
            lineLabels={st.detail.lines.map((l) => l.label)}
            onLine={(p) => onPick({ stage: hs, hexagramId: st.id, linePosition: p })}
            width={104}
          />
          <div className="read-rel">
            {rows.map((r) => (
              <p key={r.role} className={`read-rel-row tone-${r.tone}`}>
                <span className="read-rel-pair">
                  {roleName(r.title, lang)} {tri(r)} <i>·</i> {lang === 'en' ? 'Body' : '体'} {bodyTri}
                </span>
                <b>
                  {r.stageLabel} <small>{elementRelation(r.type, reading.body.element, r.element, lang)}</small>
                </b>
              </p>
            ))}
            {w && (
              <p className="read-rel-row tone-weather">
                <span className="read-rel-pair">{lang === 'en' ? 'Upper · lower' : '上卦 · 下卦'}</span>
                <b>
                  {w.trigrams.map((x, i) => `${x}${w.images[i]}`).join(' · ')}
                  {lang === 'en' && <small> {w.trigrams.map((x) => SYNTH_EN.weather[x]).join(' · ')}</small>}
                </b>
              </p>
            )}
            {s && <p className="read-phrase">{s.phrase}</p>}
          </div>
        </div>
      </section>
    );
  };

  return (
    <div className="read-view" role="dialog" aria-modal={!blocked} aria-label={t.readMode} inert={blocked}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}>
      <header className="read-head">
        <button ref={backButton} className="icon-btn" onClick={onClose} aria-label={t.viewMode}>
          ←
        </button>
        <div className="mode-switch" role="tablist">
          <button role="tab" aria-selected="false" onClick={onClose}>
            {t.viewMode}
          </button>
          <button role="tab" aria-selected="true">
            {t.readMode}
          </button>
        </div>
        <span />
      </header>
      <div className="read-body" ref={body}>
        <section className="read-ask">
          <p className="read-kicker">{t.askedMatter}</p>
          <p className="read-question">{question ? `“${question}”` : t.noQuestion}</p>
          <p className="read-meta">
            {topicLabel && `${topicLabel} · `}
            {entryLabel && `${entryLabel} · `}
            {domainTitle(reading.domain, lang)}
            {castTime && ` · ${castTime}`}
          </p>
        </section>

        <section className="read-verdict">
          <p className="read-kicker">{t.briefTitle}</p>
          {j ? (
            <>
              {j.title && <ScriptTitle title={j.title} />}
              <p className="read-answer authored" lang="zh">
                {j.short}
              </p>
              <p className="read-meta">
                {t.scriptMeta(j.monthBranch)}
                {lang === 'en' && ` · ${t.zhOnly}`}
              </p>
            </>
          ) : miss ? (
            <>
              <h2>{miss.title}</h2>
              <p className="read-summary">{miss.text}</p>
            </>
          ) : txt && y.applicable ? (
            <>
              <h2>
                {txt.headline} <span className={`verdict-lead tone-${y.lead}`}>{txt.lead}</span>
              </h2>
              {conclusion && <p className="read-answer">{conclusion}</p>}
              <p className="read-meta">{t.legacyRecord} {t.briefStructural}</p>
            </>
          ) : wtxt ? (
            <>
              <h2>{wtxt.headline}</h2>
              {answer && <p className="read-answer">{answer}</p>}
              <p className="read-summary">{wtxt.summary}</p>
            </>
          ) : (
            <p className="read-summary">{t.verdictNoBodyUse}</p>
          )}
          {cautions.map((c) => (
            <p key={c} className="verdict-caution">
              {c}
            </p>
          ))}
          {advice.length > 0 && (
            <div className="read-advice">
              <b>{t.practicalTitle}</b>
              <ul lang="zh">
                {advice.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="btn-row">
            {authored && (
              <button className="primary-btn" onClick={openDetailLayer}>
                {t.detailOpen}
              </button>
            )}
            <button className="ghost-btn" onClick={onSave} aria-pressed={saved}>
              {saved ? `✓ ${t.savedToBook}` : t.saveToBook}
            </button>
          </div>
        </section>

        <details ref={detailRef} className="read-layer" open={openDetail} onToggle={(e) => setOpenDetail((e.target as HTMLDetailsElement).open)}>
          <summary>
            <b>{t.detailTitle}</b>
            <small>{t.detailHint}</small>
          </summary>
          {j && authored?.full && (
            <section className="script-full">
              {j.paragraphs.map((para) => {
                const [label, text] = labelled(para);
                return (
                  <div key={para} className="script-part">
                    {label && <h3 lang="zh">{label}</h3>}
                    <p lang="zh">{text}</p>
                  </div>
                );
              })}
              {j.timing && (
                <div className="script-part script-timing">
                  <h3>{t.timingTitle}</h3>
                  <p className="read-meta" lang="zh">
                    {j.timing.referenceNote}
                  </p>
                  {j.timing.windows.length > 0 && (
                    <ul className="timing-list">
                      {j.timing.windows.map((w) => {
                        // The dates once, on a line of their own (with 前后 when the text said so); the text from its condition on.
                        const body = w.dates.length ? windowBody(w.text) : { around: false, text: w.text };
                        const when = w.dates.length ? windowDates(w.dates, j.castingDate, lang) : null;
                        return (
                          <li key={w.event + w.text} className={w.valence === '吉' ? 'is-good' : w.valence === '凶' ? 'is-bad' : ''}>
                            <p className="timing-when">
                              {when && <b>{body.around ? (lang === 'en' ? `around ${when}` : `${when}前后`) : when}</b>}
                              <span className="timing-tag">{valence(w.valence)}</span>
                            </p>
                            <p className="timing-text" lang="zh">
                              {body.text}
                            </p>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
              {j.calculation.length > 0 && (
                <details className="script-calc">
                  <summary>{t.calcTitle}</summary>
                  {calculationGroups(j.calculation, sectionTitle).map((g) => (
                    <div key={g.group} className="calc-group">
                      <span className="calc-label">{t.calcGroup[g.group]}</span>
                      <div>
                        {g.lines.map((c) => (
                          <p key={c} lang="zh">
                            {c}
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </details>
              )}
              {j.sources.length > 0 && (
                <div className="script-part">
                  <h3>{t.scriptSources}</h3>
                  <ul className="script-sources">{j.sources.map(sourceItem)}</ul>
                </div>
              )}
            </section>
          )}
          {authored && !authored.full && (
            <div className="script-locked">
              <p className="read-meta">{t.judgmentLocked}</p>
              <button type="button" className="enter-seal small unlock" onClick={onUnlock}>
                {t.memberUnlock}
              </button>
            </div>
          )}
          {miss && <p className="read-summary">{miss.title}</p>}
          {legacy && structural}
          {legacy && !y.applicable && weather && <p className="read-summary">{weather.summary}</p>}
        </details>

        {/* 专业依据 (collapsed unless opened from a stage): hexagrams, 体用 by stage, basis, sources. */}
        <details className="read-layer" open={openPro} onToggle={(e) => setOpenPro((e.target as HTMLDetailsElement).open)}>
          <summary>
            <b>{t.proTitle}</b>
            <small>{t.proHint}</small>
          </summary>
          <section className="evidence-map" aria-labelledby="em-title">
            <h3 id="em-title">{judgment.state === 'missing' ? t.evidenceMapBare : t.evidenceMapTitle}</h3>
            <div className="evidence-cols">
              {(['use', 'mutual', 'changed'] as const).map((k, i) => {
                const hs = HEX_STAGE[k];
                const st = y.applicable ? y.stages[i] : null;
                const w = weather?.stages[i];
                return (
                  <button key={k} type="button" className={`evidence-col tone-${st ? st.tone : 'weather'}`} onClick={() => refs.current[k]?.scrollIntoView?.({ block: 'start', behavior: 'smooth' })}>
                    <small>{t.verdictStage[k]}</small>
                    <b>{reading.stages[hs].name}</b>
                    <span>{y.applicable ? y.compact[i] : w ? w.images.join('·') : ''}</span>
                  </button>
                );
              })}
            </div>
            <p className="evidence-line">
              <b>{t.evidenceHex}</b>
              {y.applicable ? y.evidenceSummary : weather?.summary}
            </p>
            {onOpenSection && (
              <p className="evidence-line">
                <b>{t.evidenceBook}</b>
                <button type="button" className="read-link" onClick={() => onOpenSection(reading.domain.title, reading.domainPassage?.quote)}>
                  《梅花易数·{reading.domain.title}》↗
                </button>
                {y.applicable && (
                  <button type="button" className="read-link" onClick={() => onOpenSection('体用互变之诀', '卦用最紧，互次之，变卦又次之')}>
                    《体用互变之诀》↗
                  </button>
                )}
              </p>
            )}
          </section>
        {!legacy && structural && (
          // The 体用 summary repeats the stage cards below, so it is folded.
          <details className="read-judge-fold">
            <summary>{t.structuralTitle}</summary>
            {structural}
          </details>
        )}
        {(['use', 'mutual', 'changed'] as const).map(stageCard)}
        <p className="read-hint">{t.tapLineHint}</p>

        <section className="read-basis">
          <h3>{t.basisTitle}</h3>
          <ul>
            {weather && (
              <>
                <li>{t.weatherRule}</li>
                <li>{weather.summary}</li>
              </>
            )}
            {y.applicable && (
              <>
                <li>{t.basisRule}</li>
                <li>{t.basisBodyUse(moving.label, useSideWord, tri(reading.use), bodyTri)}</li>
                <li>{t.basisMutual(tri(y.stages[1].main), tri(y.stages[1].secondary ?? y.stages[1].main))}</li>
                <li>{t.basisChanged(tri(reading.use), tri(y.stages[2].main), bodyTri)}</li>
              </>
            )}
          </ul>
          {(weather?.notes ?? y.notes).length > 0 && (
            <>
              <h4>{t.notesTitle}</h4>
              <ul>
                {(weather?.notes ?? y.notes).map((n) => (
                  <li key={n.kind + n.text}>{n.text}</li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className="read-source">
          <h3>{t.movingLineTitle}</h3>
          <p className="read-line-label">
            {reading.stages.primary.name} · {moving.label}
            {onOpenBook && (
              <button type="button" className="read-link" onClick={() => onOpenBook(reading.primaryId, reading.movingLine, 'primary')}>
                {t.openOriginal(reading.stages.primary.name, moving.label)}
              </button>
            )}
          </p>
          <p className="classical">{moving.text}</p>
          {weather && (
            <>
              <h3>{t.domainPassageTitle}</h3>
              <p className="read-line-label">{domainTitle(reading.domain, lang)}</p>
              {/* The opening rule of 天时占第一, as written. */}
              <p className="classical">{weatherRuleText(reading.domain.text)}</p>
            </>
          )}
          {reading.domainPassage && (
            <>
              <h3>{t.domainPassageTitle}</h3>
              <p className="read-line-label">{domainTitle(reading.domain, lang)}</p>
              <p className="classical">{reading.domainPassage.quote}</p>
            </>
          )}
        </section>
        </details>

        <p className="read-disclaimer">{t.readingDisclaimer}</p>
      </div>
    </div>
  );
}
