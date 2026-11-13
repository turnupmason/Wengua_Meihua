/**
 * First-use guidance (2026-11-13, second pass).
 *
 * - The first time in the hall, a short introduction swipes through five pages (问事 → 起卦 → 看石案 →
 *   读断语 → 回看), each with a picture and two sentences; it can be skipped.
 * - Then, at the places the visitor acts, one clear popup at a time: a light card with an arrow
 *   pointing at the thing to tap (which glows), 「知道了」 and 「跳过引导」. Doing what it says counts
 *   as read. None shows while the introduction is open.
 * - 设置 · 重看新手引导 brings it all back. Kept on the device only.
 */
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { Strings } from '../domain/i18n';
import { HexagramSVG } from './HexagramSVG';
import { walkInUrl, WALK_IN_FILES, PLACE_FILES } from './walkInArt';

export type CoachId = 'intro' | 'domain' | 'drawer' | 'cast' | 'stone' | 'records';

const KEY = 'wengua.coach.v2';
type State = { seen: CoachId[]; off: boolean };
const listeners = new Set<() => void>();

function load(): State {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null') as State | null;
    if (v && Array.isArray(v.seen)) return { seen: v.seen, off: !!v.off };
  } catch {
    /* fresh */
  }
  return { seen: [], off: false };
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

/** Popups mounted right now, in the order they asked: only the first shows. */
let queue: CoachId[] = [];
const notify = () => listeners.forEach((l) => l());

export const coach = {
  shows: (id: CoachId) => !state.off && !state.seen.includes(id) && (id === 'intro' || state.seen.includes('intro')),
  done: (id: CoachId) => {
    if (!state.seen.includes(id)) save({ ...state, seen: [...state.seen, id] });
  },
  skipAll: () => save({ seen: [...new Set<CoachId>([...state.seen, 'intro'])], off: true }),
  /** 重看新手引导: the introduction and every popup show again. */
  reset: () => save({ seen: [], off: false }),
  subscribe: (l: () => void) => {
    listeners.add(l);
    return () => void listeners.delete(l);
  },
  snapshot: () => state,
};

export function useCoach(id: CoachId) {
  useSyncExternalStore(coach.subscribe, coach.snapshot, coach.snapshot);
  return coach.shows(id);
}

type Box = { left: number; top: number; arrow: number; below: boolean };

/**
 * One popup, pointing at `anchor` (a CSS selector): above it, or below when there is no room above
 * (or `below` is asked). Without the anchor on screen it waits. The anchor glows while it shows.
 */
