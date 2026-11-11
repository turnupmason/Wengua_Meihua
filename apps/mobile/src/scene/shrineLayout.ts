/**
 * Where the 三清 sit on the altar. Plain numbers only (no three.js) so tests can import them.
 *
 * Each deity is the artist's seated painting, cut out (figure, throne, crown, clouds, painted
 * base; sky, pillars, nameplate and halo removed — see scripts/deity-cut). All three cutouts
 * share one pixel scale, so their sizes stay as painted. Each sits on its own carved base
 * (须弥座) on the altar: 元始 in the middle, raised and set back; 太上老君 on the viewer's left
 * and 灵宝 on the viewer's right, turned slightly toward the middle.
 */
type V3 = [number, number, number];

export const ALTAR_TOP = 1.22;
export const PLAQUE_BOTTOM = 7.12 - 0.608;
export const SCREEN_HALF_WIDTH = 6.25;

/** Metres per pixel of the source art. */
const PX = 0.0033;

export interface DeitySeat {
  key: 'yuanshi' | 'laojun' | 'lingbao';
  file: string;
  /** Cutout size in pixels. */
  px: [number, number];
  /** Scale on top of PX (the side figures are a little smaller). */
  scale: number;
  /** Carved base: centre x/z, height and size. The figure stands on its top. */
  base: { x: number; z: number; height: number; width: number; depth: number };
  /** Card plane position (x, z) and turn toward the middle (radians). */
  card: { x: number; z: number; turn: number };
  /** Head centre in the cutout (fractions from the left and from the top), for the halo. */
  head: [number, number];
  /** Halo radius in metres. */
  halo: number;
}

function seat(s: Omit<DeitySeat, 'card'> & { cardBack: number; turn: number }): DeitySeat {
  const { cardBack, turn, ...rest } = s;
  return { ...rest, card: { x: s.base.x, z: s.base.z - cardBack, turn } };
}

export const DEITIES: DeitySeat[] = [
  seat({ key: 'laojun', file: 'art/sanqing-laojun.webp', px: [1030, 1361], scale: 0.93, base: { x: -3.3, z: -14.75, height: 0.26, width: 3.12, depth: 1.25 }, cardBack: 0.3, turn: 0.17, head: [0.51, 0.18], halo: 0.78 }),
  seat({ key: 'yuanshi', file: 'art/sanqing-yuanshi.webp', px: [1005, 1337], scale: 1, base: { x: 0, z: -15.05, height: 0.46, width: 3.45, depth: 1.3 }, cardBack: 0.3, turn: 0, head: [0.5, 0.18], halo: 0.82 }),
  seat({ key: 'lingbao', file: 'art/sanqing-lingbao.webp', px: [1017, 1301], scale: 0.93, base: { x: 3.3, z: -14.75, height: 0.26, width: 3.12, depth: 1.25 }, cardBack: 0.3, turn: -0.17, head: [0.5, 0.15], halo: 0.78 }),
];

/** Card size in metres. */
export function cardSize(d: DeitySeat): [number, number] {
  return [d.px[0] * PX * d.scale, d.px[1] * PX * d.scale];
}

/** Bottom of the card (top of its base). */
export function cardBottom(d: DeitySeat): number {
  return ALTAR_TOP + d.base.height;
}

/** A point in the cutout (fractions from left / top) in world space. */
export function cardPoint(d: DeitySeat, u: number, v: number): V3 {
  const [w, h] = cardSize(d);
  const lx = (u - 0.5) * w;
  const y = cardBottom(d) + (1 - v) * h;
  return [d.card.x + lx * Math.cos(d.card.turn), y, d.card.z - lx * Math.sin(d.card.turn)];
}

const YUANSHI = DEITIES[1];
/** 元始天尊's orb, held at his chest (pixel 506, 575 of the cutout): where the bestowal light gathers. */
export const ORB: V3 = cardPoint(YUANSHI, 506 / 1005, 575 / 1337);
/** Where the camera looks when it raises its eyes to the 三清. */
export const SHRINE_FOCUS: V3 = [0, cardBottom(YUANSHI) + cardSize(YUANSHI)[1] * 0.5, YUANSHI.card.z];
