/**
 * 今日一卦 in the hall: one slim line under the top bar until it is opened that day; the card shows
 * the hexagram, its 卦辞 and 象 in plain words, and the moving line, to think on — no question, no
 * prediction, not counted.
 */
import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { Strings } from '../domain/i18n';
import { HexagramSVG } from './HexagramSVG';

export interface DailyView {
  id: number;
  name: string;
  theme: string;
  bits: readonly number[];
  text: string;
  vernacular: string;
  imageVernacular: string;
  movingLine: number;
  line: { label: string; text: string; vernacular: string };
  timeLabel: string;
  /** Already opened today: the hall stops offering it. */
  seen: boolean;
  onSeen: () => void;
  /** Its page in 藏经阁. */
  onRead: () => void;
}

export function DailyCard({ t, daily }: { t: Strings; daily: DailyView | null }) {
  const [open, setOpen] = useState(false);
  if (!daily || (daily.seen && !open)) return null;
  const close = () => {
    setOpen(false);
    daily.onSeen();
  };
  return (
    <>
      <button type="button" className="followup-strip daily-strip" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <b>{t.dailyKicker}</b>
        <span>{daily.name}</span>
        <em aria-hidden="true">›</em>
      </button>
      {open &&
        createPortal(
          <div className="sheet-backdrop followup-backdrop" onClick={close}>
            <section className="followup-pop daily-pop" role="dialog" aria-modal="true" aria-label={t.dailyKicker} onClick={(e) => e.stopPropagation()}>
              <p className="fu-kicker">
                <b>{t.dailyKicker}</b>
                <span>{daily.timeLabel}</span>
              </p>
              <div className="daily-head">
                <HexagramSVG bits={daily.bits} hexagramId={daily.id} title={daily.name} movingLine={daily.movingLine} width={64} />
                <div>
                  <h3>{daily.name}</h3>
                  {daily.theme && <p className="daily-theme">{daily.theme}</p>}
                </div>
              </div>
              <div className="daily-body">
                <p className="daily-classic" lang="zh">{daily.text}</p>
                <p lang="zh">{daily.vernacular}</p>
                <p className="daily-line" lang="zh">
                  <b>{daily.line.label}</b>
                  {daily.line.text}
                </p>
                <p lang="zh">{daily.line.vernacular}</p>
              </div>
              <p className="daily-note">{t.dailyNote}</p>
              <p className="fu-foot">
                <button
                  type="button"
                  onClick={() => {
                    close();
                    daily.onRead();
                  }}
                >
                  {t.dailyRead}
                </button>
                <button type="button" className="daily-ok" onClick={close}>
                  {t.coachOk}
                </button>
              </p>
            </section>
          </div>,
          document.body,
        )}
    </>
  );
}
