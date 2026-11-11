/**
 * 全点击式问事: the QuestionCatalog, the click-only home entry, the 断语 lookup and import checks,
 * and how a cast carries its question_id and 断语 version into 问事录.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { DOMAINS, allQuestions, allSubtypes, catalogProblems, enabledQuestions, questionById, type CatalogQuestion } from '../src/domain/questionCatalog';
import { createScriptRepository, parseCsv, scriptKey, seasonOf, validateScripts, type ScriptRecord } from '../src/domain/scripts';
import { chargesToday, freezeCast, recordKind } from '../src/domain/cast';
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
import { memoryStore, testKnowledge } from './helpers';

afterEach(cleanup);

/** The 52 subtypes exactly as specified (id → name), in order. */
const SPEC: Record<string, [string, string][]> = {
  career: [['career.job_interview', '求职面试'], ['career.promotion', '升职加薪'], ['career.job_change', '跳槽去留'], ['career.job_stability', '工作稳定'], ['career.workplace_relations', '职场人际'], ['career.exam', '考试考核'], ['career.project', '项目事业'], ['career.selection', '竞聘选拔']],
  wealth: [['wealth.recent_fortune', '近期财运'], ['wealth.income', '正财收入'], ['wealth.investment', '投资理财'], ['wealth.business', '生意经营'], ['wealth.contract', '交易合同'], ['wealth.partnership', '合伙合作'], ['wealth.debt_collection', '债务催收'], ['wealth.trading', '买卖求财'], ['wealth.project_profit', '项目盈利']],
  love: [['love.secret_crush', '暗恋心意'], ['love.ambiguous_relation', '暧昧发展'], ['love.confession', '表白追求'], ['love.relationship', '恋爱关系'], ['love.conflict', '冷战矛盾'], ['love.reconciliation', '分手复合'], ['love.destined_partner', '桃花正缘'], ['love.marriage_discussion', '谈婚论嫁'], ['love.married_life', '婚姻家庭'], ['love.long_distance', '异地恋情']],
  health: [['health.general', '身体状况'], ['health.body_location', '不适部位'], ['health.severity_symbolism', '病情轻重'], ['health.progress_symbolism', '病情发展'], ['health.treatment', '治疗过程'], ['health.surgery', '手术事项'], ['health.recovery', '康复调养'], ['health.family_health', '家人健康']],
  home: [['home.buy_property', '买房置业'], ['home.sell_property', '卖房出售'], ['home.rental', '租赁住房'], ['home.moving', '搬家迁居'], ['home.renovation', '装修建造'], ['home.family_relations', '家庭关系'], ['home.parents', '父母长辈'], ['home.children', '子女事务'], ['home.living_environment', '家宅环境']],
  search: [['search.lost_item', '失物寻找'], ['search.direction', '位置方向'], ['search.valuables', '贵重物品'], ['search.documents', '证件文件'], ['search.loss_cause', '失物原因'], ['search.pet', '宠物走失'], ['search.missing_person', '人员失联'], ['search.person_clues', '寻人线索']],
};

/** An approved 断语 for tests (every field filled). */
const mk = (o: Partial<ScriptRecord> = {}): ScriptRecord => ({
  script_id: `t.${Math.random().toString(36).slice(2)}`,
  question_id: 'career.job_interview.pass',
  hexagram_id: 55,
  moving_line: 3,
  season_variant_id: 'winter',
  title: '冬令雷火丰九三',
  brief_text: '简断文字',
  opening_text: '开局文字',
  process_text: '过程文字',
  ending_text: '结局文字',
  conclusion_text: '总断文字',
  classical_sources: [{ kind: 'line', hexagram_id: 55, line: 3 }],
  status: 'approved',
  version: '1',
  ...o,
});

function Home({ onChange, onTitle = () => {} }: { onChange?: (f: EntryForm) => void; onTitle?: () => void }) {
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
    />
  );
}

/** Fields that would bring up the system keyboard. */
const keyboardFields = () => [...document.querySelectorAll('textarea, input, [contenteditable="true"]')].filter((el) => !['checkbox', 'datetime-local'].includes((el as HTMLInputElement).type));

