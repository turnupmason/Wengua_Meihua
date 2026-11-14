/**
 * 摇签起卦: hold the phone like a 签筒, think of the matter and shake; when the shaking stops, the
 * hexagram is cast for that moment by 年月日时 (the same time cast as 诚心起卦, only the moment is
 * the visitor's own). Where the phone gives no motion (a computer, or motion not allowed), three
 * taps on the 签筒 do the same.
 */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Strings } from '../domain/i18n';

// The user's 签筒 and 签 (docs/art-reference/shake), layered: the whole 筒 behind, the 签 rising out of
// its opening, and the 筒 with its opening cut away in front (scripts/build-shake-art.py).
const ART = `${import.meta.env.BASE_URL}art/ritual/`;
/** The 筒 is drawn TONG_W wide; its opening (from the build script, at 210 px) scaled to it. */
const TONG_W = 100;
const K = TONG_W / 210;
const TONG_H = 384.5 * K;
const OPEN = { cx: 104.8 * K, cy: 14.9 * K, rx: 96 * K, ry: 12.5 * K };
const SLIP = { w: 22 * K, h: 380 * K };
/** How far the sticks rise above the rim. */
const HEAD = 72;
/** Eleven 签: across the opening (-1…1) and front to back (-1 back … 1 front), each standing up by its own amount. */
const SLIPS = [
  [-0.7, -0.55, 70], [-0.36, -0.75, 88], [0.02, -0.7, 94], [0.4, -0.72, 80], [0.74, -0.5, 66],
  [-0.52, 0.2, 60], [-0.12, 0.1, 84], [0.28, 0.25, 74],
  [0.06, 0.7, 64],
].map(([x, z, up]) => ({ x, z, up }))
  .sort((a, b) => a.z - b.z);
/** The one that comes up when the 签 falls: front and middle. */
const DRAWN = SLIPS.findIndex((q) => q.x === -0.12);

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

/** The 签意 in one line: the poem's first couplet (卦中爻象犯小耗，君子占之运不高。). */
export function firstLine(poem: string): string {
  const parts = poem.split(/[，。；]/).filter(Boolean);
  return parts.length > 2 ? `${parts[0]}，${parts[1]}。` : poem;
}

/** The slip that fell: the 本卦 the 祖师 granted, with its standing (上上卦 … 下下卦). */
export interface Bestowal {
  name: string;
  grade: string;
  theme: string;
  poem: string;
}

