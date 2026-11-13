/**
 * The hall of the Three Pure Ones (三清殿): polished flagstones and a red runner, red-lacquer
 * columns with gold bands and carved brackets, colour-painted beams, a painted coffered ceiling
 * with a stepped caisson (藻井) over the altar, landscape murals and lit lattice doors on the
 * side walls, a gold cloud screen behind the statues, palace lanterns, tiered candle racks,
 * banners, light shafts from high windows, the burner, the kneeling cushion and the offerings.
 * Everything is generated in code (see ASSETS.md).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { flameGeometry, flameMaterial } from './flame';
import { introProgress } from './introState';
import { doorOpen } from './timeline';
import { drawCloud, lathe, normalFromHeight, patternedCloth, sceneMaterials, sharedGeometry, tiledPlane } from './materials';
import { LightingCandle, OfferingTable } from './Offerings';
import { Burner } from './Burner';
import { Courtyard, Facade } from './Exterior';
import { entranceTexture } from './entranceArt';
import { WORLD } from './timeline';
import type { V3 } from './timeline';

type MeshProps = { position: V3; scale: V3; material: THREE.Material; rotation?: V3; geometry?: THREE.BufferGeometry; shadows?: boolean };
function Block({ position, scale, material, rotation, geometry, shadows }: MeshProps) {
  const g = sharedGeometry();
  return <mesh position={position} scale={scale} rotation={rotation} geometry={geometry ?? g.box} material={material} castShadow={shadows} receiveShadow={shadows} />;
}

const COLUMN_Z = [8.5, 3.5, -1.5, -6.5, -11.5];
const HALL = { halfWidth: 8.9, ceiling: 8.6, back: -16.4, front: 13.6 };

// ---------------- painted textures ----------------

function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, repeat: [number, number] = [1, 1]) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat);
  t.anisotropy = 4;
  return t;
}

/**
 * The red runner as in the painted hall: muted burgundy with a fine weave, darker toward its edges,
 * a dark border band ruled in old gold, and a few faint cloud scrolls far apart (one canvas for the
 * whole 17 m length, so nothing repeats).
 */
