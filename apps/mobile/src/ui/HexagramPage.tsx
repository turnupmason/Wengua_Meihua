/**
 * 藏经阁 · one hexagram's page: the figure and its trigrams, 卦辞 and 象传 with vernacular, all six
 * lines (each with its text, 小象, vernacular and the hexagram it changes into), the mutual
 * hexagram, and where the text comes from. Opened from the 藏经阁 shelf or straight from a reading's
 * evidence, in which case the line used by the reading is marked and scrolled to.
 */
import { useEffect, useRef } from 'react';
import type { Knowledge } from '../knowledge/knowledge';
import type { Strings } from '../domain/i18n';
import type { Lang } from '../domain/settings';
import { HexagramSVG } from './HexagramSVG';
import { DisplayGradeText } from './text';

const TRIGRAM_IMAGE: Record<string, string> = { 乾: '天', 兑: '泽', 离: '火', 震: '雷', 巽: '风', 坎: '水', 艮: '山', 坤: '地' };

export interface BookTarget {
  hexagramId: number;
  /** Line to mark and scroll to (1 = bottom). */
  line: number | null;
  /** Why it is open, e.g. 「本次问事：本卦九二动」. */
  context?: string;
  /** What this reading drew from here (shown under the context). */
  evidence?: string[];
}

interface Props {
  knowledge: Knowledge;
  target: BookTarget;
  t: Strings;
  lang: Lang;
  onNavigate: (target: BookTarget) => void;
  onBack: () => void;
}

export function HexagramPage({ knowledge, target, t, lang, onNavigate, onBack }: Props) {
  const lib = knowledge.library;
  const h = lib.getHexagram(target.hexagramId);
  const mutual = lib.getMutualHexagram(h.id);
  const lineRefs = useRef<(HTMLElement | null)[]>([]);
  const top = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = target.line ? lineRefs.current[target.line] : null;
    if (el) el.scrollIntoView?.({ block: 'center' });
    else top.current?.scrollIntoView?.({ block: 'start' });
  }, [target.hexagramId, target.line]);
  const src = (ref: { startLine: number; endLine: number }) => t.bookSourceLines(ref.startLine, ref.endLine);

  return (
    <article className="hex-page" aria-labelledby={`hp-${h.id}`}>
      <div ref={top} />
      <header className="hex-page-head">
        <button className="icon-btn" onClick={onBack} aria-label={t.back}>
          ←
        </button>
        <p className="hex-page-kicker">{t.library}</p>
        <span />
      </header>
      {target.context && (
        <div className="hex-page-context">
          <p>{target.context}</p>
          {target.evidence && target.evidence.length > 0 && (
            <ul>
              {target.evidence.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      <section className="hex-page-title">
        <HexagramSVG bits={h.bitsBottomUp} hexagramId={h.id} title={h.name} movingLine={target.line} width={88} />
        <div>
          <p className="hex-page-no">{String(h.id).padStart(2, '0')}</p>
          <h2 id={`hp-${h.id}`}>{h.name}</h2>
          <p className="hex-page-tri">
            {h.upperTrigram}
            {TRIGRAM_IMAGE[h.upperTrigram]}上 · {h.lowerTrigram}
            {TRIGRAM_IMAGE[h.lowerTrigram]}下
          </p>
          <DisplayGradeText grade={h.grade} lang={lang} t={t} />
          <p className="hex-page-gradenote">{t.gradeSource}</p>
        </div>
      </section>

      <section className="hex-page-block">
        <h3>{t.bookJudgment}</h3>
        <p className="classical">{h.reading.text}</p>
        {h.reading.vernacular && <p className="hex-page-vern">{h.reading.vernacular}</p>}
        <h3>{t.bookImage}</h3>
        <p className="classical small">{h.reading.image}</p>
        {h.reading.imageVernacular && <p className="hex-page-vern">{h.reading.imageVernacular}</p>}
        <p className="hex-page-src">
          {src(h.sourceRef)}
          {h.referenceUrl && (
            <>
              {' · '}
              <a href={h.referenceUrl} target="_blank" rel="noreferrer">
                {t.bookWikisource}
              </a>
            </>
          )}
        </p>
      </section>

      <section className="hex-page-block">
        <h3>{t.bookLines}</h3>
        <ol className="hex-lines">
          {h.lines.map((l, i) => {
            const pos = i + 1;
            const changed = lib.getChangedHexagram(h.id, pos);
            return (
              <li key={l.id} ref={(el) => void (lineRefs.current[pos] = el)} className={target.line === pos ? 'is-target' : ''}>
                <p className="hex-line-head">
                  <b>{l.label}</b>
                  <button type="button" className="text-btn" onClick={() => onNavigate({ hexagramId: changed.id, line: null })}>
                    {t.bookChangesTo(changed.name)}
                  </button>
                </p>
                <p className="classical small">{l.text}</p>
                {l.vernacular && <p className="hex-page-vern">{l.vernacular}</p>}
                {l.image && <p className="hex-page-xiang">{l.image}</p>}
              </li>
            );
          })}
          {h.specialLines.map((l) => (
            <li key={l.id}>
              <p className="hex-line-head">
                <b>{l.label}</b>
              </p>
              <p className="classical small">{l.text}</p>
              {l.vernacular && <p className="hex-page-vern">{l.vernacular}</p>}
            </li>
          ))}
        </ol>
      </section>

      <section className="hex-page-block">
        <h3>{t.bookRelated}</h3>
        <p className="hex-page-rel">
          {t.stage_mutual}：
          <button type="button" className="text-btn" onClick={() => onNavigate({ hexagramId: mutual.id, line: null })}>
            {mutual.name}
          </button>
          <small> {t.bookMutualNote}</small>
        </p>
      </section>
    </article>
  );
}
