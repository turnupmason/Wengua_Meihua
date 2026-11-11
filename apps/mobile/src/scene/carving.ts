/**
 * What is carved into the stone table, and when. Pure functions (no Three.js), so layout and
 * order are testable. Coordinates are table-local metres (x right, z toward the viewer).
 * Order: frames for 目前/经过/结果 → 本卦 lines 初→上 → 互卦 → 变卦 → 体用 arrow; each stage's
 * inscriptions appear once its six lines are done.
 */
import type { Reading } from '../knowledge/knowledge';
import type { RelationView } from '../domain/relation';
import { HEX_LAYOUT, STAGE_ORDER, lineSlots, stageCenterZ, trigramDepth, type StageKey } from '../domain/layout';

export type Pt = [number, number]; // [x, z]
export type Rect = [number, number, number, number]; // x0, z0, x1, z1

export interface Groove {
  key: string;
  kind: 'line' | 'arrow' | 'frame';
  rect?: Rect;
  tris?: [Pt, Pt, Pt][];
  /** Direction the groove opens: along x, or along ±z. */
  axis: 'x' | '+z' | '-z';
  stage?: StageKey;
  hexagramId?: number;
  position?: number;
  /** For yin lines: 0 = left half, 1 = right half (carved one after the other). */
  half?: 0 | 1;
}

const rect = (cx: number, cz: number, w: number, d: number): Rect => [cx - w / 2, cz - d / 2, cx + w / 2, cz + d / 2];

export function lineGrooves(reading: Reading): Groove[] {
  const out: Groove[] = [];
  const { lineWidth: w, lineDepth: d, yinGap, hexX } = HEX_LAYOUT;
  for (const stage of STAGE_ORDER) {
    const panel = reading.stages[stage];
    for (const slot of lineSlots(panel.bitsBottomUp)) {
      const z = stageCenterZ(stage) + slot.depthOffset;
      const base = { kind: 'line' as const, axis: 'x' as const, stage, hexagramId: panel.id, position: slot.position };
      if (slot.yang) out.push({ ...base, key: `${stage}-${slot.position}`, rect: rect(hexX, z, w, d) });
      else {
        const half = (w - yinGap) / 2;
        out.push({ ...base, key: `${stage}-${slot.position}-a`, half: 0, rect: rect(hexX - (half + yinGap) / 2, z, half, d) });
        out.push({ ...base, key: `${stage}-${slot.position}-b`, half: 1, rect: rect(hexX + (half + yinGap) / 2, z, half, d) });
      }
    }
  }
  return out;
}

/** Carved frames around 目前 / 经过 / 结果, flow chevrons between them, and the column divider. */
export function frameGrooves(): Groove[] {
  const out: Groove[] = [];
  const { captionX: x, captionWidth: w, bandHeight, dividerX } = HEX_LAYOUT;
  const t = 0.012;
  const h = 0.36;
  for (const stage of STAGE_ORDER) {
    const z = stageCenterZ(stage);
    const f = (k: string, r: Rect, axis: Groove['axis']): Groove => ({ key: `frame-${stage}-${k}`, kind: 'frame', rect: r, axis, stage });
    out.push(f('t', rect(x, z - h / 2, w, t), 'x'), f('b', rect(x, z + h / 2, w, t), 'x'));
    out.push(f('l', rect(x - w / 2 + t / 2, z, t, h - t), '-z'), f('r', rect(x + w / 2 - t / 2, z, t, h - t), '-z'));
  }
  // Chevrons pointing away from the seat: 目前 → 经过 → 结果.
  for (const [i, between] of [[0, (stageCenterZ('primary') + stageCenterZ('mutual')) / 2], [1, (stageCenterZ('mutual') + stageCenterZ('changed')) / 2]] as const) {
    const s = 0.045;
    const tip: Pt = [x, between - 0.03];
    const back = between + 0.03;
    const bar = (sx: number): [Pt, Pt, Pt][] => {
      const outer: Pt = [x + sx * s, back];
      const inner: Pt = [x + sx * (s - 0.02), back];
      const tipIn: Pt = [x, tip[1] + 0.028];
      return [[outer, tip, tipIn], [outer, tipIn, inner]];
    };
    out.push({ key: `flow-${i}`, kind: 'frame', axis: '-z', tris: [...bar(-1), ...bar(1)] });
  }
  const top = stageCenterZ('changed') - bandHeight / 2;
  const bottom = stageCenterZ('primary') + bandHeight / 2;
  out.push({ key: 'divider', kind: 'frame', axis: '-z', rect: [dividerX - 0.005, top, dividerX + 0.005, bottom] });
  return out;
}

