/**
 * 祖师赐卦 — the bestowal. While the seated visitor looks up, a golden glory swells behind the
 * 三清 with slow rays; then a soft column of light settles onto the stone table, gold motes
 * drifting down inside it, and a luminous 八卦 seal turns on the stone before the hexagrams are
 * carved. Precompile warms every shader up front so nothing stalls.
 */
import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { bestowalTimes } from './carving';
import { WORLD } from './timeline';
import { ORB } from './shrineLayout';
import type { RitualClock } from '../ui/useRitualClock';

const TABLE = new THREE.Vector3(WORLD.table[0], WORLD.tableTopY, WORLD.table[2]);
// On the 混元珠 in 元始天尊's hands, just in front of him.
const GLORY = new THREE.Vector3(ORB[0], ORB[1], ORB[2] + 0.12);
const COLUMN_H = 5.5;
const MOTES = 240;

/** Brightness the bestowal wants on the stone table; applied by the table light in TempleScene. */
export const bestowalGlow = { table: 0 };

const ramp = (t: number, a: number, b: number) => Math.min(1, Math.max(0, (t - a) / (b - a)));
/** 0 → 1 → 0 envelope with soft fades. */
const envelope = (t: number, start: number, end: number, fadeIn: number, fadeOut: number) =>
  ramp(t, start, start + fadeIn) * (1 - ramp(t, end - fadeOut, end));

function canvasTexture(size: number, draw: (g: CanvasRenderingContext2D, s: number) => void) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d')!, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Soft radial glow. */
const gloryTexture = () =>
  canvasTexture(256, (g, s) => {
    const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    r.addColorStop(0, 'rgba(255,244,214,1)');
    r.addColorStop(0.25, 'rgba(255,214,140,0.55)');
    r.addColorStop(0.6, 'rgba(255,170,80,0.14)');
    r.addColorStop(1, 'rgba(255,150,60,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, s, s);
  });

/** Thin radiating rays, fading outward. */
const raysTexture = () =>
  canvasTexture(512, (g, s) => {
    g.translate(s / 2, s / 2);
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      const w = i % 2 ? 0.012 : 0.028;
      const grad = g.createLinearGradient(0, 0, Math.cos(a) * s * 0.5, Math.sin(a) * s * 0.5);
      grad.addColorStop(0, 'rgba(255,230,170,0.0)');
      grad.addColorStop(0.18, 'rgba(255,230,170,0.55)');
      grad.addColorStop(1, 'rgba(255,200,120,0)');
      g.fillStyle = grad;
      g.beginPath();
      g.moveTo(0, 0);
      g.arc(0, 0, s * 0.5, a - w, a + w);
      g.closePath();
      g.fill();
    }
  });

