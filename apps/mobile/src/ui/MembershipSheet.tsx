/**
 * Membership sheet: current status and today's count, the reason it opened (daily limit, a
 * locked 断语, or browsing), yearly and monthly plans, a single unlock for the current reading,
 * restore purchases, and the auto-renew disclosure the stores require.
 */
import { useRef, useState } from 'react';
import type { Strings } from '../domain/i18n';
import type { Lang } from '../domain/settings';
import { PRODUCTS, type Membership, type ProductId, type PurchaseProvider } from '../domain/membership';

export type MembershipReason = 'browse' | 'limit' | 'judgment';

interface Props {
  t: Strings;
  lang: Lang;
  membership: Membership;
  store: PurchaseProvider;
  reason: MembershipReason;
  /** The reading a single unlock would apply to. */
  castId?: string | null;
  onClose: () => void;
  onChanged: () => void;
}

export function MembershipSheet({ t, lang, membership, store, reason, castId = null, onClose, onChanged }: Props) {
  const [busy, setBusy] = useState(false);
  const processing = useRef(false);
  const [note, setNote] = useState<string | null>(null);
  // Re-read after test-store actions change membership or today's count.
  const [, setRev] = useState(0);
  const member = membership.isMember();
  const full = !membership.canCast();
  const ent = membership.entitlement();
  const until = ent.expiresAt ? new Date(ent.expiresAt).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US') : '';
  const price = (id: ProductId) => PRODUCTS[id].price[lang];

  const perform = async (action: () => Promise<string>) => {
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
  const buy = (id: ProductId) => perform(async () => {
    const result = await store.buy(id);
    if (!result.ok) return t.memberFailed;
    membership.grant(id, castId);
    onChanged();
    return t.memberThanks;
  });
  const restore = () => perform(async () => {
    const restored = await store.restore();
    if (!restored) return t.memberNothingToRestore;
    membership.restore(restored);
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
            </>
          )}
          {!member && castId && reason === 'judgment' && (
            <button type="button" className="single-unlock" disabled={busy || !store.available} onClick={() => buy('wengua.reading.single')}>
              {t.memberSingle} · {price('wengua.reading.single')}
            </button>
          )}
          {note && <p className="member-note" role="status">{note}</p>}
          <button type="button" className="text-btn member-restore" disabled={busy || !store.available} onClick={restore}>
            {t.memberRestore}
          </button>
          {store.available && <p className="member-fine">{t.memberRenew}</p>}
        </div>
      </section>
    </div>
  );
}
