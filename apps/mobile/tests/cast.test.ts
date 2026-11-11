import { describe, expect, it } from 'vitest';
import { freezeCast, readingFromCast, snapshotDrift } from '../src/domain/cast';
import { ritualReducer, INITIAL_RITUAL, type RitualState, type RitualEvent } from '../src/domain/ritual';
import { testKnowledge } from './helpers';

describe('casting and freezing', () => {
  it('年月日时起例 uses calendar parts, not Gregorian numbers', async () => {
    const { library } = await testKnowledge();
    const rec = freezeCast(library, { method: 'classical-time', instant: '2026-11-10T15:00:00Z', timeZone: 'America/New_York' });
    const c = rec.calendar!;
    const expected = library.castByTimeParts({ yearBranchNumber: c.yearBranchNumber, lunarMonth: c.castingMonthNumber, lunarDay: c.lunar.day, hourBranchNumber: c.hourBranchNumber });
    expect([rec.primaryId, rec.movingLine]).toEqual([expected.primaryId, expected.movingLine]);
    expect(rec.methodSources).toContain('年月日时起例');
    expect(rec.rawInputs).toMatchObject({ yearBranchNumber: c.yearBranchNumber, lunarDay: c.lunar.day });
    expect(rec.context.monthBranch).toBe(c.monthBranch);
    expect(rec.context.dayGanzhi).toBe(c.dayGanzhi);
    expect(rec.timeZone).toBe('America/New_York');
    expect(rec.utcOffsetMinutes).toBe(-300);
  });

  it('物数占例: number for upper, hour for lower, sum for the moving line', async () => {
    const { library } = await testKnowledge();
    const rec = freezeCast(library, { method: 'object-count', objectCount: 11, instant: '2026-11-10T15:00:00Z', timeZone: 'America/New_York' });
    const h = rec.calendar!.hourBranchNumber;
    const expected = library.castByTrigramNumbers({ upperNumber: 11, lowerNumber: h, movingTotal: 11 + h });
    expect([rec.primaryId, rec.movingLine]).toEqual([expected.primaryId, expected.movingLine]);
    expect(rec.methodSources[0]).toBe('物数占例');
    expect(() => freezeCast(library, { method: 'object-count', objectCount: 0, instant: new Date(), timeZone: 'UTC' })).toThrow();
  });

  it('49 初爻: 革 → 姤 → 咸, and 姤 shows 中卦 (canonical middle tier)', async () => {
    const { library } = await testKnowledge();
    const rec = freezeCast(library, { method: 'manual', manual: { primaryId: 49, movingLine: 1 }, instant: new Date(), timeZone: 'UTC' });
    expect([rec.stages.primary.name, rec.stages.mutual.name, rec.stages.changed.name]).toEqual(['泽火革', '天风姤', '泽山咸']);
    expect(rec.stages.mutual.displayGrade).toBe('中卦');
    expect(rec.stages.mutual.canonicalGrade).toBe('中中卦');
    expect(rec.stages.primary.displayGrade).toBe(library.getHexagram(49).grade.rawGrade);
    // Manual casts without explicit context leave it missing instead of guessing.
    expect(rec.context).toEqual({ monthBranch: null, dayGanzhi: null, voidBasis: null });
    const reading = readingFromCast(library, rec);
    expect(reading.contextualAssessment.missing).toEqual(['calendar-context', 'void-ganzhi']);
  });

  it('frozen records are immutable and reproduce the same reading', async () => {
    const { library } = await testKnowledge();
    const rec = freezeCast(library, { method: 'classical-time', instant: '2026-03-08T07:30:00Z', timeZone: 'America/New_York' });
    expect(Object.isFrozen(rec)).toBe(true);
    expect(Object.isFrozen(rec.stages.primary)).toBe(true);
    expect(() => {
      (rec as { movingLine: number }).movingLine = 6;
    }).toThrow();
    const reading = readingFromCast(library, rec);
    expect(reading.castId).toBe(rec.castId);
    expect(snapshotDrift(rec, reading)).toEqual([]);
    expect(reading.selectedMovingLine.hexagramId).toBe(rec.primaryId);
    expect(reading.selectedMovingLine.position).toBe(rec.movingLine);
  });

  it('skipping and full ritual reach reading with the same single cast', async () => {
    const { library } = await testKnowledge();
    let freezes = 0;
    const frozen: { rec: ReturnType<typeof freezeCast> | null } = { rec: null };
    const ensureCast = () => {
      if (!frozen.rec) {
        freezes += 1;
        frozen.rec = freezeCast(library, { method: 'classical-time', instant: '2026-11-10T15:00:00Z', timeZone: 'America/Los_Angeles' });
      }
      return frozen.rec;
    };
    const run = (events: (s: RitualState) => RitualEvent[]) => {
      let s = INITIAL_RITUAL;
      for (const e of events(s)) s = ritualReducer(s, e);
      return s;
    };
    const full = run(() => [
      { type: 'BEGIN', castId: ensureCast().castId }, { type: 'BEGIN', castId: 'another' },
      { type: 'PHASE_DONE', phase: 'entering' }, { type: 'PHASE_DONE', phase: 'revealing' },
    ]);
    const skipped = run(() => [{ type: 'BEGIN', castId: ensureCast().castId }, { type: 'SKIP', castId: ensureCast().castId }, { type: 'SKIP', castId: 'x' }]);
    expect(full.phase).toBe('reading');
    expect(skipped.phase).toBe('reading');
    expect(full.castId).toBe(skipped.castId);
    expect(freezes).toBe(1);
  });
});
