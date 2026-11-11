/** The incense in the hall: the burning offering in the burner, the holder, and drifting dust. */
import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { sceneMaterials } from './materials';
import { STICK_LEN, WORLD } from './timeline';
import { lathe } from './materials';


/** Converts a world-space point size to pixels for the current camera and canvas. */
function pixelScale(state: { size: { height: number }; viewport: { dpr: number }; camera: THREE.Camera }) {
  const fov = (state.camera as THREE.PerspectiveCamera).fov ?? 50;
  return (state.size.height * state.viewport.dpr) / (2 * Math.tan((fov * Math.PI) / 360));
}

const dustVertex = /* glsl */ `
  uniform float uTime;
  uniform float uPixel;
  attribute vec3 aSeed;
  varying float vAlpha;
  void main() {
    vec3 p = position;
    p.y = mod(p.y + uTime * (0.03 + aSeed.x * 0.03), 6.0) + 0.3;
    p.x += sin(uTime * 0.2 + aSeed.y * 6.28) * 0.3;
    p.z += cos(uTime * 0.17 + aSeed.z * 6.28) * 0.3;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    // Clamp size and fade motes right in front of the lens so none become large blobs.
    gl_PointSize = min(0.012 * uPixel / -mv.z, 3.5);
    vAlpha = (0.18 + 0.2 * aSeed.z) * smoothstep(1.5, 4.0, -mv.z);
  }
`;
const dustFragment = /* glsl */ `
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    gl_FragColor = vec4(1.0, 0.86, 0.6, smoothstep(0.5, 0.0, d) * vAlpha);
  }
`;

export function Dust({ count }: { count: number }) {
  const data = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = (k: number) => ((Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1 + 1) % 1;
      pos.set([(r(1) - 0.5) * 9, r(2) * 6, -11 + r(3) * 16], i * 3);
      seed.set([r(4), r(5), r(6)], i * 3);
    }
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geometry.setAttribute('aSeed', new THREE.Float32BufferAttribute(seed, 3));
    const material = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uPixel: { value: 900 } },
      vertexShader: dustVertex,
      fragmentShader: dustFragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return { geometry, material };
  }, [count]);
  useFrame((state) => {
    data.material.uniforms.uTime.value = state.clock.elapsedTime;
    data.material.uniforms.uPixel.value = pixelScale(state);
  });
  if (count <= 0) return null;
  return <points geometry={data.geometry} material={data.material} frustumCulled={false} />;
}

// ---------------- the burner already full of burning incense (香火) ----------------

const OLD_STICKS = 72;

