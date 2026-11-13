/**
 * Home, inside the hall: the visitor stands before the 三清 and, on a lacquered tray at the
 * bottom of the view, taps one of the six categories of the formal product catalog; a drawer
 * offers its subcategories and their fixed questions. Nothing is typed: there is no question box
 * and no system keyboard (the few numbers some casting methods take are entered on an in-app pad).
 * Then the method, the hour of casting, the pace, and 诚心起卦 — or, for a reference or guidance
 * question, 查看说明 at once (no cast). Library, history and settings are small icons at the top.
 */
import { memo, useEffect, useMemo, useState } from 'react';
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
}

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
 * The drawer: a domain's subtypes (two columns), then — when a subtype has several fixed
 * questions, a safety note, or fixed-option conditions — the questions and options. Back returns
 * one level. It sits at the bottom so the 三清 stay in view above it.
 */
function AskDrawer({ t, domain, lang, form, onPick, onClose }: { t: Strings; domain: CatalogDomain; lang: 'zh' | 'en'; form: EntryForm; onPick: (q: CatalogQuestion, conditions: Record<string, string>) => void; onClose: () => void }) {
  const current = questionById(form.questionId);
  const mine = current?.domain_id === domain.domain_id ? current : null;
  const [subtype, setSubtype] = useState<CatalogSubtype | null>(() => {
    const selected = subtypeById(mine?.subtype_id);
    return selected && (enabledQuestions(selected).length > 1 || selected.safety) ? selected : null;
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
    // One fixed question and no safety note to read first: chosen at once (or straight to its options).
    if (qs.length === 1 && !s.safety) choose(qs[0]);
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
                  <button type="button" key={s.subtype_id} className={on ? 'is-on' : ''} aria-current={on ? 'true' : undefined} onClick={() => openSubtype(s)}>
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

export const HomeOverlay = memo(function HomeOverlay({ t, settings, form, error, onForm, onSettings, onEnter, onLibrary, onHistory, onTitle, onDebug, onSignOut, profileName, onMembership, memberLine, pace, busy = false }: Props) {
  const [showSettings, setShowSettings] = useState(false);
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
  // The domain whose drawer is open (its button glows while the drawer is up).
  const [drawer, setDrawer] = useState<CatalogDomain | null>(null);
  // Which number the in-app pad is editing.
  const [pad, setPad] = useState<{ key: 'surname' | 'count' | 'major' | 'minor'; max: number } | null>(null);
  useEffect(() => setPad(null), [form.method, showMethods]);
  const chosen = questionById(form.questionId);
  const chosenSubtype = chosen ? subtypeOf(chosen) : null;
  const lang = settings.lang;
  const ready = chosen ? readinessOf(chosen) : null;
  // Reference and guidance questions are read at once: no method, time or pace to choose.
  const readOnly = ready === 'reference' || ready === 'guidance';
  const litDomain = drawer?.domain_id ?? chosen?.domain_id ?? null;
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
        <button className="line-icon" onClick={() => setShowSettings(true)} aria-label={t.settings} title={t.settings}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M5 12h14M5 17h14" /><circle cx="9" cy="7" r="1.6" /><circle cx="15" cy="12" r="1.6" /><circle cx="8" cy="17" r="1.6" /></svg>
        </button>
      </header>

      {/* The hall's own 三清殿 plaque is the title; the name stays for screen readers. */}
      <h1 className="sr-only">{t.appName} · {t.tagline}</h1>

      {/* The working layer: solid enough to read on, below the 三清 so it never covers them. */}
      <form
        className="home-panel v3 is-rising"
        onSubmit={(e) => {
          e.preventDefault();
          onEnter();
        }}
      >
        <p className="ask-label">{t.askWhat}</p>
        <div className="topic-grid" role="radiogroup" aria-label={t.domainLabel}>
          {DOMAINS.map((d) => (
            <button type="button" key={d.domain_id} role="radio" aria-checked={litDomain === d.domain_id} className={litDomain === d.domain_id ? 'is-on' : ''} onClick={() => setDrawer(d)}>
              <DomainIcon id={d.domain_id} />
              <span>{d.label[lang]}</span>
            </button>
          ))}
        </div>
        {chosen && chosenSubtype && (
          <button type="button" className="chosen-question" onClick={() => setDrawer(DOMAINS.find((d) => d.domain_id === chosen.domain_id) ?? null)}>
            <span className="chosen-kicker">
              <span>
                {t.askedMatter} · {chosenSubtype.label[lang]}
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
              <button type="button" className="method-line" onClick={() => setShowMethods(true)}>
                <span>{t[mk] as string}</span>
                <i aria-hidden="true">·</i>
                <span className="method-time">{timeText}</span>
                <em>{t.moreMethods}</em>
              </button>
            </div>
            <div className="pace-switch" role="radiogroup" aria-label={t.paceLabel}>
              {(['full', 'quick'] as const).map((p) => (
                <button type="button" key={p} role="radio" aria-checked={pace === p} className={pace === p ? 'is-on' : ''} onClick={() => set('ritualMode', p)}>
                  {p === 'full' ? t.paceFull : t.paceQuick}
                </button>
              ))}
            </div>
          </>
        )}
        {error && <p className="error" role="alert">{error}</p>}
        <button type="submit" className="enter-seal" disabled={busy} aria-busy={busy}>
          {busy ? t.castingNow : readOnly ? t.readReference : t.enter}
        </button>
        <p className="privacy">{t.privacy}</p>
      </form>

      {drawer && (
        <AskDrawer
          t={t}
          domain={drawer}
          lang={lang}
          form={form}
          onClose={() => setDrawer(null)}
          onPick={(q, conditions) => {
            onForm({ ...form, questionId: q.question_id, conditions, topicId: drawer.domain_id, domainId: q.classical_domain_id ?? form.domainId });
            setDrawer(null);
          }}
        />
      )}

      {showMethods && (
        <div className="sheet-backdrop" onClick={() => setShowMethods(false)}>
          <section className="sheet method-sheet" role="dialog" aria-label={t.methodLabel} onClick={(e) => e.stopPropagation()}>
            <header className="sheet-head">
              <h2>{t.methodLabel}</h2>
              <button className="icon-btn" onClick={() => setShowMethods(false)} aria-label={t.close}>
                ✕
              </button>
            </header>
            <div className="sheet-body method-body">
          <p className="method-hint">{t.methodHint}</p>
          <div className="methods" role="radiogroup" aria-label={t.methodLabel}>
            {UI_METHODS.map((m) => (
              <button type="button" key={m} role="radio" aria-checked={form.method === m} className={form.method === m ? 'is-on' : ''} onClick={() => f('method', m)}>
                {t[METHOD_KEY[m][0]] as string}
              </button>
            ))}
          </div>
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
            </div>
          </section>
        </div>
      )}

      {showSettings && (
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
                <button className={settings.lang === 'zh' ? 'is-on' : ''} onClick={() => set('lang', 'zh')}>
                  中文
                </button>
                <button className={settings.lang === 'en' ? 'is-on' : ''} onClick={() => set('lang', 'en')}>
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
              {onSignOut && (
                <button className="text-btn" onClick={onSignOut}>
                  {t.signOut}
                  {profileName ? `（${profileName}）` : ''}
                </button>
              )}
              <button className="text-btn" onClick={onDebug}>
                {t.debug}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
});
