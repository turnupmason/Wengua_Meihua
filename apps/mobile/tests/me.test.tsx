/** 我的: who is signed in, what has been asked, how often 应期 came true, and the ways on. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MeScreen, type MeData } from '../src/ui/MeScreen';
import { STRINGS } from '../src/domain/i18n';
import type { CastRecord } from '../src/domain/cast';

afterEach(cleanup);
const t = STRINGS.zh;
const rec = (castId: string, question: string) =>
  ({ castId, question, questionId: 'career.interview', createdAt: '2026-11-14T03:00:00.000Z', stages: { primary: { id: 4, name: '山水蒙' }, mutual: { name: '地雷复' }, changed: { name: '地水师' } } }) as unknown as CastRecord;

function data(over: Partial<MeData> = {}): MeData {
  return {
    name: '清和', id: 'A1B2C3D4', guest: false,
    records: [rec('a', '求职录用'), rec('b', '跳槽去留'), rec('c', '考试选拔'), rec('d', '晋升加薪')],
    saved: 2, met: 19, tally: { happened: 3, not: 1, unsure: 2 },
    symbolOf: () => '䷃', questionOf: (r) => r.question,
    onOpenRecord: vi.fn(), onRecords: vi.fn(), onSaved: vi.fn(), onLibrary: vi.fn(), onSignIn: vi.fn(), onSignOut: vi.fn(),
    ...over,
  };
}

describe('我的', () => {
  it('shows the account, the beta card and the counts — 已反馈, not a 应验率', () => {
    render(<MeScreen t={t} lang="zh" data={data()} onClose={() => {}} onSettings={() => {}} />);
    expect(screen.getByText('清和')).toBeTruthy();
    expect(screen.getByText('ID A1B2C3D4')).toBeTruthy();
    expect(screen.getByText(t.meBetaTitle)).toBeTruthy();
    const stats = [...document.querySelectorAll('.me-stats p')].map((p) => p.textContent);
    // 应了 3, 没应 1, 说不准 2: six answered; no rate is shown.
    expect(stats).toEqual(['4累计问卦', '2已收藏', '19/64卦册结识', '6已反馈']);
    expect(screen.getByText(t.meHitsLine(6))).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/应验率|%/);
  });

  it('lists the latest three casts, opens one, and goes on to 问事录, 卦册 and 设置', () => {
    const d = data();
    const settings = vi.fn();
    render(<MeScreen t={t} lang="zh" data={d} onClose={() => {}} onSettings={settings} />);
    const recent = [...document.querySelectorAll('.me-recent b')].map((b) => b.textContent);
    expect(recent).toEqual(['求职录用', '跳槽去留', '考试选拔']);
    fireEvent.click(screen.getByRole('button', { name: /跳槽去留/ }));
    expect(d.onOpenRecord).toHaveBeenCalledWith(d.records[1]);
    fireEvent.click(screen.getByRole('button', { name: /卦册/ }));
    expect(d.onLibrary).toHaveBeenCalled();
    // 设置: the gear in the header and the row in the menu.
    expect(screen.getAllByRole('button', { name: t.settings })).toHaveLength(2);
    fireEvent.click(screen.getAllByRole('button', { name: t.settings })[0]);
    expect(settings).toHaveBeenCalled();
  });

  it('a guest is offered 登录, with no id; before any answer the row says what it is for', () => {
    const d = data({ name: '', guest: true, id: '', tally: { happened: 0, not: 0, unsure: 0 } });
    render(<MeScreen t={t} lang="zh" data={d} onClose={() => {}} onSettings={() => {}} />);
    expect(screen.getByText(t.meGuest)).toBeTruthy();
    expect(document.querySelector('.me-id')).toBeNull();
    expect([...document.querySelectorAll('.me-stats p')][3].textContent).toBe('0已反馈');
    expect(screen.getByText('记录问事结果，回看卦象变化')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: t.meSignIn }));
    expect(d.onSignIn).toHaveBeenCalled();
  });
});
