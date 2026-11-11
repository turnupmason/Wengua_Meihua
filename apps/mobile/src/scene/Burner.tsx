/**
 * Bronze incense tripod (香炉 / 鼎): octagonal stone pedestal, three hoofed legs, a cast bowl
 * with a thunder-scroll (雷纹) band and green patina, a heavy lip and two upright handles.
 * Inside: grey, uneven ash bristling with the red stubs (香脚) of countless earlier offerings.
 */
import { useMemo } from 'react';
import * as THREE from 'three';
import { fbm, lathe, normalFromHeight, sceneMaterials } from './materials';
import { WORLD } from './timeline';

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return { c, g: c.getContext('2d', { willReadFrequently: true })! };
}

/** Bronze with a cast 雷纹 band (square spirals) and patina, plus its relief normal map. */
function bronzeRelief() {
  const W = 1024;
  const H = 256;
  const { c, g } = canvas(W, H);
  const { g: hg } = canvas(W, H);
  const n = fbm(256, 6, 4, 301);
  // Base bronze with mottled patina.
  const img = g.createImageData(W, H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const v = n[(y % 256) * 256 + (x % 256)];
      const patina = Math.max(0, v - 0.55) * 2.4;
      const i = (y * W + x) * 4;
      img.data[i] = 112 * (1 - patina) + 60 * patina;
      img.data[i + 1] = 86 * (1 - patina) + 112 * patina;
      img.data[i + 2] = 50 * (1 - patina) + 86 * patina;
      img.data[i + 3] = 255;
    }
  g.putImageData(img, 0, 0);
  hg.fillStyle = '#808080';
  hg.fillRect(0, 0, W, H);
  // Raised band in the middle third with square-spiral 雷纹 and borders.
  const band = (ctx: CanvasRenderingContext2D, color: string, lw: number) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.strokeRect(-10, H * 0.3, W + 20, H * 0.4);
    const cell = H * 0.32;
    for (let x = 0; x < W; x += cell) {
      const cx = x + cell / 2;
      const cy = H / 2;
      ctx.beginPath();
      let r = cell * 0.42;
      let px = cx - r;
      let py = cy - r;
      ctx.moveTo(px, py);
      for (let k = 0; k < 7; k++) {
        const dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]];
        const [dx, dy] = dirs[k % 4];
        const len = r * 2 - (k >= 2 ? Math.floor((k - 2) / 2 + 1) * cell * 0.14 : 0);
        px += dx * len;
        py += dy * len;
        ctx.lineTo(px, py);
        if (k % 2 === 1) r -= cell * 0.07;
      }
      ctx.stroke();
    }
  };
  band(g, 'rgba(40, 30, 18, 0.65)', 5);
  band(hg, '#ffffff', 7);
  const hd = hg.getImageData(0, 0, W, H).data;
  const height = new Float32Array(256 * 256);
  // Resample the band height into the 256² field used by the normal generator.
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) height[y * 256 + x] = hd[((y * H / 256) | 0) * W * 4 + ((x * W / 256) | 0) * 4] / 255 * 0.8 + n[y * 256 + x] * 0.2;
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(3, 1);
  const normal = new THREE.CanvasTexture(normalFromHeight(height, 256, 2.4));
  normal.wrapS = normal.wrapT = THREE.RepeatWrapping;
  normal.repeat.set(3, 1);
  return new THREE.MeshStandardMaterial({ map, normalMap: normal, metalness: 0.8, roughness: 0.45 });
}

/** Grey ash with darker specks and charred bits. */
function ashMaterial() {
  const S = 256;
  const n = fbm(S, 8, 4, 401);
  const fine = fbm(S, 64, 2, 402);
  const { c, g } = canvas(S, S);
  const img = g.createImageData(S, S);
  for (let i = 0; i < S * S; i++) {
    const v = 150 + n[i] * 60 - (fine[i] > 0.8 ? 70 : 0);
    img.data.set([v * 0.98, v * 0.96, v * 0.92, 255], i * 4);
  }
  g.putImageData(img, 0, 0);
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  const normal = new THREE.CanvasTexture(normalFromHeight(n.map((v, i) => v * 0.6 + fine[i] * 0.4), S, 3));
  return new THREE.MeshStandardMaterial({ map, normalMap: normal, roughness: 1, metalness: 0, color: '#c9c6c0' });
}