export function ShakeCast({ t, open, question = '', when = '', bestow = null, leaving = false, onClose, onCast, onContinue, onHaptic, onBestow }: {
  t: Strings;
  open: boolean;
  /** What is being asked (求职录用), and the hour it will be cast in, shown at the top. */
  question?: string;
  when?: string;
  /** Given once the cast is made: the slip is then shown. */
  bestow?: Bestowal | null;
  /** On the way to the stone: the page fades out over it. */
  leaving?: boolean;
  onClose: () => void;
  /** The shaking has stopped: cast now, at this moment. */
  onCast: () => void;
  /** 请看石案 */
  onContinue: () => void;
  onHaptic: (ms: number | number[]) => void;
  /** The slip is shown (a 磬 sounds). */
  onBestow?: () => void;
}) {
  const [shaking, setShaking] = useState(false);
  const [taps, setTaps] = useState(0);
  // A tap gives the 筒 one slow swing.
  const [swing, setSwing] = useState(0);
  const [done, setDone] = useState(false);
  // The drawn slip has fallen out of the 筒: the bestowal may show.
  const [risen, setRisen] = useState(false);
  const finish = useRef(() => {});
  finish.current = () => {
    if (done) return;
    setDone(true);
    onHaptic([24, 60, 24]);
    // The moment the shaking stopped is the moment cast; the slip rises, then is shown.
    onCast();
    // The slip falls out (1.5 s) and lies a moment before it is held up.
    window.setTimeout(() => setRisen(true), 2100);
  };
  const shown = risen && !!bestow;
  useEffect(() => {
    if (shown) onBestow?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown]);
  const shakingRef = useRef(setShaking);
  const onShaking = useRef((on: boolean) => {
    shakingRef.current(on);
    if (on) onHaptic(10);
  }).current;
  const onDone = useRef(() => finish.current()).current;
  useShake(open && !done, onShaking, onDone);
  // Before the 三清: the hall stays in view behind the 签筒; the tray and bars step aside.
  useEffect(() => {
    if (!open) return;
    document.body.classList.add('shrine-open');
    return () => document.body.classList.remove('shrine-open');
  }, [open]);
  useEffect(() => {
    if (!open) {
      setTaps(0);
      setDone(false);
      setRisen(false);
      setShaking(false);
    }
  }, [open]);
  if (!open) return null;
  // Before the 三清 (the painted hall shows through above): the matter, the 签筒 at the altar, and the
  // three 戒 beneath it.
  return createPortal(
    <div className={`shake-page ${shown ? 'is-bestowed' : ''} ${leaving ? 'is-leaving' : ''}`} role="dialog" aria-modal="true" aria-label={t.shakeTitle}>
      <header className="shake-head">
        <button type="button" className="icon-btn" onClick={onClose} aria-label={t.back} disabled={done}>
          ←
        </button>
        <h2>{t.shakeTitle}</h2>
        <span />
      </header>
      <section className="shake-cast">
        {question && (
          <p className="shake-asked">
            <small>{t.askedMatter}</small>
            <b>{question}</b>
            {when && <span>{when}</span>}
          </p>
        )}
        <button
          type="button"
          className={`qian-tong ${(shaking || swing) && !done ? 'is-shaking' : ''} ${done ? 'is-done' : ''}`}
          aria-label={t.shakeTap}
          onClick={() => {
            if (done) return;
            onHaptic(10);
            const n = taps + 1;
            setTaps(n);
            setSwing((k) => k + 1);
            window.setTimeout(() => setSwing((k) => Math.max(0, k - 1)), 560);
            if (n >= 3) finish.current();
          }}
        >
          <span className="tong-stage" style={{ width: TONG_W, height: HEAD + TONG_H }}>
            <img className="tong-back" src={`${ART}shake-holder.webp`} alt="" draggable={false} style={{ top: HEAD, width: TONG_W, height: TONG_H }} />
            {SLIPS.map((q, i) => {
              const x = OPEN.cx + q.x * OPEN.rx * 0.84 - SLIP.w / 2;
              const rim = HEAD + OPEN.cy + q.z * OPEN.ry * 0.8;
              return (
                <img
                  key={i}
                  className={`qian${done && i === DRAWN ? ' is-out' : ''}`}
                  src={`${ART}shake-slip.webp`}
                  alt=""
                  draggable={false}
                  style={{
                    left: x,
                    top: rim - q.up,
                    width: SLIP.w,
                    height: SLIP.h,
                    transformOrigin: `50% ${q.up}px`,
                    // Fanned a little outward; the back ones a touch darker.
                    ['--tilt' as string]: `${q.x * 9}deg`,
                    ['--i' as string]: i,
                    filter: `brightness(${0.78 + (q.z + 1) * 0.12})`,
                  }}
                />
              );
            })}
            <img className="tong-front" src={`${ART}shake-holder-front.webp`} alt="" draggable={false} style={{ top: HEAD, width: TONG_W, height: TONG_H }} />
          </span>
        </button>
        <p className="shake-say" role="status">{done ? t.shakeDone : t.shakeSay}</p>
        <ol className="shake-precepts" aria-label={t.preceptsTitle}>
          {t.precepts.map((p) => (
            <li key={p} lang="zh">{p}</li>
          ))}
        </ol>
        <p className="shake-hint">{t.shakeTapHint}</p>
      </section>
      {/* 祖师赐卦, a step in the rite (not a page of results): what was asked, the slip — its standing and
          the hexagram — one short line of what it says, and on to the stone to hear the 断语. */}
      {shown && bestow && (
        <section className="bestow" aria-live="polite">
          {question && (
            <p className="bestow-asked">
              <small>{t.askedMatter}</small>
              <b>{question}</b>
            </p>
          )}
          {/* The slip, what it says and the way on, as one column. */}
          <div className="bestow-main">
          <div className="bestow-slip" aria-label={`${t.bestowed} ${bestow.grade} ${bestow.name}`}>
            <span className="slip-grade">{bestow.grade}</span>
            <span className="slip-name">{bestow.name}</span>
            <i className="slip-seal" aria-hidden="true">{t.slipSeal}</i>
          </div>
          <div className="bestow-words">
            {bestow.theme && <p className="bestow-theme">{bestow.theme}</p>}
            {bestow.poem && <p className="bestow-poem" lang="zh">{firstLine(bestow.poem)}</p>}
          </div>
          <button type="button" className="bestow-go" onClick={onContinue}>
            {t.bestowGo}
          </button>
          </div>
        </section>
      )}
    </div>,
    document.body,
  );
}
