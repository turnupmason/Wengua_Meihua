/**
 * Pure timeline functions: where the camera is at (phase, t).
 * No Three.js imports, so the choreography can be tested and reused by the 2D fallback.
 */
import type { RitualPhase } from '../domain/ritual';
import { phaseDuration } from '../domain/ritual';
import { HEX_LAYOUT } from '../domain/layout';
import { bestowalTimes, CARVE_TIMING, revealPlan } from './carving';
import { ORB, SHRINE_FOCUS } from './shrineLayout';

export type V3 = [number, number, number];

export const WORLD = Object.freeze({
  entrance: [0, 1.65, 11.5] as V3,
  statueFocus: SHRINE_FOCUS,
  burner: [0, 0, -6.75] as V3,
  burnerTopY: 1.04,
  cushion: [0, 0, -5.7] as V3,
  /** Candle on a stand beside the burner. */
  candleFlame: [0.6, 0.96, -6.22] as V3,
  /** Incense holder (香筒) on a stand beside the burner. */
  holder: [0.27, 0.84, -5.95] as V3,
  table: [2.95, 0, -4.4] as V3,
  tableTopY: 0.92,
});

export const STICK_LEN = 0.38;

/**
 * Where the app opens: back in the courtyard at night, at about eye height on the raised path, so
 * the roof reads as a roof (ridge, slope and eaves), with the doors, the lanterns and the censer
 * below it and the moon over the hills above.
 */
export const FAR = Object.freeze({ pos: [0, 3.4, 44] as V3, target: [0, 5.8, 10] as V3 });
/** At the doors, looking up at the plaque. */
export const GATE = Object.freeze({ pos: [0, 1.8, 23.2] as V3, target: [0, 3.3, 13.6] as V3 });
/** The path passes beside the courtyard censer. */
const PAST_CENSER: V3 = [2.2, 1.9, 26.5];
/** Seconds from the courtyard, through the doors, to the home view. */
export const INTRO_SECONDS = { normal: 12, reduced: 2 };
const INTRO = { arrive: 0.42, open: 0.56 };

/**
 * Opening walk: `k` 0 (far back in the courtyard) → 1 (home). Waiting at k = 0 the view drifts
 * gently; then the walk curves past the censer to the doors, which swing open, and on inside.
 */
export function introPose(k: number, home: Pose, t = 0): Pose {
  if (k <= 0) {
    const sway = Math.sin(t * 0.12);
    return { pos: [FAR.pos[0] + sway * 0.6, FAR.pos[1] + Math.sin(t * 0.21) * 0.05, FAR.pos[2]], target: [FAR.target[0] + sway * 0.2, FAR.target[1], FAR.target[2]] };
  }
  if (k < INTRO.arrive) {
    const a = easeInOut(k / INTRO.arrive);
    const p0 = FAR.pos, p1 = PAST_CENSER, p2 = GATE.pos;
    const pos: V3 = [0, 1, 2].map((i) => (1 - a) * (1 - a) * p0[i] + 2 * (1 - a) * a * p1[i] + a * a * p2[i]) as V3;
    pos[1] += Math.sin(a * Math.PI * 8) * 0.012; // footsteps
    return { pos, target: lerp3(FAR.target, GATE.target, easeInOut(clamp01((a - 0.3) / 0.7))) };
  }
  // At the doors while they open, then the walk through them.
  const walk = easeInOut(clamp01((k - INTRO.open) / (1 - INTRO.open)));
  const drift = easeInOut(clamp01((k - INTRO.arrive) / (INTRO.open - INTRO.arrive))) * 0.5;
  const pos = lerp3(GATE.pos, home.pos, walk);
  pos[2] -= drift * (1 - walk);
  pos[1] += Math.sin(Math.PI * walk) * 0.06;
  const look = easeInOut(clamp01((k - INTRO.open - 0.08) / (1 - INTRO.open - 0.08)));
  return { pos, target: lerp3(GATE.target, home.target, look) };
}
/** How far the doors are open during the walk-in (0 closed → 1 open). */
export const doorOpen = (k: number) => easeInOut(clamp01((k - INTRO.arrive) / (INTRO.open - INTRO.arrive)));

