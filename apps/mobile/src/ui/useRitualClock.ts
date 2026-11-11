import { useEffect, useRef } from 'react';
import { phaseDuration, type RitualPhase } from '../domain/ritual';
import { cuesFor } from '../scene/timeline';

/** Development only: `?slow=0.25` plays every animation at a quarter speed, for checking frames. */
export const SLOW = (() => {
  if (!import.meta.env.DEV || typeof location === 'undefined') return 1;
  const v = Number(new URLSearchParams(location.search).get('slow'));
  return v > 0 && v <= 4 ? v : 1;
})();

export interface RitualClock {
  phase: RitualPhase;
  /** Seconds elapsed in the current phase; only advances while the page is visible. */
  t: number;
  /** Total visible seconds, for idle motion like smoke and flicker. */
  elapsed: number;
}

/**
 * One clock for both 3D and 2D. Time does not advance while the app is hidden, and a long
 * frame gap (backgrounding, a stall) is clamped, so resuming never skips or repeats a phase.
 */
export function useRitualClock(
  phase: RitualPhase,
  reducedMotion: boolean,
  onPhaseDone: (phase: RitualPhase) => void,
  onCue?: (phase: RitualPhase, index: number) => void,
) {
  const clock = useRef<RitualClock>({ phase, t: 0, elapsed: 0 });
  const doneFired = useRef<RitualPhase | null>(null);
  const cuesFired = useRef(new Set<number>());
  const callbacks = useRef({ onPhaseDone, onCue, reducedMotion });
  callbacks.current = { onPhaseDone, onCue, reducedMotion };

  if (clock.current.phase !== phase) {
    clock.current = { phase, t: 0, elapsed: clock.current.elapsed };
    doneFired.current = null;
    cuesFired.current = new Set();
  }

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.1, Math.max(0, (now - last) / 1000)) * SLOW;
      last = now;
      // Development only: `window.__ritualAt = seconds` holds the phase clock on one frame.
      const hold = import.meta.env.DEV ? (window as unknown as { __ritualAt?: number }).__ritualAt : undefined;
      if (typeof hold === 'number') {
        clock.current.t = hold;
        clock.current.elapsed += dt;
      } else if (!document.hidden) {
        const c = clock.current;
        c.t += dt;
        c.elapsed += dt;
        const { reducedMotion: reduced } = callbacks.current;
        const duration = phaseDuration(c.phase, reduced);
        const cues = cuesFor(c.phase, reduced);
        if (cues.length && Number.isFinite(duration)) {
          cues.forEach((at, i) => {
            if (c.t >= at * duration && !cuesFired.current.has(i)) {
              cuesFired.current.add(i);
              callbacks.current.onCue?.(c.phase, i);
            }
          });
        }
        if (c.t >= duration && doneFired.current !== c.phase) {
          doneFired.current = c.phase;
          callbacks.current.onPhaseDone(c.phase);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const onVisible = () => {
      last = performance.now();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return clock;
}
