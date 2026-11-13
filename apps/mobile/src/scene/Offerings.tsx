/**
 * 供桌与供品: lacquered offering table with an embroidered front cloth, a pair of tall
 * candlesticks, 寿桃 / oranges / apples on footed plates, three tea cups, two vases of
 * flowers, and the candle on a stand beside the burner used to light the incense.
 */
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { flameGeometry, flameHaloGeometry, flameHaloMaterial, flameMaterial } from './flame';
import { lathe, roundedSlab, sceneMaterials, sharedGeometry } from './materials';
import { WORLD, type V3 } from './timeline';

function useOfferingMaterials() {
  return useMemo(
    () => ({
      peach: (() => {
        // Vertex-coloured peach: pink blush to pale yellow-green.
        const g = new THREE.SphereGeometry(1, 24, 18);
        const pos = g.attributes.position;
        const colors: number[] = [];
        const pink = new THREE.Color('#f08a8a');
        const cream = new THREE.Color('#f2dc9a');
        const tmp = new THREE.Color();
        for (let i = 0; i < pos.count; i++) {
          const y = pos.getY(i);
          if (y > 0.6) pos.setY(i, y + (y - 0.6) * 0.9 * Math.exp(-((pos.getX(i) ** 2 + pos.getZ(i) ** 2) / 0.06))); // pointed tip
          tmp.copy(cream).lerp(pink, THREE.MathUtils.clamp((y + 0.3) * 0.9 + pos.getX(i) * 0.2, 0, 1));
          colors.push(tmp.r, tmp.g, tmp.b);
        }
        g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        g.computeVertexNormals();
        return { geometry: g, material: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 }) };
      })(),
      orange: new THREE.MeshStandardMaterial({ color: '#e5862a', roughness: 0.6 }),
      apple: new THREE.MeshStandardMaterial({ color: '#b3262a', roughness: 0.4 }),
      leaf: new THREE.MeshStandardMaterial({ color: '#3f6b33', roughness: 0.7, side: THREE.DoubleSide }),
      tea: new THREE.MeshStandardMaterial({ color: '#7a4e16', roughness: 0.2 }),
      blossom: new THREE.MeshStandardMaterial({ color: '#f3d9e0', roughness: 0.6, side: THREE.DoubleSide }),
      blossomCore: new THREE.MeshStandardMaterial({ color: '#e8b13a', roughness: 0.6 }),
      vase: new THREE.MeshStandardMaterial({ color: '#2e3a40', roughness: 0.3, metalness: 0.05 }),
      bun: new THREE.MeshStandardMaterial({ color: '#f3ead8', roughness: 0.85 }),
      bunDot: new THREE.MeshStandardMaterial({ color: '#d8455a', roughness: 0.6 }),
      lampGlass: new THREE.MeshPhysicalMaterial({ color: '#ffd9a0', transmission: 0.6, roughness: 0.1, thickness: 0.02, transparent: true, opacity: 0.6 }),
    }),
    [],
  );
}

let geos: ReturnType<typeof buildGeos> | null = null;
function buildGeos() {
  return {
    plate: lathe([[0.001, 0], [0.06, 0], [0.065, 0.04], [0.05, 0.05], [0.16, 0.07], [0.17, 0.085], [0.001, 0.07]]),
    cup: lathe([[0.001, 0], [0.025, 0], [0.028, 0.008], [0.04, 0.02], [0.05, 0.06], [0.047, 0.062], [0.036, 0.022], [0.001, 0.012]]),
    candlestick: lathe([[0.001, 0], [0.11, 0], [0.11, 0.02], [0.06, 0.05], [0.03, 0.08], [0.03, 0.3], [0.05, 0.34], [0.025, 0.37], [0.025, 0.42], [0.08, 0.44], [0.08, 0.46], [0.001, 0.45]]),
    vase: lathe([[0.001, 0], [0.06, 0], [0.09, 0.08], [0.1, 0.16], [0.07, 0.26], [0.035, 0.32], [0.035, 0.38], [0.055, 0.42], [0.05, 0.43], [0.03, 0.38], [0.001, 0.37]]),
    stand: lathe([[0.001, 0], [0.16, 0], [0.16, 0.03], [0.06, 0.07], [0.03, 0.12], [0.025, 0.95], [0.05, 0.98], [0.09, 1.0], [0.09, 1.02], [0.001, 1.01]]),
    petal: (() => {
      const s = new THREE.Shape();
      s.moveTo(0, 0);
      s.quadraticCurveTo(0.03, 0.03, 0, 0.07);
      s.quadraticCurveTo(-0.03, 0.03, 0, 0);
      return new THREE.ShapeGeometry(s, 8);
    })(),
  };
}
function useGeos() {
  geos ??= buildGeos();
  return geos;
}