function runnerTexture() {
  const W = 192;
  const H = 2048;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  g.fillStyle = '#4a171a';
  g.fillRect(0, 0, W, H);
  // Weave: fine uneven threads.
  for (let y = 0; y < H; y += 2) {
    g.fillStyle = `rgba(${y % 4 ? 20 : 90}, ${y % 4 ? 6 : 30}, ${y % 4 ? 8 : 32}, ${0.05 + ((y * 7919) % 13) / 260})`;
    g.fillRect(0, y, W, 1);
  }
  // Darker toward both edges.
  const edge = g.createLinearGradient(0, 0, W, 0);
  edge.addColorStop(0, 'rgba(12, 4, 5, 0.55)');
  edge.addColorStop(0.18, 'rgba(12, 4, 5, 0.1)');
  edge.addColorStop(0.82, 'rgba(12, 4, 5, 0.1)');
  edge.addColorStop(1, 'rgba(12, 4, 5, 0.55)');
  g.fillStyle = edge;
  g.fillRect(0, 0, W, H);
  // Border band ruled in old gold.
  for (const x of [10, W - 26]) {
    g.fillStyle = 'rgba(28, 9, 10, 0.75)';
    g.fillRect(x, 0, 16, H);
    g.fillStyle = 'rgba(150, 112, 64, 0.5)';
    g.fillRect(x, 0, 1.5, H);
    g.fillRect(x + 14.5, 0, 1.5, H);
  }
  // A few faint cloud scrolls, far apart, alternating sides.
  g.strokeStyle = 'rgba(150, 112, 64, 0.3)';
  g.lineWidth = 3;
  g.lineCap = 'round';
  for (let k = 0; k < 7; k++) drawCloud(g, W * (k % 2 ? 0.62 : 0.4), 150 + k * 280, 18);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

let decor: ReturnType<typeof buildDecor> | null = null;
function buildDecor() {
  // Beam painting (旋子彩画): blue/green bands, gold outlines, a whirl medallion in the centre.
  const beam = canvasTex(512, 64, (g) => {
    // Dark lacquered beams with faint old-gold lines (as in the painted hall).
    g.fillStyle = '#18120f';
    g.fillRect(0, 0, 512, 64);
    g.fillStyle = '#211913';
    g.fillRect(0, 10, 512, 44);
    g.strokeStyle = '#5a4630';
    g.lineWidth = 3;
    g.strokeRect(2, 8, 508, 48);
    for (const x of [64, 448]) {
      g.beginPath();
      g.moveTo(x - 30, 8);
      g.lineTo(x, 32);
      g.lineTo(x - 30, 56);
      g.stroke();
    }
    g.fillStyle = '#1f1814';
    g.beginPath();
    g.ellipse(256, 32, 90, 22, 0, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    for (let i = 0; i < 6; i++) {
      g.beginPath();
      g.arc(196 + i * 24, 32, 10, 0, Math.PI * 2);
      g.stroke();
    }
  }, [3, 1]);
  // Ceiling panels (天花): dark blue-green ground, gold circle with a lotus rosette.
  const panel = canvasTex(256, 256, (g) => {
    g.fillStyle = '#15100d';
    g.fillRect(0, 0, 256, 256);
    g.strokeStyle = '#33281e';
    g.lineWidth = 8;
    g.strokeRect(4, 4, 248, 248);
    g.fillStyle = '#1c1612';
    g.beginPath();
    g.arc(128, 128, 82, 0, Math.PI * 2);
    g.fill();
    g.lineWidth = 4;
    g.stroke();
    g.fillStyle = '#3a2e22';
    for (let i = 0; i < 8; i++) {
      g.save();
      g.translate(128, 128);
      g.rotate((i / 8) * Math.PI * 2);
      g.beginPath();
      g.ellipse(0, -38, 13, 30, 0, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
    g.fillStyle = '#4e231b';
    g.beginPath();
    g.arc(128, 128, 16, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#c9a24a';
    for (const [x, y] of [[20, 20], [236, 20], [20, 236], [236, 236]]) {
      g.beginPath();
      g.arc(x, y, 10, 0, Math.PI * 2);
      g.fill();
    }
  }, [9, 14]);
  // Mural (壁画): misty mountains, pines, clouds and cranes in mineral colours.
  const mural = canvasTex(1024, 384, (g) => {
    const sky = g.createLinearGradient(0, 0, 0, 384);
    sky.addColorStop(0, '#5a4a32');
    sky.addColorStop(1, '#3a2c1e');
    g.fillStyle = sky;
    g.fillRect(0, 0, 1024, 384);
    const ridge = (base: number, amp: number, color: string, seed: number) => {
      g.fillStyle = color;
      g.beginPath();
      g.moveTo(0, 384);
      for (let x = 0; x <= 1024; x += 8) g.lineTo(x, base - Math.abs(Math.sin(x * 0.006 + seed) * amp + Math.sin(x * 0.017 + seed * 2) * amp * 0.35));
      g.lineTo(1024, 384);
      g.fill();
    };
    ridge(260, 150, '#3f5a4c', 1);
    ridge(300, 110, '#2e4a3e', 3);
    ridge(350, 60, '#243a30', 5);
    g.strokeStyle = 'rgba(230, 214, 180, 0.55)';
    g.lineWidth = 5;
    for (const [x, y, s] of [[160, 110, 22], [520, 80, 28], [820, 130, 20], [360, 190, 16]]) drawCloud(g, x, y, s);
    g.strokeStyle = '#e8e0cc';
    g.lineWidth = 2.5;
    for (const [x, y] of [[300, 70], [640, 120], [700, 60]]) {
      g.beginPath();
      g.moveTo(x - 18, y + 4);
      g.quadraticCurveTo(x - 6, y - 8, x, y);
      g.quadraticCurveTo(x + 6, y - 8, x + 18, y + 4);
      g.stroke();
    }
    g.strokeStyle = '#c9a24a';
    g.lineWidth = 10;
    g.strokeRect(5, 5, 1014, 374);
  });
  // Lattice doors (隔扇): warm light behind a grid of wooden muntins.
  const lattice = canvasTex(256, 512, (g) => {
    g.fillStyle = '#ffcf8a';
    g.fillRect(0, 0, 256, 512);
    g.strokeStyle = '#3b1a12';
    g.lineWidth = 7;
    for (let x = 0; x <= 256; x += 32) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, 340);
      g.stroke();
    }
    for (let y = 0; y <= 340; y += 32) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(256, y);
      g.stroke();
    }
    g.fillStyle = '#4a1e14';
    g.fillRect(0, 340, 256, 172);
    g.strokeStyle = '#c9a24a';
    g.lineWidth = 6;
    g.strokeRect(18, 360, 220, 132);
    g.strokeRect(0, 0, 256, 512);
  });
  // Cloud screen behind the 三清: deep lacquer with a few large, muted gold clouds (not a dense repeat).
  const screen = patternedCloth('#2a1813', '#5a4528', [1.2, 0.8], 101, 0.3);
  return {
    beam: new THREE.MeshStandardMaterial({ map: beam, roughness: 0.7 }),
    panel: new THREE.MeshStandardMaterial({ map: panel, roughness: 0.75 }),
    mural: new THREE.MeshStandardMaterial({ map: mural, roughness: 0.9 }),
    lattice: new THREE.MeshStandardMaterial({ map: lattice, emissive: new THREE.Color('#ffb060'), emissiveMap: lattice, emissiveIntensity: 0.55, roughness: 0.8 }),
    // Smooth lacquer (no raised embroidery relief): a quiet ground so the 三清 lead.
    screen: new THREE.MeshStandardMaterial({ map: screen.map, roughness: 0.82, metalness: 0.05 }),
    runner: new THREE.MeshStandardMaterial({ map: runnerTexture(), roughness: 0.95 }),
    lanternPanel: new THREE.MeshStandardMaterial({ color: '#ffd9a0', emissive: new THREE.Color('#ff9a40'), emissiveIntensity: 1.7, roughness: 0.7, side: THREE.DoubleSide }),
    candleFlame: new THREE.MeshBasicMaterial({ color: '#ffd38a', toneMapped: false }),
    shaft: new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: `varying vec2 vUv; varying float vFacing; void main(){ vUv = uv; vec3 n = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position,1.0); vFacing = abs(dot(n, normalize(-mv.xyz))); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform float uTime; varying vec2 vUv; varying float vFacing; void main(){ float along = smoothstep(0.0,0.3,vUv.y) * smoothstep(1.0,0.75,vUv.y); float a = pow(vFacing,2.0) * along * (0.85 + 0.15*sin(vUv.x*40.0 + uTime*0.3)) * 0.07; gl_FragColor = vec4(1.0,0.86,0.62,a); }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    }),
  };
}
function useDecor() {
  decor ??= buildDecor();
  return decor;
}

// ---------------- pieces ----------------

/** Coffered painted ceiling and a stepped octagonal caisson (藻井) above the altar. */
function Ceiling() {
  const m = sceneMaterials();
  const d = useDecor();
  const caisson = useMemo(() => [0, 1, 2, 3].map((i) => lathe([[2.6 - i * 0.55, 0], [2.6 - i * 0.55, 0.32], [2.4 - i * 0.55, 0.32]], 8)), []);
  return (
    <group>
      <mesh position={[0, HALL.ceiling, -1.4]} rotation={[Math.PI / 2, 0, 0]} material={d.panel}>
        <planeGeometry args={[HALL.halfWidth * 2, 30]} />
      </mesh>
      <group position={[0, HALL.ceiling - 0.05, -10]}>
        {caisson.map((g, i) => (
          <mesh key={i} position={[0, i * 0.3, 0]} geometry={g} material={i % 2 ? m.gilt : d.beam} />
        ))}
        <mesh position={[0, 1.25, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.gilt}>
          <circleGeometry args={[0.9, 32]} />
        </mesh>
      </group>
    </group>
  );
}

/** Carved gold bracket (雀替) where a beam meets a column. */
let bracketGeo: THREE.ExtrudeGeometry | null = null;
function Bracket({ position, side }: { position: V3; side: 1 | -1 }) {
  const m = sceneMaterials();
  bracketGeo ??= (() => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.lineTo(1.1, 0);
    s.quadraticCurveTo(0.9, -0.15, 0.7, -0.18);
    s.quadraticCurveTo(0.5, -0.2, 0.42, -0.32);
    s.quadraticCurveTo(0.3, -0.5, 0, -0.62);
    s.closePath();
    return new THREE.ExtrudeGeometry(s, { depth: 0.1, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 2, curveSegments: 8 });
  })();
  return <mesh position={position} scale={[side, 1, 1]} geometry={bracketGeo} material={m.gilt} />;
}

/** Hexagonal palace lantern (宫灯) with glowing silk panels and a tassel. */
function PalaceLantern({ position }: { position: V3 }) {
  const m = sceneMaterials();
  const d = useDecor();
  const g = sharedGeometry();
  return (
    <group position={position}>
      <Block position={[0, 1.0, 0]} scale={[0.012, 1.6, 0.012]} geometry={g.cylinderLow} material={m.gilt} />
      <mesh material={d.lanternPanel}>
        <cylinderGeometry args={[0.26, 0.26, 0.5, 6, 1, true]} />
      </mesh>
      <mesh position={[0, 0.3, 0]} material={m.lacquer}>
        <cylinderGeometry args={[0.2, 0.32, 0.12, 6]} />
      </mesh>
      <mesh position={[0, -0.3, 0]} material={m.lacquer}>
        <cylinderGeometry args={[0.32, 0.18, 0.12, 6]} />
      </mesh>
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const a = (i / 6) * Math.PI * 2;
        return <Block key={i} position={[Math.cos(a) * 0.27, 0, Math.sin(a) * 0.27]} scale={[0.02, 0.5, 0.02]} geometry={g.box} material={m.gilt} />;
      })}
      <Block position={[0, -0.55, 0]} scale={[0.03, 0.4, 0.03]} geometry={g.cylinderLow} material={m.candle} />
    </group>
  );
}

/** Tiered candle rack (灯架): many small candles as instances, with one shared light. */
function CandleRack({ position }: { position: V3 }) {
  const m = sceneMaterials();
  const flames = useRef<THREE.InstancedMesh>(null);
  const data = useMemo(() => {
    const spots: V3[] = [];
    for (let tier = 0; tier < 3; tier++) for (let i = 0; i < 9 - tier; i++) spots.push([(i - (8 - tier) / 2) * 0.13, 0.9 + tier * 0.22, -tier * 0.16]);
    const candles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.018, 0.018, 0.12, 8), m.candle, spots.length);
    const o = new THREE.Object3D();
    spots.forEach((p, i) => {
      o.position.set(p[0], p[1] + 0.06, p[2]);
      o.updateMatrix();
      candles.setMatrixAt(i, o.matrix);
    });
    return { spots, candles };
  }, [m.candle]);
  useFrame(() => {
    const f = flames.current;
    if (!f) return;
    const o = new THREE.Object3D();
    data.spots.forEach((p, i) => {
      o.position.set(p[0], p[1] + 0.14, p[2]);
      o.scale.set(0.012, 0.04, 1);
      o.updateMatrix();
      f.setMatrixAt(i, o.matrix);
    });
    f.instanceMatrix.needsUpdate = true;
  });
  return (
    <group position={position}>
      {[0, 1, 2].map((tier) => (
        <Block key={tier} position={[0, 0.86 + tier * 0.22, -tier * 0.16]} scale={[1.25 - tier * 0.13, 0.04, 0.12]} geometry={sharedGeometry().box} material={m.bronze} />
      ))}
      <Block position={[0, 0.43, -0.16]} scale={[0.05, 0.86, 0.05]} geometry={sharedGeometry().cylinderLow} material={m.bronze} />
      <Block position={[0, 0.02, -0.16]} scale={[0.5, 0.04, 0.3]} geometry={sharedGeometry().box} material={m.bronze} />
      <primitive object={data.candles} />
      <instancedMesh ref={flames} args={[flameGeometry(), flameMaterial(), data.spots.length]} frustumCulled={false} />
    </group>
  );
}

let bannerMat: THREE.MeshStandardMaterial | null = null;
function Banner({ position }: { position: V3 }) {
  bannerMat ??= (() => {
    const set = patternedCloth('#8f2a1d', '#e2b860', [1, 3], 91);
    return new THREE.MeshStandardMaterial({ map: set.map, normalMap: set.normalMap, roughness: 0.75, side: THREE.DoubleSide });
  })();
  const m = sceneMaterials();
  return (
    <group position={position}>
      <Block position={[0, 0, 0]} scale={[0.7, 0.05, 0.05]} material={m.gilt} />
      <mesh position={[0, -1.4, 0]} material={bannerMat}>
        <planeGeometry args={[0.55, 2.8, 1, 8]} />
      </mesh>
      <Block position={[0, -2.85, 0]} scale={[0.6, 0.05, 0.05]} material={m.gilt} />
    </group>
  );
}

/** Slanting shafts of light from high windows. */
function LightShafts() {
  const d = useDecor();
  useFrame(({ clock }) => {
    d.shaft.uniforms.uTime.value = clock.elapsedTime;
  });
  const shafts = useMemo(
    () =>
      [
        { from: new THREE.Vector3(-8.4, 7.6, -4), to: new THREE.Vector3(-2.2, 0, -8.5) },
        { from: new THREE.Vector3(8.4, 7.6, -2), to: new THREE.Vector3(2.4, 0, -7.5) },
        { from: new THREE.Vector3(-8.4, 7.6, 3), to: new THREE.Vector3(-2.8, 0, -1) },
      ].map(({ from, to }) => {
        const dir = to.clone().sub(from);
        const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 1.1, dir.length(), 24, 1, true), d.shaft);
        mesh.position.copy(from).add(to).multiplyScalar(0.5);
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir.normalize());
        return mesh;
      }),
    [d.shaft],
  );
  return (
    <>
      {shafts.map((s, i) => (
        <primitive key={i} object={s} />
      ))}
    </>
  );
}

// ---------------- outside the doors ----------------

const DOOR = { half: 1.6, height: 5.2 };

/**
 * A carved 隔扇 door leaf, drawn once on canvases: red lacquer frame with a gilt bead; the upper
 * 格心 a 菱花 lattice (warm hall light glows through its openings); a gilt cloud band (绦环板);
 * and a lower 裙板 with a gilt 太极 medallion among clouds. Normal map gives the carving its relief.
 */
let doorMaps: { map: THREE.Texture; normalMap: THREE.Texture; emissiveMap: THREE.Texture; roughnessMap: THREE.Texture } | null = null;
function doorTextures() {
  if (doorMaps) return doorMaps;
  const W = 512;
  const H = 1664;
  const mk = () => {
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    return { c, g: c.getContext('2d', { willReadFrequently: true })! };
  };
  const col = mk(); // colour
  const hgt = mk(); // relief: white high, black low
  const glow = mk(); // light through the lattice
  const rgh = mk(); // roughness: gilt smoother
  for (const { g } of [hgt, glow]) {
    g.fillStyle = '#000';
    g.fillRect(0, 0, W, H);
  }
  // Lacquer ground with a little grain.
  const lac = col.g.createLinearGradient(0, 0, W, 0);
  lac.addColorStop(0, '#34170f');
  lac.addColorStop(0.5, '#43201a');
  lac.addColorStop(1, '#34170f');
  col.g.fillStyle = lac;
  col.g.fillRect(0, 0, W, H);
  rgh.g.fillStyle = '#a0a0a0';
  rgh.g.fillRect(0, 0, W, H);
  hgt.g.fillStyle = '#808080';
  hgt.g.fillRect(0, 0, W, H);
  const gold = '#8c6c40'; // 旧金: narrow beads, not a bright frame
  const bead = (x: number, y: number, w: number, h: number) => {
    col.g.strokeStyle = gold;
    col.g.lineWidth = 6;
    col.g.strokeRect(x, y, w, h);
    hgt.g.strokeStyle = '#ffffff';
    hgt.g.lineWidth = 8;
    hgt.g.strokeRect(x, y, w, h);
    rgh.g.strokeStyle = '#404040';
    rgh.g.lineWidth = 8;
    rgh.g.strokeRect(x, y, w, h);
  };
  const M = 40; // frame width
  // 格心: 菱花 lattice in the upper part.
  const top = M;
  const latH = H * 0.5;
  bead(M - 10, top - 10, W - 2 * M + 20, latH + 20);
  const cell = 46;
  glow.g.save();
  glow.g.beginPath();
  glow.g.rect(M, top, W - 2 * M, latH);
  glow.g.clip();
  glow.g.fillStyle = '#ffffff';
  glow.g.fillRect(M, top, W - 2 * M, latH);
  glow.g.restore();
  col.g.save();
  col.g.beginPath();
  col.g.rect(M, top, W - 2 * M, latH);
  col.g.clip();
  col.g.fillStyle = '#1c0d09';
  col.g.fillRect(M, top, W - 2 * M, latH);
  for (const ctx of [col.g, hgt.g, glow.g]) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(M, top, W - 2 * M, latH);
    ctx.clip();
    ctx.strokeStyle = ctx === col.g ? '#4a241c' : ctx === hgt.g ? '#ffffff' : '#000000';
    ctx.lineWidth = 11;
    for (let k = -H; k < W + H; k += cell) {
      ctx.beginPath();
      ctx.moveTo(k, top);
      ctx.lineTo(k + latH, top + latH);
      ctx.moveTo(k, top);
      ctx.lineTo(k - latH, top + latH);
      ctx.stroke();
    }
    // Small four-petal flowers at the crossings.
    ctx.fillStyle = ctx === col.g ? gold : ctx === hgt.g ? '#ffffff' : '#000000';
    for (let y = top; y < top + latH + cell; y += cell / 2)
      for (let x = M + ((Math.round((y - top) / (cell / 2)) % 2) * cell) / 2; x < W; x += cell) {
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    ctx.restore();
  }
  col.g.restore();
  // 绦环板 with a gilt cloud scroll.
  const bandY = top + latH + 40;
  const bandH = 120;
  bead(M, bandY, W - 2 * M, bandH);
  for (const [ctx, color, lw] of [[col.g, gold, 8], [hgt.g, '#ffffff', 10], [rgh.g, '#404040', 10]] as const) {
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.lineCap = 'round';
    drawCloud(ctx, W * 0.32, bandY + bandH * 0.55, 24);
    drawCloud(ctx, W * 0.56, bandY + bandH * 0.5, 24);
  }
  // 裙板 with a 如意 cloud medallion.
  const skirtY = bandY + bandH + 40;
  const skirtH = H - skirtY - 160;
  bead(M, skirtY, W - 2 * M, skirtH);
  const cx = W / 2;
  const cy = skirtY + skirtH / 2;
  for (const [ctx, color, lw] of [[col.g, gold, 9], [hgt.g, '#ffffff', 12], [rgh.g, '#404040', 12]] as const) {
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.ellipse(cx, cy, W * 0.3, skirtH * 0.36, 0, 0, Math.PI * 2);
    ctx.stroke();
    // 太极 in the medallion.
    const r = Math.min(W * 0.16, skirtH * 0.2);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy - r / 2, r / 2, Math.PI / 2, -Math.PI / 2, true);
    ctx.arc(cx, cy + r / 2, r / 2, -Math.PI / 2, Math.PI / 2, false);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy - r / 2, r * 0.1, 0, Math.PI * 2);
    ctx.moveTo(cx + r * 0.1, cy + r / 2);
    ctx.arc(cx, cy + r / 2, r * 0.1, 0, Math.PI * 2);
    ctx.stroke();
    drawCloud(ctx, cx - 100, cy + skirtH * 0.22, 16);
    drawCloud(ctx, cx + 60, cy - skirtH * 0.24, 16);
  }
  // Bottom 绦环
  bead(M, H - 130, W - 2 * M, 80);
  const hData = hgt.g.getImageData(0, 0, W, H).data;
  // Resample relief into a square field for the normal generator.
  const S = 512;
  const field = new Float32Array(S * S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) field[y * S + x] = hData[(Math.floor((y * H) / S) * W + Math.floor((x * W) / S)) * 4] / 255;
  const tex = (c: HTMLCanvasElement, srgb: boolean) => {
    const t = new THREE.CanvasTexture(c);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  };
  doorMaps = { map: tex(col.c, true), normalMap: tex(normalFromHeight(field, S, 3.2), false), emissiveMap: tex(glow.c, true), roughnessMap: tex(rgh.c, false) };
  return doorMaps;
}

function DoorLeaf({ side }: { side: 1 | -1 }) {
  const mats = useMemo(() => {
    const t = doorTextures();
    const face = new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normalMap, roughnessMap: t.roughnessMap, roughness: 1, metalness: 0.1, emissiveMap: t.emissiveMap, emissive: new THREE.Color('#e8b47a'), emissiveIntensity: 0.22 });
    const edge = new THREE.MeshStandardMaterial({ color: '#3d201b', roughness: 0.56 });
    return [edge, edge, edge, edge, face, face];
  }, []);
  const leaf = useRef<THREE.Group>(null);
  useFrame(() => {
    if (leaf.current) leaf.current.rotation.y = -side * 1.25 * doorOpen(introProgress.k); // inward
  });
  return (
    <group ref={leaf} position={[side * DOOR.half, 0, HALL.front - 0.1]} rotation={[0, -side * 1.25, 0]} userData={{ dynamic: true }}>
      <mesh position={[-side * DOOR.half / 2, DOOR.height / 2, 0]} material={mats} castShadow>
        <boxGeometry args={[DOOR.half, DOOR.height, 0.09]} />
      </mesh>
    </group>
  );
}

/** Forecourt: flagstones, steps, red columns and eaves, lanterns and the plaque over the door. */
function Forecourt() {
  const m = sceneMaterials();
  const g = sharedGeometry();
  const forecourt = useMemo(() => tiledPlane(30, 12), []);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, HALL.front + 6]} material={m.floor} geometry={forecourt} />
      {/* Threshold (门槛) and a broad stone step */}
      <Block position={[0, 0.11, HALL.front]} scale={[DOOR.half * 2, 0.22, 0.42]} material={m.lacquer} />
      <Block position={[0, 0.06, HALL.front + 1.0]} scale={[DOOR.half * 2 + 2.4, 0.12, 1.4]} material={m.darkStone} />
      <DoorLeaf side={1} />
      <DoorLeaf side={-1} />
      {/* Porch columns and the eave */}
      {[-6.2, -2.4, 2.4, 6.2].map((x) => (
        <group key={x}>
          <Block position={[x, 3.9, HALL.front + 1.6]} scale={[0.34, 7.8, 0.34]} geometry={g.cylinder} material={m.lacquer} />
          <Block position={[x, 0.18, HALL.front + 1.6]} scale={[0.56, 0.36, 0.56]} geometry={g.cylinderLow} material={m.darkStone} />
        </group>
      ))}
      <Facade />
      <Courtyard />
      <PalaceLantern position={[-2.4, 5.0, HALL.front + 1.0]} />
      <PalaceLantern position={[2.4, 5.0, HALL.front + 1.0]} />
      <pointLight position={[0, 5.2, HALL.front + 1.6]} intensity={6} distance={9} decay={1.5} color="#ffb46a" />
      <pointLight position={[0, 2.4, HALL.front + 5]} intensity={2.5} distance={10} decay={1.4} color="#9fb4ff" />
    </group>
  );
}

// ---------------- the hall ----------------

export function Hall({ shadows }: { shadows: boolean }) {
  const m = sceneMaterials();
  const g = sharedGeometry();
  const d = useDecor();
  const floorMat = useMemo(() => {
    const f = m.floor.clone();
    // Honed, not polished: a soft sheen without noisy reflections.
    f.roughness = 0.92;
    f.envMapIntensity = 0.18;
    return f;
  }, [m.floor]);
  const hallFloor = useMemo(() => tiledPlane(HALL.halfWidth * 2, 32), []);
  const cushionGeo = useMemo(() => lathe([[0.001, 0], [0.3, 0], [0.36, 0.04], [0.38, 0.1], [0.34, 0.16], [0.2, 0.19], [0.001, 0.2]], 36), []);
  return (
    <group>
      {/* Floor, red runner, walls */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -2]} material={floorMat} geometry={hallFloor} receiveShadow={shadows} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 3]} material={d.runner}>
        <planeGeometry args={[1.6, 17]} />
      </mesh>
      <Block position={[0, HALL.ceiling / 2, HALL.back]} scale={[HALL.halfWidth * 2, HALL.ceiling, 0.4]} material={m.wall} />
      {[-1, 1].map((s) => (
        <group key={s}>
          <Block position={[s * HALL.halfWidth, HALL.ceiling / 2, -2]} scale={[0.4, HALL.ceiling, 32]} material={m.wall} />
          {/* Murals between the columns, lattice doors near the entrance */}
          {[-9, -4, 1].map((z) => (
            <mesh key={z} position={[s * (HALL.halfWidth - 0.21), 4.4, z]} rotation={[0, -s * Math.PI / 2, 0]} material={d.mural}>
              <planeGeometry args={[4.4, 2.4]} />
            </mesh>
          ))}
          {[6, 11].map((z) => (
            <mesh key={z} position={[s * (HALL.halfWidth - 0.21), 2.6, z]} rotation={[0, -s * Math.PI / 2, 0]} material={d.lattice}>
              <planeGeometry args={[2.4, 4.6]} />
            </mesh>
          ))}
          <Block position={[s * (HALL.halfWidth - 0.25), 0.4, -2]} scale={[0.1, 0.8, 31]} material={m.lacquer} />
        </group>
      ))}
      <Ceiling />
      {/* Entrance: a wide doorway; outside, the forecourt seen at the start */}
      <Block position={[-5.25, HALL.ceiling / 2, HALL.front]} scale={[7.3, HALL.ceiling, 0.4]} material={m.wall} />
      <Block position={[5.25, HALL.ceiling / 2, HALL.front]} scale={[7.3, HALL.ceiling, 0.4]} material={m.wall} />
      <Block position={[0, 6.9, HALL.front]} scale={[3.4, 3.4, 0.4]} material={m.wall} />
      <Forecourt />
      {/* Columns, gold bands, brackets, painted beams */}
      {COLUMN_Z.map((z) =>
        [-5, 5].map((x) => (
          <group key={`${x}:${z}`}>
            <Block position={[x, 4.1, z]} scale={[0.3, 8.2, 0.3]} geometry={g.cylinder} material={m.lacquer} shadows={shadows} />
            <Block position={[x, 0.2, z]} scale={[0.5, 0.4, 0.5]} geometry={g.cylinderLow} material={m.darkStone} />
            {[0.55, 6.9, 7.4].map((y) => (
              <Block key={y} position={[x, y, z]} scale={[0.32, 0.1, 0.32]} geometry={g.cylinder} material={m.gilt} />
            ))}
            <Bracket position={[x, 7.65, z - 0.05]} side={x < 0 ? 1 : -1} />
          </group>
        )),
      )}
      {COLUMN_Z.map((z) => (
        <Block key={z} position={[0, 7.95, z]} scale={[17.4, 0.5, 0.4]} material={d.beam} />
      ))}
      {[-5, 5].map((x) => (
        <Block key={x} position={[x, 7.55, -2]} scale={[0.36, 0.36, 28]} material={d.beam} />
      ))}
      {/* Altar platform with a gold cloud screen behind the statues */}
      <Block position={[0, 0.55, -13.9]} scale={[13, 1.1, 4.6]} material={m.lacquer} shadows={shadows} />
      <Block position={[0, 1.16, -13.9]} scale={[13.2, 0.12, 4.8]} material={m.gilt} />
      {/* Swapped in once its picture loads, so it stays out of the static batch. */}
      <group userData={{ dynamic: true }}>
        <BackWall screen={d.screen} gilt={m.gilt} />
      </group>
      <OfferingTable />
      <CandleRack position={[-3.6, 0, -10.2]} />
      <CandleRack position={[3.6, 0, -10.2]} />
      <LightingCandle />
      <Burner shadows={shadows} />
      <mesh position={[WORLD.cushion[0], 0, WORLD.cushion[2]]} geometry={cushionGeo} material={m.cushion} receiveShadow />
      {[-3.6, 3.6].map((x) => [-8.5, -3, 3].map((z) => <Banner key={`${x}${z}`} position={[x, 7.6, z]} />))}
      {[-2.6, 2.6].map((x) => [-7.5, -1.5, 4.5].map((z) => <PalaceLantern key={`${x}${z}`} position={[x, 5.9, z]} />))}
      <PalaceLantern position={[0, 6.2, -9.0]} />
      <LightShafts />
      <FlickerLight />
      {/* Warm fill from the lanterns along the nave */}
      <pointLight position={[0, 5.5, -1.5]} color="#ffb874" intensity={4} distance={12} decay={1.6} />
      <pointLight position={[0, 5.5, 5]} color="#ffb874" intensity={3} distance={10} decay={1.6} />
    </group>
  );
}

/**
 * Behind the 三清 during the ritual: the artist's hall wall (keyframes/03 above the seats — wood
 * panels, warm light, brackets, lanterns), shown unlit as painted, so the 3D hall the visitor walks
 * through matches the painted hall at home. Until it loads (or if it cannot), the old cloud screen.
 */
const WALL = { file: 'hall-wall.webp', aspect: 941 / 745, bottom: 1.15, top: 8.55 };
function BackWall({ screen, gilt }: { screen: THREE.Material; gilt: THREE.Material }) {
  const art = entranceTexture(WALL.file);
  const [painted, setPainted] = useState(art.loaded);
  useEffect(() => {
    let alive = true;
    void art.ready.then((ok) => alive && setPainted(ok));
    return () => {
      alive = false;
    };
  }, [art]);
  const material = useMemo(() => new THREE.MeshBasicMaterial({ map: art.texture, toneMapped: false, fog: false }), [art]);
  const h = WALL.top - WALL.bottom;
  if (painted)
    return (
      <mesh position={[0, WALL.bottom + h / 2, -16.08]} material={material}>
        <planeGeometry args={[h * WALL.aspect, h]} />
      </mesh>
    );
  return (
    <>
      <mesh position={[0, 4.4, -16.05]} material={screen}>
        <planeGeometry args={[12.5, 6.4]} />
      </mesh>
      <Block position={[0, 7.65, -16.0]} scale={[12.8, 0.18, 0.12]} material={gilt} />
      {[-6.3, 6.3].map((x) => (
        <Block key={x} position={[x, 4.4, -16.0]} scale={[0.18, 6.6, 0.12]} material={gilt} />
      ))}
    </>
  );
}

function FlickerLight() {
  const light = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    if (!light.current) return;
    const t = clock.elapsedTime;
    light.current.intensity = 3.9 + Math.sin(t * 7.3) * 0.3 + Math.sin(t * 13.1) * 0.18;
  });
  // Also stands in for the candle racks' and candles' own glow (one light instead of five).
  return <pointLight ref={light} position={[0, 2.1, -10.2]} color="#ffb867" intensity={3.2} distance={11} decay={1.6} />;
}

