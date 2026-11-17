/**
 * Membership sheet: current status and today's count, the reason it opened (daily limit, a
 * locked 断语, or browsing), yearly and monthly plans (3 days free for new members), reading
 * credits (one, or ten in a pack) for the current reading, restore purchases, manage the
 * subscription, and the renewal terms with the privacy policy and terms the App Store requires.
 * Prices are the App Store's own when it can say them.
 */
import { useEffect, useRef, useState } from 'react';
import type { Strings } from '../domain/i18n';
import type { Lang } from '../domain/settings';
import { PRODUCTS, type Membership, type ProductId, type PurchaseProvider } from '../domain/membership';
import { LEGAL } from '../services/cloud';

export type MembershipReason = 'browse' | 'limit' | 'judgment';

interface Props {
  t: Strings;
  lang: Lang;
  membership: Membership;
  store: PurchaseProvider;
  reason: MembershipReason;
  /** The reading a credit would open. */
  castId?: string | null;
  onClose: () => void;
  onChanged: () => void;
}

export function MembershipSheet({ t, lang, membership, store, reason, castId = null, onClose, onChanged }: Props) {
  const [busy, setBusy] = useState(false);
  const processing = useRef(false);
  const [note, setNote] = useState<string | null>(null);
  const [storePrices, setStorePrices] = useState<Partial<Record<ProductId, string>>>({});
  // Re-read after test-store actions change membership or today's count.
  const [, setRev] = useState(0);
  useEffect(() => {
    let live = true;
    void store.prices?.().then((p) => live && setStorePrices(p));
    return () => {
      live = false;
    };
  }, [store]);
  const member = membership.isMember();
  const full = !membership.canCast();
  const ent = membership.entitlement();
  const credits = membership.credits();
  const until = ent.expiresAt ? new Date(ent.expiresAt).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US') : '';
  const price = (id: ProductId) => storePrices[id] ?? PRODUCTS[id].price[lang];
  const opening = !member && !!castId && reason === 'judgment';

  const perform = async (action: () => Promise<string | null>) => {
    if (!store.available || processing.current) return;
    processing.current = true;
    setBusy(true);
    setNote(null);
    try {
      setNote(await action());
    } catch {
      setNote(t.memberFailed);
    } finally {
      processing.current = false;
      setBusy(false);
    }
  };
  /** Opens the current reading with a credit (on the server in the app). */
  const spend = async () => {
    if (!castId) return true;
    if (store.unlock) {
      const state = await store.unlock(castId);
      if (!state) return false;
      membership.applyServer(state);
      return true;
    }
    return membership.useCredit(castId);
  };
  const buy = (id: ProductId) =>
    perform(async () => {
      const result = await store.buy(id);
      if (result.cancelled) return null;
      if (!result.ok) return t.memberFailed;
      if (result.state) {
        membership.applyServer(result.state);
        if (PRODUCTS[id].kind === 'consumable' && opening && !(await spend())) return t.memberFailed;
      } else {
        membership.grant(id, opening ? castId : null);
      }
      onChanged();
      return t.memberThanks;
    });
  const useCredit = () =>
    perform(async () => {
      if (!(await spend())) return t.memberFailed;
      onChanged();
      onClose();
      return null;
    });
  const restore = () =>
    perform(async () => {
      const restored = await store.restore();
      const state = await store.sync?.();
      if (state) membership.applyServer(state);
      else if (restored) membership.restore(restored);
      if (!restored && !(state && state.credits > 0)) return t.memberNothingToRestore;
      onChanged();
      return t.memberThanks;
    });

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <section className="sheet member-sheet" role="dialog" aria-label={t.memberTitle} onClick={(e) => e.stopPropagation()}>
        <header className="sheet-head">
          <div>
            <h2>{t.memberTitle}</h2>
            <p className="sheet-kicker">
              {member ? t.memberUntil.replace('{date}', until) : t.memberFree} · {t.memberToday.replace('{n}', String(membership.castsToday())).replace('{max}', String(membership.dailyLimit()))}
              {credits > 0 && ` · ${t.memberCredits(credits)}`}
            </p>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label={t.close}>
            ✕
          </button>
        </header>
        <div className="sheet-body member-body">
          {member && (
            <div className="member-reason member-current">
              <h3>
                {ent.plan === 'yearly' ? t.memberPlanYearly : t.memberPlanMonthly} · {t.memberUntil.replace('{date}', until)}
              </h3>
              {full && <p>{t.memberFullToday.replace('{max}', String(membership.dailyLimit()))}</p>}
            </div>
          )}
          {!member && (reason === 'limit' || full) && (
            <div className="member-reason">
              <h3>{t.memberLimitTitle}</h3>
              <p>{t.memberLimitText}</p>
            </div>
          )}
          {opening && credits > 0 && (
            <button type="button" className="single-unlock is-credit" disabled={busy || !store.available} onClick={useCredit}>
              {t.memberUseCredit(credits)}
            </button>
          )}
          <div className="member-story">
            <h3>{t.modelStoryTitle}</h3>
            {t.modelStory.map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
          {!store.available && <p className="member-note" role="status">{t.memberStorePending}</p>}
          {store.isTest && <p className="member-test">{t.memberTestStore}</p>}
          {store.isTest && (
            <div className="btn-row member-dev">
              <button
                type="button"
                className="ghost-btn"
                onClick={() => {
                  membership.resetToday();
                  setNote(null);
                  onChanged();
                  setRev((n) => n + 1);
                }}
              >
                {t.devResetToday}
              </button>
              {member && (
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => {
                    membership.endSubscription();
                    onChanged();
                    setRev((n) => n + 1);
                  }}
                >
                  {t.devEndMember}
                </button>
              )}
            </div>
          )}
          {!member && (
            <>
              <p className="member-benefits">{t.memberBenefits}</p>
              <div className="plans">
                <button type="button" className="plan is-best" disabled={busy || !store.available} onClick={() => buy('wengua.member.yearly')}>
                  <span className="plan-name">{t.memberYearly}</span>
                  <span className="plan-price">{price('wengua.member.yearly')}</span>
                  <span className="plan-tag">{t.memberSave}</span>
                </button>
                <button type="button" className="plan" disabled={busy || !store.available} onClick={() => buy('wengua.member.monthly')}>
                  <span className="plan-name">{t.memberMonthly}</span>
                  <span className="plan-price">{price('wengua.member.monthly')}</span>
                </button>
              </div>
              <p className="member-trial">{t.memberTrial}</p>
            </>
          )}
          {!member && (
            <div className="plans plans-credits">
              {opening && (
                <button type="button" className="plan" disabled={busy || !store.available} onClick={() => buy('wengua.reading.single')}>
                  <span className="plan-name">{t.memberSingle}</span>
                  <span className="plan-price">{price('wengua.reading.single')}</span>
                </button>
              )}
              <button type="button" className="plan" disabled={busy || !store.available} onClick={() => buy('wengua.reading.pack10')}>
                <span className="plan-name">{t.memberPack10}</span>
                <span className="plan-price">{price('wengua.reading.pack10')}</span>
                <span className="plan-tag">{t.memberPack10Note}</span>
              </button>
            </div>
          )}
          {note && <p className="member-note" role="status">{note}</p>}
          <div className="member-links">
            <button type="button" className="text-btn member-restore" disabled={busy || !store.available} onClick={restore}>
              {t.memberRestore}
            </button>
            {member && store.manage && (
              <button type="button" className="text-btn" onClick={() => void store.manage?.()}>
                {t.memberManage}
              </button>
            )}
          </div>
          {store.available && <p className="member-fine">{store.isTest ? t.memberRenew : t.memberRenewApple}</p>}
          <p className="member-legal">
            <a href={LEGAL.terms} target="_blank" rel="noreferrer">
              {t.memberTerms}
            </a>
            <span aria-hidden="true"> · </span>
            <a href={LEGAL.privacy} target="_blank" rel="noreferrer">
              {t.memberPrivacy}
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