/**
 * 体用 arrow beside the primary hexagram, from the source trigram to the target trigram.
 * Shape encodes the relation: 克 = solid shaft, filled head, tail bar; 生 = dashed shaft,
 * open chevron; 比和 = two parallel grooves without a head.
 */
export function arrowGrooves(relation: RelationView): Groove[] {
  const x = HEX_LAYOUT.arrowX;
  const zc = stageCenterZ('primary');
  const zUpper = zc + trigramDepth('upper');
  const zLower = zc + trigramDepth('lower');
  const len = Math.abs(zLower - zUpper) - 0.02;
  const mid = (zUpper + zLower) / 2;
  const t = 0.016;
  const a = (key: string, g: Omit<Groove, 'key' | 'kind'>): Groove => ({ key: `arrow-${key}`, kind: 'arrow', ...g });
  if (relation.kind === 'equal') {
    return [a('l', { rect: rect(x - 0.018, mid, t, len), axis: '+z' }), a('r', { rect: rect(x + 0.018, mid, t, len), axis: '+z' })];
  }
  const dir = relation.screen === 'down' ? 1 : -1; // screen down = toward the viewer = +z
  const axis = dir > 0 ? '+z' : '-z';
  const tip = mid + (dir * len) / 2;
  const tail = mid - (dir * len) / 2;
  if (relation.kind === 'controls') {
    const headLen = 0.055;
    const shaftEnd = tip - dir * (headLen - 0.004);
    const shaftStart = tail + dir * 0.018;
    return [
      a('bar', { rect: rect(x, tail, 0.07, t), axis: 'x' }),
      a('shaft', { rect: rect(x, (shaftStart + shaftEnd) / 2, t, Math.abs(shaftEnd - shaftStart)), axis }),
      a('head', { axis, tris: [[[x - 0.038, tip - dir * headLen], [x, tip], [x + 0.038, tip - dir * headLen]]] }),
    ];
  }
  const out: Groove[] = [];
  const dashes = 4;
  const seg = (len - 0.05) / dashes;
  for (let i = 0; i < dashes; i++) out.push(a(`dash${i}`, { rect: rect(x, tail + dir * (seg * i + seg * 0.32), t, seg * 0.55), axis }));
  const s = 0.04;
  const back = tip - dir * s;
  const bar = (sx: number): [Pt, Pt, Pt][] => {
    const outer: Pt = [x + sx * s, back];
    const inner: Pt = [x + sx * (s - t * 1.3), back];
    const tipOut: Pt = [x, tip];
    const tipIn: Pt = [x, tip - dir * t * 1.8];
    return [[outer, tipOut, tipIn], [outer, tipIn, inner]];
  };
  out.push(a('chevron', { axis, tris: [...bar(-1), ...bar(1)] }));
  return out;
}

// ---------------- timing ----------------

export const CARVE_TIMING = {
  // Sit at the table (the walk there is 'entering'), then the light from the altar, then carving.
  normal: { sit: 0.9, light: 4.6, frames: 0.9, line: 0.32, arrow: 0.7, text: 0.7, glow: 0.7, hold: 1.2 },
  reduced: { sit: 0.3, light: 0.8, frames: 0.4, line: 1.0, arrow: 0.6, text: 0.5, glow: 0.4, hold: 0.4 },
};

export interface RevealPlan {
  reduced: boolean;
  /** When the camera has sat down. */
  seated: number;
  /** When the divine light begins. */
  lightStart: number;
  framesStart: number;
  lineStart(stageIndex: number, position: number): number;
  lineDuration: number;
  textStart(stageIndex: number): number;
  arrowStart: number;
  tagsStart: number;
  textDuration: number;
  glowDuration: number;
  total: number;
}

/** The bestowal: look up to the statues, a golden orb travels from the pearl to the table. */
export function bestowalTimes(reduced: boolean) {
  const plan = revealPlan(reduced);
  const T = reduced ? CARVE_TIMING.reduced : CARVE_TIMING.normal;
  const lookUp = plan.lightStart;
  // Look up and watch the glory (0–45%), look down as the light settles (45–72%), the seal (72–100%).
  const orbStart = lookUp + T.light * 0.45;
  const orbArrive = lookUp + T.light * 0.72;
  return { lookUp, orbStart, orbArrive, settle: plan.framesStart };
}

