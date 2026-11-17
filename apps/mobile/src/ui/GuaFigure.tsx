/**
 * One hexagram as drawn on paper (卦笺, 研习与校订): six lines, the first at the bottom, the moving
 * line in cinnabar. On a 本卦 the marks are drawn inside the same picture, so they scale with it and
 * sit exactly where they belong (2026-11-15, the user: the circle and 体用 had drifted): 体 and 用 in
 * small frames beside their trigrams with the trigram and element under them (坤土), and a small
 * arrow at the moving line with 「动爻」 beside it.
 */
import { assessSeasonalQi, resolveMonthSlot } from '@knowledge';
import type { Reading } from '../knowledge/knowledge';
import type { Strings } from '../domain/i18n';

export interface GuaMark {
  /** 体 or 用 */
  role: string;
  /** The trigram and its element: 坤土 */
  name: string;
}

/** Centre (in the figure's units) of line `i` (0 = bottom), and of each trigram. */
const lineY = (i: number) => 57 - i * 11;
const TRIGRAM_Y = { upper: lineY(4), lower: lineY(1) };

export function GuaFigure({
  bits,
  moving = null,
  upper,
  lower,
  movingLabel,
  compact = false,
}: {
  bits: readonly number[];
  moving?: number | null;
  upper?: GuaMark;
  lower?: GuaMark;
  /** The word beside the arrow (动爻); without it there is no arrow. */
  movingLabel?: string;
  /** Small figures: the frames and the arrow only, no trigram names or words. */
  compact?: boolean;
}) {
  const marked = !!(upper || lower);
  const arrow = marked && moving !== null && (movingLabel || compact);
  // Room on the left for 体 / 用, on the right for the arrow and its word.
  const left = marked ? (compact ? 30 : 26) : 0;
  const right = arrow ? (compact ? 14 : 36) : 0;
  const role = (m: GuaMark | undefined, cy: number) =>
    m && (
      <g className="gua-role">
        {compact ? (
          <>
            <rect x={-28} y={cy - 9.5} width={20} height={19} rx={2} />
            <text x={-18} y={cy + 5.5}>{m.role}</text>
          </>
        ) : (
          <>
            <rect x={-24} y={cy - 14} width={15} height={13} rx={1.5} />
            <text x={-16.5} y={cy - 4}>{m.role}</text>
          </>
        )}
        {!compact && (
          <text className="gua-role-name" x={-16.5} y={cy + 9}>
            {m.name}
          </text>
        )}
      </g>
    );
  return (
    <svg className={`jian-gua ${marked ? 'has-marks' : ''} ${compact ? 'is-compact' : ''}`} viewBox={`${-left} -3 ${60 + left + right} 68`} aria-hidden="true">
      {bits.map((b, i) => (
        <g key={i} className={`jian-yao ${moving === i + 1 ? 'is-moving' : ''}`}>
          {b ? <rect x="0" y={lineY(i) - 3} width="60" height="6" /> : (
            <>
              <rect x="0" y={lineY(i) - 3} width="26" height="6" />
              <rect x="34" y={lineY(i) - 3} width="26" height="6" />
            </>
          )}
        </g>
      ))}
      {role(upper, TRIGRAM_Y.upper)}
      {role(lower, TRIGRAM_Y.lower)}
      {arrow && moving !== null && (
        <g className="gua-moving">
          <path d={`M63.5 ${lineY(moving - 1)} l5 -3.2 v6.4 z`} />
          <path className="gua-moving-stem" d={`M68 ${lineY(moving - 1)} h${compact ? 5 : 6}`} />
          {!compact && movingLabel && (
            <text x={76} y={lineY(moving - 1) + 3.3}>
              {movingLabel}
            </text>
          )}
        </g>
      )}
    </svg>
  );
}

/** 体 and 用 of a reading's 本卦, placed on its upper and lower trigrams. */
export function bodyUseMarks(t: Strings, r: Reading): { upper: GuaMark; lower: GuaMark } {
  const body = { role: t.jianBody, name: `${r.body.trigram}${r.body.element}` };
  const use = { role: t.jianUse, name: `${r.use.trigram}${r.use.element}` };
  return r.body.side === 'upper' ? { upper: body, lower: use } : { upper: use, lower: body };
}

/** 旺相休囚死 of an element in a month (the full five states). */
export function qiOf(element: string, monthBranch: string | null | undefined): string {
  if (!monthBranch) return '';
  try {
    const order = resolveMonthSlot({ monthBranch: monthBranch as never })?.qi;
    return order ? assessSeasonalQi(element as never, order).state : '';
  } catch {
    return '';
  }
}

/** The chart's 体用 in a line: 体 巽木（相）· 用 坎水（旺）· 用生体. */
export function tiyongLine(t: Strings, r: Reading, month: string | null | undefined) {
  const b = r.body;
  const u = r.use;
  const edge = r.edges.find((e) => e.targetRole === 'use');
  const tag = (s: string) => (s ? `（${s}）` : '');
  return `${t.jianBody} ${b.trigram}${b.element}${tag(qiOf(b.element, month))} · ${t.jianUse} ${u.trigram}${u.element}${tag(qiOf(u.element, month))}${edge ? ` · ${edge.label}` : ''}`;
}
