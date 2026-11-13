/** First-use guidance and the 问事录 paths the review asked for. */
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { CoachIntro, CoachTip, coach } from '../src/ui/coach';
import { STRINGS } from '../src/domain/i18n';
import { RecordDetail } from '../src/ui/RecordDetail';
import { HistoryScreen } from '../src/ui/HistoryScreen';
import { createJournal } from '../src/domain/journal';
import { createHistory } from '../src/domain/history';
import { freezeCast, withJudgment } from '../src/domain/cast';
import { memoryStore, testKnowledge } from './helpers';

afterEach(() => {
  cleanup();
  act(() => coach.reset());
});
const t = STRINGS.zh;

describe('first-use guidance', () => {
  it('opens with the five-page introduction, which goes away for good when finished or skipped', () => {
    act(() => coach.reset());
    render(<CoachIntro t={t} />);
    const intro = screen.getByRole('dialog', { name: t.introLabel });
    expect([...intro.querySelectorAll('.intro-page h2')].map((h) => h.textContent)).toEqual([t.introAskTitle, t.introCastTitle, t.introStoneTitle, t.introReadTitle, t.introKeepTitle]);
    // No popup while the introduction is open.
    expect(coach.shows('domain')).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: t.introSkip }));
    expect(screen.queryByRole('dialog', { name: t.introLabel })).toBeNull();
    expect(coach.shows('intro')).toBe(false);
    expect(coach.shows('domain')).toBe(true);
  });

  it('shows one popup at a time, each once; 跳过引导 ends them all and 重看 brings them back', () => {
    act(() => {
      coach.reset();
      coach.done('intro');
    });
    const tips = () =>
      render(
        <>
          <div className="a" style={{ width: 10, height: 10 }} />
          <CoachTip id="domain" t={t} text={t.coachDomain} anchor=".a" />
          <CoachTip id="cast" t={t} text={t.coachCast} anchor=".a" />
        </>,
      );
    tips();
    expect(screen.getByText(t.coachDomain)).toBeTruthy();
    expect(screen.queryByText(t.coachCast)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: t.coachOk }));
    expect(screen.queryByText(t.coachDomain)).toBeNull();
    expect(screen.getByText(t.coachCast)).toBeTruthy();
    cleanup();
    tips();
    // Seen once: not again.
    expect(screen.queryByText(t.coachDomain)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: t.coachSkip }));
    expect(screen.queryByText(t.coachCast)).toBeNull();
    act(() => coach.reset());
    // Back from the start: the introduction first, then the popups.
    expect(coach.shows('intro')).toBe(true);
    expect(screen.queryByText(t.coachDomain)).toBeNull();
  });
});

describe('问事录', () => {
  const record = async () => {
    const { library } = await testKnowledge();
    const base = freezeCast(library, { method: 'manual', manual: { primaryId: 48, movingLine: 5 }, instant: new Date('2026-11-11T09:00:00+08:00'), timeZone: 'Asia/Shanghai', question: '求职录用', questionId: 'career.interview', domainId: 'domain-09', topicId: 'career' });
    return withJudgment(base, { state: 'ready', source: 'product', questionId: 'career.interview', primaryId: 48, movingLine: 5, title: '有望通过，细节确认时要答得完整', short: '这轮面试有望通过。', paragraphs: [], calculation: [], sources: [], timing: null } as never);
  };

  it('lists a record by what was asked and what the 断语 said, the hexagrams after', async () => {
    const r = await record();
    const history = createHistory(memoryStore(), memoryStore());
    history.save(r);
    render(<HistoryScreen history={history} journal={createJournal(memoryStore())} t={t} onOpen={() => {}} onBack={() => {}} />);
    const item = document.querySelector('.history-main')!;
    expect([...item.children].map((c) => c.className)).toEqual(['history-top', 'history-verdict', 'history-meta']);
    expect(item.querySelector('.history-verdict')!.textContent).toBe('有望通过，细节确认时要答得完整');
    // The time beside the title; the small line is the hexagrams only.
    expect(item.querySelector('.history-top .history-when')!.textContent).toMatch(/\d{1,2}:\d{2}$/);
    expect(item.querySelector('.history-meta')!.textContent).not.toMatch(/\d{1,2}:\d{2}/);
    // 删除 is in the card's menu.
    expect(screen.queryByRole('menuitem', { name: t.delete })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: t.moreActions }));
    expect(screen.getByRole('menuitem', { name: t.delete })).toBeTruthy();
  });

  it('says when a record was cast as a list would: today, yesterday, a date', async () => {
    const { recordWhen } = await import('../src/ui/timeText');
    const now = new Date(2026, 10, 13, 15, 0);
    expect(recordWhen('2026-11-13T13:38', 'zh', now)).toBe('今天 13:38');
    expect(recordWhen('2026-11-12T20:23', 'zh', now)).toBe('昨天 20:23');
    expect(recordWhen('2026-11-02T09:05', 'zh', now)).toBe('11月2日 09:05');
    expect(recordWhen('2025-12-31T23:10', 'zh', now)).toBe('2025年12月31日 23:10');
  });

  it('opens the whole 断语 in one tap, or the stone', async () => {
    const r = await record();
    const opened: (boolean | undefined)[] = [];
    render(<RecordDetail record={r} journal={createJournal(memoryStore())} t={t} onOpen={(read) => opened.push(read)} onBack={() => {}} onChanged={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: t.rdOpenReading }));
    fireEvent.click(screen.getByRole('button', { name: t.rdOpenStone }));
    expect(opened).toEqual([true, false]);
    // No bookkeeping version line for the reader.
    expect(document.body.textContent).not.toMatch(/内容版本/);
  });
});
