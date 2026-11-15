/**
 * Home, inside the hall: the visitor stands before the 三清 and, on a lacquered tray at the
 * bottom of the view, taps one of the six categories of the formal product catalog; a drawer
 * offers its subcategories and their fixed questions. Nothing is typed: there is no question box
 * and no system keyboard (the few numbers some casting methods take are entered on an in-app pad).
 * Then the method, the hour of casting, the pace, and 诚心起卦 — or, for a reference or guidance
 * question, 查看说明 at once (no cast). Library, history and settings are small icons at the top.
 */
import { createPortal } from 'react-dom';
import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTrayDrag } from './trayDrag';
import { coach } from './coach';
import { Exit } from './Exit';
import { tour } from './Tour';
import { FollowupCard, type FollowupAsk } from './FollowupCard';
import { DailyCard, type DailyView } from './DailyCard';
import { askMotion } from './ShakeCast';
import { MeScreen, type MeData } from './MeScreen';
import { askReminderPermission, canRemind } from '../domain/reminders';
import type { Settings } from '../domain/settings';
import type { Strings } from '../domain/i18n';
import { createCalendarProvider } from '../domain/calendar';
import { DIRECTIONS, METHODS, TRIGRAM_EXAMPLES, TRIGRAMS, type ClassicalMethod, type TrigramId } from '../domain/methods';
import { castTimeText, deviceTimeZone } from './timeText';
import { DOMAINS, SAFETY, enabledQuestions, questionById, questionWording, readinessOf, subtypeById, type CatalogDomain, type CatalogQuestion, type CatalogSubtype, type DomainId, type Readiness } from '../domain/questionCatalog';

export interface EntryForm {
  /** The fixed question chosen by tapping (null until one is chosen). */
  questionId: string | null;
  /** Answers to that question's fixed-option conditions. */
  conditions: Record<string, string>;
  /** Classical category of the chosen question (from the catalog). */
  domainId: string;
  method: ClassicalMethod;
  count: string;
  surname: string;
  textUpper: string;
  textLower: string;
  major: string;
  minor: string;
  objectTrigram: TrigramId | '';
  directionTrigram: TrigramId | '';
  customTime: boolean;
  /** datetime-local value, e.g. 2026-11-10T17:30 */
  customAt: string;
  /** The domain of the chosen question. */
  topicId: DomainId | null;
}

/** Every method's own inputs, empty: each method keeps nothing of another's (物数 is not 声音). */
export const NO_METHOD_INPUT = { count: '', surname: '', textUpper: '', textLower: '', major: '', minor: '', objectTrigram: '', directionTrigram: '' } as const;

export const EMPTY_FORM: EntryForm = {
  questionId: null,
  conditions: {},
  domainId: 'domain-02', // replaced when a question is picked
  topicId: null,
  method: 'classical-time',
  count: '',
  surname: '',
  textUpper: '',
  textLower: '',
  major: '',
  minor: '',
  objectTrigram: '',
  directionTrigram: '',
  customTime: false,
  customAt: '',
};

interface Props {
  t: Strings;
  settings: Settings;
  form: EntryForm;
  error: string | null;
  onForm: (f: EntryForm) => void;
  onSettings: (s: Settings) => void;
  onEnter: () => void;
  onLibrary: () => void;
  onHistory: () => void;
  /** ← at the top left: back to the 「轻触 · 入殿」 title screen. */
  onTitle: () => void;
  onDebug: () => void;
  onSignOut?: () => void;
  onMembership?: () => void;
  /** e.g. 免费 · 每日一卦 · 今日已问 0/1 卦 */
  memberLine?: string;
  /** 道号 of the visitor (empty for a guest). */
  profileName?: string;
  /** Effective pace of the next cast: the full ritual or straight to the reading. */
  pace: 'full' | 'quick';
  /** The 断语 is being looked up for a cast just made (the button waits). */
  busy?: boolean;
  /** 应期回访: a 应期 that has come, asked about in the tray. */
  followup?: FollowupAsk | null;
  /** 我的: what the user centre shows. */
  me?: MeData;
  /** 今日一卦, offered until opened that day (after any 回访). */
  daily?: DailyView | null;
}

/**
 * 常问: what people worry about, in their own words, across all six fields (each one an entry, so
 * it reads that entry's 断语 once written; until then the entry says 整理中 as usual). Mixed by
 * field so the first few already show the range.
 */
