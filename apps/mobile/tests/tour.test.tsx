/** 新手引导: the arrow goes through the hall, then the stone, one step at a time. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { TOUR, Tour, tour } from '../src/ui/Tour';
import { STRINGS } from '../src/domain/i18n';

const t = STRINGS.zh;
afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
  vi.useRealTimers();
});
beforeEach(() => {
  localStorage.clear();
  tour.reset();
});

/** A thing on screen with a real box (jsdom gives none). */
function place(html: string) {
  const host = document.createElement('div');
  host.innerHTML = html;
  document.body.appendChild(host);
  for (const el of host.querySelectorAll<HTMLElement>('*'))
    el.getBoundingClientRect = () => ({ left: 20, top: 500, right: 120, bottom: 560, width: 100, height: 60, x: 20, y: 500, toJSON() {} }) as DOMRect;
  return host;
}

describe('新手引导', () => {
  it('covers the hall and the stone in order, every step with its words', () => {
    expect(TOUR.map((s) => s.id)).toEqual(['domain', 'entry', 'chosen', 'method', 'cast', 'stone', 'primary', 'mutual', 'changed', 'role', 'relation', 'name', 'grade', 'verdict']);
    for (const s of TOUR) {
      expect(t.tour[s.id].title.length).toBeGreaterThan(1);
      expect(t.tour[s.id].text.length).toBeGreaterThan(10);
      expect(STRINGS.en.tour[s.id].title.length).toBeGreaterThan(1);
    }
    // 年月日时 is said to be the default and the most used; 体 and 用 are explained.
    expect(t.tour.method.text).toMatch(/年月日时.*最常用/);
    expect(t.tour.role.text).toMatch(/没有动爻的一半是「体」.*有动爻的一半是「用」/);
  });

  it('points at the lit thing and waits for the tap where a tap is asked', () => {
    vi.useFakeTimers();
    place('<div class="home-panel"><button data-tour="career">事业工作</button></div>');
    render(<Tour t={t} />);
    act(() => void vi.advanceTimersByTime(400));
    expect(screen.getByRole('dialog', { name: t.tourLabel }).textContent).toContain(t.tour.domain.title);
    expect(screen.getByText(t.tourTapLit)).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.introNext })).toBeNull();
    // Opening the drawer is the tap: on to 「再选具体的事」.
    place('<div class="ask-sheet"><div class="subtype-grid"><button data-tour="career.interview">求职录用</button></div></div>');
    act(() => void vi.advanceTimersByTime(400));
    expect(tour.snapshot().step).toBe(1);
    expect(screen.getByRole('dialog').textContent).toContain(t.tour.entry.title);
  });

  it('explanation steps have 下一步 and 上一步; skipping ends it', () => {
    vi.useFakeTimers();
    tour.go(2);
    place('<div class="home-panel"><div class="chosen-question">求职录用</div><div class="method-line">年月日时</div></div>');
    render(<Tour t={t} />);
    act(() => void vi.advanceTimersByTime(400));
    fireEvent.click(screen.getByRole('button', { name: t.introNext }));
    expect(tour.snapshot().step).toBe(3);
    act(() => void vi.advanceTimersByTime(400));
    fireEvent.click(screen.getByRole('button', { name: t.introPrev }));
    expect(tour.snapshot().step).toBe(2);
    act(() => void vi.advanceTimersByTime(400));
    fireEvent.click(screen.getByRole('button', { name: t.tourSkip }));
    expect(tour.active()).toBe(false);
  });

  it('the 起卦 step moves on only when a cast is made; stone steps wait for the reading', () => {
    tour.cast();
    expect(tour.snapshot().step).toBe(0);
    tour.go(4);
    tour.cast();
    expect(tour.snapshot().step).toBe(5);
    expect(TOUR[5].when).toBe('.view-judgment');
    tour.reset();
    expect(tour.snapshot()).toEqual({ step: 0, done: false });
  });
});
