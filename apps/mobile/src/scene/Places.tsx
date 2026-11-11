/**
 * The two other places in the hall, built from the hall's own materials:
 *   藏经阁 — a lacquer sutra cabinet whose pigeonholes hold brocade-wrapped sutra cases (经函,
 *            each with a paper title slip) and bundles of scrolls lying on their rods;
 *   问事录 — a writing desk (open record album in brush script, brush pot, inkstone, seal box)
 *            before a shelf of thread-bound record books (indigo covers, cream page edges).
 * Everything repeated is instanced, so the whole cabinet costs a handful of draw calls.
 * Tapping either goes there.
 */
import { useMemo, useRef } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { plaqueTexture } from './Exterior';
import { patternedCloth, sceneMaterials, sharedGeometry } from './materials';
import { PLACE_SPOTS, type Place } from './placeLayout';
import { sceneInsets } from './insets';
import { StaticBatch } from './StaticBatch';

const BRUSH = "'WenguaBrush', 'WenguaSerifHeading', serif";

function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, fontRedraw = false) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  draw(g);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (fontRedraw)
    document.fonts?.load(`64px ${BRUSH}`).then(() => {
      g.clearRect(0, 0, w, h);
      draw(g);
      t.needsUpdate = true;
    });
  return t;
}

/** Paper title slip with a short column of brushed characters. */
function slipTexture() {
  return canvasTex(64, 128, (g) => {
    g.fillStyle = '#efe4c8';
    g.fillRect(0, 0, 64, 128);
    g.strokeStyle = 'rgba(120, 90, 50, 0.5)';
    g.lineWidth = 3;
    g.strokeRect(4, 4, 56, 120);
    g.fillStyle = '#2a1d14';
    g.font = `40px ${BRUSH}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    ['道', '经'].forEach((ch, i) => g.fillText(ch, 32, 38 + i * 50));
  }, true);
}

/** Front of a stack of four thread-bound books: thin indigo covers between cream page blocks. */
function bookStackFront() {
  return canvasTex(128, 128, (g) => {
    for (let b = 0; b < 4; b++) {
      const y0 = b * 32;
      g.fillStyle = '#1f2b44';
      g.fillRect(0, y0, 128, 3);
      g.fillStyle = '#e6d9bb';
      g.fillRect(0, y0 + 3, 128, 26);
      g.strokeStyle = 'rgba(140, 120, 90, 0.35)';
      g.lineWidth = 1;
      for (let l = 0; l < 6; l++) {
        g.beginPath();
        g.moveTo(0, y0 + 6 + l * 4);
        g.lineTo(128, y0 + 6 + l * 4);
        g.stroke();
      }
      g.fillStyle = '#1f2b44';
      g.fillRect(0, y0 + 29, 128, 3);
    }
  });
}

/** Top of a book: indigo cloth cover, a cream title slip, and the silk thread binding on the spine. */
function bookTop() {
  return canvasTex(128, 128, (g) => {
    g.fillStyle = '#22304c';
    g.fillRect(0, 0, 128, 128);
    g.fillStyle = 'rgba(255, 255, 255, 0.04)';
    for (let i = 0; i < 128; i += 3) g.fillRect(0, i, 128, 1);
    g.fillStyle = '#ece0c2';
    g.fillRect(18, 14, 22, 76);
    g.fillStyle = '#2a1d14';
    g.font = `20px ${BRUSH}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    ['问', '事', '录'].forEach((ch, i) => g.fillText(ch, 29, 30 + i * 22));
    g.strokeStyle = '#d9cfb8';
    g.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      g.beginPath();
      g.moveTo(112, 12 + i * 26);
      g.lineTo(128, 12 + i * 26);
      g.stroke();
    }
  }, true);
}

