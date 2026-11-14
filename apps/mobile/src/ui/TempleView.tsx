import { Component, Suspense, cloneElement, lazy, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentProps, type ReactElement, type ReactNode } from 'react';
import { shownQuestion } from '../domain/questionCatalog';
import type { Knowledge } from '../knowledge/knowledge';
import { readingFromCast, snapshotDrift, type CastRecord } from '../domain/cast';
import { isRitualPhase, type RitualEvent, type RitualState } from '../domain/ritual';
import { primaryRelation } from '../domain/relation';
import { pickTier } from '../domain/quality';
import { templeAudio, haptic } from '../domain/audio';
import type { Settings } from '../domain/settings';
import type { Strings } from '../domain/i18n';
import type { StageKey } from '../domain/layout';
import type { LinePick, Selection } from '../scene/StoneTable';
import { useRitualClock } from './useRitualClock';
import { HomeOverlay } from './HomeOverlay';
import type { IntroRef } from '../scene/TempleScene';
import { INTRO_SECONDS } from '../scene/timeline';
import { bestowalTimes } from '../scene/carving';
import { PaintedTable } from './PaintedTable';
import { CoachTip, coach, useCoach } from './coach';
import { PaintedWalkIn } from './PaintedWalkIn';
import { PaintedHall, PaintedPlace } from './PaintedHall';
import { PLACE_PANEL } from '../scene/placeLayout';
import { usePlaceArt, useWalkInArt, walkInArtReady } from './walkInArt';
import { PreceptSubtitle } from './Precepts';
import { DetailSheet, type JudgmentView } from './DetailSheet';
import type { SynthStage } from './Verdict';
import { ReadingView } from './ReadingView';
import { HexagramPage, type BookTarget } from './HexagramPage';
import { SectionPage, type SectionTarget } from './SectionPage';
import { JournalSheet } from './JournalSheet';
import type { Journal } from '../domain/journal';
import { sceneInsets } from '../scene/insets';
import { LineTip } from './LineTip';
import { placeStore, usePlace } from './placeStore';
import type { Membership } from '../domain/membership';
import { missingText } from './judgmentText';
import type { MembershipReason } from './MembershipSheet';
import { Board2D } from './Board2D';
import { Ritual2D } from './Ritual2D';
import { relationAria } from './text';

const STAGE_LABEL = { primary: 'stage_primary', mutual: 'stage_mutual', changed: 'stage_changed' } as const;
import { castTimeShort } from './timeText';

const TempleScene = lazy(() => import('../scene/TempleScene').then((m) => ({ default: m.TempleScene })));

class SceneBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

interface Props {
  knowledge: Knowledge;
  record: CastRecord | null;
  ritual: RitualState;
  dispatch: (e: RitualEvent) => void;
  settings: Settings;
  onToggleSound: () => void;
  t: Strings;
  onExit: () => void;
  onNewCast: () => void;
  home: Omit<ComponentProps<typeof HomeOverlay>, 't' | 'settings'>;
  /** Opening walk-in from the forecourt: waiting behind the title screen, gliding, or done. */
  intro: 'waiting' | 'gliding' | 'done';
  onIntroDone: () => void;
  membership: Membership;
  /** Bumped whenever a purchase changes what the visitor may read. */
  memberRev: number;
  memberOpen?: boolean;
  onOpenMembership: (reason: MembershipReason, castId: string | null) => void;
  /** Opened from 问事录 with 「看全文断语」: show this cast's 读卦 at once. */
  readOnOpen?: { castId: string; at: number } | null;
  /** 应期提醒: whether it is on, and turning it on (asks the phone first). */
  remind?: { on: boolean; onTurnOn: () => void };
  journal: Journal;
  /** 殿中三处: the pages shown at 藏经阁 and 问事录 (the place itself is in placeStore). */
  libraryPanel: ReactNode;
  recordsPanel: ReactElement<{ active?: boolean }>;
}