export function CoachTip({ id, t, text, anchor, below = false, strip = false }: { id: CoachId; t: Strings; text: string; anchor: string; below?: boolean; /** A one-line paper strip with ✕, just above `anchor`; it does not wait its turn. */ strip?: boolean }) {
  const want = useCoach(id);
  // Take a place in the queue while wanted; only the first in the queue shows.
  useEffect(() => {
    if (!want || strip) return;
    queue = [...queue.filter((q) => q !== id), id];
    notify();
    return () => {
      queue = queue.filter((q) => q !== id);
      notify();
    };
  }, [want, id, strip]);
  const first = useSyncExternalStore(coach.subscribe, () => queue[0] ?? null, () => queue[0] ?? null);
  const on = want && (strip || first === id);
  const card = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<Box | null>(null);
  useLayoutEffect(() => {
    if (!on) {
      setBox(null);
      return;
    }
    let target: HTMLElement | null = null;
    const place = () => {
      const el = document.querySelector<HTMLElement>(anchor);
      if (el !== target) {
        target?.classList.remove('coach-target');
        target = el;
        if (!strip) target?.classList.add('coach-target');
      }
      const c = card.current;
      if (!el || !c) return setBox(null);
      const r = el.getBoundingClientRect();
      if (!r.width && !r.height) return setBox(null);
      // Whatever it points at must be the thing on top there: under another page (爻辞, a sheet),
      // the tip waits instead of floating over that page's words.
      const hit = document.elementFromPoint?.(r.left + r.width / 2, r.top + r.height / 2);
      if (hit && !el.contains(hit) && !hit.closest('.coach-pop')) return setBox(null);
      const vw = window.innerWidth;
      const w = c.offsetWidth;
      const h = c.offsetHeight;
      const cx = r.left + r.width / 2;
      const left = Math.max(12, Math.min(vw - 12 - w, cx - w / 2));
      const gap = strip ? 6 : 14;
      const goBelow = !strip && (below || r.top - h - gap < 8);
      const top = goBelow ? r.bottom + gap : Math.max(4, r.top - h - gap);
      setBox((b) => (b && b.left === left && b.top === top ? b : { left, top, arrow: Math.max(18, Math.min(w - 18, cx - left)), below: goBelow }));
    };
    place();
    // Trays rise and panels slide: keep following the anchor while shown.
    const timer = window.setInterval(place, 250);
    window.addEventListener('resize', place);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('resize', place);
      target?.classList.remove('coach-target');
    };
  }, [on, anchor, below, strip]);
  if (!on || typeof document === 'undefined') return null;
  if (strip)
    return createPortal(
      <div ref={card} className={`coach-pop coach-strip ${box ? 'is-placed' : ''}`} role="note" style={box ? { left: box.left, top: box.top } : undefined}>
        <p>{text}</p>
        <button type="button" className="coach-close" aria-label={t.close} onClick={() => coach.done(id)}>
          ✕
        </button>
      </div>,
      document.body,
    );
  return createPortal(
    <div
      ref={card}
      className={`coach-pop ${box ? 'is-placed' : ''} ${box?.below ? 'is-below' : ''}`}
      role="dialog"
      aria-label={t.coachTitle}
      style={box ? { left: box.left, top: box.top, ['--arrow' as string]: `${box.arrow}px` } : undefined}
    >
      <p>{text}</p>
      <span className="coach-actions">
        <button type="button" className="coach-skip" onClick={() => coach.skipAll()}>
          {t.coachSkip}
        </button>
        <button type="button" className="coach-ok" onClick={() => coach.done(id)}>
          {t.coachOk}
        </button>
      </span>
    </div>,
    document.body,
  );
}

/** A small stone for the introduction: 结果 above 经过 above 目前, the moving line in red. */
function MiniStone({ t }: { t: Strings }) {
  const rows: [string, number[], number | null][] = [
    [t.caption_changed, [0, 1, 1, 0, 0, 0], null],
    [t.caption_mutual, [1, 1, 0, 1, 0, 1], null],
    [t.caption_primary, [0, 1, 1, 0, 1, 0], 5],
  ];
  return (
    <div className="intro-stone" aria-hidden="true">
      {rows.map(([label, bits, moving]) => (
        <div key={label} className="intro-stone-row">
          <b>{label}</b>
          <HexagramSVG bits={bits} hexagramId={0} title={label} movingLine={moving} width={78} />
        </div>
      ))}
      <i className="intro-stone-arrow">↑</i>
    </div>
  );
}

function MiniReading({ t }: { t: Strings }) {
  return (
    <div className="intro-reading" aria-hidden="true">
      <div className="is-main">
        <small>{t.briefTitle}</small>
        <b>{t.introSampleVerdict}</b>
      </div>
      <div>{t.detailTitle} ›</div>
      <div>{t.proTitle} ›</div>
    </div>
  );
}

/**
 * The first-time introduction: five pages, turned by a swipe or by 上一步 / 下一步, skippable.
 * The pages move as one strip by a transform (a drag sets it directly, with no re-render), and the
 * hall's own animations pause behind it, so turning a page stays smooth.
 */
