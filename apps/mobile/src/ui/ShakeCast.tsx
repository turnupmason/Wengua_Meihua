/**
 * 摇签起卦: hold the phone like a 签筒, think of the matter and shake; when the shaking stops, the
 * hexagram is cast for that moment by 年月日时 (the same time cast as 诚心起卦, only the moment is
 * the visitor's own). Where the phone gives no motion (a computer, or motion not allowed), three
 * taps on the 签筒 do the same.
 */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Strings } from '../domain/i18n';

const holderArt = `${import.meta.env.BASE_URL}art/ritual/shake-holder.webp`;
const slipArt = `${import.meta.env.BASE_URL}art/ritual/shake-slip.webp`;
const SLIPS = [25, 32, 40, 47.5, 55, 63, 70];

/** Shaking: movement above this (m/s², gravity removed); still: below it for STILL_MS. */
const SHAKE = 11;
const SHAKE_MS = 700;
const STILL_MS = 450;

type MotionPermission = { requestPermission?: () => Promise<'granted' | 'denied'> };

/** iOS asks for motion access, and only from a tap: call this in the tap that opens the 签筒. */
export async function askMotion(): Promise<boolean> {
  try {
    const M = (globalThis as unknown as { DeviceMotionEvent?: MotionPermission }).DeviceMotionEvent;
    if (!M) return false;
    if (typeof M.requestPermission === 'function') return (await M.requestPermission()) === 'granted';
    return true;
  } catch {
    return false;
  }
}

/** Calls `onDone` once a shake (long enough) has come to rest; reports whether it is shaking now. */
function useShake(active: boolean, onShaking: (on: boolean) => void, onDone: () => void) {
  const state = useRef({ start: 0, last: 0, prev: null as null | { x: number; y: number; z: number } });
  useEffect(() => {
    if (!active) return;
    let timer = 0;
    const s = state.current;
    s.start = 0;
    s.prev = null;
    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.acceleration;
      let m = 0;
      if (a && a.x != null && a.y != null && a.z != null) m = Math.hypot(a.x, a.y, a.z);
      else {
        const g = e.accelerationIncludingGravity;
        if (!g || g.x == null || g.y == null || g.z == null) return;
        const p = s.prev;
        s.prev = { x: g.x, y: g.y, z: g.z };
        if (!p) return;
        m = Math.hypot(g.x - p.x, g.y - p.y, g.z - p.z) * 1.6;
      }
      const now = performance.now();
      if (m < SHAKE) return;
      if (!s.start) {
        s.start = now;
        onShaking(true);
      }
      s.last = now;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const long = s.last - s.start >= SHAKE_MS;
        s.start = 0;
        onShaking(false);
        if (long) onDone();
      }, STILL_MS);
    };
    window.addEventListener('devicemotion', onMotion);
    return () => {
      window.removeEventListener('devicemotion', onMotion);
      window.clearTimeout(timer);
    };
  }, [active, onShaking, onDone]);
}

export function ShakeCast({ t, open, onClose, onCast, onHaptic }: { t: Strings; open: boolean; onClose: () => void; onCast: () => void; onHaptic: (ms: number | number[]) => void }) {
  const [shaking, setShaking] = useState(false);
  const [taps, setTaps] = useState(0);
  const [done, setDone] = useState(false);
  const finish = useRef(() => {});
  finish.current = () => {
    if (done) return;
    setDone(true);
    onHaptic([24, 60, 24]);
    // The moment the shaking stopped is the moment cast; the slip falls, then the hall takes over.
    window.setTimeout(() => {
      onClose();
      onCast();
    }, 650);
  };
  const shakingRef = useRef(setShaking);
  const onShaking = useRef((on: boolean) => {
    shakingRef.current(on);
    if (on) onHaptic(10);
  }).current;
  const onDone = useRef(() => finish.current()).current;
  useShake(open && !done, onShaking, onDone);
  useEffect(() => {
    if (!open) {
      setTaps(0);
      setDone(false);
      setShaking(false);
    }
  }, [open]);
  if (!open) return null;
  return createPortal(
    <div className="sheet-backdrop shake-backdrop" onClick={onClose}>
      <section className="shake-cast" role="dialog" aria-modal="true" aria-label={t.shakeTitle} onClick={(e) => e.stopPropagation()}>
        <h2>{t.shakeTitle}</h2>
        <p className="shake-say">{done ? t.shakeDone : t.shakeSay}</p>
        <button
          type="button"
          className={`qian-tong ${shaking || taps % 2 === 1 ? 'is-shaking' : ''} ${done ? 'is-done' : ''}`}
          aria-label={t.shakeTap}
          onClick={() => {
            if (done) return;
            onHaptic(10);
            const n = taps + 1;
            setTaps(n);
            if (n >= 3) finish.current();
          }}
        >
          <img className="tong-body" src={holderArt} alt="" draggable={false} />
          {SLIPS.map((left, i) => (
            <img
              key={left}
              className={`qian${done && i === 3 ? ' is-out' : ''}`}
              src={slipArt}
              alt=""
              draggable={false}
              style={{ left: `${left}%`, top: `${7 + (i % 3) * 4}%`, ['--i' as string]: i }}
            />
          ))}
          <img className="tong-lip" src={holderArt} alt="" draggable={false} />
          <span className="tong-word" aria-hidden="true">签</span>
        </button>
        <p className="shake-hint">{t.shakeTapHint}</p>
        <button type="button" className="text-btn" onClick={onClose}>
          {t.shakeCancel}
        </button>
      </section>
    </div>,
    document.body,
  );
}
