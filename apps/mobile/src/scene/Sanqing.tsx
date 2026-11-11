/**
 * 三清祖师 seated on the altar. Each is the artist's own painting, cut out and shown exactly as
 * painted (colours untouched), sitting on a carved base (须弥座) of its own: 元始天尊 in the
 * middle, raised and set back; 太上老君 on the viewer's left and 灵宝天尊 on the viewer's right,
 * turned slightly toward the middle. A glowing halo hangs behind each head and each figure
 * casts a soft shadow on the gold cloud screen, so they read as figures in the hall rather than
 * one flat picture.
 *
 * (Layout numbers live in shrineLayout.ts. The sculpted statues were dropped on 2026-11-10 and
 * the single hung painting on 2026-11-11, both at the user's request.)
 */
import { useMemo } from 'react';
import * as THREE from 'three';
import { plaqueTexture } from './Exterior';
import { sceneMaterials, sharedGeometry } from './materials';
import { DEITIES, cardBottom, cardSize, type DeitySeat } from './shrineLayout';

interface DeityArt {
  map: THREE.Texture;
  /** Small, soft copy of the silhouette (filled once the image arrives). */
  shadow: THREE.CanvasTexture;
}

const art = new Map<string, DeityArt>();

function deityArt(d: DeitySeat): DeityArt {
  let a = art.get(d.key);
  if (a) return a;
  // A tiny canvas, scaled up with linear filtering, gives a soft blurred silhouette for free.
  const canvas = document.createElement('canvas');
  canvas.width = 40;
  canvas.height = Math.round((40 * d.px[1]) / d.px[0]);
  const shadow = new THREE.CanvasTexture(canvas);
  const map = new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}${d.file}`, (tex) => {
    const g = canvas.getContext('2d');
    if (!g) return;
    g.clearRect(0, 0, canvas.width, canvas.height);
    // Inset so the blur has room to fade out at the edges.
    g.drawImage(tex.image as CanvasImageSource, 3, 3, canvas.width - 6, canvas.height - 6);
    shadow.needsUpdate = true;
  });
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  a = { map, shadow };
  art.set(d.key, a);
  return a;
}

/** Start loading the three paintings early (while the title screen shows). */
export function preloadShrine() {
  for (const d of DEITIES) deityArt(d);
}

let haloTex: THREE.CanvasTexture | null = null;
/** Gold halo: a soft glow with a fine double ring and the eight trigrams, as in the paintings. */
function haloTexture() {
  if (haloTex) return haloTex;
  const s = 512;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d')!;
  const r = s / 2;
  const glow = g.createRadialGradient(r, r, 0, r, r, r);
  glow.addColorStop(0, 'rgba(255, 236, 190, 0.55)');
  glow.addColorStop(0.45, 'rgba(255, 214, 140, 0.28)');
  glow.addColorStop(0.78, 'rgba(255, 196, 110, 0.12)');
  glow.addColorStop(1, 'rgba(255, 190, 100, 0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, s, s);
  g.strokeStyle = 'rgba(255, 226, 160, 0.9)';
  for (const [rr, w] of [
    [0.86, 5],
    [0.78, 2.5],
  ] as const) {
    g.lineWidth = w;
    g.beginPath();
    g.arc(r, r, r * rr, 0, Math.PI * 2);
    g.stroke();
  }
  // The eight trigrams between the two rings (先天 order, 乾 at the top).
  const TRIGRAMS = [
    [1, 1, 1],
    [1, 1, 0],
    [1, 0, 1],
    [1, 0, 0],
    [0, 1, 1],
    [0, 1, 0],
    [0, 0, 1],
    [0, 0, 0],
  ];
  const order = [0, 4, 6, 7, 3, 2, 1, 5]; // 乾 巽 坎 艮 坤 震 离 兑, clockwise from the top
  g.fillStyle = 'rgba(255, 230, 170, 0.95)';
  order.forEach((ti, k) => {
    const ang = (k / 8) * Math.PI * 2;
    g.save();
    g.translate(r + Math.sin(ang) * r * 0.82, r - Math.cos(ang) * r * 0.82);
    g.rotate(ang);
    TRIGRAMS[ti].forEach((bit, j) => {
      const y = -9 + j * 7;
      if (bit) g.fillRect(-14, y, 28, 4);
      else {
        g.fillRect(-14, y, 11, 4);
        g.fillRect(3, y, 11, 4);
      }
    });
    g.restore();
  });
  haloTex = new THREE.CanvasTexture(c);
  haloTex.colorSpace = THREE.SRGBColorSpace;
  return haloTex;
}

/** Carved base (须弥座): plinth, recessed dark waist with a gold band, gilt-edged top. */
function Base({ d }: { d: DeitySeat }) {
  const m = sceneMaterials();
  const g = sharedGeometry();
  const { x, z, height: h, width: w, depth: dp } = d.base;
  const y0 = 1.22;
  const foot = h * 0.3;
  const top = h * 0.24;
  const waist = h - foot - top;
  return (
    <group position={[x, y0, z]} rotation={[0, d.card.turn, 0]}>
      <mesh position={[0, foot / 2, 0]} scale={[w + 0.12, foot, dp + 0.12]} geometry={g.box} material={m.lacquer} castShadow receiveShadow />
      <mesh position={[0, foot + 0.01, 0]} scale={[w + 0.14, 0.03, dp + 0.14]} geometry={g.box} material={m.gilt} />
      <mesh position={[0, foot + waist / 2, 0]} scale={[w - 0.16, waist, dp - 0.16]} geometry={g.box} material={m.darkWood} receiveShadow />
      <mesh position={[0, foot + waist / 2, 0]} scale={[w - 0.1, Math.min(0.05, waist * 0.3), dp - 0.1]} geometry={g.box} material={m.gilt} />
      <mesh position={[0, h - top / 2, 0]} scale={[w, top, dp]} geometry={g.box} material={m.lacquer} castShadow receiveShadow />
      <mesh position={[0, h - top + 0.012, 0]} scale={[w + 0.02, 0.024, dp + 0.02]} geometry={g.box} material={m.gilt} />
      <mesh position={[0, h - 0.008, 0]} scale={[w + 0.02, 0.016, dp + 0.02]} geometry={g.box} material={m.gilt} />
    </group>
  );
}

function Deity({ d }: { d: DeitySeat }) {
  const a = deityArt(d);
  const [w, h] = cardSize(d);
  const bottom = cardBottom(d);
  const mats = useMemo(
    () => ({
      // As painted: not re-lit or tone-mapped by the hall.
      card: new THREE.MeshBasicMaterial({ map: a.map, color: '#f4eee6', transparent: true, alphaTest: 0.04, toneMapped: false }),
      halo: new THREE.MeshBasicMaterial({ map: haloTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.85, toneMapped: false }),
      shadow: new THREE.MeshBasicMaterial({ map: a.shadow, color: '#000000', transparent: true, opacity: 0.42, depthWrite: false }),
      // A soft dark seam where the painted base meets the carved one.
      contact: new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.35, depthWrite: false }),
    }),
    [a],
  );
  const [hu, hv] = d.head;
  const headX = (hu - 0.5) * w;
  const headY = (1 - hv) * h;
  // Shadow on the screen: thrown back by the warm light in front of the altar, so it falls a
  // little higher, wider and away from the middle.
  const shadowX = d.card.x * 1.08;
  return (
    <group>
      <Base d={d} />
      <group position={[d.card.x, bottom, d.card.z]} rotation={[0, d.card.turn, 0]}>
        <mesh position={[headX, headY, -0.32]} material={mats.halo} renderOrder={1}>
          <planeGeometry args={[d.halo * 2, d.halo * 2]} />
        </mesh>
        <mesh position={[0, h / 2, 0]} material={mats.card} renderOrder={2}>
          <planeGeometry args={[w, h]} />
        </mesh>
        <mesh position={[0, 0.003, 0.08]} rotation={[-Math.PI / 2, 0, 0]} material={mats.contact} renderOrder={1}>
          <planeGeometry args={[w * 0.92, 0.16]} />
        </mesh>
      </group>
      <mesh position={[shadowX, bottom + h / 2 + 0.22, -16.02]} material={mats.shadow}>
        <planeGeometry args={[w * 1.12, h * 1.06]} />
      </mesh>
    </group>
  );
}

/** Lacquer plaque 「三清殿」 in brush script with a carved gilt frame (shared with the gate). */
function Plaque() {
  const m = sceneMaterials();
  const tex = useMemo(() => plaqueTexture('三清殿'), []);
  return (
    <group position={[0, 7.12, -15.85]} scale={0.8}>
      <mesh scale={[4.0, 1.52, 0.14]} geometry={sharedGeometry().box} material={m.darkWood} />
      <mesh position={[0, 0, 0.075]}>
        <planeGeometry args={[3.9, 1.42]} />
        <meshStandardMaterial map={tex} roughness={0.45} metalness={0.25} emissive="#3a2208" emissiveIntensity={0.35} />
      </mesh>
    </group>
  );
}

export function Sanqing() {
  return (
    <group>
      {DEITIES.map((d) => (
        <Deity key={d.key} d={d} />
      ))}
      <Plaque />
      {/* A warm wash over the altar, the bases and the offerings in front of the 三清. */}
      <pointLight position={[0, 3.2, -12.4]} intensity={4} distance={7.5} decay={1.5} color="#ffd2a0" />
    </group>
  );
}
