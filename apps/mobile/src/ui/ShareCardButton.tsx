/**
 * 分享卦签: draws the card (shareCard.ts), shows it in a 卦签预览, and from there shares it through the
 * system sheet or saves it. One piece for the 卦笺 and the older 读卦 page alike.
 */
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Reading } from '../knowledge/knowledge';
import type { Strings } from '../domain/i18n';
import type { ProductJudgment } from '../domain/judgment';
import { canShareImage, drawCard, saveImage, shareImage } from './shareCard';
import { Exit, EXIT_MS } from './Exit';

interface Props {
  reading: Reading;
  judgment: ProductJudgment;
  /** 事业工作 · 晋升加薪 — the catalog's names, never the visitor's words. */
  field: string;
  castTime: string;
  t: Strings;
  className?: string;
}

export function ShareCardButton({ reading, judgment: j, field, castTime, t, className = 'ghost-btn share-btn' }: Props) {
  const [sharing, setSharing] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ blob: Blob; url: string; name: string } | null>(null);
  useEffect(
    () => () => {
      if (preview) setTimeout(() => URL.revokeObjectURL(preview.url), EXIT_MS + 100);
    },
    [preview],
  );
  return (
    <>
      <button
        type="button"
        className={className}
        disabled={sharing}
        onClick={async () => {
          setSharing(true);
          try {
            const s = reading.stages;
            const blob = await drawCard({
              appName: t.appName,
              field,
              stages: [
                { caption: t.stageNow, name: s.primary.name, bits: s.primary.bitsBottomUp, moving: reading.movingLine },
                { caption: t.stageMid, name: s.mutual.name, bits: s.mutual.bitsBottomUp },
                { caption: t.stageEnd, name: s.changed.name, bits: s.changed.bitsBottomUp },
              ],
              title: j.title || j.short,
              short: j.title ? j.short : '',
              when: castTime,
              foot: t.shareFoot,
            });
            // First a look at the card; sharing or saving is chosen there.
            setNote(null);
            setPreview({ blob, url: URL.createObjectURL(blob), name: `wengua-${s.primary.name}.png` });
          } catch {
            setNote(t.shareFailed);
          } finally {
            setSharing(false);
          }
        }}
      >
        {t.shareCard}
      </button>
      {note && <p className="save-note share-note" role="status">{note}</p>}
      {createPortal(
        <Exit show={!!preview}>
          {preview && (
            <div className="sheet-backdrop share-backdrop" onClick={() => setPreview(null)}>
              <section className="share-preview" role="dialog" aria-modal="true" aria-label={t.sharePreviewTitle} onClick={(e) => e.stopPropagation()}>
                <header className="share-head">
                  <h3>{t.sharePreviewTitle}</h3>
                  <button type="button" className="icon-btn" onClick={() => setPreview(null)} aria-label={t.close}>
                    ✕
                  </button>
                </header>
                <img className="share-image" src={preview.url} alt={t.sharePreviewAlt} />
                <p className="share-hint">{t.shareHoldHint}</p>
                <div className="share-actions">
                  {canShareImage(preview.blob, preview.name) && (
                    <button
                      type="button"
                      className="share-go"
                      onClick={async () => {
                        const r = await shareImage(preview.blob, preview.name);
                        if (r === 'shared') setPreview(null);
                        if (r === 'failed') setNote(t.shareFailed);
                      }}
                    >
                      {t.shareSend}
                    </button>
                  )}
                  <button
                    type="button"
                    className="share-save"
                    onClick={() => {
                      saveImage(preview.blob, preview.name);
                      setNote(t.shareSaved);
                      setPreview(null);
                    }}
                  >
                    {t.shareSaveImage}
                  </button>
                </div>
              </section>
            </div>
          )}
        </Exit>,
        document.body,
      )}
    </>
  );
}