describe('QuestionCatalog', () => {
  it('has the six domains (two rows of three) and exactly the 52 specified subtypes', () => {
    expect(DOMAINS.map((d) => [d.domain_id, d.label.zh])).toEqual([
      ['career', '事业工作'],
      ['wealth', '财富财运'],
      ['love', '感情姻缘'],
      ['health', '健康疾病'],
      ['home', '家庭家宅'],
      ['search', '寻人失物'],
    ]);
    for (const d of DOMAINS) expect(d.subtypes.map((s) => [s.subtype_id, s.label.zh])).toEqual(SPEC[d.domain_id]);
    expect(allSubtypes()).toHaveLength(52);
    expect(catalogProblems()).toEqual([]);
  });

  it('gives every question a stable id under its subtype, with all the fields', async () => {
    const { library } = await testKnowledge();
    const categories = new Set(library.listDomains().map((d) => d.id));
    const ids = allQuestions().map((q) => q.question_id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const q of allQuestions()) {
      expect(q.question_id.startsWith(`${q.subtype_id}.`)).toBe(true);
      expect(q.subtype_id.startsWith(`${q.domain_id}.`)).toBe(true);
      expect(q.rule_profile_id).toBe('user-classical-plus-void');
      expect(categories.has(q.classical_domain_id)).toBe(true);
      expect(typeof q.enabled).toBe('boolean');
    }
    expect(questionById('career.job_interview.pass')?.question_text.zh).toBe('这次面试能通过吗？');
    // The second interview question exists with its own id, but stays closed until it has its own 断语.
    expect(questionById('career.job_interview.offer')?.enabled).toBe(false);
    for (const s of allSubtypes()) expect(enabledQuestions(s).length).toBeGreaterThanOrEqual(1);
  });

  it('rejects a second open question that neither has its own 断语 nor names explicit sharing', () => {
    const d = structuredClone(DOMAINS[0]);
    d.subtypes[0].questions[1].shares_scripts_of = 'career.nope';
    expect(catalogProblems({ catalog_version: 'x', rule_profile_id: 'r', domains: [d] }).join()).toMatch(/shares_scripts_of/);
  });
});

describe('click-only home', () => {
  it('opens each of the six domains to its own subtypes, in a drawer below the 三清', () => {
    render(<Home />);
    const grid = screen.getByRole('radiogroup', { name: STRINGS.zh.domainLabel });
    expect(within(grid).getAllByRole('radio')).toHaveLength(6);
    for (const d of DOMAINS) {
      fireEvent.click(within(grid).getByRole('radio', { name: d.label.zh }));
      const drawer = screen.getByRole('dialog', { name: d.label.zh });
      expect([...drawer.querySelectorAll('.subtype-grid button span')].map((b) => b.textContent)).toEqual(SPEC[d.domain_id].map(([, n]) => n));
      // Selected domain glows while its drawer is open.
      expect(within(grid).getByRole('radio', { name: d.label.zh }).getAttribute('aria-checked')).toBe('true');
      fireEvent.click(within(drawer).getByRole('button', { name: STRINGS.zh.close }));
    }
    // Every subtype in the drawer is still in preparation (no approved 断语 shipped yet).
    fireEvent.click(within(grid).getByRole('radio', { name: '事业工作' }));
    expect(screen.getAllByText(STRINGS.zh.scriptPendingTag)).toHaveLength(8);
  });

  it('chooses a question by taps alone and never offers a keyboard', () => {
    let last: EntryForm = EMPTY_FORM;
    render(<Home onChange={(f) => (last = f)} />);
    expect(keyboardFields()).toHaveLength(0);
    fireEvent.click(screen.getByRole('radio', { name: '事业工作' }));
    fireEvent.click(screen.getByRole('button', { name: /求职面试/ }));
    // One open question: chosen at once.
    expect(last.questionId).toBe('career.job_interview.pass');
    expect(last.domainId).toBe('domain-09');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByText('这次面试能通过吗？')).toBeTruthy();
    expect(screen.getByText(STRINGS.zh.scriptPendingNote)).toBeTruthy();
    expect(entryProblem(last)).toBeNull();
    expect(keyboardFields()).toHaveLength(0);
    // Change: back into the drawer, one level back, another subtype.
    fireEvent.click(screen.getByRole('button', { name: /所问之事 · 求职面试/ }));
    fireEvent.click(screen.getByRole('button', { name: /考试考核/ }));
    expect(last.questionId).toBe('career.exam.pass');
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
    fireEvent.click(screen.getByRole('button', { name: /人员失联/ }));
    expect(screen.getByRole('note').textContent).toMatch(/911.*报警/);
    expect(last.questionId).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: STRINGS.zh.backLevel }));
    expect(document.querySelectorAll('.subtype-grid button')).toHaveLength(8);
    fireEvent.click(screen.getByRole('button', { name: /人员失联/ }));
    fireEvent.click(screen.getByRole('button', { name: /失联的人能联系上吗/ }));
    expect(last.questionId).toBe('search.missing_person.contact');
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

