/** The sign-in screen: short, equal buttons, the long explanation one tap away, and a welcome after. */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Splash } from '../src/ui/Splash';
import { STRINGS } from '../src/domain/i18n';
import { localAuth } from '../src/domain/profile';

afterEach(cleanup);
const t = STRINGS.zh;
const login = (welcoming = false) => render(<Splash t={t} progress={null} leaving={false} onEnter={() => {}} mode="login" auth={localAuth} onSignIn={() => {}} welcoming={welcoming} />);

describe('Sign-in screen', () => {
  it('keeps the long explanation off the page until 「了解来源」 is tapped, below the buttons, the face left clear', () => {
    const { container } = login();
    expect(screen.queryByText(t.modelStory[0])).toBeNull();
    // Nothing over the face: the title keeps only the name and 三清殿 · 梅花易数.
    expect(container.querySelector('.splash-title .model-badge, .splash-title .about-link')).toBeNull();
    expect(container.querySelector('.splash-foot .about-link')!.textContent).toMatch(/人工审查/);
    fireEvent.click(screen.getByRole('button', { name: `${t.aboutJudgments} ›` }));
    const card = screen.getByRole('dialog', { name: t.modelStoryTitle });
    for (const line of t.modelStory) expect(card.textContent).toContain(line);
    fireEvent.click(screen.getByRole('button', { name: t.close }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('offers the four sign-in buttons as one set; one not connected says so and asks for nothing', () => {
    const { container } = login();
    expect([...container.querySelectorAll('.login-providers .provider-btn')].map((b) => b.textContent)).toEqual([t.loginWechat, t.loginApple, t.loginGoogle, t.loginPhone]);
    expect(screen.queryByText(t.loginPending)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: t.loginPhone }));
    expect(screen.getByText(t.loginPending)).toBeTruthy();
    // No phone number or code is asked for a service that is not connected.
    expect(container.querySelector('input[inputmode="tel"], input[autocomplete="one-time-code"]')).toBeNull();
    expect(screen.getByRole('button', { name: t.loginEnter }).textContent).toBe(`${t.loginEnterShort} →`);
    expect(screen.getByRole('button', { name: t.loginGuest })).toBeTruthy();
  });

  it('puts the way in that works first: guest as the main button until an account service is connected', () => {
    const { container, unmount } = login();
    const order = () => [...container.querySelectorAll('.login-v2 > *')].map((el) => el.className.split(' ')[0] || el.tagName);
    expect(order().slice(0, 4)).toEqual(['login-guest', 'name-line', 'login-or', 'login-providers']);
    expect(container.querySelector('.login-guest.is-primary')).toBeTruthy();
    expect(container.querySelector('.login-providers.is-compact')).toBeTruthy();
    unmount();
    const connected = render(<Splash t={t} progress={null} leaving={false} onEnter={() => {}} mode="login" auth={{ ...localAuth, methods: [...localAuth.methods, 'wechat'] }} onSignIn={() => {}} />);
    const first = connected.container.querySelector('.login-v2 > *')!;
    expect(first.className).toMatch(/login-providers/);
    expect(connected.container.querySelector('.login-guest.is-primary')).toBeNull();
  });

  it('enters from the title by a tap anywhere or by the 「轻触 · 入殿」 button, once each', () => {
    let entered = 0;
    const { container } = render(<Splash t={t} progress={null} leaving={false} onEnter={() => (entered += 1)} />);
    fireEvent.click(screen.getByRole('button', { name: t.splashEnter }));
    expect(entered).toBe(1);
    fireEvent.click(container.querySelector('.splash')!);
    expect(entered).toBe(2);
  });

  it('shows 「欢迎入殿」 after signing in', () => {
    login(true);
    expect(screen.getByRole('status').textContent).toBe('欢迎入殿');
  });
});
