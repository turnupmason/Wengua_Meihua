/**
 * 全点击式问事 on the formal product catalog: the six categories and 31 entries of
 * data/product-categories.json, each entry asked as itself (its 82 fixed questions stay behind
 * it), the click-only home entry, the 断语 lookup through createProductRepository, and how a cast
 * carries its question and 断语 into 问事录.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import productFile from '../../../data/product-categories.json';
import labelsFile from '../src/data/product-catalog.labels.json';
import { DOMAINS, allQuestions, allSubtypes, catalogProblems, catalogQuestions, enabledQuestions, shownQuestion, productContext, questionById, questionWording, readinessOf } from '../src/domain/questionCatalog';
import { calculationGroups, castingDateOf, judgmentFor, readableCalculation, seasonOf, windowBody, windowDates, type JudgmentInput, type ProductJudgment } from '../src/domain/judgment';
import { chargesToday, freezeCast, judgmentInput, recordKind, withJudgment } from '../src/domain/cast';
import { createHistory } from '../src/domain/history';
import { createJournal } from '../src/domain/journal';
import { sameMatterCandidate } from '../src/domain/sameMatter';
import { INITIAL_RITUAL, ritualReducer } from '../src/domain/ritual';
import { STRINGS } from '../src/domain/i18n';
import { defaultSettings } from '../src/domain/settings';
import { EMPTY_FORM, HomeOverlay, UI_METHODS, type EntryForm } from '../src/ui/HomeOverlay';
import { castRequest, entryProblem } from '../src/ui/entry';
import { ReadingView } from '../src/ui/ReadingView';
import { RecordDetail } from '../src/ui/RecordDetail';
import { ReferenceSheet } from '../src/ui/ReferenceSheet';
import { memoryStore, testKnowledge } from './helpers';

afterEach(cleanup);

type File = typeof productFile;
const INTERVIEW = 'career.interview.interview-pass';
/** The entry 求职录用: the question asked, reading the interview 断语. */
const JOB = 'career.interview';

function Home({ onChange, onTitle = () => {}, busy = false }: { onChange?: (f: EntryForm) => void; onTitle?: () => void; busy?: boolean }) {
  const [form, setForm] = useState<EntryForm>(EMPTY_FORM);
  return (
    <HomeOverlay
      t={STRINGS.zh}
      settings={{ ...defaultSettings(), lang: 'zh' }}
      form={form}
      error={null}
      onForm={(f) => {
        setForm(f);
        onChange?.(f);
      }}
      onSettings={() => {}}
      onEnter={() => {}}
      onLibrary={() => {}}
      onHistory={() => {}}
      onTitle={onTitle}
      onDebug={() => {}}
      pace="full"
      busy={busy}
    />
  );
}

/** Fields that would bring up the system keyboard. */
const keyboardFields = () => [...document.querySelectorAll('textarea, input, [contenteditable="true"]')].filter((el) => !['checkbox', 'datetime-local'].includes((el as HTMLInputElement).type));

/** A cast of 水风井 九五 in 亥月 on 2026-11-11 (己丑日): its 断语 is written. */
const WELL: JudgmentInput = { questionId: INTERVIEW, primaryId: 48, movingLine: 5, method: 'classical-time', monthBranch: '亥', dayGanzhi: '己丑', localWallClock: '2026-11-11T09:00' };