describe('断语 lookup', () => {
  const winter = '子'; // 子月 → 冬令
  const summer = '午';

  it('only matches its own question_id', () => {
    const repo = createScriptRepository([mk({ question_id: 'career.exam.pass' })]);
    expect(repo.find({ questionId: 'career.job_interview.pass', hexagramId: 55, movingLine: 3, monthBranch: winter }).state).toBe('missing');
    expect(repo.find({ questionId: 'career.exam.pass', hexagramId: 55, movingLine: 3, monthBranch: winter }).state).toBe('ready');
  });

  it('only matches its own 本卦 and 动爻', () => {
    const repo = createScriptRepository([mk()]);
    expect(repo.find({ questionId: 'career.job_interview.pass', hexagramId: 55, movingLine: 4, monthBranch: winter }).state).toBe('missing');
    expect(repo.find({ questionId: 'career.job_interview.pass', hexagramId: 34, movingLine: 3, monthBranch: winter }).state).toBe('missing');
  });

  it('never uses a winter 断语 in summer; a year-round one only when the author marked it', () => {
    expect(seasonOf(winter)).toBe('winter');
    expect(seasonOf('辰')).toBe('earth');
    const onlyWinter = createScriptRepository([mk()]);
    expect(onlyWinter.find({ questionId: 'career.job_interview.pass', hexagramId: 55, movingLine: 3, monthBranch: summer })).toMatchObject({ state: 'missing', season: 'summer' });
    // No casting month at all: only a year-round 断语 could apply.
    expect(onlyWinter.find({ questionId: 'career.job_interview.pass', hexagramId: 55, movingLine: 3, monthBranch: null }).state).toBe('missing');
    const withAll = createScriptRepository([mk({ title: '冬' }), mk({ title: '全年', season_variant_id: 'all', season_note: '此断不随时令' })]);
    const s = withAll.find({ questionId: 'career.job_interview.pass', hexagramId: 55, movingLine: 3, monthBranch: summer });
    expect(s).toMatchObject({ state: 'ready', matchedBy: 'all-year' });
    // In its own season the season-specific one wins.
    const w = withAll.find({ questionId: 'career.job_interview.pass', hexagramId: 55, movingLine: 3, monthBranch: winter });
    expect(w.state === 'ready' && w.script.title).toBe('冬');
  });

  it('never shows a draft or a 断语 under review', () => {
    const repo = createScriptRepository([mk({ status: 'draft' }), mk({ status: 'reviewing', season_variant_id: 'all', season_note: 'x' })]);
    expect(repo.find({ questionId: 'career.job_interview.pass', hexagramId: 55, movingLine: 3, monthBranch: winter }).state).toBe('missing');
    expect(repo.availability('career.job_interview.pass').state).toBe('none');
  });

  it('matches fixed-option conditions by field, most specific first', () => {
    const q = questionById('search.lost_item.find')!;
    const withCond = { ...q, conditions: [{ condition_id: 'where', label: { zh: '在何处丢失', en: 'Where' }, options: [{ option_id: 'home', label: { zh: '家中', en: 'Home' } }, { option_id: 'out', label: { zh: '外出', en: 'Out' } }] }] };
    const { errors } = validateScripts([{ ...mk({ question_id: q.question_id }), conditions: 'where=attic' }], () => withCond);
    expect(errors.map((e) => e.message).join()).toMatch(/no option "attic"/);
    const repo = createScriptRepository([mk({ question_id: q.question_id, title: '通' }), mk({ question_id: q.question_id, title: '家中', conditions: { where: 'home' } })]);
    const home = repo.find({ questionId: q.question_id, hexagramId: 55, movingLine: 3, monthBranch: winter, conditions: { where: 'home' } });
    const out = repo.find({ questionId: q.question_id, hexagramId: 55, movingLine: 3, monthBranch: winter, conditions: { where: 'out' } });
    expect(home.state === 'ready' && home.script.title).toBe('家中');
    expect(out.state === 'ready' && out.script.title).toBe('通');
  });

  it('reports coverage per question: complete only when all 384 hold in every season', () => {
    const all: ScriptRecord[] = [];
    for (let h = 1; h <= 64; h++) for (let l = 1; l <= 6; l++) all.push(mk({ hexagram_id: h, moving_line: l, season_variant_id: 'all', season_note: '全年' }));
    expect(createScriptRepository(all).availability('career.job_interview.pass')).toMatchObject({ state: 'complete', covered: 384 });
    expect(createScriptRepository(all.slice(1)).availability('career.job_interview.pass')).toMatchObject({ state: 'partial', covered: 383 });
    expect(createScriptRepository(all).availability('career.exam.pass').state).toBe('none');
  });
});

