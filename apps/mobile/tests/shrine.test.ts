import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ALTAR_TOP, DEITIES, ORB, PLAQUE_BOTTOM, SCREEN_HALF_WIDTH, cardBottom, cardPoint, cardSize } from '../src/scene/shrineLayout';

describe('三清 seated on the altar', () => {
  it('bundles each cutout and seats 老君 left, 元始 middle, 灵宝 right', () => {
    for (const d of DEITIES) expect(existsSync(resolve(__dirname, '../public', d.file))).toBe(true);
    expect(DEITIES.map((d) => d.key)).toEqual(['laojun', 'yuanshi', 'lingbao']);
    const [l, m, r] = DEITIES;
    expect(l.card.x).toBeLessThan(m.card.x);
    expect(r.card.x).toBeGreaterThan(m.card.x);
    expect(cardBottom(m)).toBeGreaterThan(cardBottom(l)); // 元始 raised
  });

  it('keeps every figure on the altar, under the plaque, inside the screen and apart', () => {
    for (const d of DEITIES) {
      const [, h] = cardSize(d);
      expect(cardBottom(d)).toBeGreaterThan(ALTAR_TOP);
      expect(cardBottom(d) + h).toBeLessThan(PLAQUE_BOTTOM);
      expect(d.base.z - d.base.depth / 2).toBeGreaterThan(-16.05); // in front of the cloud screen
      for (const u of [0, 1]) expect(Math.abs(cardPoint(d, u, 0.5)[0])).toBeLessThan(SCREEN_HALF_WIDTH);
    }
    const [l, m, r] = DEITIES;
    expect(cardPoint(l, 1, 0.5)[0]).toBeLessThan(cardPoint(m, 0, 0.5)[0] + 0.25);
    expect(cardPoint(r, 0, 0.5)[0]).toBeGreaterThan(cardPoint(m, 1, 0.5)[0] - 0.25);
  });

  it('gathers the bestowal light on 元始天尊’s orb, at his chest', () => {
    const m = DEITIES[1];
    expect(ORB[0]).toBeCloseTo(m.card.x, 1);
    expect(ORB[1]).toBeGreaterThan(cardBottom(m) + cardSize(m)[1] * 0.45);
    expect(ORB[1]).toBeLessThan(cardBottom(m) + cardSize(m)[1] * 0.65);
  });
});
