/** Closing as gently as opening: a closed sheet stays a moment, playing out, then goes. */
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { Exit, EXIT_MS } from '../src/ui/Exit';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

it('keeps the last sheet while it closes — hidden from reading and taps — then removes it', () => {
  vi.useFakeTimers();
  const sheet = (open: boolean, label: string) => <Exit show={open}>{open && <section role="dialog" aria-label={label} className="sheet" />}</Exit>;
  const { rerender, container } = render(sheet(true, '设置'));
  expect(container.querySelector('.exit-wrap.is-closing')).toBeNull();
  rerender(sheet(false, '设置'));
  // Still there, as it was, playing its way out.
  const wrap = container.querySelector('.exit-wrap.is-closing')!;
  expect(wrap.querySelector('[aria-label="设置"]')).toBeTruthy();
  expect(wrap.getAttribute('aria-hidden')).toBe('true');
  expect(wrap.hasAttribute('inert')).toBe(true);
  act(() => void vi.advanceTimersByTime(EXIT_MS + 10));
  expect(container.querySelector('.sheet')).toBeNull();
  // Never shown: nothing to close.
  rerender(<Exit show={false}>{null}</Exit>);
  expect(container.innerHTML).toBe('');
});
