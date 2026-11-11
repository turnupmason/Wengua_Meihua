import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { batchStatic } from '../src/scene/StaticBatch';

describe('static batching', () => {
  it('merges static opaque meshes per material and leaves moving, see-through and instanced ones alone', () => {
    const root = new THREE.Group();
    const box = new THREE.BoxGeometry(1, 1, 1);
    const wood = new THREE.MeshStandardMaterial();
    const gold = new THREE.MeshStandardMaterial();
    const glass = new THREE.MeshBasicMaterial({ transparent: true });
    for (let i = 0; i < 3; i++) {
      const m = new THREE.Mesh(box, wood);
      m.position.set(i, 0, 0);
      root.add(m);
    }
    root.add(new THREE.Mesh(box, gold), new THREE.Mesh(box, gold));
    root.add(new THREE.Mesh(box, glass), new THREE.Mesh(box, glass));
    const door = new THREE.Group();
    door.userData.dynamic = true;
    door.add(new THREE.Mesh(box, wood));
    root.add(door, new THREE.InstancedMesh(box, wood, 4));
    const { merged, hidden } = batchStatic(root);
    expect(merged).toHaveLength(2); // wood ×3, gold ×2
    expect(hidden).toHaveLength(5);
    expect(door.children[0].visible).toBe(true);
    // 3 boxes × 36 vertices once de-indexed.
    expect(merged.find((m) => m.material === wood)!.geometry.attributes.position.count).toBe(108);
  });

  it('keeps mirrored parts facing outward', () => {
    const root = new THREE.Group();
    const geo = new THREE.PlaneGeometry(1, 1);
    const mat = new THREE.MeshStandardMaterial();
    const a = new THREE.Mesh(geo, mat);
    const b = new THREE.Mesh(geo, mat);
    b.scale.set(-1, 1, 1);
    root.add(a, b);
    const { merged } = batchStatic(root);
    const p = merged[0].geometry.attributes.position;
    const tri = (o: number) => {
      const v = [0, 1, 2].map((k) => new THREE.Vector3().fromBufferAttribute(p, o + k));
      return new THREE.Vector3().crossVectors(v[1].clone().sub(v[0]), v[2].clone().sub(v[0])).z;
    };
    // Both copies still face +z.
    expect(tri(0)).toBeGreaterThan(0);
    expect(tri(6)).toBeGreaterThan(0);
  });
});
