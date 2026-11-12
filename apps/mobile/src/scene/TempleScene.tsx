import { memo, useCallback, useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Hall } from './Hall';
import { Sanqing } from './Sanqing';
import { BurningOffering, Dust, IncenseHolder } from './Incense';
import { sceneMaterials } from './materials';
import { revealPlan } from './carving';
import { Bestowal, Precompile, bestowalGlow } from './Bestowal';
import { tickFlames } from './flame';
import { Mountains, NightSky } from './Exterior';
import { introProgress } from './introState';
import { StoneTable, type LinePick, type Selection } from './StoneTable';
import { cameraPose, clamp01, FAR, fovFor, HOME, INTRO_SECONDS, introPose, readingPose, WORLD } from './timeline';
import { sceneInsets } from './insets';
import { PLACE_PANEL, PLACE_POSES, type Place } from './placeLayout';
import { Places } from './Places';
import { StaticBatch } from './StaticBatch';
import { createDprGovernor } from './adaptive';
import { texturesIdle } from './texQueue';
import { markSceneReady } from './readiness';
import type { RitualClock } from '../ui/useRitualClock';
import type { QualityTier } from '../domain/quality';
import type { Reading } from '../knowledge/knowledge';
import type { RelationView } from '../domain/relation';
import type { StageKey } from '../domain/layout';
import type { Strings } from '../domain/i18n';
import type { Lang } from '../domain/settings';

/** Development only: `?look=faces` holds the camera close in front of the 三清, to check their faces. */
const LOOK_FACES = import.meta.env.DEV && typeof location !== 'undefined' && new URLSearchParams(location.search).get('look') === 'faces';
const LOOK_X = LOOK_FACES ? Number(new URLSearchParams(location.search).get('x')) || 0 : 0;
const LOOK_SIDE = LOOK_FACES && new URLSearchParams(location.search).get('side') === '1';
const LOOK_D = LOOK_FACES ? Number(new URLSearchParams(location.search).get('d')) || 1 : 1;

/** Height of the reading-view buttons and hint at the bottom of the screen. */

/** Opening walk-in: `start` is clock.elapsed when it began (null: still waiting at the gate); `done` once home. */
export interface IntroRef { start: number | null; done: boolean }

