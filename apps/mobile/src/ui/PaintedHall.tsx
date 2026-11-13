/**
 * The hall where the visitor stands at home, painted (docs/art-reference/sanqing-entrance,
 * keyframes/03-hall-lighting): the artist's dark wooden hall with its warm lamplight and bronze
 * censer, the 「三清殿」 plaque on the wall, and the three original portraits on the three seats —
 * 太上老君 on the viewer's left, 元始天尊 in the middle, a little higher and further back, 灵宝天尊
 * on the right. Contact shadows and a touch of the hall's warm light settle them into the picture.
 * The 3D hall takes over (cross-fade) once the visitor walks to the stone table or to another place.
 */
import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import { WALK_IN_FILES, walkInUrl } from './walkInArt';
import type { RitualClock } from './useRitualClock';
import { phaseDuration } from '../domain/ritual';
import { bestowalTimes } from '../scene/carving';
import { easeInOut, span } from '../scene/timeline';

/** Picture proportions and where the 三清 sit in it (fractions of the picture). */
const ASPECT = 941 / 1672;
/** The seats' top: where the figures rest. */
const SEAT_LINE = 0.472;
/** From the highest crown to the seats. */
const FIGURES = 0.205;
/** Distance of the outer figures' edges from the picture's side. */
const SIDE_MARGIN = 0.089;
/**
 * Height of the 问事 tray as it first rises (before a question adds its line): the hall is framed by
 * it once, on arrival, and then never moves — choosing a question, pulling the tray down or its
 * rising never shift the picture. It is measured on the device, per screen width, for next time;
 * until then it is estimated (its usual height plus the phone's bottom safe area).
 */
const TRAY_KEY = 'wengua.trayHeight.v2';
const TRAY_BASE = 440;
function storedTrays(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(TRAY_KEY) || '{}') as Record<string, number>;
  } catch {
    return {};
  }
}
function safeBottom() {
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;left:0;bottom:0;width:0;height:env(safe-area-inset-bottom,0px);visibility:hidden;pointer-events:none';
  document.body.appendChild(probe);
  const h = probe.offsetHeight;
  probe.remove();
  return h;
}
function expectedTray(W: number) {
  const v = storedTrays()[String(Math.round(W))];
  return v > 200 && v < 900 ? v : TRAY_BASE + safeBottom();
}
/** Notes the tray's first height for this screen width (only while no question line is shown). */
function noteTray(W: number) {
  const panel = document.querySelector<HTMLElement>('.home-panel');
  if (!panel?.offsetHeight || panel.querySelector('.chosen-question')) return;
  const all = storedTrays();
  const key = String(Math.round(W));
  if (all[key] === panel.offsetHeight) return;
  all[key] = panel.offsetHeight;
  try {
    localStorage.setItem(TRAY_KEY, JSON.stringify(all));
  } catch {
    /* estimated again next time */
  }
}

const topOf = (el: HTMLElement) => {
  let y = 0;
  for (let e: HTMLElement | null = el; e; e = e.offsetParent as HTMLElement | null) y += e.offsetTop;
  return y;
};

/**
 * Frames the picture for the screen: the figures, crown to seat, fit between the top bar and the
 * 问事 tray, seated just above the tray's edge; the outer figures keep room at the screen's sides.
 */
function frame(plate: HTMLElement, root: HTMLElement, trayHeight: number) {
  const W = root.clientWidth;
  const H = root.clientHeight;
  if (!W || !H) return;
  const header = document.querySelector<HTMLElement>('.temple-top');
  const tray = Math.max(H * 0.25, H - trayHeight);
  const bar = header?.offsetHeight ? topOf(header) + header.offsetHeight : 64;
  const room = Math.max(80, tray - bar - 10);
  const sideMax = (W / 2 - 8) / (0.5 - SIDE_MARGIN);
  const fitMax = (room / FIGURES) * ASPECT;
  const pw = Math.max(W, Math.min(sideMax, fitMax, W * 1.3));
  const ph = pw / ASPECT;
  const top = Math.min(0, tray - 6 - SEAT_LINE * ph);
  Object.assign(plate.style, { width: `${pw}px`, height: `${ph}px`, left: `${(W - pw) / 2}px`, top: `${top}px`, transform: 'none' });
}

