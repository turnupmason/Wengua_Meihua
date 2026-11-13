/**
 * The painted walk-in's pictures (public/art/entrance, built by scripts/build-entrance-plates.py
 * from docs/art-reference/sanqing-entrance): fetched and decoded once at start-up, so the courtyard
 * is on screen before the title is. If any fails, the walk-in falls back to the 3D courtyard.
 */
import { useEffect, useState } from 'react';

export const WALK_IN_FILES = {
  courtyard: 'plate-courtyard.webp',
  threshold: 'plate-threshold.webp',
  hall: 'plate-hall.webp',
  wisp: 'incense-wisp.webp',
  table: 'plate-table.webp',
  // The clouds the 三清 sit on (scripts/build-hall-clouds.py).
  cloudL: 'cloud-yuanshi-l.webp',
  cloudR: 'cloud-yuanshi-r.webp',
} as const;
export const walkInUrl = (file: string) => `${import.meta.env.BASE_URL}art/entrance/${file}`;

let ready = false;
let loading: Promise<boolean> | null = null;

/** The three original portraits, seated in the painted hall (and on the 3D altar). */
export const PORTRAITS = ['art/sanqing-laojun.webp', 'art/sanqing-yuanshi.webp', 'art/sanqing-lingbao.webp'] as const;

function load(url: string) {
  return new Promise<void>((resolve, reject) => {
    const img = new Image();
    img.onload = () => (img.decode ? img.decode().then(() => resolve(), () => resolve()) : resolve());
    img.onerror = () => reject(new Error(`walk-in art missing: ${url}`));
    img.src = url;
  });
}

/** Starts (once) loading the pictures; resolves true when all are decoded. */
export function preloadWalkInArt(): Promise<boolean> {
  if (typeof Image === 'undefined' || typeof document === 'undefined') return Promise.resolve(false);
  const urls = [...Object.values(WALK_IN_FILES).map(walkInUrl), ...PORTRAITS.map((p) => `${import.meta.env.BASE_URL}${p}`)];
  loading ??= Promise.all(urls.map(load)).then(
    () => (ready = true),
    () => false,
  );
  return loading;
}

export const walkInArtReady = () => ready;

/** Re-renders once the pictures are ready. */
export function useWalkInArt() {
  const [on, setOn] = useState(ready);
  useEffect(() => {
    let alive = true;
    void preloadWalkInArt().then((ok) => alive && setOn(ok));
    return () => {
      alive = false;
    };
  }, []);
  return on;
}

/** 藏经阁 and 问事录 pictures: loaded on their own, so a missing one only keeps that place in 3D. */
export const PLACE_FILES = { library: 'place-library.webp', records: 'place-records.webp' } as const;
let placesReady = false;
let placesLoading: Promise<boolean> | null = null;
export function preloadPlaceArt(): Promise<boolean> {
  if (typeof Image === 'undefined' || typeof document === 'undefined') return Promise.resolve(false);
  placesLoading ??= Promise.all(Object.values(PLACE_FILES).map((f) => load(walkInUrl(f)))).then(
    () => (placesReady = true),
    () => false,
  );
  return placesLoading;
}
export function usePlaceArt() {
  const [on, setOn] = useState(placesReady);
  useEffect(() => {
    let alive = true;
    void preloadPlaceArt().then((ok) => alive && setOn(ok));
    return () => {
      alive = false;
    };
  }, []);
  return on;
}
