/**
 * Where the visitor stands in the hall (问事香案 / 藏经阁 / 问事录), outside React state so that
 * switching places re-renders only what shows the place (tabs, panels) — never the whole app or
 * the 3D tree. The camera reads the same value every frame through sceneInsets.
 */
import { useSyncExternalStore } from 'react';
import { sceneInsets } from '../scene/insets';
import type { Place } from '../scene/placeLayout';

const listeners = new Set<() => void>();

export const placeStore = {
  get: (): Place => sceneInsets.place,
  set(p: Place) {
    if (sceneInsets.place === p) return;
    sceneInsets.place = p;
    listeners.forEach((l) => l());
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => void listeners.delete(l);
  },
};

export const usePlace = () => useSyncExternalStore(placeStore.subscribe, placeStore.get, placeStore.get);
