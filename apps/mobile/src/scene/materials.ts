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
 * A texture from the user's stone pictures (public/art/entrance/materials, built by
 * scripts/build-stone-maps.py), usable at once (a flat placeholder of the same tone) and filled
 * in when the picture loads. Colour maps are sRGB; a normal map is linear data.
 */
function swatchMap(file: string, repeat: [number, number], placeholder: string, srgb = true) {
  const c = document.createElement('canvas');
  c.width = c.height = 4;
  const g0 = c.getContext('2d')!;
  g0.fillStyle = placeholder;
  g0.fillRect(0, 0, 4, 4);
  const t = new THREE.Texture<HTMLCanvasElement | HTMLImageElement>(c);
  t.needsUpdate = true;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat);
  t.anisotropy = 8;
  if (typeof Image === 'undefined') return t;
  const img = new Image();
  img.onload = () => {
    t.dispose();
    t.image = img;
    t.needsUpdate = true;
  };
  img.src = `${import.meta.env.BASE_URL}art/entrance/materials/${file}`;
  return t;
}

/** One texture of the floor tiles covers this many metres each way (three slabs across, four rows). */
export const FLOOR_TILE = 2.4;

/** A floor plane whose UVs run in tiles of FLOOR_TILE metres, so every floor has the same slab size. */
export function tiledPlane(width: number, depth: number, tile = FLOOR_TILE) {
  const geo = new THREE.PlaneGeometry(width, depth);
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * width) / tile, (uv.getY(i) * depth) / tile);
  uv.needsUpdate = true;
  return geo;
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
  // Hall, forecourt and courtyard paving: the user's running-bond stone tiles as the colour, and a
  // shallow relief made from that same picture as the normal map (joints sink). Floors use
  // tiledPlane(), so the maps repeat every FLOOR_TILE metres.
  const floorMap = swatchMap('floor-tiles.webp', [1, 1], 'rgb(46,39,31)');
  const floorNormal = swatchMap('floor-tiles-normal.webp', [1, 1], 'rgb(128,128,255)', false);
  // The stone table (top, edge, legs, stools, frame): the user's dark stone, procedural relief.
  const tableProc = procSet('stone', [17, '#8b8d84'], [1, 1], look('#8b8d84', 0.94), 0.77);
  const tableStone: TextureSet = { ...tableProc, map: swatchMap('table-stone.webp', [1, 1], 'rgb(33,31,29)') };
  const apronProc = procSet('carvedPanel', [], [1, 1], look('#6f746c', 0.85), 0.77);
  const apron: TextureSet = { ...apronProc, map: swatchMap('table-stone.webp', [1, 1], 'rgb(33,31,29)') };
  const tableBase: TextureSet = { ...darkStoneSet, map: swatchMap('table-stone.webp', [2, 2], 'rgb(33,31,29)') };
  // Altar cloth: old gold on a dark ground, not a bright yellow field.
  const clothSet = patternedCloth('#2a1d16', '#5e4a30', [2, 1], 51, 0.4);
  const cushionSet = patternedCloth('#6b4a1e', '#b48a3c', [1, 1], 61);
  const std = (p: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(p);
  const fromSet = (s: TextureSet, p: THREE.MeshStandardMaterialParameters = {}) => std({ map: s.map, normalMap: s.normalMap, roughnessMap: s.roughnessMap, ...p });
  return {
    textures: { stone: stone.map, smoke: smokeSprite(), tableStone },
    sets: { stone, tableStone, darkStone: darkStoneSet, gold },
    floor: std({ map: floorMap, normalMap: floorNormal, normalScale: new THREE.Vector2(0.7, 0.7), roughness: 0.88, metalness: 0.02 }),
    stone: fromSet(stone, { metalness: 0.02 }),
    // The user's dark stone as it is: a faint relief only, one even honed roughness (no speckled sheen).
    tableStone: std({ map: tableStone.map, normalMap: tableStone.normalMap, normalScale: new THREE.Vector2(0.3, 0.3), roughness: 0.84, metalness: 0.03 }),
    /** The table's frame and the stools' bases: the same grey stone, slightly darker. */
    tableBase: std({ map: tableBase.map, normalMap: tableBase.normalMap, normalScale: new THREE.Vector2(0.3, 0.3), roughness: 0.86, color: '#c9c4bc' }),
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
