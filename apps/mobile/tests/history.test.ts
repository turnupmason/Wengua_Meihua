import { describe, expect, it } from 'vitest';
import { createHistory } from '../src/domain/history';
import { freezeCast } from '../src/domain/cast';
import { createRequestGate } from '../src/domain/requestGate';
import { buildInterpretationInput, guardInterpretation, interpretSafely, type InterpretationProvider } from '../src/domain/interpretation';
import { memoryStore, testKnowledge } from './helpers';

describe('local history', () => {
  it('saves once, deletes, exports and survives corrupt storage', async () => {
    const { library } = await testKnowledge();
    const store = memoryStore();
    const h = createHistory(store, memoryStore());
    const a = freezeCast(library, { method: 'manual', manual: { primaryId: 49, movingLine: 1 }, instant: new Date(), timeZone: 'UTC', question: '测试' });
    const b = freezeCast(library, { method: 'classical-time', instant: '2026-11-10T15:00:00Z', timeZone: 'America/New_York' });
    h.save(a);
    h.save(a);
    h.save(b);
    expect(h.list().map((r) => r.castId)).toEqual([b.castId, a.castId]);
    expect(JSON.parse(h.exportJSON()).records).toHaveLength(2);
    h.remove(a.castId);
    expect(h.list()).toHaveLength(1);
    store.setItem('wengua.history.v1', '{not json');
    expect(h.list()).toEqual([]);
  });

  it('remembers the active cast for resume and clears it on delete', async () => {
    const { library } = await testKnowledge();
    const h = createHistory(memoryStore(), memoryStore());
    const a = freezeCast(library, { method: 'manual', manual: { primaryId: 3, movingLine: 2 }, instant: new Date(), timeZone: 'UTC' });
    h.save(a);
    h.setActive(a.castId, 'incense');
    expect(h.getActive()).toEqual({ castId: a.castId, phase: 'incense' });
    h.remove(a.castId);
    expect(h.getActive()).toBeNull();
  });
});

describe('request ordering', () => {
  it('a slow older response never overrides a newer tap', async () => {
    const gate = createRequestGate();
    const shown: number[] = [];
    const delayed = (v: number, ms: number) => gate.run(() => new Promise<number>((r) => setTimeout(() => r(v), ms)));
    const results = await Promise.all([delayed(1, 30), delayed(2, 5), delayed(3, 15)]);
    results.forEach((r) => r.current && shown.push(r.value!));
    expect(shown).toEqual([3]);
  });
});

describe('interpretation guard', () => {
  it('rejects changed facts and unknown citations; falls back locally', async () => {
    const { library } = await testKnowledge();
    const reading = library.createReading({ primaryId: 49, movingLine: 1 });
    const input = buildInterpretationInput(reading);
    const ok = { provider: 'x', summary: 's', stageNotes: [], citations: [input.passages[0].id] };
    expect(guardInterpretation(input, ok)).toBe(ok);
    expect(() => guardInterpretation(input, { ...ok, citations: ['made-up'] })).toThrow();
    expect(() => guardInterpretation(input, { ...ok, echoedFacts: { grades: ['上上卦', '上上卦', '上上卦'] } })).toThrow();
    expect(() => guardInterpretation(input, { ...ok, echoedFacts: { movingLine: 2 } })).toThrow();
    const broken: InterpretationProvider = { id: 'broken', interpret: async () => { throw new Error('offline'); } };
    const fallback = await interpretSafely(broken, input);
    expect(fallback.provider).toBe('local-sources-v1');
    expect(fallback.summary).toContain('天风姤（中卦）');
  });
});
