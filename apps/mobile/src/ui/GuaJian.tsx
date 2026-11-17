/**
 * 卦笺 (2026-11-14): the reading as a private 卦笺 — 宣纸, ink and a cinnabar seal, laid out like
 * a carefully annotated book page but answering in plain modern Chinese.
 *
 * Three layers, kept apart:
 *  - 简断: the answer, first and large.
 *  - 详断: 开局 · 过程 · 结局 · 总断, the plain words first and the terms they rest on after; then 应期.
 *  - 依据 (folded): 古籍原文 (the hexagram's and the moving line's own words), 白话释义 (their
 *    rendering), 排盘与计算 (历法, 卦象, 体用, 取期) and the 《梅花易数》 sections drawn on — the classic,
 *    its explanation and our own 断语 never mixed.
 * Ends with the 校订 line (version, 专家审定) and the seal.
 *
 * Every reading with a written 断语 opens as a 卦笺 (older records without one keep the 读卦 page).
 *
 * On paper (2026-11-15) the 卦笺 is the reading itself: it opens on the tap of 诚心起卦 with all its
 * words already there, and the three hexagrams float up one after another (本 → 互 → 变, without
 * sound); the 本卦 shows 体 and 用 with their trigrams and elements, and a circle by the moving line.
 */
import { useEffect, useRef, useState } from 'react';
import { canRemind } from '../domain/reminders';
import { ShareCardButton } from './ShareCardButton';
import type { SynthStage } from './Verdict';
import type { Reading } from '../knowledge/knowledge';
import type { Strings } from '../domain/i18n';
import type { Lang } from '../domain/settings';
import { calculationGroups, windowBody, windowDates } from '../domain/judgment';
import type { JudgmentView } from './DetailSheet';
import { labelled } from './judgmentText';
import { plainFirst } from './plainFirst';
import { GuaFigure, bodyUseMarks, tiyongLine } from './GuaFigure';

type StageKey = 'primary' | 'mutual' | 'changed';

/** How long the three take to come up: one after another, each fading in slowly. */
export const UNVEIL = { step: 0.35, fade: 1.2 };

/** True once the three hexagrams are shown (at once when there is nothing to unveil). */
function useUnveiled(on: boolean, reduced: boolean) {
  const [shown, setShown] = useState(!on);
  useEffect(() => {
    if (!on) {
      setShown(true);
      return;
    }
    setShown(false);
    const ms = reduced ? 300 : (UNVEIL.step * 2 + UNVEIL.fade) * 1000 + 150;
    const id = window.setTimeout(() => setShown(true), ms);
    return () => window.clearTimeout(id);
  }, [on, reduced]);
  return shown;
}

interface Props {
  reading: Reading;
  judgment: JudgmentView;
  /** The entry (求职录用) and its field (事业工作). */
  question: string;
  field: string | null;
  /** The question the 断语 answers, in full (这次面试能通过吗？). */
  asks: string | null;
  castTime: string;
  t: Strings;
  lang: Lang;
  saved: boolean;
  sectionTitle: (id: string) => string | null;
  onOpenSection?: (title: string) => void;
  onOpenBook?: (hexagramId: number, line: number | null, stage?: StageKey) => void;
  onSave: () => void;
  onUnlock: () => void;
  onClose: () => void;
  /** Opened from a stage on the stone (目前 / 经过 / 结果): the 依据 open there. */
  focus?: SynthStage | null;
  /** The hexagrams this cast added to 卦册. */
  newMet?: { names: string[]; count: number } | null;
  /** 应期提醒 (phone app only). */
  remind?: { on: boolean; onTurnOn: () => void };
  /** 研习与校订 */
  onStudy?: () => void;
  /** While the reading is first shown (the ritual's 'revealing'): the three come up one by one. */
  writing?: { reduced: boolean } | null;
  /** No written 断语 for this cast: why (shown where the 简断 would be). */
  pending?: { title: string; text: string } | null;
  /** The page is the reading itself: the main button ends it (回到问事) instead of going back to the 卦面. */
  closeLabel?: string;
}

