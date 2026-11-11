/// <reference lib="webworker" />
/** Builds procedural texture rasters off the main thread (see texgen.ts and texQueue.ts). */
import { runRecipe, type RecipeName } from './texgen';

self.onmessage = (e: MessageEvent<{ id: number; recipe: RecipeName; args: unknown[] }>) => {
  const { id, recipe, args } = e.data;
  try {
    const set = runRecipe(recipe, args);
    const buffers = [set.map, set.normalMap, set.roughnessMap].map((r) => r.data.buffer as ArrayBuffer);
    // The roughness raster may be shared with another map in the same set; transfer each buffer once.
    (self as unknown as DedicatedWorkerGlobalScope).postMessage({ id, set }, [...new Set(buffers)]);
  } catch (err) {
    (self as unknown as DedicatedWorkerGlobalScope).postMessage({ id, error: String(err) });
  }
};