/** Seats in the 941×1672 picture: left %, top %, width % (each portrait's foot on its seat's top). */
const SEATS = [
  { key: 'yuanshi', file: 'art/sanqing-yuanshi.webp', left: 37.4, top: 27.3, width: 25.5, shadowTop: 46.2, glowY: 34.9 },
  { key: 'laojun', file: 'art/sanqing-laojun.webp', left: 8.9, top: 30.9, width: 22.8, shadowTop: 47.6, glowY: 37.7 },
  { key: 'lingbao', file: 'art/sanqing-lingbao.webp', left: 68.8, top: 31.4, width: 22.8, shadowTop: 47.6, glowY: 38.0 },
] as const;
/** Hanging lanterns (x, y, size as fractions of the width) and the censer's mouth. */
const LAMPS = [
  [0.138, 0.145, 0.12],
  [0.882, 0.145, 0.12],
] as const;
/** Where the incense sticks' tips are in the hall picture: the smoke rises from here. */
const CENSER = [0.495, 0.568] as const;
/** The pearl in 元始天尊's hands, in the hall picture (his portrait: 511/1005, 564/1337): the push's focus. */
const PEARL = [0.5037, 0.3535] as const;

/**
 * During the ritual the hall stays painted: the walk toward the 三清, sitting down and looking up
 * are one slow push into the picture toward 元始天尊. 祖师赐卦 is said over the painting as it is —
 * nothing is drawn on it — and then the painting gives way to the stone table, where 石桌显卦.
 * Same clock as the ritual; values only (no React renders per frame).
 */
function ritualFrame(phase: string, t: number, reduced: boolean) {
  // One continuous push from the 三清 as a group to 元始天尊 (same focal point throughout, so the
  // picture never jumps): the walk, sitting down and looking up are all in the painting; only when
  // the light reaches the stone table does the 3D table take over.
  const walk = phaseDuration('entering', reduced);
  const b = bestowalTimes(reduced);
  const s = phase === 'entering' ? t : walk + t;
  const end = walk + b.orbArrive;
  const zoom = 1 + 0.38 * easeInOut(span(s, [0, end]));
  if (phase === 'entering') return { opacity: 1, zoom, focus: PEARL };
  return { opacity: 1 - easeInOut(span(t, [b.orbArrive - 0.05, b.orbArrive + 0.7])), zoom, focus: PEARL };
}

/** How long before the hand-over to the stone table the 3D view starts drawing again (settles its framing). */
const RESUME_AHEAD = 0.9;

