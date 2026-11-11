import { describe, expect, it } from 'vitest';
import { createDprGovernor } from '../src/scene/adaptive';
import { PLACE_POSES, PLACE_SPOTS } from '../src/scene/placeLayout';

describe('殿中三处', () => {
  it('stands 藏经阁 and 问事录 against the side walls, between the columns, and looks at them from the aisle', () => {
    const HALF = 8.9;
    const columnsZ = [-1.5, -6.5];
    for (const p of ['library', 'records'] as const) {
      const s = PLACE_SPOTS[p].pos;
      expect(Math.abs(s[0])).toBeGreaterThan(7.5);
      expect(Math.abs(s[0])).toBeLessThan(HALF);
      expect(s[2]).toBeLessThan(columnsZ[0]);
      expect(s[2]).toBeGreaterThan(columnsZ[1]);
      const v = PLACE_POSES[p];
      // The camera stays inside the column line (|x| < 5) and looks toward its piece.
      expect(Math.abs(v.pos[0])).toBeLessThan(5);
      expect(Math.sign(v.target[0] - v.pos[0])).toBe(Math.sign(s[0]));
    }
    expect(PLACE_SPOTS.library.pos[0]).toBeLessThan(0);
    expect(PLACE_SPOTS.records.pos[0]).toBeGreaterThan(0);
  });
});

describe('adaptive resolution', () => {
  it('drops resolution when frames fall below ~40 fps and climbs back slowly', () => {
    const g = createDprGovernor({ min: 1, max: 3, start: 2 });
    for (let i = 0; i < 200; i++) g.frame(1 / 25);
    expect(g.dpr).toBeLessThan(2);
    const low = g.dpr;
    for (let i = 0; i < 2000; i++) g.frame(1 / 60);
    expect(g.dpr).toBeGreaterThan(low);
    expect(g.dpr).toBeLessThanOrEqual(3);
  });

  it('ignores stalls and never goes below the floor', () => {
    const g = createDprGovernor({ min: 1, max: 2, start: 1 });
    g.frame(2);
    expect(g.dpr).toBe(1);
    for (let i = 0; i < 1000; i++) g.frame(1 / 10);
    expect(g.dpr).toBe(1);
  });
});
