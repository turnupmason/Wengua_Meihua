/**
 * 网页版 (2026-11-17): on a wide screen in a browser the same app is laid out for the desk — a top
 * bar instead of the tab bar, 问事 as three columns, the 卦笺 with 象 on the left and 解 on the right
 * (desktop.css, body.desktop). Phones, narrow windows and the iOS app keep the phone layout.
 */
import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { PAPER } from './paper';

export const DESKTOP_QUERY = '(min-width: 1024px)';

const native = () => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

export function isDesktop(): boolean {
  if (!PAPER || native() || typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia(DESKTOP_QUERY).matches;
}

/** True on a wide browser window; follows the window as it is resized. */
export function useDesktop(): boolean {
  const [on, setOn] = useState(isDesktop);
  useEffect(() => {
    if (!PAPER || native() || !window.matchMedia) return;
    const mq = window.matchMedia(DESKTOP_QUERY);
    const update = () => setOn(mq.matches);
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);
  return on;
}