export function CoachIntro({ t }: { t: Strings }) {
  const on = useCoach('intro');
  const track = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const drag = useRef<{ id: number; x: number; y: number; dx: number; horizontal: boolean | null } | null>(null);
  useEffect(() => {
    if (!on) return;
    document.body.classList.add('intro-open');
    return () => document.body.classList.remove('intro-open');
  }, [on]);
  const base = import.meta.env.BASE_URL;
  const pages: { title: string; text: string; art: ReactNode }[] = [
    { title: t.introAskTitle, text: t.introAskText, art: <img className="intro-portrait" src={`${base}art/sanqing-yuanshi.webp`} alt="" /> },
    { title: t.introCastTitle, text: t.introCastText, art: <div className="intro-pic is-censer" style={{ backgroundImage: `url(${walkInUrl(WALK_IN_FILES.hall)})` }} /> },
    { title: t.introStoneTitle, text: t.introStoneText, art: <MiniStone t={t} /> },
    { title: t.introReadTitle, text: t.introReadText, art: <MiniReading t={t} /> },
    { title: t.introKeepTitle, text: t.introKeepText, art: <div className="intro-pic is-records" style={{ backgroundImage: `url(${walkInUrl(PLACE_FILES.records)})` }} /> },
  ];
  if (!on) return null;
  const n = pages.length;
  const go = (i: number) => {
    const next = Math.max(0, Math.min(n - 1, i));
    const el = track.current;
    if (el) {
      el.style.transition = '';
      el.style.transform = `translate3d(${-next * 100}%, 0, 0)`;
    }
    setPage(next);
  };
  const last = page === n - 1;
  return (
    <div className="intro-backdrop" role="dialog" aria-modal="true" aria-label={t.introLabel}>
      <section className="intro-card">
        <button type="button" className="intro-skip" onClick={() => coach.done('intro')}>
          {t.introSkip}
        </button>
        <div
          className="intro-viewport"
          onPointerDown={(e) => {
            drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, horizontal: null };
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            const el = track.current;
            if (!d || d.id !== e.pointerId || !el) return;
            const dx = e.clientX - d.x;
            const dy = e.clientY - d.y;
            if (d.horizontal === null && Math.abs(dx) + Math.abs(dy) > 6) {
              d.horizontal = Math.abs(dx) > Math.abs(dy);
              if (d.horizontal) e.currentTarget.setPointerCapture(e.pointerId);
            }
            if (!d.horizontal) return;
            // Past the first or last page it gives a little, then stops.
            d.dx = (page === 0 && dx > 0) || (page === n - 1 && dx < 0) ? dx / 3 : dx;
            el.style.transition = 'none';
            el.style.transform = `translate3d(calc(${-page * 100}% + ${d.dx}px), 0, 0)`;
          }}
          onPointerUp={(e) => {
            const d = drag.current;
            drag.current = null;
            if (!d || d.id !== e.pointerId || !d.horizontal) return;
            const w = e.currentTarget.clientWidth || 1;
            go(d.dx < -w * 0.18 ? page + 1 : d.dx > w * 0.18 ? page - 1 : page);
          }}
          onPointerCancel={() => {
            drag.current = null;
            go(page);
          }}
        >
          <div ref={track} className="intro-track">
            {pages.map((p, i) => (
              <article key={p.title} className="intro-page" aria-hidden={i !== page}>
                <div className="intro-art">{p.art}</div>
                <p className="intro-step">
                  {i + 1} / {n}
                </p>
                <h2>{p.title}</h2>
                <p className="intro-text">{p.text}</p>
              </article>
            ))}
          </div>
        </div>
        <div className="intro-foot">
          <button type="button" className="intro-prev" onClick={() => go(page - 1)} disabled={page === 0} aria-hidden={page === 0}>
            {t.introPrev}
          </button>
          <span className="intro-dots" aria-hidden="true">
            {pages.map((p, i) => (
              <i key={p.title} className={i === page ? 'is-on' : ''} />
            ))}
          </span>
          <button type="button" className="intro-next" onClick={() => (last ? coach.done('intro') : go(page + 1))}>
            {last ? t.introStart : t.introNext}
          </button>
        </div>
      </section>
    </div>
  );
}