/** Indigo cloth book case (函套) seen from the front: two bone clasps and a title slip. */
function bookCaseFront() {
  return canvasTex(128, 128, (g) => {
    g.fillStyle = '#1d2a45';
    g.fillRect(0, 0, 128, 128);
    g.fillStyle = 'rgba(255, 255, 255, 0.05)';
    for (let i = 0; i < 128; i += 3) g.fillRect(i, 0, 1, 128);
    g.fillStyle = '#e8dcc0';
    g.fillRect(14, 16, 18, 96);
    g.fillStyle = '#2a1d14';
    g.font = `16px ${BRUSH}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    ['问', '事', '录'].forEach((ch, i) => g.fillText(ch, 23, 36 + i * 26));
    g.fillStyle = '#efe6d0';
    for (const y of [34, 86]) g.fillRect(100, y, 20, 8);
  }, true);
}

/** An open record album: columns of brushed text, a date line and a red seal. */
function albumTexture() {
  const lines = ['初筮告再三渎渎则不告', '有疑方卜无事不占', '不诚不卜不义不卜', '心动即占静心起卦', '所问之事后来如何'];
  return canvasTex(512, 320, (g) => {
    g.fillStyle = '#efe5cb';
    g.fillRect(0, 0, 512, 320);
    g.fillStyle = 'rgba(0, 0, 0, 0.08)';
    g.fillRect(252, 0, 8, 320);
    g.strokeStyle = 'rgba(150, 60, 40, 0.35)';
    g.lineWidth = 1;
    for (let x = 24; x < 500; x += 40) {
      if (x > 240 && x < 272) continue;
      g.beginPath();
      g.moveTo(x, 18);
      g.lineTo(x, 302);
      g.stroke();
    }
    g.fillStyle = '#1c140e';
    g.font = `26px ${BRUSH}`;
    g.textAlign = 'center';
    g.textBaseline = 'top';
    let col = 0;
    for (const line of lines)
      for (let k = 0; k < 2; k++) {
        const x = 484 - col * 40 - (col >= 6 ? 32 : 0);
        if (x < 30) break;
        [...line].slice(k * 5, k * 5 + 5).forEach((ch, i) => g.fillText(ch, x, 26 + i * 30));
        col++;
      }
    g.fillStyle = '#b2321f';
    g.fillRect(56, 236, 40, 40);
    g.fillStyle = '#efe5cb';
    g.font = `16px ${BRUSH}`;
    g.fillText('问道', 76, 248);
  }, true);
}

function Plaque({ text, position, scale = 0.42 }: { text: string; position: [number, number, number]; scale?: number }) {
  const m = sceneMaterials();
  const tex = useMemo(() => plaqueTexture(text), [text]);
  return (
    <group position={position} scale={scale}>
      <mesh scale={[4.0, 1.52, 0.14]} geometry={sharedGeometry().box} material={m.darkWood} />
      <mesh position={[0, 0, 0.075]}>
        <planeGeometry args={[3.9, 1.42]} />
        <meshStandardMaterial map={tex} roughness={0.45} metalness={0.25} emissive="#3a2208" emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}

/** 藏经阁: a lacquer cabinet, 4 × 5 pigeonholes of sutra cases and scroll bundles. Local front is +z. */
function SutraCabinet() {
  const m = sceneMaterials();
  const g = sharedGeometry();
  const W = 2.6;
  const H = 2.55;
  const D = 0.55;
  const cols = 4;
  const rows = 5;
  const cellW = (W - 0.2) / cols;
  const cellH = (H - 0.5) / rows;
  const parts = useMemo(() => {
    let seed = 11;
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    const brocade = patternedCloth('#d9d2c4', '#ffffff', [1, 1], 141).map;
    const caseMat = new THREE.MeshStandardMaterial({ map: brocade, roughness: 0.75 });
    const slipMat = new THREE.MeshStandardMaterial({ map: slipTexture(), roughness: 0.9 });
    const paperMat = new THREE.MeshStandardMaterial({ color: '#e3d6b6', roughness: 0.85 });
    const rodMat = sceneMaterials().darkWood;
    const tones = ['#2b3a5e', '#8e6a22', '#6b2a22', '#2b3a5e', '#3e4f3a'].map((c) => new THREE.Color(c));
    type Case = { x: number; y: number; z: number; w: number; h: number; d: number; ry: number; tone: THREE.Color };
    const cases: Case[] = [];
    const scrolls: { x: number; y: number; z: number; len: number; r: number }[] = [];
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const cx = -W / 2 + 0.1 + cellW * (c + 0.5);
        const floor = 0.35 + cellH * r + 0.02;
        // Left half: a stack of sutra cases; right half: another stack, or a bundle of scrolls.
        const bundle = (r + c) % 3 === 1;
        for (const side of bundle ? [-1] : [-1, 1]) {
          const n = 2 + Math.floor(rnd() * 2);
          const tone = tones[Math.floor(rnd() * tones.length)];
          for (let k = 0; k < n; k++) {
            const h = 0.072;
            cases.push({ x: cx + side * 0.138 + (rnd() - 0.5) * 0.012, y: floor + h / 2 + k * (h + 0.004), z: 0.04, w: 0.25, h, d: 0.36, ry: (rnd() - 0.5) * 0.05, tone });
          }
        }
        if (bundle) {
          const len = 0.25;
          const sx = cx + 0.14;
          for (const [dx, dy] of [
            [-0.045, 0],
            [0.045, 0],
            [0, 0.07],
          ])
            scrolls.push({ x: sx + dx, y: floor + 0.036 + dy, z: 0.12, len, r: 0.034 + rnd() * 0.004 });
        }
      }
    const mtx = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const caseMesh = new THREE.InstancedMesh(g.box, caseMat, cases.length);
    const slipMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), slipMat, cases.length);
    cases.forEach((cs, i) => {
      q.setFromEuler(e.set(0, cs.ry, 0));
      mtx.compose(new THREE.Vector3(cs.x, cs.y, cs.z), q, new THREE.Vector3(cs.w, cs.h, cs.d));
      caseMesh.setMatrixAt(i, mtx);
      caseMesh.setColorAt(i, cs.tone);
      // Slip on the front face, upright.
      const fz = cs.z + cs.d / 2 + 0.002;
      mtx.compose(new THREE.Vector3(cs.x - 0.06, cs.y, fz), q, new THREE.Vector3(0.03, cs.h * 0.82, 1));
      slipMesh.setMatrixAt(i, mtx);
    });
    // Scrolls lie along x: paper roll plus dark rod ends.
    const along = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI / 2));
    const rollMesh = new THREE.InstancedMesh(g.cylinder, paperMat, scrolls.length);
    const rodMesh = new THREE.InstancedMesh(g.cylinder, rodMat, scrolls.length * 2);
    scrolls.forEach((s, i) => {
      mtx.compose(new THREE.Vector3(s.x, s.y, s.z), along, new THREE.Vector3(s.r, s.len, s.r));
      rollMesh.setMatrixAt(i, mtx);
      for (const k of [0, 1]) {
        mtx.compose(new THREE.Vector3(s.x + (k ? 1 : -1) * (s.len / 2 + 0.015), s.y, s.z), along, new THREE.Vector3(s.r * 0.45, 0.03, s.r * 0.45));
        rodMesh.setMatrixAt(i * 2 + k, mtx);
      }
    });
    return { caseMesh, slipMesh, rollMesh, rodMesh };
  }, [cellW, cellH, g]);
  return (
    <group>
      {/* Plinth, back, sides, crown */}
      <mesh position={[0, 0.15, 0]} scale={[W + 0.1, 0.3, D + 0.08]} geometry={g.box} material={m.lacquer} castShadow />
      <mesh position={[0, H / 2 + 0.15, -D / 2 + 0.04]} scale={[W, H - 0.3, 0.08]} geometry={g.box} material={m.darkWood} />
      {[-1, 1].map((sx) => (
        <mesh key={sx} position={[sx * (W / 2 - 0.04), H / 2 + 0.15, 0]} scale={[0.08, H - 0.3, D]} geometry={g.box} material={m.lacquer} />
      ))}
      <mesh position={[0, H + 0.05, 0]} scale={[W + 0.18, 0.12, D + 0.12]} geometry={g.box} material={m.lacquer} />
      <mesh position={[0, H + 0.12, 0]} scale={[W + 0.22, 0.03, D + 0.14]} geometry={g.box} material={m.gilt} />
      {/* Lacquer dividers with gilt edges */}
      {Array.from({ length: cols + 1 }, (_, c) => (
        <mesh key={`v${c}`} position={[-W / 2 + 0.1 + cellW * c, H / 2 + 0.1, 0]} scale={[0.04, H - 0.5, D]} geometry={g.box} material={m.lacquer} />
      ))}
      {Array.from({ length: rows + 1 }, (_, r) => (
        <group key={`h${r}`}>
          <mesh position={[0, 0.35 + cellH * r, 0]} scale={[W - 0.16, 0.035, D]} geometry={g.box} material={m.lacquer} />
          <mesh position={[0, 0.35 + cellH * r, D / 2 + 0.002]} scale={[W - 0.16, 0.012, 0.004]} geometry={g.box} material={m.gilt} />
        </group>
      ))}
      <primitive object={parts.caseMesh} />
      <primitive object={parts.slipMesh} />
      <primitive object={parts.rollMesh} />
      <primitive object={parts.rodMesh} />
      <Plaque text="藏经阁" position={[0, H + 0.48, 0.12]} />
    </group>
  );
}

/** 问事录: a writing desk before a shelf of thread-bound record books. Local front is +z. */
function RecordDesk() {
  const m = sceneMaterials();
  const g = sharedGeometry();
  const top = 0.84;
  const parts = useMemo(() => {
    const pages = new THREE.MeshStandardMaterial({ map: bookStackFront(), roughness: 0.9 });
    const cover = new THREE.MeshStandardMaterial({ map: bookTop(), roughness: 0.8 });
    const under = new THREE.MeshStandardMaterial({ color: '#1f2b44', roughness: 0.8 });
    // BoxGeometry faces: +x, -x, +y, -y, +z, -z.
    const stack = new THREE.InstancedMesh(g.box, [pages, pages, cover, under, pages, pages], 4 * 6);
    const caseFront = new THREE.MeshStandardMaterial({ map: bookCaseFront(), roughness: 0.85 });
    const caseSide = new THREE.MeshStandardMaterial({ color: '#1d2a45', roughness: 0.85 });
    const cases = new THREE.InstancedMesh(g.box, [caseSide, caseSide, caseSide, caseSide, caseFront, caseSide], 4 * 6);
    const hide = new THREE.Matrix4().compose(new THREE.Vector3(0, -10, 0), new THREE.Quaternion(), new THREE.Vector3(0.001, 0.001, 0.001));
    const mtx = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    let seed = 5;
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    let i = 0;
    for (const [si, y] of [0.44, 0.94, 1.44, 1.94].entries())
      for (let k = 0; k < 6; k++) {
        if ((k + si) % 5 === 4) {
          // A gap on the shelf, as on a real one.
          stack.setMatrixAt(i, hide);
          cases.setMatrixAt(i++, hide);
          continue;
        }
        // Alternate loose stacks of books with books kept in their indigo cloth cases.
        const inCase = (k + si) % 2 === 0;
        q.setFromEuler(new THREE.Euler(0, (rnd() - 0.5) * 0.12, 0));
        const h = inCase ? 0.16 : 0.12;
        mtx.compose(new THREE.Vector3(-0.92 + k * 0.37 + (rnd() - 0.5) * 0.03, y + 0.02 + h / 2, -0.26), q, new THREE.Vector3(inCase ? 0.31 : 0.3, h, 0.22));
        (inCase ? cases : stack).setMatrixAt(i, mtx);
        (inCase ? stack : cases).setMatrixAt(i, hide);
        i++;
      }
    const album = new THREE.MeshStandardMaterial({ map: albumTexture(), roughness: 0.9 });
    return { stack, cases, album };
  }, [g]);
  return (
    <group>
      {/* Shelf: back, sides, boards */}
      <mesh position={[0, 1.3, -0.5]} scale={[2.4, 2.4, 0.06]} geometry={g.box} material={m.darkWood} />
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 1.18, 1.3, -0.33]} scale={[0.06, 2.4, 0.36]} geometry={g.box} material={m.lacquer} />
      ))}
      {[0.42, 0.92, 1.42, 1.92, 2.42].map((y) => (
        <group key={y}>
          <mesh position={[0, y, -0.33]} scale={[2.3, 0.04, 0.34]} geometry={g.box} material={m.lacquer} />
          <mesh position={[0, y, -0.157]} scale={[2.3, 0.01, 0.004]} geometry={g.box} material={m.gilt} />
        </group>
      ))}
      <primitive object={parts.stack} />
      <primitive object={parts.cases} />
      {/* Desk */}
      <mesh position={[0, top - 0.04, 0.35]} scale={[1.9, 0.08, 0.8]} geometry={g.box} material={m.lacquer} castShadow receiveShadow />
      <mesh position={[0, top - 0.005, 0.35]} scale={[1.92, 0.01, 0.82]} geometry={g.box} material={m.gilt} />
      {[-0.85, 0.85].map((x) => [0.02, 0.68].map((z) => <mesh key={`${x}${z}`} position={[x, (top - 0.08) / 2, z]} scale={[0.07, top - 0.08, 0.07]} geometry={g.box} material={m.lacquer} />))}
      {/* Open record album in brush script */}
      <mesh position={[-0.05, top + 0.012, 0.38]} rotation={[-Math.PI / 2, 0, 0]} material={parts.album}>
        <planeGeometry args={[0.72, 0.45]} />
      </mesh>
      {/* Brush pot with brushes */}
      <group position={[0.62, top, 0.2]}>
        <mesh position={[0, 0.09, 0]} scale={[0.06, 0.18, 0.06]} geometry={g.cylinder} material={m.darkWood} />
        {[-0.02, 0.0, 0.025].map((x, i) => (
          <mesh key={i} position={[x, 0.24, (i - 1) * 0.015]} rotation={[0.08 * (i - 1), 0, x * 3]} scale={[0.006, 0.22, 0.006]} geometry={g.cylinder} material={m.lacquer} />
        ))}
      </group>
      {/* Inkstone with its well, and a red seal box */}
      <mesh position={[0.6, top + 0.02, 0.5]} scale={[0.2, 0.04, 0.13]} geometry={g.box} material={m.darkStone} />
      <mesh position={[0.6, top + 0.041, 0.47]} scale={[0.06, 0.004, 0.04]} geometry={g.cylinder}>
        <meshStandardMaterial color="#050506" roughness={0.2} />
      </mesh>
      <mesh position={[-0.62, top + 0.03, 0.55]} scale={[0.09, 0.06, 0.09]} geometry={g.box}>
        <meshStandardMaterial color="#8e2418" roughness={0.5} />
      </mesh>
      <Plaque text="问事录" position={[0, 2.95, -0.3]} />
    </group>
  );
}

export function Places({ onPlace }: { onPlace?: (p: Place) => void }) {
  const go = (p: Place) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onPlace?.(p);
  };
  // (TempleScene ignores these taps outside the idle phase.)
  const lib = PLACE_SPOTS.library;
  const rec = PLACE_SPOTS.records;
  // A single reading lamp that moves to whichever place is visited (one light, not two: every
  // extra light costs every pixel of the hall on a phone).
  const lamp = useRef<THREE.PointLight>(null);
  const LAMP = useMemo(() => ({ library: new THREE.Vector3(lib.pos[0] + 1.8, 2.6, lib.pos[2]), records: new THREE.Vector3(rec.pos[0] - 1.7, 2.5, rec.pos[2]) }), [lib, rec]);
  useFrame(() => {
    const p = sceneInsets.place;
    if (lamp.current && p !== 'altar') lamp.current.position.copy(LAMP[p]);
  });
  return (
    <group>
      <pointLight ref={lamp} position={LAMP.library.toArray()} intensity={16} distance={7} decay={1.5} color="#ffcf96" />
      <group position={lib.pos} rotation={[0, lib.facing, 0]} onClick={go('library')}>
        <StaticBatch>
          <SutraCabinet />
        </StaticBatch>
      </group>
      <group position={rec.pos} rotation={[0, rec.facing, 0]} onClick={go('records')}>
        <StaticBatch>
          <RecordDesk />
        </StaticBatch>
      </group>
    </group>
  );
}
