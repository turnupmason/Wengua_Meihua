import { describe, expect, it } from 'vitest';
import { cameraPose, HOME, readingPose, WORLD } from '../src/scene/timeline';
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