export function GuaJian({ reading, judgment, question, field, asks, castTime, t, lang, saved, sectionTitle, onOpenSection, onOpenBook, onSave, onUnlock, onClose, focus = null, newMet = null, remind, onStudy, writing = null, pending = null, closeLabel }: Props) {
  const unveiled = useUnveiled(!!writing, !!writing?.reduced);
  const [basisOpen, setBasisOpen] = useState(focus !== null);
  const stageRefs = useRef<Partial<Record<SynthStage, HTMLElement | null>>>({});
  // From a stage on the stone: the 依据 open, at that stage.
  useEffect(() => {
    if (!focus) return;
    setBasisOpen(true);
    const id = window.setTimeout(() => stageRefs.current[focus]?.scrollIntoView?.({ block: 'center', behavior: 'smooth' }), 60);
    return () => window.clearTimeout(id);
  }, [focus]);
  const y = reading.synthesis;
  const j = judgment.state === 'ready' ? judgment.judgment : null;
  const full = judgment.state === 'ready' && judgment.full;
  const st = reading.stages;
  const primary = st.primary.detail;
  const line = reading.selectedMovingLine;
  const stages: [StageKey, string][] = [['primary', t.jianPrimary], ['mutual', t.jianMutual], ['changed', t.jianChanged]];
  return (
    <div className={`jian-page ${unveiled ? '' : 'is-unveiling'}`} role="dialog" aria-modal="true" aria-label={t.jianTitle} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <header className="jian-bar">
        <button type="button" className="jian-back" onClick={onClose} aria-label={t.back}>
          ←
        </button>
        <span className="jian-brand">{t.appName} · {t.jianTitle}</span>
        <span className="jian-kind">{t.jianKind}</span>
      </header>

      <article className="jian">
        {/* 象 (2026-11-15): what was asked, the three hexagrams and 体用 on a band of dark green and gold;
            the reading below on paper, as a book goes from its plate to its text. */}
        <div className="jian-xiang">
        {/* 所问 */}
        <section className="jian-ask">
          <p className="jian-field">{[field, question].filter(Boolean).join(' / ')}</p>
          <h1>{asks ?? question}</h1>
          <p className="jian-when">{castTime}</p>
          {newMet && newMet.names.length > 0 && <p className="jian-met">{t.newlyMet(newMet.names.join(lang === 'en' ? ', ' : '、'), newMet.count)}</p>}
        </section>

        {/* 卦象: 本 · 互 · 变, the moving line in cinnabar; each opens its own page. */}
        <section className="jian-guas" aria-label={t.jianGuas}>
          {stages.map(([k, label]) => (
            <button key={k} type="button" className="jian-hex" disabled={!unveiled} onClick={() => onOpenBook?.(st[k].id, k === 'primary' ? reading.movingLine : null, k)}>
              <GuaFigure bits={st[k].bitsBottomUp} moving={k === 'primary' ? reading.movingLine : null} {...(k === 'primary' ? { ...bodyUseMarks(t, reading), movingLabel: t.jianMovingLabel } : {})} />
              <span className="jian-hex-name">
                <b>{st[k].name}</b>
                <small>{label}</small>
              </span>
            </button>
          ))}
        </section>
        <p className="jian-tiyong">
          {tiyongLine(t, reading, j?.monthBranch)}
          <i>·</i>
          {line.label}{lang === 'en' ? ' moves' : '动'}
        </p>
        </div>

        {j ? (
          <>
            {/* 简断: the answer first. */}
            <section className="jian-brief">
              <p className="jian-kicker">{t.jianBriefKicker}</p>
              <h2>{j.title || j.short}</h2>
              {j.title && <p className="jian-brief-text">{j.short}</p>}
            </section>

            {full ? (
              <>
                {/* 详断 */}
                <section className="jian-detail">
                  <p className="jian-kicker">{t.jianDetailKicker}</p>
                  {j.paragraphs.map((para) => {
                    const [label, text] = labelled(para);
                    const { plain, basis } = plainFirst(text, { verdictFirst: /结局/.test(label ?? '') });
                    return (
                      <div key={para} className={`jian-part ${/总断/.test(label ?? '') ? 'is-final' : ''}`}>
                        {label && <h3>{label}</h3>}
                        <div>
                          <p lang="zh">{plain}</p>
                          {basis && (
                            <p className="jian-basis" lang="zh">
                              <b>{t.basisWord}</b>
                              {basis}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </section>

                {/* 应期 */}
                {j.timing && j.timing.windows.length > 0 && (
                  <section className="jian-timing">
                    <p className="jian-kicker">{t.timingTitle}</p>
                    <p className="jian-note">{j.timing.referenceNote}</p>
                    <ul>
                      {j.timing.windows.map((w) => {
                        const body = w.dates.length ? windowBody(w.text) : { around: false, text: w.text };
                        const when = w.dates.length ? windowDates(w.dates, j.castingDate, lang) : null;
                        return (
                          <li key={w.event + w.text}>
                            <span className={`jian-seal is-${w.valence === '吉' ? 'good' : w.valence === '凶' ? 'bad' : 'other'}`}>{w.valence}</span>
                            <div>
                              {when && <b>{body.around ? `${when}前后` : when}</b>}
                              <p lang="zh">{body.text}</p>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                    {remind && canRemind() &&
                      (remind.on ? (
                        <p className="jian-note">{t.remindIsOn}</p>
                      ) : (
                        <button type="button" className="jian-remind" onClick={remind.onTurnOn}>
                          {t.remindAsk}
                        </button>
                      ))}
                  </section>
                )}
              </>
            ) : (
              <section className="jian-locked">
                <p>{t.judgmentLocked}</p>
                <button type="button" onClick={onUnlock}>
                  {t.memberUnlock}
                </button>
              </section>
            )}

            {/* 依据: folded; the classic, its explanation and the working kept apart. */}
            <section className={`jian-basis-all ${basisOpen ? 'is-open' : ''}`}>
              <button type="button" className="jian-basis-toggle" aria-expanded={basisOpen} onClick={() => setBasisOpen((o) => !o)}>
                <span>{t.jianBasisTitle}</span>
                <i aria-hidden="true">{basisOpen ? '−' : '+'}</i>
              </button>
              {basisOpen && (
                <div className="jian-basis-body">
                  {/* 体用 stage by stage, as the stone shows it (目前 · 经过 · 结果). */}
                  {y.applicable && (
                    <div className="jian-source">
                      <h4>{t.jianStages}</h4>
                      {y.stages.map((s) => (
                        <p key={s.stage} ref={(el) => void (stageRefs.current[s.stage] = el)} className={`jian-stage ${focus === s.stage ? 'is-focus' : ''}`} lang="zh">
                          <b>{t.verdictStage[s.stage]}</b>
                          <span>
                            {s.main.stageLabel} · {s.evidence}
                          </span>
                        </p>
                      ))}
                    </div>
                  )}
                  <div className="jian-source">
                    <h4>{t.jianClassic}</h4>
                    <p className="jian-classic" lang="zh">
                      <b>{st.primary.name}</b>
                      {primary.reading.text}
                    </p>
                    <p className="jian-classic" lang="zh">
                      <b>{line.label}</b>
                      {line.text}
                    </p>
                  </div>
                  <div className="jian-source">
                    <h4>{t.jianVernacular}</h4>
                    <p lang="zh">{primary.reading.vernacular}</p>
                    <p lang="zh">{line.vernacular}</p>
                  </div>
                  {j.calculation.length > 0 && (
                    <div className="jian-source">
                      <h4>{t.jianWorking}</h4>
                      {calculationGroups(j.calculation, sectionTitle).map((g) => (
                        <div key={g.group} className="jian-calc">
                          <span>{t.calcGroup[g.group]}</span>
                          <div>
                            {g.lines.map((c) => (
                              <p key={c} lang="zh">{c}</p>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {j.sources.length > 0 && (
                    <div className="jian-source">
                      <h4>{t.jianBooks}</h4>
                      <ul>
                        {j.sources.map((title) => (
                          <li key={title}>
                            <button type="button" onClick={() => onOpenSection?.(title)}>
                              《梅花易数·{title}》
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </section>
          </>
        ) : (
          <section className="jian-brief">
            {pending ? (
              <>
                <p className="jian-kicker">{t.jianBriefKicker}</p>
                <h2>{pending.title}</h2>
                <p className="jian-brief-text">{pending.text}</p>
              </>
            ) : (
              <p className="jian-brief-text">{t.scriptPendingNote}</p>
            )}
          </section>
        )}

        {/* 校订 and the seal. */}
        <footer className="jian-foot">
          {/* No internal version code on the page (the user, 2026-11-14): only how the 断语 was made. */}
          {j && <p className="jian-version">{t.jianRevision}</p>}
          <p className="jian-disclaimer">{t.readingDisclaimer}</p>
          {onStudy && (
            <button type="button" className="jian-why" onClick={onStudy}>
              {t.jianWhy}
            </button>
          )}
          <span className="jian-stamp" aria-hidden="true">问卦</span>
        </footer>
      </article>

      <footer className="jian-actions">
        <button type="button" onClick={onSave} aria-pressed={saved}>
          {saved ? `✓ ${t.savedToBook}` : t.saveToBook}
        </button>
        {j && <ShareCardButton reading={reading} judgment={j} field={[field, question].filter(Boolean).join(' · ')} castTime={castTime} t={t} className="jian-share" />}
        <button type="button" className="is-main" onClick={onClose}>
          {closeLabel ?? t.jianToStone}
        </button>
      </footer>
    </div>
  );
}
