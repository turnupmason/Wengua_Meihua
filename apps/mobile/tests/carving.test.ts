import { describe, expect, it } from 'vitest';
import { arrowGrooves, carvedRect, frameGrooves, grooveProgress, insideTable, lineGrooves, revealPlan } from '../src/scene/carving';
import { inscriptionBlocks } from '../src/scene/inscriptionLayout';
import { primaryRelation } from '../src/domain/relation';
import { phaseDuration } from '../src/domain/ritual';
import { HEX_LAYOUT } from '../src/domain/layout';
import { STRINGS } from '../src/domain/i18n';
import { testKnowledge } from './helpers';

type Box = [number, number, number, number];
const overlap = (a: Box, b: Box) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];

describe('carving on the stone table', () => {
  it('every groove and every inscription stays on the table top, for all 384 casts and both languages', async () => {
    const { library } = await testKnowledge();
    const W = HEX_LAYOUT.tableWidth / 2;
    const D = HEX_LAYOUT.tableDepth / 2;
    for (const h of library.listHexagrams()) {
      for (let pos = 1; pos <= 6; pos++) {
        const r = library.createReading({ primaryId: h.id, movingLine: pos });
        const rel = primaryRelation(r);
        const grooves = [...frameGrooves(), ...lineGrooves(r), ...arrowGrooves(rel)];
        for (const g of grooves) expect(insideTable(g), g.key).toBe(true);
        for (const lang of ['zh', 'en'] as const) {
          const blocks = inscriptionBlocks(r, rel, STRINGS[lang], lang, '丙午年十月初二 申时 起卦');
          for (const b of blocks) {
            const box: Box = [b.x - b.w / 2, b.z - b.d / 2, b.x + b.w / 2, b.z + b.d / 2];
            expect(Math.abs(box[0]) <= W && Math.abs(box[2]) <= W && Math.abs(box[1]) <= D && Math.abs(box[3]) <= D, b.key).toBe(true);
            // Inscriptions never sit on top of a carved hexagram line.
            for (const g of grooves.filter((x) => x.kind === 'line')) expect(overlap(box, g.rect!), `${b.key} vs ${g.key}`).toBe(false);
          }
        }
      }
    }
  });

  it('yin lines are two grooves with a gap; a yang line is one groove', async () => {
    const { library } = await testKnowledge();
    const r = library.createReading({ primaryId: 49, movingLine: 1 });
    const primary = lineGrooves(r).filter((g) => g.stage === 'primary');
    // 革: bottom-up 1,0,1,1,1,0
    const count = (p: number) => primary.filter((g) => g.position === p).length;
    expect([1, 2, 3, 4, 5, 6].map(count)).toEqual([1, 2, 1, 1, 1, 2]);
    expect(primary.every((g) => g.hexagramId === 49)).toBe(true);
  });

  it('the reveal lasts exactly as long as the carving, and lines are carved bottom to top', () => {
    for (const reduced of [false, true]) {
      const plan = revealPlan(reduced);
      expect(phaseDuration('revealing', reduced)).toBeCloseTo(plan.total, 6);
      if (!reduced) {
        for (let s = 0; s < 3; s++) {
          for (let p = 1; p < 6; p++) expect(plan.lineStart(s, p + 1)).toBeGreaterThan(plan.lineStart(s, p));
          expect(plan.textStart(s)).toBeGreaterThanOrEqual(plan.lineStart(s, 6) + plan.lineDuration);
        }
      }
      expect(plan.tagsStart + plan.textDuration).toBeLessThanOrEqual(plan.total);
      // Carving only begins after sitting down and the light arriving.
      expect(plan.framesStart).toBeGreaterThan(plan.seated);
      expect(plan.lineStart(0, 1)).toBeGreaterThanOrEqual(plan.framesStart);
    }
  });

  it('every groove is fully carved and lit by the end of the reveal', async () => {
    const { library } = await testKnowledge();
    const r = library.createReading({ primaryId: 58, movingLine: 4 });
    const plan = revealPlan(false);
    for (const g of [...frameGrooves(), ...lineGrooves(r), ...arrowGrooves(primaryRelation(r))]) {
      const end = grooveProgress(g, plan, plan.total);
      expect(end.carve).toBe(1);
      expect(end.glow).toBe(1);
      expect(grooveProgress(g, plan, 0).carve).toBe(0);
    }
  });

  it('the chisel opens a groove along its axis', () => {
    expect(carvedRect([0, 0, 1, 0.1], 'x', 0.5)).toEqual([0, 0, 0.5, 0.1]);
    expect(carvedRect([0, 0, 0.1, 1], '-z', 0.25)).toEqual([0, 0.75, 0.1, 1]);
    expect(carvedRect([0, 0, 1, 1], 'x', 0)).toBeNull();
  });
});
