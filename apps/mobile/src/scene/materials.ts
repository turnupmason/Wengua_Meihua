/**
 * Procedural textures and shared materials. Everything is generated in code (no downloaded
 * images): colour maps, normal maps from height fields, and roughness maps, so stone, wood,
 * gold and cloth have real surface relief under the warm lights.
 */
import * as THREE from 'three';

import { drawCloud, fbm, normalRaster } from './texgen';
import { procSet, type TextureSet } from './texQueue';

export { drawCloud, fbm };
export type { TextureSet };

function canvas(size: number) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return { c, g: c.getContext('2d', { willReadFrequently: true })! };
}

/** Normal map from a height field (Sobel), tileable, on a canvas. */
export function normalFromHeight(h: Float32Array, size: number, strength: number) {
  const r = normalRaster(h, size, strength);
  const { c, g } = canvas(size);
  g.putImageData(new ImageData(r.data as Uint8ClampedArray<ArrayBuffer>, size, size), 0, 0);
  return c;
}

/**
 * Placeholder colour for a generated map until it arrives: the generators scale the base colour
 * in linear space, so the placeholder does the same (≈ the map's average tone).
 */
function look(base: string, k = 0.85) {
  const c = new THREE.Color(base);
  return `rgb(${Math.round(Math.min(1, c.r * k) * 255)},${Math.round(Math.min(1, c.g * k) * 255)},${Math.round(Math.min(1, c.b * k) * 255)})`;
}

/** Embroidered fabric: base colour with repeating gold cloud scrolls in raised thread (built in the background). */
export function patternedCloth(base: string, motif: string, repeat: [number, number], seed: number, grain = 1): TextureSet {
  return procSet('cloth', [base, motif, seed, grain], repeat, base, 0.62);
}

function smokeSprite() {
  const { c, g } = canvas(64);
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,0.9)');
  grd.addColorStop(0.4, 'rgba(255,255,255,0.35)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

/**
 * A colour map from the user's stone swatch (public/art/entrance/materials), usable at once (a flat
 * placeholder of the same tone) and filled in when the picture loads. `tiles` lays the swatch out
 * as tiles×tiles slabs per texture, each a touch lighter or darker, with soft dark grout between
 * them — on the same grid as the procedural floor's normal map, so the grooves line up.
 */
function swatchMap(file: string, repeat: [number, number], placeholder: string, tiles = 1) {
  const c = document.createElement('canvas');
  c.width = c.height = 4;
  const g0 = c.getContext('2d')!;
  g0.fillStyle = placeholder;
  g0.fillRect(0, 0, 4, 4);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat);
  t.anisotropy = 8;
  if (typeof Image === 'undefined') return t;
  const img = new Image();
  img.onload = () => {
    const S = img.width;
    const out = document.createElement('canvas');
    out.width = out.height = S * tiles;
    const g = out.getContext('2d')!;
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let y = 0; y < tiles; y++)
      for (let x = 0; x < tiles; x++) {
        // Each slab a different part of the stone (flipped), and its own slight tone.
        g.save();
        g.translate(x * S + (x % 2 ? S : 0), y * S + (y % 2 ? S : 0));
        g.scale(x % 2 ? -1 : 1, y % 2 ? -1 : 1);
        g.drawImage(img, 0, 0, S, S);
        g.restore();
        if (tiles > 1) {
          const k = rnd() - 0.5;
          g.fillStyle = k > 0 ? `rgba(255, 236, 214, ${k * 0.09})` : `rgba(8, 5, 3, ${-k * 0.16})`;
          g.fillRect(x * S, y * S, S, S);
        }
      }
    if (tiles > 1) {
      // Grout: a dark core with a soft falloff (the normal map carries the groove).
      const core = S * 0.012;
      const soft = S * 0.03;
      for (let i = 0; i <= tiles; i++) {
        const p = i * S;
        for (const [w, a] of [[soft * 2, 0.22], [core * 2, 0.55]] as const) {
          g.fillStyle = `rgba(10, 6, 4, ${a})`;
          g.fillRect(p - w / 2, 0, w, out.height);
          g.fillRect(0, p - w / 2, out.width, w);
        }
      }
    }
    t.dispose();
    t.image = out;
    t.needsUpdate = true;
  };
  img.src = `${import.meta.env.BASE_URL}art/entrance/materials/${file}`;
  return t;
}

let cache: ReturnType<typeof build> | null = null;