const COMMON_ASKS: readonly { id: string; words: { zh: string; en: string } }[] = [
  { id: 'career.interview', words: { zh: '面试能不能过', en: 'Will I pass the interview?' } },
  { id: 'relationships.affection', words: { zh: '最近有没有新桃花', en: 'Will someone new come along?' } },
  { id: 'career.job-change', words: { zh: '想跳槽又怕后悔', en: 'Should I change jobs?' } },
  { id: 'wealth.debt', words: { zh: '这笔钱能不能要回来', en: 'Will I get this money back?' } },
  { id: 'relationships.reconciliation', words: { zh: '这段感情还能复合吗', en: 'Can we get back together?' } },
  { id: 'relationships.confession', words: { zh: '对方心里有没有我', en: 'Do they care for me?' } },
  { id: 'search.lost-object', words: { zh: '东西丢了还能找回吗', en: 'Will I find what I lost?' } },
  { id: 'career.exams', words: { zh: '这次考试能过吗', en: 'Will I pass this exam?' } },
  { id: 'home.buying', words: { zh: '这套房子该不该买', en: 'Should I buy this home?' } },
  { id: 'career.promotion-pay', words: { zh: '升职加薪有没有戏', en: 'Will I be promoted?' } },
  { id: 'wealth.income', words: { zh: '最近财运怎么样', en: 'How is money looking?' } },
  { id: 'relationships.marriage-plans', words: { zh: '能不能走到结婚', en: 'Will we marry?' } },
  { id: 'home.family-relations', words: { zh: '家里的争执能平息吗', en: 'Will the family quarrel settle?' } },
  { id: 'wealth.operations', words: { zh: '生意能不能做起来', en: 'Will the business do well?' } },
  { id: 'search.pets', words: { zh: '走失的宠物能找回吗', en: 'Will my lost pet come home?' } },
  { id: 'health.family-health', words: { zh: '家人身体让人担心', en: 'Worried about a family member’s health' } },
];

/** 人事占第二 → 人事 */
export const shortDomain = (title: string) => title.replace(/占第.+$/, '');

/** 字占 counts the characters the asker writes; with fixed questions there is nothing written, so it is not offered. */
export const UI_METHODS = METHODS.filter((m) => m !== 'text');

/** Line icons for the six domains (24×24, stroked like the other hall icons). */
const DOMAIN_ICON: Record<DomainId, string> = {
  career: 'M4.5 8.5h15v10h-15zM9 8.5V6.3c0-.7.5-1.3 1.2-1.3h3.6c.7 0 1.2.6 1.2 1.3v2.2M4.5 13h15M11 13v1.6h2V13',
  wealth: 'M12 4a8 8 0 1 0 0 16 8 8 0 1 0 0-16zM9.6 9.6h4.8v4.8H9.6z',
  relationships: 'M9 7a5 5 0 1 0 0 10 5 5 0 1 0 0-10zM15 7a5 5 0 1 0 0 10 5 5 0 1 0 0-10z',
  health: 'M12 3.5v2.2M12 5.7a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 1 0 0-5.6zM9.7 11c-3 1.3-3.7 3.7-3.2 5.4.7 2.4 2.9 3.6 5.5 3.6s4.8-1.2 5.5-3.6c.5-1.7-.2-4.1-3.2-5.4',
  home: 'M3.5 11 12 4.5l8.5 6.5M6 9.6V19h12V9.6M10 19v-4.6h4V19',
  search: 'M12 4a8 8 0 1 0 0 16 8 8 0 1 0 0-16zM14.6 9.4l-1.9 4.3-4.3 1.9 1.9-4.3zM12 2.5v1.5M12 20v1.5',
};

function DomainIcon({ id }: { id: DomainId }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="domain-icon">
      <path d={DOMAIN_ICON[id]} />
    </svg>
  );
}

/** A subtype's tag: written if any of its questions has a written 断语 library. */
const subtypeReadiness = (s: CatalogSubtype): Readiness => {
  const states = enabledQuestions(s).map(readinessOf);
  if (states.includes('written')) return 'written';
  if (states.includes('pending')) return 'pending';
  return states.every((x) => x === 'guidance') ? 'guidance' : 'reference';
};
const subtypeOf = (q: CatalogQuestion) => subtypeById(questionById(q.question_id)?.subtype_id);

/**
 * The drawer: a domain's entries (two columns). An entry is the question itself, so tapping it
 * chooses it; the question and option levels remain only for a subtype with several questions or
 * fixed options, which the catalog's entries do not have. Back returns one level. It sits at the bottom so the 三清 stay in view above it.
 */
