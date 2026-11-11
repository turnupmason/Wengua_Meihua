/**
 * Procedural textures without a frozen start: a texture set is handed out at once with tiny
 * placeholder images in its base colour, and its real maps are built in a worker and swapped in
 * when they arrive. Where a worker cannot build them (no module workers or OffscreenCanvas), they
 * are built on the page one per task, so no single frame takes all of them.
 */
import * as THREE from 'three';
import { runRecipe, type Raster, type RasterSet, type RecipeName } from './texgen';

export interface TextureSet { map: THREE.Texture; normalMap: THREE.Texture; roughnessMap: THREE.Texture }

type Job = { recipe: RecipeName; args: unknown[]; done: (set: RasterSet) => void };

let worker: Worker | null | undefined;
let nextId = 1;
const waiting = new Map<number, Job>();
const local: Job[] = [];
let localTimer = 0;
let pending = 0;
let idleWaiters: (() => void)[] = [];

function getWorker(): Worker | null {
  if (worker !== undefined) return worker;
  try {
    worker = new Worker(new URL('./texWorker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<{ id: number; set?: RasterSet; error?: string }>) => {
      const job = waiting.get(e.data.id);
      if (!job) return;
      waiting.delete(e.data.id);
      if (e.data.set) finish(job, e.data.set);
      else runLocally(job);
    };
    worker.onerror = () => {
      // The worker could not start: build everything still waiting on the page instead.
      worker?.terminate();
      worker = null;
      const jobs = [...waiting.values()];
      waiting.clear();
      jobs.forEach(runLocally);
    };
  } catch {
    worker = null;
  }
  return worker;
}

function runLocally(job: Job) {
  local.push(job);
  if (!localTimer) localTimer = window.setTimeout(drainOne, 0);
}

function drainOne() {
  localTimer = 0;
  const job = local.shift();
  if (!job) return;
  try {
    finish(job, runRecipe(job.recipe, job.args));
  } catch {
    finish(job, null);
  }
  if (local.length) localTimer = window.setTimeout(drainOne, 0);
}

function finish(job: Job, set: RasterSet | null) {
  if (set) job.done(set);
  pending -= 1;
  if (pending === 0) {
    const w = idleWaiters;
    idleWaiters = [];
    w.forEach((f) => f());
  }
}

function request(recipe: RecipeName, args: unknown[], done: (set: RasterSet) => void) {
  pending += 1;
  const job: Job = { recipe, args, done };
  const w = getWorker();
  if (w) {
    const id = nextId++;
    waiting.set(id, job);
    w.postMessage({ id, recipe, args });
  } else runLocally(job);
}

/** Resolves once every texture asked for so far has its real maps. */
export function texturesIdle(): Promise<void> {
  return pending === 0 ? Promise.resolve() : new Promise((r) => idleWaiters.push(r));
}

function placeholder(css: string) {
  const c = document.createElement('canvas');
  c.width = c.height = 2;
  const g = c.getContext('2d');
  if (g) {
    g.fillStyle = css;
    g.fillRect(0, 0, 2, 2);
  }
  return c;
}

function texture(css: string, repeat: [number, number], color: boolean) {
  const t = new THREE.CanvasTexture(placeholder(css));
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat);
  t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = 4;
  return t;
}

function swapIn(t: THREE.Texture, r: Raster) {
  const c = document.createElement('canvas');
  c.width = r.w;
  c.height = r.h;
  c.getContext('2d')?.putImageData(new ImageData(r.data as Uint8ClampedArray<ArrayBuffer>, r.w, r.h), 0, 0);
  // The GPU copy was sized for the placeholder: free it so the next upload allocates afresh.
  t.dispose();
  t.image = c;
  t.needsUpdate = true;
}

/**
 * A texture set built by `recipe`, usable at once. `look` is the placeholder colour (CSS) until
 * the real map arrives; normals start flat and roughness at `rough`.
 */
export function procSet(recipe: RecipeName, args: unknown[], repeat: [number, number], look: string, rough = 0.7): TextureSet {
  const v = Math.round(rough * 255);
  const set: TextureSet = {
    map: texture(look, repeat, true),
    normalMap: texture('rgb(128,128,255)', repeat, false),
    roughnessMap: texture(`rgb(${v},${v},${v})`, repeat, false),
  };
  request(recipe, args, (r) => {
    swapIn(set.map, r.map);
    swapIn(set.normalMap, r.normalMap);
    swapIn(set.roughnessMap, r.roughnessMap);
  });
  return set;
}
