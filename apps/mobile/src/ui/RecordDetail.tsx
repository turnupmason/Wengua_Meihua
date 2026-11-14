/**
 * 问事录 · one record, in the order it happened: what was asked → the hexagrams cast → the
 * reading as it was given then (frozen; never rewritten) → what happened later (notes appended
 * with their own dates). The original and the follow-up stay visibly separate.
 */
import { otherTimeZone } from './timeText';
import { useState } from 'react';
import type { CastRecord } from '../domain/cast';
import type { Journal } from '../domain/journal';
import type { Strings } from '../domain/i18n';
import { topicById } from '../domain/topics';
import { recordKind } from '../domain/cast';
import { questionById, shownQuestion, subtypeById } from '../domain/questionCatalog';
import { STRINGS } from '../domain/i18n';
import { hasBegun, localDay, timingOf, type Followups, type Outcome } from '../domain/followup';
import { windowBody, windowDates } from '../domain/judgment';

/** 11月22日 / 11/22, device time. */
const dayOf = (iso: string, lang: 'zh' | 'en') => {
  const d = new Date(iso);
  return lang === 'en' ? `${d.getMonth() + 1}/${d.getDate()}` : `${d.getMonth() + 1}月${d.getDate()}日`;
};

const when = (iso: string) => {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

interface Props {
  record: CastRecord;
  journal: Journal;
  /** 应期回访 answers; null when the visitor cannot read this cast's 详断 (its 应期 are part of it). */
  followups?: Followups | null;
  /** 应期提醒 is on. */
  remindOn?: boolean;
  t: Strings;
  /** Opens the cast again: on the stone (观卦), or with `read` straight on its 断语 (读卦). */
  onOpen: (read?: boolean) => void;
  onBack: () => void;
  onChanged: () => void;
}

export function RecordDetail({ record: r, journal, followups = null, remindOn = false, t, onOpen, onBack, onChanged }: Props) {
  const [note, setNote] = useState('');
  const [saveError, setSaveError] = useState(false);
  const [entry, setEntry] = useState(() => journal.get(r.castId));
  const tp = topicById(r.topicId);
  const s = r.snapshot;
  const legacy = recordKind(r) === 'legacy-free-text';
  const sub = subtypeById(questionById(r.questionId)?.subtype_id ?? r.subtypeId);
  const j = r.judgment;
  const lang = t === STRINGS.en ? 'en' : 'zh';
  // 应期回访: what the reading said for each 应期, and what the visitor recorded after.
  const windows = followups ? timingOf(r) : [];
  const [answers, setAnswers] = useState(() => (followups ? followups.answers(r.castId) : {}));
  const today = localDay(new Date());
  const answer = (index: number, o: Outcome | null) => {
    if (!followups) return;
    try {
      followups.answer(r.castId, index, o);
      setAnswers(followups.answers(r.castId));
      setSaveError(false);
      onChanged();
    } catch {
      setSaveError(true);
    }
  };
  return (
    <article className="record-detail">
      <header className="screen-head">
        <button className="icon-btn" onClick={onBack} aria-label={t.back}>
          ←
        </button>
        <h2>{t.history}</h2>
        <span />
      </header>

      <section className="rd-step">
        <h3>
          <i>1</i>
          {t.rdAsked}
        </h3>
        <p className="rd-q">{r.question ? `“${shownQuestion(r.questionId, r.question, t === STRINGS.en ? 'en' : 'zh')}”` : t.noQuestion}</p>
        <p className="rd-meta">
          {tp ? `${tp.zh} · ` : ''}
          {/* The entry is the question (求职录用): not repeated when it is the line above. */}
          {sub && sub.label.zh !== r.question ? `${sub.label.zh} · ` : ''}
          {(r.localWallClock ?? r.createdAt).replace('T', ' ').slice(0, 16)}
          {otherTimeZone(r.timeZone) && ` · ${r.timeZone}`}
        </p>
        {legacy && <p className="rd-meta">{t.legacyRecord}</p>}
      </section>

      <section className="rd-step">
        <h3>
          <i>2</i>
          {t.rdCast}
        </h3>
        <p className="rd-hex">
          {r.stages.primary.name} <span>→</span> {r.stages.mutual.name} <span>→</span> {r.stages.changed.name}
        </p>
        <p className="rd-meta">{t.rdMoving(r.movingLine)}</p>
      </section>

      <section className="rd-step rd-frozen">
        <h3>
          <i>3</i>
          {t.rdReading}
          <small>{t.rdFrozen}</small>
        </h3>
        {j?.state === 'ready' && (
          <>
            {j.title && (
              <p className="rd-head">
                <b>{j.title}</b>
              </p>
            )}
            <p className="rd-conclusion">{j.short}</p>
            <p className="rd-meta">{t.rdJudgmentAtCast(j.monthBranch)}</p>
          </>
        )}
        {j?.state === 'missing' && <p className="rd-meta">{t.rdJudgmentMissingAtCast}</p>}
        {s ? (
          <>
            {/* Under a written 断语 the rule-only structure (which ignores 旺衰) is not repeated: it can contradict it. */}
            {j?.state !== 'ready' && (
              <>
                {!legacy && <h4 className="rd-sub">{t.structuralTitle}</h4>}
                <p className="rd-head">
                  <b>{s.headline}</b> {s.leadText && <span>{s.leadText}</span>}
                </p>
                <p className="rd-conclusion">{s.conclusion}</p>
                <ul className="rd-stages">
                  {s.stages.map((x) => (
                    <li key={x.stage}>
                      <b>{x.scope}</b> {x.label} · {x.evidence}
                    </li>
                  ))}
                </ul>
              </>
            )}
            {legacy && <p className="rd-meta">{t.rdJudgmentNone}</p>}
          </>
        ) : (
          <p className="rd-meta">{t.rdNoSnapshot}</p>
        )}
        {/* Straight to the whole 断语, or back to the stone. */}
        <div className="btn-row">
          {j?.state === 'ready' && (
            <button className="primary-btn" onClick={() => onOpen(true)}>
              {t.rdOpenReading}
            </button>
          )}
          <button className="ghost-btn" onClick={() => onOpen(false)}>
            {t.rdOpenStone}
          </button>
        </div>
      </section>

      <section className="rd-step">
        <h3>
          <i>4</i>
          {t.rdLater}
        </h3>
        {windows.length > 0 && j?.state === 'ready' && (
          <div className="fu-record" aria-label={t.fuTitle}>
            <h4 className="rd-sub">{t.fuTitle}</h4>
            <ul>
              {windows.map((w) => {
                const a = answers[String(w.index)];
                const around = windowBody(w.text).around;
                const when = windowDates(w.dates, j.castingDate, lang);
                return (
                  <li key={w.index} className={w.valence === '吉' ? 'is-good' : w.valence === '凶' ? 'is-bad' : ''}>
                    <p className="fu-then">
                      <b>{t.fuThen}</b>
                      <span>
                        {around ? (lang === 'en' ? `around ${when}` : `${when}前后`) : when} · <span lang="zh">{w.event}</span>
                        {w.valence && <i className="timing-tag">{w.valence}</i>}
                      </span>
                    </p>
                    <div className="fu-after">
                      <b>{t.fuAfter}</b>
                      {a ? (
                        <span>
                          <em className={`fu-outcome is-${a.outcome}`}>{t.fuRecorded(t.fuOutcome[a.outcome], dayOf(a.at, lang))}</em>
                          <button type="button" className="fu-redo" onClick={() => answer(w.index, null)}>
                            {t.fuRedo}
                          </button>
                        </span>
                      ) : hasBegun(w, today) ? (
                        <span className="fu-answers" role="group" aria-label={t.fuAsk}>
                          {(['happened', 'not', 'unsure'] as const).map((o) => (
                            <button type="button" key={o} className={`fu-answer is-${o}`} onClick={() => answer(w.index, o)}>
                              {t.fuOutcome[o]}
                            </button>
                          ))}
                        </span>
                      ) : (
                        <span className="rd-meta">{remindOn ? t.fuNotYetRemind : t.fuNotYet}</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        {entry && entry.notes.length > 0 ? (
          <ol className="journal-notes">
            {entry.notes.map((n) => (
              <li key={n.at}>
                <time>{when(n.at)}</time>
                <p>{n.text}</p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="rd-meta">{t.rdNoNotes}</p>
        )}
        <label className="journal-label">
          {t.bookNoteLabel}
          <textarea value={note} maxLength={2000} rows={2} placeholder={t.bookNotePlaceholder} onChange={(e) => setNote(e.target.value)} />
        </label>
        {saveError && <p className="error" role="alert">{t.storageWriteFailed}</p>}
        <div className="btn-row">
          <button
            className="primary-btn"
            disabled={!note.trim()}
            onClick={() => {
              try {
                setEntry(journal.save(r.castId, note));
                setNote('');
                setSaveError(false);
                onChanged();
              } catch {
                setSaveError(true);
              }
            }}
          >
            {t.rdAddNote}
          </button>
        </div>
      </section>
    </article>
  );
}
