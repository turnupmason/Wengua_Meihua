/**
 * Procedural texture generators (no three.js textures, no DOM required): each recipe returns raw
 * RGBA rasters for a colour map, a normal map and a roughness map. They run in a worker
 * (texWorker.ts) so the phone's main thread never stalls on them; the same code runs on the main
 * thread as a fallback where workers or OffscreenCanvas are unavailable.
 */
import { Color } from 'three';

export interface Raster { w: number; h: number; data: Uint8ClampedArray }
export interface RasterSet { map: Raster; normalMap: Raster; roughnessMap: Raster }

type G2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

// ---------- noise ----------
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Tileable fractal value noise, values 0..1. */
export function fbm(size: number, cells: number, octaves: number, seed: number): Float32Array {
  const out = new Float32Array(size * size);
  let amp = 1;
  let total = 0;
  for (let o = 0; o < octaves; o++) {
    const n = cells << o;
    const r = rng(seed + o * 101);
    const grid = new Float32Array(n * n).map(() => r());
    for (let y = 0; y < size; y++) {
      const gy = (y / size) * n;
      const y0 = Math.floor(gy);
      const fy = gy - y0;
      const sy = fy * fy * (3 - 2 * fy);
      for (let x = 0; x < size; x++) {
        const gx = (x / size) * n;
        const x0 = Math.floor(gx);
        const fx = gx - x0;
        const sx = fx * fx * (3 - 2 * fx);
        const a = grid[(y0 % n) * n + (x0 % n)];
        const b = grid[(y0 % n) * n + ((x0 + 1) % n)];
        const c = grid[((y0 + 1) % n) * n + (x0 % n)];
        const d = grid[((y0 + 1) % n) * n + ((x0 + 1) % n)];
        out[y * size + x] += amp * ((a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy);
      }
    }
    total += amp;
    amp *= 0.5;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}

/** A 2D context: an OffscreenCanvas in a worker, a canvas element on the page. */
function context2d(w: number, h: number): G2D {
  if (typeof document === 'undefined') {
    if (typeof OffscreenCanvas === 'undefined') throw new Error('no OffscreenCanvas');
    const g = new OffscreenCanvas(w, h).getContext('2d', { willReadFrequently: true });
    if (!g) throw new Error('no 2d context');
    return g;
  }
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c.getContext('2d', { willReadFrequently: true })!;
}

const raster = (g: G2D, w: number, h: number): Raster => ({ w, h, data: g.getImageData(0, 0, w, h).data });

/** Normal map from a height field (Sobel), tileable. */
export function normalRaster(h: Float32Array, size: number, strength: number): Raster {
  const data = new Uint8ClampedArray(size * size * 4);
  const at = (x: number, y: number) => h[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1)) * strength;
      const dy = (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1)) * strength;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * size + x) * 4;
      data[i] = ((-dx / len) * 0.5 + 0.5) * 255;
      data[i + 1] = ((dy / len) * 0.5 + 0.5) * 255;
      data[i + 2] = (1 / len) * 255;
      data[i + 3] = 255;
    }
  }
  return { w: size, h: size, data };
}

function fieldRaster(size: number, f: (i: number, x: number, y: number) => [number, number, number]): Raster {
  const data = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const [r, gg, b] = f(i, x, y);
      data[i * 4] = r;
      data[i * 4 + 1] = gg;
      data[i * 4 + 2] = b;
      data[i * 4 + 3] = 255;
    }
  return { w: size, h: size, data };
}

const hex = (s: string) => new Color(s);

function makeSet(size: number, albedo: (i: number, x: number, y: number) => [number, number, number], height: Float32Array, rough: (i: number) => number, strength: number): RasterSet {
  return {
    map: fieldRaster(size, albedo),
    normalMap: normalRaster(height, size, strength),
    roughnessMap: fieldRaster(size, (i) => { const v = Math.round(rough(i) * 255); return [v, v, v]; }),
  };
}

