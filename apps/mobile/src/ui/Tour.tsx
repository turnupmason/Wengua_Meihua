/**
 * 新手引导 (2026-11-14, third pass): an arrow takes the newcomer through the real screens, one step
 * at a time — the hall (方面 → 具体的事 → 起卦方法 → 起卦), then the stone (三卦, 体用, 卦名, 等级,
 * 断语). The rest of the screen dims, the thing in question is lit, and a black-and-gold card says
 * what it is. Steps that ask for a tap wait for it; the others have 上一步 / 下一步. Skippable; 设置 ·
 * 重看新手引导 starts it again. Kept on the device only.
 */
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import type { Strings } from '../domain/i18n';

export type TourStepId =
  | 'domain' | 'entry' | 'chosen' | 'method' | 'cast'
  | 'stone' | 'primary' | 'mutual' | 'changed' | 'role' | 'relation' | 'name' | 'grade' | 'verdict';

interface Step {
  id: TourStepId;
  /** What to light: every match of these selectors, as one box. */
  anchor: string[];
  /** When the first anchor is not there (another drawer opened, say), light this instead. */
  fallback?: string;
  /** A step done by tapping: it moves on when this selector appears (or the home tray goes). */
  until?: string | (() => boolean);
  /** Shown only once this is on screen (the stone steps wait for the reading). */
  when?: string;
  /** The first step of a part: 上一步 does not go back across it. */
  starts?: boolean;
}

const band = (s: string) => [`.band-${s} .ptab-tablet`, `.band-${s} .ptab-line`, `.band-${s} .ptab-name`];

export const TOUR: readonly Step[] = [
  { id: 'domain', anchor: ['.home-panel [data-tour="career"]'], until: '.ask-sheet', starts: true },
  { id: 'entry', anchor: ['.ask-sheet [data-tour="career.interview"]'], fallback: '.ask-sheet .subtype-grid', until: '.home-panel .chosen-question' },
  { id: 'chosen', anchor: ['.home-panel .chosen-question'] },
  { id: 'method', anchor: ['.home-panel .method-line'] },
  // Moves on when a cast is made (tour.cast(), from the app), by either button.
  { id: 'cast', anchor: ['.home-panel .enter-row'], until: () => false },
  { id: 'stone', anchor: ['.painted-table .ptab-face'], when: '.view-judgment', starts: true },
  { id: 'primary', anchor: band('primary'), when: '.view-judgment' },
  { id: 'mutual', anchor: band('mutual'), when: '.view-judgment' },
  { id: 'changed', anchor: band('changed'), when: '.view-judgment' },
  { id: 'role', anchor: ['.painted-table .ptab-role'], when: '.view-judgment' },
  { id: 'relation', anchor: ['.painted-table .ptab-relation'], when: '.view-judgment' },
  { id: 'name', anchor: ['.band-primary .ptab-name'], when: '.view-judgment' },
  { id: 'grade', anchor: ['.band-primary .ptab-grade', '.band-mutual .ptab-grade', '.band-changed .ptab-grade'], when: '.view-judgment' },
  { id: 'verdict', anchor: ['.view-judgment'], when: '.view-judgment' },
];

const KEY = 'wengua.tour.v1';
type State = { step: number; done: boolean };
const listeners = new Set<() => void>();
function load(): State {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null') as State | null;
    if (v && Number.isInteger(v.step)) return { step: Math.max(0, Math.min(TOUR.length - 1, v.step)), done: !!v.done };
  } catch {
    /* fresh */
  }
  return { step: 0, done: false };
}
let state = load();
function save(next: State) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* this session only */
  }
  listeners.forEach((l) => l());
}

export const tour = {
  go: (step: number) => save(step >= TOUR.length ? { step: TOUR.length - 1, done: true } : { step: Math.max(0, step), done: false }),
  next: () => tour.go(state.step + 1),
  prev: () => tour.go(state.step - 1),
  end: () => save({ ...state, done: true }),
  /** A cast was made: the 起卦 step is done. */
  cast: () => {
    if (!state.done && TOUR[state.step]?.id === 'cast') tour.next();
  },
  /** 重看新手引导 */
  reset: () => save({ step: 0, done: false }),
  active: () => !state.done,
  subscribe: (l: () => void) => {
    listeners.add(l);
    return () => void listeners.delete(l);
  },
  snapshot: () => state,
};

type Rect = { left: number; top: number; width: number; height: number };

/** One box around every match of the anchors, if any is on screen and on top. */
function lit(step: Step): Rect | null {
  const pick = (sels: string[]) => sels.flatMap((s) => [...document.querySelectorAll<HTMLElement>(s)]);
  let els = pick(step.anchor);
  if (!els.length && step.fallback) els = pick([step.fallback]);
  const rects = els.map((e) => e.getBoundingClientRect()).filter((r) => r.width > 2 && r.height > 2);
  if (!rects.length) return null;
  const left = Math.min(...rects.map((r) => r.left));
  const top = Math.min(...rects.map((r) => r.top));
  const right = Math.max(...rects.map((r) => r.right));
  const bottom = Math.max(...rects.map((r) => r.bottom));
  // What it lights must be what is on top there (not under a sheet or another page).
  const cx = (left + right) / 2;
  const cy = (top + bottom) / 2;
  const under = document.elementsFromPoint?.(cx, cy).find((e) => !e.closest('.tour-layer'));
  if (under && !els.some((e) => e.contains(under) || under.contains(e))) return null;
  if (bottom < 0 || top > window.innerHeight) return null;
  return { left, top, width: right - left, height: bottom - top };
}