describe('断语 import (JSON or Excel→CSV)', () => {
  it('reads a CSV saved from Excel, with line breaks inside a cell', () => {
    const csv = '﻿script_id,question_id,hexagram_id,moving_line,season_variant_id,season_note,conditions,title,brief_text,opening_text,process_text,ending_text,conclusion_text,classical_sources,status,version\r\n'
      + 'a01,career.job_interview.pass,55,3,winter,,,题,"简断，有逗号",开,过,结,总,"爻:55:3|宜日中\n篇:求名占第九",approved,2\r\n';
    const rows = parseCsv(csv);
    const { records, errors } = validateScripts(rows);
    expect(errors).toEqual([]);
    expect(records[0]).toMatchObject({ script_id: 'a01', hexagram_id: 55, moving_line: 3, brief_text: '简断，有逗号', version: '2' });
    expect(records[0].classical_sources).toEqual([{ kind: 'line', hexagram_id: 55, line: 3, quote: '宜日中' }, { kind: 'section', title: '求名占第九' }]);
  });

  it('reports every problem with its row and keeps drafts loose but approved ones complete', () => {
    const { errors } = validateScripts([
      { ...mk(), script_id: 'row1', hexagram_id: 65 },
      { ...mk(), script_id: 'row2', moving_line: 7 },
      { ...mk(), script_id: 'row3', question_id: 'career.nope' },
      { ...mk(), script_id: 'row4', opening_text: '' },
      { ...mk(), script_id: 'row5', season_variant_id: 'all' },
      { ...mk(), script_id: 'row6', status: 'published' },
      { script_id: 'row7', question_id: 'career.exam.pass', hexagram_id: 1, moving_line: 1, season_variant_id: 'spring', status: 'draft', version: '1' },
      { ...mk(), script_id: 'row8' },
      { ...mk(), script_id: 'row9' },
    ]);
    const byRow = (r: number) => errors.filter((e) => e.row === r).map((e) => e.field).join();
    expect(byRow(1)).toMatch(/hexagram_id/);
    expect(byRow(2)).toMatch(/moving_line/);
    expect(byRow(3)).toMatch(/question_id/);
    expect(byRow(4)).toMatch(/opening_text/);
    expect(byRow(5)).toMatch(/season_note/);
    expect(byRow(6)).toMatch(/status/);
    expect(byRow(7)).toBe(''); // an incomplete draft is fine
    expect(byRow(8)).toBe('');
    expect(errors.find((e) => e.row === 9)?.message).toMatch(/two approved/);
    expect(scriptKey(mk())).toBe('career.job_interview.pass|55|3|winter|');
  });
});