describe('QuestionCatalog = the formal product catalog', () => {
  it('has its six categories and 31 entries in order, each the one question it asks, with the 82 questions behind them', () => {
    const file = productFile as File;
    expect(DOMAINS.map((d) => [d.domain_id, d.label.zh])).toEqual([
      ['career', '事业工作'],
      ['wealth', '财富财运'],
      ['relationships', '感情姻缘'],
      ['health', '健康疾病'],
      ['home', '家庭家宅'],
      ['search', '寻人失物'],
    ]);
    for (const [i, d] of DOMAINS.entries()) {
      expect(d.subtypes.map((s) => [s.subtype_id, s.label.zh])).toEqual(file.categories[i].subcategories.map((s) => [s.id, s.label]));
      for (const s of d.subtypes) expect(s.questions.map((q) => [q.question_id, q.question_text.zh])).toEqual([[s.subtype_id, s.label.zh]]);
    }
    expect(allSubtypes()).toHaveLength(31);
    expect(allQuestions()).toHaveLength(31);
    // The catalog's own questions stay resolvable (records cast before entries), under their entry.
    expect(catalogQuestions().map((q) => q.question_id)).toEqual(file.categories.flatMap((c) => c.subcategories.flatMap((s) => s.questions.map((q) => q.id))));
    expect(questionById(INTERVIEW)).toMatchObject({ subtype_id: JOB, question_text: { zh: '这次面试能通过吗？' } });
    expect(catalogProblems()).toEqual([]);
  });

  it('gives every question a classical category, an English wording and its mode', async () => {
    const { library } = await testKnowledge();
    const categories = new Set(library.listDomains().map((d) => d.id));
    for (const q of [...allQuestions(), ...catalogQuestions()]) {
      expect(q.question_id.startsWith(`${q.domain_id}.`)).toBe(true);
      if (q.mode === 'narrative') expect(categories.has(q.classical_domain_id!)).toBe(true);
      expect(q.question_text.en).not.toBe(q.question_text.zh);
      if (q.mode !== 'narrative') expect(q.paragraphs.length).toBeGreaterThan(0);
    }
    for (const s of allSubtypes()) expect(enabledQuestions(s)).toHaveLength(1);
    // Entries ask nothing finer: no fixed options.
    expect(allQuestions().filter((q) => q.conditions?.length)).toEqual([]);
    // Health is traditional reference only; 方向原因 reads; 失联寻人 is guidance (nothing written to cast for).
    expect(allQuestions().filter((q) => q.domain_id === 'health').map((q) => q.mode)).toEqual(['reference', 'reference', 'reference', 'reference']);
    expect(readinessOf(questionById('search.direction')!)).toBe('reference');
    expect(readinessOf(questionById('search.missing-contact')!)).toBe('guidance');
    expect(readinessOf(questionById('search.person-leads.guidance')!)).toBe('guidance');
    // 求职录用 reads the interview library; 晋升加薪 reads the promotion library being written hexagram by
    // hexagram (the archived yearly pay rise is not offered); the others carry none yet.
    const written = [[JOB, INTERVIEW], ['career.promotion-pay', 'career.promotion-pay.promotion']];
    expect(allQuestions().filter((q) => readinessOf(q) === 'written').map((q) => [q.question_id, q.content_id])).toEqual(written);
    expect(allQuestions().filter((q) => q.mode === 'narrative' && !written.some(([id]) => id === q.question_id)).every((q) => q.content_id === null)).toBe(true);
    expect(questionById('career.promotion-pay.pay-rise')).toMatchObject({ enabled: false, subtype_id: 'career.promotion-pay' });
  });

  it('finds a missing English label or an option without a name', () => {
    const labels = structuredClone(labelsFile) as unknown as { questions: Record<string, string>; contextFields: { objectKind: { options: Record<string, unknown> } } };
    delete labels.questions[INTERVIEW];
    delete labels.contextFields.objectKind.options.phone;
    const problems = catalogProblems(productFile as never, labels as never).join('\n');
    expect(problems).toMatch(/career\.interview\.interview-pass: no English wording/);
    expect(problems).toMatch(/objectKind=phone/);
  });

  it('turns chosen options into the catalog’s context (years as numbers) and words the question', () => {
    const pay = questionById('career.promotion-pay.pay-rise')!;
    const year = String(new Date().getFullYear());
    expect(pay.conditions?.[0]).toMatchObject({ condition_id: 'targetYear', kind: 'year' });
    expect(pay.conditions?.[0].options.map((o) => o.option_id)).toEqual([year, String(Number(year) + 1)]);
    expect(productContext(pay, { targetYear: year })).toEqual({ targetYear: Number(year) });
    expect(questionWording(pay, { targetYear: year }, 'zh')).toBe(`${year}年能获得加薪吗？`);
    const lost = questionById('search.lost-object.recovery')!;
    expect(lost.conditions?.[0].options.map((o) => o.label.zh)).toEqual(['钥匙', '钱包', '手机', '证件文件', '首饰', '其他物品']);
  });
});

