import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { getKnowledge, type Knowledge } from './knowledge/knowledge';
import { chargesToday, fillJudgment, freezeCast, judgmentInput, withJudgment, type CastRecord } from './domain/cast';
import { judgmentFor, windowDates } from './domain/judgment';
import { createFollowups, type Outcome, type TimingRef } from './domain/followup';
import { createCollection, createDaily } from './domain/daily';
import { createCalendarProvider } from './domain/calendar';
import { askReminderPermission, onReminderTap, syncReminders } from './domain/reminders';
import { questionById, questionWording, shownQuestion, type ResolvedQuestion } from './domain/questionCatalog';
import { createHistory } from './domain/history';
import { createJournal } from './domain/journal';
import { placeStore } from './ui/placeStore';
import { CoachIntro, useCoach } from './ui/coach';
import { Tour, tour } from './ui/Tour';
import { ShakeCast } from './ui/ShakeCast';
import { Exit } from './ui/Exit';
import { sameMatterCandidate } from './domain/sameMatter';

/** 今天 / 昨天 / N 天前 */
function daysAgo(iso: string) {
  const d = Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(iso).setHours(0, 0, 0, 0)) / 86_400_000);
  return d;
}
import { INITIAL_RITUAL, ritualReducer } from './domain/ritual';
import { effectivePace, loadSettings, saveSettings, type Settings } from './domain/settings';
import { STRINGS } from './domain/i18n';
import { deviceTimeZone } from './domain/calendar';
import { templeAudio, haptic } from './domain/audio';
import { EMPTY_FORM, type EntryForm } from './ui/HomeOverlay';
import { Splash } from './ui/Splash';
import { preloadWalkInArt } from './ui/walkInArt';

