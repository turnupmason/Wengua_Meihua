/**
 * Carved inscriptions on the stone table, drawn into canvas textures with the bundled serif.
 * All characters are gold-filled with a dark cut edge, so they stay legible on the stone.
 * Chinese is stacked vertically (stele style); Latin text in a vertical block runs sideways.
 */
import * as THREE from 'three';
import type { InscriptionLine } from './inscriptionLayout';

export const CARVE_FONT = 'WenguaSerifHeading';
const FAMILY = `${CARVE_FONT}, "Noto Serif SC", "Songti SC", "STSong", serif`;
// High enough for a 3× phone screen at the reading distance (glyphs stay crisp, not smeared).
const PX_PER_M = 1800;

export async function loadCarveFont(): Promise<void> {
  try {
    await Promise.all([document.fonts.load(`600 64px ${CARVE_FONT}`, '卦体用'), document.fonts.ready]);
  } catch {
    /* system serif fallback */
  }
}

const FILL = {
  gold: ['#ffe2a0', '#e2b25a', '#a77a33'],
  pale: ['#f0dcb0', '#cfb27c', '#9b8256'],
} as const;

/** One carved glyph run: dark cut edge all round, a light lower lip, then a gold fill. */
function carve(g: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, tone: 'gold' | 'pale') {
  g.font = `600 ${size}px ${FAMILY}`;
  const o = Math.max(1, size * 0.05);
  g.lineJoin = 'round';
  g.strokeStyle = 'rgba(10, 7, 4, 0.9)';
  g.lineWidth = o * 2.4;
  g.strokeText(text, x, y - o * 0.3);
  g.fillStyle = 'rgba(255, 240, 210, 0.35)';
  g.fillText(text, x, y + o);
  const [a, b, c] = FILL[tone];
  const grd = g.createLinearGradient(0, y - size / 2, 0, y + size / 2);
  grd.addColorStop(0, a);
  grd.addColorStop(0.55, b);
  grd.addColorStop(1, c);
  g.fillStyle = grd;
  g.fillText(text, x, y);
}

const isCJK = (s: string) => /[㐀-鿿＀-￯·]/.test(s) && !/[A-Za-z]/.test(s);

/** Renders a block (horizontal lines or a vertical column) for a w×d metre area. */
export function inscriptionTexture(lines: InscriptionLine[], w: number, d: number, vertical = false): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = Math.round(w * PX_PER_M);
  c.height = Math.round(d * PX_PER_M);
  const g = c.getContext('2d')!;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const cx = c.width / 2;
  if (vertical) {
    const measure = (l: InscriptionLine) => {
      if (isCJK(l.text)) return [...l.text].length * l.size * 1.06;
      g.font = `600 ${l.size * PX_PER_M}px ${FAMILY}`;
      return g.measureText(l.text).width / PX_PER_M + l.size * 0.2;
    };
    const total = lines.reduce((a, l) => a + measure(l) + (l.gap ?? 0), 0);
    const widest = Math.max(...lines.map((l) => l.size));
    const k = Math.min(1, d / total, (w * 0.95) / widest);
    let y = (d - total * k) / 2;
    for (const l of lines) {
      y += (l.gap ?? 0) * k;
      const size = l.size * k * PX_PER_M;
      if (isCJK(l.text)) {
        for (const ch of l.text) {
          carve(g, ch, cx, (y + (l.size * 1.06 * k) / 2) * PX_PER_M, size, l.tone ?? 'gold');
          y += l.size * 1.06 * k;
        }
      } else {
        const run = measure(l) * k;
        g.save();
        g.translate(cx, (y + run / 2) * PX_PER_M);
        g.rotate(Math.PI / 2);
        carve(g, l.text, 0, 0, size, l.tone ?? 'gold');
        g.restore();
        y += run;
      }
    }
  } else {
    const total = lines.reduce((a, l) => a + l.size * 1.18 + (l.gap ?? 0), 0);
    const k = Math.min(1, d / Math.max(total, 1e-6));
    let y = (d - total * k) / 2;
    for (const l of lines) {
      y += (l.gap ?? 0) * k;
      const h = l.size * 1.18 * k;
      let size = l.size * k * PX_PER_M;
      g.font = `600 ${size}px ${FAMILY}`;
      while (g.measureText(l.text).width > c.width * 0.95 && size > 8) {
        size *= 0.93;
        g.font = `600 ${size}px ${FAMILY}`;
      }
      carve(g, l.text, cx, (y + h / 2) * PX_PER_M, size, l.tone ?? 'gold');
      y += h;
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  // The table is seen at a slant: full anisotropic filtering keeps strokes sharp across it.
  t.anisotropy = 16;
  return t;
}

/** Traditional moving-line mark in cinnabar: ○ for a moving yang line (老阳), × for yin (老阴). */
export function movingMarkTexture(yang: boolean): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.strokeStyle = '#ff5a2c';
  g.lineCap = 'round';
  g.lineWidth = 16;
  g.shadowColor = '#ff8a3c';
  g.shadowBlur = 18;
  g.beginPath();
  if (yang) g.arc(64, 64, 38, 0, Math.PI * 2);
  else {
    g.moveTo(30, 30);
    g.lineTo(98, 98);
    g.moveTo(98, 30);
    g.lineTo(30, 98);
  }
  g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Unlit decal material with a "carving" wipe along the block (downward for vertical columns). */
export function inscriptionMaterial(map: THREE.Texture, vertical = false) {
  const uniforms = { uWipe: { value: 0 } };
  const m = new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, color: new THREE.Color(1, 0.98, 0.94) });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uWipe = uniforms.uWipe;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uWipe;')
      .replace('#include <map_fragment>', `#include <map_fragment>\nif (${vertical ? '1.0 - vMapUv.y' : 'vMapUv.x'} > uWipe) discard;`);
  };
  m.customProgramCacheKey = () => (vertical ? 'inscription-wipe-v' : 'inscription-wipe-h');
  return { material: m, uniforms };
}
