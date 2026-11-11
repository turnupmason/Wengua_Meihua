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
  it('keeps the long explanation off the page until 「了解我们的断语」 is tapped', () => {
    login();
    expect(screen.queryByText(t.modelStory[0])).toBeNull();
    expect(screen.getByText(t.modelBadge)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: `${t.aboutJudgments} ›` }));
    const card = screen.getByRole('dialog', { name: t.modelStoryTitle });
    for (const line of t.modelStory) expect(card.textContent).toContain(line);
    fireEvent.click(screen.getByRole('button', { name: t.close }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('offers the four sign-in buttons as one set, then a name or guest entry', () => {
    const { container } = login();
    expect([...container.querySelectorAll('.login-providers .provider-btn')].map((b) => b.textContent)).toEqual([t.loginWechat, t.loginApple, t.loginGoogle, t.loginPhone]);
    expect(screen.getByRole('button', { name: t.loginEnter }).textContent).toBe(`${t.loginEnterShort} →`);
    expect(screen.getByRole('button', { name: t.loginGuest })).toBeTruthy();
  });

  it('shows 「欢迎入殿」 after signing in', () => {
    login(true);
    expect(screen.getByRole('status').textContent).toBe('欢迎入殿');
  });
});
