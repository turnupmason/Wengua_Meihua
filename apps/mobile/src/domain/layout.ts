/**
 * Shared hexagram geometry for 3D and 2D. Positions are 1..6 bottom-up; position 1 is always
 * drawn lowest on screen. Callers never treat an array index as a line position.
 *
 * The stone table is read from its near end (the seat). The three hexagrams lie in bands from
 * near to far — 本卦 (目前) nearest, then 互卦 (经过), then 变卦 (结果) — which fits a portrait
 * phone. All values are metres on the table top: x to the right, z toward the viewer.
 */
export const HEX_LAYOUT = Object.freeze({
  tableWidth: 1.5,
  tableDepth: 2.6,
  lineWidth: 0.44,
  lineDepth: 0.062,
  slot: 0.1, // centre-to-centre distance between lines
  yinGap: 0.09,
  bandHeight: 0.7,
  /** Columns across each band (x centres and widths). */
  captionX: -0.6,
  captionWidth: 0.2,
  dividerX: -0.47,
  tagX: -0.33,
  tagWidth: 0.22,
  arrowX: -0.2,
  hexX: 0.08,
  /** Cinnabar ○ / × beside the moving line. */
  markX: 0.34,
  nameX: 0.44,
  nameWidth: 0.15,
  gradeX: 0.62,
  gradeWidth: 0.13,
  /** Relation strip nearest the seat. */
  relationZ: 1.08,
  relationHeight: 0.2,
});

export const STAGE_ORDER = ['primary', 'mutual', 'changed'] as const;
export type StageKey = (typeof STAGE_ORDER)[number];

/** Band centre (depth) for each stage: nearest first. */
const BAND_Z: Record<StageKey, number> = { primary: 0.6, mutual: -0.14, changed: -0.88 };
export function stageCenterZ(stage: StageKey): number {
  return BAND_Z[stage];
}

export interface LineSlot {
  position: number; // 1..6, bottom-up
  yang: boolean;
  /** Offset along the table's depth axis; larger = nearer the viewer = lower on screen. */
  depthOffset: number;
  /** For 2D SVG: y grows downward, so position 1 has the largest y. */
  svgY: number;
}

export function lineSlots(bitsBottomUp: readonly number[]): LineSlot[] {
  if (bitsBottomUp.length !== 6) throw new TypeError('Six bottom-up bits required');
  return bitsBottomUp.map((bit, index) => {
    const position = index + 1;
    return {
      position,
      yang: bit === 1,
      depthOffset: (3.5 - position) * HEX_LAYOUT.slot,
      svgY: 10 + (6 - position) * 26,
    };
  });
}

/** Depth offset of a trigram's middle line (2 for lower, 5 for upper), relative to the band centre. */
export function trigramDepth(side: 'lower' | 'upper'): number {
  return (3.5 - (side === 'lower' ? 2 : 5)) * HEX_LAYOUT.slot;
}

/** The trigram a line belongs to. */
export function sideOfLine(position: number): 'lower' | 'upper' {
  return position <= 3 ? 'lower' : 'upper';
}