/** Ash surface: a gently mounded disc. */
function ashGeometry(radius: number) {
  const ring = new THREE.RingGeometry(0.001, radius, 64, 18);
  ring.rotateX(-Math.PI / 2);
  const pos = ring.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const r = Math.hypot(x, z) / radius;
    const h = 0.012 * Math.sin(x * 23 + z * 7) * Math.cos(z * 19) + 0.018 * (1 - r * r);
    pos.setY(i, h);
  }
  ring.computeVertexNormals();
  return ring;
}

export function Burner({ shadows }: { shadows: boolean }) {
  const m = sceneMaterials();
  const parts = useMemo(() => {
    const bronze = bronzeRelief();
    const ash = ashMaterial();
    const stub = new THREE.MeshStandardMaterial({ color: '#a3261c', roughness: 0.7 });
    // 香脚: hundreds of red stubs.
    const count = 170;
    const stubs = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 5), stub, count);
    const o = new THREE.Object3D();
    const color = new THREE.Color();
    const rnd = (k: number) => ((Math.sin(k * 91.7 + 3.1) * 43758.5453) % 1 + 1) % 1;
    let placed = 0;
    for (let k = 0; placed < count && k < count * 4; k++) {
      const a = rnd(k) * Math.PI * 2;
      const r = Math.sqrt(rnd(k + 1000)) * 0.44;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const h = 0.006 + rnd(k + 2000) ** 2 * 0.03;
      o.position.set(x, 0.01 + h / 2, z);
      o.rotation.set((rnd(k + 3000) - 0.5) * 0.4, 0, (rnd(k + 4000) - 0.5) * 0.4);
      o.scale.set(0.0016, h, 0.0016);
      o.updateMatrix();
      stubs.setMatrixAt(placed, o.matrix);
      stubs.setColorAt(placed, color.setHSL(0.0, 0.55, 0.14 + rnd(k + 5000) * 0.12));
      placed++;
    }
    stubs.count = placed;
    const bowl = lathe([[0.001, 0], [0.3, 0], [0.42, 0.05], [0.52, 0.16], [0.56, 0.28], [0.58, 0.33], [0.6, 0.35], [0.6, 0.37], [0.54, 0.37], [0.53, 0.34], [0.001, 0.34]], 64);
    const pedestal = lathe([[0.001, 0], [0.7, 0], [0.7, 0.06], [0.64, 0.09], [0.58, 0.12], [0.55, 0.3], [0.6, 0.34], [0.66, 0.38], [0.66, 0.42], [0.001, 0.42]], 8);
    const leg = lathe([[0.001, 0], [0.07, 0], [0.075, 0.03], [0.05, 0.06], [0.038, 0.12], [0.042, 0.2], [0.055, 0.26], [0.001, 0.27]], 16);
    const handle = (() => {
      const s = new THREE.Shape();
      s.moveTo(-0.11, 0);
      s.lineTo(-0.11, 0.17);
      s.quadraticCurveTo(-0.11, 0.21, -0.07, 0.21);
      s.lineTo(0.07, 0.21);
      s.quadraticCurveTo(0.11, 0.21, 0.11, 0.17);
      s.lineTo(0.11, 0);
      s.lineTo(0.08, 0);
      s.lineTo(0.08, 0.17);
      s.lineTo(-0.08, 0.17);
      s.lineTo(-0.08, 0);
      s.closePath();
      return new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 2 });
    })();
    return { bronze, ash, stubs, bowl, pedestal, leg, handle, ashGeo: ashGeometry(0.5) };
  }, []);
  const [x, , z] = WORLD.burner;
  const bowlY = WORLD.burnerTopY - 0.37;
  return (
    <group position={[x, 0, z]}>
      <mesh geometry={parts.pedestal} material={m.darkStone} castShadow={shadows} receiveShadow />
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2 + Math.PI / 2;
        return <mesh key={i} position={[Math.cos(a) * 0.3, 0.42, Math.sin(a) * 0.3]} geometry={parts.leg} material={parts.bronze} castShadow={shadows} />;
      })}
      <mesh position={[0, bowlY, 0]} geometry={parts.bowl} material={parts.bronze} castShadow={shadows} />
      <mesh position={[0, WORLD.burnerTopY - 0.025, 0]} geometry={parts.ashGeo} material={parts.ash} receiveShadow />
      <primitive object={parts.stubs} position={[0, WORLD.burnerTopY - 0.02, 0]} />
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.5, WORLD.burnerTopY, -0.015]} rotation={[0, Math.PI / 2, 0]} geometry={parts.handle} material={parts.bronze} />
      ))}
    </group>
  );
}
