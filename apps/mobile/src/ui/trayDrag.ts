/**
 * The 问事 tray can be pulled down (and back up) by its head, to see more of the hall: it stays
 * wherever it is let go, between fully open and folded down to its head, and is kept on the device.
 * A tap on the head folds or unfolds it; arrow keys move it. It moves by the CSS `translate`
 * property (from --tray-y), so it does not fight the tray's rising animation (`transform`).
 */
import { useCallback, useEffect, useRef, type KeyboardEvent, type PointerEvent, type RefObject } from 'react';

const KEY = 'wengua.trayOffset.v1';
/** What stays on screen when folded: the grip and the 「问何事」 line. */
const HEAD = 64;
const TAP = 5;

let offset = (() => {
  try {
    const v = Number(localStorage.getItem(KEY));
    return Number.isFinite(v) && v > 0 ? v : 0;
  } catch {
    return 0;
  }
})();

function remember(v: number) {
  offset = v;
  try {
    localStorage.setItem(KEY, String(Math.round(v)));
  } catch {
    /* kept for this session */
  }
}

export function useTrayDrag(panel: RefObject<HTMLElement | null>) {
  const drag = useRef<{ id: number; from: number; start: number; moved: boolean } | null>(null);
  const maxDown = () => Math.max(0, (panel.current?.offsetHeight ?? 0) - HEAD);
  const place = useCallback(
    (y: number, settle = false) => {
      const el = panel.current;
      if (!el) return 0;
      const v = Math.min(maxDown(), Math.max(0, y));
      el.classList.toggle('is-settling', settle);
      if (v) el.style.setProperty('--tray-y', `${v}px`);
      else el.style.removeProperty('--tray-y');
      return v;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [panel],
  );
  // Where it was left last time (re-clamped to this screen).
  useEffect(() => {
    place(offset);
  }, [place]);

  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id: e.pointerId, from: e.clientY, start: offset, moved: false };
  };
  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dy = e.clientY - d.from;
    if (Math.abs(dy) > TAP) d.moved = true;
    if (d.moved) offset = place(d.start + dy);
  };
  const onPointerUp = (e: PointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    // A tap folds an open tray, or opens a folded or lowered one.
    remember(d.moved ? offset : place(offset > TAP ? 0 : maxDown(), true));
  };
  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    const step = e.key === 'ArrowDown' ? 40 : e.key === 'ArrowUp' ? -40 : 0;
    if (step) {
      e.preventDefault();
      remember(place(offset + step, true));
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      remember(place(offset > TAP ? 0 : maxDown(), true));
    }
  };
  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp, onKeyDown };
}
