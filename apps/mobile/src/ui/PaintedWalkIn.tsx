/**
 * The walk-in, painted (docs/art-reference/sanqing-entrance): the artist's moonlit courtyard and
 * open threshold, shown as they are. Waiting at the title, the courtyard breathes; on entering it is
 * pushed in toward the doors, dissolves into the open threshold, which is pushed through, and the
 * real 3D hall shows beneath as it fades. Driven frame by frame from the ritual clock — the same
 * clock that moves the 3D camera — and it ends the walk-in itself, so picture, camera, doors and
 * the tray's arrival never drift apart (and pause together in the background).
 */
import { useEffect, useRef, type MutableRefObject } from 'react';
import type { RitualClock } from './useRitualClock';
import type { IntroRef } from '../scene/TempleScene';
import { clamp01, easeInOut, span, WALK_AT, WALK_IN } from '../scene/timeline';
import { WALK_IN_FILES, walkInUrl } from './walkInArt';

/** Point of each picture the camera walks toward (fractions of the 941×1672 picture). */
const DOORS = { courtyard: [0.5, 0.592], threshold: [0.5, 0.565] } as const;
/** Lantern windows in each picture, for their flicker (x, y as fractions; size as a fraction of the width). */
const LAMPS = {
  courtyard: [[0.066, 0.702, 0.14], [0.182, 0.663, 0.09], [0.818, 0.663, 0.09], [0.936, 0.702, 0.14]],
  threshold: [[0.368, 0.521, 0.05], [0.5, 0.52, 0.05], [0.631, 0.521, 0.05]],
} as const;
/** The incense sticks' tips in the courtyard censer: the smoke rises from here. */
const CENSER = [0.502, 0.728] as const;

const easeIn = (x: number) => x * x * x;

interface Props {
  clock: MutableRefObject<RitualClock>;
  intro: MutableRefObject<IntroRef>;
  reduced: boolean;
  /** Called once when the walk-in reaches the hall. */
  onDone: () => void;
}

export function PaintedWalkIn({ clock, intro, reduced, onDone }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const court = useRef<HTMLDivElement>(null);
  const sill = useRef<HTMLDivElement>(null);
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    let raf = 0;
    let finished = false;
    // Moves a picture so its focal point heads toward the middle of the screen as it grows.
    const place = (el: HTMLDivElement | null, focal: readonly [number, number], scale: number, toCentre: number, opacity: number) => {
      if (!el) return;
      const dx = -(focal[0] - 0.5) * el.offsetWidth * toCentre;
      const dy = -(focal[1] - 0.5) * el.offsetHeight * toCentre;
      el.style.transformOrigin = `${focal[0] * 100}% ${focal[1] * 100}%`;
      el.style.transform = `translate(-50%, -50%) translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0) scale(${scale.toFixed(4)})`;
      el.style.opacity = opacity.toFixed(3);
    };
    const frame = () => {
      const it = intro.current;
      const c = clock.current;
      const seconds = reduced ? WALK_IN.reducedSeconds : WALK_IN.seconds;
      const held = Number.isFinite(WALK_AT);
      const k = held ? clamp01(WALK_AT / seconds) : it.start === null ? 0 : clamp01((c.elapsed - it.start) / seconds);
      const s = k * seconds;
      if (it.start === null && !held) {
        // Waiting at the title: the courtyard holds still (its lamps and incense, animated on the GPU,
        // keep it alive while the app is still busy starting up).
        place(court.current, DOORS.courtyard, 1.02, 0, 1);
        place(sill.current, DOORS.threshold, 1, 0, 0);
      } else if (reduced) {
        // Reduced motion: no push, the courtyard fades straight onto the hall.
        place(court.current, DOORS.courtyard, 1, 0, 1 - easeInOut(span(s, [0.3, 1.6])));
        place(sill.current, DOORS.threshold, 1, 0, 0);
      } else {
        const a = easeInOut(span(s, WALK_IN.courtyard));
        const doors = easeInOut(span(s, WALK_IN.doors));
        const through = span(s, WALK_IN.through);
        const reveal = easeInOut(span(s, WALK_IN.reveal));
        place(court.current, DOORS.courtyard, 1 + 0.85 * a, 0.5 * a, s < WALK_IN.doors[1] ? 1 : 0);
        const hold = 1 + 0.08 * span(s, [WALK_IN.doors[0], WALK_IN.through[0]]);
        place(sill.current, DOORS.threshold, hold + 1.6 * easeIn(through), 0.6 * easeInOut(through), doors * (1 - reveal));
      }
      if (it.start !== null && k >= 1 && !finished && !held) {
        finished = true;
        done.current();
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [clock, intro, reduced]);

  return (
    <div ref={root} className={`walkin ${reduced ? 'is-still' : ''}`} aria-hidden="true">
      <div ref={court} className="walkin-plate" style={{ backgroundImage: `url(${walkInUrl(WALK_IN_FILES.courtyard)})` }}>
        {LAMPS.courtyard.map(([x, y, w], i) => (
          <i key={i} className="walkin-lamp" style={{ left: `${x * 100}%`, top: `${y * 100}%`, width: `${w * 100}%`, animationDelay: `${-i * 0.7}s` }} />
        ))}
        {/* Incense: the sticks' tips glow, and smoke rises, sways and thins over the painted wisp. */}
        <i className="hall-embers" style={{ left: `${CENSER[0] * 100}%`, top: `${CENSER[1] * 100}%` }} />
        {[0, 1, 2].map((i) => (
          <img key={i} className={`hall-smoke is-${i}`} src={walkInUrl(WALK_IN_FILES.wisp)} alt="" style={{ left: `${(CENSER[0] + (i - 1) * 0.012) * 100}%`, top: `${CENSER[1] * 100}%` }} />
        ))}
      </div>
      <div ref={sill} className="walkin-plate" style={{ backgroundImage: `url(${walkInUrl(WALK_IN_FILES.threshold)})`, opacity: 0 }}>
        {LAMPS.threshold.map(([x, y, w], i) => (
          <i key={i} className="walkin-lamp is-small" style={{ left: `${x * 100}%`, top: `${y * 100}%`, width: `${w * 100}%`, animationDelay: `${-i * 0.9}s` }} />
        ))}
      </div>
    </div>
  );
}
