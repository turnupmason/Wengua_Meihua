import { describe, expect, it } from 'vitest';
import { lineSlots, sideOfLine } from '../src/domain/layout';
import { primaryRelation } from '../src/domain/relation';
import { testKnowledge } from './helpers';

const GENERATES: Record<string, string> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const CONTROLS: Record<string, string> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };

describe('line positions and data mapping (all 384 single moving lines)', () => {
  it('position 1 is lowest on screen and 6 highest, for every hexagram', async () => {
    const { library } = await testKnowledge();
    for (const h of library.listHexagrams()) {
      const slots = lineSlots(h.bitsBottomUp);
      for (let i = 1; i < 6; i++) {
        expect(slots[i].position).toBe(slots[i - 1].position + 1);
        expect(slots[i].depthOffset).toBeLessThan(slots[i - 1].depthOffset); // farther = higher on screen
        expect(slots[i].svgY).toBeLessThan(slots[i - 1].svgY);
      }
      slots.forEach((s) => expect(s.yang).toBe(h.bitsBottomUp[s.position - 1] === 1));
    }
  });

  it('every (hexagram, position) resolves to its own line text, details and changed hexagram', async () => {
    const { library, details } = await testKnowledge();
    for (const h of library.listHexagrams()) {
      const d = await details.getHexagram(h.id);
      for (let pos = 1; pos <= 6; pos++) {
        const line = await details.getLine(h.id, pos);
        expect(line.position).toBe(pos);
        expect(line.hexagramId).toBe(h.id);
        expect(line.label).toBe(h.lines[pos - 1].label);
        expect(line.text).toBe(library.getLineReading(h.id, pos).text);
        expect(line.changedHexagram.id).toBe(library.getChangedHexagram(h.id, pos).id);
        expect(d.lines[pos - 1]).toEqual(line);
        for (const n of line.editorialNotes) expect(n.evidence.hexagramId).toBe(h.id);
        const r = library.createReading({ primaryId: h.id, movingLine: pos });
        expect(r.stages.primary.glowLine).toBe(pos);
        expect(r.stages.mutual.glowLine).toBeNull();
        expect(r.use.side).toBe(sideOfLine(pos)); // the moving line's trigram is 用
        expect(r.body.side).not.toBe(r.use.side);
      }
    }
  });

  it('relation arrows follow the real generating/controlling direction', async () => {
    const { library } = await testKnowledge();
    for (const h of library.listHexagrams()) {
      for (let pos = 1; pos <= 6; pos++) {
        const r = library.createReading({ primaryId: h.id, movingLine: pos });
        const v = primaryRelation(r);
        const [b, u] = [r.body.element, r.use.element];
        if (b === u) {
          expect(v).toMatchObject({ kind: 'equal', direction: 'none', screen: 'none' });
          continue;
        }
        const src = v.direction === 'body-to-use' ? b : u;
        const dst = v.direction === 'body-to-use' ? u : b;
        expect(v.kind === 'controls' ? CONTROLS[src] : GENERATES[src]).toBe(dst);
        const srcSide = v.direction === 'body-to-use' ? r.body.side : r.use.side;
        expect(v.screen).toBe(srcSide === 'upper' ? 'down' : 'up');
      }
    }
  });
});

describe('acceptance texts', () => {
  it('丰初九 is its own text and changes to 62 小过', async () => {
    const { details } = await testKnowledge();
    const l = await details.getLine(55, 1);
    expect(l.text).toBe('遇其配主，虽旬无咎，往有尚。');
    expect(l.changedHexagram.id).toBe(62);
    expect(JSON.stringify(l)).not.toContain('归妹以娣');
  });

  it('兑九四 → 60 节 and 兑九五 → 54 归妹, kept apart', async () => {
    const { details } = await testKnowledge();
    const [l4, l5] = [await details.getLine(58, 4), await details.getLine(58, 5)];
    expect([l4.label, l4.changedHexagram.id]).toEqual(['九四', 60]);
    expect([l5.label, l5.changedHexagram.id]).toEqual(['九五', 54]);
    expect(l4.text).toContain('商兑');
    expect(l4.text).not.toContain('孚于剥');
    expect(l5.text).toContain('孚于剥');
  });

  it('大有 and 谦 six lines carry only their own notes', async () => {
    const { library, details } = await testKnowledge();
    for (const id of [14, 15]) {
      for (let pos = 1; pos <= 6; pos++) {
        const l = await details.getLine(id, pos);
        expect(l.text).toBe(library.getHexagram(id).lines[pos - 1].text);
        for (const n of l.editorialNotes) {
          expect(n.evidence.hexagramId).toBe(id);
          expect(n.text).toContain(l.label);
        }
      }
    }
  });

  it('屯六二 text and position', async () => {
    const { details } = await testKnowledge();
    const l = await details.getLine(3, 2);
    expect(l.label).toBe('六二');
    expect(l.text.startsWith('屯如邅如')).toBe(true);
    expect(l.structure.polarity).toBe('yin');
  });

  it('用九 / 用六 stay special, never a seventh line', async () => {
    const { library } = await testKnowledge();
    expect(library.getHexagram(1).lines).toHaveLength(6);
    expect(library.getHexagram(1).specialLines[0].position).toBeNull();
    expect(() => library.getLineReading(1, 7)).toThrow();
  });
});
