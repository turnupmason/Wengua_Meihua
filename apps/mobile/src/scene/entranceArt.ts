/**
 * Painted art for the walk-in (docs/art-reference/sanqing-entrance, copied to public/art/entrance):
 * loaded once from the app's own files (BASE_URL, so it works under a sub-path and inside the
 * Capacitor shell) and shared by every mesh that uses it. A file that fails to load leaves the
 * procedural look in place: callers keep their own material until `ready` says the image is there.
 */
import * as THREE from 'three';

export interface EntranceTexture {
  texture: THREE.Texture;
  /** Resolves true once the image is on the texture, false if it could not be loaded. */
  ready: Promise<boolean>;
  loaded: boolean;
}

const cache = new Map<string, EntranceTexture>();

/** `name` is the path under art/entrance/; `color` false for masks and data (NoColorSpace). */
export function entranceTexture(name: string, opts: { color?: boolean; wrap?: THREE.Wrapping; anisotropy?: number } = {}): EntranceTexture {
  const key = `${name}|${opts.color ?? true}|${opts.wrap ?? THREE.ClampToEdgeWrapping}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const texture = new THREE.Texture();
  texture.colorSpace = opts.color === false ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = opts.wrap ?? THREE.ClampToEdgeWrapping;
  texture.anisotropy = opts.anisotropy ?? 4;
  const entry: EntranceTexture = { texture, loaded: false, ready: Promise.resolve(false) };
  entry.ready = new Promise<boolean>((resolve) => {
    if (typeof Image === 'undefined') return resolve(false);
    new THREE.ImageLoader().load(
      `${import.meta.env.BASE_URL}art/entrance/${name}`,
      (image) => {
        texture.image = image;
        texture.needsUpdate = true;
        entry.loaded = true;
        resolve(true);
      },
      undefined,
      () => resolve(false),
    );
  });
  cache.set(key, entry);
  return entry;
}