function CameraRig({ clock, reduced, intro }: { clock: MutableRefObject<RitualClock>; reduced: boolean; intro?: MutableRefObject<IntroRef> }) {
  const { camera, size } = useThree();
  const look = useMemo(() => new THREE.Vector3(), []);
  const reserve = useRef(0);
  const reserveTop = useRef(0);
  // 0 → 1 weights of the two side places; eased so the camera walks rather than jumps.
  const visit = useRef({ library: 0, records: 0 });
  const last = useRef(0);
  useFrame(() => {
    const c = clock.current;
    tickFlames(c.elapsed);
    const aspect = size.width / Math.max(1, size.height);
    const fov = fovFor(aspect);
    const cam = camera as THREE.PerspectiveCamera;
    if (cam.fov !== fov) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
    // While carving and reading, keep the strip under the buttons clear: frame the table in the
    // upper part of the screen and shift the picture up by half that strip.
    const away = c.phase === 'idle' && sceneInsets.place !== 'altar';
    const atTable = c.phase === 'reading' || c.phase === 'revealing';
    const H = Math.max(1, size.height);
    // At the stone table the top bar and the bottom bar both keep their strips clear: the table is
    // framed in the band between them (never hidden under them).
    const want = atTable ? (sceneInsets.footerPx + 8) / H : away ? PLACE_PANEL : 0;
    const wantTop = atTable ? (sceneInsets.headerPx + 6) / H : 0;
    const approach = c.phase === 'reading' || reduced ? 1 : 0.08;
    reserve.current += (want - reserve.current) * approach;
    reserveTop.current += (wantTop - reserveTop.current) * approach;
    const r = reserve.current;
    const rt = reserveTop.current;
    const shift = ((r - rt) * size.height) / 2;
    if (Math.abs(shift) > 0.5) cam.setViewOffset(size.width, size.height, 0, shift, size.width, size.height);
    else if (cam.view?.enabled) cam.clearViewOffset();
    let pose = cameraPose(c.phase, c.t, reduced, readingPose(aspect, fov, rt, r));
    const it = intro?.current;
    if (it && !it.done && c.phase === 'idle') {
      const dur = reduced ? INTRO_SECONDS.reduced : INTRO_SECONDS.normal;
      introProgress.k = it.start === null ? 0 : clamp01((c.elapsed - it.start) / dur);
      pose = introPose(introProgress.k, pose, c.elapsed);
    } else introProgress.k = 1;
    // 殿中三处: glide from the home view to the 藏经阁 cabinet or the 问事录 desk and back.
    const dt = Math.min(0.1, Math.max(0, c.elapsed - last.current));
    last.current = c.elapsed;
    const v = visit.current;
    for (const p of ['library', 'records'] as const) {
      const goal = c.phase === 'idle' && sceneInsets.place === p ? 1 : 0;
      v[p] = reduced ? goal : v[p] + (goal - v[p]) * Math.min(1, dt * 2.2);
      if (v[p] > 0.001) {
        const k = v[p] * v[p] * (3 - 2 * v[p]);
        const to = PLACE_POSES[p];
        pose = { pos: lerpV(pose.pos, to.pos, k), target: lerpV(pose.target, to.target, k) };
      }
    }
    if (LOOK_FACES) {
      const fy = LOOK_X === 0 ? 4.78 : 4.38;
      pose = LOOK_SIDE ? { pos: [LOOK_X + 1.0 * LOOK_D, fy - 0.1, -13.95 + 1.05 * LOOK_D], target: [LOOK_X, fy - 0.25 * LOOK_D, -13.95] } : { pos: [LOOK_X, fy - 0.05 * LOOK_D, -13.95 + 1.2 * LOOK_D], target: [LOOK_X, fy - 0.1 - 0.4 * (LOOK_D - 1), -13.95] };
    }
    camera.position.set(...pose.pos);
    look.set(...pose.target);
    camera.lookAt(look);
    camera.updateMatrixWorld();
  });
  return null;
}

const lerpV = (a: readonly number[], b: readonly number[], k: number) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k] as [number, number, number];

/** Keeps phones smooth: drops the render resolution when frames fall below ~40 fps, raises it back slowly. */
function AdaptiveResolution({ max, phase }: { max: number; phase: string }) {
  const { setDpr } = useThree();
  // Text on the stone must stay sharp: never below 1.5× on a high-density screen.
  const floor = Math.min(max, 1.5);
  const gov = useMemo(() => createDprGovernor({ min: floor, max, start: Math.min(2, max, globalThis.devicePixelRatio || 1) }), [max, floor]);
  // Reading the stone: a still picture, so full resolution right away (and no lowering while reading).
  useEffect(() => {
    if (phase !== 'reading') return;
    gov.reset(Math.min(2, max));
    applied.current = gov.dpr;
    setDpr(gov.dpr);
  }, [phase, gov, max, setDpr]);
  const applied = useRef(0);
  useEffect(() => {
    applied.current = gov.dpr;
    setDpr(gov.dpr);
  }, [gov, setDpr]);
  useFrame((_, dt) => {
    if (phase === 'reading') return;
    const d = gov.frame(dt);
    if (d !== applied.current) {
      applied.current = d;
      setDpr(d);
    }
  });
  return null;
}

/**
 * Lights by zone. The courtyard's lights (beyond the doors) only matter while the camera is out
 * there; once inside they are switched off, so the hall's shaders loop over a dozen lights, not
 * twenty-five. Both light sets are compiled up front, so switching never compiles mid-walk.
 * The directional shadow map is static: drawn once and again only when the phase changes.
 */