function build() {
  // Built in the background, in the order the forecourt and gate need them (they show first).
  // 乌朱漆: deep oxblood lacquer, a soft sheen rather than a hard white highlight.
  const lacquerSet = procSet('wood', ['#5a241c', 41, 0.5], [1, 4], look('#5a241c', 0.85), 0.56);
  const darkWoodSet = procSet('wood', ['#3a2619', 43, 0.7], [2, 2], look('#3a2619', 0.85), 0.77);
  const gold = procSet('gold', [], [2, 2], look('#c89f55', 0.97), 0.35);
  const stone = procSet('stone', [7, '#7a7d74'], [1.5, 1.5], look('#7a7d74', 0.94), 0.77);
  const darkStoneSet = procSet('stone', [27, '#4e4f4a'], [2, 2], look('#4e4f4a', 0.94), 0.77);
  // Hall and forecourt paving: the user's brown stone as the slabs' colour, the procedural grout
  // grooves and relief as their normal map (the same 2×2 grid).
  const floorProc = procSet('floor', [], [4, 7], look('#45403a', 0.93), 0.87);
  const floor: TextureSet = { ...floorProc, map: swatchMap('floor-stone.webp', [4, 7], 'rgb(56,49,44)', 2) };
  // The stone table (top, legs, stools, frame, apron): the user's grey stone, procedural relief.
  const tableProc = procSet('stone', [17, '#8b8d84'], [1, 1], look('#8b8d84', 0.94), 0.77);
  const tableStone: TextureSet = { ...tableProc, map: swatchMap('table-stone.webp', [1, 1], 'rgb(68,64,60)') };
  const apronProc = procSet('carvedPanel', [], [1, 1], look('#6f746c', 0.85), 0.77);
  const apron: TextureSet = { ...apronProc, map: swatchMap('table-stone.webp', [1, 1], 'rgb(68,64,60)') };
  const tableBase: TextureSet = { ...darkStoneSet, map: swatchMap('table-stone.webp', [2, 2], 'rgb(68,64,60)') };
  // Altar cloth: old gold on a dark ground, not a bright yellow field.
  const clothSet = patternedCloth('#2a1d16', '#5e4a30', [2, 1], 51, 0.4);
  const cushionSet = patternedCloth('#6b4a1e', '#b48a3c', [1, 1], 61);
  const std = (p: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(p);
  const fromSet = (s: TextureSet, p: THREE.MeshStandardMaterialParameters = {}) => std({ map: s.map, normalMap: s.normalMap, roughnessMap: s.roughnessMap, ...p });
  return {
    textures: { stone: stone.map, smoke: smokeSprite(), tableStone },
    sets: { stone, tableStone, darkStone: darkStoneSet, gold },
    floor: fromSet(floor, { metalness: 0.02 }),
    stone: fromSet(stone, { metalness: 0.02 }),
    tableStone: fromSet(tableStone, { metalness: 0.03 }),
    /** The table's frame and the stools' bases: the same grey stone, slightly darker. */
    tableBase: fromSet(tableBase, { color: '#c9c4bc' }),
    apronStone: fromSet(apron, { metalness: 0.03 }),
    darkStone: fromSet(darkStoneSet),
    lacquer: fromSet(lacquerSet, { metalness: 0.08 }),
    darkWood: fromSet(darkWoodSet),
    wall: std({ color: '#2a1d16', roughness: 0.95 }),
    gilt: fromSet(gold, { metalness: 0.85, envMapIntensity: 1.2 }),
    bronze: std({ color: '#5e4a2c', metalness: 0.85, roughness: 0.42 }),
    ash: std({ color: '#8d867b', roughness: 1 }),
    cloth: fromSet(clothSet, { roughness: 0.7 }),
    cushion: fromSet(cushionSet),
    halo: fromSet(gold, { metalness: 0.9, emissive: '#c08a35', emissiveIntensity: 0.25 }),
    flame: new THREE.MeshBasicMaterial({ color: '#ffd38a', toneMapped: false }),
    flameGlow: new THREE.MeshBasicMaterial({ color: '#ff9c3c', transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
    wick: new THREE.MeshStandardMaterial({ color: '#1c130c', roughness: 1 }),
    candle: std({ color: '#6e2219', roughness: 0.6 }),
    stick: std({ color: '#7a3a1c', roughness: 0.85 }),
    porcelain: std({ color: '#f1ece2', roughness: 0.22, metalness: 0.0 }),
  };
}

export function sceneMaterials() {
  cache ??= build();
  return cache;
}

/** Shared unit geometries; meshes scale them instead of allocating per instance. */
let geo: ReturnType<typeof buildGeo> | null = null;
function buildGeo() {
  return {
    box: new THREE.BoxGeometry(1, 1, 1),
    cylinder: new THREE.CylinderGeometry(1, 1, 1, 32),
    cylinderLow: new THREE.CylinderGeometry(1, 1, 1, 12),
    sphere: new THREE.SphereGeometry(1, 32, 20),
    cone: new THREE.ConeGeometry(1, 1, 16),
  };
}
export function sharedGeometry() {
  geo ??= buildGeo();
  return geo;
}

/** Lathe from (radius, height) pairs. */
export function lathe(profile: [number, number][], segments = 40) {
  const g = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), segments);
  g.computeVertexNormals();
  return g;
}

/** Rounded box via extruded rounded rectangle with bevelled edges. */
export function roundedSlab(w: number, d: number, h: number, radius: number, bevel: number, segments = 3) {
  const s = new THREE.Shape();
  const x = -w / 2 + bevel;
  const y = -d / 2 + bevel;
  const W = w - 2 * bevel;
  const D = d - 2 * bevel;
  const r = Math.min(radius, W / 2, D / 2);
  s.moveTo(x + r, y);
  s.lineTo(x + W - r, y);
  s.quadraticCurveTo(x + W, y, x + W, y + r);
  s.lineTo(x + W, y + D - r);
  s.quadraticCurveTo(x + W, y + D, x + W - r, y + D);
  s.lineTo(x + r, y + D);
  s.quadraticCurveTo(x, y + D, x, y + D - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ExtrudeGeometry(s, { depth: h - 2 * bevel, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: segments, curveSegments: 6 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, bevel, 0); // bottom at y = 0
  g.computeVertexNormals();
  return g;
}
