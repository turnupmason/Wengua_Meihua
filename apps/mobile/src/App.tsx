import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { getKnowledge, type Knowledge } from './knowledge/knowledge';
import { chargesToday, freezeCast, judgmentInput, withJudgment, type CastRecord } from './domain/cast';
import { judgmentFor } from './domain/judgment';
import { questionById, type ResolvedQuestion } from './domain/questionCatalog';
import { createHistory } from './domain/history';
import { createJournal } from './domain/journal';
import { placeStore } from './ui/placeStore';
import { sameMatterCandidate } from './domain/sameMatter';

/** 今天 / 昨天 / N 天前 */
function daysAgo(iso: string) {
  const d = Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(iso).setHours(0, 0, 0, 0)) / 86_400_000);
  return d;
}
import { INITIAL_RITUAL, ritualReducer, type RitualPhase } from './domain/ritual';
import { effectivePace, loadSettings, saveSettings, type Settings } from './domain/settings';
import { STRINGS } from './domain/i18n';
import { deviceTimeZone } from './domain/calendar';
import { templeAudio, haptic } from './domain/audio';
import { EMPTY_FORM, type EntryForm } from './ui/HomeOverlay';
import { Splash } from './ui/Splash';
import { hasWebGL } from './domain/quality';
import { MembershipSheet, type MembershipReason } from './ui/MembershipSheet';
import { createMembership, purchaseProvider } from './domain/membership';
import { clearProfile, loadProfile, localAuth, type Profile, type SignInMethod } from './domain/profile';
import { castRequest, entryProblem } from './ui/entry';
import { TempleView } from './ui/TempleView';
import { LibraryScreen } from './ui/LibraryScreen';
import { HistoryScreen } from './ui/HistoryScreen';
import { DebugScreen, type ManualCast } from './ui/DebugScreen';
import { ReferenceSheet } from './ui/ReferenceSheet';

type Screen = 'temple' | 'library' | 'history' | 'debug';

