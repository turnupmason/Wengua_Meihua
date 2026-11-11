import { useEffect, useState } from 'react';
import type { CastRecord } from '../domain/cast';
import type { History } from '../domain/history';
import type { Journal } from '../domain/journal';
import { RecordDetail } from './RecordDetail';
import type { Strings } from '../domain/i18n';

async function shareOrDownload(json: string) {
  const name = `wengua-history-${new Date().toISOString().slice(0, 10)}.json`;
  const blob = new Blob([json], { type: 'application/json' });
  try {
    const file = new File([blob], name, { type: 'application/json' });
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (nav.canShare?.({ files: [file] })) {
      await nav.share({ files: [file], title: name });
      return;
    }
  } catch {
    /* fall through to download */
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function HistoryScreen({ history, journal, t, onOpen, onBack, active = true }: { history: History; journal: Journal; t: Strings; onOpen: (r: CastRecord) => void; onBack: () => void; active?: boolean }) {
  const [all, setAll] = useState(() => history.list());
  const [book, setBook] = useState(() => journal.all());
  const [onlySaved, setOnlySaved] = useState(() => Object.keys(journal.all()).length > 0);
  const refresh = () => {
    setAll(history.list());
    setBook(journal.all());
  };
  // Kept mounted in the hall: re-read when the visitor comes back to 问事录.
  useEffect(() => {
    if (!active) return;
    // After the panel has slid in, so the slide itself never waits on reading storage.
    const id = window.setTimeout(refresh, 650);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
  const items = onlySaved ? all.filter((r) => book[r.castId]) : all;
  const [detail, setDetail] = useState<CastRecord | null>(null);
  useEffect(() => {
    if (!active) setDetail(null);
  }, [active]);
  if (detail) return <RecordDetail key={detail.castId} record={detail} journal={journal} t={t} onOpen={() => onOpen(detail)} onBack={() => setDetail(null)} onChanged={refresh} />;
  return (
    <main className="screen">
      <header className="screen-head">
        <button className="icon-btn" onClick={onBack} aria-label={t.back}>
          ←
        </button>
        <h2>{t.history}</h2>
        <span />
      </header>
      <div className="mode-switch history-tabs" role="tablist">
        <button role="tab" aria-selected={!onlySaved} onClick={() => setOnlySaved(false)}>
          {t.bookAll} {all.length}
        </button>
        <button role="tab" aria-selected={onlySaved} onClick={() => setOnlySaved(true)}>
          {t.bookSaved} {Object.keys(book).filter((id) => all.some((r) => r.castId === id)).length}
        </button>
      </div>
      <p className="history-explain">{onlySaved ? t.historyExplainSaved : t.historyExplainAll}</p>
      <p className="privacy">{t.privacy}</p>
      {items.length === 0 ? (
        <p className="muted center">{onlySaved ? t.bookEmpty : t.emptyHistory}</p>
      ) : (
        <>
          <ul className="history-list">
            {items.map((r) => (
              <li key={r.castId}>
                <button className="history-main" onClick={() => setDetail(r)}>
                  <span className="history-names">
                    {r.stages.primary.name} → {r.stages.mutual.name} → {r.stages.changed.name}
                  </span>
                  <span className="history-meta">
                    {r.localWallClock?.replace('T', ' ') ?? r.createdAt} · {r.timeZone}
                  </span>
                  {r.question && <span className="history-q">“{r.question}”</span>}
                  {book[r.castId] && (
                    <span className="history-book">
                      <b>{t.savedToBook}</b>
                      {book[r.castId].notes.length > 0 && <span> · {book[r.castId].notes[book[r.castId].notes.length - 1].text}</span>}
                    </span>
                  )}
                </button>
                <button
                  className="text-btn danger"
                  onClick={() => {
                    if (confirm(t.confirmDelete)) {
                      history.remove(r.castId);
                      journal.remove(r.castId);
                      refresh();
                    }
                  }}
                >
                  {t.delete}
                </button>
              </li>
            ))}
          </ul>
          <div className="btn-row">
            <button className="ghost-btn" onClick={() => void shareOrDownload(JSON.stringify({ ...JSON.parse(history.exportJSON()), journal: journal.all() }, null, 2))}>
              {t.exportHistory}
            </button>
            <button
              className="ghost-btn danger"
              onClick={() => {
                if (confirm(t.confirmDeleteAll)) {
                  history.clear();
                  journal.clear();
                  refresh();
                }
              }}
            >
              {t.deleteAll}
            </button>
          </div>
        </>
      )}
    </main>
  );
}