export function PaintedHall({ shown, still, phase = 'idle', clock, onCover }: { shown: boolean; still: boolean; phase?: string; clock?: MutableRefObject<RitualClock>; onCover?: (covering: boolean) => void }) {
  const cover = useRef(onCover);
  cover.current = onCover;
  const base = import.meta.env.BASE_URL;
  const root = useRef<HTMLDivElement>(null);
  const plate = useRef<HTMLDivElement>(null);
  // Back from the stone table (or a ritual cut short): the painting covers the screen at once,
  // coming up out of the dark, so the 3D hall is never seen behind it (no second 三清 flashing by).
  const [prevPhase, setPrevPhase] = useState(phase);
  const [returning, setReturning] = useState(false);
  if (phase !== prevPhase) {
    setPrevPhase(phase);
    setReturning(phase === 'idle' && prevPhase !== 'idle');
  }
  useEffect(() => {
    if (!returning) return;
    const id = window.setTimeout(() => setReturning(false), 800);
    return () => window.clearTimeout(id);
  }, [returning]);
  useEffect(() => {
    const r = root.current;
    const p = plate.current;
    if (!r || !p) return;
    if (!clock || (phase !== 'entering' && phase !== 'revealing')) {
      cover.current?.(false);
      // Back to home: the picture's own framing and the class-driven fade.
      r.style.opacity = '';
      r.style.transition = '';
      p.style.transform = 'none';
      return;
    }
    let raf = 0;
    let covering: boolean | null = null;
    const tick = () => {
      const t = clock.current.t;
      const f = ritualFrame(phase, t, still);
      // While the painting fully covers the screen the 3D view rests; it resumes a moment before
      // the hand-over to the stone table, so it is drawn and settled when it shows.
      const now = phase === 'entering' || (f.opacity >= 0.999 && t < bestowalTimes(still).orbArrive - RESUME_AHEAD);
      if (now !== covering) {
        covering = now;
        cover.current?.(now);
      }
      r.style.transition = 'none';
      r.style.opacity = f.opacity.toFixed(3);
      p.style.transformOrigin = `${f.focus[0] * 100}% ${f.focus[1] * 100}%`;
      p.style.transform = `scale(${f.zoom.toFixed(4)})`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      cover.current?.(false);
    };
  }, [phase, clock, still]);
  useEffect(() => {
    // Framed once for this screen size, and again only if the screen itself changes (rotation).
    let size = '';
    const fit = () => {
      const r = root.current;
      if (!r || !plate.current) return;
      const now = `${r.clientWidth}x${r.clientHeight}`;
      if (now === size) return;
      size = now;
      frame(plate.current, r, expectedTray(r.clientWidth));
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
  useEffect(() => {
    if (!shown) return;
    // Learn the tray's real height on this device, for the next visit (the picture stays put now).
    const id = window.setInterval(() => root.current && noteTray(root.current.clientWidth), 1000);
    return () => window.clearInterval(id);
  }, [shown]);
  return (
    <div ref={root} className={`painted-hall ${shown ? 'is-on' : ''} ${shown && returning ? 'is-return' : ''} ${still ? 'is-still' : ''}`} aria-hidden="true">
      <div ref={plate} className="walkin-plate hall-plate" style={{ backgroundImage: `url(${walkInUrl(WALK_IN_FILES.hall)})` }}>
        {LAMPS.map(([x, y, w], i) => (
          <i key={i} className="walkin-lamp" style={{ left: `${x * 100}%`, top: `${y * 100}%`, width: `${w * 100}%`, animationDelay: `${-i * 1.1}s` }} />
        ))}
        {/* A soft light behind each of the 三清, breathing slowly. */}
        {SEATS.map((s, i) => (
          <i key={`glow-${s.key}`} className="hall-glow" style={{ left: `${s.left + s.width / 2}%`, top: `${s.glowY}%`, width: `${s.width * 1.55}%`, animationDelay: `${-i * 2.1}s` }} />
        ))}
        {SEATS.map((s) => (
          <i key={`shadow-${s.key}`} className="hall-shadow" style={{ left: `${s.left - 1}%`, top: `${s.shadowTop}%`, width: `${s.width + 2}%` }} />
        ))}
        {SEATS.map((s) => (
          <img key={s.key} className={`hall-figure is-${s.key}`} src={`${base}${s.file}`} alt="" style={{ left: `${s.left}%`, top: `${s.top}%`, width: `${s.width}%` }} />
        ))}
        {/* The incense: the sticks' tips glow, and smoke rises, sways and thins over the painted wisp. */}
        <i className="hall-embers" style={{ left: `${CENSER[0] * 100}%`, top: `${CENSER[1] * 100}%` }} />
        {[0, 1, 2].map((i) => (
          <img key={i} className={`hall-smoke is-${i}`} src={walkInUrl(WALK_IN_FILES.wisp)} alt="" style={{ left: `${(CENSER[0] + (i - 1) * 0.012) * 100}%`, top: `${CENSER[1] * 100}%` }} />
        ))}
      </div>
    </div>
  );
}

/** 藏经阁 and 问事录, painted (4:3 pictures): a lantern each, and the desk's small censer. */
const PLACES = {
  library: { file: 'place-library.webp', lamps: [[0.125, 0.175, 0.1]], smoke: null },
  records: { file: 'place-records.webp', lamps: [[0.153, 0.265, 0.11]], smoke: [0.225, 0.54] },
} as const;
export type PaintedPlaceKey = keyof typeof PLACES;
const PLACE_ASPECT = 4 / 3;

/**
 * Frames a place's picture above its panel: from the top of the screen to a little below the
 * panel's edge, cropped at the sides as needed (never narrower than the screen).
 */
function framePlace(plate: HTMLElement, root: HTMLElement, panelFraction: number) {
  const W = root.clientWidth;
  const H = root.clientHeight;
  if (!W || !H) return;
  const ph = Math.max(W / PLACE_ASPECT, H * (1 - panelFraction) + 24);
  const pw = ph * PLACE_ASPECT;
  Object.assign(plate.style, { width: `${pw}px`, height: `${ph}px`, left: `${(W - pw) / 2}px`, top: '0px', transform: 'none' });
}

export function PaintedPlace({ place, shown, still, panelFraction }: { place: PaintedPlaceKey; shown: boolean; still: boolean; panelFraction: number }) {
  const root = useRef<HTMLDivElement>(null);
  const plate = useRef<HTMLDivElement>(null);
  const p = PLACES[place];
  useEffect(() => {
    const fit = () => root.current && plate.current && framePlace(plate.current, root.current, panelFraction);
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [panelFraction]);
  return (
    <div ref={root} className={`painted-hall is-place ${shown ? 'is-on' : ''} ${still ? 'is-still' : ''}`} aria-hidden="true">
      <div ref={plate} className="walkin-plate place-plate" style={{ backgroundImage: `url(${walkInUrl(p.file)})` }}>
        {p.lamps.map(([x, y, w], i) => (
          <i key={i} className="walkin-lamp" style={{ left: `${x * 100}%`, top: `${y * 100}%`, width: `${w * 100}%` }} />
        ))}
        {p.smoke &&
          [0, 1].map((i) => (
            <img key={i} className="walkin-smoke is-desk" src={walkInUrl(WALK_IN_FILES.wisp)} alt="" style={{ left: `${p.smoke[0] * 100}%`, top: `${p.smoke[1] * 100}%`, animationDelay: `${-i * 4.5}s` }} />
          ))}
      </div>
    </div>
  );
}