/** 先天八卦 seal: rings, the eight trigrams around, 太极 in the middle, in gold. */
const sealTexture = () =>
  canvasTexture(1024, (g, s) => {
    const c = s / 2;
    g.translate(c, c);
    g.strokeStyle = g.fillStyle = '#ffd98a';
    g.shadowColor = 'rgba(255,200,110,0.9)';
    g.shadowBlur = 18;
    const ring = (r: number, w: number) => {
      g.lineWidth = w;
      g.beginPath();
      g.arc(0, 0, r, 0, Math.PI * 2);
      g.stroke();
    };
    ring(c * 0.96, 6);
    ring(c * 0.9, 2);
    ring(c * 0.58, 3);
    ring(c * 0.32, 4);
    // Trigrams, bottom line nearest the centre; 乾 at the top (先天 order).
    const bits = [[1, 1, 1], [1, 1, 0], [1, 0, 1], [1, 0, 0], [0, 1, 1], [0, 1, 0], [0, 0, 1], [0, 0, 0]];
    const order = [0, 1, 2, 3, 7, 6, 5, 4]; // 乾兑离震 down the left, 巽坎艮坤 back up the right
    order.forEach((ti, k) => {
      const a = -Math.PI / 2 - (k * Math.PI) / 4;
      g.save();
      g.rotate(a + Math.PI / 2);
      for (let line = 0; line < 3; line++) {
        const y = -(c * 0.64 + line * c * 0.075);
        const w = c * 0.3;
        const h = c * 0.04;
        if (bits[ti][line]) g.fillRect(-w / 2, y - h / 2, w, h);
        else {
          g.fillRect(-w / 2, y - h / 2, w * 0.42, h);
          g.fillRect(w / 2 - w * 0.42, y - h / 2, w * 0.42, h);
        }
      }
      g.restore();
    });
    // 太极
    const r = c * 0.26;
    g.lineWidth = 4;
    g.beginPath();
    g.arc(0, 0, r, -Math.PI / 2, Math.PI / 2);
    g.arc(0, r / 2, r / 2, Math.PI / 2, -Math.PI / 2, true);
    g.arc(0, -r / 2, r / 2, Math.PI / 2, -Math.PI / 2);
    g.closePath();
    g.globalAlpha = 0.85;
    g.fill();
    g.globalAlpha = 1;
    g.beginPath();
    g.arc(0, 0, r, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = '#2a1a08';
    g.beginPath();
    g.arc(0, -r / 2, r * 0.12, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#ffd98a';
    g.beginPath();
    g.arc(0, r / 2, r * 0.12, 0, Math.PI * 2);
    g.fill();
  });

const columnVertex = /* glsl */ `
  varying vec3 vN;
  varying vec3 vV;
  varying float vY;
  varying float vA;
  void main() {
    vY = position.y + 0.5;
    vA = atan(position.z, position.x);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vN = normalize(mat3(modelMatrix) * normal);
    vV = normalize(cameraPosition - wp.xyz);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;
const columnFragment = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  varying vec3 vN;
  varying vec3 vV;
  varying float vY;
  varying float vA;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  void main() {
    float facing = abs(dot(normalize(vN), normalize(vV)));
    float soft = pow(facing, 1.6);             // brightest through the middle, soft edges
    float height = pow(1.0 - vY, 1.4);          // strongest at the table, fading upward
    float streaks = 0.65 + 0.35 * noise(vec2(vA * 5.0, vY * 3.0 + uTime * 0.6));
    float a = soft * height * streaks * uOpacity;
    gl_FragColor = vec4(vec3(1.0, 0.85, 0.55) * a, 1.0);
  }
`;

export function Bestowal({ clock, reduced }: { clock: MutableRefObject<RitualClock>; reduced: boolean }) {
  const times = useMemo(() => bestowalTimes(reduced), [reduced]);
  const fx = useMemo(() => {
    const add = (map: THREE.Texture) => new THREE.SpriteMaterial({ map, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const motesGeo = new THREE.BufferGeometry();
    motesGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(MOTES * 3), 3));
    const seeds = Float32Array.from({ length: MOTES * 4 }, () => Math.random());
    const columnMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 } },
      vertexShader: columnVertex,
      fragmentShader: columnFragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    const sealMat = new THREE.MeshBasicMaterial({ map: sealTexture(), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2 });
    return {
      glory: add(gloryTexture()),
      rays: add(raysTexture()),
      columnMat,
      columnGeo: new THREE.CylinderGeometry(0.62, 0.78, 1, 48, 1, true),
      sealMat,
      motesGeo,
      motesMat: new THREE.PointsMaterial({ color: '#ffe2a0', size: 0.022, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
      seeds,
    };
  }, []);
  const glory = useRef<THREE.Sprite>(null);
  const rays = useRef<THREE.Sprite>(null);
  const column = useRef<THREE.Mesh>(null);
  const seal = useRef<THREE.Mesh>(null);

  useFrame(() => {
    const c = clock.current;
    const t = c.phase === 'revealing' ? c.t : -1;
    const { lookUp, orbStart, orbArrive, settle } = times;
    // Glory behind the 三清 while looking up.
    const g = envelope(t, lookUp + 0.2, orbArrive, 1.0, 1.0);
    fx.glory.opacity = g * 0.9;
    fx.rays.opacity = g * 0.55;
    fx.rays.rotation = c.elapsed * 0.05;
    if (glory.current) {
      glory.current.visible = g > 0.001;
      glory.current.scale.setScalar(5 + g * 4);
    }
    if (rays.current) {
      rays.current.visible = g > 0.001;
      rays.current.scale.setScalar(8 + g * 5);
    }
    void g;
    // The column of light settles on the table and stays while the frames begin.
    const col = envelope(t, orbStart - 0.2, settle + 2.2, 0.9, 1.4);
    fx.columnMat.uniforms.uOpacity.value = col * 0.55;
    fx.columnMat.uniforms.uTime.value = c.elapsed;
    if (column.current) column.current.visible = col > 0.001;
    // Gold motes drifting down inside it.
    const pos = fx.motesGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < MOTES; i++) {
      if (col <= 0.001) {
        pos.setXYZ(i, 0, -99, 0);
        continue;
      }
      const s = fx.seeds;
      const fall = (s[i * 4] + c.elapsed * (0.12 + s[i * 4 + 1] * 0.1)) % 1;
      const a = s[i * 4 + 2] * Math.PI * 2 + c.elapsed * 0.2;
      const r = Math.sqrt(s[i * 4 + 3]) * 0.6;
      pos.setXYZ(i, TABLE.x + Math.cos(a) * r, TABLE.y + 0.02 + (1 - fall) * 2.6, TABLE.z + Math.sin(a) * r);
    }
    pos.needsUpdate = true;
    fx.motesMat.opacity = col * 0.85;
    // The 八卦 seal turns on the stone, then sinks into it as the carving starts.
    const sl = envelope(t, orbArrive - 0.4, settle + 1.6, 0.9, 1.2);
    fx.sealMat.opacity = sl * 0.9;
    if (seal.current) {
      seal.current.visible = sl > 0.001;
      seal.current.rotation.z = c.elapsed * 0.12;
      seal.current.scale.setScalar(1.1 + 0.08 * (1 - sl));
    }
    bestowalGlow.table = col * 3.5 + sl * 2;
  });

  return (
    <group>
      <sprite ref={glory} position={GLORY} material={fx.glory} visible={false} />
      <sprite ref={rays} position={GLORY} material={fx.rays} visible={false} />
      <mesh ref={column} position={[TABLE.x, TABLE.y + COLUMN_H / 2, TABLE.z]} scale={[1, COLUMN_H, 1]} geometry={fx.columnGeo} material={fx.columnMat} visible={false} />
      <points geometry={fx.motesGeo} material={fx.motesMat} frustumCulled={false} />
      <mesh ref={seal} position={[TABLE.x, TABLE.y + 0.004, TABLE.z]} rotation={[-Math.PI / 2, 0, 0]} material={fx.sealMat} visible={false}>
        <planeGeometry args={[1.25, 1.25]} />
      </mesh>
    </group>
  );
}

/** Compiles all materials once the scene is assembled, so no shader compiles mid-ritual. */
export function Precompile({ deps }: { deps: unknown[] }) {
  const { gl, scene, camera } = useThree();
  // The first compile is TempleScene's WarmUp (in the background, before the first frame).
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const id = window.setTimeout(() => {
      // compile() only visits visible objects; show the hidden ones for the moment it runs.
      const hidden: THREE.Object3D[] = [];
      scene.traverse((o) => {
        if (!o.visible) {
          hidden.push(o);
          o.visible = true;
        }
      });
      try {
        gl.compile(scene, camera);
      } catch {
        /* best effort */
      }
      for (const o of hidden) o.visible = false;
      // Upload every texture now (hidden effects included), so the first frame that shows the
      // bestowal glow or a newly seen corner of the hall does not stall on a GPU upload.
      const seen = new Set<THREE.Texture>();
      scene.traverse((o) => {
        const mats = (o as THREE.Mesh).material;
        for (const mat of Array.isArray(mats) ? mats : mats ? [mats] : []) {
          for (const v of Object.values(mat as unknown as Record<string, unknown>)) if (v instanceof THREE.Texture && !seen.has(v)) seen.add(v);
          const u = (mat as THREE.ShaderMaterial).uniforms;
          if (u) for (const x of Object.values(u)) if (x?.value instanceof THREE.Texture && !seen.has(x.value)) seen.add(x.value);
        }
      });
      for (const t of seen) {
        try {
          if (t.image) gl.initTexture(t);
        } catch {
          /* best effort */
        }
      }
    }, 50);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return null;
}
