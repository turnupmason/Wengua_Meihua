/**
 * 藏经阁: the sixty-four hexagrams, two to a row on a phone (larger figures, readable names),
 * searchable by name, number or text; each opens its own page (HexagramPage).
 */
import { memo, useEffect, useMemo, useState } from 'react';
import type { Collection } from '../domain/daily';
import type { Knowledge } from '../knowledge/knowledge';
import type { Strings } from '../domain/i18n';
import type { Lang } from '../domain/settings';
import { DisplayGradeText } from './text';
import { HexagramPage, type BookTarget } from './HexagramPage';

const TRIGRAM_IMAGE: Record<string, string> = { 乾: '天', 兑: '泽', 离: '火', 震: '雷', 巽: '风', 坎: '水', 艮: '山', 坤: '地' };

interface Props {
  knowledge: Knowledge;
  t: Strings;
  lang: Lang;
  onBack: () => void;
  /** 卦册: the hexagrams met so far (marked, and counted at the top). */
  collection?: Collection;
  /** Changes when 卦册 does (re-reads it). */
  metRev?: number;
  /** A hexagram to open (今日一卦 → 去藏经阁细读), a fresh token each time. */
  openRequest?: { hexagramId: number; at: number } | null;
}

export const LibraryScreen = memo(function LibraryScreen({ knowledge, t, lang, onBack, collection, metRev = 0, openRequest = null }: Props) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState<BookTarget | null>(null);
  useEffect(() => {
    if (openRequest) setPage({ hexagramId: openRequest.hexagramId, line: null });
  }, [openRequest]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const met = useMemo(() => collection?.all() ?? {}, [collection, metRev, page]);
  const metCount = Object.keys(met).length;
  const all = knowledge.library.listHexagrams();
  const list = useMemo(() => {
    const q = query.trim();
    if (!q) return all;
    const n = Number(q);
    return all.filter(
      (h) =>
        (Number.isInteger(n) && h.id === n) ||
        h.name.includes(q) ||
        h.shortName.includes(q) ||
        h.aliases.some((a) => a.includes(q)) ||
        h.reading.text.includes(q) ||
        h.lines.some((l) => l.text.includes(q)),
    );
  }, [all, query]);

  if (page) return <HexagramPage knowledge={knowledge} target={page} t={t} lang={lang} onNavigate={setPage} onBack={() => setPage(null)} />;

  return (
    <main className="screen">
      <header className="screen-head">
        <button className="icon-btn" onClick={onBack} aria-label={t.back}>
          ←
        </button>
        <h2>{t.allHexagrams}</h2>
        <span />
      </header>
      <input className="search" type="search" placeholder={t.searchPlaceholder} value={query} onChange={(e) => setQuery(e.target.value)} aria-label={t.searchPlaceholder} />
      {collection && (
        <section className="book-progress" aria-label={t.bookProgress(metCount)}>
          <p>
            <b>{t.bookProgress(metCount)}</b>
          </p>
          <i className="book-bar" aria-hidden="true">
            <i style={{ width: `${(metCount / 64) * 100}%` }} />
          </i>
          <small>{t.bookProgressNote}</small>
        </section>
      )}
      <p className="grade-note">{t.gradeSourceLong}</p>
      <ul className="hex-grid two">
        {list.map((h) => (
          <li key={h.id}>
            <button className={met[h.id] ? 'is-met' : ''} onClick={() => setPage({ hexagramId: h.id, line: null })}>
              {met[h.id] && <span className="hex-met">{t.metSeal}</span>}
              <span className="hex-sym" aria-hidden="true">
                {h.symbol}
              </span>
              <span className="hex-text">
                <span className="hex-id">{String(h.id).padStart(2, '0')}</span>
                <span className="hex-name">{h.name}</span>
                <span className="hex-tri">
                  {h.upperTrigram}
                  {TRIGRAM_IMAGE[h.upperTrigram]}上 · {h.lowerTrigram}
                  {TRIGRAM_IMAGE[h.lowerTrigram]}下
                </span>
                <DisplayGradeText grade={h.grade} lang={lang} t={t} />
              </span>
            </button>
          </li>
        ))}
      </ul>
      {list.length === 0 && <p className="muted center">{t.searchNone}</p>}
    </main>
  );
});
