/** First reading in full, 常问, 今日一卦, 卦册 and 摇签. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { createMembership } from '../src/domain/membership';
import { createCollection, createDaily } from '../src/domain/daily';
import { createCalendarProvider } from '../src/domain/calendar';
import { STRINGS } from '../src/domain/i18n';
import { defaultSettings } from '../src/domain/settings';
import { EMPTY_FORM, HomeOverlay, type EntryForm } from '../src/ui/HomeOverlay';
import { ShakeCast } from '../src/ui/ShakeCast';
import { DailyCard } from '../src/ui/DailyCard';
import { memoryStore, testKnowledge } from './helpers';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
const t = STRINGS.zh;

describe('第一卦的详断', () => {
  it('is given once, to the first written reading, and not to members', () => {
    const m = createMembership(memoryStore());
    expect(m.canReadFull('c1')).toBe(false);
    expect(m.giftFirst('c1')).toBe(true);
    expect(m.canReadFull('c1')).toBe(true);
    expect(m.isGift('c1')).toBe(true);
    // Never twice.
    expect(m.giftFirst('c2')).toBe(false);
    expect(m.canReadFull('c2')).toBe(false);
    const member = createMembership(memoryStore());
    member.grant('wengua.member.monthly', null);
    expect(member.giftFirst('c3')).toBe(false);
    expect(member.isGift('c3')).toBe(false);
  });
});

describe('常问', () => {
  function Home({ onChange }: { onChange: (f: EntryForm) => void }) {
    const [form, setForm] = useState<EntryForm>(EMPTY_FORM);
    return (
      <HomeOverlay
        t={t}
        settings={{ ...defaultSettings(), lang: 'zh' }}
        form={form}
        error={null}
        onForm={(f) => {
          setForm(f);
          onChange(f);
        }}
        onSettings={() => {}}
        onEnter={() => {}}
        onLibrary={() => {}}
        onHistory={() => {}}
        onTitle={() => {}}
        onDebug={() => {}}
        pace="full"
      />
    );
  }

  it('offers the written entries in plain words; one tap chooses the entry', () => {
    let last: EntryForm = EMPTY_FORM;
    render(<Home onChange={(f) => (last = f)} />);
    const row = screen.getByRole('group', { name: t.commonAsks });
    expect([...row.querySelectorAll('button')].map((b) => b.textContent)).toEqual(['面试能不能过', '想跳槽又怕后悔', '这次考试能过吗', '升职加薪有没有戏']);
    fireEvent.click(screen.getByRole('button', { name: '想跳槽又怕后悔' }));
    expect(last).toMatchObject({ questionId: 'career.job-change', topicId: 'career', conditions: {} });
    // Chosen: the row folds away with the six fields, and 摇签 is offered beside 诚心起卦 (a time cast).
    expect(screen.queryByRole('group', { name: t.commonAsks })).toBeNull();
    expect(screen.getByRole('button', { name: t.shakeTitle })).toBeTruthy();
  });
});

describe('今日一卦 and 卦册', () => {
  it('takes the hexagram of the first moment in the hall each day, by 年月日时, and keeps it for the day', async () => {
    const { library } = await testKnowledge();
    const store = memoryStore();
    // Local times: 今日 is the device's own calendar day.
    let now = new Date(2026, 10, 14, 9, 30);
    const daily = createDaily(store, () => now);
    const cal = createCalendarProvider();
    const a = daily.today(library, cal, 'Asia/Shanghai');
    // The same as a time cast at that moment.
    const c = cal.resolve({ instant: now, timeZone: 'Asia/Shanghai' });
    const cast = library.castByTimeParts({ yearBranchNumber: c.yearBranchNumber, lunarMonth: c.castingMonthNumber, lunarDay: c.lunar.day, hourBranchNumber: c.hourBranchNumber });
    expect([a.primaryId, a.movingLine]).toEqual([cast.primaryId, cast.movingLine]);
    expect(a.seen).toBe(false);
    now = new Date(2026, 10, 14, 21, 0);
    expect(daily.today(library, cal, 'Asia/Shanghai')).toEqual(a);
    daily.markSeen();
    expect(daily.today(library, cal, 'Asia/Shanghai').seen).toBe(true);
    now = new Date(2026, 10, 16, 9, 30);
    expect(daily.today(library, cal, 'Asia/Shanghai')).toMatchObject({ seen: false });
  });

  it('counts each hexagram once, first meeting kept, and survives bad storage', () => {
    const store = memoryStore();
    const met = createCollection(store, () => new Date('2026-11-14T09:00:00Z'));
    expect(met.meet([18, 54, 57, 18], 'cast')).toEqual([18, 54, 57]);
    expect(met.meet([57, 4], 'daily')).toEqual([4]);
    expect(met.count()).toBe(4);
    expect(met.all()[57].via).toBe('cast');
    expect(met.meet([0, 65, 1.5], 'cast')).toEqual([]);
    store.setItem('wengua.met.v1', '{bad');
    expect(createCollection(store).count()).toBe(0);
  });

  it('the hall line opens a slip with the 卦辞 and the moving line; closing marks it seen', () => {
    const onSeen = vi.fn();
    const daily = { id: 18, name: '山风蛊', theme: '振疲起衰', bits: [0, 1, 1, 0, 0, 1], text: '蛊：元亨，利涉大川。', vernacular: '白话', imageVernacular: '', movingLine: 5, line: { label: '六五', text: '干父之蛊，用誉。', vernacular: '六五白话' }, timeLabel: '丙午年 十月 初六 巳时', seen: false, onSeen, onRead: vi.fn() };
    render(<DailyCard t={t} daily={daily} />);
    fireEvent.click(screen.getByRole('button', { name: /今日一卦/ }));
    const slip = screen.getByRole('dialog', { name: '今日一卦' });
    expect(slip.textContent).toContain('干父之蛊，用誉。');
    expect(slip.textContent).toContain(t.dailyNote);
    fireEvent.click(screen.getByRole('button', { name: t.coachOk }));
    expect(onSeen).toHaveBeenCalled();
  });
});

describe('摇签', () => {
  const motion = (x: number) => {
    const e = new Event('devicemotion') as DeviceMotionEvent;
    Object.defineProperty(e, 'acceleration', { value: { x, y: 0, z: 0 } });
    window.dispatchEvent(e);
  };

  it('casts when a long enough shake comes to rest (not on a jolt)', () => {
    vi.useFakeTimers();
    let clock = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => clock);
    const onCast = vi.fn();
    const onClose = vi.fn();
    render(<ShakeCast t={t} open onClose={onClose} onCast={onCast} onHaptic={() => {}} />);
    // A single jolt: nothing.
    act(() => motion(20));
    act(() => void vi.advanceTimersByTime(1000));
    expect(onCast).not.toHaveBeenCalled();
    // Shaking for most of a second, then still.
    for (let i = 0; i < 20; i++) {
      clock += 45;
      act(() => motion(i % 2 ? 15 : -15));
    }
    expect(document.querySelector('.qian-tong.is-shaking')).toBeTruthy();
    act(() => void vi.advanceTimersByTime(500));
    expect(screen.getByText(t.shakeDone)).toBeTruthy();
    act(() => void vi.advanceTimersByTime(700));
    expect(onClose).toHaveBeenCalled();
    expect(onCast).toHaveBeenCalledTimes(1);
  });

  it('three taps on the 签筒 do the same where there is no motion', () => {
    vi.useFakeTimers();
    const onCast = vi.fn();
    render(<ShakeCast t={t} open onClose={() => {}} onCast={onCast} onHaptic={() => {}} />);
    const tong = screen.getByRole('button', { name: t.shakeTap });
    fireEvent.click(tong);
    fireEvent.click(tong);
    expect(onCast).not.toHaveBeenCalled();
    fireEvent.click(tong);
    act(() => void vi.advanceTimersByTime(700));
    expect(onCast).toHaveBeenCalledTimes(1);
  });
});