describe('click-only home', () => {
  it('opens each of the six categories to its own subcategories, tagged by what they offer', () => {
    render(<Home />);
    const grid = screen.getByRole('radiogroup', { name: STRINGS.zh.domainLabel });
    expect(within(grid).getAllByRole('radio')).toHaveLength(6);
    for (const d of DOMAINS) {
      fireEvent.click(within(grid).getByRole('radio', { name: d.label.zh }));
      const drawer = screen.getByRole('dialog', { name: d.label.zh });
      expect([...drawer.querySelectorAll('.subtype-grid button span')].map((b) => b.textContent)).toEqual(d.subtypes.map((s) => s.label.zh));
      expect(within(grid).getByRole('radio', { name: d.label.zh }).getAttribute('aria-checked')).toBe('true');
      fireEvent.click(within(drawer).getByRole('button', { name: STRINGS.zh.close }));
    }
    // 求职录用 and 晋升加薪 have written 断语; the other four career entries are pending.
    fireEvent.click(within(grid).getByRole('radio', { name: '事业工作' }));
    expect(screen.getAllByText(STRINGS.zh.scriptPendingTag)).toHaveLength(4);
    fireEvent.click(screen.getByRole('button', { name: STRINGS.zh.close }));
    fireEvent.click(within(grid).getByRole('radio', { name: '健康疾病' }));
    expect(screen.getAllByText(STRINGS.zh.referenceTag)).toHaveLength(4);
  });

  it('chooses an entry with one tap (the entry is the question) and never offers a keyboard', () => {
    let last: EntryForm = EMPTY_FORM;
    render(<Home onChange={(f) => (last = f)} />);
    expect(keyboardFields()).toHaveLength(0);
    fireEvent.click(screen.getByRole('radio', { name: '事业工作' }));
    fireEvent.click(screen.getByRole('button', { name: /求职录用/ }));
    // Nothing finer to pick: the drawer closes on the entry itself.
    expect(last).toMatchObject({ questionId: JOB, domainId: 'domain-09', topicId: 'career' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByText(STRINGS.zh.scriptPendingNote)).toBeNull();
    expect(entryProblem(last)).toBeNull();
    // Change: back into the drawer, another entry, still being written.
    // The entry's name is said once (所问之事 · 求职录用 / 求职录用 would repeat it).
    expect(document.querySelector('.chosen-kicker > span')!.textContent).toBe(STRINGS.zh.askedMatter);
    fireEvent.click(screen.getByRole('button', { name: /所问之事.*求职录用/ }));
    const drawer = screen.getByRole('dialog', { name: '事业工作' });
    expect(within(drawer).getByRole('button', { name: /求职录用/ }).getAttribute('aria-current')).toBe('true');
    fireEvent.click(within(drawer).getByRole('button', { name: /考试选拔/ }));
    expect(last.questionId).toBe('career.exams');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByText(STRINGS.zh.scriptPendingNote)).toBeTruthy();
    expect(keyboardFields()).toHaveLength(0);
  });

  it('asks no fixed option for an entry (物品找回 is chosen at once)', () => {
    let last: EntryForm = EMPTY_FORM;
    render(<Home onChange={(f) => (last = f)} />);
    fireEvent.click(screen.getByRole('radio', { name: '寻人失物' }));
    fireEvent.click(screen.getByRole('button', { name: /物品找回/ }));
    expect(screen.queryByRole('radiogroup', { name: '物品类型' })).toBeNull();
    expect(last).toMatchObject({ questionId: 'search.lost-object', conditions: {}, domainId: 'domain-15' });
    expect(entryProblem(last)).toBeNull();
  });

  it('offers a reference entry to read at once: no method, no pace, 查看说明', () => {
    let last: EntryForm = EMPTY_FORM;
    render(<Home onChange={(f) => (last = f)} />);
    fireEvent.click(screen.getByRole('radio', { name: '健康疾病' }));
    fireEvent.click(screen.getByRole('button', { name: /身体象意/ }));
    expect(last.questionId).toBe('health.condition');
    expect(screen.getByText(STRINGS.zh.referenceNote)).toBeTruthy();
    expect(screen.queryByRole('radiogroup', { name: STRINGS.zh.paceLabel })).toBeNull();
    expect(screen.getByRole('button', { name: STRINGS.zh.readReference })).toBeTruthy();
    expect(entryProblem(last)).toBeNull();
  });

  it('lets the tray be pulled down and back by its head, stays where it is let go, and a tap folds it', () => {
    localStorage.removeItem('wengua.trayOffset.v1');
    // jsdom has no PointerEvent: a mouse event carrying a pointerId stands in for it.
    const w = window as unknown as { PointerEvent?: unknown };
    w.PointerEvent ??= class extends MouseEvent {
      pointerId: number;
      constructor(type: string, init: PointerEventInit = {}) {
        super(type, init);
        this.pointerId = init.pointerId ?? 0;
      }
    };
    const { container } = render(<Home />);
    const tray = container.querySelector('form.home-panel') as HTMLElement;
    Object.defineProperty(tray, 'offsetHeight', { configurable: true, value: 410 });
    const head = screen.getByRole('button', { name: STRINGS.zh.trayGrip });
    head.setPointerCapture = () => {};
    const drag = (dy: number) => {
      fireEvent.pointerDown(head, { pointerId: 1, button: 0, clientY: 500 });
      fireEvent.pointerMove(head, { pointerId: 1, clientY: 500 + dy });
      fireEvent.pointerUp(head, { pointerId: 1, clientY: 500 + dy });
    };
    drag(120);
    expect(tray.style.getPropertyValue('--tray-y')).toBe('120px');
    expect(localStorage.getItem('wengua.trayOffset.v1')).toBe('120');
    // Never below its head (410 − 64), never above fully open.
    drag(900);
    expect(tray.style.getPropertyValue('--tray-y')).toBe('346px');
    drag(-2000);
    expect(tray.style.getPropertyValue('--tray-y')).toBe('');
    // A tap folds it down to its head; another opens it.
    drag(0);
    expect(tray.style.getPropertyValue('--tray-y')).toBe('346px');
    drag(0);
    expect(tray.style.getPropertyValue('--tray-y')).toBe('');
    fireEvent.keyDown(head, { key: 'ArrowDown' });
    expect(tray.style.getPropertyValue('--tray-y')).toBe('40px');
    localStorage.removeItem('wengua.trayOffset.v1');
  });

  it('holds the button while the 断语 is looked up', () => {
    render(<Home busy />);
    const b = screen.getByRole('button', { name: STRINGS.zh.castingNow });
    expect(b.hasAttribute('disabled')).toBe(true);
  });

  it('has a ← on the home that goes back to the title screen', () => {
    let backs = 0;
    render(<Home onTitle={() => (backs += 1)} />);
    fireEvent.click(screen.getByRole('button', { name: '返回标题页' }));
    expect(backs).toBe(1);
  });

  it('shows real-world help with 失联寻人, which opens its guidance and casts nothing', () => {
    let last: EntryForm = EMPTY_FORM;
    render(<Home onChange={(f) => (last = f)} />);
    fireEvent.click(screen.getByRole('radio', { name: '寻人失物' }));
    fireEvent.click(screen.getByRole('button', { name: /失联寻人/ }));
    expect(last.questionId).toBe('search.missing-contact');
    expect(screen.getByText(/911.*报警.*卦象不能说明真实位置或安全状况/)).toBeTruthy();
    expect(screen.getByRole('button', { name: STRINGS.zh.readReference })).toBeTruthy();
  });

  it('takes casting numbers on an in-app pad and no longer offers 字占', () => {
    let last: EntryForm = EMPTY_FORM;
    render(<Home onChange={(f) => (last = f)} />);
    expect(UI_METHODS).not.toContain('text');
    fireEvent.click(screen.getByRole('button', { name: /更多起卦方式/ }));
    expect(screen.queryByRole('radio', { name: '字占' })).toBeNull();
    fireEvent.click(screen.getByRole('radio', { name: '物数' }));
    fireEvent.click(screen.getByRole('button', { name: /数得几数/ }));
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    expect(last.count).toBe('12');
    fireEvent.click(screen.getByRole('button', { name: STRINGS.zh.digitBack }));
    expect(last.count).toBe('1');
    expect(keyboardFields()).toHaveLength(0);
  });

  it('keeps each method on its own: switching starts empty, ← back to the list clears what was chosen', () => {
    let last: EntryForm = EMPTY_FORM;
    render(<Home onChange={(f) => (last = f)} />);
    fireEvent.click(screen.getByRole('button', { name: /更多起卦方式/ }));
    // 物数: 38, then ← back to the list, then 声音: its count is not 物数's.
    fireEvent.click(screen.getByRole('radio', { name: '物数' }));
    fireEvent.click(screen.getByRole('button', { name: /数得几数/ }));
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    fireEvent.click(screen.getByRole('button', { name: '8' }));
    expect(last).toMatchObject({ method: 'object-count', count: '38' });
    fireEvent.click(screen.getByRole('button', { name: STRINGS.zh.back }));
    expect(last).toMatchObject({ method: 'classical-time', count: '' });
    fireEvent.click(screen.getByRole('radio', { name: '声音' }));
    expect(last).toMatchObject({ method: 'sound-count', count: '' });
    // Switching straight from 声音 (with a number) to 物数 also starts empty.
    fireEvent.click(screen.getByRole('button', { name: /闻声几数/ }));
    fireEvent.click(screen.getByRole('button', { name: '5' }));
    expect(last.count).toBe('5');
    fireEvent.click(screen.getByRole('button', { name: STRINGS.zh.back }));
    fireEvent.click(screen.getByRole('radio', { name: '物象方位' }));
    // 物象方位 has its own page with ← back: what was picked there is cleared on the way out.
    fireEvent.click(screen.getByRole('radio', { name: /^乾/ }));
    fireEvent.click(screen.getByRole('radio', { name: /^北/ }));
    expect(last).toMatchObject({ method: 'object-direction', objectTrigram: '乾', directionTrigram: '坎', count: '' });
    fireEvent.click(screen.getByRole('button', { name: STRINGS.zh.back }));
    expect(last).toMatchObject({ method: 'classical-time', objectTrigram: '', directionTrigram: '' });
    expect(screen.getByRole('radio', { name: '年月日时' }).getAttribute('aria-checked')).toBe('true');
  });
});

