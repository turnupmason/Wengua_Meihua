/**
 * Static batching: once its children are built, every static, opaque mesh that shares a material
 * is merged into one mesh (world transforms baked in), and the originals are hidden. The hall is
 * hundreds of boxes and cylinders in a dozen materials; on a phone each draw call costs CPU time,
 * so 265 calls become about a dozen. Anything that moves must sit under a group with
 * `userData.dynamic = true`; instanced, skinned, transparent and multi-material meshes are left as
 * they are.
 */
import { useLayoutEffect, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Swaps the 2nd and 3rd vertex of every triangle (non-indexed geometry). */
function flipWinding(g: THREE.BufferGeometry) {
  for (const attr of Object.values(g.attributes) as THREE.BufferAttribute[]) {
    const a = attr.array as Float32Array;
    const n = attr.itemSize;
    for (let t = 0; t + 2 < attr.count; t += 3)
      for (let k = 0; k < n; k++) {
        const i1 = (t + 1) * n + k;
        const i2 = (t + 2) * n + k;
        const tmp = a[i1];
        a[i1] = a[i2];
        a[i2] = tmp;
      }
    attr.needsUpdate = true;
  }
}

export function batchStatic(root: THREE.Object3D): { merged: THREE.Mesh[]; hidden: THREE.Mesh[] } {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const groups = new Map<string, { material: THREE.Material; meshes: THREE.Mesh[] }>();
  const visit = (o: THREE.Object3D) => {
    if (o.userData.dynamic || !o.visible) return;
    const m = o as THREE.Mesh;
    if (m.isMesh && !(m as THREE.InstancedMesh).isInstancedMesh && !(m as THREE.SkinnedMesh).isSkinnedMesh && !Array.isArray(m.material)) {
      const mat = m.material as THREE.Material;
      const geo = m.geometry;
      if (!mat.transparent && mat.visible && !geo.morphAttributes.position && geo.attributes.position) {
        const attrs = Object.keys(geo.attributes).sort().join(',');
        const key = `${mat.uuid}|${attrs}|${m.castShadow ? 1 : 0}${m.receiveShadow ? 1 : 0}`;
        const gEntry = groups.get(key) ?? { material: mat, meshes: [] };
        gEntry.meshes.push(m);
        groups.set(key, gEntry);
      }
    }
    for (const c of o.children) visit(c);
  };
  visit(root);
  const merged: THREE.Mesh[] = [];
  const hidden: THREE.Mesh[] = [];
  for (const { material, meshes } of groups.values()) {
    if (meshes.length < 2) continue;
    const parts = meshes.map((m) => {
      let g = m.geometry.clone();
      if (g.index) g = g.toNonIndexed();
      const mtx = new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld);
      g.applyMatrix4(mtx);
      if (mtx.determinant() < 0) flipWinding(g);
      return g;
    });
    const geometry = mergeGeometries(parts, false);
    parts.forEach((p) => p.dispose());
    if (!geometry) continue;
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = meshes[0].castShadow;
    mesh.receiveShadow = meshes[0].receiveShadow;
    mesh.name = 'static-batch';
    root.add(mesh);
    merged.push(mesh);
    for (const m of meshes) {
      m.visible = false;
      m.userData.batched = true;
      hidden.push(m);
    }
  }
  return { merged, hidden };
}

export function StaticBatch({ children }: { children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const { merged, hidden } = batchStatic(root);
    return () => {
      for (const m of merged) {
        root.remove(m);
        m.geometry.dispose();
      }
      for (const m of hidden) {
        m.visible = true;
        delete m.userData.batched;
      }
    };
  }, []);
  return <group ref={ref}>{children}</group>;
}
