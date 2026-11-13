import { describe, expect, it } from 'vitest';
import { cameraPose, HOME, readingPose, WORLD, WALK_IN, span, paintedIntroPose, INSIDE, walkInSeconds } from '../src/scene/timeline';
import { phaseDuration } from '../src/domain/ritual';

const dist = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

describe('walk to the bestowal', () => {
  const reading = readingPose(0.46, 56, 0.08, 0.16);

  it('starts at home and ends at the stone table, where the bestowal begins', () => {
    const d = phaseDuration('entering', false);
    expect(dist(cameraPose('entering', 0, false, reading).pos, HOME.pos)).toBeLessThan(0.05);
    const end = cameraPose('entering', d, false, reading).pos;
    expect(dist(end, cameraPose('revealing', 0, false, reading).pos)).toBeLessThan(1e-6);
    expect(Math.abs(end[0] - WORLD.table[0])).toBeLessThan(0.01);
  });

  it('moves smoothly: no jump between frames', () => {
    const d = phaseDuration('entering', false);
    let prev = cameraPose('entering', 0, false, reading).pos;
    for (let t = 1 / 60; t <= d; t += 1 / 60) {
      const p = cameraPose('entering', t, false, reading).pos;
      expect(dist(p, prev)).toBeLessThan(0.05);
      prev = p;
    }
  });
});

describe('painted walk-in (docs/art-reference/sanqing-entrance)', () => {
  it('walks in within about 7.5–8.5 s: courtyard push, the doors, through, the hall', () => {
    expect(WALK_IN.seconds).toBeGreaterThanOrEqual(7.5);
    expect(WALK_IN.seconds).toBeLessThanOrEqual(8.5);
    // In order: push toward the doors, the doors open, held and pushed through, the hall shows.
    expect(WALK_IN.courtyard[1]).toBeGreaterThan(WALK_IN.doors[0]);
    expect(WALK_IN.doors[1]).toBeLessThanOrEqual(WALK_IN.through[0]);
    expect(WALK_IN.reveal[0]).toBeGreaterThan(WALK_IN.through[0]);
    expect(WALK_IN.reveal[1]).toBeLessThanOrEqual(WALK_IN.seconds);
    expect(WALK_IN.settle[1]).toBeLessThanOrEqual(WALK_IN.seconds);
    expect(span(WALK_IN.doors[0], WALK_IN.doors)).toBe(0);
    expect(span(WALK_IN.doors[1] + 1, WALK_IN.doors)).toBe(1);
  });

  it('keeps the 3D camera inside the doors under the pictures, then settles it at home', () => {
    expect(paintedIntroPose(0, HOME, false)).toEqual({ pos: [...INSIDE.pos], target: [...INSIDE.target] });
    const end = paintedIntroPose(1, HOME, false);
    end.pos.forEach((v, i) => expect(v).toBeCloseTo(HOME.pos[i], 6));
    // Never back out into the courtyard (the doors are at z 13.6) while the hall shows.
    for (let k = 0; k <= 1; k += 0.05) expect(paintedIntroPose(k, HOME, false).pos[2]).toBeLessThan(10);
    expect(paintedIntroPose(0.3, HOME, true)).toEqual(HOME);
    expect(walkInSeconds(0.5, false)).toBeCloseTo(WALK_IN.seconds / 2);
    expect(walkInSeconds(1, true)).toBe(WALK_IN.reducedSeconds);
  });
});
