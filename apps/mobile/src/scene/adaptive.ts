/**
 * Frame-rate guard for phones: lower the render resolution when frames drop, raise it again
 * when there is room. Pure logic (no three.js), so it can be tested; TempleScene feeds it frame
 * times and applies the resolution it returns.
 */
export interface DprGovernor {
  /** Feed one frame's duration (seconds); returns the resolution to use now. */
  frame(dt: number): number;
  readonly dpr: number;
  readonly fps: number;
  /** Jump to a resolution (e.g. full for a still reading view) and restart the counters. */
  reset(dpr: number): void;
}

export function createDprGovernor({ min = 1, max = 2, start = Math.min(2, max), low = 40, high = 57 }: { min?: number; max?: number; start?: number; low?: number; high?: number } = {}): DprGovernor {
  let dpr = Math.max(min, Math.min(max, start));
  let fps = 60;
  let slow = 0;
  let fast = 0;
  let since = 0; // seconds since the last change
  return {
    frame(dt: number) {
      // Ignore stalls (tab switches, first frames, shader compiles).
      if (!(dt > 0) || dt > 0.25) return dpr;
      fps += (1 / dt - fps) * 0.05;
      since += dt;
      if (fps < low) {
        slow += dt;
        fast = 0;
      } else if (fps > high) {
        fast += dt;
        slow = 0;
      } else {
        slow = 0;
        fast = 0;
      }
      // A camera glide or a panel sliding in is not a reason to resize the canvas mid-motion.
      if (slow > 3 && dpr > min && since > 6) {
        dpr = Math.max(min, Math.round(dpr * 0.8 * 100) / 100);
        slow = 0;
        since = 0;
      } else if (fast > 8 && dpr < max && since > 10) {
        dpr = Math.min(max, Math.round((dpr + 0.15) * 100) / 100);
        fast = 0;
        since = 0;
      }
      return dpr;
    },
    get dpr() {
      return dpr;
    },
    get fps() {
      return fps;
    },
    reset(d: number) {
      dpr = Math.max(min, Math.min(max, d));
      slow = 0;
      fast = 0;
      since = 0;
    },
  };
}