/** A candle with a living flame and a soft halo. */
/** `light` is kept for callers but no longer adds a light (see FlickerLight in Hall). */
export function Candle({ position, height = 0.36, radius = 0.035 }: { position: V3; height?: number; radius?: number; light?: boolean }) {
  const m = sceneMaterials();
  const g = sharedGeometry();
  const flame = useRef<THREE.Group>(null);
  return (
    <group position={position}>
      <mesh position={[0, height / 2, 0]} scale={[radius, height, radius]} geometry={g.cylinder} material={m.candle} castShadow />
      <mesh position={[0, height + 0.006, 0]} scale={[radius * 0.92, 0.012, radius * 0.92]} geometry={g.cylinder} material={m.candle} />
      {/* Wick, then the shader flame standing on it. */}
      <mesh position={[0, height + 0.012, 0]} scale={[0.0016, 0.014, 0.0016]} geometry={g.cylinderLow} material={m.wick} />
      <group ref={flame} position={[0, height + 0.008, 0]}>
        <mesh scale={[0.015, 0.05, 1]} geometry={flameGeometry()} material={flameMaterial()} />
        <mesh position={[0, 0.022, 0]} scale={[0.14, 0.14, 1]} geometry={flameHaloGeometry()} material={flameHaloMaterial()} />
      </group>
      {/* No light of its own: every extra light costs every pixel of the hall on a phone. */}
    </group>
  );
}

function FruitPyramid({ position, kind }: { position: V3; kind: 'peach' | 'orange' | 'apple' | 'bun' }) {
  const mats = useOfferingMaterials();
  const geo = useGeos();
  const m = sceneMaterials();
  const g = sharedGeometry();
  const r = kind === 'peach' ? 0.055 : 0.05;
  const spots: V3[] = [
    [-0.055, r, -0.03], [0.055, r, -0.03], [0, r, 0.06], [0, r, -0.09],
    [0, r * 2.55, -0.02],
  ];
  return (
    <group position={position}>
      <mesh geometry={geo.plate} material={m.porcelain} castShadow />
      <group position={[0, 0.07, 0]}>
        {spots.map((p, i) =>
          kind === 'peach' ? (
            <group key={i} position={p} rotation={[0.1 * i, i, 0]}>
              <mesh scale={r} geometry={mats.peach.geometry} material={mats.peach.material} castShadow />
              <mesh position={[0.02, r * 0.95, 0]} rotation={[0.4, 0, 0.9]} scale={[0.6, 0.6, 0.6]} geometry={geo.petal} material={mats.leaf} />
            </group>
          ) : kind === 'bun' ? (
            <group key={i} position={p}>
              <mesh scale={[r, r * 0.8, r]} geometry={g.sphere} material={mats.bun} castShadow />
              <mesh position={[0, r * 0.78, 0]} scale={[r * 0.25, r * 0.1, r * 0.25]} geometry={g.sphere} material={mats.bunDot} />
            </group>
          ) : (
            <mesh key={i} position={p} scale={kind === 'apple' ? [r, r * 0.9, r] : r} geometry={g.sphere} material={kind === 'apple' ? mats.apple : mats.orange} castShadow />
          ),
        )}
      </group>
    </group>
  );
}

