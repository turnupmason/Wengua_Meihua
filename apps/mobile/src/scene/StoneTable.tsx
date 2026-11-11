/**
 * The stone altar table (石案): profiled top, recessed waist, cloud-carved apron, horse-hoof
 * legs, a floor frame, and a stone stool at its near end. During the reveal the hexagrams are
 * written into the top by a point of golden light: each groove opens along its length, gold
 * light settles in its floor, and the inscriptions are carved in. The moving line flashes in
 * cinnabar with the traditional ○ / × mark. Every line's hit area keeps
 * { stage, hexagramId, linePosition } in userData; picks never depend on screen order.
 */
import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { lathe, roundedSlab, sceneMaterials, sharedGeometry } from './materials';
import { WORLD } from './timeline';
import { HEX_LAYOUT, STAGE_ORDER, lineSlots, stageCenterZ, type StageKey } from '../domain/layout';
import type { Reading } from '../knowledge/knowledge';
import type { RelationView } from '../domain/relation';
import type { RitualClock } from '../ui/useRitualClock';
import type { Strings } from '../domain/i18n';
import type { Lang } from '../domain/settings';
import { templeAudio } from '../domain/audio';
import { arrowGrooves, carvedRect, chiselPoint, frameGrooves, grooveProgress, lineGrooves, lineStarted, revealPlan, type Groove } from './carving';
import { inscriptionMaterial, inscriptionTexture, loadCarveFont, movingMarkTexture } from './engrave';
import { inscriptionBlocks, type Block } from './inscriptionLayout';

export interface LinePick { stage: StageKey; hexagramId: number; linePosition: number; /** Where it was tapped (CSS px, viewport). */ at?: [number, number] }
export interface Selection { stage: StageKey | 'library'; hexagramId: number; linePosition: number | null }

const TOP_H = 0.14;
const CARVE_DEPTH = 0.024;
const MAX_RECTS = 64;
const MAX_TRIS = 16;

// ---------------- table body ----------------

function apronShape(length: number) {
  const L = length / 2;
  const s = new THREE.Shape();
  s.moveTo(-L, 0);
  s.lineTo(L, 0);
  s.lineTo(L, -0.17);
  s.quadraticCurveTo(L - 0.05, -0.08, L - 0.2, -0.085);
  s.lineTo(0.2, -0.085);
  s.quadraticCurveTo(0.12, -0.09, 0.08, -0.15);
  s.quadraticCurveTo(0, -0.21, -0.08, -0.15);
  s.quadraticCurveTo(-0.12, -0.09, -0.2, -0.085);
  s.lineTo(-L + 0.2, -0.085);
  s.quadraticCurveTo(-L + 0.05, -0.08, -L, -0.17);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.045, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 2, curveSegments: 10 });
  g.translate(0, 0, -0.0225);
  const uv = g.attributes.uv;
  const pos = g.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + L) / 0.55, (pos.getY(i) + 0.2) / 0.55);
  return g;
}

function legShape(height: number) {
  const s = new THREE.Shape();
  s.moveTo(0, height);
  s.lineTo(0.13, height);
  s.lineTo(0.13, 0.16);
  s.quadraticCurveTo(0.13, 0.05, 0.205, 0.035);
  s.lineTo(0.2, 0);
  s.lineTo(0, 0);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.13, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 2, curveSegments: 8 });
  g.translate(0, 0, -0.065);
  return g;
}

