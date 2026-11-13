/**
 * Outside the hall, seen at the opening and on the walk in: a carved plaque in brush script, a
 * painted lintel (旋子彩画), bracket sets (斗拱), a tiled roof with its ridge, couplet boards, a
 * red silk festoon, stone lanterns and a courtyard censer — under a night sky with stars, the moon
 * and misty mountains. Everything is drawn procedurally (canvas textures and shaders).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { drawCloud, fbm, lathe, normalFromHeight, sceneMaterials, sharedGeometry, tiledPlane } from './materials';
import { entranceTexture } from './entranceArt';

export const FRONT = 13.6;
const BRUSH = '"WenguaBrush", "WenguaSerifHeading", "Noto Serif SC", serif';

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return { c, g: c.getContext('2d', { willReadFrequently: true })! };
}

/** A canvas texture drawn now and drawn again once the brush font has loaded. */
function brushTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const { c, g } = canvas(w, h);
  draw(g);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  document.fonts?.load(`100px ${BRUSH}`).then(() => {
    g.clearRect(0, 0, w, h);
    draw(g);
    t.needsUpdate = true;
  });
  return t;
}

/** Gilt characters with a dark engraved edge, as on lacquered temple boards. */
function giltText(g: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, vertical = false) {
  g.font = `${size}px ${BRUSH}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const chars = [...text];
  const step = size * 1.08;
  chars.forEach((ch, i) => {
    const px = vertical ? x : x + (i - (chars.length - 1) / 2) * step;
    const py = vertical ? y + (i - (chars.length - 1) / 2) * step : y;
    g.fillStyle = 'rgba(0,0,0,0.55)';
    g.fillText(ch, px + size * 0.03, py + size * 0.04);
    const grad = g.createLinearGradient(px, py - size / 2, px, py + size / 2);
    grad.addColorStop(0, '#fff0b8');
    grad.addColorStop(0.45, '#e8bf5c');
    grad.addColorStop(1, '#a8741f');
    g.fillStyle = grad;
    g.fillText(ch, px, py);
  });
}

/** Board with a carved gilt frame of cloud scrolls and corner rosettes. */
function ornateBoard(g: CanvasRenderingContext2D, w: number, h: number, field: [string, string]) {
  const bg = g.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, field[0]);
  bg.addColorStop(1, field[1]);
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  const band = Math.min(w, h) * 0.13;
  // Gilt frame.
  const gold = g.createLinearGradient(0, 0, w, h);
  // Old gilt, toned down so the board reads as carved wood, not a lit sign.
  gold.addColorStop(0, '#c4a262');
  gold.addColorStop(0.5, '#8a6a34');
  gold.addColorStop(1, '#b8955a');
  g.fillStyle = gold;
  g.fillRect(0, 0, w, band);
  g.fillRect(0, h - band, w, band);
  g.fillRect(0, 0, band, h);
  g.fillRect(w - band, 0, band, h);
  // Carved scrolls in the frame.
  g.strokeStyle = 'rgba(90, 55, 15, 0.75)';
  g.lineWidth = band * 0.09;
  g.lineCap = 'round';
  const s = band * 0.28;
  for (let x = band * 0.9; x < w - band; x += s * 3.2) {
    drawCloud(g, x, band * 0.55, s);
    drawCloud(g, x + s, h - band * 0.45, s);
  }
  for (let y = band * 1.6; y < h - band; y += s * 3.2) {
    drawCloud(g, band * 0.3, y, s);
    drawCloud(g, w - band * 0.75, y, s);
  }
  // Inner beads.
  g.strokeStyle = '#cdb07a';
  g.lineWidth = band * 0.08;
  g.strokeRect(band * 1.08, band * 1.08, w - band * 2.16, h - band * 2.16);
  g.strokeStyle = 'rgba(0,0,0,0.5)';
  g.lineWidth = band * 0.05;
  g.strokeRect(band * 0.98, band * 0.98, w - band * 1.96, h - band * 1.96);
  // Corner rosettes.
  for (const [cx, cy] of [[band / 2, band / 2], [w - band / 2, band / 2], [band / 2, h - band / 2], [w - band / 2, h - band / 2]]) {
    g.fillStyle = '#d8c08a';
    g.beginPath();
    g.arc(cx, cy, band * 0.32, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#9b6a22';
    g.beginPath();
    g.arc(cx, cy, band * 0.14, 0, Math.PI * 2);
    g.fill();
  }
}

/** The 「三清殿」 plaque (outside, and reused inside the hall). */
export function plaqueTexture(text = '三清殿') {
  const W = 1536;
  const H = 560;
  return brushTexture(W, H, (g) => {
    // Charcoal board, as on the painted plaques of the walk-in.
    ornateBoard(g, W, H, ['#2a2825', '#141310']);
    giltText(g, text, W / 2, H / 2 + 8, 250);
  });
}

function coupletTexture(text: string) {
  const W = 240;
  const H = 1280;
  return brushTexture(W, H, (g) => {
    ornateBoard(g, W, H, ['#7a1b12', '#4e0f0a']);
    giltText(g, text, W / 2, H / 2, 170, true);
  });
}

/** 旋子彩画 on the lintel: whirl-flower ends, a long central panel, all outlined in gold. */
function beamTexture() {
  const W = 2048;
  const H = 192;
  const { c, g } = canvas(W, H);
  const blue = '#1e2a2f'; // faded mineral colours, nearly ink
  const green = '#24302a';
  g.fillStyle = green;
  g.fillRect(0, 0, W, H);
  g.strokeStyle = '#8f7246';
  g.lineWidth = 6;
  // Central panel (枋心).
  g.fillStyle = blue;
  g.beginPath();
  g.moveTo(W * 0.3, H * 0.12);
  g.lineTo(W * 0.7, H * 0.12);
  g.lineTo(W * 0.74, H / 2);
  g.lineTo(W * 0.7, H * 0.88);
  g.lineTo(W * 0.3, H * 0.88);
  g.lineTo(W * 0.26, H / 2);
  g.closePath();
  g.fill();
  g.stroke();
  g.lineWidth = 4;
  for (let k = 0; k < 5; k++) drawCloud(g, W * (0.36 + k * 0.07), H * (0.5 + (k % 2 ? 0.08 : -0.06)), H * 0.12);
  // Whirl flowers (旋花) at both ends.
  const whirl = (cx: number) => {
    for (const [r, col] of [[H * 0.42, blue], [H * 0.3, green], [H * 0.17, blue]] as const) {
      g.fillStyle = col;
      g.beginPath();
      g.arc(cx, H / 2, r, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      for (let p = 0; p < 10; p++) {
        const a = (p / 10) * Math.PI * 2;
        g.beginPath();
        g.arc(cx + Math.cos(a) * r * 0.78, H / 2 + Math.sin(a) * r * 0.78, r * 0.22, 0, Math.PI * 2);
        g.stroke();
      }
    }
    g.fillStyle = '#8f7246';
    g.beginPath();
    g.arc(cx, H / 2, H * 0.06, 0, Math.PI * 2);
    g.fill();
  };
  whirl(W * 0.1);
  whirl(W * 0.9);
  // Border lines.
  g.lineWidth = 8;
  g.strokeRect(4, 4, W - 8, H - 8);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Glazed grey tiles in rows, for the roof. */
function tileTextures() {
  const S = 512;
  const { c, g } = canvas(S, S);
  const h = new Float32Array(S * S);
  const n = fbm(S, 8, 3, 601);
  const img = g.createImageData(S, S);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const i = y * S + x;
      const col = Math.sin(((x % 32) / 32) * Math.PI); // round barrel tiles
      const row = ((y % 64) / 64) ** 0.6; // each course overlaps the next
      const v = 0.25 + col * 0.55 * (0.6 + row * 0.4) + n[i] * 0.15;
      img.data.set([44 * v + 26, 44 * v + 26, 50 * v + 30, 255], i * 4); // charcoal ceramic
      h[i] = col * 0.7 + row * 0.3;
    }
  g.putImageData(img, 0, 0);
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  const normal = new THREE.CanvasTexture(normalFromHeight(h, S, 3));
  normal.wrapS = normal.wrapT = THREE.RepeatWrapping;
  return { map, normal };
}

/** The roof: a long sweeping slope from the eave up to the ridge, with gilt ridge ends. */
function Roof() {
  const m = sceneMaterials();
  const geo = useMemo(() => {
    const shape = new THREE.Shape();
    // Profile in (z, y): concave curve from the eave (front) up to the ridge.
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i <= 24; i++) {
      const k = i / 24;
      const z = 3.4 - k * 6.4;
      const y = 8.35 + k * 3.6 - Math.sin(k * Math.PI) * 0.55;
      pts.push(new THREE.Vector2(z, y));
    }
    shape.moveTo(pts[0].x, pts[0].y - 0.25);
    pts.forEach((p) => shape.lineTo(p.x, p.y));
    shape.lineTo(pts[pts.length - 1].x - 1.5, pts[pts.length - 1].y);
    shape.lineTo(pts[pts.length - 1].x - 1.5, 8.2);
    shape.lineTo(pts[0].x, 8.1);
    const g = new THREE.ExtrudeGeometry(shape, { depth: 19, bevelEnabled: false, steps: 1 });
    g.translate(0, 0, -9.5);
    g.rotateY(-Math.PI / 2); // extrude along x
    return g;
  }, []);
  const tiles = useMemo(() => {
    const t = tileTextures();
    t.map.repeat.set(1.6, 1.6);
    t.normal.repeat.set(1.6, 1.6);
    // Dark fired tiles: the slope stays a deep charcoal against the sky; the moon picks out the edges.
    return new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normal, color: '#5a5a62', roughness: 0.68, metalness: 0, envMapIntensity: 0.15 });
  }, []);
  return (
    <group position={[0, 0, FRONT]}>
      <mesh geometry={geo} material={tiles} castShadow />
      {/* Ridge with gilt ornaments at both ends */}
      <mesh position={[0, 12.05, -3.2]} scale={[19.2, 0.36, 0.5]} geometry={sharedGeometry().box} material={m.darkStone} />
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 9.4, 12.5, -3.2]}>
          <mesh scale={[0.35, 0.9, 0.5]} geometry={sharedGeometry().box} material={m.gilt} />
          <mesh position={[-s * 0.25, 0.55, 0]} rotation={[0, 0, s * 0.6]}>
            <torusGeometry args={[0.32, 0.08, 10, 24, Math.PI * 1.4]} />
            <primitive object={m.gilt} attach="material" />
          </mesh>
        </group>
      ))}
      {/* A small gilt gourd (宝葫芦) at the centre of the ridge */}
      <mesh position={[0, 12.55, -3.2]} geometry={lathe([[0.001, 0], [0.16, 0.06], [0.2, 0.22], [0.1, 0.38], [0.14, 0.5], [0.09, 0.66], [0.001, 0.74]], 24)} material={m.gilt} />
    </group>
  );
}

/** Bracket sets (斗拱) between the lintel and the eave. */
function Brackets() {
  const mats = useMemo(
    () => ({
      green: new THREE.MeshStandardMaterial({ color: '#25302b', roughness: 0.76 }),
      blue: new THREE.MeshStandardMaterial({ color: '#232a30', roughness: 0.76 }),
      gilt: sceneMaterials().gilt,
    }),
    [],
  );
  const g = sharedGeometry();
  const xs = useMemo(() => Array.from({ length: 15 }, (_, i) => -6.3 + i * 0.9), []);
  return (
    <group position={[0, 0, FRONT + 1.62]}>
      {xs.map((x, i) => (
        <group key={x} position={[x, 7.95, 0]}>
          <mesh position={[0, 0.06, 0]} scale={[0.22, 0.14, 0.22]} geometry={g.box} material={mats.gilt} />
          <mesh position={[0, 0.17, 0.02]} scale={[0.62, 0.09, 0.14]} geometry={g.box} material={i % 2 ? mats.blue : mats.green} />
          {[-0.24, 0, 0.24].map((dx) => (
            <mesh key={dx} position={[dx, 0.26, 0.04]} scale={[0.12, 0.09, 0.14]} geometry={g.box} material={mats.gilt} />
          ))}
          <mesh position={[0, 0.33, 0.06]} scale={[0.82, 0.07, 0.16]} geometry={g.box} material={i % 2 ? mats.green : mats.blue} />
        </group>
      ))}
    </group>
  );
}

/** Red silk festoon (彩绸) swagged across the porch, with silk flowers. */
function Festoon() {
  const { tube, flower, mat } = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 40; i++) {
      const k = i / 40;
      const x = -2.4 + k * 4.8;
      const sag = Math.cosh((k - 0.5) * 2.2) - Math.cosh(1.1);
      pts.push(new THREE.Vector3(x, 7.25 + sag * 0.55, FRONT + 1.86));
    }
    const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, 0.07, 12, false);
    // Flower: a crumpled ball of silk.
    const flower = new THREE.IcosahedronGeometry(0.2, 3);
    const p = flower.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(p, i);
      const k = 1 + 0.18 * Math.sin(v.x * 40) * Math.sin(v.y * 37) * Math.sin(v.z * 33);
      p.setXYZ(i, v.x * k, v.y * k, v.z * k);
    }
    flower.computeVertexNormals();
    const mat = new THREE.MeshPhysicalMaterial({ color: '#5e1a18', roughness: 0.8, sheen: 0.6, sheenColor: new THREE.Color('#a8584a'), sheenRoughness: 0.5 });
    return { tube, flower, mat };
  }, []);
  return (
    <group>
      <mesh geometry={tube} material={mat} castShadow />
      {[-2.4, 0, 2.4].map((x) => (
        <mesh key={x} position={[x, x === 0 ? 6.72 : 7.25, FRONT + 1.9]} geometry={flower} material={mat} castShadow />
      ))}
      {[-2.4, 2.4].map((x) => (
        <mesh key={x} position={[x, 6.55, FRONT + 1.9]} scale={[0.09, 1.3, 0.02]} geometry={sharedGeometry().box} material={mat} />
      ))}
    </group>
  );
}

/** Painted lintel, plaque, couplets, festoon, brackets and roof on the front of the hall. */
export function Facade() {
  const beam = useMemo(() => beamTexture(), []);
  const plaque = useMemo(() => plaqueTexture(), []);
  const couplets = useMemo(() => [coupletTexture('道法自然'), coupletTexture('紫气东来')], []);
  const m = sceneMaterials();
  return (
    <group>
      {/* Painted lintel across the porch */}
      <mesh position={[0, 7.55, FRONT + 1.62]}>
        <boxGeometry args={[14.4, 0.62, 0.42]} />
        <meshStandardMaterial attach="material-0" color="#24302a" roughness={0.76} />
        <meshStandardMaterial attach="material-1" color="#24302a" roughness={0.76} />
        <meshStandardMaterial attach="material-2" color="#24302a" roughness={0.76} />
        <meshStandardMaterial attach="material-3" color="#24302a" roughness={0.76} />
        <meshStandardMaterial attach="material-4" map={beam} roughness={0.76} />
        <meshStandardMaterial attach="material-5" map={beam} roughness={0.76} />
      </mesh>
      <Brackets />
      <Roof />
      <Festoon />
      {/* Plaque over the door */}
      <group position={[0, 6.15, FRONT + 0.26]}>
        <mesh position={[0, 0, -0.04]} scale={[3.7, 1.42, 0.12]} geometry={sharedGeometry().box} material={m.darkWood} />
        <mesh position={[0, 0, 0.025]}>
          <planeGeometry args={[3.6, 1.32]} />
          <meshStandardMaterial map={plaque} roughness={0.45} metalness={0.3} emissive="#2a1c08" emissiveIntensity={0.12} envMapIntensity={0.6} />
        </mesh>
      </group>
      {/* Couplet boards on the two inner columns */}
      {[-1, 1].map((s, i) => (
        <mesh key={s} position={[s * 2.4, 3.9, FRONT + 1.81]}>
          <planeGeometry args={[0.46, 2.45]} />
          <meshStandardMaterial map={couplets[i]} roughness={0.4} metalness={0.25} />
        </mesh>
      ))}
    </group>
  );
}

// ---------------- night sky and mountains ----------------

const skyVertex = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_Position = p.xyww;
  }
`;
const skyFragment = /* glsl */ `
  uniform float uTime;
  uniform vec3 uMoon;
  uniform sampler2D uMatte;
  uniform float uHasMatte;
  // Painted night (moon and misty hills) by view direction: x yaw centre, y yaw span, z elevation
  // at the picture's foot, w elevation span (radians). Beyond the picture its edge is held (clamp).
  uniform vec4 uMatteMap;
  uniform float uMatteGain;
  varying vec3 vDir;
  float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453); }
  float noise(vec3 p) {
    vec3 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
  float fbm(vec3 p) { return noise(p) * 0.55 + noise(p * 2.1) * 0.28 + noise(p * 4.3) * 0.17; }
  void main() {
    vec3 d = normalize(vDir);
    if (uHasMatte > 0.5) {
      float yaw = atan(d.x, -d.z);
      float elev = asin(clamp(d.y, -1.0, 1.0));
      vec2 uv = vec2(0.5 + (yaw - uMatteMap.x) / uMatteMap.y, (elev - uMatteMap.z) / uMatteMap.w);
      vec3 painted = texture2D(uMatte, clamp(uv, vec2(0.001), vec2(0.999))).rgb * uMatteGain;
      gl_FragColor = linearToOutputTexel(vec4(painted, 1.0));
      return;
    }
    float h = clamp(d.y, -0.2, 1.0);
    vec3 mdir = normalize(uMoon);
    float m = dot(d, mdir);
    // Deep indigo overhead, a cooler grey-blue toward the horizon, brighter around the moon.
    vec3 zenith = vec3(0.010, 0.016, 0.050);
    vec3 horizon = vec3(0.060, 0.072, 0.115);
    vec3 col = mix(horizon, zenith, smoothstep(0.0, 0.7, h));
    col += vec3(0.05, 0.06, 0.09) * pow(max(m, 0.0), 6.0);
    // Faint warm glow near the horizon (the town below).
    col += vec3(0.07, 0.04, 0.02) * exp(-max(h, 0.0) * 10.0);
    // Stars: sparse, of different brightness, twinkling slowly; washed out near the moon.
    vec3 sp = d * 420.0;
    float s = hash(floor(sp));
    float star = smoothstep(0.9963, 1.0, s) * smoothstep(0.02, 0.3, h) * (1.0 - smoothstep(0.93, 0.995, m));
    star *= 0.6 + 0.4 * sin(uTime * (1.0 + s * 3.0) + s * 40.0);
    col += vec3(0.85, 0.88, 1.0) * star * 1.5;
    // Two cloud layers drifting at different speeds: a high thin veil and lower, darker banks.
    // Both are lit from the moon side, with silver edges where they pass close to it.
    float hi = fbm(d * vec3(5.0, 9.0, 5.0) + vec3(uTime * 0.006, 0.0, uTime * 0.002));
    float lo = fbm(d * vec3(3.0, 6.0, 3.0) + vec3(-uTime * 0.011, 3.7, 0.0));
    float near = pow(max(m, 0.0), 18.0);
    float veil = smoothstep(0.52, 0.8, hi) * smoothstep(0.05, 0.45, h);
    float bank = smoothstep(0.58, 0.82, lo) * smoothstep(0.02, 0.25, h) * (1.0 - smoothstep(0.55, 0.9, h));
    col = mix(col, vec3(0.13, 0.14, 0.19) + vec3(0.32, 0.31, 0.28) * near, veil * 0.42);
    col = mix(col, vec3(0.035, 0.04, 0.06) + vec3(0.25, 0.24, 0.21) * near * (1.0 - smoothstep(0.6, 0.82, lo)), bank * 0.75);
    // The moon: a disc with soft limb darkening and faint maria, then a close glow and a wide corona.
    float disc = smoothstep(0.99925, 0.99945, m);
    if (disc > 0.0) {
      vec3 t = normalize(cross(mdir, vec3(0.0, 1.0, 0.0)));
      vec3 b = cross(t, mdir);
      vec2 uv = vec2(dot(d, t), dot(d, b)) / 0.0335; // −1..1 across the disc
      float r = length(uv);
      float limb = 0.78 + 0.22 * sqrt(max(0.0, 1.0 - r * r));
      float maria = smoothstep(0.45, 0.75, noise(vec3(uv * 2.6, 1.7))) * 0.22 + smoothstep(0.55, 0.8, noise(vec3(uv * 6.0, 4.2))) * 0.08;
      vec3 moon = vec3(1.0, 0.95, 0.84) * limb * (1.0 - maria);
      col = mix(col, moon * 1.55, disc);
    }
    col += vec3(1.0, 0.92, 0.75) * pow(max(m, 0.0), 900.0) * 0.55;
    col += vec3(0.55, 0.55, 0.6) * pow(max(m, 0.0), 120.0) * 0.32;
    col += vec3(0.20, 0.22, 0.30) * pow(max(m, 0.0), 22.0) * 0.30;
    gl_FragColor = vec4(col, 1.0);
  }
`;

/** The painted night sky in use (moon and hills in one picture), or null while it loads or if it failed. */
const SKY_MATTE = 'moon-and-mountain-matte.webp';
const deg = (d: number) => (d * Math.PI) / 180;
/**
 * Where the picture sits in the sky: centred straight ahead (toward the hall), 36° wide and 18° high
 * (its own 2:1), its foot 16° above the horizon so the hills show over the ridge from the courtyard
 * and the moon falls high on the right of the opening view.
 */
export const SKY_MATTE_MAP = { yaw: 0, yawSpan: deg(36), foot: deg(16), span: deg(18) };

/** True once the painted sky has loaded (the procedural moon and hills then stand down). */
export function usePaintedSky() {
  const [on, setOn] = useState(() => entranceTexture(SKY_MATTE).loaded);
  useEffect(() => {
    let alive = true;
    void entranceTexture(SKY_MATTE).ready.then((ok) => alive && setOn(ok));
    return () => {
      alive = false;
    };
  }, []);
  return on;
}

export function NightSky() {
  const painted = usePaintedSky();
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uMoon: { value: new THREE.Vector3(0.2, 0.74, -1) },
          uMatte: { value: entranceTexture(SKY_MATTE).texture },
          uHasMatte: { value: 0 },
          uMatteMap: { value: new THREE.Vector4(SKY_MATTE_MAP.yaw, SKY_MATTE_MAP.yawSpan, SKY_MATTE_MAP.foot, SKY_MATTE_MAP.span) },
          uMatteGain: { value: 1 },
        },
        vertexShader: skyVertex,
        fragmentShader: skyFragment,
        side: THREE.BackSide,
        depthWrite: false,
      }),
    [],
  );
  mat.uniforms.uHasMatte.value = painted ? 1 : 0;
  const sky = useRef<THREE.Mesh>(null);
  useFrame(({ clock, camera }) => {
    mat.uniforms.uTime.value = clock.elapsedTime;
    sky.current?.position.copy(camera.position); // the sky is always centred on the eye
  });
  return (
    <mesh ref={sky} material={mat} renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[50, 48, 24]} />
    </mesh>
  );
}

const ridgeFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uMist;
  uniform float uSeed;
  uniform float uHeight;
  varying vec2 vUv;
  float hash(float x) { return fract(sin(x * 127.1 + uSeed) * 43758.5453); }
  float noise(float x) { float i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(hash(i), hash(i + 1.0), f); }
  void main() {
    float x = vUv.x * 9.0;
    float ridge = 0.45 + 0.28 * noise(x) + 0.14 * noise(x * 2.3) + 0.06 * noise(x * 6.1);
    ridge *= uHeight;
    if (vUv.y > ridge) discard;
    // Darker at the crest, melting into mist toward the foot.
    float depth = clamp((ridge - vUv.y) / ridge, 0.0, 1.0);
    vec3 col = mix(uColor, uMist, smoothstep(0.25, 1.0, depth));
    gl_FragColor = vec4(col, 1.0);
  }
`;

/** Layered mountain ridges behind the hall, fading into mist (only while the painted sky is absent). */
export function Mountains() {
  const painted = usePaintedSky();
  const layers = useMemo(
    () =>
      [
        { z: -44, w: 160, h: 46, y: 12, color: '#2a3040', mist: '#3e4556', seed: 1.3, height: 0.92 },
        { z: -34, w: 140, h: 34, y: 7, color: '#1c212b', mist: '#323846', seed: 4.7, height: 0.85 },
        { z: -26, w: 120, h: 22, y: 3, color: '#12151c', mist: '#272b35', seed: 8.1, height: 0.8 },
      ].map((l) => ({
        ...l,
        mat: new THREE.ShaderMaterial({
          uniforms: { uColor: { value: new THREE.Color(l.color) }, uMist: { value: new THREE.Color(l.mist) }, uSeed: { value: l.seed }, uHeight: { value: l.height } },
          vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
          fragmentShader: ridgeFragment,
        }),
      })),
    [],
  );
  return (
    <group visible={!painted}>
      {layers.map((l) => (
        <mesh key={l.z} position={[0, l.y + l.h / 2, l.z]} material={l.mat}>
          <planeGeometry args={[l.w, l.h]} />
        </mesh>
      ))}
    </group>
  );
}

// ---------------- courtyard ----------------

function StoneLantern({ position }: { position: [number, number, number] }) {
  const m = sceneMaterials();
  const glow = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffd28a', toneMapped: false }), []);
  // A soft warm halo around the window, so the lanterns read as lit from across the courtyard.
  const halo = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d')!;
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, 'rgba(255, 200, 120, 0.9)');
    r.addColorStop(0.35, 'rgba(255, 170, 80, 0.35)');
    r.addColorStop(1, 'rgba(255, 150, 60, 0)');
    g.fillStyle = r;
    g.fillRect(0, 0, 64, 64);
    return new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, opacity: 0.8 });
  }, []);
  const base = useMemo(() => lathe([[0.001, 0], [0.42, 0], [0.42, 0.12], [0.26, 0.2], [0.16, 0.24], [0.13, 1.1], [0.22, 1.16], [0.32, 1.2], [0.001, 1.2]], 8), []);
  const roof = useMemo(() => lathe([[0.001, 0], [0.55, 0], [0.5, 0.08], [0.3, 0.22], [0.08, 0.38], [0.06, 0.52], [0.001, 0.56]], 6), []);
  return (
    <group position={position}>
      <mesh geometry={base} material={m.darkStone} castShadow />
      <mesh position={[0, 1.42, 0]} scale={[0.5, 0.44, 0.5]} geometry={sharedGeometry().box} material={m.darkStone} />
      {/* Light through the window, front and back */}
      <mesh position={[0, 1.42, 0.252]} scale={[0.22, 0.24, 1]} material={glow}>
        <planeGeometry args={[1, 1]} />
      </mesh>
      <mesh position={[0, 1.42, -0.252]} rotation={[0, Math.PI, 0]} scale={[0.22, 0.24, 1]} material={glow}>
        <planeGeometry args={[1, 1]} />
      </mesh>
      <mesh position={[0, 1.64, 0]} geometry={roof} material={m.darkStone} castShadow />
      <sprite position={[0, 1.42, 0.3]} scale={[1.1, 1.1, 1]} material={halo} />
    </group>
  );
}

/** Large bronze censer in the courtyard with a thick column of smoke. */
function CourtyardCenser({ position }: { position: [number, number, number] }) {
  const m = sceneMaterials();
  const smokeRef = useRef<THREE.ShaderMaterial>(null);
  const geo = useMemo(() => {
    const n = 140;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute('aSeed', new THREE.Float32BufferAttribute(Float32Array.from({ length: n }, (_, i) => (i * 0.618034) % 1), 1));
    return g;
  }, []);
  const bowl = useMemo(() => lathe([[0.001, 0], [0.5, 0], [0.75, 0.12], [0.9, 0.4], [0.92, 0.62], [1.0, 0.7], [0.88, 0.7], [0.001, 0.66]], 48), []);
  const fill = useMemo(() => {
    const rnd = (k: number) => ((Math.sin(k * 91.3 + 7.7) * 43758.5453) % 1 + 1) % 1;
    const n = 220;
    const sticks = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 5), sceneMaterials().stick, n);
    const embers = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4), new THREE.MeshBasicMaterial({ color: '#b8521f' }), n);
    const o = new THREE.Object3D();
    for (let i = 0; i < n; i++) {
      const a = rnd(i) * Math.PI * 2;
      const r = Math.sqrt(rnd(i + 300)) * 0.82;
      const len = 0.15 + rnd(i + 600) * 0.35;
      o.position.set(Math.cos(a) * r, 1.3 + len / 2, Math.sin(a) * r);
      o.rotation.set((rnd(i + 900) - 0.5) * 0.25, 0, (rnd(i + 1200) - 0.5) * 0.25);
      o.scale.set(0.006, len, 0.006);
      o.updateMatrix();
      sticks.setMatrixAt(i, o.matrix);
      const tip = new THREE.Vector3(0, 0.5, 0).applyMatrix4(o.matrix);
      o.position.copy(tip);
      o.rotation.set(0, 0, 0);
      o.scale.setScalar(0.009);
      o.updateMatrix();
      embers.setMatrixAt(i, o.matrix);
    }
    const ash = new THREE.MeshStandardMaterial({ color: '#5d5852', roughness: 1 });
    return { sticks, embers, ash };
  }, []);
  const stand = useMemo(() => lathe([[0.001, 0], [1.2, 0], [1.2, 0.1], [1.0, 0.2], [0.9, 0.62], [1.05, 0.7], [0.001, 0.7]], 8), []);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uMap: { value: sceneMaterials().textures.smoke }, uPixel: { value: 900 } },
        vertexShader: /* glsl */ `
          uniform float uTime; uniform float uPixel; attribute float aSeed; varying float vA;
          void main() {
            float life = 10.0;
            float age = mod(uTime + aSeed * life, life) / life;
            vec3 p = position + vec3(sin(aSeed * 40.0) * 0.4, age * 4.2, cos(aSeed * 31.0) * 0.4);
            p.x += sin(age * 3.0 + aSeed * 9.0 + uTime * 0.2) * 0.8 * age;
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_Position = projectionMatrix * mv;
            gl_PointSize = (0.2 + age * 2.4) * uPixel / -mv.z;
            vA = smoothstep(0.0, 0.08, age) * (1.0 - age) * (1.0 - age) * 0.11;
          }`,
        fragmentShader: /* glsl */ `
          uniform sampler2D uMap; varying float vA;
          void main() { vec4 t = texture2D(uMap, gl_PointCoord); gl_FragColor = vec4(vec3(0.78, 0.78, 0.8), t.a * vA); }`,
        transparent: true,
        depthWrite: false,
      }),
    [],
  );
  useFrame((state) => {
    mat.uniforms.uTime.value = state.clock.elapsedTime;
    const fov = (state.camera as THREE.PerspectiveCamera).fov ?? 50;
    mat.uniforms.uPixel.value = (state.size.height * state.viewport.dpr) / (2 * Math.tan((fov * Math.PI) / 360));
  });
  useEffect(() => {
    smokeRef.current = mat;
  }, [mat]);
  return (
    <group position={position}>
      <mesh geometry={stand} material={m.darkStone} castShadow receiveShadow />
      <mesh position={[0, 0.7, 0]} geometry={bowl} material={m.bronze} castShadow />
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.95, 1.45, Math.sin(a) * 0.95]} rotation={[0, -a, 0]}>
            <torusGeometry args={[0.16, 0.035, 8, 20]} />
            <primitive object={m.bronze} attach="material" />
          </mesh>
        );
      })}
      {/* Ash, a crowd of burning sticks and glowing embers */}
      <mesh position={[0, 1.3, 0]} rotation={[-Math.PI / 2, 0, 0]} material={fill.ash}>
        <circleGeometry args={[0.9, 48]} />
      </mesh>
      <primitive object={fill.sticks} />
      <primitive object={fill.embers} />
      <points position={[0, 1.4, 0]} geometry={geo} material={mat} frustumCulled={false} />
      <pointLight position={[0, 1.6, 0]} color="#ff9a4a" intensity={2.2} distance={5} decay={1.6} />
    </group>
  );
}

/** A soft wash of moon- and lantern-light on the front of the hall (a cone, so the interior is unaffected). */
function FacadeLight() {
  const target = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(0, 5.5, FRONT);
    return o;
  }, []);
  // The moon sits behind and to the right: its light grazes the ridge and the eave edges.
  const ridge = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(0, 10.5, FRONT + 1);
    return o;
  }, []);
  return (
    <>
      <primitive object={target} />
      <primitive object={ridge} />
      {/* Moonlight from high on the right: cool edges on the roof, the eaves and the step nosings. */}
      <spotLight position={[18, 22, FRONT - 1.2]} target={ridge} angle={0.55} penumbra={0.9} intensity={70} distance={60} decay={1.3} color="#a9b2cc" />
      {/* Warm lantern wash low on the doors and the paving. */}
      <spotLight position={[0, 1.4, FRONT + 8]} target={target} angle={0.45} penumbra={0.85} intensity={75} distance={16} decay={1.5} color="#ffb874" />
    </>
  );
}

/** Courtyard beyond the steps: stone ground, lanterns and the censer. */
export function Courtyard() {
  const m = sceneMaterials();
  const paving = useMemo(() => tiledPlane(60, 30), []);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, FRONT + 18]} material={m.floor} geometry={paving} receiveShadow />
      <CourtyardCenser position={[0, 0, FRONT + 11.5]} />
      {[-1, 1].map((s) => (
        <group key={s}>
          <StoneLantern position={[s * 3.8, 0, FRONT + 5.5]} />
          <StoneLantern position={[s * 3.8, 0, FRONT + 10]} />
        </group>
      ))}
      <FacadeLight />
      {/* Lantern light pooling on the paving, fading with distance. */}
      <pointLight position={[-3.8, 1.5, FRONT + 7.5]} color="#ffb367" intensity={4} distance={9} decay={1.6} />
      <pointLight position={[3.8, 1.5, FRONT + 7.5]} color="#ffb367" intensity={4} distance={9} decay={1.6} />
    </group>
  );
}
