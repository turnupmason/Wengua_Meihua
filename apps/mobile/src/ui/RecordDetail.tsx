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

const when = (iso: string) => {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

interface Props {
  record: CastRecord;
  journal: Journal;
  t: Strings;
  onOpen: () => void;
  onBack: () => void;
  onChanged: () => void;
}

export function RecordDetail({ record: r, journal, t, onOpen, onBack, onChanged }: Props) {
  const [note, setNote] = useState('');
  const [saveError, setSaveError] = useState(false);
  const [entry, setEntry] = useState(() => journal.get(r.castId));
  const tp = topicById(r.topicId);
  const s = r.snapshot;
  const legacy = recordKind(r) === 'legacy-free-text';
  const sub = subtypeById(questionById(r.questionId)?.subtype_id ?? r.subtypeId);
  const j = r.judgment;
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
            <p className="rd-meta">{t.rdVersion(s.ruleId, r.contentVersion)}</p>
            {legacy && <p className="rd-meta">{t.rdJudgmentNone}</p>}
          </>
        ) : (
          <p className="rd-meta">{t.rdNoSnapshot}</p>
        )}
      </section>

      <section className="rd-step">
        <h3>
          <i>4</i>
          {t.rdLater}
        </h3>
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
          <button className="ghost-btn" onClick={onOpen}>
            {t.rdOpen}
          </button>
        </div>
      </section>
    </article>
  );
}