export function App() {
  const [settings, setSettingsState] = useState<Settings>(loadSettings);
  const t = STRINGS[settings.lang];
  const [knowledge, setKnowledge] = useState<Knowledge | null>(null);
  const [loadState, setLoadState] = useState<{ done: number; total: number; error: string | null }>({ done: 0, total: 3, error: null });
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [screen, setScreen] = useState<Screen>('temple');
  // 殿中三处: 问事香案 (home), 藏经阁 and 问事录 are places in the hall, not separate screens.
  // The place lives in placeStore, so switching never re-renders App.
  const setPlace = placeStore.set;
  const [ritual, dispatch] = useReducer(ritualReducer, INITIAL_RITUAL);
  const [record, setRecord] = useState<CastRecord | null>(null);
  const recordRef = useRef<CastRecord | null>(null);
  const [form, setForm] = useState<EntryForm>(EMPTY_FORM);
  const formRef = useRef(form);
  formRef.current = form;
  const [entryError, setEntryError] = useState<string | null>(null);
  // Opening: title screen → (tap) walk in from the forecourt → home tray.
  const [intro, setIntro] = useState<'waiting' | 'gliding' | 'done'>('waiting');
  const [splash, setSplash] = useState<'shown' | 'leaving' | 'gone'>('shown');
  const [splashMode, setSplashMode] = useState<'title' | 'login'>('title');
  const [welcoming, setWelcoming] = useState(false);
  const signInPending = useRef(false);
  const [signInError, setSignInError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(() => loadProfile());
  const history = useMemo(() => createHistory(), []);
  const journal = useMemo(() => createJournal(), []);
  const membership = useMemo(() => createMembership(), []);
  const [memberRev, setMemberRev] = useState(0);
  const [memberSheet, setMemberSheet] = useState<{ reason: MembershipReason; castId: string | null } | null>(null);
  // An earlier cast that may be about the same matter (the visitor decides).
  const [repeatOf, setRepeatOf] = useState<CastRecord | null>(null);
  // A reference or guidance question being read (no cast).
  const [reference, setReference] = useState<{ question: ResolvedQuestion; conditions: Record<string, string> } | null>(null);
  // The 断语 of a cast just made is being looked up.
  const [busy, setBusy] = useState(false);

  const setSettings = useCallback((s: Settings) => {
    setSettingsState(s);
    saveSettings(s);
    templeAudio.setEnabled(s.sound);
  }, []);

  useEffect(() => {
    document.documentElement.lang = settings.lang === 'zh' ? 'zh-Hans' : 'en';
  }, [settings.lang]);

  // Load bundled texts once; failures can be retried.
  useEffect(() => {
    let alive = true;
    setLoadState((s) => ({ ...s, error: null }));
    getKnowledge((done, total) => alive && setLoadState({ done, total, error: null }))
      .then((k) => {
        if (!alive) return;
        setKnowledge(k);
        // Resume an in-progress ritual after a reload, with the same frozen cast.
        const active = history.getActive();
        const rec = active ? history.get(active.castId) : null;
        if (rec) {
          recordRef.current = rec;
          setRecord(rec);
          dispatch({ type: 'RESUME', castId: rec.castId, phase: active!.phase as RitualPhase });
          setScreen('temple');
        }
      })
      .catch((e: Error) => alive && setLoadState((s) => ({ ...s, error: e.message })));
    return () => {
      alive = false;
    };
  }, [loadAttempt, history]);

  // Background/foreground: pause audio; the ritual clock and renderer pause themselves.
  useEffect(() => {
    const onVis = () => (document.hidden ? templeAudio.suspend() : templeAudio.resume());
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  useEffect(() => {
    if (screen === 'temple' && ritual.castId) history.setActive(ritual.castId, ritual.phase);
  }, [screen, ritual.castId, ritual.phase, history]);

  /**
   * Casts once: the hexagram is frozen, its 断语 is looked up (product question + 本卦 + 动爻 +
   * 月令 + casting day) and frozen with it, and only then is the record saved. The full ritual and
   * 简洁问事 both come through here: one cast, one 断语 lookup.
   */
  const castNow = async (): Promise<CastRecord | null> => {
    if (!knowledge) return null;
    const f = formRef.current;
    try {
      const base = freezeCast(
        knowledge.library,
        castRequest(f, { lang: settings.lang, timeZone: deviceTimeZone(), calendarPolicy: { ziHour: settings.ziHour, clock: settings.calendarClock } }),
      );
      const input = judgmentInput(base);
      const question = questionById(base.questionId);
      const rec = input && question ? withJudgment(base, await judgmentFor(knowledge.product, question, input)) : base;
      // A cast that would be charged beyond today's readings is not kept (the visitor is asked first).
      if (chargesToday(rec) && !membership.canCast()) {
        setMemberSheet({ reason: 'limit', castId: null });
        return null;
      }
      try {
        history.save(rec);
      } catch {
        setEntryError(t.storageWriteFailed);
        return null;
      }
      // Only a cast that was given a written 断语 counts toward today's readings.
      if (chargesToday(rec) && rec.questionId) membership.recordCast(rec.questionId);
      setMemberRev((n) => n + 1);
      recordRef.current = rec;
      setRecord(rec);
      return rec;
    } catch (e) {
      setEntryError((e as Error).message);
      leaveTemple();
      return null;
    }
  };

  const leaveTemple = () => {
    history.clearActive();
    setRepeatOf(null);
    recordRef.current = null;
    setRecord(null);
    dispatch({ type: 'RESET' });
    setScreen('temple'); // home is the hall itself
  };

  const enter = async (confirmedRepeat = false) => {
    // One cast per visit: a second tap (or a second submit) while one is made or shown does nothing.
    if (!knowledge || busy || recordRef.current) return;
    // A reading answers a question, chosen by tapping: it comes first.
    const problem = entryProblem(form);
    if (problem) {
      setEntryError(problem === 'question' ? t.needQuestion : problem === 'conditions' ? t.needCondition : problem === 'method' ? t.methodUnavailable : t.inputMissing);
      return;
    }
    setEntryError(null);
    // Reference and guidance questions are read at once: no cast, no ritual, nothing counted.
    const question = questionById(form.questionId);
    if (question && question.mode !== 'narrative') {
      setReference({ question, conditions: form.conditions });
      return;
    }
    // Same matter within seven days? Offer the original reading first (no new cast is used).
    if (!confirmedRepeat) {
      const earlier = sameMatterCandidate(history.list(), form.questionId);
      if (earlier) {
        setRepeatOf(earlier);
        return;
      }
    }
    templeAudio.setEnabled(settings.sound); // within the user's gesture
    haptic(settings.haptics);
    // The cast is frozen now (with its 断语); the visitor walks straight up the hall to the bestowal.
    // Whether it counts toward today is decided once its 断语 is known (castNow).
    setBusy(true);
    const rec = await castNow();
    setBusy(false);
    if (!rec) return;
    dispatch({ type: 'BEGIN', castId: rec.castId });
    // 简洁问事: the same cast, straight to the reading (no walk, no bestowal).
    if (pace === 'quick') dispatch({ type: 'SKIP', castId: rec.castId });
    setScreen('temple');
  };

  const openRecord = (rec: CastRecord, withRitual = false) => {
    recordRef.current = rec;
    setRecord(rec);
    dispatch({ type: 'RESET' });
    if (withRitual) dispatch({ type: 'BEGIN', castId: rec.castId });
    else dispatch({ type: 'RESUME', castId: rec.castId, phase: 'reading' });
    setScreen('temple');
  };
  // Stable handle for the memoised 问事录 panel.
  const openRecordRef = useRef(openRecord);
  openRecordRef.current = openRecord;

  const manualCast = (m: ManualCast) => {
    if (!knowledge) return;
    const rec = freezeCast(knowledge.library, {
      method: 'manual',
      domainId: m.domainId,
      instant: new Date(),
      timeZone: deviceTimeZone(),
      manual: { primaryId: m.primaryId, movingLine: m.movingLine, monthBranch: m.monthBranch, dayGanzhi: m.dayGanzhi },
    });
    try {
      history.save(rec);
    } catch {
      setEntryError(t.storageWriteFailed);
      setScreen('temple');
      return;
    }
    if (m.withRitual) templeAudio.setEnabled(settings.sound);
    openRecord(rec, m.withRitual);
  };

  void memberRev;
  const memberLine = membership.isMember()
    ? t.memberToday.replace('{n}', String(membership.castsToday())).replace('{max}', String(membership.dailyLimit()))
    : `${t.memberFree} · ${t.memberToday.replace('{n}', String(membership.castsToday())).replace('{max}', String(membership.dailyLimit()))}`;
  // 藏经阁 and 问事录 pages: built once per language/data change, reused across renders.
  const goAltar = useCallback(() => placeStore.set('altar'), []);
  const libraryPanel = useMemo(() => (knowledge ? <LibraryScreen knowledge={knowledge} t={t} lang={settings.lang} onBack={goAltar} /> : null), [knowledge, t, settings.lang, goAltar]);
  const recordsPanel = useMemo(
    () => (
      <HistoryScreen
        history={history}
        journal={journal}
        t={t}
        onOpen={(r) => {
          placeStore.set('altar');
          openRecordRef.current(r);
        }}
        onBack={goAltar}
      />
    ),
    [history, journal, t, goAltar],
  );
  // Pace of the next cast: the full ritual until a first reading exists, then quick (unless chosen).
  const pace = effectivePace(settings.ritualMode, history.list().length > 0);
  const walkIn = () => {
    templeAudio.setEnabled(settings.sound); // within the user's gesture
    templeAudio.bowl(0.8);
    setSplash('leaving');
    window.setTimeout(() => {
      setSplash('gone');
      setWelcoming(false);
      signInPending.current = false;
    }, settings.reducedMotion ? 150 : 1500);
    // Returning visitors on 简洁问事 go straight to the hall; the walk-in is for the full ritual.
    setIntro(inHall.current || pace === 'quick' ? 'done' : 'gliding');
  };
  // First visit: sign in (a 道号 or as a guest) before walking in.
  const onSplashEnter = () => (profile ? walkIn() : setSplashMode('login'));
  const onSignIn = (method: SignInMethod, name: string) => {
    if (signInPending.current) return;
    signInPending.current = true;
    setSignInError(null);
    templeAudio.setEnabled(settings.sound);
    localAuth
      .signIn(method, { name })
      .then((p) => {
        setProfile(p);
        // A short change of light: the 三清 dim, 「欢迎入殿」, then the moonlit hall.
        setWelcoming(true);
        window.setTimeout(walkIn, settings.reducedMotion ? 600 : 2200);
      })
      .catch(() => {
        signInPending.current = false;
        setSignInError(t.loginFailed);
      });
  };
  const onSwitchAccount = () => {
    clearProfile();
    setProfile(null);
    setSignInError(null);
    setSplashMode('login');
  };
  // Home's ←: back to the title screen; 「轻触 · 入殿」 walks in again.
  // The hall's controls hide behind the title; the camera stays in the hall, so walking in
  // again skips the gate walk-in.
  const inHall = useRef(false);
  const backToTitle = () => {
    inHall.current = true;
    setSplashMode('title');
    setSplash('shown');
    setIntro('waiting');
  };
  const onSignOut = () => {
    inHall.current = true;
    clearProfile();
    setProfile(null);
    setSplashMode('login');
    setSplash('shown');
    setIntro('waiting');
  };
  const splashLayer =
    splash !== 'gone' && knowledge ? (
      <Splash t={t} progress={null} leaving={splash === 'leaving'} onEnter={onSplashEnter} onSwitch={onSwitchAccount} mode={splashMode} profile={profile} auth={localAuth} onSignIn={onSignIn} signInError={signInError} live={settings.quality !== '2d' && hasWebGL()} welcoming={welcoming} />
    ) : null;

  if (!knowledge) {
    return <Splash t={t} progress={loadState.done / Math.max(1, loadState.total)} error={loadState.error} leaving={false} onEnter={() => {}} onRetry={() => setLoadAttempt((n) => n + 1)} />;
  }
  switch (screen) {
    case 'temple':
      return (
        <>
        {splashLayer}
        <TempleView
          knowledge={knowledge}
          record={record}
          ritual={ritual}
          dispatch={dispatch}
          settings={settings}
          onToggleSound={() => setSettings({ ...settings, sound: !settings.sound })}
          t={t}
          onExit={leaveTemple}
          onNewCast={leaveTemple}
          journal={journal}
          libraryPanel={libraryPanel}
          recordsPanel={recordsPanel}
          home={{
            form,
            error: entryError,
            pace,
            onForm: (f: typeof form) => {
              setEntryError(null);
              setForm(f);
            },
            onSettings: setSettings,
            onEnter: () => void enter(),
            busy,
            onMembership: () => setMemberSheet({ reason: 'browse', castId: null }),
            memberLine: memberLine,
            onLibrary: () => setPlace('library'),
            onHistory: () => setPlace('records'),
            onTitle: backToTitle,
            onDebug: () => setScreen('debug'),
            onSignOut,
            profileName: profile?.name ?? '',
          }}
          intro={intro}
          onIntroDone={() => setIntro('done')}
          membership={membership}
          memberRev={memberRev}
          memberOpen={!!memberSheet}
          onOpenMembership={(reason, castId) => setMemberSheet({ reason, castId })}
        />
        {memberSheet && (
          <MembershipSheet
            t={t}
            lang={settings.lang}
            membership={membership}
            store={purchaseProvider}
            reason={memberSheet.reason}
            castId={memberSheet.castId}
            onClose={() => setMemberSheet(null)}
            onChanged={() => setMemberRev((n) => n + 1)}
          />
        )}
        {reference && (
          <ReferenceSheet
            t={t}
            lang={settings.lang}
            question={reference.question}
            conditions={reference.conditions}
            sectionTitle={(id) => {
              try {
                return knowledge.library.getSection(id)?.title ?? null;
              } catch {
                return null;
              }
            }}
            onClose={() => setReference(null)}
          />
        )}
        {repeatOf && (
          <div className="sheet-backdrop" onClick={() => setRepeatOf(null)}>
            <section className="sheet repeat-sheet" role="alertdialog" aria-label={t.sameMatterTitle} onClick={(e) => e.stopPropagation()}>
              <div className="sheet-body member-body">
                <div className="member-reason">
                  <h3>{t.sameMatterTitle}</h3>
                  <p>{t.sameMatterText(daysAgo(repeatOf.createdAt), repeatOf.question, `${repeatOf.stages.primary.name} → ${repeatOf.stages.changed.name}`)}</p>
                </div>
                <button
                  type="button"
                  className="enter-seal small"
                  onClick={() => {
                    const r = repeatOf;
                    setRepeatOf(null);
                    openRecord(r);
                  }}
                >
                  {t.sameMatterYes}
                </button>
                <button
                  type="button"
                  className="text-btn member-restore"
                  onClick={() => {
                    setRepeatOf(null);
                    void enter(true);
                  }}
                >
                  {t.sameMatterNo}
                </button>
              </div>
            </section>
          </div>
        )}
        </>
      );
    case 'library':
      return <LibraryScreen knowledge={knowledge} t={t} lang={settings.lang} onBack={() => setScreen('temple')} />;
    case 'history':
      return <HistoryScreen history={history} journal={journal} t={t} onOpen={(r) => openRecord(r)} onBack={() => setScreen('temple')} />;
    case 'debug':
      return <DebugScreen knowledge={knowledge} t={t} lang={settings.lang} onCast={manualCast} onBack={() => setScreen('temple')} />;
    default:
      return null;
  }
}
