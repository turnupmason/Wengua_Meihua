/** 应期回访: asked when a 应期 comes, kept beside the record, misses as plainly as hits. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createFollowups, reminderAt, timingOf, upcomingReminders } from '../src/domain/followup';
import { reminderId } from '../src/domain/reminders';
import type { CastRecord } from '../src/domain/cast';
import { createJournal } from '../src/domain/journal';
import { STRINGS } from '../src/domain/i18n';
import { FollowupCard } from '../src/ui/FollowupCard';
import { RecordDetail } from '../src/ui/RecordDetail';
import { memoryStore } from './helpers';

afterEach(cleanup);
const t = STRINGS.zh;

const win = (dates: string[], valence = '吉', event = '落实能解决实际分歧的协作') => ({ event, valence, text: `可留意本月前后，${event}。`, dates });
const rec = (castId: string, windows: ReturnType<typeof win>[], questionId = 'career.job-change') =>
  ({
    schema: 'wengua.cast/1',
    castId,
    questionId,
    question: '跳槽去留',
    primaryId: 39,
    movingLine: 1,
    localWallClock: '2026-11-13T16:55',
    createdAt: '2026-11-13T21:55:00.000Z',
    stages: { primary: { name: '水山蹇' }, mutual: { name: '火水未济' }, changed: { name: '水火既济' } },
    judgment: { state: 'ready', title: '有力先停下来处理问题', short: '眼下先做现职。', paragraphs: [], timing: { referenceNote: '', windows }, calculation: [], sources: [], castingDate: '2026-11-13', dayGanzhi: '戊子', monthBranch: '亥' },
  }) as unknown as CastRecord;

const at = (iso: string) => () => new Date(iso);

describe('应期回访', () => {
  it('reads a record’s dated windows (none without a written 断语)', () => {
    const r = rec('a', [win(['2026-11-22', '2026-11-21']), win([])]);
    expect(timingOf(r)).toEqual([expect.objectContaining({ castId: 'a', index: 0, first: '2026-11-21', last: '2026-11-22' })]);
    expect(timingOf({ castId: 'b', judgment: { state: 'missing', season: null, reason: 'pending-authoring' } } as unknown as CastRecord)).toEqual([]);
  });

  it('asks once a window has begun, newest first; not before, not after a month, not twice in a day when put off', () => {
    const store = memoryStore();
    const records = [rec('old', [win(['2026-09-01'])]), rec('soon', [win(['2026-11-21', '2026-11-22'])]), rec('now', [win(['2026-11-13', '2026-11-14'])]), rec('earlier', [win(['2026-11-10'])])];
    const f = createFollowups(store, at('2026-11-14T09:00:00'));
    expect(f.due(records).map((w) => w.castId)).toEqual(['now', 'earlier']);
    f.later('now');
    expect(f.due(records).map((w) => w.castId)).toEqual(['earlier']);
    // The next day it asks again.
    expect(createFollowups(store, at('2026-11-15T09:00:00')).due(records).map((w) => w.castId)).toEqual(['now', 'earlier']);
    f.answer('earlier', 0, 'not');
    expect(f.due(records)).toEqual([]);
  });

  it('keeps every answer, counts them honestly, and can be cleared or redone', () => {
    const f = createFollowups(memoryStore(), at('2026-11-14T20:30:00'));
    const records = [rec('a', [win(['2026-11-13']), win(['2026-11-14'], '凶')]), rec('b', [win(['2026-11-12'])])];
    f.answer('a', 0, 'happened');
    f.answer('a', 1, 'not');
    f.answer('b', 0, 'unsure');
    expect(f.answerOf('a', 0)).toEqual({ outcome: 'happened', at: new Date('2026-11-14T20:30:00').toISOString() });
    expect(f.tally(records)).toEqual({ happened: 1, not: 1, unsure: 1 });
    f.answer('a', 0, null);
    expect(f.tally(records)).toEqual({ happened: 0, not: 1, unsure: 1 });
    // A deleted record no longer counts.
    f.remove('b');
    expect(f.tally(records)).toEqual({ happened: 0, not: 1, unsure: 0 });
  });

  it('survives corrupt storage', () => {
    const store = memoryStore();
    store.setItem('wengua.followup.v1', '{oops');
    expect(createFollowups(store).answers('x')).toEqual({});
    store.setItem('wengua.followup.v1', JSON.stringify({ a: { answers: { 0: { outcome: 'maybe', at: 'x' }, 1: { outcome: 'not', at: 'y' } } } }));
    expect(createFollowups(store).answers('a')).toEqual({ 1: { outcome: 'not', at: 'y' } });
  });

  it('reminds at 8 pm on a window’s last day, only for windows still to come and unanswered', () => {
    expect(reminderAt({ last: '2026-11-22' })).toEqual(new Date(2026, 10, 22, 20, 0, 0));
    const f = createFollowups(memoryStore(), at('2026-11-14T09:00:00'));
    const records = [rec('a', [win(['2026-11-21', '2026-11-22']), win(['2026-11-14'])]), rec('b', [win(['2026-11-13'])]), rec('c', [win(['2026-11-30'])])];
    f.answer('c', 0, 'happened');
    const up = upcomingReminders(records, f, new Date('2026-11-14T09:00:00'));
    expect(up.map((w) => [w.castId, w.index, w.last])).toEqual([['a', 1, '2026-11-14'], ['a', 0, '2026-11-22']]);
    // One id per window, the same every time.
    expect(reminderId('a', 0)).toBe(reminderId('a', 0));
    expect(reminderId('a', 0)).not.toBe(reminderId('a', 1));
    expect(reminderId('a', 0)).toBeGreaterThan(0);
  });

  it('the hall: one line, then the question on a slip; one tap answers', () => {
    const r = rec('a', [win(['2026-11-13', '2026-11-14'])]);
    const onAnswer = vi.fn();
    const ask = { w: timingOf(r)[0], question: '跳槽去留', when: '11月13–14日', onAnswer, onLater: vi.fn(), onOpen: vi.fn() };
    render(<FollowupCard t={t} ask={ask} lang="zh" />);
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /「跳槽去留」的应期到了/ }));
    const slip = screen.getByRole('dialog', { name: '应期回访' });
    expect(slip.textContent).toContain('11月13–14日前后');
    expect(slip.textContent).toContain('落实能解决实际分歧的协作');
    fireEvent.click(screen.getByRole('button', { name: '应了' }));
    expect(onAnswer).toHaveBeenCalledWith('happened');
    expect(screen.getByRole('status').textContent).toBe(t.fuThanks);
  });

  it('the record: what the reading said (当初) above what happened (后来), answerable once begun', () => {
    const f = createFollowups(memoryStore());
    const today = new Date();
    const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const later = new Date(today.getTime() + 9 * 864e5);
    const r = rec('a', [win([iso(today)]), win([iso(later)], '凶', '中段核对岗位要求时可能受阻')]);
    const changed = vi.fn();
    render(<RecordDetail record={r} journal={createJournal(memoryStore())} followups={f} t={t} onOpen={() => {}} onBack={() => {}} onChanged={changed} />);
    const rows = document.querySelectorAll('.fu-record li');
    expect(rows).toHaveLength(2);
    expect(rows[0].querySelector('.fu-then')!.textContent).toContain('落实能解决实际分歧的协作');
    expect(rows[1].textContent).toContain(t.fuNotYet);
    fireEvent.click(screen.getByRole('button', { name: '没应' }));
    expect(f.answerOf('a', 0)?.outcome).toBe('not');
    expect(changed).toHaveBeenCalled();
    expect(rows[0].querySelector('.fu-outcome')!.textContent).toMatch(/^没应 · \d+月\d+日记下$/);
    // Without the 详断 (its 应期 are part of it), nothing is asked.
    cleanup();
    render(<RecordDetail record={r} journal={createJournal(memoryStore())} followups={null} t={t} onOpen={() => {}} onBack={() => {}} onChanged={() => {}} />);
    expect(document.querySelector('.fu-record')).toBeNull();
  });
});
