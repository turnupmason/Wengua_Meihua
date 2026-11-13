/**
 * A small tip for a tapped line on the stone (the line glows; the tip sits below the table): which line it is, the first words of its text,
 * and one tap to open the full 爻辞. Keeps the stone visible instead of covering it with a panel.
 */
import type { Knowledge, Reading } from '../knowledge/knowledge';
import type { Selection } from '../scene/StoneTable';
import type { Strings } from '../domain/i18n';
import { sceneInsets } from '../scene/insets';

export function LineTip({ tip, knowledge, reading, t, onOpen }: { tip: { sel: Selection; at: [number, number] }; knowledge: Knowledge; reading: Reading; t: Strings; onOpen: () => void }) {
  const { sel, at } = tip;
  const h = knowledge.library.getHexagram(sel.hexagramId);
  const line = sel.linePosition ? h.lines[sel.linePosition - 1] : null;
  const moving = sel.stage === 'primary' && sel.linePosition === reading.movingLine;
  const text = line ? (line.text.length > 14 ? `${line.text.slice(0, 14)}…` : line.text) : h.reading.text;
  void at;
  // Docked in the free strip between the stone and the 「查看断语」 bar, so it never covers a line;
  // the tapped line itself glows on the stone.
  const style = { bottom: sceneInsets.footerPx + 6 };
  return (
    <div className="line-tip" style={style} role="status">
      <p className="line-tip-head">
        <b>{line ? line.label : h.name}</b>
        <span>
          {t[`stage_${sel.stage === 'library' ? 'primary' : sel.stage}`]} {h.name}
        </span>
        {moving && <em>{t.movingLineBadge}</em>}
      </p>
      <p className="line-tip-text">{text}</p>
      {/* What this place in the hexagram stands for, in plain words (初爻 the start … 上爻 the end). */}
      {sel.linePosition ? <p className="line-tip-place">{`${line?.label ?? ''} · ${t.linePlace[sel.linePosition - 1]}`}</p> : null}
      <button type="button" className="line-tip-open" onClick={onOpen}>
        {t.openLineText}
      </button>
    </div>
  );
}