export function revealPlan(reduced: boolean): RevealPlan {
  const T = reduced ? CARVE_TIMING.reduced : CARVE_TIMING.normal;
  const seated = T.sit;
  const framesStart = seated + T.light;
  const linesStart = framesStart + T.frames;
  const lineStart = (s: number, p: number) => (reduced ? linesStart : linesStart + (s * 6 + (p - 1)) * T.line);
  const linesEnd = reduced ? linesStart + T.line : linesStart + 18 * T.line;
  const arrowStart = reduced ? linesStart : linesEnd;
  const tagsStart = reduced ? linesEnd : arrowStart + T.arrow;
  return {
    reduced,
    seated,
    lightStart: seated,
    framesStart,
    lineStart,
    lineDuration: T.line,
    textStart: (s) => (reduced ? linesEnd : lineStart(s, 6) + T.line),
    arrowStart,
    tagsStart,
    textDuration: T.text,
    glowDuration: T.glow,
    total: tagsStart + T.text + T.glow + T.hold,
  };
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** Carve progress (0..1) and glow (0..1) of one groove at time t (seconds into 'revealing'). */
export function grooveProgress(g: Groove, plan: RevealPlan, t: number): { carve: number; glow: number } {
  let start: number;
  let dur: number;
  if (g.kind === 'frame') {
    start = plan.framesStart;
    dur = plan.reduced ? 0.4 : CARVE_TIMING.normal.frames;
  } else if (g.kind === 'arrow') {
    start = plan.arrowStart;
    dur = plan.reduced ? plan.lineDuration : CARVE_TIMING.normal.arrow;
  } else {
    start = plan.lineStart(STAGE_ORDER.indexOf(g.stage!), g.position!);
    dur = plan.lineDuration;
    if (g.half !== undefined) {
      dur /= 2;
      start += g.half * dur;
    }
  }
  const carve = clamp01((t - start) / dur);
  const glowStart = g.kind === 'line' && g.half === 0 ? start + dur * 2 : start + dur;
  return { carve, glow: clamp01((t - glowStart) / plan.glowDuration) };
}

/** The rectangle actually open at a carve progress (the light moves along the groove's axis). */
export function carvedRect(r: Rect, axis: Groove['axis'], p: number): Rect | null {
  if (p <= 0) return null;
  const [x0, z0, x1, z1] = r;
  if (axis === 'x') return [x0, z0, x0 + (x1 - x0) * p, z1];
  if (axis === '+z') return [x0, z0, x1, z0 + (z1 - z0) * p];
  return [x0, z1 - (z1 - z0) * p, x1, z1];
}

/** Where the light is writing, for the golden motes (null when nothing is being carved). */
export function chiselPoint(grooves: Groove[], plan: RevealPlan, t: number): Pt | null {
  for (const g of grooves) {
    if (g.kind === 'frame') continue;
    const { carve } = grooveProgress(g, plan, t);
    if (carve > 0 && carve < 1 && g.rect) {
      const r = carvedRect(g.rect, g.axis, carve)!;
      return g.axis === 'x' ? [r[2], (r[1] + r[3]) / 2] : g.axis === '+z' ? [(r[0] + r[2]) / 2, r[3]] : [(r[0] + r[2]) / 2, r[1]];
    }
  }
  return null;
}

/** Index of the line that just started being carved (for a soft knock), or null. */
export function lineStarted(plan: RevealPlan, prevT: number, t: number): number | null {
  for (let s = 0; s < 3; s++)
    for (let p = 1; p <= 6; p++) {
      const at = plan.lineStart(s, p);
      if (prevT < at && t >= at) return s * 6 + p;
      if (plan.reduced) return prevT < at && t >= at ? 1 : null;
    }
  return null;
}

/** Everything carved must stay inside the table top with a margin. */
export function insideTable(g: Groove, margin = 0.04): boolean {
  const pts: Pt[] = g.rect ? [[g.rect[0], g.rect[1]], [g.rect[2], g.rect[3]]] : g.tris!.flat();
  const W = HEX_LAYOUT.tableWidth / 2 - margin;
  const D = HEX_LAYOUT.tableDepth / 2 - margin;
  return pts.every(([x, z]) => Math.abs(x) <= W && Math.abs(z) <= D);
}
