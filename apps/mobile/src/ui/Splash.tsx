/**
 * Opening screen: night mountains in ink, a pale moon, mist drifting, and 「三清问道」 in gold.
 * While the texts load it shows progress; then 「轻触 · 入殿」. The tap (which also unlocks
 * sound) dissolves this screen and the camera walks from the forecourt into the hall.
 */
import { useEffect, useState } from 'react';
import { isSceneReady, onSceneReady } from '../scene/readiness';
import type { Strings } from '../domain/i18n';
import type { AuthProvider, Profile, SignInMethod } from '../domain/profile';

interface Props {
  t: Strings;
  /** `title`: tap to enter; `login`: the sign-in card (first visit, or after changing name). */
  mode?: 'title' | 'login';
  profile?: Profile | null;
  auth?: AuthProvider;
  onSignIn?: (method: SignInMethod, name: string) => void;
  /** The 3D courtyard is rendering behind: drop the painted backdrop and show it. */
  live?: boolean;
  /** Loading progress 0..1, or null once ready. */
  progress: number | null;
  error?: string | null;
  leaving: boolean;
  onEnter: () => void;
  onRetry?: () => void;
  /** Returning visitor: sign out from the title screen and show the sign-in card. */
  onSwitch?: () => void;
  /** Just signed in: the 三清 dim, 「欢迎入殿」 shows, then the screen gives way to the hall. */
  welcoming?: boolean;
}

/**
 * Over the live 3D gate: true once the scene is ready (or after a while regardless), so the
 * painted backdrop cross-fades to a scene that is already drawn instead of one still building.
 */
function useSceneShown(live: boolean) {
  const [shown, setShown] = useState(() => !live || isSceneReady());
  useEffect(() => {
    if (!live || shown) return;
    const off = onSceneReady(() => setShown(true));
    const fallback = window.setTimeout(() => setShown(true), 12000);
    return () => {
      off();
      window.clearTimeout(fallback);
    };
  }, [live, shown]);
  return shown;
}