describe('reference and guidance', () => {
  it('shows the explanation, the steps to take and the source, with nothing cast', async () => {
    const { library } = await testKnowledge();
    const q = questionById('search.person-leads.guidance')!;
    render(<ReferenceSheet t={STRINGS.zh} lang="zh" question={q} conditions={{}} sectionTitle={(id) => library.getSection(id)?.title ?? null} onClose={() => {}} />);
    const sheet = screen.getByRole('dialog', { name: q.question_text.zh });
    expect(within(sheet).getAllByRole('note')[0].textContent).toMatch(/911/);
    for (const p of q.paragraphs) expect(within(sheet).getByText(p)).toBeTruthy();
    expect(within(sheet).getByText(q.practical_advice[0])).toBeTruthy();
    // Pure guidance with no classical source names none.
    expect(within(sheet).queryByText(/出处/)).toBeNull();
    expect(within(sheet).getByText(STRINGS.zh.referenceNoCast)).toBeTruthy();
    cleanup();
    const review = questionById('search.last-location.review')!;
    render(<ReferenceSheet t={STRINGS.zh} lang="zh" question={review} conditions={{}} sectionTitle={(id) => library.getSection(id)?.title ?? null} onClose={() => {}} />);
    expect(screen.getByText('出处：《梅花易数·失物占第十五》')).toBeTruthy();
  });

  it('is refused by the cast itself', async () => {
    const { library } = await testKnowledge();
    const f = { ...EMPTY_FORM, questionId: 'health.condition.condition', topicId: 'health' as const, domainId: 'domain-16' };
    expect(() => freezeCast(library, castRequest(f, { lang: 'zh', timeZone: 'UTC', calendarPolicy: {} }))).toThrow(/read, not cast/);
  });
});

