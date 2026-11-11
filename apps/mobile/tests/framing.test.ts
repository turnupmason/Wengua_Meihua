import { describe, expect, it } from 'vitest';
import { fovFor, readingPose, screenNdc, tableCorners } from '../src/scene/timeline';

// iPhone SE (no notch), 13 mini, 15/16, 15/16 Pro Max — CSS size and safe areas (top, bottom).
const PHONES: [string, number, number, number, number][] = [
  ['iPhone SE', 375, 667, 20, 0],
  ['iPhone 13 mini', 375, 812, 50, 34],
  ['iPhone 15', 393, 852, 59, 34],
  ['iPhone 15 Pro Max', 430, 932, 59, 34],
];

describe('观卦 framing: the whole stone between the top bar and the bottom bar', () => {
  for (const [name, w, h, safeT, safeB] of PHONES) {
    it(name, () => {
      // Top bar: safe area + 6 + 44 (buttons) + 6. Bottom bar: 10 + 52 (查看断语) + 18 + safe area.
      const headerPx = safeT + 56;
      const footerPx = 80 + safeB;
      const top = (headerPx + 6) / h;
      const bottom = (footerPx + 8) / h;
      const aspect = w / h;
      const fov = fovFor(aspect);
      const pose = readingPose(aspect, fov, top, bottom);
      for (const c of tableCorners()) {
        const [x, y] = screenNdc(c, pose, aspect, fov, top, bottom);
        expect(Math.abs(x)).toBeLessThanOrEqual(1);
        // NDC +1 is the top of the screen: below the top bar, above the bottom bar.
        expect(y).toBeLessThanOrEqual(1 - 2 * top);
        expect(y).toBeGreaterThanOrEqual(-1 + 2 * bottom);
      }
    });
  }
});