describe('cast, reading and 问事录', () => {
  const form = (o: Partial<EntryForm> = {}): EntryForm => ({ ...EMPTY_FORM, questionId: 'career.job_interview.pass', topicId: 'career', domainId: 'domain-09', ...o });
  const opts = (now: Date) => ({ lang: 'zh' as const, timeZone: 'Asia/Shanghai', calendarPolicy: {}, now });

  it('full ritual and 简洁问事 cast the same request through the same lookup', async () => {
    const { library } = await testKnowledge();
    const now = new Date('2026-12-20T09:00:00+08:00'); // 子月 → 冬令
    const req = castRequest(form(), opts(now));
    const probe = freezeCast(library, req, { castId: 'probe', now });
    const repo = createScriptRepository([mk({ hexagram_id: probe.primaryId, moving_line: probe.movingLine })]);
    const a = freezeCast(library, castRequest(form(), opts(now)), { castId: 'a', now, scripts: repo });
    const b = freezeCast(library, castRequest(form(), opts(now)), { castId: 'b', now, scripts: repo });
    expect([a.primaryId, a.movingLine, a.judgment]).toEqual([b.primaryId, b.movingLine, b.judgment]);
    expect(a.season).toBe('winter');
    expect(a.judgment?.state).toBe('ready');
    // Full: BEGIN → entering → revealing → reading. Quick: BEGIN then SKIP. Same cast either way.
    let full = ritualReducer(INITIAL_RITUAL, { type: 'BEGIN', castId: a.castId });
    full = ritualReducer(full, { type: 'PHASE_DONE', phase: 'entering' });
    full = ritualReducer(full, { type: 'PHASE_DONE', phase: 'revealing' });
    const quick = ritualReducer(ritualReducer(INITIAL_RITUAL, { type: 'BEGIN', castId: a.castId }), { type: 'SKIP', castId: a.castId });
    expect([full.phase, full.castId]).toEqual(['reading', a.castId]);
    expect([quick.phase, quick.castId]).toEqual(['reading', a.castId]);
  });

  it('saves question_id, the wording shown, time zone, method and the 断语 version with the record', async () => {
    const { library } = await testKnowledge();
    const now = new Date('2026-12-20T09:00:00+08:00');
    const probe = freezeCast(library, castRequest(form(), opts(now)), { now });
    const repo = createScriptRepository([mk({ script_id: 'interview.55.3.w', hexagram_id: probe.primaryId, moving_line: probe.movingLine, version: '3' })]);
    const rec = freezeCast(library, castRequest(form(), opts(now)), { now, scripts: repo });
    const history = createHistory(memoryStore(), memoryStore());
    history.save(rec);
    const back = history.get(rec.castId)!;
    expect(back).toMatchObject({ questionId: 'career.job_interview.pass', subtypeId: 'career.job_interview', question: '这次面试能通过吗？', timeZone: 'Asia/Shanghai', method: 'classical-time', topicId: 'career', domainId: 'domain-09' });
    expect(back.catalogVersion).toBeTruthy();
    expect(back.judgment).toMatchObject({ state: 'ready', script: { script_id: 'interview.55.3.w', version: '3' } });
    expect(back.snapshot?.judgmentVersion).toBe('interview.55.3.w@3');
    expect(chargesToday(back)).toBe(true);
    // The record says what was given then.
    render(<RecordDetail record={back} journal={createJournal(memoryStore())} t={STRINGS.zh} onOpen={() => {}} onBack={() => {}} onChanged={() => {}} />);
    expect(screen.getByText(/作者断语第 3 版 · 冬令/)).toBeTruthy();
    expect(screen.getByText('简断文字')).toBeTruthy();
  });

  it('with no approved 断语: says so plainly, substitutes nothing, and is not charged', async () => {
    const knowledge = await testKnowledge();
    const now = new Date('2026-12-20T09:00:00+08:00');
    const rec = freezeCast(knowledge.library, castRequest(form(), opts(now)), { now, scripts: createScriptRepository([mk({ question_id: 'career.exam.pass', season_variant_id: 'all', season_note: 'x' })]) });
    expect(rec.judgment).toEqual({ state: 'missing', season: 'winter', reason: 'no-script' });
    expect(chargesToday(rec)).toBe(false);
    const reading = knowledge.library.createReading({ primaryId: rec.primaryId, movingLine: rec.movingLine, domainId: rec.domainId });
    render(
      <ReadingView reading={reading} question={rec.question} questionId={rec.questionId} topicId={rec.topicId} snapshot={rec.snapshot} judgment={{ state: 'missing' }} onUnlock={() => {}} hexagramName={(id) => knowledge.library.getHexagram(id).name} lineName={(id, l) => knowledge.library.getHexagram(id).lines[l - 1].label} castTime="" t={STRINGS.zh} lang="zh" focus={null} saved={false} onPick={() => {}} onSave={() => {}} onClose={() => {}} />,
    );
    const brief = document.querySelector('.read-verdict')!;
    expect(within(brief as HTMLElement).getByRole('heading', { name: STRINGS.zh.scriptPending })).toBeTruthy();
    // The 体用 structure is not presented as the 断语: it sits in 专业依据, labelled.
    expect(brief.textContent).not.toContain(rec.snapshot!.headline);
    expect(screen.getByText(STRINGS.zh.structuralNote)).toBeTruthy();
  });

  it('reads the full 断语 from one record: brief, 开局/过程/结局/总断 and its sources', async () => {
    const knowledge = await testKnowledge();
    const reading = knowledge.library.createReading({ primaryId: 55, movingLine: 3, domainId: 'domain-09' });
    const { status: _s, ...script } = mk({ classical_sources: [{ kind: 'line', hexagram_id: 55, line: 3, quote: '丰其沛' }, { kind: 'section', title: '求名占第九' }] });
    void _s;
    const opened: string[] = [];
    render(
      <ReadingView reading={reading} question="这次面试能通过吗？" questionId="career.job_interview.pass" judgment={{ state: 'ready', script, seasonLabel: '冬令（亥子月）', full: true }} onUnlock={() => {}} hexagramName={(id) => knowledge.library.getHexagram(id).name} lineName={(id, l) => knowledge.library.getHexagram(id).lines[l - 1].label} onOpenBook={(id, line) => opened.push(`${id}:${line}`)} onOpenSection={(t) => opened.push(t)} castTime="" t={STRINGS.zh} lang="zh" focus={null} saved={false} onPick={() => {}} onSave={() => {}} onClose={() => {}} />,
    );
    expect(screen.getByText('简断文字')).toBeTruthy();
    for (const x of ['开局文字', '过程文字', '结局文字', '总断文字']) expect(screen.getByText(x)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '《雷火丰·九三》 ↗' }));
    fireEvent.click(screen.getByRole('button', { name: '《求名占第九》 ↗' }));
    expect(opened).toEqual(['55:3', '求名占第九']);
  });

  it('keeps older free-written records as their own kind, never matched to a fixed question', async () => {
    const { library } = await testKnowledge();
    const old = freezeCast(library, { method: 'manual', manual: { primaryId: 34, movingLine: 1 }, instant: new Date(), timeZone: 'UTC', question: '我能拿到 Amazon 的工作吗？', domainId: 'domain-09', topicId: 'career' });
    expect(recordKind(old)).toBe('legacy-free-text');
    expect(old.questionId).toBeUndefined();
    expect(old.judgment).toBeUndefined();
    expect(sameMatterCandidate([old], 'career.job_interview.pass')).toBeNull();
    render(<RecordDetail record={old} journal={createJournal(memoryStore())} t={STRINGS.zh} onOpen={() => {}} onBack={() => {}} onChanged={() => {}} />);
    expect(screen.getByText('“我能拿到 Amazon 的工作吗？”')).toBeTruthy();
    expect(screen.getByText(STRINGS.zh.legacyRecord)).toBeTruthy();
  });

  it('refuses an unknown or closed question instead of guessing', async () => {
    const { library } = await testKnowledge();
    expect(() => freezeCast(library, castRequest(form({ questionId: 'career.made_up' }), opts(new Date())))).toThrow(/Unknown question/);
    expect(() => freezeCast(library, castRequest(form({ questionId: 'career.job_interview.offer' }), opts(new Date())))).toThrow(/not open/);
    expect(entryProblem(form({ questionId: null }))).toBe('question');
  });
});

// A type-level reminder: the catalog question type is what the import checks against.
export type _Q = CatalogQuestion;