describe('断语 lookup (createProductRepository)', () => {
  it('gives the written 断语 for this exact question, chart, month and day', async () => {
    const { product } = await testKnowledge();
    const j = (await judgmentFor(product, questionById(INTERVIEW)!, WELL)) as ProductJudgment;
    expect(j).toMatchObject({ state: 'ready', source: 'product', questionId: INTERVIEW, primaryId: 48, movingLine: 5, castingDate: '2026-11-11', dayGanzhi: '己丑', monthBranch: '亥' });
    expect(j.title).toBeTruthy();
    expect(j.short.length).toBeGreaterThan(20);
    expect(j.paragraphs.map((p) => p.slice(0, 3))).toEqual(['开局：', '过程：', '结局：', '总断：']);
    // 应期 stands apart, each window with its own event, 吉凶 and dates (worked out from the casting day).
    expect(j.timing?.windows.length).toBeGreaterThan(0);
    for (const w of j.timing!.windows) {
      expect(['吉', '凶']).toContain(w.valence);
      expect(w.dates.every((d) => d >= '2026-11-11')).toBe(true);
    }
    expect(j.paragraphs.join()).not.toMatch(/应期/);
    expect(j.calculation.join()).toMatch(/月令：亥月/);
    expect(j.sources).toEqual(['求名占第九']);
  });

  it('never stands in another question’s, review draft or unwritten text', async () => {
    const { product } = await testKnowledge();
    const at = (id: string, extra: Partial<JudgmentInput> = {}) => judgmentFor(product, questionById(id)!, { ...WELL, questionId: id, ...extra });
    expect(await at('career.interview.job-offer')).toEqual({ state: 'missing', season: 'winter', reason: 'pending-authoring' });
    expect(await at('wealth.debt.receivable')).toMatchObject({ state: 'missing', reason: 'pending-review' });
    expect(await at('search.lost-object.recovery', { conditions: { objectKind: 'phone' } })).toMatchObject({ state: 'missing', reason: 'pending-authoring' });
    // The stored dates use the number-based (先天) method. A 后天 cast still receives the prose.
    expect(await at(INTERVIEW, { method: 'object-direction' })).toMatchObject({ state: 'ready', timing: { windows: [] } });
    // No month or day: nothing to look up by.
    expect(await at(INTERVIEW, { monthBranch: null })).toMatchObject({ state: 'missing', reason: 'requires-context' });
  });

  it('shows the 计算说明 without bookkeeping ids, naming sources by title', () => {
    const lines = ['月令：亥月。旺衰与旬空分别计算。', '空亡依据：八卦配支补充法，版本trigram-void-2.1.0。', '变用离囚仍克体，依mh-117保留末后牵制。', '判断口径：interview-evidence-1.0.0。稿件版本：interview-pass-2.1.0。'];
    expect(readableCalculation(lines, (id) => (id === 'mh-117' ? '体用总诀' : null))).toEqual(['月令：亥月。旺衰与旬空分别计算。', '空亡依据：八卦配支补充法。', '变用离囚仍克体，依《体用总诀》保留末后牵制。']);
  });

  it('groups the 计算说明 as 历法 / 卦象 / 体用 / 取期, and writes window dates for scanning', () => {
    const lines = ['月令：亥月。', '起卦日：2026-11-12，庚寅日。', '本互变：风地观 → 山地剥 → 风水涣，本卦六二动。', '本用坤土囚，原体巽木相。', '本用受体所克，变用生体。', '体克用须实际处理，依mh-117。', '判断口径：interview-evidence-1.0.0。稿件版本：interview-pass-2.1.0。', '吉应 · 收尾：取变用坎水所应亥、子日；显示2026-11-21、2026-11-22（起卦当月匹配）。'];
    expect(calculationGroups(lines, (id) => (id === 'mh-117' ? '体用总诀' : null))).toEqual([
      { group: 'calendar', lines: ['月令：亥月。', '起卦日：2026-11-12，庚寅日。'] },
      { group: 'chart', lines: ['本互变：风地观 → 山地剥 → 风水涣，本卦六二动。'] },
      { group: 'bodyUse', lines: ['本用坤土囚，原体巽木相。', '本用受体所克，变用生体。', '体克用须实际处理，依《体用总诀》。'] },
      { group: 'timing', lines: ['吉应 · 收尾：取变用坎水所应亥、子日；显示2026-11-21、2026-11-22（起卦当月匹配）。'] },
    ]);
    // A line after 判断口径 that gives no date is still about 取期.
    expect(calculationGroups(['判断口径：x。', '中后阶段可以查分工，日期无充分依据。'], () => null)).toEqual([{ group: 'timing', lines: ['中后阶段可以查分工，日期无充分依据。'] }]);
    expect(windowDates(['2026-11-22', '2026-11-21'], '2026-11-12', 'zh')).toBe('11月21–22日');
    expect(windowDates(['2026-11-14', '2026-11-17'], '2026-11-12', 'zh')).toBe('11月14日、17日');
    expect(windowDates(['2026-11-30', '2026-12-01', '2026-12-05'], '2026-11-12', 'zh')).toBe('11月30日–12月1日、5日');
    expect(windowDates(['2027-01-03'], '2026-12-28', 'zh')).toBe('2027年1月3日');
    expect(windowDates(['2026-11-21', '2026-11-22'], '2026-11-12', 'en')).toBe('Nov 21–22');
    // The text's own date lead is dropped (shown on the date line), keeping 前后 for that line.
    expect(windowBody('可留意本月21、22号前后，若关键条件和答复已核实，可留意本轮通过结果。')).toEqual({ around: true, text: '若关键条件和答复已核实，可留意本轮通过结果。' });
    expect(windowBody('可留意本月21、22号，本轮面试补证后，通过结果较易明朗。')).toEqual({ around: false, text: '本轮面试补证后，通过结果较易明朗。' });
    expect(windowBody('留意本月12、13号前后，可能遇到较难承接的追问。')).toEqual({ around: true, text: '可能遇到较难承接的追问。' });
    expect(windowBody('收尾时留意对方答复。')).toEqual({ around: false, text: '收尾时留意对方答复。' });
  });

  it('reports a library it cannot read as unavailable, not as a 断语', async () => {
    const broken = { getContent: async () => Promise.reject(new Error('offline')) };
    const errors = console.error;
    console.error = () => {};
    try {
      expect(await judgmentFor(broken as never, questionById(INTERVIEW)!, WELL)).toEqual({ state: 'missing', season: 'winter', reason: 'unavailable' });
    } finally {
      console.error = errors;
    }
  });

  it('reckons from the civil day whose 干支 is the cast’s (子时 may start the next day)', () => {
    expect(castingDateOf('2026-11-11T09:00', '己丑')).toBe('2026-11-11');
    expect(castingDateOf('2026-11-10T23:30', '己丑')).toBe('2026-11-11');
    expect(castingDateOf('2026-11-11T09:00', '甲子')).toBeNull();
    expect(seasonOf('亥')).toBe('winter');
    expect(seasonOf('辰')).toBe('earth');
  });
});

