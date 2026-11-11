/**
 * 收卦入册: keep this cast in the 卦册 (question, time, hexagrams and reading are already in the
 * cast record) and, now or later, note what actually happened — to compare with the reading.
 */
import { useState } from 'react';
import type { Strings } from '../domain/i18n';
import type { JournalEntry } from '../domain/journal';

interface Props {
  t: Strings;
  title: string;
  entry: JournalEntry | null;
  onSave: (note: string) => void;
  onRemove: () => void;
  onClose: () => void;
}

/** Local wall-clock time of a saved moment, e.g. 2026-11-11 09:29. */
const when = (iso: string) => {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

export function JournalSheet({ t, title, entry, onSave, onRemove, onClose }: Props) {
  const [note, setNote] = useState('');
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <section className="sheet journal-sheet" role="dialog" aria-label={t.saveToBook} onClick={(e) => e.stopPropagation()}>
        <header className="sheet-head">
          <div>
            <p className="sheet-kicker">{title}</p>
            <h2>{entry ? t.savedToBook : t.saveToBook}</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label={t.close}>
            ✕
          </button>
        </header>
        <div className="sheet-body">
          {entry && (
            <p className="muted">
              {t.bookSavedAt} {when(entry.savedAt)}
            </p>
          )}
          {entry && entry.notes.length > 0 && (
            <ol className="journal-notes" aria-label={t.bookNotes}>
              {entry.notes.map((n) => (
                <li key={n.at}>
                  <time>{when(n.at)}</time>
                  <p>{n.text}</p>
                </li>
              ))}
            </ol>
          )}
          <label className="journal-label">
            {t.bookNoteLabel}
            <textarea value={note} maxLength={2000} rows={3} placeholder={t.bookNotePlaceholder} onChange={(e) => setNote(e.target.value)} />
          </label>
          <div className="btn-row">
            <button
              className="primary-btn"
              disabled={!!entry && !note.trim()}
              onClick={() => {
                onSave(note);
                setNote('');
              }}
            >
              {entry ? t.bookUpdate : t.bookSave}
            </button>
            {entry && (
              <button className="ghost-btn danger" onClick={onRemove}>
                {t.bookRemove}
              </button>
            )}
          </div>
          <p className="privacy">{t.privacy}</p>
        </div>
      </section>
    </div>
  );
}
