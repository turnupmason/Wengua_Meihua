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
    const m = createMembership(memoryStore(), { openBeta: false });
    expect(m.canReadFull('c1')).toBe(false);
    expect(m.giftFirst('c1')).toBe(true);
    expect(m.canReadFull('c1')).toBe(true);
    expect(m.isGift('c1')).toBe(true);
    // Never twice.
    expect(m.giftFirst('c2')).toBe(false);
    expect(m.canReadFull('c2')).toBe(false);
    const member = createMembership(memoryStore(), { openBeta: false });
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

  it('offers questions from all six fields in plain words; one tap chooses the entry', async () => {
    const { DOMAINS } = await import('../src/domain/questionCatalog');
    let last: EntryForm = EMPTY_FORM;
    render(<Home onChange={(f) => (last = f)} />);
    const row = screen.getByRole('group', { name: t.commonAsks });
    const words = [...row.querySelectorAll('button')].map((b) => b.textContent);
    expect(words.slice(0, 4)).toEqual(['面试能不能过', '最近有没有新桃花', '想跳槽又怕后悔', '这笔钱能不能要回来']);
    expect(words).toHaveLength(16);
    // Every field is there, and every chip is a real entry.
    const { questionById } = await import('../src/domain/questionCatalog');
    const fields = new Set(['面试能不能过', '最近有没有新桃花', '这笔钱能不能要回来', '东西丢了还能找回吗', '这套房子该不该买', '家人身体让人担心'].map((w) => {
      cleanup();
      render(<Home onChange={(f) => (last = f)} />);
      fireEvent.click(screen.getByRole('button', { name: w }));
      return questionById(last.questionId)!.domain_id;
    }));
    expect(fields).toEqual(new Set(DOMAINS.map((d) => d.domain_id)));
    cleanup();
    render(<Home onChange={(f) => (last = f)} />);
    fireEvent.click(screen.getByRole('button', { name: '想跳槽又怕后悔' }));
    expect(last).toMatchObject({ questionId: 'career.job-change', topicId: 'career', conditions: {} });
    // Chosen: the row folds away with the six fields; 诚心起卦 is the one way in (完整仪式 is 摇签).
    expect(screen.queryByRole('group', { name: t.commonAsks })).toBeNull();
    expect(screen.queryByRole('button', { name: t.shakeTitle })).toBeNull();
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

describe('摇签 (完整仪式)', () => {
  const motion = (x: number) => {
    const e = new Event('devicemotion') as DeviceMotionEvent;
    Object.defineProperty(e, 'acceleration', { value: { x, y: 0, z: 0 } });
    window.dispatchEvent(e);
  };
  const SLIP = { name: '山风蛊', grade: '中下卦', theme: '振疲起衰', poem: '卦中爻象犯小耗，君子占之运不高，婚姻合伙有琐碎，做事必然受苦劳。' };

  it('casts the moment a long enough shake comes to rest (not on a jolt)', () => {
    vi.useFakeTimers();
    let clock = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => clock);
    const onCast = vi.fn();
    render(<ShakeCast t={t} open question="求职录用" onClose={() => {}} onCast={onCast} onContinue={() => {}} onHaptic={() => {}} />);
    // The three 戒 are under the 签筒.
    expect(screen.getByRole('list', { name: t.preceptsTitle }).textContent).toContain('初筮告');
    // A single jolt: nothing.
    act(() => motion(20));
    act(() => void vi.advanceTimersByTime(1000));
    expect(onCast).not.toHaveBeenCalled();
    // Shaking for most of a second, then still: cast at once.
    for (let i = 0; i < 20; i++) {
      clock += 45;
      act(() => motion(i % 2 ? 15 : -15));
    }
    expect(document.querySelector('.qian-tong.is-shaking')).toBeTruthy();
    act(() => void vi.advanceTimersByTime(500));
    expect(screen.getByText(t.shakeDone)).toBeTruthy();
    expect(onCast).toHaveBeenCalledTimes(1);
  });

  it('the slip that fell is shown as 祖师赐卦, with the 本卦’s grade and name, then 请看石案', () => {
    vi.useFakeTimers();
    const onContinue = vi.fn();
    const onBestow = vi.fn();
    const { rerender } = render(<ShakeCast t={t} open onClose={() => {}} onCast={() => {}} onContinue={onContinue} onHaptic={() => {}} onBestow={onBestow} />);
    const tong = screen.getByRole('button', { name: t.shakeTap });
    fireEvent.click(tong);
    fireEvent.click(tong);
    fireEvent.click(tong);
    // The cast is made; the slip shows once it has risen and the cast is known.
    act(() => void vi.advanceTimersByTime(2200));
    expect(document.querySelector('.bestow')).toBeNull();
    rerender(<ShakeCast t={t} open bestow={SLIP} onClose={() => {}} onCast={() => {}} onContinue={onContinue} onHaptic={() => {}} onBestow={onBestow} />);
    expect(screen.getByLabelText(`${t.bestowed} 中下卦 山风蛊`)).toBeTruthy();
    expect(screen.getByText('中下卦')).toBeTruthy();
    // One short line of the 签意 (the poem's first couplet), no long explanation.
    expect(document.querySelector('.bestow-poem')?.textContent).toBe('卦中爻象犯小耗，君子占之运不高。');
    expect(document.querySelector('.bestow-note')).toBeNull();
    expect(screen.getByText('山风蛊')).toBeTruthy();
    expect(onBestow).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: t.bestowGo }));
    expect(onContinue).toHaveBeenCalled();
  });
});

describe('六大领域的高亮', () => {
  it('stays on the field last tapped after its drawer closes, not the chosen matter’s field', async () => {
    const { HomeOverlay: Home, EMPTY_FORM: EMPTY } = await import('../src/ui/HomeOverlay');
    const { defaultSettings: defaults } = await import('../src/domain/settings');
    render(<Home t={t} settings={{ ...defaults(), lang: 'zh' }} form={{ ...EMPTY, questionId: 'career.promotion-pay', topicId: 'career' }} error={null} onForm={() => {}} onSettings={() => {}} onEnter={() => {}} onLibrary={() => {}} onHistory={() => {}} onTitle={() => {}} onDebug={() => {}} pace="full" />);
    // A matter in 事业工作 is chosen; open the six fields and look into 财富财运 without choosing.
    fireEvent.click(document.querySelector('.chosen-question')!);
    fireEvent.click(screen.getByRole('button', { name: t.close }));
    fireEvent.click(screen.getByRole('radio', { name: /财富财运/ }));
    fireEvent.click(screen.getByRole('button', { name: t.close }));
    expect(screen.getByRole('radio', { name: /财富财运/ }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('radio', { name: /事业工作/ }).getAttribute('aria-checked')).toBe('false');
  });
});
