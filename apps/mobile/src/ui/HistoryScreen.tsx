import { otherTimeZone, recordWhen } from './timeText';
import { useEffect, useState } from 'react';
import { shownQuestion } from '../domain/questionCatalog';
import { STRINGS } from '../domain/i18n';
import type { CastRecord } from '../domain/cast';
import type { History } from '../domain/history';
import type { Journal } from '../domain/journal';
import { RecordDetail } from './RecordDetail';
import { isAsking, localDay, timingOf, type Followups } from '../domain/followup';
import { CoachTip, coach } from './coach';
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

interface Props {
  history: History;
  journal: Journal;
  /** 应期回访 answers. */
  followups: Followups;
  /** Whether the visitor can read a cast's 详断 (its 应期 are part of it). */
  canRead: (castId: string) => boolean;
  /** 应期提醒 is on (the record says it will remind, not only ask in the hall). */
  remindOn?: boolean;
  onFollowup: () => void;
  /** Opens one record's page (from the hall's 回访 card or a reminder). */
  openDetail?: { castId: string; at: number } | null;
  t: Strings;
  onOpen: (r: CastRecord, read?: boolean) => void;
  onBack: () => void;
  active?: boolean;
}

/** A record's 应期 at a glance: answered (应 / 未应 / 难说), due, or nothing to show. */
function followBadge(r: CastRecord, followups: Followups, today: string): 'happened' | 'not' | 'unsure' | 'due' | null {
  const ws = timingOf(r);
  if (!ws.length) return null;
  const answers = followups.answers(r.castId);
  if (ws.some((w) => isAsking(w, today) && !answers[String(w.index)])) return 'due';
  const got = ws.map((w) => answers[String(w.index)]?.outcome).filter(Boolean);
  if (!got.length) return null;
  return got.includes('happened') ? 'happened' : got.every((o) => o === 'not') ? 'not' : 'unsure';
}