function TableBody() {
  const m = sceneMaterials();
  const g = sharedGeometry();
  const W = HEX_LAYOUT.tableWidth;
  const D = HEX_LAYOUT.tableDepth;
  const top = WORLD.tableTopY;
  const waistTop = top - TOP_H;
  const legH = waistTop - 0.05;
  const geos = useMemo(
    () => ({
      apronFront: apronShape(W - 0.36),
      apronSide: apronShape(D - 0.36),
      leg: legShape(legH),
      stoolTop: roundedSlab(0.5, 0.42, 0.08, 0.06, 0.02, 3),
      stoolBase: lathe([[0.001, 0], [0.2, 0], [0.2, 0.04], [0.13, 0.08], [0.11, 0.3], [0.15, 0.36], [0.001, 0.37]], 8),
    }),
    [W, D, legH],
  );
  const legX = W / 2 - 0.13;
  const legZ = D / 2 - 0.13;
  return (
    <group>
      <mesh position={[0, waistTop - 0.03, 0]} scale={[W - 0.16, 0.06, D - 0.16]} geometry={g.box} material={m.darkStone} castShadow receiveShadow />
      {[1, -1].map((s) => (
        <mesh key={`f${s}`} position={[0, waistTop - 0.06, s * (D / 2 - 0.1)]} geometry={geos.apronFront} material={m.apronStone} castShadow />
      ))}
      {[1, -1].map((s) => (
        <mesh key={`s${s}`} position={[s * (W / 2 - 0.1), waistTop - 0.06, 0]} rotation={[0, Math.PI / 2, 0]} geometry={geos.apronSide} material={m.apronStone} castShadow />
      ))}
      {[
        [-legX, -legZ, 0],
        [legX, -legZ, Math.PI],
        [-legX, legZ, 0],
        [legX, legZ, Math.PI],
      ].map(([x, z, ry]) => (
        <mesh key={`${x}${z}`} position={[x + (ry ? 0.065 : -0.065), 0.05, z]} rotation={[0, ry, 0]} geometry={geos.leg} material={m.tableStone} castShadow receiveShadow />
      ))}
      {[1, -1].map((s) => (
        <mesh key={`tf${s}`} position={[0, 0.025, s * legZ]} scale={[W - 0.12, 0.05, 0.12]} geometry={g.box} material={m.darkStone} receiveShadow />
      ))}
      {[1, -1].map((s) => (
        <mesh key={`ts${s}`} position={[s * legX, 0.025, 0]} scale={[0.12, 0.05, D - 0.12]} geometry={g.box} material={m.darkStone} receiveShadow />
      ))}
      {/* Stone stool (石凳) at the near end, where the reader sits */}
      <group position={[0, 0, D / 2 + 0.42]}>
        <mesh geometry={geos.stoolBase} material={m.darkStone} castShadow />
        <mesh position={[0, 0.37, 0]} geometry={geos.stoolTop} material={m.tableStone} castShadow receiveShadow />
      </group>
    </group>
  );
}

// ---------------- carved top ----------------