export function TempleView({ knowledge, record, ritual, dispatch, settings, onToggleSound, t, onExit, onNewCast, home, intro, onIntroDone, membership, memberRev, memberOpen = false, onOpenMembership, journal, libraryPanel, recordsPanel, readOnOpen = null, remind }: Props) {
  const place = usePlace();
  const onPlace = placeStore.set;
  const reduced = settings.reducedMotion;
  const [sceneFailed, setSceneFailed] = useState(false);
  // A lost WebGL context (e.g. iOS reclaiming GPU memory in the background) is rebuilt up to
  // twice before falling back to the flat board for the rest of the visit.
  const [sceneKey, setSceneKey] = useState(0);
  const failures = useRef(0);
  const onSceneLost = useCallback(() => {
    failures.current += 1;
    if (failures.current <= 2) setTimeout(() => setSceneKey((k) => k + 1), 250);
    else setSceneFailed(true);
  }, []);
  const tier = useMemo(() => (sceneFailed ? null : pickTier(settings.quality)), [settings.quality, sceneFailed]);
  const [selection, setSelection] = useState<Selection | null>(null);

  const reading = useMemo(() => (record ? readingFromCast(knowledge.library, record) : null), [record, knowledge]);
  const relation = useMemo(() => (reading ? primaryRelation(reading) : null), [reading]);
  // 读卦: the reading laid out to read (null = 观卦, the stone table). 'top' opens at the conclusion.
  // 'detail': opened by 「看详断」 on the stone, straight onto the 详断, unfolded.
  const [readMode, setReadMode] = useState<SynthStage | 'top' | 'detail' | null>(null);
  const readButton = useRef<HTMLButtonElement>(null);
  const restoreReadButton = useRef(false);
  useLayoutEffect(() => {
    if (!readMode && restoreReadButton.current) {
      restoreReadButton.current = false;
      readButton.current?.focus({ preventScroll: true });
    }
  }, [readMode]);
  const [showBook, setShowBook] = useState(false);
  const [showQuestion, setShowQuestion] = useState(false);
  // The first time the visitor reads a stone: 「卦象自下而上，观其始终」, briefly, then never again.
  const [orderHint, setOrderHint] = useState(false);
  useEffect(() => {
    // Only once the visitor is actually looking at the stone (not behind the title screen).
    if (ritual.phase !== 'reading' || intro !== 'done') {
      setOrderHint(false);
      return;
    }
    let seen = true;
    try {
      seen = localStorage.getItem('wengua.hint.bottomUp.v1') === '1';
      if (!seen) localStorage.setItem('wengua.hint.bottomUp.v1', '1');
    } catch {
      seen = false;
    }
    if (seen) return;
    setOrderHint(true);
    const id = window.setTimeout(() => setOrderHint(false), 4200);
    return () => window.clearTimeout(id);
  }, [ritual.phase, intro]);
  // The camera keeps the stone clear of the top bar: tell it where the bar ends.
  const headerRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const update = () => {
      sceneInsets.headerPx = el.getBoundingClientRect().height;
      el.closest<HTMLElement>('.temple')?.style.setProperty('--board-header', `${sceneInsets.headerPx}px`);
    };
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(update);
    ro.observe(el, { box: 'border-box' });
    return () => ro.disconnect();
  }, [ritual.phase]);
  // A 藏经阁 page opened from the reading's evidence.
  const [bookPage, setBookPage] = useState<BookTarget | null>(null);
  const [sectionPage, setSectionPage] = useState<SectionTarget | null>(null);
  // Place panels are built once, in idle time after arriving in the hall, then kept: a tap only
  // slides them in (no rebuilding 64 hexagram cards while the camera is moving).
  const [panelsReady, setPanelsReady] = useState({ library: false, records: false });
  useEffect(() => {
    if (place !== 'altar' && !panelsReady[place]) setPanelsReady((r) => ({ ...r, [place]: true }));
  }, [place, panelsReady]);
  useEffect(() => {
    if (ritual.phase !== 'idle' || intro !== 'done' || (panelsReady.library && panelsReady.records)) return;
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    const run = () => setPanelsReady({ library: true, records: true });
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(run, { timeout: 2500 });
      return () => w.cancelIdleCallback?.(id);
    }
    const id = window.setTimeout(run, 1500);
    return () => window.clearTimeout(id);
  }, [ritual.phase, intro, panelsReady]);
  const [bookRev, setBookRev] = useState(0);
  const bookEntry = useMemo(() => (record ? journal.get(record.castId) : null), [record, journal, bookRev]);
  // The camera frames the stone above the result footer: tell it how tall the footer is.
  const footerRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const el = footerRef.current;
    if (!el || ritual.phase !== 'reading') return;
    const update = () => {
      const h = el.getBoundingClientRect().height;
      if (h > 40) {
        sceneInsets.footerPx = h + 8;
        el.closest<HTMLElement>('.temple')?.style.setProperty('--board-footer', `${h}px`);
      }
    };
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(update);
    ro.observe(el, { box: 'border-box' });
    return () => ro.disconnect();
  }, [ritual.phase]);
  useEffect(() => {
    setReadMode(null);
    setShowBook(false);
    setShowQuestion(false);
    setSelection(null);
    setTip(null);
    setBookPage(null);
    setSectionPage(null);
  }, [record?.castId]);
  useEffect(() => {
    if (readOnOpen && readOnOpen.castId === record?.castId && ritual.phase === 'reading') setReadMode('top');
  }, [readOnOpen, record?.castId, ritual.phase]);
  // First-use popups at the stone (ui/coach.tsx): how to read it, then where the conclusion is.
  const coachStone = useCoach('stone');
  // The 断语 was looked up once, at casting (question + 本卦 + 动爻 + 月令 + day), and frozen with the cast.
  const judgmentView = useMemo<JudgmentView | null>(() => {
    if (!record) return null;
    const j = record.judgment;
    if (!record.questionId || !j) return { state: 'legacy' };
    if (j.state !== 'ready') return { state: 'missing', reason: j.reason };
    return { state: 'ready', judgment: j, full: membership.canReadFull(record.castId) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record, membership, memberRev]);
  // Under 「查看断语」: the 断语's own title, or why there is none (never a stand-in).
  const headline = useMemo(() => {
    if (!reading || !judgmentView) return '';
    if (judgmentView.state === 'ready') return judgmentView.judgment.title || judgmentView.judgment.short;
    if (judgmentView.state === 'missing') return missingText(t, judgmentView.reason).title;
    // Older free-written records keep what they showed then.
    if (record?.snapshot && settings.lang !== 'en') return [record.snapshot.headline, record.snapshot.leadText].filter(Boolean).join(' · ');
    const y = reading.synthesis;
    return y.applicable ? `${y.headline} · ${y.leadText}` : y.weather?.headline ?? '';
  }, [reading, record, settings.lang, judgmentView, t]);
  // A cast on an entry shows the entry's name (求职录用), whatever wording was saved with it.
  const asked = record ? shownQuestion(record.questionId, record.question, settings.lang) : '';
  const castTimeLabel = useMemo(() => (record?.calendar ? (settings.lang === 'en' ? `Cast ${castTimeShort(record.calendar)}` : `${castTimeShort(record.calendar)} 起卦`) : ''), [record, settings.lang]);
  const drift = useMemo(() => (record && reading ? snapshotDrift(record, reading) : []), [record, reading]);
  const versionChanged = !!record && record.contentVersion !== knowledge.contentVersion;

  const onPhaseDone = useCallback((p: RitualState['phase']) => dispatch({ type: 'PHASE_DONE', phase: p }), [dispatch]);
  // 祖师赐卦 is said over the 三清; only when the stone table is shown does 石桌显卦 follow (never together).
  const [bestowed, setBestowed] = useState(false);
  const [tableShown, setTableShown] = useState(false);
  // 祖师赐卦 stays until the 三清 give way to the table, and has faded by then.
  const bestowSeconds = useMemo(() => {
    const b = bestowalTimes(reduced);
    return Math.max(0.5, b.orbArrive - b.lookUp);
  }, [reduced]);
  // Sounds and moments, all solemn and sparse.
  const onCue = useCallback(
    (p: RitualState['phase'], i: number) => {
      if (p === 'entering') templeAudio.bowl(0.8);
      else if (p === 'revealing' && i === 0) {
        templeAudio.bowl(1);
        setTimeout(() => templeAudio.handbell(3), 500);
        setTimeout(() => templeAudio.qing(1.5, 0.6), 1400);
        setBestowed(true);
        setTableShown(false);
      } else if (p === 'revealing' && i === 2) {
        // The 三清 give way to the stone table.
        setBestowed(false);
        setTableShown(true);
        templeAudio.qing(2, 0.5);
      } else if (p === 'revealing' && i === 1) {
        templeAudio.qing(1, 0.8);
        setTimeout(() => templeAudio.qing(1.335, 0.6), 220);
      }
    },
    [settings.haptics],
  );
  const clock = useRitualClock(ritual.phase, reduced, onPhaseDone, onCue);
  useEffect(() => {
    if (ritual.phase !== 'revealing') {
      setBestowed(false);
      setTableShown(false);
    }
  }, [ritual.phase]);

  // Opening walk-in: start the glide when the title screen is tapped, show the home tray after it.
  // The painted courtyard and threshold (docs/art-reference/sanqing-entrance) when their pictures
  // have loaded; otherwise the 3D courtyard walk. Chosen while waiting, fixed once the walk starts.
  const walkInArt = useWalkInArt();
  const introRef = useRef<IntroRef>({ start: null, done: intro === 'done', painted: walkInArtReady() });
  if (intro === 'waiting') introRef.current.painted = walkInArt;
  useEffect(() => {
    if (intro === 'done') {
      introRef.current.done = true;
      return;
    }
    if (intro !== 'gliding') return;
    // Without the 3D hall (or mid-ritual after a reload) there is nothing to walk through.
    if (!tier || ritual.phase !== 'idle') {
      onIntroDone();
      return;
    }
    introRef.current.start = clock.current.elapsed;
    // The painted walk-in ends itself on the ritual clock (with the camera); the 3D walk on a timer.
    if (introRef.current.painted) return;
    const id = window.setTimeout(onIntroDone, (reduced ? INTRO_SECONDS.reduced : INTRO_SECONDS.normal) * 1000 - 300);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intro]);

  // 道乐 plays softly while in the hall (follows the sound toggle).
  useEffect(() => {
    if (settings.sound) templeAudio.startMusic();
    else templeAudio.stopMusic();
    return () => templeAudio.stopMusic();
  }, [settings.sound]);

  // A tapped line glows and a small tip appears beside it; the full text opens from the tip.
  const [tip, setTip] = useState<{ sel: Selection; at: [number, number] } | null>(null);
  const onPick = useCallback(
    (p: LinePick) => {
      // The moving line answers with a firmer double tap.
      const isMoving = !!reading && p.stage === 'primary' && p.linePosition === reading.movingLine;
      haptic(settings.haptics, isMoving ? [14, 50, 22] : 8);
      const sel = { stage: p.stage, hexagramId: p.hexagramId, linePosition: p.linePosition };
      if (p.at) setTip({ sel, at: p.at });
      else setSelection(sel);
    },
    [settings.haptics, reading],
  );
  const onMiss = useCallback(() => setTip(null), []);
  const onOpenRelation = useCallback(() => setReadMode('use'), []);
  useEffect(() => {
    if (!tip) return;
    const id = window.setTimeout(() => setTip(null), 9000);
    return () => window.clearTimeout(id);
  }, [tip]);
  const onOpenStage = useCallback(
    (s: StageKey) => {
      if (!reading) return;
      // From this cast, the primary opens on its real moving line; other stages open at the hexagram level.
      setSelection({ stage: s, hexagramId: reading.stages[s].id, linePosition: s === 'primary' ? reading.movingLine : null });
    },
    [reading],
  );

  const phase = ritual.phase;
  const inRitual = isRitualPhase(phase);
  const boardBlocked = !!(readMode || selection || showQuestion || memberOpen);
  // The painted hall (ui/PaintedHall): under the walk-in's pictures, and at home in the 殿中 view.
  // It gives way to the 3D hall when the visitor walks to the stone table or to another place.
  const paintedHall = walkInArt && ((intro !== 'done' && !!introRef.current.painted) || (intro === 'done' && phase === 'idle' && place === 'altar'));
  // 藏经阁 and 问事录 painted too, when their pictures are there.
  const placeArt = usePlaceArt();
  const paintedPlace = placeArt && walkInArt && intro === 'done' && phase === 'idle' && place !== 'altar';
  // While a painting covers the hall — the whole walk-in, home, 藏经阁, 问事录 — the 3D view rests;
  // it resumes the moment the visitor walks to the stone table.
  // During the ritual the painting reports when it fully covers the screen (the walk, sitting, looking up).
  const [ritualCovered, setRitualCovered] = useState(false);
  // The stone table is the user's painting too (ui/PaintedTable), from 石桌显卦 through the reading.
  const paintedTable = walkInArt && !!reading && (phase === 'revealing' || phase === 'reading');
  const hallRests = paintedHall || paintedPlace || ritualCovered || paintedTable;
  const phaseTitle: Partial<Record<typeof phase, string>> = {
    entering: t.walking,
    revealing: tableShown ? t.revealing : undefined,
  };

  return (
    <div className={`temple phase-${phase}`}>
      <div className="stage-layer" inert={boardBlocked}>
        {tier ? (
          <SceneBoundary key={sceneKey} onError={onSceneLost}>
            <Suspense fallback={<div className="scene-loading">{t.loading}</div>}>
              <TempleScene
                reading={reading}
                relation={relation}
                castTime={castTimeLabel}
                clock={clock}
                phase={phase}
                covered={!!readMode || hallRests}
                reduced={reduced}
                tier={tier}
                selection={tip?.sel ?? selection}
                onOpenRelation={onOpenRelation}
                onMiss={onMiss}
                t={t}
                lang={settings.lang}
                sound={settings.sound}
                onPick={onPick}
                onOpenStage={onOpenStage}
                onContextLost={onSceneLost}
                intro={introRef}
                onPlace={onPlace}
                plainBestowal={walkInArt}
              />
            </Suspense>
          </SceneBoundary>
        ) : phase === 'reading' || phase === 'revealing' ? (
          reading && relation && (
            <div className="flat-table">
              <Board2D reading={reading} relation={relation} selection={selection} t={t} lang={settings.lang} revealed={phase === 'reading'} onPick={onPick} onOpenStage={onOpenStage} castTime={castTimeLabel} />
            </div>
          )
        ) : (
          <Ritual2D phase={phase} reduced={reduced} />
        )}
      </div>

      {/* At the stone table the 3D hall behind is kept in shadow: the eye stays on the table, and the
          painted hall (above this, when the visitor looks up) is the only hall the visitor sees. */}
      {/* The painted hall and places sit right over the 3D view and under every word and button. */}
      {paintedTable && reading && (
        <PaintedTable
          reading={reading}
          relation={relation}
          phase={phase}
          clock={clock}
          reduced={reduced}
          t={t}
          lang={settings.lang}
          selection={tip?.sel ?? selection}
          castTime={castTimeLabel}
          onPick={onPick}
          onOpenStage={onOpenStage}
          onOpenRelation={onOpenRelation}
          onMiss={onMiss}
          hint={coachStone && phase === 'reading'}
        />
      )}
      {/* Under the hall's and the places' pictures, while one is shown: an opaque dark floor, so that
          however fast the visitor switches places, the resting 3D hall (and its 三清) never shows through. */}
      {walkInArt && (paintedHall || paintedPlace) && <div className="painted-floor" aria-hidden="true" />}
      {walkInArt && <PaintedHall shown={paintedHall} away={paintedPlace} still={reduced} phase={phase} clock={clock} onCover={setRitualCovered} />}
      {walkInArt && placeArt && (['library', 'records'] as const).map((p) => <PaintedPlace key={p} place={p} shown={paintedPlace && place === p} still={reduced} panelFraction={PLACE_PANEL} />)}

      {phase === 'idle' && intro === 'done' && (
        <nav className="place-tabs" aria-label={t.placesLabel}>
          {(['altar', 'library', 'records'] as const).map((p) => (
            <button key={p} aria-current={place === p ? 'page' : undefined} className={place === p ? 'is-on' : ''} onClick={() => onPlace(p)}>
              {p === 'altar' ? t.placeAltar : p === 'library' ? t.library : t.history}
            </button>
          ))}
        </nav>
      )}
      {phase === 'idle' && intro === 'done' && (
        <div className={`home-wrap ${place === 'altar' ? '' : 'is-away'}`} inert={place !== 'altar'}>
          <HomeOverlay t={t} settings={settings} {...home} />
        </div>
      )}
      {phase === 'idle' &&
        intro === 'done' &&
        (['library', 'records'] as const).map(
          (p) =>
            panelsReady[p] && (
              <div
                key={p}
                className={`place-panel ${place === p ? 'is-on' : ''}`}
                aria-hidden={place !== p}
                inert={place !== p}
                // Scrolled up, the panel rises over the picture so the list has the screen; back at the
                // top it settles again under the desk or the shelves.
                onScroll={(e) => e.currentTarget.classList.toggle('is-raised', e.currentTarget.scrollTop > 8)}
              >
                {p === 'library' ? libraryPanel : cloneElement(recordsPanel, { active: place === 'records' })}
              </div>
            ),
        )}

      {phase !== 'idle' && (
      <>
      <header className="temple-top" ref={headerRef} inert={boardBlocked}>
        {/* At the reading, ← is 「礼毕 · 回殿」. */}
        <button className="icon-btn" onClick={phase === 'reading' ? onNewCast : onExit} aria-label={phase === 'reading' ? t.finish : t.home}>
          ←
        </button>
        {asked ? (
          <button type="button" className="question-line" onClick={() => setShowQuestion((v) => !v)} aria-expanded={showQuestion} aria-label={`${t.askedMatter}：${asked}`}>
            “{asked}”
          </button>
        ) : (
          <span />
        )}
        <button className="icon-btn" onClick={onToggleSound} aria-pressed={settings.sound} aria-label={t.sound}>
          {settings.sound ? '♪' : '♪̸'}
        </button>
      </header>
      {showQuestion && asked && (
        <div className="question-full" role="dialog" aria-label={t.askedMatter} onClick={() => setShowQuestion(false)}>
          <button type="button" className="icon-btn" aria-label={t.close} onClick={() => setShowQuestion(false)}>✕</button>
          <p className="read-kicker">{t.askedMatter}</p>
          <p>“{asked}”</p>
        </div>
      )}
      </>
      )}

      {tier && phase === 'reading' && reading && (
        <nav className="sr-only stone-access" aria-label={t.details} inert={boardBlocked}>
          {(['primary', 'mutual', 'changed'] as const).map((s) => (
            <button key={s} onClick={() => onOpenStage(s)}>
              {t[`stage_${s}`]} {reading.stages[s].name} {reading.stages[s].baseGrade}
            </button>
          ))}
        </nav>
      )}

      {(sceneFailed || (!tier && settings.quality !== '2d')) && <p className="toast">{t.webglFallback}</p>}

      {inRitual && phaseTitle[phase] && (
        <p className="phase-title" key={phase}>
          {phaseTitle[phase]}
        </p>
      )}

      {phase === 'entering' && <PreceptSubtitle t={t} clock={clock} reduced={reduced} />}
      {tier && intro !== 'done' && introRef.current.painted && ritual.phase === 'idle' && (
        <PaintedWalkIn
          clock={clock}
          intro={introRef}
          reduced={reduced}
          onDone={() => {
            introRef.current.done = true;
            onIntroDone();
          }}
        />
      )}
      {/* Skipping changes nothing about the cast: the same reading, just without the walk and the bestowal. */}
      {(phase === 'entering' || phase === 'revealing') && record && (
        <button type="button" className="skip-btn" onClick={() => dispatch({ type: 'SKIP', castId: record.castId })}>
          {t.skipRitual}
        </button>
      )}
      {intro === 'gliding' && (
        <button
          type="button"
          className="skip-btn"
          onClick={() => {
            introRef.current.done = true;
            onIntroDone();
          }}
        >
          {t.skipWalk}
        </button>
      )}

      {bestowed && (
        <p className="bestowed" aria-live="polite" style={{ animationDuration: `${bestowSeconds}s` }}>
          {t.bestowed}
        </p>
      )}

      <footer className="temple-bottom" ref={footerRef} inert={boardBlocked}>
        {phase === 'reading' && reading && (
          <>
            {versionChanged && <p className="note">{t.snapshotNotice}</p>}
            {drift.length > 0 && <p className="error">{t.driftNotice}</p>}
            {/* The relation is carved on the table; screen readers still get it here. */}
            {tier && relation && <p className="sr-only">{relationAria(relation, settings.lang)}</p>}
            {/* 观卦: the stone stays fully in view; one entry leads to the 断语 (读卦). */}
            {/* First time at the stone: how to read it, then where the conclusion is (ui/coach.tsx).
                With the tips off, the short 「卦象自下而上」 line still shows once. */}
            {/* The first time at the stone: one short line in the open floor under the table's feet,
                just above the 简断 card, closable; the slab itself stays clear. The line card explains
                a tapped line. */}
            {!readMode && !tip && !bookPage && !sectionPage && !showBook && !selection && !memberOpen && phase === 'reading' && (
              <CoachTip id="stone" t={t} text={t.coachStone} anchor=".view-judgment" strip />
            )}
            {orderHint && !readMode && !tip && coach.snapshot().off && (
              <p className="order-hint" role="status"><span aria-hidden="true">↑</span> {t.orderHint}</p>
            )}
            {/* The conclusion, whole, under the stone (not cut off in a one-line bar): 简断's title and
                one tap to read it all. Without a written 断语 it says so and still opens the reading. */}
            <button
              type="button"
              className="view-judgment"
              ref={readButton}
              onClick={() => {
                coach.done('stone');
                // 「看详断」 keeps its word: the reading opens on the 详断, unfolded (without a written
                // 断语, 「查看说明」 opens at the top).
                setReadMode(judgmentView?.state === 'ready' ? 'detail' : 'top');
              }}
              aria-label={`${t.viewJudgment}${headline ? `：${headline}` : ''}`}>
              <span className="view-judgment-label">{judgmentView?.state === 'ready' ? t.briefKicker : t.viewJudgment}</span>
              {headline && <span className="view-judgment-head">{headline}</span>}
              <span className="view-judgment-more">
                {judgmentView?.state === 'ready' ? t.readFull : t.readNote} <span aria-hidden="true">›</span>
              </span>
            </button>
          </>
        )}
      </footer>

      {readMode && reading && phase === 'reading' && (
        <ReadingView
          reading={reading}
          blocked={!!(showBook || bookPage || sectionPage || selection || memberOpen)}
          question={asked}
          questionId={record?.questionId}
          conditions={record?.conditions}
          topicId={record?.topicId}
          snapshot={record?.snapshot}
          judgment={judgmentView ?? { state: 'legacy' }}
          onUnlock={() => onOpenMembership('judgment', record?.castId ?? null)}
          sectionTitle={(id) => {
            try {
              return knowledge.library.getSection(id)?.title ?? null;
            } catch {
              return null;
            }
          }}
          onOpenSection={(title, quote) => {
            if (!reading) return;
            // A section of 《梅花易数》, or one of the eighteen category passages (cited by a 断语).
            const text = title === reading.domain.title ? reading.domain.text : knowledge.library.listSections().find((x) => x.title === title)?.text ?? knowledge.library.listDomains().find((d) => d.title === title)?.text;
            if (text) setSectionPage({ title, text, quote });
          }}
          onOpenBook={(id, line, stage) => {
            if (!reading) return;
            if (!stage) {
              setBookPage({ hexagramId: id, line });
              return;
            }
            const y = reading.synthesis;
            const st = y.applicable ? y.stages.find((s) => s.hexagramStage === stage) : undefined;
            const evidence = [
              ...(stage === 'primary' ? [t.bookEvidenceLine(reading.selectedMovingLine.label)] : []),
              ...(st ? [st.main.stageLabel + '：' + st.evidence] : []),
              ...(stage === 'primary' && reading.domainPassage ? ['《' + reading.domain.title.replace(/第.+$/, '') + '》：' + reading.domainPassage.quote] : []),
            ];
            const lineLabel = line && stage === 'primary' ? reading.selectedMovingLine.label + (settings.lang === 'en' ? ' moves' : '动') : '';
            setBookPage({
              hexagramId: id,
              line,
              context: t.bookContextLine(t[STAGE_LABEL[stage]], reading.stages[stage].name, lineLabel),
              evidence,
            });
          }}
          castTime={castTimeLabel}
          t={t}
          lang={settings.lang}
          focus={readMode === 'top' || readMode === 'detail' ? null : readMode}
          startAt={readMode === 'detail' ? 'detail' : undefined}
          remind={remind}
          saved={!!bookEntry}
          onPick={onPick}
          onSave={() => setShowBook(true)}
          onClose={() => {
            restoreReadButton.current = true;
            setReadMode(null);
          }}
        />
      )}
      {sectionPage && readMode && (
        <div className="book-overlay">
          <SectionPage target={sectionPage} t={t} onBack={() => setSectionPage(null)} />
        </div>
      )}
      {bookPage && readMode && (
        <div className="book-overlay">
          <HexagramPage knowledge={knowledge} target={bookPage} t={t} lang={settings.lang} onNavigate={setBookPage} onBack={() => setBookPage(null)} />
        </div>
      )}
      {showBook && record && reading && (
        <JournalSheet
          t={t}
          title={`${reading.stages.primary.name} → ${reading.stages.changed.name}`}
          entry={bookEntry}
          onSave={(note) => {
            journal.save(record.castId, note);
            setBookRev((n) => n + 1);
          }}
          onRemove={() => {
            journal.remove(record.castId);
            setBookRev((n) => n + 1);
            setShowBook(false);
          }}
          onClose={() => setShowBook(false)}
        />
      )}
      {tip && reading && phase === 'reading' && !readMode && (
        <LineTip tip={tip} knowledge={knowledge} reading={reading} t={t} onOpen={() => {
          setSelection(tip.sel);
          setTip(null);
        }} />
      )}
      {selection && reading && (
        <DetailSheet knowledge={knowledge} selection={selection} reading={reading} record={record} t={t} lang={settings.lang} onSelect={setSelection} onClose={() => setSelection(null)} />
      )}
    </div>
  );
}
