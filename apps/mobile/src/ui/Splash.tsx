/**
 * Opening screen: the painted moonlit courtyard (docs/art-reference/sanqing-entrance) and 「三清问道」 in gold.
 * While the texts load it shows progress; then 「轻触 · 入殿」. The tap (which also unlocks
 * sound) dissolves this screen and the camera walks from the forecourt into the hall.
 */
import { useEffect, useState } from 'react';
import { isSceneReady, onSceneReady } from '../scene/readiness';
import type { Strings } from '../domain/i18n';
import { WALK_IN_FILES, walkInUrl } from './walkInArt';
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
  signInError?: string | null;
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

export function Splash({ t, progress, error, leaving, onEnter, onRetry, onSwitch, mode = 'title', profile, auth, onSignIn, live = false, welcoming = false, signInError }: Props) {
  const sceneShown = useSceneShown(live && progress === null);
  // Over the live gate, 「轻触 · 入殿」 waits until the gate is drawn.
  const titleReady = progress === null && !error && mode === 'title';
  const ready = titleReady && sceneShown;
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [showPhone, setShowPhone] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const can = (m: SignInMethod) => !!auth?.methods.includes(m);
  // The four ways in, always shown as one set. One not connected yet says so when tapped and opens
  // nothing to fill in (no phone number or code is asked for a service that is not there).
  const providers = [
    { method: 'wechat', label: t.loginWechat },
    { method: 'apple', label: t.loginApple },
    { method: 'google', label: t.loginGoogle },
    { method: 'phone', label: t.loginPhone },
  ] as const;
  const provider = (method: (typeof providers)[number]['method']) => {
    if (!can(method)) return setNotice(t.loginPending);
    setNotice(null);
    if (method === 'phone') setShowPhone((shown) => !shown);
    else onSignIn?.(method, '');
  };
  // Until an account service is connected, the ways in that work now (guest, a name kept on this
  // device) come first and plainest; the four account buttons stay, smaller, below them.
  const anyProvider = providers.some((p) => can(p.method));
  const nameLine = auth?.methods.includes('local') ? (
    <div className="name-line">
      <input value={name} maxLength={16} placeholder={t.loginNamePlaceholder} aria-label={t.loginNameLabel} onChange={(e) => setName(e.target.value)} autoComplete="nickname" />
      <button type="submit" disabled={!name.trim()} aria-label={t.loginEnter}>
        {t.loginEnterShort} →
      </button>
    </div>
  ) : null;
  const guest = auth?.methods.includes('guest') ? (
    <button type="button" className={`login-guest v2 ${anyProvider ? '' : 'is-primary'}`} onClick={() => onSignIn?.('guest', '')}>
      {t.loginGuest}
    </button>
  ) : null;
  const login = mode === 'login' && progress === null;
  return (
    // Tapping anywhere on the title enters (the 「轻触 · 入殿」 button is there for keyboards and readers).
    <div className={`splash ${leaving ? 'is-leaving' : ''} ${mode === 'login' && progress === null ? 'is-login' : ''} ${live && progress === null ? 'is-live' : ''} ${sceneShown ? 'scene-shown' : ''} ${welcoming ? 'is-welcome' : ''}`} onClick={ready && !leaving ? onEnter : undefined}>
      {/* The artist's moonlit courtyard, framed exactly as the walk-in holds it at the title, so the
          loading screen, the title and the start of the walk are one picture. */}
      <div className="splash-art walkin-plate" style={{ backgroundImage: `url(${walkInUrl(WALK_IN_FILES.courtyard)})`, transform: 'translate(-50%, -50%) scale(1.02)' }} aria-hidden="true" />

      {mode === 'login' && progress === null && (
        // The Three Pure Ones (the artist's key art) behind the sign-in card. The face is kept clear and
        // bright; the shade gathers from the shoulders down, where the buttons are.
        <div className="splash-key" aria-hidden="true" style={{ backgroundImage: `linear-gradient(180deg, rgba(6, 6, 10, 0.6) 0%, rgba(6, 6, 10, 0.18) 16%, rgba(6, 6, 10, 0) 26%, rgba(6, 6, 10, 0.04) 46%, rgba(6, 6, 10, 0.55) 57%, rgba(5, 5, 8, 0.9) 68%, rgba(4, 4, 6, 0.97) 100%), url(${import.meta.env.BASE_URL}art/sanqing.webp)` }} />
      )}
      <div className="splash-title">
        <h1>{t.appName}</h1>
        <p>{t.splashSub}</p>
        {!login && <p className="model-badge">{t.modelBadge}</p>}
      </div>

      <div className="splash-foot">
        {error ? (
          <>
            <p className="error" role="alert">
              {t.loadFailed}
            </p>
            <button className="ghost-btn" onClick={onRetry}>
              {t.retry}
            </button>
          </>
        ) : login ? (
          <form
            className="login-v2"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim()) onSignIn?.('local', name);
            }}
          >
            {!anyProvider && guest}
            {!anyProvider && nameLine}
            {!anyProvider && <p className="login-or">{t.loginOr}</p>}
            <div className={`login-providers v2 ${anyProvider ? '' : 'is-compact'}`}>
              {providers.map(({ method, label }) => (
                <button type="button" className={`provider-btn ${method === 'phone' && showPhone ? 'is-on' : ''}`} key={method} onClick={() => provider(method)}>
                  {label}
                </button>
              ))}
            </div>
            {showPhone && can('phone') && (
              <div className="phone-row">
                <input inputMode="tel" autoComplete="tel" aria-label={t.loginPhonePlaceholder} placeholder={t.loginPhonePlaceholder} value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d+]/g, '').slice(0, 16))} />
                <div className="code-row">
                  <input inputMode="numeric" autoComplete="one-time-code" aria-label={t.loginCodePlaceholder} placeholder={t.loginCodePlaceholder} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} />
                  <button type="button" className="ghost-btn" disabled={phone.length < 6} onClick={() => onSignIn?.('phone', '')}>
                    {t.loginSendCode}
                  </button>
                </div>
              </div>
            )}
            {notice && (
              <p className="login-notice" role="status">
                {notice}
              </p>
            )}
            {signInError && <p className="login-notice" role="alert">{signInError}</p>}
            {anyProvider && <p className="login-or">{t.loginOr}</p>}
            {anyProvider && nameLine}
            {anyProvider && guest}
            <p className="login-note">{t.loginNote}</p>
            <button type="button" className="about-link" onClick={() => setShowAbout(true)}>
              {t.aboutJudgments} ›
            </button>
          </form>
        ) : titleReady ? (
          <>
          {!ready && <p className="splash-waiting" role="status">{t.lightingHall}</p>}
          <div className={`splash-enter-wrap ${ready ? '' : 'is-waiting'}`} aria-hidden={!ready}>
            {profile && <p className="splash-welcome">{profile.name ? t.welcomeBack.replace('{name}', profile.name) : t.welcomeGuest}</p>}
            <button
              type="button"
              className="splash-enter"
              disabled={!ready || leaving}
              onClick={(e) => {
                e.stopPropagation();
                onEnter();
              }}
            >
              {t.splashEnter}
            </button>
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
