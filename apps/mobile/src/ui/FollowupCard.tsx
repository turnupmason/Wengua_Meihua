/**
 * 应期回访 in the hall: when a 应期 has come, one slim line in the tray says so (the 三清 stay in
 * view); tapping it asks whether it happened — 应了 / 没应 / 说不准, or 稍后再说. The answer is kept
 * beside the record in 问事录.
 */
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Strings } from '../domain/i18n';
import type { Outcome, TimingRef } from '../domain/followup';

export interface FollowupAsk {
  w: TimingRef;
  /** The entry asked (求职录用). */
  question: string;
  /** The window's dates as a reader scans them (11月21–22日). */
  when: string;
  onAnswer: (o: Outcome) => void;
  onLater: () => void;
  onOpen: () => void;
}

export function FollowupCard({ t, ask, lang }: { t: Strings; ask: FollowupAsk | null; lang: 'zh' | 'en' }) {
  const [open, setOpen] = useState(false);
  // A short thank-you after an answer, then the line goes (or shows the next one).
  const [thanks, setThanks] = useState(false);
  useEffect(() => {
    if (!thanks) return;
    const id = window.setTimeout(() => setThanks(false), 2600);
    return () => window.clearTimeout(id);
  }, [thanks]);
  useEffect(() => {
    if (!ask) setOpen(false);
  }, [ask]);
  if (thanks) return <p className="followup-strip is-thanks" role="status">{t.fuThanks}</p>;
  if (!ask) return null;
  const { w } = ask;
  const tone = w.valence === '吉' ? 'is-good' : w.valence === '凶' ? 'is-bad' : '';
  const when = lang === 'en' ? ask.when : `${ask.when}前后`;
  return (
    <>
      <button type="button" className="followup-strip" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <b>{t.fuKicker}</b>
        <span>{lang === 'en' ? `“${ask.question}” · ${ask.when}` : `「${ask.question}」的应期到了`}</span>
        <em aria-hidden="true">›</em>
      </button>
      {open &&
        createPortal(
          <div className="sheet-backdrop followup-backdrop" onClick={() => setOpen(false)}>
            <section className="followup-pop" role="dialog" aria-modal="true" aria-label={t.fuKicker} onClick={(e) => e.stopPropagation()}>
              <p className="fu-kicker">
                <b>{t.fuKicker}</b>
                <span>{when}</span>
              </p>
              <p className="fu-said">
                {t.fuSaid(ask.question)}
                <span className={`fu-event ${tone}`}>
                  <span lang="zh">{w.event}</span>
                  {w.valence && <i>{lang === 'en' ? (w.valence === '吉' ? 'favourable' : w.valence === '凶' ? 'unfavourable' : w.valence) : w.valence}</i>}
                </span>
              </p>
              <p className="fu-ask">{t.fuAsk}</p>
              <div className="fu-answers" role="group" aria-label={t.fuAsk}>
                {(['happened', 'not', 'unsure'] as const).map((o) => (
                  <button
                    type="button"
                    key={o}
                    className={`fu-answer is-${o}`}
                    onClick={() => {
                      setOpen(false);
                      ask.onAnswer(o);
                      setThanks(true);
                    }}
                  >
                    {t.fuOutcome[o]}
                  </button>
                ))}
              </div>
              <p className="fu-foot">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    ask.onOpen();
                  }}
                >
                  {t.fuOpen}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    ask.onLater();
                  }}
                >
                  {t.fuLater}
                </button>
              </p>
            </section>
          </div>,
          document.body,
        )}
    </>
  );
}