function LightZones({ phase }: { phase: string }) {
  const { gl, scene, camera } = useThree();
  const outside = useRef<THREE.Light[]>([]);
  const on = useRef(true);
  const frames = useRef(0);
  useEffect(() => {
    const list: THREE.Light[] = [];
    const p = new THREE.Vector3();
    scene.traverse((o) => {
      if ((o as THREE.Light).isLight && !(o as THREE.AmbientLight).isAmbientLight && !(o as THREE.HemisphereLight).isHemisphereLight && !(o as THREE.DirectionalLight).isDirectionalLight) {
        o.getWorldPosition(p);
        if (p.z > 12) list.push(o as THREE.Light);
      }
    });
    outside.current = list;
    // Both light sets are compiled up front by WarmUp (in the background, before the first frame).
    gl.shadowMap.autoUpdate = false;
    gl.shadowMap.needsUpdate = true;
  }, [gl, scene, camera]);
  useEffect(() => {
    gl.shadowMap.needsUpdate = true;
    frames.current = 0;
  }, [gl, phase]);
  useFrame(() => {
    // Refresh shadows for a couple of frames after a change (late objects settle), then keep them.
    if (frames.current++ < 2) gl.shadowMap.needsUpdate = true;
    const want = camera.position.z > 10;
    if (want !== on.current) {
      on.current = want;
      outside.current.forEach((l) => (l.visible = want));
    }
  });
  return null;
}

// The static scenery never changes with the ritual phase: memoised, so a phase change (tap,
// bestowal, reading) re-renders only what depends on it instead of walking ~700 hall elements.
const HallM = memo(Hall);
const SanqingM = memo(Sanqing);
const PlacesM = memo(Places);
const IncenseHolderM = memo(IncenseHolder);
const NightSkyM = memo(NightSky);
const MountainsM = memo(Mountains);
const StaticHall = memo(function StaticHall({ shadows }: { shadows: boolean }) {
  return (
    <>
      <StaticBatch>
        <HallM shadows={shadows} />
      </StaticBatch>
      <StaticBatch>
        <SanqingM />
      </StaticBatch>
    </>
  );
});

/** Soft image-based lighting so gold, lacquer and porcelain have reflections (generated, no files). */
function TempleEnvironment() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.32;
    return () => {
      scene.environment = null;
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  return null;
}

/**
 * 祖师赐卦: a shaft of warm light from the altar comes down onto the stone table when the
 * reader sits, the statues' halos brighten, and stays faintly while the reading is shown.
 */