export function HistoryScreen({ history, journal, followups, canRead, remindOn = false, onFollowup, openDetail = null, t, onOpen, onBack, active = true }: Props) {
  const [writeError, setWriteError] = useState(false);
  const [all, setAll] = useState(() => history.list());
  const [book, setBook] = useState(() => journal.all());
  const [onlySaved, setOnlySaved] = useState(() => Object.keys(journal.all()).length > 0);
  const refresh = () => {
    setAll(history.list());
    setBook(journal.all());
  };
  const changeRecords = (change: () => void) => {
    try {
      change();
      setWriteError(false);
    } catch {
      setWriteError(true);
    }
    refresh();
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
  const lang = t === STRINGS.en ? 'en' : 'zh';
  // The record whose ⋯ menu is open.
  const [menu, setMenu] = useState<string | null>(null);
  const [detail, setDetail] = useState<CastRecord | null>(null);
  useEffect(() => {
    if (!active) setDetail(null);
  }, [active]);
  // Asked to open one record (回访 card, reminder): straight to its page.
  useEffect(() => {
    if (!openDetail) return;
    const r = history.get(openDetail.castId);
    if (r) setDetail(r);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openDetail]);
  const today = localDay(new Date());
  const tally = followups.tally(all.filter((r) => canRead(r.castId)));
  if (detail)
    return (
      <RecordDetail
        key={detail.castId}
        record={detail}
        journal={journal}
        followups={canRead(detail.castId) ? followups : null}
        remindOn={remindOn}
        t={t}
        onOpen={(read) => onOpen(detail, read)}
        onBack={() => setDetail(null)}
        onChanged={() => {
          refresh();
          onFollowup();
        }}
      />
    );
  return (
    <main className="screen">
      {/* ← and the two lists on one row (the place tab above already says 问事录), so the first record
          comes up sooner under the desk. */}
      <header className="screen-head history-head">
        <button className="icon-btn" onClick={onBack} aria-label={t.back}>
          ←
        </button>
        <h2 className="sr-only">{t.history}</h2>
        <div className="mode-switch history-tabs" role="tablist">
          <button role="tab" aria-selected={!onlySaved} onClick={() => setOnlySaved(false)}>
            {t.bookAll} {all.length}
          </button>
          <button role="tab" aria-selected={onlySaved} onClick={() => setOnlySaved(true)}>
            {t.bookSaved} {Object.keys(book).filter((id) => all.some((r) => r.castId === id)).length}
          </button>
        </div>
        <span className="history-head-pad" />
      </header>
      {/* One line on top, so the first record shows early; storage and export are with 记录管理 below. */}
      <p className="history-explain">{onlySaved ? t.historyExplainSaved : t.historyLead}</p>
      {tally.happened + tally.not + tally.unsure > 0 && <p className="history-tally">{t.fuTally(tally.happened, tally.not, tally.unsure)}</p>}
      {active && all.length > 0 && <CoachTip id="records" t={t} text={t.coachRecords} anchor=".place-panel.is-on .history-main" below />}
      {writeError && <p className="error" role="alert">{t.storageWriteFailed}</p>}
      {items.length === 0 ? (
        <p className="muted center">{onlySaved ? t.bookEmpty : t.emptyHistory}</p>
      ) : (
        <>
          <ul className="history-list">
            {items.map((r) => (
              <li key={r.castId}>
                {/* What was asked and when (two casts of the same matter tell apart at a glance), what the
                    断语 said, and the hexagrams small. */}
                <button
                  className="history-main"
                  onClick={() => {
                    coach.done('records');
                    setMenu(null);
                    setDetail(r);
                  }}
                >
                  <span className="history-top">
                    <span className="history-q">{r.question ? shownQuestion(r.questionId, r.question, lang) : r.stages.primary.name}</span>
                    <time className="history-when" dateTime={r.localWallClock ?? r.createdAt}>
                      {recordWhen(r.localWallClock ?? r.createdAt.slice(0, 16), lang)}
                    </time>
                  </span>
                  {r.judgment?.state === 'ready' && r.judgment.title && <span className="history-verdict">{r.judgment.title}</span>}
                  {(() => {
                    const b = canRead(r.castId) ? followBadge(r, followups, today) : null;
                    return b && <span className={`history-follow is-${b}`}>{t.fuBadge[b]}</span>;
                  })()}
                  <span className="history-meta">
                    {r.stages.primary.name} → {r.stages.mutual.name} → {r.stages.changed.name}
                    {otherTimeZone(r.timeZone) && ` · ${r.timeZone}`}
                  </span>
                  {book[r.castId] && (
                    <span className="history-book">
                      <b>{t.savedToBook}</b>
                      {book[r.castId].notes.length > 0 && <span> · {book[r.castId].notes[book[r.castId].notes.length - 1].text}</span>}
                    </span>
                  )}
                </button>
                {/* 删除 is in the card's menu (it still asks first). */}
                <button
                  type="button"
                  className="history-more"
                  aria-label={t.moreActions}
                  aria-expanded={menu === r.castId}
                  onClick={() => setMenu((m) => (m === r.castId ? null : r.castId))}
                >
                  ⋯
                </button>
                {menu === r.castId && (
                  <div className="history-menu" role="menu">
                    <button
                      type="button"
                      role="menuitem"
                      className="history-delete"
                      onClick={() => {
                        setMenu(null);
                        if (confirm(t.confirmDelete)) {
                          changeRecords(() => {
                            history.remove(r.castId);
                            journal.remove(r.castId);
                            followups.remove(r.castId);
                          });
                          onFollowup();
                        }
                      }}
                    >
                      {t.delete}
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <h3 className="history-manage">{t.historyManage}</h3>
          <p className="privacy">{t.privacy} {t.localHistoryRisk}</p>
          <div className="btn-row">
            <button className="ghost-btn" onClick={() => void shareOrDownload(JSON.stringify({ ...JSON.parse(history.exportJSON()), journal: journal.all() }, null, 2))}>
              {t.exportHistory}
            </button>
            <button
              className="ghost-btn danger"
              onClick={() => {
                if (confirm(t.confirmDeleteAll)) {
                  changeRecords(() => {
                    history.clear();
                    journal.clear();
                    followups.clear();
                  });
                  onFollowup();
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