const PAD = 8;
const same = (a: Rect, b: Rect) => Math.abs(a.left - b.left) < 1.5 && Math.abs(a.top - b.top) < 1.5 && Math.abs(a.width - b.width) < 1.5 && Math.abs(a.height - b.height) < 1.5;

export function Tour({ t }: { t: Strings }) {
  const s = useSyncExternalStore(tour.subscribe, tour.snapshot, tour.snapshot);
  const step = TOUR[s.step];
  const [box, setBox] = useState<Rect | null>(null);
  const card = useRef<HTMLDivElement>(null);
  const [cardH, setCardH] = useState(200);
  const seen = useRef<Rect | null>(null);

  // Follow the lit thing (trays rise, sheets slide), and move on when a tap-step is done.
  useEffect(() => {
    if (s.done || !step) return;
    const at = s.step;
    const tick = () => {
      // A timer left over from a step already passed does nothing (it would skip the next one).
      if (tour.snapshot().step !== at || tour.snapshot().done) return;
      if (step.until) {
        const doneNow = typeof step.until === 'string' ? !!document.querySelector(step.until) : step.until();
        if (doneNow) return tour.next();
      }
      const ready = !step.when || !!document.querySelector(step.when);
      const r = ready ? lit(step) : null;
      // Shown only once the thing has stopped moving (trays rise, sheets slide in).
      const p = seen.current;
      seen.current = r;
      const still = !!r && !!p && same(p, r);
      setBox((b) => (!r ? null : !still ? (b && same(b, r) ? b : null) : b && same(b, r) ? b : r));
    };
    seen.current = null;
    tick();
    const id = window.setInterval(tick, 120);
    window.addEventListener('resize', tick);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('resize', tick);
    };
  }, [s.done, s.step, step]);
  useLayoutEffect(() => {
    if (card.current) setCardH(card.current.offsetHeight);
  });

  if (s.done || !step || !box || typeof document === 'undefined') return null;
  const copy = t.tour[step.id];
  const waits = !!step.until;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const hole = { left: box.left - PAD, top: box.top - PAD, width: box.width + PAD * 2, height: box.height + PAD * 2 };
  // The card goes where there is more room, the arrow between it and the lit thing.
  const roomAbove = hole.top;
  const roomBelow = vh - (hole.top + hole.height);
  const below = roomBelow >= roomAbove;
  const ARROW = 40;
  const w = Math.min(344, vw - 24);
  const left = Math.max(12, Math.min(vw - 12 - w, hole.left + hole.width / 2 - w / 2));
  const top = below ? Math.min(vh - cardH - 12, hole.top + hole.height + ARROW + 4) : Math.max(12, hole.top - ARROW - 4 - cardH);
  const ax = Math.max(left + 22, Math.min(left + w - 22, hole.left + hole.width / 2));
  const ay = below ? hole.top + hole.height + 2 : hole.top - ARROW - 2;
  const first = !!step.starts;
  const last = s.step === TOUR.length - 1;
  const n = TOUR.length;
  return createPortal(
    <div className="tour-layer" role="dialog" aria-modal={!waits} aria-label={t.tourLabel}>
      {/* Steps that only explain hold the screen still; steps that ask for a tap leave it open. */}
      {!waits && <div className="tour-block" />}
      <div className="tour-hole" style={hole} />
      <svg className={`tour-arrow ${below ? 'is-up' : 'is-down'}`} style={{ left: ax - 14, top: ay, height: ARROW }} viewBox="0 0 28 40" aria-hidden="true">
        <path d="M14 38V6M4 15l10-11 10 11" />
      </svg>
      <section ref={card} className="tour-card" style={{ left, top, width: w }}>
        <p className="tour-count">
          {t.tourKicker} · {s.step + 1} / {n}
        </p>
        <h3>{copy.title}</h3>
        <p className="tour-text">{copy.text}</p>
        <div className="tour-foot">
          <button type="button" className="tour-skip" onClick={() => tour.end()}>
            {t.tourSkip}
          </button>
          <span className="tour-nav">
            {/* Back only between explanations (a tap step's earlier anchor may be covered now). */}
            {!first && !waits && !TOUR[s.step - 1]?.until && (
              <button type="button" className="tour-prev" onClick={() => tour.prev()}>
                {t.introPrev}
              </button>
            )}
            {waits ? (
              <span className="tour-wait">{t.tourTapLit}</span>
            ) : (
              <button type="button" className="tour-next" onClick={() => (last ? tour.end() : tour.next())}>
                {last ? t.tourDone : t.introNext}
              </button>
            )}
          </span>
        </div>
      </section>
    </div>,
    document.body,
  );
}