/**
 * The painted walk-in (docs/art-reference/sanqing-entrance): the moonlit courtyard is the artist's
 * picture, pushed in toward the doors; it dissolves into the open threshold, which is pushed through;
 * the real hall shows under it and the camera settles at home. Seconds, on the ritual clock.
 */
export const WALK_IN = Object.freeze({
  seconds: 7.6,
  reducedSeconds: 2,
  /** Courtyard pushed in toward the doors. */
  courtyard: [0, 3.0] as const,
  /** Courtyard → open threshold (the doors swing open). */
  doors: [2.5, 3.5] as const,
  /** Threshold held, then pushed through into the hall. */
  through: [4.4, 6.9] as const,
  /** The painted threshold fades off the real hall. */
  reveal: [5.5, 6.9] as const,
  /** The 3D camera's last steps, from just inside the doors to home. */
  settle: [5.1, 7.4] as const,
});
/** Just inside the doors, facing the 三清: where the 3D camera waits under the painted plates. */
export const INSIDE = Object.freeze({ pos: [0, 1.8, 9.4] as V3, target: [0, 2.4, -13.6] as V3 });

/** Development only: `?walkAt=4.2` holds the painted walk-in (pictures and camera) at that second. */
export const WALK_AT = import.meta.env?.DEV && typeof location !== 'undefined' ? Number(new URLSearchParams(location.search).get('walkAt') ?? Number.NaN) : Number.NaN;

/** Seconds of the painted walk-in at progress k (0..1). */
export const walkInSeconds = (k: number, reduced: boolean) => clamp01(k) * (reduced ? WALK_IN.reducedSeconds : WALK_IN.seconds);
/** 0..1 of a [from, to] span at s seconds. */
export const span = (s: number, [a, b]: readonly [number, number]) => clamp01((s - a) / (b - a));

/** 3D camera during the painted walk-in: waiting just inside the doors, then the last steps home. */
export function paintedIntroPose(k: number, home: Pose, reduced: boolean): Pose {
  if (reduced) return home;
  const g = easeInOut(span(walkInSeconds(k, false), WALK_IN.settle));
  return { pos: lerp3(INSIDE.pos, home.pos, g), target: lerp3(INSIDE.target, home.target, g) };
}

