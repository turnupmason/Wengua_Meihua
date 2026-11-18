import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { AUDIT_CHECKS, createProductRepository, findUpcomingCivilDayMatches, loadLibrary, MONTH_SLOTS } from '../src/index.js';
import { checkChartFacts } from './helpers/chart-facts.mjs';

const library = await loadLibrary();
const product = createProductRepository({library});
const questionId = 'career.interview.interview-pass';
const date = '2026-11-13';
const timingContext = {castingMethod:'pre-heaven', periodMethod:'element-qi'};
const request = {questionId, castingDate:date, timingScale:'day', timingContext};
const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');
const json = async path => JSON.parse(await read(path));
const index = await json('data/authored-readings/interview-pass/index.json');
const trigramDayBranches = {乾:['戌','亥'], 坤:['未','申'], 震:['卯'], 巽:['辰','巳'],
 坎:['子'], 离:['午'], 艮:['丑','寅'], 兑:['酉']};
const elementDayBranches = {木:['寅','卯'], 火:['巳','午'], 土:['辰','戌','丑','未'],
 金:['申','酉'], 水:['亥','子']};
const columns = ['开局','过程','结局','应期','总断','古籍依据','动爻完整原文'];

test('all interview month keys retain authored copy, sources, layout, and computed dates', async () => {
 let bodies = 0;
 let months = 0;
 let dated = 0;
 const seen = new Set();
 for (const [fileIndex, entry] of index.files.entries()) {
  assert.equal(entry.primaryId, fileIndex + 1);
  const shard = await json(entry.path);
  const stem = entry.path.split('/').at(-1).replace('.json', '');
  const drafts = await json('sources/editorial/interview-pass/' + stem + '.json');
  const sections = (await read('docs/interview-pass/' + stem + '.md')).split(/(?=^## )/mu).slice(1);
  assert.equal(shard.rows.length, 30);
  assert.equal(sections.length, 30);
  assert.equal(Object.keys(shard.monthSlots).length, 72);
  for (const [i, row] of shard.rows.entries()) {
   const key = row.decision.id;
   assert.equal(row.decision.questionScope, 'result-of-this-interview-round', key);
   assert.equal(row.movingLineText, library.getLineReading(entry.primaryId, row.movingLine).text, key);
   checkChartFacts(library, row, key);
   assert.deepEqual(row.stageIds, row.facts.stages.map(stage => stage.id), key);
   assert.deepEqual([row.copy.title, row.copy.short.text, row.copy.long.opening, row.copy.long.process,
    row.copy.long.ending, row.copy.long.summary], drafts[i].slice(3,9), key);
   assert.equal(row.copy.short.decisionId, key);
   assert.equal(row.copy.long.decisionId, key);
   // 口径 V2：用户授权 AI 代审通过的稿件如实记为 AI，且须有复核、盲断与润色记录；其余仍为 pending。
   const independent = row.review.independentReview;
   if (independent.status === 'ai-delegated-approved') {
    assert.equal(independent.userAcceptedThisVersion, true, key);
    assert.equal(independent.reviewerIsHuman, false, key);
    assert.equal(independent.acceptance, '用户授权 AI 代审通过（2026-11-18）', key);
    assert.equal(row.ruleVersions.policy, 'reading-policy-v2-20261118', key);
    assert.ok(row.calculationNotes?.length >= 3, key);
   } else {
    assert.equal(independent.status, 'pending', key);
    assert.equal(independent.userAcceptedThisVersion, false, key);
   }
   // 口径 V2.1 只许一层间接生克，且须引《体用》原文；旧稿仍为空。
   for (const effect of row.decision.indirectEffectsApplied) {
    assert.equal(row.ruleVersions.policy, 'reading-policy-v2-20261118', key);
    assert.equal(effect.rule, 'reading-policy-v2.1-indirect-one-layer', key);
    assert.ok(['control-strengthened','control-weakened','support-weakened'].includes(effect.effect), key);
    assert.ok(['use','body_mutual','use_mutual','changed_use'].includes(effect.role), key);
    assert.ok(library.getSection(effect.sourceId).text.includes(effect.quote), key);
   }
   if (!row.ruleVersions.policy) assert.deepEqual(row.decision.indirectEffectsApplied, []);
   for (const check of AUDIT_CHECKS) assert.ok(row.review.checks[check].evidence.length, key);
   for (const source of row.decision.sourceEvidence) {
    const section = library.getSection(source.id);
    assert.ok(section.text.includes(source.quote), key);
    assert.deepEqual(section.sourceRef, source.locator, key);
   }
   for (const field of drafts[i].slice(3,9)) {
    const normalized = field.replace(/[^\p{Letter}\p{Number}]/gu, '');
    assert.ok(!seen.has(normalized), key);
    seen.add(normalized);
   }
   const parts = sections[i].split('\n\n');
   assert.equal(parts[3], '简断', key);
   assert.deepEqual(parts.slice(5,12).map(p => p.split('：',1)[0]), columns, key);
   assert.equal(parts[12], '<details>\n<summary>计算说明</summary>', key);
   assert.ok(row.timingSlots.length <= 1, key);
   if (row.timingSlots.length) {
    const [slot] = row.timingSlots;
    const [kind, role, , , , declaredMethod] = drafts[i][10][0];
    const node = row.facts.nodes.find(entry => entry.role === role);
    const usesTrigram = kind === 'name-body' || declaredMethod === 'trigram-periods';
    const expectedBranches = usesTrigram ? trigramDayBranches[node.trigram] : elementDayBranches[node.element];
    assert.equal(slot.method, usesTrigram ? 'trigram-periods' : 'element-qi', key);
    assert.deepEqual(slot.branches, expectedBranches, key);
    if (usesTrigram) assert.ok(row.decision.sourceEvidence.some(source => source.id === 'mh-052'), key);
    assert.match(parts[8], /(?:本月|下月)\d+(?:、\d+)*号/u, key);
    assert.ok(parts[8].includes(slot.event + '，属' + slot.valence + '应。'), key);
    dated++;
   } else assert.ok(row.timingOmission.reason, key);
   bodies++;
  }
  for (let movingLine = 1; movingLine <= 6; movingLine++) {
   for (const {branch, qi} of MONTH_SLOTS) {
    const row = shard.rows[shard.monthSlots[movingLine + ':' + branch]];
    const result = await product.getContent({...request, primaryId:entry.primaryId, movingLine, monthBranch:branch});
    assert.equal(result.status, 'ready');
    assert.equal(result.short, row.copy.short.text);
    assert.equal(result.monthOrder, qi);
    assert.equal(result.calculationExplanation.month.branch, branch);
    assert.equal(result.calculationExplanation.void, undefined);
    assert.deepEqual(result.narrativeParagraphs.map(p => p.split('：',1)[0]), ['开局','过程','结局','总断']);
    assert.equal(result.timingSection.windows.length, row.timingSlots.length);
    for (const window of result.timingSection.windows) {
     const expected = findUpcomingCivilDayMatches({castingDate:date, branches:window.targetBranches});
     assert.deepEqual(window.displayedDates, expected.matches.slice(0,2).map(day => day.date));
     assert.ok(window.text.includes(window.event));
     assert.equal(window.text.split('，属' + window.valence + '应。').length, 2);
    }
    months++;
   }
  }
 }
 assert.equal(bodies, index.authoredVersionCount);
 assert.equal(bodies, index.authorWholeArticleReviewed);
 assert.equal(months, index.baseCaseCount);
 assert.equal(index.remainingBaseSlots, 4608 - months);
 assert.equal(dated, index.dated);
});


// 面试按考试定稿口径补判（docs/review/INTERVIEW_REJUDGE_20261118.md）：每盘结论与考试同盘一致，只有能过、过不了。
test('interview verdicts equal the finalized exam verdict on every chart and are binary', async () => {
 const counts = {favourable:0, difficult:0};
 for (let h = 1; h <= 64; h++) {
  const stem = 'hex-' + String(h).padStart(3, '0');
  const exam = await json('sources/editorial/exam/' + stem + '.json');
  const interview = await json('sources/editorial/interview-pass/' + stem + '.json');
  exam.forEach((d, i) => {
   assert.deepEqual(interview[i].slice(0, 3), d.slice(0, 3), stem + '#' + i);
   counts[interview[i][2]]++;
  });
 }
 assert.deepEqual(counts, index.outcomeCounts);
});

// 《求名占》「用克体，名不可成」：本用克体而全盘无生体，不得判能过。
test('use controlling body with no supporting trigram never passes an interview', async () => {
 for (const entry of index.files) {
  const shard = await json(entry.path);
  for (const row of shard.rows) {
   const rel = Object.fromEntries(row.facts.directRelations.map(e => [e.role, e.type]));
   if (rel.use === 'use_controls_body' && !Object.values(rel).includes('use_generates_body')) assert.equal(row.decision.outcomeCode, 'difficult', row.decision.id);
  }
 }
});

test('interview prose carries no exam vocabulary and no hedged verdicts', async () => {
 for (const entry of index.files) {
  const shard = await json(entry.path);
  for (const row of shard.rows) {
   const text = [row.copy.title, row.copy.short.text, ...Object.values(row.copy.long)].join('');
   assert.ok(!/考试|考场|考生|卷面|试卷|阅卷|合格线|分数|偏难|有条件|倾向难以/u.test(text), row.decision.id);
  }
 }
});