function AskDrawer({ t, domain, lang, form, onPick, onClose }: { t: Strings; domain: CatalogDomain; lang: 'zh' | 'en'; form: EntryForm; onPick: (q: CatalogQuestion, conditions: Record<string, string>) => void; onClose: () => void }) {
  const current = questionById(form.questionId);
  const mine = current?.domain_id === domain.domain_id ? current : null;
  const [subtype, setSubtype] = useState<CatalogSubtype | null>(() => {
    const selected = subtypeById(mine?.subtype_id);
    return selected && enabledQuestions(selected).length > 1 ? selected : null;
  });
  const [question, setQuestion] = useState<CatalogQuestion | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>(() => (mine ? form.conditions : {}));
  const tag = (state: Readiness) =>
    state === 'written' ? null : <small className={`ready-tag is-${state}`}>{state === 'pending' ? t.scriptPendingTag : state === 'reference' ? t.referenceTag : t.guidanceTag}</small>;
  const choose = (q: CatalogQuestion) => {
    if (q.conditions?.length) {
      setQuestion(q);
      setAnswers(mine?.question_id === q.question_id ? form.conditions : {});
    } else onPick(q, {});
  };
  const openSubtype = (s: CatalogSubtype) => {
    const qs = enabledQuestions(s);
    // An entry is its own question: chosen at once. (A safety note shows with what it opens.)
    if (qs.length === 1) choose(qs[0]);
    else setSubtype(s);
  };
  const level = question ? 'conditions' : subtype ? 'questions' : 'subtypes';
  const back = () => (question ? setQuestion(null) : setSubtype(null));
  const heading = level === 'subtypes' ? domain.label[lang] : (subtype ?? (question ? subtypeOf(question) : null))?.label[lang];
  return (
    <div className="sheet-backdrop ask-backdrop" onClick={onClose}>
      <section className="sheet ask-sheet" role="dialog" aria-label={domain.label[lang]} onClick={(e) => e.stopPropagation()}>
        <header className="sheet-head ask-sheet-head">
          {level !== 'subtypes' ? (
            <button type="button" className="icon-btn" onClick={back} aria-label={t.backLevel}>
              ←
            </button>
          ) : (
            <span className="ask-sheet-icon">
              <DomainIcon id={domain.domain_id} />
            </span>
          )}
          <div className="ask-sheet-title">
            <p className="sheet-kicker">{level === 'subtypes' ? t.pickSubtype : level === 'questions' ? t.pickQuestion : t.pickCondition}</p>
            <h2>{heading}</h2>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={t.close}>
            ✕
          </button>
        </header>
        <div className="sheet-body ask-sheet-body">
          {domain.caution && level === 'subtypes' && <p className="ask-caution">{domain.caution[lang]}</p>}
          {level === 'subtypes' && (
            <div className="subtype-grid">
              {domain.subtypes.map((s) => {
                const on = current?.subtype_id === s.subtype_id;
                return (
                  <button type="button" key={s.subtype_id} data-tour={s.subtype_id} className={on ? 'is-on' : ''} aria-current={on ? 'true' : undefined} onClick={() => openSubtype(s)}>
                    <span>{s.label[lang]}</span>
                    {tag(subtypeReadiness(s))}
                  </button>
                );
              })}
            </div>
          )}
          {level === 'questions' && subtype && (
            <>
              {subtype.safety && (
                <p className="ask-safety" role="note">
                  {SAFETY[subtype.safety][lang]}
                </p>
              )}
              <div className="question-list">
                {enabledQuestions(subtype).map((q) => {
                  const on = form.questionId === q.question_id;
                  return (
                    <button type="button" key={q.question_id} className={on ? 'is-on' : ''} aria-current={on ? 'true' : undefined} onClick={() => choose(q)}>
                      <span>{q.question_text[lang]}</span>
                      {tag(readinessOf(q))}
                    </button>
                  );
                })}
              </div>
            </>
          )}
          {level === 'conditions' && question && (
            <>
              <p className="ask-chosen">{question.question_text[lang]}</p>
              {question.conditions!.map((c) => (
                <div key={c.condition_id} className="condition-block">
                  <p className="method-sub">{c.label[lang]}</p>
                  <div className="condition-options" role="radiogroup" aria-label={c.label[lang]}>
                    {c.options.map((o) => (
                      <button type="button" key={o.option_id} role="radio" aria-checked={answers[c.condition_id] === o.option_id} className={answers[c.condition_id] === o.option_id ? 'is-on' : ''} onClick={() => setAnswers({ ...answers, [c.condition_id]: o.option_id })}>
                        {o.label[lang]}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <button type="button" className="enter-seal small" disabled={!question.conditions!.every((c) => answers[c.condition_id])} onClick={() => onPick(question, answers)}>
                {t.done}
              </button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

const METHOD_KEY: Record<ClassicalMethod, [keyof Strings, keyof Strings]> = {
  'classical-time': ['m_classical', 'md_classical'],
  'object-count': ['m_object', 'md_object'],
  'sound-count': ['m_sound', 'md_sound'],
  text: ['m_text', 'md_text'],
  'object-direction': ['m_objdir', 'md_objdir'],
  'chi-cun': ['m_chicun', 'md_chicun'],
  'zhang-chi': ['m_zhangchi', 'md_zhangchi'],
};

const digits = (v: string, max = 4) => v.replace(/\D/g, '').slice(0, max);

function localInputValue(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** A number shown as a button; tapping it opens the in-app pad (no system keyboard). */
function NumberField({ label, value, active, onFocus }: { label: string; value: string; active: boolean; onFocus: () => void }) {
  return (
    <div className="num-field">
      <button type="button" className={`num-value ${active ? 'is-on' : ''}`} aria-label={`${label}${value ? ` ${value}` : ''}`} aria-pressed={active} onClick={onFocus}>
        {value || '—'}
      </button>
      <span>{label}</span>
    </div>
  );
}

function DigitPad({ t, value, max, onChange, onDone }: { t: Strings; value: string; max: number; onChange: (v: string) => void; onDone: () => void }) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'back'];
  return (
    <div className="digit-pad" role="group" aria-label={t.digitPad}>
      {keys.map((k) => (
        <button
          type="button"
          key={k}
          className={k.length > 1 ? 'is-fn' : ''}
          aria-label={k === 'clear' ? t.digitClear : k === 'back' ? t.digitBack : k}
          onClick={() => onChange(k === 'clear' ? '' : k === 'back' ? value.slice(0, -1) : digits(value + k, max))}
        >
          {k === 'clear' ? t.digitClear : k === 'back' ? '⌫' : k}
        </button>
      ))}
      <button type="button" className="digit-done" onClick={onDone}>
        {t.done}
      </button>
    </div>
  );
}

export const HomeOverlay = memo(function HomeOverlay({ t, settings, form, error, onForm, onSettings, onEnter, onLibrary, onHistory, onTitle, onDebug, onSignOut, profileName, onMembership, memberLine, busy = false, followup = null, daily = null, me }: Props) {
  const [showSettings, setShowSettings] = useState(false);
  const [remindDenied, setRemindDenied] = useState(false);
  const [showMe, setShowMe] = useState(false);
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => onSettings({ ...settings, [k]: v });
  const f = <K extends keyof EntryForm>(k: K, v: EntryForm[K]) => onForm({ ...form, [k]: v });

  // The hour of casting, live (or the chosen moment).
  const provider = useMemo(() => createCalendarProvider(), []);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 20_000);
    return () => window.clearInterval(id);
  }, []);
  const moment = form.customTime && form.customAt ? new Date(form.customAt) : now;
  const timeText = useMemo(() => {
    if (Number.isNaN(moment.getTime())) return '—';
    try {
      const cal = provider.resolve({ instant: moment, timeZone: deviceTimeZone(), policy: { ziHour: settings.ziHour, clock: settings.calendarClock } });
      return castTimeText(cal, settings.lang);
    } catch {
      return '—';
    }
  }, [provider, moment.getTime(), settings.ziHour, settings.calendarClock, settings.lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const [mk, dk] = METHOD_KEY[form.method];

  const [showMethods, setShowMethods] = useState(false);
  // The sheet in two steps: the method's own page of inputs, and the list (← from that page).
  // It opens on the page of the method in use (年月日时 unless another was chosen).
  const [methodStep, setMethodStep] = useState<'list' | 'input'>('input');
  const openMethods = () => {
    setMethodStep('input');
    setShowMethods(true);
  };
  /** Choosing another method starts it empty; choosing the same one again keeps what was entered. */
  const chooseMethod = (m: ClassicalMethod) => {
    if (m !== form.method) onForm({ ...form, ...NO_METHOD_INPUT, method: m });
    setMethodStep('input');
  };
  /** ← from a method's page: nothing chosen there is kept, and the cast goes back to 年月日时. */
  const backToMethods = () => {
    onForm({ ...form, ...NO_METHOD_INPUT, method: EMPTY_FORM.method });
    setMethodStep('list');
  };
  // The domain whose drawer is open (its button glows while the drawer is up).
  const [drawer, setDrawer] = useState<CatalogDomain | null>(null);
  const [lastDomain, setLastDomain] = useState<string | null>(null);
  // The six fields, shown until a matter is chosen (and again when the visitor wants to change it).
  const [pickOpen, setPickOpen] = useState(false);
  // Which number the in-app pad is editing.
  const [pad, setPad] = useState<{ key: 'surname' | 'count' | 'major' | 'minor'; max: number } | null>(null);
  useEffect(() => setPad(null), [form.method, showMethods]);
  // The method sheet is as tall as what it shows (no empty space); between the list and a method's
  // page its height eases from one to the other instead of jumping.
  const methodSheet = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const s = methodSheet.current;
    if (!s) return;
    const from = s.style.height ? s.getBoundingClientRect().height : null;
    s.style.height = 'auto';
    const to = s.getBoundingClientRect().height;
    if (from === null || Math.abs(from - to) < 1) {
      s.style.height = `${to}px`;
      return;
    }
    s.style.height = `${from}px`;
    void s.offsetHeight; // start the transition from the old height
    // While it eases to the new height the content is taller than the sheet for a moment: no
    // scrollbar then (it would flash, narrow the page and re-wrap the text), only once settled.
    s.classList.add('is-sizing');
    s.style.height = `${to}px`;
    const settle = window.setTimeout(() => s.classList.remove('is-sizing'), 340);
    return () => {
      window.clearTimeout(settle);
      s.classList.remove('is-sizing');
    };
  }, [showMethods, methodStep, form.method, form.customTime, pad, settings.lang]);
  const chosen = questionById(form.questionId);
  const chosenSubtype = chosen ? subtypeOf(chosen) : null;
  const lang = settings.lang;
  const ready = chosen ? readinessOf(chosen) : null;
  // Reference and guidance questions are read at once: no method, time or pace to choose.
  const readOnly = ready === 'reference' || ready === 'guidance';
  // The field last tapped stays lit after its drawer closes (even with nothing chosen there); a matter
  // chosen elsewhere does not pull it back.
  const litDomain = drawer?.domain_id ?? lastDomain ?? chosen?.domain_id ?? null;
  const tray = useRef<HTMLFormElement>(null);
  const trayDrag = useTrayDrag(tray);
  const numberField = (key: 'surname' | 'count' | 'major' | 'minor', label: string, max: number) => (
    <NumberField label={label} value={form[key]} active={pad?.key === key} onFocus={() => setPad({ key, max })} />
  );
  return (
    <div className="home">
      <header className="home-top">
        <button type="button" className="icon-btn home-back" onClick={onTitle} aria-label={t.backToTitle} title={t.backToTitle}>
          ←
        </button>
        <button className="line-icon place-dup" onClick={onLibrary} aria-label={t.library} title={t.library}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4.5h9.5a3 3 0 0 1 3 3V20H8a3 3 0 0 1-3-3z" /><path d="M5 17a3 3 0 0 1 3-3h9.5" /><path d="M9 8h5M9 10.5h5" /></svg>
        </button>
        <button className="line-icon place-dup" onClick={onHistory} aria-label={t.history} title={t.history}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" /><path d="M12 7.5V12l3 2" /></svg>
        </button>
        <span className="home-spacer" />
        {/* 我的: the user centre (设置 is inside it). */}
        <button className="icon-btn home-settings home-me" onClick={() => (me ? setShowMe(true) : setShowSettings(true))} aria-label={t.meTitle} title={t.meTitle}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8.5" r="3.6" /><path d="M5 20c.8-3.8 3.6-5.8 7-5.8s6.2 2 7 5.8" /></svg>
        </button>
      </header>

      {/* 应期回访: a slim line over the beams, under the top bar (the tray and the 三清 stay as they are). */}
      <div className="followup-float">
        <FollowupCard t={t} ask={followup} lang={settings.lang} />
        {!followup && <DailyCard t={t} daily={daily} />}
      </div>

      {/* The hall's own 三清殿 plaque is the title; the name stays for screen readers. */}
      <h1 className="sr-only">{t.appName} · {t.tagline}</h1>

      {/* The working layer: solid enough to read on, below the 三清 so it never covers them. */}
      <form
        ref={tray}
        className="home-panel v3 is-rising"
        onSubmit={(e) => {
          e.preventDefault();
          // Doing what a tip says is as good as 「知道了」.
          coach.done('cast');
          // Every cast is shaking the 签筒 before the 三清: iOS asks for motion only from a tap.
          void askMotion();
          onEnter();
        }}
      >
        {/* The head pulls the tray down or up, wherever the visitor likes; a tap folds or unfolds it. */}
        <div className="tray-head" role="button" tabIndex={0} aria-label={t.trayGrip} {...trayDrag}>
          <i className="tray-grip" aria-hidden="true" />
          <p className="ask-label">{t.askWhat}</p>
        </div>
        {/* Once a matter is chosen the six fields fold away, so the tray stays low and the 三清 and
            the altar stay in view; tapping the chosen matter brings them back to change it. */}
        {/* 常问: what people actually worry about, in their own words, across the six fields (one tap
            chooses that entry, as its drawer would). */}
        {!chosen && (
          <div className="common-asks" role="group" aria-label={t.commonAsks}>
            {COMMON_ASKS.map((c) => {
              const q = questionById(c.id);
              if (!q) return null;
              return (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => {
                    setLastDomain(q.domain_id);
                    onForm({ ...form, questionId: q.question_id, conditions: {}, topicId: q.domain_id, domainId: q.classical_domain_id ?? form.domainId });
                    coach.done('domain');
                    coach.done('drawer');
                  }}
                >
                  {c.words[lang]}
                </button>
              );
            })}
          </div>
        )}
        {(!chosen || pickOpen) && (
          <div className="topic-grid" role="radiogroup" aria-label={t.domainLabel}>
            {DOMAINS.map((d) => (
              <button type="button" key={d.domain_id} data-tour={d.domain_id} role="radio" aria-checked={litDomain === d.domain_id} className={litDomain === d.domain_id ? 'is-on' : ''} onClick={() => { coach.done('domain'); setLastDomain(d.domain_id); setDrawer(d); }}>
                <DomainIcon id={d.domain_id} />
                <span>{d.label[lang]}</span>
              </button>
            ))}
          </div>
        )}
        {chosen && chosenSubtype && (
          <button
            type="button"
            className="chosen-question"
            onClick={() => {
              // Its field's drawer at once (the usual change); the six fields open behind it for another field.
              setPickOpen(true);
              setDrawer(DOMAINS.find((d) => d.domain_id === chosen.domain_id) ?? null);
            }}
          >
            <span className="chosen-kicker">
              <span>
                {t.askedMatter}
                {/* An entry is its own question: its name is not said twice. */}
                {chosen.question_text[lang] !== chosenSubtype.label[lang] && ` · ${chosenSubtype.label[lang]}`}
              </span>
              <em>{t.changeQuestion} ›</em>
            </span>
            <b>{questionWording(chosen, form.conditions, lang)}</b>
            {ready !== 'written' && <small className="chosen-note">{ready === 'pending' ? t.scriptPendingNote : ready === 'reference' ? t.referenceNote : t.guidanceNote}</small>}
          </button>
        )}
        {chosenSubtype?.safety && <p className="ask-safety compact">{SAFETY[chosenSubtype.safety][lang]}</p>}
        {!readOnly && (
          <>
            <div className="cast-row">
              {/* The hour cast in, whole and centred on its own line; the other methods a small way in below. */}
              <button type="button" className="method-line" onClick={openMethods}>
                <span className="method-when">
                  <span className="method-name">{t[mk] as string}</span>
                  <i aria-hidden="true">·</i>
                  <span className="method-time">{timeText}</span>
                </span>
                <em>{t.moreMethods} ›</em>
              </button>
            </div>
          </>
        )}
        {error && <p className="error" role="alert">{error}</p>}
        <div className="enter-row">
          <button type="submit" className="enter-seal" disabled={busy} aria-busy={busy}>
            {busy ? t.castingNow : readOnly ? t.readReference : t.enter}
          </button>
        </div>
        <p className="privacy">{t.privacy}</p>
      </form>

      <Exit show={!!(drawer)}>{drawer && (
        <AskDrawer
          t={t}
          domain={drawer}
          lang={lang}
          form={form}
          onClose={() => setDrawer(null)}
          onPick={(q, conditions) => {
            onForm({ ...form, questionId: q.question_id, conditions, topicId: drawer.domain_id, domainId: q.classical_domain_id ?? form.domainId });
            setDrawer(null);
            setPickOpen(false);
            coach.done('domain');
            coach.done('drawer');
          }}
        />
      )}</Exit>

      <Exit show={!!(showMethods)}>{showMethods && (
        <div className="sheet-backdrop" onClick={() => setShowMethods(false)}>
          <section ref={methodSheet} className="sheet method-sheet" role="dialog" aria-label={t.methodLabel} onClick={(e) => e.stopPropagation()}>
            <header className="sheet-head">
              {methodStep === 'input' && (
                <button type="button" className="icon-btn method-back" onClick={backToMethods} aria-label={t.back}>
                  ←
                </button>
              )}
              <h2>{methodStep === 'input' ? (t[mk] as string) : t.methodLabel}</h2>
              <button className="icon-btn" onClick={() => setShowMethods(false)} aria-label={t.close}>
                ✕
              </button>
            </header>
            <div className="sheet-body method-body">
          {methodStep === 'list' ? (
            <>
              <p className="method-hint">{t.methodHint}</p>
              <div className="methods" role="radiogroup" aria-label={t.methodLabel}>
                {UI_METHODS.map((m) => (
                  <button type="button" key={m} role="radio" aria-checked={form.method === m} className={form.method === m ? 'is-on' : ''} onClick={() => chooseMethod(m)}>
                    {t[METHOD_KEY[m][0]] as string}
                  </button>
                ))}
              </div>
            </>
          ) : (
          <>
          <div className="method-card" aria-live="polite">
            <p className="method-rule">
              <b>{t[mk] as string}</b>　{t[dk] as string}
            </p>
            {form.method === 'classical-time' && <div className="method-inputs">{numberField('surname', t.surnameLabel, 2)}</div>}
            {(form.method === 'object-count' || form.method === 'sound-count') && (
              <div className="method-inputs">{numberField('count', form.method === 'sound-count' ? t.soundCountLabel : t.countLabel, 4)}</div>
            )}
            {(form.method === 'chi-cun' || form.method === 'zhang-chi') && (
              <div className="method-inputs">
                {numberField('major', form.method === 'chi-cun' ? t.chiLabel : t.zhangLabel, 3)}
                {numberField('minor', form.method === 'chi-cun' ? t.cunLabel : t.chiLabel, 3)}
              </div>
            )}
            {form.method === 'object-direction' && (
              <div className="method-inputs column">
                <p className="method-sub">{t.objectLabel}</p>
                <div className="trigram-pick" role="radiogroup" aria-label={t.objectLabel}>
                  {TRIGRAMS.map((g) => (
                    <button type="button" key={g} role="radio" aria-checked={form.objectTrigram === g} className={form.objectTrigram === g ? 'is-on' : ''} onClick={() => f('objectTrigram', g)}>
                      <b>{g}</b>
                      <small>{TRIGRAM_EXAMPLES[g]}</small>
                    </button>
                  ))}
                </div>
                <p className="method-sub">{t.directionLabel}</p>
                <div className="direction-pick" role="radiogroup" aria-label={t.directionLabel}>
                  {DIRECTIONS.map((d) => (
                    <button type="button" key={d.trigram} role="radio" aria-checked={form.directionTrigram === d.trigram} className={form.directionTrigram === d.trigram ? 'is-on' : ''} onClick={() => f('directionTrigram', d.trigram)}>
                      {lang === 'en' ? d.en : d.label}
                      <small>{d.trigram}</small>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {pad && <DigitPad t={t} value={form[pad.key]} max={pad.max} onChange={(v) => f(pad.key, v)} onDone={() => setPad(null)} />}
          </div>

        <div className="cast-time">
          <span className="cast-time-label">{t.castTimeLabel}</span>
          <span className="cast-time-value">{timeText}</span>
          <button
            type="button"
            className="time-toggle"
            aria-pressed={form.customTime}
            onClick={() => (form.customTime ? f('customTime', false) : onForm({ ...form, customTime: true, customAt: form.customAt || localInputValue(new Date()) }))}
          >
            {form.customTime ? t.momentNow : t.castCustom}
          </button>
          {form.customTime && (
            <label className="custom-at">
              <input type="datetime-local" value={form.customAt} aria-label={t.castCustom} onChange={(e) => f('customAt', e.target.value)} />
              <small>{t.castCustomHint}</small>
            </label>
          )}
        </div>
              <button type="button" className="enter-seal small" onClick={() => setShowMethods(false)}>
                {t.done}
              </button>
          </>
          )}
            </div>
          </section>
        </div>
      )}</Exit>

      {createPortal(
        <Exit show={showMe && !!me}>
          {showMe && me && (
        <MeScreen
          t={t}
          lang={lang}
          data={{ ...me, onOpenRecord: (r) => { setShowMe(false); me.onOpenRecord(r); }, onRecords: () => { setShowMe(false); me.onRecords(); }, onSaved: () => { setShowMe(false); me.onSaved(); }, onLibrary: () => { setShowMe(false); me.onLibrary(); } }}
          onClose={() => setShowMe(false)}
          onSettings={() => {
            setShowMe(false);
            setShowSettings(true);
          }}
        />
      )}
        </Exit>,
        document.body,
      )}
      <Exit show={!!(showSettings)}>{showSettings && (
        <div className="sheet-backdrop" onClick={() => setShowSettings(false)}>
          <section className="sheet settings-sheet" role="dialog" aria-label={t.settings} onClick={(e) => e.stopPropagation()}>
            <header className="sheet-head">
              <h2>{t.settings}</h2>
              <button className="icon-btn" onClick={() => setShowSettings(false)} aria-label={t.close}>
                ✕
              </button>
            </header>
            <div className="sheet-body toggles">
              <div className="lang-switch" role="group" aria-label={t.language}>
                <button className={settings.lang === 'zh' ? 'is-on' : ''} onClick={() => onSettings({ ...settings, lang: 'zh', langChosen: true })}>
                  中文
                </button>
                <button className={settings.lang === 'en' ? 'is-on' : ''} onClick={() => onSettings({ ...settings, lang: 'en', langChosen: true })}>
                  English
                </button>
              </div>
              <label className="toggle">
                <input type="checkbox" checked={settings.sound} onChange={(e) => set('sound', e.target.checked)} /> {t.sound}
              </label>
              <label className="toggle">
                <input type="checkbox" checked={settings.reducedMotion} onChange={(e) => set('reducedMotion', e.target.checked)} /> {t.reducedMotion}
              </label>
              <label className="toggle">
                <input type="checkbox" checked={settings.haptics} onChange={(e) => set('haptics', e.target.checked)} /> {t.haptics}
              </label>
              <label>
                <span>{t.quality}</span>
                <select value={settings.quality} onChange={(e) => set('quality', e.target.value as Settings['quality'])}>
                  {(['auto', 'high', 'medium', 'low', '2d'] as const).map((q) => (
                    <option key={q} value={q}>
                      {t[`quality_${q}`]}
                    </option>
                  ))}
                </select>
              </label>
              <p className="note">{t.flatModeNote}</p>
              {canRemind() && (
                <>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={settings.timingReminders}
                      onChange={async (e) => {
                        const on = e.target.checked;
                        if (on && !(await askReminderPermission())) {
                          setRemindDenied(true);
                          return;
                        }
                        setRemindDenied(false);
                        set('timingReminders', on);
                      }}
                    />{' '}
                    {t.remindToggle}
                  </label>
                  <p className="note">{remindDenied ? t.remindDenied : t.remindNote}</p>
                </>
              )}
              <label>
                <span>{t.calendarPolicy}</span>
                <select value={settings.ziHour} onChange={(e) => set('ziHour', e.target.value as Settings['ziHour'])}>
                  <option value="zi-starts-next-day">{t.zi_next}</option>
                  <option value="zi-late-same-day">{t.zi_same}</option>
                </select>
                <select value={settings.calendarClock} onChange={(e) => set('calendarClock', e.target.value as Settings['calendarClock'])}>
                  <option value="local-wallclock">{t.clock_local}</option>
                  <option value="china-standard-time">{t.clock_cst}</option>
                </select>
              </label>
              {onMembership && (
                <button className="ghost-btn settings-member" onClick={() => { setShowSettings(false); onMembership?.(); }}>
                  {t.memberTitle}
                  {memberLine ? ` · ${memberLine}` : ''}
                </button>
              )}
              <button
                className="text-btn"
                onClick={() => {
                  coach.reset();
                  tour.reset();
                  // The arrow starts from the six fields: clear what was chosen.
                  onForm(EMPTY_FORM);
                  setShowSettings(false);
                }}
              >
                {t.coachReplay}
              </button>
              {onSignOut && (
                <button className="text-btn" onClick={onSignOut}>
                  {t.signOut}
                  {profileName ? `（${profileName}）` : ''}
                </button>
              )}
              {/* 手动联调 is a development tool: not in a release build. */}
              {import.meta.env.DEV && (
                <button className="text-btn" onClick={onDebug}>
                  {t.debug}
                </button>
              )}
            </div>
          </section>
        </div>
      )}</Exit>
    </div>
  );
});