// The painted courtyard is fetched while the library loads, so it is there when the title shows.
void preloadWalkInArt();
import { hasWebGL } from './domain/quality';
import { MembershipSheet, type MembershipReason } from './ui/MembershipSheet';
import { OPEN_BETA, createMembership, purchaseProvider } from './domain/membership';
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
  // 应期回访: answers kept beside the records; followRev re-reads them after a change.
  const followups = useMemo(() => createFollowups(), []);
  const [followRev, setFollowRev] = useState(0);
  const bumpFollow = useCallback(() => setFollowRev((n) => n + 1), []);
  // A record to open in 问事录 (from the hall's 回访 card or a reminder), a fresh token each time.
  const [detailRequest, setDetailRequest] = useState<{ castId: string; at: number } | null>(null);
  // 今日一卦 and 卦册 (which of the 64 the visitor has met).
  const daily = useMemo(() => createDaily(), []);
  const collection = useMemo(() => createCollection(), []);
  const [dailyRev, setDailyRev] = useState(0);
  // The hexagrams a cast just added to 卦册, shown once in its reading.
  const [newMet, setNewMet] = useState<{ castId: string; ids: number[] } | null>(null);
  // A hexagram page to open in 藏经阁 (from 今日一卦), a fresh token each time.
  const [bookRequest, setBookRequest] = useState<{ hexagramId: number; at: number } | null>(null);
  const openDetail = useCallback((castId: string) => {
    setDetailRequest({ castId, at: Date.now() });
    placeStore.set('records');
  }, []);
  const membership = useMemo(() => createMembership(), []);
  const [memberRev, setMemberRev] = useState(0);
  const [memberSheet, setMemberSheet] = useState<{ reason: MembershipReason; castId: string | null } | null>(null);
  // An earlier cast that may be about the same matter (the visitor decides).
  const [repeatOf, setRepeatOf] = useState<CastRecord | null>(null);
  // A reference or guidance question being read (no cast).
  const [reference, setReference] = useState<{ question: ResolvedQuestion; conditions: Record<string, string> } | null>(null);
  // The 断语 of a cast just made is being looked up.
  const [busy, setBusy] = useState(false);
  // 完整仪式: shaking the 签筒 before the 三清; then the slip that fell (祖师赐卦), then the stone.
  const [shrine, setShrine] = useState<null | { rec: CastRecord | null; leaving?: boolean }>(null);
  // The cast whose slip was just shown as 祖师赐卦 (the stone does not say it a second time).
  const [slipFor, setSlipFor] = useState<string | null>(null);
  // The five-page introduction comes first; the arrow tour waits for it.
  const introPending = useCoach('intro');
  const introSeen = !introPending;

  const setSettings = useCallback((s: Settings) => {
    setSettingsState(s);
    saveSettings(s);
    templeAudio.setEnabled(s.sound);
  }, []);

  useEffect(() => {
    document.documentElement.lang = settings.lang === 'zh' ? 'zh-Hans' : 'en';
  }, [settings.lang]);

  const openSavedJudgment = useCallback(async (knowledge: Knowledge, rec: CastRecord) => {
    const previous = rec.judgment;
    // Cast while its 断语 was still being written: read it now if it has been (for the original day).
    if (previous?.state === 'missing' && (previous.reason === 'pending-authoring' || previous.reason === 'pending-review')) {
      const question = questionById(rec.questionId);
      const input = judgmentInput(rec);
      if (!input || !question) return;
      const written = await judgmentFor(knowledge.product, question, input);
      const current = recordRef.current;
      if (written.state !== 'ready' || current?.castId !== rec.castId) return;
      const filled = fillJudgment(current, written) as CastRecord;
      history.fill(filled);
      recordRef.current = filled;
      setRecord(filled);
      return;
    }
    if (previous?.state !== 'ready' || previous.timing?.windows.length || previous.timing?.phaseNotes?.length ||
        (previous.contentQuestionId ?? previous.questionId) !== 'career.promotion-pay.promotion') return;
    const question = questionById(rec.questionId);
    const input = judgmentInput(rec);
    if (!input || !question) return;
    const updated = await judgmentFor(knowledge.product, question, input);
    if (updated.state !== 'ready' || updated.decisionId !== previous.decisionId ||
        updated.castingDate !== previous.castingDate || updated.monthBranch !== previous.monthBranch) return;
    const current = recordRef.current;
    if (current?.castId !== rec.castId) return;
    const repaired = {...current, judgment: {...previous, timing: updated.timing, calculation: updated.calculation}};
    recordRef.current = repaired;
    setRecord(repaired);
  }, [history]);

  // 应期 are part of 详断: only records whose 详断 the visitor can read are asked about or reminded of.
  const readableRecords = useCallback(() => history.list().filter((r) => membership.canReadFull(r.castId)), [history, membership]);
  const reminderText = useCallback(
    (w: TimingRef) => ({ title: t.notifyTitle, body: t.notifyBody(windowDates(w.dates, w.first, settings.lang)) }),
    [t, settings.lang],
  );
  useEffect(() => {
    void syncReminders(readableRecords(), followups, settings.timingReminders, reminderText);
  }, [readableRecords, followups, settings.timingReminders, reminderText, followRev, memberRev, record?.castId]);
  useEffect(() => onReminderTap(openDetail), [openDetail]);

  // Casts made while their 断语 was still being written get it once it is (问事录, detail and 读卦 alike).
  const fillWritten = useCallback(async (knowledge: Knowledge) => {
    for (const rec of history.list()) {
      const was = rec.judgment;
      if (was?.state !== 'missing' || (was.reason !== 'pending-authoring' && was.reason !== 'pending-review')) continue;
      const question = questionById(rec.questionId);
      const input = judgmentInput(rec);
      if (!input || !question) continue;
      const written = await judgmentFor(knowledge.product, question, input).catch(() => null);
      if (written?.state === 'ready') history.fill(fillJudgment(rec, written) as CastRecord);
    }
    bumpFollow();
  }, [history, bumpFollow]);

  // Load bundled texts once; failures can be retried.
  useEffect(() => {
    let alive = true;
    setLoadState((s) => ({ ...s, error: null }));
    getKnowledge((done, total) => alive && setLoadState({ done, total, error: null }))
      .then((k) => {
        if (!alive) return;
        setKnowledge(k);
        // Casts made before 卦册 existed count as met.
        collection.meet(history.list().flatMap((r) => [r.stages.primary.id, r.stages.mutual.id, r.stages.changed.id]), 'cast');
        void fillWritten(k);
        // 入殿 always walks into the hall: a cast left open when the app was last closed is not
        // reopened on the stone table (it is saved, and stays in 问事录). Older versions kept a
        // marker for it; clear it.
        history.clearActive();
      })
      .catch((e: Error) => alive && setLoadState((s) => ({ ...s, error: e.message })));
    return () => {
      alive = false;
    };
  }, [loadAttempt, history, fillWritten]);

  // Background/foreground: pause audio; the ritual clock and renderer pause themselves.
  useEffect(() => {
    const onVis = () => (document.hidden ? templeAudio.suspend() : templeAudio.resume());
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

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
      // A newcomer's first written reading is read in full (once).
      if (rec.judgment?.state === 'ready') membership.giftFirst(rec.castId);
      const fresh = collection.meet([rec.stages.primary.id, rec.stages.mutual.id, rec.stages.changed.id], 'cast');
      setNewMet(fresh.length ? { castId: rec.castId, ids: fresh } : null);
      setMemberRev((n) => n + 1);
      recordRef.current = rec;
      setRecord(rec);
      tour.cast();
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
    // Every cast, whatever the method, is shaking the 签筒 before the 三清 (2026-11-14: the walk and
    // 简洁问事 are gone); the cast is made when the shaking stops (shrineCast).
    templeAudio.bowl(0.6);
    setShrine({ rec: null });
  };
  // The slip fell and was shown: to the stone, where the hexagrams carve in line by line with their
  // sounds (only the walk up the hall is left out).
  const toStone = (rec: CastRecord) => {
    setSlipFor(rec.castId);
    dispatch({ type: 'REVEAL', castId: rec.castId });
    setScreen('temple');
  };
  /** The shaking stopped: the cast is made at this moment (年月日时 or the chosen method). */
  const shrineCast = async () => {
    setBusy(true);
    const rec = await castNow();
    setBusy(false);
    if (!rec) return setShrine(null);
    setShrine({ rec });
  };

  // A record opened from 问事录 with 「看全文断语」 lands on 读卦 directly (a fresh token each time).
  const [readOnOpen, setReadOnOpen] = useState<{ castId: string; at: number } | null>(null);
  const openRecord = (rec: CastRecord, withRitual = false, read = false) => {
    setReadOnOpen(read ? { castId: rec.castId, at: Date.now() } : null);
    recordRef.current = rec;
    setRecord(rec);
    if (knowledge) void openSavedJudgment(knowledge, rec);
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
  // 应期回访 in the hall: the most recent 应期 that has come and is not yet answered.
  const followAsk = useMemo(() => {
    if (!knowledge) return null;
    const w = followups.due(readableRecords())[0];
    const rec = w ? history.get(w.castId) : null;
    if (!w || !rec) return null;
    return {
      w,
      question: shownQuestion(rec.questionId, rec.question, settings.lang),
      when: windowDates(w.dates, w.first, settings.lang),
      onAnswer: (o: Outcome) => {
        followups.answer(w.castId, w.index, o);
        bumpFollow();
      },
      onLater: () => {
        followups.later(w.castId);
        bumpFollow();
      },
      onOpen: () => openDetail(w.castId),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [knowledge, followRev, memberRev, record, settings.lang, readableRecords]);

  // 今日一卦: taken the first time the hall is open on a day (a new day after the app was in the background too).
  useEffect(() => {
    const onVis = () => document.visibilityState === 'visible' && setDailyRev((n) => n + 1);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);
  const dailyView = useMemo(() => {
    if (!knowledge || splash !== 'gone') return null;
    try {
      const d = daily.today(knowledge.library, createCalendarProvider(), deviceTimeZone(), { ziHour: settings.ziHour, clock: settings.calendarClock });
      const h = knowledge.library.getHexagram(d.primaryId);
      const line = h.lines[d.movingLine - 1];
      return {
        id: h.id,
        name: h.name,
        theme: h.grade?.theme ?? '',
        bits: h.bitsBottomUp,
        text: h.reading.text,
        vernacular: h.reading.vernacular,
        imageVernacular: h.reading.imageVernacular,
        movingLine: d.movingLine,
        line: { label: line.label, text: line.text, vernacular: line.vernacular },
        timeLabel: d.timeLabel,
        seen: d.seen,
        onSeen: () => {
          daily.markSeen();
          collection.meet([d.primaryId], 'daily');
          setDailyRev((n) => n + 1);
        },
        onRead: () => {
          setBookRequest({ hexagramId: d.primaryId, at: Date.now() });
          placeStore.set('library');
        },
      };
    } catch {
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [knowledge, splash, dailyRev, settings.ziHour, settings.calendarClock]);

  // 藏经阁 and 问事录 pages: built once per language/data change, reused across renders.
  const goAltar = useCallback(() => placeStore.set('altar'), []);
  const libraryPanel = useMemo(
    () => (knowledge ? <LibraryScreen knowledge={knowledge} t={t} lang={settings.lang} onBack={goAltar} collection={collection} metRev={dailyRev + (newMet?.ids.length ?? 0)} openRequest={bookRequest} /> : null),
    [knowledge, t, settings.lang, goAltar, collection, dailyRev, newMet, bookRequest],
  );
  const recordsPanel = useMemo(
    () => (
      <HistoryScreen
        history={history}
        journal={journal}
        followups={followups}
        canRead={(castId) => membership.canReadFull(castId)}
        remindOn={settings.timingReminders}
        onFollowup={bumpFollow}
        openDetail={detailRequest}
        t={t}
        onOpen={(r, read) => {
          placeStore.set('altar');
          openRecordRef.current(r, false, read);
        }}
        onBack={goAltar}
      />
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [history, journal, t, goAltar, followups, detailRequest, settings.timingReminders, memberRev, bumpFollow],
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
    // Straight into the hall (2026-11-13): the walk through the courtyard was a long wait with
    // nothing to do. The title already shows the courtyard; the hall comes up as the title fades.
    setIntro('done');
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
  // Over the title the painted courtyard of the walk-in shows through ("live"); only from the hall
  // (no cast open), so the title never covers a ritual.
  const splashLayer =
    splash !== 'gone' && knowledge ? (
      <Splash t={t} progress={null} leaving={splash === 'leaving'} onEnter={onSplashEnter} onSwitch={onSwitchAccount} mode={splashMode} profile={profile} auth={localAuth} onSignIn={onSignIn} signInError={signInError} live={settings.quality !== '2d' && hasWebGL() && ritual.phase === 'idle'} welcoming={welcoming} />
    ) : null;

  if (!knowledge) {
    return <Splash t={t} progress={loadState.done / Math.max(1, loadState.total)} error={loadState.error} leaving={false} onEnter={() => {}} onRetry={() => setLoadAttempt((n) => n + 1)} />;
  }
  switch (screen) {
    case 'temple':
      return (
        <>
        {splashLayer}
        {/* The first time in the hall (title gone, no cast open): the five-page introduction. */}
        {splash === 'gone' && ritual.phase === 'idle' && <CoachIntro t={t} />}
        {/* 完整仪式: the 签筒 before the 三清 (the hall stays behind it), then the slip that fell. */}
        <ShakeCast
          t={t}
          open={!!shrine}
          question={(() => {
            const q = questionById(form.questionId);
            return q ? questionWording(q, form.conditions, settings.lang) : '';
          })()}
          bestow={
            shrine?.rec && knowledge
              ? (() => {
                  const p = shrine.rec.stages.primary;
                  const h = knowledge.library.getHexagram(p.id);
                  return { name: p.name, grade: p.displayGrade, theme: h.grade?.theme ?? '', poem: h.grade?.poem ?? '' };
                })()
              : null
          }
          onClose={() => setShrine(null)}
          onCast={() => void shrineCast()}
          onBestow={() => templeAudio.qing(1, 0.8)}
          leaving={!!shrine?.leaving}
          onContinue={() => {
            const rec = shrine?.rec;
            if (!rec || shrine?.leaving) return;
            // The stone starts under the slip, which then fades into it: nothing in between.
            toStone(rec);
            setShrine({ rec, leaving: true });
            window.setTimeout(() => setShrine(null), 900);
          }}
          onHaptic={(ms) => haptic(settings.haptics, ms)}
        />
        {/* After the five pages, the arrow takes a first visit through the hall and the stone. */}
        {splash === 'gone' && introSeen && screen === 'temple' && <Tour t={t} />}
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
            // 内测: no membership entry (OPEN_BETA).
            onMembership: OPEN_BETA ? undefined : () => setMemberSheet({ reason: 'browse', castId: null }),
            memberLine: memberLine,
            onLibrary: () => setPlace('library'),
            onHistory: () => setPlace('records'),
            onTitle: backToTitle,
            onDebug: () => setScreen('debug'),
            onSignOut,
            profileName: profile?.name ?? '',
            followup: followAsk,
            daily: dailyView,
            me: (() => {
              const records = history.list();
              const book = journal.all();
              return {
                name: profile?.name ?? '',
                id: profile && profile.method !== 'guest' ? profile.id.replace(/[^a-z0-9]/gi, '').slice(-8).toUpperCase() : '',
                guest: !profile || profile.method === 'guest',
                records,
                saved: records.filter((r) => book[r.castId]).length,
                met: collection.count(),
                tally: followups.tally(records),
                symbolOf: (r: CastRecord) => knowledge?.library.getHexagram(r.stages.primary.id).symbol ?? '',
                questionOf: (r: CastRecord) => (r.question ? shownQuestion(r.questionId, r.question, settings.lang) : r.stages.primary.name),
                onOpenRecord: (r: CastRecord) => openDetail(r.castId),
                onRecords: () => setPlace('records'),
                onSaved: () => setPlace('records'),
                onLibrary: () => setPlace('library'),
                onSignIn: onSignOut,
                onSignOut,
              };
            })(),
          }}
          intro={intro}
          onIntroDone={() => setIntro('done')}
          membership={membership}
          memberRev={memberRev}
          memberOpen={!!memberSheet}
          onOpenMembership={(reason, castId) => setMemberSheet({ reason, castId })}
          readOnOpen={readOnOpen}
          slipFor={slipFor}
          newMet={newMet && newMet.castId === record?.castId ? { names: newMet.ids.map((id) => knowledge.library.getHexagram(id).name), count: collection.count() } : null}
          remind={{
            on: settings.timingReminders,
            onTurnOn: async () => {
              if (await askReminderPermission()) setSettings({ ...settings, timingReminders: true });
            },
          }}
        />
        <Exit show={!!(memberSheet)}>{memberSheet && (
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
        )}</Exit>
        <Exit show={!!(reference)}>{reference && (
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
        )}</Exit>
        <Exit show={!!(repeatOf)}>{repeatOf && (
          <div className="sheet-backdrop" onClick={() => setRepeatOf(null)}>
            <section className="sheet repeat-sheet" role="alertdialog" aria-label={t.sameMatterTitle} onClick={(e) => e.stopPropagation()}>
              <div className="sheet-body member-body">
                <div className="member-reason">
                  <h3>{t.sameMatterTitle}</h3>
                  <p>{t.sameMatterText(daysAgo(repeatOf.createdAt), shownQuestion(repeatOf.questionId, repeatOf.question, settings.lang), `${repeatOf.stages.primary.name} → ${repeatOf.stages.changed.name}`)}</p>
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
        )}</Exit>
        </>
      );
    case 'library':
      return <LibraryScreen knowledge={knowledge} t={t} lang={settings.lang} onBack={() => setScreen('temple')} />;
    case 'history':
      return <HistoryScreen history={history} journal={journal} followups={followups} canRead={(castId) => membership.canReadFull(castId)} remindOn={settings.timingReminders} onFollowup={bumpFollow} t={t} onOpen={(r, read) => openRecord(r, false, read)} onBack={() => setScreen('temple')} />;
    case 'debug':
      return <DebugScreen knowledge={knowledge} t={t} lang={settings.lang} onCast={manualCast} onBack={() => setScreen('temple')} />;
    default:
      return null;
  }
}