function useCarvedTopMaterial() {
  const m = sceneMaterials();
  return useMemo(() => {
    const uniforms = {
      uRects: { value: Array.from({ length: MAX_RECTS }, () => new THREE.Vector4()) },
      uRectCount: { value: 0 },
      uTriA: { value: Array.from({ length: MAX_TRIS }, () => new THREE.Vector4()) },
      uTriB: { value: Array.from({ length: MAX_TRIS }, () => new THREE.Vector4()) },
      uTriCount: { value: 0 },
    };
    const material = m.tableStone.clone();
    // Matte, low-reflection, low-contrast stone so the lines and inscriptions lead: the speckle and
    // pitting are softened (shallower relief, a slightly darker even tone).
    material.envMapIntensity = 0.12;
    material.roughness = 1;
    material.normalScale = new THREE.Vector2(0.22, 0.22);
    material.color = new THREE.Color('#d4d0c6');
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vCarvePos;\nvarying float vCarveUp;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCarvePos = position;\nvCarveUp = normal.y;');
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
varying vec3 vCarvePos;
varying float vCarveUp;
uniform vec4 uRects[${MAX_RECTS}];
uniform int uRectCount;
uniform vec4 uTriA[${MAX_TRIS}];
uniform vec4 uTriB[${MAX_TRIS}];
uniform int uTriCount;
float edgeFn(vec2 a, vec2 b, vec2 p) { return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x); }
float carveDist(vec2 p) {
  float d = 1.0;
  for (int i = 0; i < ${MAX_RECTS}; i++) {
    if (i >= uRectCount) break;
    vec4 r = uRects[i];
    d = min(d, max(max(r.x - p.x, p.x - r.z), max(r.y - p.y, p.y - r.w)));
  }
  for (int i = 0; i < ${MAX_TRIS}; i++) {
    if (i >= uTriCount) break;
    vec2 a = uTriA[i].xy; vec2 b = uTriA[i].zw; vec2 c = uTriB[i].xy;
    float e0 = edgeFn(a, b, p); float e1 = edgeFn(b, c, p); float e2 = edgeFn(c, a, p);
    bool inside = (e0 >= 0.0 && e1 >= 0.0 && e2 >= 0.0) || (e0 <= 0.0 && e1 <= 0.0 && e2 <= 0.0);
    if (inside) d = min(d, -0.001);
  }
  return d;
}`,
        )
        .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nfloat carveD = vCarveUp > 0.5 ? carveDist(vCarvePos.xz) : 1.0;\nif (carveD < 0.0) discard;')
        .replace(
          '#include <map_fragment>',
          `#include <map_fragment>
if (vCarveUp > 0.5) {
  // Quieter stone: pull each texel toward the local average (a blurred mip of the same map), so
  // speckle and pitting fade while the overall tone stays.
  vec3 meanC = diffuse * texture2D(map, vMapUv, 5.0).rgb;
  diffuseColor.rgb = meanC + (diffuseColor.rgb - meanC) * 0.55;
  // Light with layers, not everywhere: a soft warm pool along the hexagram column, the edges and
  // corners falling into shade.
  float col = exp(-pow((vCarvePos.x - ${HEX_LAYOUT.hexX.toFixed(3)}) / 0.42, 2.0)) * (1.0 - smoothstep(0.95, 1.3, abs(vCarvePos.z + 0.12)));
  diffuseColor.rgb *= mix(vec3(1.0), vec3(1.12, 1.03, 0.86), col * 0.85);
  float r = length(vec2(abs(vCarvePos.x) / ${(HEX_LAYOUT.tableWidth / 2).toFixed(3)} * 0.92, abs(vCarvePos.z) / ${(HEX_LAYOUT.tableDepth / 2).toFixed(3)}));
  diffuseColor.rgb *= 1.0 - 0.34 * smoothstep(0.62, 1.12, r);
}
if (carveD < 0.006) diffuseColor.rgb *= mix(0.45, 1.0, carveD / 0.006);`,
        );
    };
    material.customProgramCacheKey = () => 'carved-table-top-v3';
    return { material, uniforms };
  }, [m.tableStone]);
}

function useTableFx() {
  const { textures } = sceneMaterials();
  return useMemo(
    () => ({
      cavity: new THREE.MeshStandardMaterial({ map: textures.tableStone.map, normalMap: textures.tableStone.normalMap, color: '#4a4740', roughness: 0.95, side: THREE.BackSide, envMapIntensity: 0.1 }),
      cavityFloor: new THREE.MeshStandardMaterial({ map: textures.tableStone.map, color: '#3d3a34', roughness: 0.95, envMapIntensity: 0.1 }),
      marker: new THREE.MeshBasicMaterial({ color: '#b8925a', transparent: true, opacity: 0, toneMapped: false }),
      hit: new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
    }),
    [textures.tableStone],
  );
}

// ---------------- golden motes where the light writes ----------------

const MOTES = 60;
function Motes({ emitter }: { emitter: MutableRefObject<{ point: [number, number] | null }> }) {
  const data = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(MOTES * 3).fill(-99), 3));
    const vel = new Float32Array(MOTES * 3);
    const life = new Float32Array(MOTES);
    const material = new THREE.PointsMaterial({ size: 0.014, color: '#ffd889', transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    return { geometry, material, vel, life, next: 0 };
  }, []);
  const spark = useRef<THREE.Mesh>(null);
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const pos = data.geometry.attributes.position as THREE.BufferAttribute;
    const p = emitter.current.point;
    if (spark.current) {
      spark.current.visible = !!p;
      if (p) spark.current.position.set(p[0], WORLD.tableTopY + 0.01, p[1]);
    }
    if (p) {
      for (let k = 0; k < 2; k++) {
        const i = data.next++ % MOTES;
        pos.setXYZ(i, p[0] + (Math.random() - 0.5) * 0.02, WORLD.tableTopY + 0.01, p[1] + (Math.random() - 0.5) * 0.02);
        data.vel.set([(Math.random() - 0.5) * 0.06, 0.12 + Math.random() * 0.12, (Math.random() - 0.5) * 0.06], i * 3);
        data.life[i] = 0.8 + Math.random() * 0.8;
      }
    }
    for (let i = 0; i < MOTES; i++) {
      if (data.life[i] <= 0) {
        pos.setY(i, -99);
        continue;
      }
      data.life[i] -= dt;
      pos.setXYZ(i, pos.getX(i) + data.vel[i * 3] * dt, pos.getY(i) + data.vel[i * 3 + 1] * dt, pos.getZ(i) + data.vel[i * 3 + 2] * dt);
    }
    pos.needsUpdate = true;
  });
  return (
    <>
      <points geometry={data.geometry} material={data.material} frustumCulled={false} />
      <mesh ref={spark} visible={false} scale={0.02}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshBasicMaterial color="#fff2c8" transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
    </>
  );
}

// ---------------- inscriptions ----------------

function startOf(b: Block, plan: ReturnType<typeof revealPlan>) {
  if (b.startKey === 'frames') return plan.framesStart + 0.3;
  if (b.startKey === 'tags') return plan.tagsStart;
  return plan.textStart(Number(b.startKey.slice(5)));
}

function Inscriptions({ blocks, clock, plan, onOpenStage, onOpenRelation, interactive }: { blocks: Block[]; clock: MutableRefObject<RitualClock>; plan: ReturnType<typeof revealPlan>; onOpenStage: (s: StageKey) => void; onOpenRelation?: () => void; interactive: boolean }) {
  const g = sharedGeometry();
  const [fontReady, setFontReady] = useState(false);
  useEffect(() => {
    let alive = true;
    void loadCarveFont().then(() => alive && setFontReady(true));
    return () => {
      alive = false;
    };
  }, []);
  // Drawn a few at a time (≈6 ms per frame) and uploaded to the GPU as they are made, during the
  // walk up the hall, so neither the tap nor the start of the carving stalls on a phone.
  const { gl, scene, camera } = useThree();
  type Decal = { block: Block } & ReturnType<typeof inscriptionMaterial>;
  const [decals, setDecals] = useState<Decal[]>([]);
  useEffect(() => {
    if (!fontReady) return;
    let alive = true;
    const out: Decal[] = [];
    let i = 0;
    let raf = 0;
    const step = () => {
      if (!alive) return;
      const t0 = performance.now();
      while (i < blocks.length && performance.now() - t0 < 6) {
        const b = blocks[i++];
        const d = { block: b, ...inscriptionMaterial(inscriptionTexture(b.lines, b.w, b.d, b.vertical), b.vertical) };
        if (d.material.map) gl.initTexture(d.material.map);
        out.push(d);
      }
      if (i < blocks.length) raf = requestAnimationFrame(step);
      else {
        setDecals(out);
        // Compile the carving shaders off the main thread where the browser allows it.
        const r = gl as THREE.WebGLRenderer & { compileAsync?: (s: THREE.Object3D, c: THREE.Camera) => Promise<unknown> };
        requestAnimationFrame(() => void r.compileAsync?.(scene, camera).catch(() => {}));
      }
    };
    raf = requestAnimationFrame(step);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      out.forEach((d) => {
        d.material.map?.dispose();
        d.material.dispose();
      });
    };
  }, [blocks, fontReady, gl, scene, camera]);
  const hit = useMemo(() => new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }), []);

  useFrame(() => {
    const c = clock.current;
    for (const d of decals) {
      let p = 0;
      if (c.phase === 'reading') p = 1;
      else if (c.phase === 'revealing') p = Math.min(1, Math.max(0, (c.t - startOf(d.block, plan)) / plan.textDuration));
      d.uniforms.uWipe.value = p * 1.02;
      d.material.opacity = Math.min(1, p * 3);
    }
  });

  return (
    <>
      {decals.map((d) => (
        <mesh key={d.block.key} position={[d.block.x, WORLD.tableTopY + 0.0008, d.block.z]} rotation={[-Math.PI / 2, 0, 0]} material={d.material}>
          <planeGeometry args={[d.block.w, d.block.d]} />
        </mesh>
      ))}
      {blocks
        .filter((b) => onOpenRelation && (b.key === 'relation' || b.key.startsWith('role-')))
        .map((b) => (
          <mesh
            key={`hit-${b.key}`}
            position={[b.x, WORLD.tableTopY + 0.01, b.z]}
            scale={[b.w, 0.02, b.d]}
            geometry={g.box}
            material={hit}
            onClick={(e) => {
              if (!interactive) return;
              e.stopPropagation();
              onOpenRelation?.();
            }}
          />
        ))}
      {blocks
        .filter((b) => b.stage)
        .map((b) => (
          <mesh
            key={`hit-${b.key}`}
            position={[b.x, WORLD.tableTopY + 0.01, b.z]}
            scale={[b.w, 0.02, b.d]}
            geometry={g.box}
            material={hit}
            onClick={(e) => {
              if (!interactive) return;
              e.stopPropagation();
              onOpenStage(b.stage!);
            }}
          />
        ))}
    </>
  );
}

// ---------------- main ----------------

interface Props {
  reading: Reading | null;
  clock: MutableRefObject<RitualClock>;
  reduced: boolean;
  selection: Selection | null;
  relation: RelationView | null;
  /** 起卦 time, carved small under the relation. */
  castTime?: string;
  interactive: boolean;
  t: Strings;
  lang: Lang;
  onPick: (pick: LinePick) => void;
  onOpenStage: (stage: StageKey) => void;
  /** Tapping the carved 体/用 tags or the relation strip. */
  onOpenRelation?: () => void;
}

const CINNABAR = new THREE.Color('#ff3a1a');
const CINNABAR_HOT = new THREE.Color('#ffb070');

export function StoneTable({ reading, clock, reduced, selection, relation, castTime = '', interactive, t, lang, onPick, onOpenStage, onOpenRelation }: Props) {
  const g = sharedGeometry();
  const top = useCarvedTopMaterial();
  const fx = useTableFx();
  const [tx, , tz] = WORLD.table;
  const topY = WORLD.tableTopY;
  const plan = useMemo(() => revealPlan(reduced), [reduced]);
  const grooves = useMemo<Groove[]>(() => (reading ? [...frameGrooves(), ...lineGrooves(reading), ...(relation ? arrowGrooves(relation) : [])] : []), [reading, relation]);
  const blocks = useMemo(() => (reading ? inscriptionBlocks(reading, relation, t, lang, castTime) : []), [reading, relation, t, lang, castTime]);
  const topGeometry = useMemo(() => roundedSlab(HEX_LAYOUT.tableWidth, HEX_LAYOUT.tableDepth, TOP_H, 0.06, 0.035, 4), []);
  const cavities = useRef<(THREE.Mesh | null)[]>([]);
  const glows = useRef<(THREE.Mesh | null)[]>([]);
  const triFloors = useRef<(THREE.Mesh | null)[]>([]);
  const emitter = useRef<{ point: [number, number] | null }>({ point: null });
  const lastT = useRef(-1);

  const markMaterial = useMemo(() => {
    if (!reading) return null;
    const yang = reading.stages.primary.bitsBottomUp[reading.movingLine - 1] === 1;
    return new THREE.MeshBasicMaterial({ map: movingMarkTexture(yang), transparent: true, depthWrite: false, toneMapped: false, opacity: 0 });
  }, [reading]);

  // A soft red-gold aura over the moving line, so the most important line is the first one seen.
  const auraMaterial = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 64;
    const g = c.getContext('2d')!;
    g.translate(128, 32);
    g.scale(1, 0.25);
    const rg = g.createRadialGradient(0, 0, 0, 0, 0, 128);
    rg.addColorStop(0, 'rgba(255, 150, 80, 1)');
    rg.addColorStop(0.45, 'rgba(255, 90, 40, 0.55)');
    rg.addColorStop(1, 'rgba(255, 60, 20, 0)');
    g.fillStyle = rg;
    g.fillRect(-128, -128, 256, 256);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, opacity: 0 });
  }, []);
  useEffect(() => () => {
    auraMaterial.map?.dispose();
    auraMaterial.dispose();
  }, [auraMaterial]);

  const triGeometries = useMemo(
    () =>
      grooves.map((gr) => {
        if (!gr.tris) return null;
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(gr.tris.flatMap((tri) => tri.flatMap(([x, z]) => [x, 0, z])), 3));
        geo.computeVertexNormals();
        return geo;
      }),
    [grooves],
  );

  const glowMats = useMemo(
    () => grooves.map(() => new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })),
    [grooves],
  );
  useEffect(() => () => glowMats.forEach((m) => m.dispose()), [glowMats]);
  const selectionRef = useRef(selection);
  selectionRef.current = selection;

  useFrame(() => {
    const c = clock.current;
    const tt = c.phase === 'reading' ? 1e6 : c.phase === 'revealing' ? c.t : -1;
    // The moving line flashes steadily in cinnabar; reduced motion keeps it bright without flashing.
    // The moving line breathes slowly (about 3 s) and lightly; reduced motion keeps it steady.
    const flash = reduced ? 1 : 0.5 + 0.5 * Math.sin(c.elapsed * 1.9);
    let rects = 0;
    let tris = 0;
    grooves.forEach((gr, i) => {
      const { carve, glow } = grooveProgress(gr, plan, tt);
      const cav = cavities.current[i];
      const gl = glows.current[i];
      if (gr.rect) {
        const r = carvedRect(gr.rect, gr.axis, carve);
        if (r && rects < MAX_RECTS) top.uniforms.uRects.value[rects++].set(r[0], r[1], r[2], r[3]);
        if (cav) {
          cav.visible = !!r;
          if (r) {
            cav.position.set((r[0] + r[2]) / 2, topY - CARVE_DEPTH / 2, (r[1] + r[3]) / 2);
            cav.scale.set(Math.max(1e-4, r[2] - r[0]), CARVE_DEPTH, Math.max(1e-4, r[3] - r[1]));
          }
        }
        if (gl && r) {
          const wide = r[2] - r[0] > r[3] - r[1];
          gl.position.set((r[0] + r[2]) / 2, topY - CARVE_DEPTH + 0.0012, (r[1] + r[3]) / 2);
          gl.scale.set(Math.max(1e-4, (r[2] - r[0]) * (wide ? 0.97 : 0.6)), Math.max(1e-4, (r[3] - r[1]) * (wide ? 0.55 : 0.97)), 1);
        }
      } else if (gr.tris && carve > 0.3) {
        for (const [a, b, cc] of gr.tris) {
          if (tris >= MAX_TRIS) break;
          top.uniforms.uTriA.value[tris].set(a[0], a[1], b[0], b[1]);
          top.uniforms.uTriB.value[tris++].set(cc[0], cc[1], 0, 0);
        }
      }
      const tf = triFloors.current[i];
      if (tf) tf.visible = gr.tris !== undefined && carve > 0.3;
      if (gl) {
        gl.visible = carve > 0;
        const mat = glowMats[i];
        const sel = selectionRef.current;
        const isMoving = !!reading && gr.stage === 'primary' && gr.kind === 'line' && gr.position === reading.movingLine;
        const isSelected = !!sel && gr.kind === 'line' && sel.stage === gr.stage && sel.hexagramId === gr.hexagramId && sel.linePosition === gr.position;
        if (isMoving) {
          mat.color.copy(CINNABAR).lerp(CINNABAR_HOT, flash * 0.3);
          mat.opacity = glow * (0.78 + 0.22 * flash);
        } else if (isSelected) {
          mat.color.set('#f4ecdc');
          mat.opacity = glow * 0.85;
        } else {
          mat.color.set(gr.kind === 'line' ? '#e3ad52' : '#b88c4c');
          mat.opacity = glow * (gr.kind === 'line' ? 0.78 : 0.5);
        }
      }
    });
    top.uniforms.uRectCount.value = rects;
    top.uniforms.uTriCount.value = tris;
    fx.marker.opacity = c.phase === 'reading' ? 0.55 : 0;
    if (markMaterial && reading) {
      const movingGlow = grooveProgress({ key: 'm', kind: 'line', axis: 'x', stage: 'primary', position: reading.movingLine }, plan, tt).glow;
      markMaterial.opacity = movingGlow * (0.8 + 0.2 * flash);
      // Reduced motion: a steady aura instead of a breathing one.
      auraMaterial.opacity = movingGlow * (reduced ? 0.4 : 0.26 + 0.18 * flash);
    }
    // Golden light that writes the grooves, and a soft knock as each line begins.
    emitter.current.point = c.phase === 'revealing' && !reduced ? chiselPoint(grooves, plan, c.t) : null;
    if (c.phase === 'revealing' && lastT.current >= 0) {
      const started = lineStarted(plan, lastT.current, c.t);
      if (started !== null) templeAudio.chime(started - 1);
    }
    lastT.current = c.phase === 'revealing' ? c.t : -1;
  });

  const pick = (e: ThreeEvent<MouseEvent>) => {
    if (!interactive) return;
    e.stopPropagation();
    const d = e.object.userData as Partial<LinePick>;
    const ne = e.nativeEvent as MouseEvent;
    if (d.stage && d.hexagramId && d.linePosition) onPick({ stage: d.stage, hexagramId: d.hexagramId, linePosition: d.linePosition, at: [ne.clientX, ne.clientY] });
  };

  return (
    <group position={[tx, 0, tz]}>
      <TableBody />
      <mesh position={[0, topY - TOP_H, 0]} geometry={topGeometry} material={top.material} castShadow receiveShadow />
      <pointLight position={[0, topY + 1.6, 0.6]} intensity={4.2} distance={5} decay={1.3} color="#ffdcb0" />
      <pointLight position={[-1.4, topY + 0.5, -0.4]} intensity={2.6} distance={4} decay={1.3} color="#ffc98a" />

      {grooves.map((gr, i) => (
        <group key={gr.key}>
          {gr.rect && <mesh ref={(el) => void (cavities.current[i] = el)} geometry={g.box} material={fx.cavity} visible={false} />}
          {triGeometries[i] && <mesh ref={(el) => void (triFloors.current[i] = el)} position={[0, topY - CARVE_DEPTH, 0]} geometry={triGeometries[i]!} material={fx.cavityFloor} visible={false} />}
          {gr.rect && (
            <mesh ref={(el) => void (glows.current[i] = el)} rotation={[-Math.PI / 2, 0, 0]} material={glowMats[i]} visible={false}>
              <planeGeometry args={[1, 1]} />
            </mesh>
          )}
        </group>
      ))}

      {reading &&
        STAGE_ORDER.map((stage) => {
          const panel = reading.stages[stage];
          return (
            <group key={stage} position={[HEX_LAYOUT.hexX, topY, stageCenterZ(stage)]}>
              {lineSlots(panel.bitsBottomUp).map((slot) => (
                <group key={slot.position} position={[0, 0, slot.depthOffset]}>
                  {stage === 'changed' && slot.position === reading.movingLine && (
                    <mesh position={[HEX_LAYOUT.markX - HEX_LAYOUT.hexX, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]} material={fx.marker}>
                      <ringGeometry args={[0.01, 0.018, 24]} />
                    </mesh>
                  )}
                  {/* One hit area covers both yin halves and the gap: either half selects the same line. */}
                  <mesh
                    position={[0, 0.01, 0]}
                    scale={[HEX_LAYOUT.lineWidth + 0.08, 0.02, HEX_LAYOUT.slot]}
                    geometry={g.box}
                    material={fx.hit}
                    userData={{ stage, hexagramId: panel.id, linePosition: slot.position } satisfies LinePick}
                    onClick={pick}
                  />
                </group>
              ))}
            </group>
          );
        })}

      {reading && (
        <mesh position={[HEX_LAYOUT.hexX, topY + 0.002, stageCenterZ('primary') + (3.5 - reading.movingLine) * HEX_LAYOUT.slot]} rotation={[-Math.PI / 2, 0, 0]} material={auraMaterial} renderOrder={3}>
          <planeGeometry args={[HEX_LAYOUT.lineWidth * 1.45, HEX_LAYOUT.slot * 1.5]} />
        </mesh>
      )}
      {reading && markMaterial && (
        <mesh position={[HEX_LAYOUT.markX, topY + 0.0015, stageCenterZ('primary') + (3.5 - reading.movingLine) * HEX_LAYOUT.slot]} rotation={[-Math.PI / 2, 0, 0]} material={markMaterial}>
          <planeGeometry args={[0.06, 0.06]} />
        </mesh>
      )}

      {reading && <Inscriptions blocks={blocks} clock={clock} plan={plan} onOpenStage={onOpenStage} onOpenRelation={onOpenRelation} interactive={interactive} />}
      <Motes emitter={emitter} />
    </group>
  );
}