/** Home view inside the hall (the 问事 panel covers the lower half of the screen). */
export const HOME = Object.freeze({ pos: [0, 1.75, 3.6] as V3, target: [0, -0.2, -13.6] as V3 });

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const ease = (x: number) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};
export const easeInOut = (x: number) => {
  const t = clamp01(x);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const lerp3 = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

/** Fraction of a phase, 0..1. */
export function phaseFraction(phase: RitualPhase, t: number, reduced: boolean): number {
  const d = phaseDuration(phase, reduced);
  return Number.isFinite(d) ? clamp01(t / d) : 0;
}

export interface Pose { pos: V3; target: V3 }

/**
 * Wider lens in portrait so the three statues fit side by side. On phones taller than 9:16 the
 * lens keeps the 9:16 width of view (so 太上老君 and 灵宝天尊 keep room at the screen edges) and
 * simply shows more above and below.
 */
const PORTRAIT_FOV = 56;
const PORTRAIT_ASPECT = 9 / 16;
export function fovFor(aspect: number): number {
  if (aspect >= 0.8) return 46;
  if (aspect >= PORTRAIT_ASPECT) return PORTRAIT_FOV;
  const halfWidth = Math.tan((PORTRAIT_FOV * Math.PI) / 360) * PORTRAIT_ASPECT;
  return Math.round(((2 * Math.atan(halfWidth / Math.max(0.3, aspect)) * 180) / Math.PI) * 10) / 10;
}

const READ_TILT = (36 * Math.PI) / 180; // from vertical, viewer at the seat (+z)
/** Margin around the table top kept inside the view (metres). */
const READ_MARGIN = 0.05;

/**
 * Where a world point lands in the camera's own frame (no view offset): NDC x and y.
 * The camera sits at `pos` and looks at `target`, with world up = +y.
 */
function projectNdc(p: V3, pos: V3, target: V3, tanHalf: number, aspect: number): [number, number] {
  const f = norm(sub(target, pos));
  const r = norm(cross(f, [0, 1, 0]));
  const u = cross(r, f);
  const v = sub(p, pos);
  const z = dot(v, f);
  return [dot(v, r) / z / (tanHalf * aspect), dot(v, u) / z / tanHalf];
}
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/** The four corners of the stone table's top (with a small margin), in world space. */
export function tableCorners(): V3[] {
  const [tx, , tz] = WORLD.table;
  const hw = HEX_LAYOUT.tableWidth / 2 + READ_MARGIN;
  const hd = HEX_LAYOUT.tableDepth / 2 + READ_MARGIN;
  const y = WORLD.tableTopY;
  return [
    [tx - hw, y, tz - hd],
    [tx + hw, y, tz - hd],
    [tx - hw, y, tz + hd],
    [tx + hw, y, tz + hd],
  ];
}

function poseAt(d: number, dz: number): Pose {
  const [tx, , tz] = WORLD.table;
  const target: V3 = [tx, WORLD.tableTopY - 0.05, tz + dz];
  return { pos: [target[0], target[1] + d * Math.cos(READ_TILT), target[2] + d * Math.sin(READ_TILT)], target };
}

const poseCache = new Map<string, Pose>();

/**
 * Leaning over the stone table from its seat, framed so the whole table top — every line, name
 * and the 体用 strip — sits inside the free band between the top bar and the bottom bar.
 * `top` and `bottom` are the fractions of the screen height those bars cover. The renderer shifts
 * the picture by (bottom − top)/2 of the screen (setViewOffset), so the free band becomes a
 * symmetric frame of half-height (1 − top − bottom); the distance and aim are solved so all four
 * corners fit it, with the near edge and the far edge balanced.
 */
export function readingPose(aspect: number, fovDeg: number, top = 0, bottom = 0): Pose {
  const a = Math.max(0.2, 1 - top - bottom);
  const key = `${aspect.toFixed(3)}|${fovDeg}|${a.toFixed(3)}`;
  const hit = poseCache.get(key);
  if (hit) return hit;
  const tanHalf = Math.tan((fovDeg * Math.PI) / 360);
  const corners = tableCorners();
  const fits = (pose: Pose) =>
    corners.every((c) => {
      const [x, y] = projectNdc(c, pose.pos, pose.target, tanHalf, Math.max(aspect, 0.2));
      return Math.abs(x) <= 0.97 && Math.abs(y) <= a * 0.97;
    });
  let best: Pose | null = null;
  let bestD = Infinity;
  // Aim a little nearer or farther along the table; for each aim, the closest distance that fits.
  for (let dz = -0.3; dz <= 0.45; dz += 0.025) {
    let lo = 0.6;
    let hi = 14;
    if (!fits(poseAt(hi, dz))) continue;
    for (let i = 0; i < 28; i++) {
      const mid = (lo + hi) / 2;
      if (fits(poseAt(mid, dz))) hi = mid;
      else lo = mid;
    }
    if (hi < bestD) {
      bestD = hi;
      best = poseAt(hi, dz);
    }
  }
  const pose = best ?? poseAt(6, 0.12);
  if (poseCache.size > 64) poseCache.clear();
  poseCache.set(key, pose);
  return pose;
}

/** NDC of a world point as the renderer will show it, including the view offset for the bars. */
export function screenNdc(p: V3, pose: Pose, aspect: number, fovDeg: number, top: number, bottom: number): [number, number] {
  const [x, y] = projectNdc(p, pose.pos, pose.target, Math.tan((fovDeg * Math.PI) / 360), aspect);
  return [x, y + (bottom - top)];
}

// ---------------- camera ----------------

/** The stone table's seat: standing just behind it, then seated. */
function seat() {
  const [tx, , tz] = WORLD.table;
  const stoolZ = tz + HEX_LAYOUT.tableDepth / 2 + 0.42;
  return {
    before: [tx, 1.66, stoolZ + 0.35] as V3,
    seated: [tx, 1.22, stoolZ + 0.05] as V3,
    tableCenter: [tx, WORLD.tableTopY, tz] as V3,
    seatedLook: [tx, WORLD.tableTopY, tz + 0.5] as V3,
  };
}
/** Halfway up the hall, the walk bends toward the stone table on the right. */
const WALK_BEND: V3 = [1.0, 1.72, -0.6];

/** Camera pose for a phase at time t (seconds). */
export function cameraPose(phase: RitualPhase, t: number, reduced: boolean, reading: Pose): Pose {
  const f = phaseFraction(phase, t, reduced);
  switch (phase) {
    case 'idle': {
      // Home: standing inside the hall; aimed low so the 三清 sit above the panel, slowly breathing.
      const sway = reduced ? 0 : Math.sin(t * 0.25);
      return { pos: [HOME.pos[0] + sway * 0.12, HOME.pos[1] + Math.sin(t * 0.4) * 0.02, HOME.pos[2]], target: [HOME.target[0] + sway * 0.06, HOME.target[1], HOME.target[2]] };
    }
    case 'entering': {
      // Walk up the hall toward the 三清, eyes on them, and round to the stone table.
      const s = seat();
      const a = ease(f); // gentle start and stop; a brisk, even pace in between
      const pos = [0, 1, 2].map((i) => (1 - a) * (1 - a) * HOME.pos[i] + 2 * (1 - a) * a * WALK_BEND[i] + a * a * s.before[i]) as V3;
      if (!reduced) pos[1] += Math.sin(f * Math.PI * 9) * 0.02 * Math.sin(Math.PI * f);
      const raise = easeInOut(clamp01(f / 0.35));
      const turn = easeInOut(clamp01((f - 0.72) / 0.28));
      return { pos, target: lerp3(lerp3(HOME.target, WORLD.statueFocus, raise), s.tableCenter, turn) };
    }
    case 'revealing':
      return revealingPose(t, reduced, reading);
    case 'reading':
      return reading;
  }
}

/** Sit at the stone table, then look up to the 三清 as the light comes, and lean over the table. */
function revealingPose(t: number, reduced: boolean, reading: Pose): Pose {
  const T = reduced ? CARVE_TIMING.reduced : CARVE_TIMING.normal;
  const s = seat();
  if (t < T.sit) {
    const k = easeInOut(t / T.sit);
    return { pos: lerp3(s.before, s.seated, k), target: lerp3(s.tableCenter, s.seatedLook, k) };
  }
  // 祖师赐卦: look up to the 三清 as the glory swells, follow the light down to the table, then lean in.
  const b = bestowalTimes(reduced);
  // 元始天尊 in the middle of the altar, the orb in his hands.
  const statues: V3 = [ORB[0], ORB[1] + 0.15, ORB[2]];
  if (t < b.orbStart) return { pos: s.seated, target: lerp3(s.seatedLook, statues, easeInOut((t - b.lookUp) / ((b.orbStart - b.lookUp) * 0.55))) };
  if (t < b.orbArrive) {
    const k = easeInOut((t - b.orbStart) / (b.orbArrive - b.orbStart));
    return { pos: s.seated, target: lerp3(statues, s.tableCenter, k) };
  }
  const k = easeInOut((t - b.orbArrive) / (b.settle + T.frames * 0.5 - b.orbArrive));
  return { pos: lerp3(s.seated, reading.pos, k), target: lerp3(s.tableCenter, reading.target, k) };
}

/** Moments (phase fractions) for sounds and overlays. */
export function cuesFor(phase: RitualPhase, reduced: boolean): number[] {
  const plan = revealPlan(reduced);
  switch (phase) {
    case 'entering':
      return [0.02];
    case 'revealing':
      // 0: look up (祖师赐卦); 1: everything is carved; 2: the golden orb reaches the table.
      return [plan.lightStart / plan.total, (plan.tagsStart + plan.textDuration) / plan.total, bestowalTimes(reduced).orbArrive / plan.total];
    default:
      return [];
  }
}