/** 青石: grey-green stone with speckles, faint veins and pitting. */
function stoneSet(seed = 7, base = '#7a7d74'): RasterSet {
  const S = 512;
  const n = fbm(S, 4, 6, seed);
  const fine = fbm(S, 64, 2, seed + 9);
  const vein = fbm(S, 3, 4, seed + 3);
  const col = hex(base);
  const height = new Float32Array(S * S);
  for (let i = 0; i < height.length; i++) {
    const v = Math.abs(Math.sin(vein[i] * 28));
    height[i] = n[i] * 0.55 + fine[i] * 0.35 - (fine[i] > 0.82 ? 0.25 : 0) - (v < 0.05 ? 0.08 : 0);
  }
  return makeSet(
    S,
    (i) => {
      const v = Math.abs(Math.sin(vein[i] * 28));
      const k = 0.72 + n[i] * 0.45 + (fine[i] - 0.5) * 0.18 - (fine[i] > 0.86 ? 0.22 : 0) + (v < 0.04 ? 0.1 : 0);
      return [col.r * k * 255, col.g * k * 255, col.b * k * 255].map((x) => Math.min(255, x * 1.0)) as [number, number, number];
    },
    height,
    (i) => 0.62 + n[i] * 0.3,
    2.2,
  );
}

/** Large, quiet dark flagstones (matte, little fine noise) so the stone table and text lead. */
function floorSet(): RasterSet {
  const S = 512;
  const n = fbm(S, 4, 5, 11);
  const fine = fbm(S, 48, 2, 12);
  const tiles = 2;
  const tileTone = rng(5);
  const tones = Array.from({ length: tiles * tiles }, () => 0.9 + tileTone() * 0.14);
  const height = new Float32Array(S * S);
  const albedoK = new Float32Array(S * S);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const i = y * S + x;
      const tx = (x / S) * tiles;
      const ty = (y / S) * tiles;
      const ex = Math.min(tx % 1, 1 - (tx % 1));
      const ey = Math.min(ty % 1, 1 - (ty % 1));
      const edge = Math.min(ex, ey);
      const grout = edge < 0.012 ? 1 : edge < 0.03 ? (0.03 - edge) / 0.018 : 0;
      height[i] = n[i] * 0.3 + fine[i] * 0.06 - grout * 0.6;
      albedoK[i] = tones[Math.floor(ty) * tiles + Math.floor(tx)] * (0.88 + n[i] * 0.16) * (1 - grout * 0.45);
    }
  const col = hex('#45403a');
  return makeSet(S, (i) => [col.r * albedoK[i] * 255, col.g * albedoK[i] * 255, col.b * albedoK[i] * 255], height, (i) => 0.8 + n[i] * 0.15, 1.1);
}

/** Lacquered wood with grain. */
function woodSet(base: string, seed: number, roughness: number): RasterSet {
  const S = 256;
  const n = fbm(S, 2, 4, seed);
  const grainNoise = fbm(S, 8, 3, seed + 1);
  const col = hex(base);
  const height = new Float32Array(S * S);
  const k = new Float32Array(S * S);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const i = y * S + x;
      const g = Math.sin((x / S) * 60 + grainNoise[i] * 9 + n[i] * 4) * 0.5 + 0.5;
      height[i] = g * 0.3 + n[i] * 0.2;
      k[i] = 0.8 + g * 0.15 + (n[i] - 0.5) * 0.25;
    }
  return makeSet(S, (i) => [col.r * k[i] * 255, col.g * k[i] * 255, col.b * k[i] * 255], height, (i) => roughness + n[i] * 0.15, 1.2);
}

/** Gold leaf with fine hammered relief. */
function goldSet(): RasterSet {
  const S = 256;
  const n = fbm(S, 6, 4, 31);
  const fine = fbm(S, 40, 2, 32);
  const col = hex('#c89f55');
  const height = new Float32Array(S * S).map((_, i) => n[i] * 0.5 + fine[i] * 0.5);
  return makeSet(S, (i) => { const k = 0.85 + n[i] * 0.25; return [col.r * k * 255, col.g * k * 255, col.b * k * 255]; }, height, (i) => 0.24 + fine[i] * 0.22, 1.4);
}

/** 祥云 cloud scroll motif. */
export function drawCloud(g: G2D, x: number, y: number, s: number) {
  g.beginPath();
  g.arc(x, y, s, Math.PI * 0.2, Math.PI * 1.9);
  g.arc(x + s * 0.55, y - s * 0.1, s * 0.45, Math.PI * 1.1, Math.PI * 2.6);
  g.moveTo(x + s * 1.3, y + s * 0.35);
  g.arc(x + s * 1.55, y - s * 0.15, s * 0.62, Math.PI * 0.7, Math.PI * 2.2);
  g.arc(x + s * 1.75, y - s * 0.25, s * 0.28, Math.PI * 0.2, Math.PI * 1.6);
  g.moveTo(x - s * 0.9, y + s * 0.55);
  g.quadraticCurveTo(x + s * 0.8, y + s * 1.1, x + s * 2.4, y + s * 0.5);
  g.stroke();
}

