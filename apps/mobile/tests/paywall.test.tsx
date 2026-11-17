import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MembershipSheet } from '../src/ui/MembershipSheet';
import { createMembership, type PurchaseProvider, type ServerState } from '../src/domain/membership';
import { STRINGS } from '../src/domain/i18n';
import { memoryStore } from './helpers';

const t = STRINGS.zh;
afterEach(cleanup);

/** A stand-in for the App Store: the server's state after each step. */
function fakeStore(after: ServerState) {
  const bought: string[] = [];
  const opened: string[] = [];
  const store: PurchaseProvider = {
    available: true,
    isTest: false,
    async buy(p) {
      bought.push(p);
      return { ok: true, product: p, state: after };
    },
    async restore() {
      return null;
    },
    async prices() {
      return { 'wengua.reading.pack10': 'US$4.99', 'wengua.member.yearly': 'US$69.99' };
    },
    async sync() {
      return after;
    },
    async unlock(castId) {
      opened.push(castId);
      return { ...after, credits: after.credits - 1, unlocked: [castId] };
    },
  };
  return { store, bought, opened };
}

describe('付费页 (App Store)', () => {
  it('shows the App Store’s prices, the 3-day trial, the renewal terms and the two links', async () => {
    const m = createMembership(memoryStore(), { openBeta: false });
    const { store } = fakeStore({ plan: 'free', expiresAt: null, credits: 0, unlocked: [] });
    render(<MembershipSheet t={t} lang="zh" membership={m} store={store} reason="browse" onClose={() => {}} onChanged={() => {}} />);
    expect(await screen.findByText('US$69.99')).toBeTruthy();
    expect(screen.getByText('US$4.99')).toBeTruthy();
    expect(screen.getByText(t.memberTrial)).toBeTruthy();
    expect(screen.getByText(t.memberRenewApple)).toBeTruthy();
    expect(screen.getByRole('link', { name: t.memberTerms }).getAttribute('href')).toMatch(/apple\.com\/legal/);
    expect(screen.getByRole('link', { name: t.memberPrivacy }).getAttribute('href')).toBe('https://wengualabs.com/privacy');
  });

  it('a pack bought from a locked reading opens that reading with one of its ten', async () => {
    const m = createMembership(memoryStore(), { openBeta: false });
    const { store, bought, opened } = fakeStore({ plan: 'free', expiresAt: null, credits: 10, unlocked: [] });
    render(<MembershipSheet t={t} lang="zh" membership={m} store={store} reason="judgment" castId="cast-1" onClose={() => {}} onChanged={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: new RegExp(t.memberPack10) }));
    await waitFor(() => expect(m.canReadFull('cast-1')).toBe(true));
    expect(bought).toEqual(['wengua.reading.pack10']);
    expect(opened).toEqual(['cast-1']);
    expect(m.credits()).toBe(9);
  });

  it('with credits left, a locked reading is opened with one, without buying', async () => {
    const m = createMembership(memoryStore(), { openBeta: false });
    m.applyServer({ plan: 'free', expiresAt: null, credits: 3, unlocked: [] });
    const { store, bought, opened } = fakeStore({ plan: 'free', expiresAt: null, credits: 3, unlocked: [] });
    let closed = false;
    render(<MembershipSheet t={t} lang="zh" membership={m} store={store} reason="judgment" castId="cast-2" onClose={() => (closed = true)} onChanged={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: t.memberUseCredit(3) }));
    await waitFor(() => expect(closed).toBe(true));
    expect(bought).toEqual([]);
    expect(opened).toEqual(['cast-2']);
    expect(m.canReadFull('cast-2')).toBe(true);
  });
});

describe('wengualabs.com', () => {
  it('publishes the same privacy policy the app carries', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const app = readFileSync(resolve(process.cwd(), 'public/legal/privacy.html'), 'utf8');
    const site = readFileSync(resolve(process.cwd(), '../../site/public/privacy.html'), 'utf8');
    expect(site).toBe(app);
    expect(app).not.toMatch(/DEVELOPER_NAME|CONTACT_EMAIL/);
  });
});