function Vase({ position }: { position: V3 }) {
  const mats = useOfferingMaterials();
  const geo = useGeos();
  const stems = [[-0.05, 0.62, 0.3], [0.04, 0.68, -0.2], [0.0, 0.74, 0], [0.07, 0.6, 0.5], [-0.07, 0.58, -0.5]] as const;
  return (
    <group position={position}>
      <mesh geometry={geo.vase} material={mats.vase} castShadow />
      {stems.map(([x, h, tilt], i) => (
        <group key={i}>
          <mesh position={[x / 2, 0.38 + (h - 0.38) / 2, 0]} rotation={[0, 0, tilt * 0.2]} scale={[0.004, h - 0.38, 0.004]} material={mats.leaf}>
            <cylinderGeometry args={[1, 1, 1, 5]} />
          </mesh>
          <group position={[x, h, 0]} rotation={[0, i, 0]}>
            {[0, 1, 2, 3, 4, 5].map((k) => (
              <mesh key={k} rotation={[0.5, (k / 6) * Math.PI * 2, 0]} geometry={geo.petal} material={mats.blossom} />
            ))}
            <mesh scale={0.012} geometry={sharedGeometry().sphere} material={mats.blossomCore} />
          </group>
        </group>
      ))}
    </group>
  );
}

export function OfferingTable() {
  const m = sceneMaterials();
  const g = sharedGeometry();
  const geo = useGeos();
  const mats = useOfferingMaterials();
  const top = useMemo(() => roundedSlab(5.0, 1.2, 0.09, 0.05, 0.025, 3), []);
  const z = -10.6;
  const topY = 1.0;
  return (
    <group position={[0, 0, z]}>
      {/* Lacquered table: top, aprons, legs */}
      <mesh position={[0, topY - 0.09, 0]} geometry={top} material={m.lacquer} castShadow receiveShadow />
      {[-2.35, 2.35].map((x) => [-0.5, 0.5].map((zz) => <mesh key={`${x}${zz}`} position={[x, (topY - 0.09) / 2, zz]} scale={[0.1, topY - 0.09, 0.1]} geometry={g.box} material={m.lacquer} castShadow />))}
      {/* Embroidered front cloth (桌围) hanging to the floor */}
      <mesh position={[0, (topY - 0.02) / 2, 0.62]} scale={[4.8, topY - 0.04, 1]} material={m.cloth}>
        <planeGeometry />
      </mesh>
      <mesh position={[0, topY - 0.08, 0.63]} scale={[4.86, 0.1, 1]} material={m.gilt}>
        <planeGeometry />
      </mesh>
      {/* Candlesticks with tall candles */}
      {[-1.9, 1.9].map((x) => (
        <group key={x} position={[x, topY, 0]}>
          <mesh geometry={geo.candlestick} material={m.gilt} castShadow />
          <Candle position={[0, 0.46, 0]} height={0.42} radius={0.045} light={x < 0} />
        </group>
      ))}
      <FruitPyramid position={[0, topY, -0.1]} kind="peach" />
      <FruitPyramid position={[-0.68, topY, -0.1]} kind="orange" />
      <FruitPyramid position={[0.68, topY, -0.1]} kind="apple" />
      <FruitPyramid position={[-1.36, topY, -0.25]} kind="bun" />
      <FruitPyramid position={[1.36, topY, -0.25]} kind="bun" />
      {/* Ever-burning lamp (长明灯) */}
      <group position={[0, topY, 0.36]}>
        <mesh geometry={geo.cup} scale={[1.4, 1.2, 1.4]} material={m.gilt} />
        <Candle position={[0, 0.02, 0]} height={0.05} radius={0.03} light />
      </group>
      {[-0.6, -0.3, 0.3, 0.6].map((x) => (
        <group key={x} position={[x, topY, 0.38]}>
          <mesh geometry={geo.cup} material={m.porcelain} castShadow />
          <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mats.tea}>
            <circleGeometry args={[0.042, 20]} />
          </mesh>
        </group>
      ))}
      <Vase position={[-2.15, topY, -0.3]} />
      <Vase position={[2.15, topY, -0.3]} />
    </group>
  );
}

/** Candle on a tall stand beside the burner, used to light the incense. */
export function LightingCandle() {
  const m = sceneMaterials();
  const geo = useGeos();
  const [x, y, z] = WORLD.candleFlame;
  const standTop = y - 0.2;
  return (
    <group position={[x, 0, z]}>
      <mesh scale={[1, standTop / 1.01, 1]} geometry={geo.stand} material={m.bronze} castShadow />
      <Candle position={[0, standTop, 0]} height={0.16} radius={0.03} light />
    </group>
  );
}