/** Embroidered fabric: base colour with repeating gold cloud scrolls in raised thread. */
function clothSet(base: string, motif: string, seed: number, grain = 1): RasterSet {
  const S = 512;
  const g = context2d(S, S);
  g.fillStyle = base;
  g.fillRect(0, 0, S, S);
  const weave = fbm(S, 128, 1, seed);
  const n = fbm(S, 4, 3, seed + 1);
  const img = g.getImageData(0, 0, S, S);
  for (let i = 0; i < S * S; i++) {
    const k = 1 - 0.14 * grain + (n[i] * 0.2 + (weave[i] - 0.5) * 0.08) * grain;
    img.data[i * 4] *= k;
    img.data[i * 4 + 1] *= k;
    img.data[i * 4 + 2] *= k;
  }
  g.putImageData(img, 0, 0);
  // Height canvas mirrors the motif so embroidery stands out.
  const hg = context2d(S, S);
  hg.fillStyle = '#000';
  hg.fillRect(0, 0, S, S);
  const r = rng(seed + 7);
  const spots: [number, number, number][] = [];
  for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) spots.push([(col + 0.25 + (row % 2) * 0.5) * (S / 3), (row + 0.5) * (S / 3), S * (0.045 + r() * 0.015)]);
  for (const [ctx, color, width] of [[g, motif, S * 0.012], [hg, '#fff', S * 0.016]] as const) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    for (const [x, y, s] of spots) for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) drawCloud(ctx, x + dx, y + dy, s);
  }
  const hdata = hg.getImageData(0, 0, S, S).data;
  const height = new Float32Array(S * S).map((_, i) => (hdata[i * 4] / 255) * 0.6 + weave[i] * 0.15);
  return {
    map: raster(g, S, S),
    normalMap: normalRaster(height, S, 1.6),
    roughnessMap: fieldRaster(S, (i) => { const v = Math.round((hdata[i * 4] > 80 ? 0.35 : 0.7) * 255); return [v, v, v]; }),
  };
}

/** Stone panel with incised cloud scrolls (table apron). */
function carvedStonePanel(): RasterSet {
  const S = 512;
  const base = stoneSet(77, '#6f746c');
  const n = fbm(S, 4, 5, 78);
  const hg = context2d(S, S);
  hg.fillStyle = '#fff';
  hg.fillRect(0, 0, S, S);
  hg.strokeStyle = '#000';
  hg.lineWidth = S * 0.018;
  hg.lineCap = 'round';
  for (let i = 0; i < 4; i++) drawCloud(hg, S * (0.12 + i * 0.24), S * 0.5, S * 0.06);
  const hd = hg.getImageData(0, 0, S, S).data;
  const height = new Float32Array(S * S).map((_, i) => (hd[i * 4] / 255) * 0.7 + n[i] * 0.3);
  const col = hex('#6f746c');
  return {
    map: fieldRaster(S, (i) => { const k = (0.75 + n[i] * 0.4) * (hd[i * 4] < 128 ? 0.6 : 1); return [col.r * k * 255, col.g * k * 255, col.b * k * 255]; }),
    normalMap: normalRaster(height, S, 3),
    roughnessMap: base.roughnessMap,
  };
}

/** Every recipe, by name, with serialisable arguments (so a worker can run it). */
export const RECIPES = {
  stone: (seed?: number, base?: string) => stoneSet(seed, base),
  floor: () => floorSet(),
  wood: (base: string, seed: number, roughness: number) => woodSet(base, seed, roughness),
  gold: () => goldSet(),
  cloth: (base: string, motif: string, seed: number, grain?: number) => clothSet(base, motif, seed, grain),
  carvedPanel: () => carvedStonePanel(),
} satisfies Record<string, (...args: never[]) => RasterSet>;

export type RecipeName = keyof typeof RECIPES;

export function runRecipe(name: RecipeName, args: unknown[]): RasterSet {
  return (RECIPES[name] as (...a: unknown[]) => RasterSet)(...args);
}