export function Splash({ t, progress, error, leaving, onEnter, onRetry, onSwitch, mode = 'title', profile, auth, onSignIn, live = false, welcoming = false }: Props) {
  const sceneShown = useSceneShown(live && progress === null);
  // Over the live gate, 「轻触 · 入殿」 waits until the gate is drawn.
  const titleReady = progress === null && !error && mode === 'title';
  const ready = titleReady && sceneShown;
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [showPhone, setShowPhone] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [showAbout, setShowAbout] = useState(false);
  const can = (m: SignInMethod) => !!auth?.methods.includes(m);
  const remote = (m: SignInMethod) => (can(m) ? onSignIn?.(m, '') : setNotice(t.loginPending));
  return (
    <div className={`splash ${leaving ? 'is-leaving' : ''} ${mode === 'login' && progress === null ? 'is-login' : ''} ${live && progress === null ? 'is-live' : ''} ${sceneShown ? 'scene-shown' : ''} ${welcoming ? 'is-welcome' : ''}`} onClick={ready && !leaving ? onEnter : undefined} role={ready ? 'button' : undefined} aria-label={ready ? t.splashEnter : undefined}>
      <svg className="splash-art" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <radialGradient id="sp-moon" cx="45%" cy="40%" r="60%">
            <stop offset="0" stopColor="#fff6e0" />
            <stop offset="0.7" stopColor="#f0d9a6" />
            <stop offset="1" stopColor="#d6b06a" />
          </radialGradient>
          <radialGradient id="sp-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="rgba(255,226,170,0.38)" />
            <stop offset="0.45" stopColor="rgba(255,214,150,0.12)" />
            <stop offset="1" stopColor="rgba(255,214,150,0)" />
          </radialGradient>
          <linearGradient id="sp-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#090b12" />
            <stop offset="0.5" stopColor="#17140f" />
            <stop offset="1" stopColor="#0b0907" />
          </linearGradient>
          <linearGradient id="sp-far" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#4a4436" />
            <stop offset="1" stopColor="#1d1a15" />
          </linearGradient>
          <linearGradient id="sp-mid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2e2a22" />
            <stop offset="1" stopColor="#13110d" />
          </linearGradient>
          <filter id="sp-soft" x="-20%" y="-50%" width="140%" height="200%">
            <feGaussianBlur stdDeviation="10" />
          </filter>
          <filter id="sp-haze" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="1.6" />
          </filter>
        </defs>
        <rect width="400" height="800" fill="url(#sp-sky)" />
        <circle className="splash-glow" cx="312" cy="96" r="110" fill="url(#sp-glow)" />
        <circle cx="312" cy="96" r="30" fill="url(#sp-moon)" opacity="0.95" />
        {/* Far ridges, softened by haze */}
        <path filter="url(#sp-haze)" fill="url(#sp-far)" opacity="0.75"
          d="M0 470 C30 450 52 418 80 420 C104 422 112 446 136 440 C164 432 176 384 214 380 C246 377 262 418 292 420 C320 422 338 398 364 404 C380 408 392 420 400 424 L400 800 L0 800 Z" />
        <ellipse className="splash-mist m1" cx="200" cy="470" rx="260" ry="22" fill="rgba(226,212,186,0.22)" filter="url(#sp-soft)" />
        {/* Middle ridge with a small temple on its shoulder */}
        <path fill="url(#sp-mid)"
          d="M0 560 C40 540 70 500 110 498 C146 497 160 530 196 526 C226 522 236 488 262 476 C288 466 310 492 336 504 C360 514 384 522 400 520 L400 800 L0 800 Z" />
        <g transform="translate(262 476) scale(0.55)" fill="#0d0b08">
          <path d="M-70 0 Q-40 -6 -30 -22 L30 -22 Q40 -6 70 0 Z" />
          <rect x="-36" y="0" width="72" height="20" />
          <path d="M-50 20 Q-28 15 -24 4 L24 4 Q28 15 50 20 Z" />
          <rect x="-30" y="20" width="60" height="22" />
          <rect x="-7" y="27" width="14" height="15" fill="#d99a48" opacity="0.85" />
        </g>
        <ellipse className="splash-mist m2" cx="180" cy="575" rx="280" ry="26" fill="rgba(226,212,186,0.18)" filter="url(#sp-soft)" />
        {/* Near ridge */}
        <path fill="#0c0a07"
          d="M0 650 C50 628 90 612 130 620 C170 628 190 650 232 644 C276 638 300 606 340 610 C370 613 388 628 400 634 L400 800 L0 800 Z" />
      </svg>

      {mode === 'login' && progress === null && (
        // The Three Pure Ones (the artist's key art) behind the sign-in card.
        <div className="splash-key" aria-hidden="true" style={{ backgroundImage: `linear-gradient(180deg, rgba(6, 6, 10, 0.55), rgba(6, 6, 10, 0.25) 30%, rgba(6, 6, 10, 0.8) 62%, rgba(4, 4, 6, 0.96)), url(${import.meta.env.BASE_URL}art/sanqing.webp)` }} />
      )}
      <div className="splash-title">
        <h1>{t.appName}</h1>
        <p>{t.splashSub}</p>
        <p className="model-badge">{t.modelBadge}</p>
        {mode === 'login' && progress === null && (
          <button type="button" className="about-link" onClick={() => setShowAbout(true)}>
            {t.aboutJudgments} ›
          </button>
        )}
      </div>

      <div className="splash-foot">
        {error ? (
          <>
            <p className="error">
              {t.loadFailed}: {error}
            </p>
            <button className="ghost-btn" onClick={onRetry}>
              {t.retry}
            </button>
          </>
        ) : mode === 'login' && progress === null ? (
          <form
            className="login-v2"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim()) onSignIn?.('local', name);
            }}
          >
            <div className="login-providers v2">
              <button type="button" className="provider-btn" onClick={() => remote('wechat')}>
                {t.loginWechat}
              </button>
              <button type="button" className="provider-btn" onClick={() => remote('apple')}>
                {t.loginApple}
              </button>
              <button type="button" className="provider-btn" onClick={() => remote('google')}>
                {t.loginGoogle}
              </button>
              <button type="button" className={`provider-btn ${showPhone ? 'is-on' : ''}`} onClick={() => setShowPhone((x) => !x)}>
                {t.loginPhone}
              </button>
            </div>
            {showPhone && (
              <div className="phone-row">
                <input inputMode="tel" autoComplete="tel" placeholder={t.loginPhonePlaceholder} value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d+]/g, '').slice(0, 16))} />
                <div className="code-row">
                  <input inputMode="numeric" autoComplete="one-time-code" placeholder={t.loginCodePlaceholder} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} />
                  <button type="button" className="ghost-btn" disabled={phone.length < 6} onClick={() => remote('phone')}>
                    {t.loginSendCode}
                  </button>
                </div>
              </div>
            )}
            {notice && <p className="login-notice">{notice}</p>}
            <p className="login-or">{t.loginOr}</p>
            {auth?.methods.includes('local') && (
              <div className="name-line">
                <input value={name} maxLength={16} placeholder={t.loginNamePlaceholder} aria-label={t.loginNameLabel} onChange={(e) => setName(e.target.value)} autoComplete="nickname" />
                <button type="submit" disabled={!name.trim()} aria-label={t.loginEnter}>
                  {t.loginEnterShort} →
                </button>
              </div>
            )}
            {auth?.methods.includes('guest') && (
              <button type="button" className="login-guest v2" onClick={() => onSignIn?.('guest', '')}>
                {t.loginGuest}
              </button>
            )}
            <p className="login-note">{t.loginNote}</p>
          </form>
        ) : titleReady ? (
          <>
          {!ready && <p className="splash-waiting" role="status">{t.lightingHall}</p>}
          <div className={`splash-enter-wrap ${ready ? '' : 'is-waiting'}`} aria-hidden={!ready}>
            {profile && <p className="splash-welcome">{profile.name ? t.welcomeBack.replace('{name}', profile.name) : t.welcomeGuest}</p>}
            <p className="splash-enter">{t.splashEnter}</p>
            {profile && onSwitch && (
              <button
                type="button"
                className="splash-switch"
                onClick={(e) => {
                  e.stopPropagation();
                  onSwitch();
                }}
              >
                {t.switchAccount}
              </button>
            )}
          </div>
          </>
        ) : (
          <>
            <p className="splash-loading">{t.loading}</p>
            <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((progress ?? 0) * 100)}>
              <i style={{ width: `${(progress ?? 0) * 100}%` }} />
            </div>
          </>
        )}
      </div>
      {showAbout && (
        <div className="splash-about" onClick={() => setShowAbout(false)}>
          <section role="dialog" aria-label={t.modelStoryTitle} onClick={(e) => e.stopPropagation()}>
            <header>
              <h2>{t.modelStoryTitle}</h2>
              <button type="button" className="icon-btn" onClick={() => setShowAbout(false)} aria-label={t.close}>
                ✕
              </button>
            </header>
            {t.modelStory.map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </section>
        </div>
      )}

      {welcoming && (
        <div className="splash-welcome-gate" role="status">
          <p>{t.welcomeEnter}</p>
        </div>
      )}
    </div>
  );
}
