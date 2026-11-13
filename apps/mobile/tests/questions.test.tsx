/**
 * 全点击式问事 on the formal product catalog: the six categories, 31 subcategories and 82
 * questions of data/product-categories.json, the click-only home entry, the 断语 lookup through
 * createProductRepository, and how a cast carries its question and 断语 into 问事录.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import productFile from '../../../data/product-categories.json';
import labelsFile from '../src/data/product-catalog.labels.json';
import { DOMAINS, allQuestions, allSubtypes, catalogProblems, enabledQuestions, productContext, questionById, questionWording, readinessOf } from '../src/domain/questionCatalog';
import { castingDateOf, judgmentFor, readableCalculation, seasonOf, type JudgmentInput, type ProductJudgment } from '../src/domain/judgment';
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
  it('has its six categories, 31 subcategories and 82 questions, in its order and wording', () => {
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
      for (const [j, s] of d.subtypes.entries()) expect(s.questions.map((q) => [q.question_id, q.question_text.zh])).toEqual(file.categories[i].subcategories[j].questions.map((q) => [q.id, q.question]));
    }
    expect(allSubtypes()).toHaveLength(31);
    expect(allQuestions()).toHaveLength(82);
    expect(catalogProblems()).toEqual([]);
  });

  it('gives every question a classical category, an English wording and its mode', async () => {
    const { library } = await testKnowledge();
    const categories = new Set(library.listDomains().map((d) => d.id));
    for (const q of allQuestions()) {
      expect(q.question_id.startsWith(`${q.domain_id}.`)).toBe(true);
      expect(allSubtypes().find((s) => s.subtype_id === q.subtype_id)?.questions.some((entry) => entry.question_id === q.question_id)).toBe(true);
      if (q.mode === 'narrative') expect(categories.has(q.classical_domain_id!)).toBe(true);
      expect(q.question_text.en).not.toBe(q.question_text.zh);
      if (q.mode !== 'narrative') expect(q.paragraphs.length).toBeGreaterThan(0);
    }
    // Health is traditional reference only; finding someone and retracing steps are guidance.
    expect(allQuestions().filter((q) => q.domain_id === 'health').every((q) => q.mode === 'reference')).toBe(true);
    expect(readinessOf(questionById('search.person-leads.guidance')!)).toBe('guidance');
    // The promotion library is being filled one complete hexagram at a time.
    expect(allQuestions().filter((q) => readinessOf(q) === 'written').map((q) => q.question_id)).toEqual([INTERVIEW, 'career.promotion-pay.promotion']);
    const promotionPay = allSubtypes().find((s) => s.subtype_id === 'career.promotion-pay')!;
    expect(enabledQuestions(promotionPay).map((q) => q.question_id)).toEqual(['career.promotion-pay.promotion']);
    for (const s of allSubtypes()) expect(enabledQuestions(s).length).toBeGreaterThanOrEqual(1);
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
    // 求职录用 includes written 断语; the other five career entries are pending.
    fireEvent.click(within(grid).getByRole('radio', { name: '事业工作' }));
    expect(screen.getAllByText(STRINGS.zh.scriptPendingTag)).toHaveLength(4);
    fireEvent.click(screen.getByRole('button', { name: STRINGS.zh.close }));
    fireEvent.click(within(grid).getByRole('radio', { name: '健康疾病' }));
    expect(screen.getAllByText(STRINGS.zh.referenceTag)).toHaveLength(4);
  });

  it('chooses a question by taps alone and never offers a keyboard', () => {
    let last: EntryForm = EMPTY_FORM;
    render(<Home onChange={(f) => (last = f)} />);
    expect(keyboardFields()).toHaveLength(0);
    fireEvent.click(screen.getByRole('radio', { name: '事业工作' }));
    fireEvent.click(screen.getByRole('button', { name: /求职录用/ }));
    // Two questions: a second step lists them; the written one has no tag.
    fireEvent.click(screen.getByRole('button', { name: '这次面试能通过吗？' }));
    expect(last).toMatchObject({ questionId: INTERVIEW, domainId: 'domain-09', topicId: 'career' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByText(STRINGS.zh.scriptPendingNote)).toBeNull();
    expect(entryProblem(last)).toBeNull();
    // Change: back into the drawer, another subcategory, a question still being written.
    fireEvent.click(screen.getByRole('button', { name: /所问之事 · 求职录用/ }));
    fireEvent.click(screen.getByRole('button', { name: STRINGS.zh.backLevel }));
    fireEvent.click(screen.getByRole('button', { name: /考试选拔/ }));
    fireEvent.click(screen.getByRole('button', { name: /这次岗位竞聘能成功吗/ }));
    expect(last.questionId).toBe('career.selection.competition');
    expect(screen.getByText(STRINGS.zh.scriptPendingNote)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /所问之事 · 考试选拔/ }));
    const drawer = screen.getByRole('dialog', { name: '事业工作' });
    expect(within(drawer).getByRole('button', { name: /这次岗位竞聘能成功吗/ }).getAttribute('aria-current')).toBe('true');
    expect(keyboardFields()).toHaveLength(0);
  });

  it('asks a fixed option first when the question needs one (the kind of item lost)', () => {
    let last: EntryForm = EMPTY_FORM;
    render(<Home onChange={(f) => (last = f)} />);
    fireEvent.click(screen.getByRole('radio', { name: '寻人失物' }));
    fireEvent.click(screen.getByRole('button', { name: /物品找回/ }));
    fireEvent.click(screen.getByRole('button', { name: /丢失的这件物品还能找回来吗/ }));
    expect(screen.getByRole('radiogroup', { name: '物品类型' })).toBeTruthy();
    expect(screen.getByRole('button', { name: STRINGS.zh.done }).hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByRole('radio', { name: '手机' }));
    fireEvent.click(screen.getByRole('button', { name: STRINGS.zh.done }));
    expect(last).toMatchObject({ questionId: 'search.lost-object.recovery', conditions: { objectKind: 'phone' }, domainId: 'domain-15' });
    expect(entryProblem({ ...last, conditions: {} })).toBe('conditions');
  });

  it('offers a reference question to read at once: no method, no pace, 查看说明', () => {
    let last: EntryForm = EMPTY_FORM;
    render(<Home onChange={(f) => (last = f)} />);
    fireEvent.click(screen.getByRole('radio', { name: '健康疾病' }));
    fireEvent.click(screen.getByRole('button', { name: /身体象意/ }));
    fireEvent.click(screen.getByRole('button', { name: /古籍如何描述身体状况相关的象意/ }));
    expect(last.questionId).toBe('health.condition.condition');
    expect(screen.getByText(STRINGS.zh.referenceNote)).toBeTruthy();
    expect(screen.queryByRole('radiogroup', { name: STRINGS.zh.paceLabel })).toBeNull();
    expect(screen.getByRole('button', { name: STRINGS.zh.readReference })).toBeTruthy();
    expect(entryProblem(last)).toBeNull();
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

  it('shows real-world help first for a missing person, then the question', () => {
    let last: EntryForm = EMPTY_FORM;
    render(<Home onChange={(f) => (last = f)} />);
    fireEvent.click(screen.getByRole('radio', { name: '寻人失物' }));
    fireEvent.click(screen.getByRole('button', { name: /失联寻人/ }));
    expect(screen.getByRole('note').textContent).toMatch(/911.*报警/);
    expect(last.questionId).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: STRINGS.zh.backLevel }));
    expect(document.querySelectorAll('.subtype-grid button')).toHaveLength(4);
    fireEvent.click(screen.getByRole('button', { name: /失联寻人/ }));
    fireEvent.click(screen.getByRole('button', { name: /与这位失联者还能恢复联系吗/ }));
    expect(last.questionId).toBe('search.missing-contact.contact');
    expect(screen.getByText(/卦象不能说明真实位置或安全状况/)).toBeTruthy();
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
    const calc = document.querySelector('details.script-calc') as HTMLDetailsElement;
    expect(calc.open).toBe(false);
    expect(calc.textContent).not.toMatch(/旬空|空亡/);
    expect(calc.textContent).toMatch(/亥月/);
    expect(document.body.textContent).not.toMatch(/interview-pass|trigram-void|mh-\d/);
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
