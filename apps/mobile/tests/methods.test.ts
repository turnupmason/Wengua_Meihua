import { describe, expect, it } from 'vitest';
import { hanCount, methodNumbers, shortTextRule, textSplit } from '../src/domain/methods';
import { testKnowledge } from './helpers';

const time = { yearBranchNumber: 3, lunarMonth: 12, lunarDay: 1, hourBranchNumber: 7 };

describe('梅花 casting methods follow their sections', () => {
  it('起卦加数例: 寅年十二月初一午时 plus 王 (4 strokes) gives 丰, first line moving', async () => {
    const { library } = await testKnowledge();
    const n = methodNumbers('classical-time', { surnameStrokes: 4 }, time);
    expect([n.upperNumber, n.lowerNumber, n.movingTotal]).toEqual([20, 27, 27]);
    const cast = library.castByTrigramNumbers(n);
    expect(library.getHexagram(cast.primaryId).name).toContain('丰');
    expect(cast.movingLine).toBe(3);
    // The book: 二十七中去四六二十四，余三 — the third line counts from the bottom.
  });

  it('without a surname, 年月日时 matches the engine’s own castByTimeParts', async () => {
    const { library } = await testKnowledge();
    const n = methodNumbers('classical-time', {}, time);
    const a = library.castByTrigramNumbers(n);
    const b = library.castByTimeParts(time);
    expect([a.primaryId, a.movingLine]).toEqual([b.primaryId, b.movingLine]);
  });

  it('物数 uses the hour for the lower trigram; 声音 adds the hour', () => {
    expect(methodNumbers('object-count', { count: 11 }, time)).toMatchObject({ upperNumber: 11, lowerNumber: 7, movingTotal: 18 });
    expect(methodNumbers('sound-count', { count: 11 }, time)).toMatchObject({ upperNumber: 11, lowerNumber: 18, movingTotal: 18 });
  });

  it('字占: eleven or more characters split by count, fewer on top', () => {
    expect(textSplit(12)).toEqual({ upper: 6, lower: 6 });
    expect(textSplit(13)).toEqual({ upper: 6, lower: 7 });
    const text = '今年秋天搬到城东新居是否顺利';
    expect(hanCount(text + '？ ok')).toBe(14);
    expect(methodNumbers('text', { text }, time)).toMatchObject({ upperNumber: 7, lowerNumber: 7, movingTotal: 14 });
  });

  it('字占 under eleven characters needs the stated numbers', () => {
    expect(() => methodNumbers('text', { text: '问婚姻' }, time)).toThrow();
    expect(methodNumbers('text', { text: '问婚姻', textUpper: 11, textLower: 20 }, time)).toMatchObject({ upperNumber: 11, lowerNumber: 20, movingTotal: 31 });
    expect(shortTextRule(5)).toContain('前2字');
  });

  it('丈尺 ignores the hour; 尺寸 adds it to the moving line', () => {
    expect(methodNumbers('zhang-chi', { major: 2, minor: 5 }, time)).toMatchObject({ upperNumber: 2, lowerNumber: 5, movingTotal: 7 });
    expect(methodNumbers('chi-cun', { major: 3, minor: 4 }, time)).toMatchObject({ upperNumber: 3, lowerNumber: 4, movingTotal: 14 });
  });

  it('端法后天: thing seen above, its direction below, both plus the hour for the line', () => {
    expect(methodNumbers('object-direction', { objectTrigram: '乾', directionTrigram: '离' }, time)).toMatchObject({ upperNumber: 1, lowerNumber: 3, movingTotal: 11 });
    expect(() => methodNumbers('object-direction', { objectTrigram: '乾' }, time)).toThrow();
  });
});