/** Dozens of earlier offerings still burning in the burner, with a broad, slow plume of smoke. */
export function BurningOffering({ particles }: { particles: number }) {
  const m = sceneMaterials();
  const data = useMemo(() => {
    const rnd = (k: number) => ((Math.sin(k * 127.1) * 43758.5453) % 1 + 1) % 1;
    const body = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 6), m.stick, OLD_STICKS);
    const ember = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: '#ff7a30', toneMapped: false }), OLD_STICKS);
    const tips: THREE.Vector3[] = [];
    const o = new THREE.Object3D();
    const [bx, , bz] = WORLD.burner;
    for (let i = 0; i < OLD_STICKS; i++) {
      // Spread across the ash, avoiding the three spots where the new sticks go.
      // Older sticks stand in the back half of the burner, clear of the three planting spots
      // and of the side the hands come in from, so nothing passes through them.
      const r = 0.16 + rnd(i) * 0.3;
      const a = Math.PI * (1.04 + rnd(i + 50) * 0.92); // back arc (−z side)
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r * 0.9;
      const len = 0.12 + rnd(i + 90) * 0.24; // many freshly offered, some burnt down
      const tiltX = (rnd(i + 20) - 0.5) * 0.25;
      const tiltZ = (rnd(i + 30) - 0.5) * 0.25;
      o.position.set(bx + x, WORLD.burnerTopY - 0.04 + len / 2, bz + z);
      o.rotation.set(tiltX, 0, tiltZ);
      o.scale.set(0.0034, len, 0.0034);
      o.updateMatrix();
      body.setMatrixAt(i, o.matrix);
      const tip = new THREE.Vector3(0, 0.5, 0).applyMatrix4(o.matrix);
      tips.push(tip);
      o.position.copy(tip);
      o.rotation.set(0, 0, 0);
      o.scale.setScalar(0.0052);
      o.updateMatrix();
      ember.setMatrixAt(i, o.matrix);
    }
    // Plume particles: each starts at one of the tips and rises, widening and swirling.
    const n = Math.max(80, particles);
    const geometry = new THREE.BufferGeometry();
    const start = new Float32Array(n * 3);
    const seed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const tip = tips[i % tips.length];
      start.set([tip.x, tip.y, tip.z], i * 3);
      seed[i] = rnd(i + 300);
    }
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(start, 3));
    geometry.setAttribute('aSeed', new THREE.Float32BufferAttribute(seed, 1));
    const material = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uPixel: { value: 900 }, uMap: { value: m.textures.smoke } },
      vertexShader: /* glsl */ `
        uniform float uTime;
        uniform float uPixel;
        attribute float aSeed;
        varying float vAlpha;
        void main() {
          float life = 9.0;
          float age = mod(uTime + aSeed * life, life) / life;
          vec3 p = position;
          // Thin threads at first, then a broad column that curls and spreads under the roof.
          p.y += age * 3.4 + age * age * 0.8;
          p.x += sin(age * 4.0 + aSeed * 20.0 + uTime * 0.3) * 0.32 * age + sin(uTime * 0.11 + aSeed) * 0.2 * age * age;
          p.z += cos(age * 3.0 + aSeed * 13.0) * 0.22 * age;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = (0.025 + age * 0.85) * uPixel / -mv.z;
          vAlpha = smoothstep(0.0, 0.06, age) * pow(1.0 - age, 1.3) * 0.22;
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap;
        varying float vAlpha;
        void main() {
          vec4 t = texture2D(uMap, gl_PointCoord);
          gl_FragColor = vec4(vec3(0.8, 0.78, 0.74), t.a * vAlpha);
        }`,
      transparent: true,
      depthWrite: false,
    });
    return { body, ember, geometry, material };
  }, [m, particles]);
  useFrame((state) => {
    data.material.uniforms.uTime.value = state.clock.elapsedTime;
    data.material.uniforms.uPixel.value = pixelScale(state);
  });
  return (
    <group>
      <primitive object={data.body} />
      <primitive object={data.ember} />
      <points geometry={data.geometry} material={data.material} frustumCulled={false} />
    </group>
  );
}

/** Incense holder (香筒) on a stand, full of unlit sticks. */
export function IncenseHolder() {
  const m = sceneMaterials();
  const geo = useMemo(
    () => ({
      stand: lathe([[0.001, 0], [0.15, 0], [0.15, 0.03], [0.06, 0.07], [0.03, 0.12], [0.025, 0.86], [0.06, 0.89], [0.08, 0.9], [0.001, 0.905]], 16),
      cup: lathe([[0.001, 0], [0.045, 0], [0.05, 0.02], [0.05, 0.11], [0.054, 0.12], [0.044, 0.12], [0.044, 0.02], [0.001, 0.02]], 24),
      spare: (() => {
        const parts: THREE.BufferGeometry[] = [];
        for (let i = 0; i < 14; i++) {
          const a = (i / 14) * Math.PI * 2;
          const g = new THREE.CylinderGeometry(0.0034, 0.0034, STICK_LEN, 5);
          g.rotateZ(Math.cos(a) * 0.08);
          g.rotateX(Math.sin(a) * 0.08);
          g.translate(Math.cos(a) * 0.03, STICK_LEN / 2 + 0.02, Math.sin(a) * 0.03 - 0.012);
          parts.push(g);
        }
        return parts;
      })(),
    }),
    [],
  );
  const [x, y, z] = WORLD.holder;
  return (
    <group position={[x, 0, z]}>
      <mesh scale={[1, (y - 0.02) / 0.905, 1]} geometry={geo.stand} material={m.bronze} castShadow />
      <group position={[0, y - 0.03, 0]}>
        <mesh geometry={geo.cup} material={m.lacquer} castShadow />
        {geo.spare.map((g, i) => (
          <mesh key={i} geometry={g} material={m.stick} />
        ))}
      </group>
    </group>
  );
}

