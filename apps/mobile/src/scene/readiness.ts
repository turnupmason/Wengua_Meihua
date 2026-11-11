/**
 * When the 3D temple is ready to be seen: shaders compiled and the generated textures in place.
 * The title screen keeps its painted backdrop until then, so the switch to the live gate is a
 * calm cross-fade instead of a freeze. (No three.js here, so the title screen stays light.)
 */
let ready = false;
const subscribers = new Set<() => void>();

export function markSceneReady() {
  if (ready) return;
  ready = true;
  subscribers.forEach((f) => f());
  subscribers.clear();
}

export function isSceneReady() {
  return ready;
}

/** Calls `f` once the scene is ready (at once if it already is); returns an unsubscribe. */
export function onSceneReady(f: () => void): () => void {
  if (ready) {
    f();
    return () => {};
  }
  subscribers.add(f);
  return () => subscribers.delete(f);
}