describe('cast, reading and 问事录', () => {
  const form = (o: Partial<EntryForm> = {}): EntryForm => ({ ...EMPTY_FORM, questionId: INTERVIEW, topicId: 'career', domainId: 'domain-09', ...o });
  const opts = (now: Date) => ({ lang: 'zh' as const, timeZone: 'Asia/Shanghai', calendarPolicy: {}, now });

  it('full ritual and 简洁问事 cast the same request and look up the same 断语', async () => {
    const { library, product } = await testKnowledge();
    const now = new Date('2026-12-20T09:00:00+08:00'); // 子月
    const cast = async (castId: string) => {
      const base = freezeCast(library, castRequest(form(), opts(now)), { castId, now });
      return withJudgment(base, await judgmentFor(product, questionById(INTERVIEW)!, judgmentInput(base)!));
    };
    const a = await cast('a');
    const b = await cast('b');
    expect([a.primaryId, a.movingLine, a.judgment]).toEqual([b.primaryId, b.movingLine, b.judgment]);
    expect(a.season).toBe('winter');
    let full = ritualReducer(INITIAL_RITUAL, { type: 'BEGIN', castId: a.castId });
    full = ritualReducer(full, { type: 'PHASE_DONE', phase: 'entering' });
    full = ritualReducer(full, { type: 'PHASE_DONE', phase: 'revealing' });
    const quick = ritualReducer(ritualReducer(INITIAL_RITUAL, { type: 'BEGIN', castId: a.castId }), { type: 'SKIP', castId: a.castId });
    expect([full.phase, full.castId]).toEqual(['reading', a.castId]);
    expect([quick.phase, quick.castId]).toEqual(['reading', a.castId]);
  });

  it('saves the question, the wording shown, time zone, method and the 断语 as given', async () => {
    const { library, product } = await testKnowledge();
    const base = freezeCast(library, { method: 'manual', manual: { primaryId: 48, movingLine: 5, monthBranch: '亥', dayGanzhi: '己丑' }, questionId: INTERVIEW, question: '这次面试能通过吗？', instant: new Date('2026-11-11T09:00:00+08:00'), timeZone: 'Asia/Shanghai' });
    // A manual (debug) cast has no wall clock: the 断语 is asked with the real day of the cast.
    const j = await judgmentFor(product, questionById(INTERVIEW)!, WELL);
    const rec = withJudgment(base, j);
    expect(() => withJudgment(rec, j)).toThrow(/already has/);
    expect(() => withJudgment({ ...base, primaryId: 1 }, j)).toThrow(/another question or chart/);
    const history = createHistory(memoryStore(), memoryStore());
    history.save(rec);
    const back = history.get(rec.castId)!;
    expect(back).toMatchObject({ questionId: INTERVIEW, subtypeId: 'career.interview', question: '这次面试能通过吗？', timeZone: 'Asia/Shanghai', topicId: 'career', domainId: 'domain-09' });
    expect(back.catalogVersion).toMatch(/^product-/);
    expect(back.judgment).toEqual(j);
    expect(back.snapshot?.judgmentVersion).toMatch(/^interview-pass-.+#career\.interview\.interview-pass\/48\/5\//);
    expect(chargesToday(back)).toBe(true);
    // For a catalog question the 体用 sentence is the structure alone, never an answer.
    expect(back.snapshot?.conclusion).not.toMatch(/面试/);
    render(<RecordDetail record={back} journal={createJournal(memoryStore())} t={STRINGS.zh} onOpen={() => {}} onBack={() => {}} onChanged={() => {}} />);
    expect(screen.getByText('按亥月月令写定 · 起卦时所得，原样保存')).toBeTruthy();
    // Internal ids and versions stay in the record, never on screen.
    expect(document.body.textContent).not.toMatch(/interview-pass|career\./);
    expect(screen.getByText((j as ProductJudgment).short)).toBeTruthy();
  });

  it('求职录用: cast as the entry, it reads the interview 断语 for the chart, month and day, with no 旬空', async () => {
    const { library, product } = await testKnowledge();
    const base = freezeCast(library, { method: 'manual', manual: { primaryId: 48, movingLine: 5, monthBranch: '亥', dayGanzhi: '己丑' }, questionId: JOB, instant: new Date('2026-11-11T09:00:00+08:00'), timeZone: 'Asia/Shanghai' });
    // The entry is the question: it is saved and shown as 求职录用.
    expect(base).toMatchObject({ questionId: JOB, subtypeId: JOB, question: '求职录用', domainId: 'domain-09', topicId: 'career' });
    // A record saved with the narrower wording (2026-11-12 builds) still shows the entry's name.
    expect(shownQuestion(JOB, '这次面试能通过吗？', 'zh')).toBe('求职录用');
    expect(shownQuestion(INTERVIEW, '这次面试能通过吗？', 'zh')).toBe('这次面试能通过吗？');
    const j = (await judgmentFor(product, questionById(JOB)!, { ...WELL, questionId: JOB })) as ProductJudgment;
    const written = (await judgmentFor(product, questionById(INTERVIEW)!, WELL)) as ProductJudgment;
    expect(j).toMatchObject({ state: 'ready', questionId: JOB, contentQuestionId: INTERVIEW, primaryId: 48, movingLine: 5 });
    expect([j.title, j.short, j.paragraphs, j.timing]).toEqual([written.title, written.short, written.paragraphs, written.timing]);
    // The classical method has no 空亡: the base 断语 is read and nothing speaks of it.
    expect([j.short, ...j.paragraphs, ...j.calculation].join()).not.toMatch(/空亡|旬空/);
    const rec = withJudgment(base, j);
    expect(rec.judgment).toEqual(j);
    expect(chargesToday(rec)).toBe(true);
  });

  it('晋升加薪 reads the promotion 断语 where a hexagram is written, and says so where it is not yet', async () => {
    const { product } = await testKnowledge();
    const at = (primaryId: number) => judgmentFor(product, questionById('career.promotion-pay')!, { ...WELL, questionId: 'career.promotion-pay', primaryId, movingLine: 1 });
    expect(await at(1)).toMatchObject({ state: 'ready', questionId: 'career.promotion-pay', contentQuestionId: 'career.promotion-pay.promotion', primaryId: 1 });
    const reading = await at(1);
    if (reading.state !== 'ready') throw new Error('Expected the written promotion manuscript');
    expect(reading.timing?.windows.length || reading.timing?.phaseNotes?.length).toBeGreaterThan(0);
    expect(calculationGroups(reading.calculation, () => null).map(({group}) => group)).toEqual(['calendar','chart','bodyUse','timing']);
    const { library } = await testKnowledge();
    const chart = library.createReading({ primaryId: 1, movingLine: 1, domainId: 'domain-09', applyVoid: false });
    render(<ReadingView reading={chart} question="晋升加薪" questionId="career.promotion-pay" judgment={{ state: 'ready', judgment: reading, full: true }} onUnlock={() => {}} castTime="" t={STRINGS.zh} lang="zh" focus={null} saved={false} onPick={() => {}} onSave={() => {}} onClose={() => {}} />);
    expect([...document.querySelectorAll('.script-full .script-part h3')].slice(0,5).map(h => h.textContent)).toEqual(['开局','过程','结局','总断',STRINGS.zh.timingTitle]);
    expect(document.querySelector('.timing-when b')?.textContent).toMatch(/\d+日/);
    const calculation = document.querySelector('details.script-calc');
    expect(calculation?.querySelector('summary')?.textContent).toBe(STRINGS.zh.calcTitle);
    expect([...calculation!.querySelectorAll('.calc-label')].map(label => label.textContent)).toEqual(['历法','卦象','体用','取期']);
    expect(await at(48)).toMatchObject({ state: 'missing', reason: 'pending-authoring' });
  });

  it('an entry with nothing written is still cast, says so, and looks nothing up', async () => {
    let asked = 0;
    const product = {
      getContent: async () => {
        asked += 1;
        throw new Error('not to be asked');
      },
    };
    expect(await judgmentFor(product as never, questionById('career.exams')!, { ...WELL, questionId: 'career.exams' })).toEqual({ state: 'missing', season: 'winter', reason: 'pending-authoring' });
    expect(asked).toBe(0);
  });

  it('with no 断语: says so plainly, substitutes nothing, and is not charged', async () => {
    const knowledge = await testKnowledge();
    const base = freezeCast(knowledge.library, castRequest(form({ questionId: 'career.exams.exam' }), opts(new Date('2026-12-20T09:00:00+08:00'))));
    const rec = withJudgment(base, await judgmentFor(knowledge.product, questionById('career.exams.exam')!, judgmentInput(base)!));
    expect(rec.judgment).toMatchObject({ state: 'missing', reason: 'pending-authoring' });
    expect(chargesToday(rec)).toBe(false);
    const reading = knowledge.library.createReading({ primaryId: rec.primaryId, movingLine: rec.movingLine, domainId: rec.domainId });
    render(
      <ReadingView reading={reading} question={rec.question} questionId={rec.questionId} topicId={rec.topicId} snapshot={rec.snapshot} judgment={{ state: 'missing', reason: 'pending-authoring' }} onUnlock={() => {}} castTime="" t={STRINGS.zh} lang="zh" focus={null} saved={false} onPick={() => {}} onSave={() => {}} onClose={() => {}} />,
    );
    const brief = document.querySelector('.read-verdict')!;
    expect(within(brief as HTMLElement).getByRole('heading', { name: STRINGS.zh.scriptPending })).toBeTruthy();
    expect(brief.textContent).not.toContain(rec.snapshot!.headline);
    expect(screen.getByText(STRINGS.zh.structuralNote)).toBeTruthy();
    // Nor does the structure answer the question in its place.
    expect(document.body.textContent).not.toMatch(/就“这次考试能通过吗？”而言/);
  });

  it('says why when a draft is under review or the method has no dating yet', async () => {
    const knowledge = await testKnowledge();
    const reading = knowledge.library.createReading({ primaryId: 48, movingLine: 5, domainId: 'domain-09' });
    const view = (reason: 'pending-review' | 'requires-context') =>
      render(<ReadingView reading={reading} question="" judgment={{ state: 'missing', reason }} onUnlock={() => {}} castTime="" t={STRINGS.zh} lang="zh" focus={null} saved={false} onPick={() => {}} onSave={() => {}} onClose={() => {}} />);
    view('pending-review');
    expect(screen.getByRole('heading', { name: STRINGS.zh.reviewPending })).toBeTruthy();
    cleanup();
    view('requires-context');
    expect(screen.getByRole('heading', { name: STRINGS.zh.contextPending })).toBeTruthy();
  });

  it('reads the full 断语: 简断, 开局/过程/结局/总断, 应期参考 apart, 计算说明 folded, its source', async () => {
    const knowledge = await testKnowledge();
    const j = (await judgmentFor(knowledge.product, questionById(INTERVIEW)!, WELL)) as ProductJudgment;
    const reading = knowledge.library.createReading({ primaryId: 48, movingLine: 5, domainId: 'domain-09' });
    const opened: string[] = [];
    render(
      <ReadingView reading={reading} question="这次面试能通过吗？" questionId={INTERVIEW} judgment={{ state: 'ready', judgment: j, full: true }} onUnlock={() => {}} onOpenSection={(t) => opened.push(t)} castTime="" t={STRINGS.zh} lang="zh" focus={null} saved={false} onPick={() => {}} onSave={() => {}} onClose={() => {}} />,
    );
    expect(screen.getByRole('heading', { name: j.title })).toBeTruthy();
    expect(screen.getByText(j.short)).toBeTruthy();
    for (const label of ['开局', '过程', '结局', '总断']) expect(screen.getByRole('heading', { name: label })).toBeTruthy();
    const timing = document.querySelector('.script-timing')!;
    expect(within(timing as HTMLElement).getByRole('heading', { name: STRINGS.zh.timingTitle })).toBeTruthy();
    expect(timing.querySelectorAll('.timing-list li')).toHaveLength(j.timing!.windows.length);
    expect(timing.textContent).toMatch(/吉|凶/);
    // Each window shows its dates once, first and on a line of their own; the text starts from its condition.
    const first = j.timing!.windows.find((w) => w.dates.length)!;
    expect(timing.querySelector('.timing-when b')!.textContent).toMatch(new RegExp(`^${windowDates(first.dates, j.castingDate, 'zh')}(前后)?$`));
    for (const p of timing.querySelectorAll('.timing-text')) expect(p.textContent).not.toMatch(/^可?留意(本月|下月|次月)?[\d、]+号/);
    const calc = document.querySelector('details.script-calc') as HTMLDetailsElement;
    expect(calc.open).toBe(false);
    // Folded, and in four labelled parts.
    expect([...calc.querySelectorAll('.calc-label')].map((l) => l.textContent)).toEqual(['历法', '卦象', '体用', '取期']);
    expect(calc.textContent).not.toMatch(/旬空|空亡/);
    expect(calc.textContent).toMatch(/亥月/);
    expect(document.body.textContent).not.toMatch(/interview-pass|trigram-void|mh-\d/);
    // The brief's button is named apart from the 详断 section it opens.
    expect(screen.getByRole('button', { name: STRINGS.zh.detailOpen })).toBeTruthy();
    // 专业依据 under a written 断语: the facts (stages, 体用 relations) but no rule-only verdict that
    // ignores 旺衰 (no 体用结构推演, no 当前有利 / 结局顺和, no good/bad colouring).
    expect(document.querySelector('details.read-judge-fold')).toBeNull();
    expect(document.querySelectorAll('.read-phrase').length).toBe(0);
    expect(document.querySelectorAll('.read-stage.tone-plain').length).toBe(3);
    expect([...document.querySelectorAll('.read-stage .read-stage-word')].map((w) => w.textContent)).toEqual(['目前', '经过', '结果']);
    fireEvent.click(screen.getByRole('button', { name: '《梅花易数·求名占第九》 ↗' }));
    expect(opened).toEqual(['求名占第九']);
  });

  it('locks the 详断 for a free reader, but shows the 简断', async () => {
    const knowledge = await testKnowledge();
    const j = (await judgmentFor(knowledge.product, questionById(INTERVIEW)!, WELL)) as ProductJudgment;
    const reading = knowledge.library.createReading({ primaryId: 48, movingLine: 5, domainId: 'domain-09' });
    render(<ReadingView reading={reading} question="" questionId={INTERVIEW} judgment={{ state: 'ready', judgment: j, full: false }} onUnlock={() => {}} castTime="" t={STRINGS.zh} lang="zh" focus={null} saved={false} onPick={() => {}} onSave={() => {}} onClose={() => {}} />);
    expect(screen.getByText(j.short)).toBeTruthy();
    expect(document.querySelector('.script-full')).toBeNull();
    expect(screen.getByText(STRINGS.zh.judgmentLocked)).toBeTruthy();
  });

  it('keeps older free-written records as their own kind, never matched to a fixed question', async () => {
    const { library } = await testKnowledge();
    const old = freezeCast(library, { method: 'manual', manual: { primaryId: 34, movingLine: 1 }, instant: new Date(), timeZone: 'UTC', question: '我能拿到 Amazon 的工作吗？', domainId: 'domain-09', topicId: 'career' });
    expect(recordKind(old)).toBe('legacy-free-text');
    expect(old.questionId).toBeUndefined();
    expect(old.judgment).toBeUndefined();
    expect(judgmentInput(old)).toBeNull();
    expect(sameMatterCandidate([old], INTERVIEW)).toBeNull();
    render(<RecordDetail record={old} journal={createJournal(memoryStore())} t={STRINGS.zh} onOpen={() => {}} onBack={() => {}} onChanged={() => {}} />);
    expect(screen.getByText('“我能拿到 Amazon 的工作吗？”')).toBeTruthy();
    expect(screen.getByText(STRINGS.zh.legacyRecord)).toBeTruthy();
  });

  it('refuses an unknown question instead of guessing', async () => {
    const { library } = await testKnowledge();
    expect(() => freezeCast(library, castRequest(form({ questionId: 'career.made_up' }), opts(new Date())))).toThrow(/Unknown question/);
    // Ids from before the formal catalog are not cast any more.
    expect(() => freezeCast(library, castRequest(form({ questionId: 'career.job_interview.pass' }), opts(new Date())))).toThrow(/Unknown question/);
    expect(entryProblem(form({ questionId: null }))).toBe('question');
  });
});