function DivineLight({ clock, reduced }: { clock: MutableRefObject<RitualClock>; reduced: boolean }) {
  const m = sceneMaterials();
  const plan = useMemo(() => revealPlan(reduced), [reduced]);
  const beam = useMemo(() => {
    const from = new THREE.Vector3(0.6, 7.6, -11.5);
    const to = new THREE.Vector3(WORLD.table[0], WORLD.tableTopY, WORLD.table[2]);
    const dir = to.clone().sub(from);
    const geometry = new THREE.CylinderGeometry(0.35, 1.25, dir.length(), 32, 1, true);
    const material = new THREE.ShaderMaterial({
      uniforms: { uOpacity: { value: 0 }, uTime: { value: 0 } },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        varying float vFacing;
        void main() {
          vUv = uv;
          vec3 n = normalize(normalMatrix * normal);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vFacing = abs(dot(n, normalize(-mv.xyz)));
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform float uOpacity;
        uniform float uTime;
        varying vec2 vUv;
        varying float vFacing;
        void main() {
          float along = smoothstep(0.0, 0.25, vUv.y) * smoothstep(1.0, 0.7, vUv.y);
          float rays = 0.75 + 0.25 * sin(vUv.x * 60.0 + uTime * 0.6) * sin(vUv.x * 23.0 - uTime * 0.4);
          float a = pow(vFacing, 2.0) * along * rays * uOpacity * 0.32;
          gl_FragColor = vec4(1.0, 0.86, 0.58, a);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(from).add(to).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir.clone().normalize());
    return { mesh, material };
  }, []);
  const tableLight = useRef<THREE.PointLight>(null);
  useFrame(() => {
    const c = clock.current;
    let k = 0;
    if (c.phase === 'revealing') k = Math.min(1, Math.max(0, (c.t - plan.lightStart) / 1.2)) * (c.t > plan.total - 1.5 ? 0.55 + 0.45 * Math.max(0, (plan.total - c.t) / 1.5) : 1);
    else if (c.phase === 'reading') k = 0.55;
    beam.material.uniforms.uOpacity.value = k;
    beam.material.uniforms.uTime.value = c.elapsed;
    m.halo.emissiveIntensity = 0.25 + 0.7 * k;
    if (tableLight.current) tableLight.current.intensity = Math.max(3.5 * k, bestowalGlow.table);
  });
  return (
    <>
      <primitive object={beam.mesh} />
      <pointLight ref={tableLight} position={[WORLD.table[0], WORLD.tableTopY + 1.2, WORLD.table[2] - 0.3]} intensity={0} distance={4} decay={1.4} color="#ffd79a" />
    </>
  );
}

/** Pauses rendering entirely while the app is in the background. */
/**
 * The first frame waits for the shaders: every material (hidden effects included) is compiled in
 * the background where the GPU driver allows it, and only then does the render loop start. The
 * scene is marked ready once the generated textures have arrived too.
 */
function WarmUp({ covered }: { covered: boolean }) {
  const { gl, scene, camera, setFrameloop } = useThree();
  const compiled = useRef(false);
  const coveredRef = useRef(covered);
  coveredRef.current = covered;
  const syncFrameloop = useCallback(() => {
    setFrameloop(compiled.current && !document.hidden && !coveredRef.current ? 'always' : 'never');
  }, [setFrameloop]);
  useEffect(() => {
    syncFrameloop();
    document.addEventListener('visibilitychange', syncFrameloop);
    return () => document.removeEventListener('visibilitychange', syncFrameloop);
  }, [covered, syncFrameloop]);
  useEffect(() => {
    let alive = true;
    // Hidden effects are shown for the compile so their shaders are ready too; lights keep their
    // real state, because every light count is its own shader variant.
    const hidden: THREE.Object3D[] = [];
    const outside: THREE.Light[] = [];
    const p = new THREE.Vector3();
    scene.traverse((o) => {
      if ((o as THREE.Light).isLight) {
        const l = o as THREE.Light;
        if (!(l as THREE.AmbientLight).isAmbientLight && !(l as THREE.HemisphereLight).isHemisphereLight && !(l as THREE.DirectionalLight).isDirectionalLight && l.visible) {
          o.getWorldPosition(p);
          if (p.z > 12) outside.push(l);
        }
        return;
      }
      if (!o.visible && !o.userData.batched) {
        hidden.push(o);
        o.visible = true;
      }
    });
    const settle = <T,>(p: Promise<T>, ms: number) => Promise.race([p.catch(() => undefined), new Promise((r) => window.setTimeout(r, ms))]);
    void (async () => {
      // The light set for where the camera starts first, then the other (LightZones' rule).
      const startsOutside = camera.position.z > 10;
      const sets = startsOutside ? [true, false] : [false, true];
      for (const lit of sets) {
        outside.forEach((l) => (l.visible = lit));
        await settle(gl.compileAsync(scene, camera), 6000);
        if (!alive) break;
      }
      outside.forEach((l) => (l.visible = true));
      for (const o of hidden) o.visible = false;
      if (!alive) return;
      // Hidden effects' own textures (glow sprites and the like) go up now, not mid-ritual.
      scene.traverse((o) => {
        const mats = (o as THREE.Mesh).material;
        for (const mat of Array.isArray(mats) ? mats : mats ? [mats] : [])
          for (const v of Object.values(mat as unknown as Record<string, unknown>))
            if (v instanceof THREE.Texture && v.image) {
              try {
                gl.initTexture(v);
              } catch {
                /* best effort */
              }
            }
      });
      compiled.current = true;
      syncFrameloop();
      await settle(texturesIdle(), 15000);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      if (alive) markSceneReady();
    })();
    return () => {
      alive = false;
      for (const o of hidden) o.visible = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

export interface TempleSceneProps {
  reading: Reading | null;
  relation: RelationView | null;
  castTime?: string;
  clock: MutableRefObject<RitualClock>;
  phase: string;
  covered: boolean;
  reduced: boolean;
  tier: QualityTier;
  selection: Selection | null;
  t: Strings;
  lang: Lang;
  sound: boolean;
  onPick: (pick: LinePick) => void;
  onOpenStage: (stage: StageKey) => void;
  /** Tapping the carved 体用 strip or tags. */
  onOpenRelation?: () => void;
  /** A tap that hit nothing in the scene (closes the line tooltip). */
  onMiss?: () => void;
  onContextLost: () => void;
  intro?: MutableRefObject<IntroRef>;
  /** Tapping the 藏经阁 cabinet or the 问事录 desk goes there. */
  onPlace?: (p: Place) => void;
}

export const TempleScene = memo(function TempleScene(props: TempleSceneProps) {
  const { reading, relation, castTime, clock, phase, covered, reduced, tier, selection, t, lang, onPick, onOpenStage, onOpenRelation, onMiss, onContextLost, intro, onPlace } = props;
  // Stable across phases (so the memoised places never re-render); taps count only while idle.
  const placeRef = useRef(onPlace);
  placeRef.current = onPlace;
  const placeTap = useCallback((p: Place) => {
    if (clock.current.phase === 'idle') placeRef.current?.(p);
  }, [clock]);
  return (
    <div className="scene-wrap">
      <Canvas
        className="temple-canvas"
        dpr={[1, tier.maxDpr]}
        frameloop="never"

        shadows={tier.shadows}
        gl={{ antialias: tier.antialias, powerPreference: 'high-performance', alpha: false }}
        camera={{ fov: 50, near: 0.03, far: 160, position: intro && !intro.current.done ? FAR.pos : HOME.pos }}
        onPointerMissed={() => onMiss?.()}
        onCreated={({ gl, scene, camera }) => {
          // Development only: renderer, scene and camera for performance and layout checks.
          if (import.meta.env.DEV) (window as unknown as { __wengua?: unknown }).__wengua = { gl, scene, camera, THREE };
          // three.js renders PCFSoft as PCF (and switches on the first shadow pass); set it now so
          // the shaders compiled before the first frame are the ones it uses.
          if (gl.shadowMap.type === THREE.PCFSoftShadowMap) gl.shadowMap.type = THREE.PCFShadowMap;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.1;
          gl.domElement.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            onContextLost();
          });
        }}
      >
        <color attach="background" args={['#0c0907']} />
        <fog attach="fog" args={['#120d0a', 12, 38]} />
        <ambientLight intensity={0.22} color="#ffdcb4" />
        <hemisphereLight args={['#5a4a3a', '#120c08', 0.3]} />
        <directionalLight position={[3, 8, 6]} intensity={0.4} color="#ffd9a8" castShadow={tier.shadows} shadow-mapSize={[1024, 1024]} />
        <TempleEnvironment />
        <WarmUp covered={covered} />
        <LightZones phase={phase} />
        <AdaptiveResolution max={Math.min(tier.maxDpr, globalThis.devicePixelRatio || 1)} phase={phase} />
        <CameraRig clock={clock} reduced={reduced} intro={intro} />
        <StaticHall shadows={tier.shadows} />
        <PlacesM onPlace={placeTap} />
        <IncenseHolderM />
        <BurningOffering particles={tier.smokeParticles * 2} />
        <DivineLight clock={clock} reduced={reduced} />
        <NightSkyM />
        <MountainsM />
        <Bestowal clock={clock} reduced={reduced} />
        <Precompile deps={[reading]} />
        <Dust count={reduced ? 0 : tier.dustParticles} />
        <StoneTable
          reading={reading}
          clock={clock}
          reduced={reduced}
          selection={selection}
          relation={relation}
          castTime={castTime}
          interactive={phase === 'reading'}
          t={t}
          lang={lang}
          onPick={onPick}
          onOpenStage={onOpenStage}
          onOpenRelation={onOpenRelation}
        />
      </Canvas>
    </div>
  );
});
