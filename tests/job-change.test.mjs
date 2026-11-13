import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { AUDIT_CHECKS, createProductRepository, findUpcomingCivilDayMatches, getCivilDay, loadLibrary, MONTH_SLOTS } from '../src/index.js';
import { checkChartFacts } from './helpers/chart-facts.mjs';

const library = await loadLibrary();
const product = createProductRepository({library});
const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');
const cast = {
 primaryId:1, movingLine:4, monthBranch:'酉', castingDate:'2028-02-25', timingScale:'day',
 timingContext:{castingMethod:'pre-heaven', periodMethod:'element-qi'},
};
const questionId = 'career.job-change.decision';
const directory = 'job-change';
const context = {jobPriority:'income',comparisonTerms:'both-known'};

test('job-change uses one reading for both parts and preserves historical casts', async () => {
 const questions = await product.listQuestions('career.job-change');
 assert.deepEqual(questions.filter(q => !q.archived).map(q => q.id), [questionId]);
 // Asked like every other entry (2026-11-13): nothing finer is required, and the reading is the same.
 const plain = await product.getContent({...cast, questionId});
 assert.equal(plain.missingContext, undefined);
 const choosing = await product.getContent({...cast, questionId, context});
 assert.equal(plain.short, choosing.short);
 assert.equal(choosing.decision.outcomeCode, 'switch');
 assert.match(choosing.short, /倾向新岗位.*办离职/u);
 const delayed = await product.getContent({...cast, questionId, context, movingLine:5});
 assert.equal(delayed.decision.outcomeCode, 'prepare');
 assert.match(delayed.short, /新工作.*准备.*再/u);
 for (const [id, oldContext, outcome] of [
  ['career.job-change.resign', {jobPlan:'new-job-confirmed'}, 'leave'],
  ['career.job-change.compare-jobs', context, 'new'],
 ]) {
  assert.equal((await product.getQuestion(id)).archived, true);
  const historical = await product.getContent({...cast, questionId:id, context:oldContext});
  assert.equal(historical.decision.outcomeCode, outcome);
 }
 const finalHexagram = await product.getContent({...cast, questionId, context, primaryId:64});
 assert.equal(finalHexagram.status, 'ready');
});

test('job-change recalculates at a new cast, keeps historical dates, and bounds each window', async () => {
 const input = {...cast, questionId, context, primaryId:2, movingLine:1, monthBranch:'寅'};
 const [first, fresh, nextMonth, archived] = await Promise.all([
  product.getContent({...input, castingDate:'2026-11-11'}),
  product.getContent({...input, castingDate:'2026-11-13'}),
  product.getContent({...input, castingDate:'2026-11-30'}),
  product.getContent({...input, castingDate:'2026-11-11', viewDate:'2026-12-01'}),
 ]);
 const [earlier, current, following, historical] = [first, fresh, nextMonth, archived].map(r => r.timingSection.windows[0]);
 assert.deepEqual(earlier.displayedDates, ['2026-11-12', '2026-11-13']);
 assert.deepEqual(current.displayedDates, ['2026-11-13', '2026-11-24']);
 assert.deepEqual(following.displayedDates, ['2026-12-06', '2026-12-07']);
 assert.deepEqual(historical.displayedDates, earlier.displayedDates);
 assert.match(historical.text, /11月12、13号/u);
 assert.match(following.text, /下月6、7号/u);
 assert.equal(current.event, earlier.event);
 assert.equal(current.valence, earlier.valence);
});

test('job-change keeps the last restriction in 萃九五 and stages the conditional changes in 睽 and 升', async () => {
 const cui = JSON.parse(await read('data/authored-readings/job-change/hex-045.json'));
 const endings = cui.rows.filter(row => row.movingLine === 5);
 assert.equal(endings.length, 5);
 for (const row of endings) {
  assert.equal(row.facts.directRelations.find(relation => relation.role === 'changed_use').type, 'use_controls_body');
  assert.match(row.copy.long.ending, /震(?:木当旺而)?(?:仍)?克(?:死|相|休|囚|旺)坤/u);
  assert.match(row.copy.long.ending, /无咎/u);
 }
 for (const [primaryId, movingLine] of [[38,5], [38,6], [46,3]]) {
  const result = await product.getContent({...cast, questionId, primaryId, movingLine, monthBranch:'丑'});
  assert.equal(result.decision.outcomeCode, 'prepare');
  assert.match(result.short, /再(?:办辞职|离职|辞)/u);
 }
});

test('job-change reads exact month keys with shared output order and actual dates', async () => {
  const index = JSON.parse(await read('data/authored-readings/' + directory + '/index.json'));
  let checkedKeys = 0;
  let checkedArticles = 0;
  let dated = 0;
  let timingWindows = 0;
  assert.equal(index.files.length, 64);
  assert.equal(index.fullTwelveMonthCharts, 384);
  assert.equal(index.remainingBaseSlots, 0);
  assert.equal(index.next, null);
  for (const entry of index.files) {
   const shard = JSON.parse(await read(entry.path));
   assert.equal(shard.rows.length, 30);
   assert.equal(Object.keys(shard.monthSlots).length, 72);
   for (const row of shard.rows) {
    const key = row.decision.id;
    checkChartFacts(library, row, key);
    assert.equal(row.movingLineText, library.getLineReading(row.primaryId, row.movingLine).text, key);
    assert.equal(row.copy.short.decisionId, key);
    assert.equal(row.copy.long.decisionId, key);
    assert.equal(row.review.independentReview.status, 'pending', key);
    assert.equal(row.review.independentReview.userAcceptedThisVersion, false, key);
    for (const check of AUDIT_CHECKS) assert.ok(row.review.checks[check].evidence.length, key);
    for (const evidence of row.decision.sourceEvidence) {
     const section = library.getSection(evidence.id);
     assert.ok(section.text.includes(evidence.quote), key);
     assert.deepEqual(evidence.locator, section.sourceRef, key);
    }
    for (const slot of row.timingSlots) {
     const explicitBranches = slot.reason.matchAll(/(?:取|按|用|之|的)([子丑寅卯辰巳午未申酉戌亥](?:、[子丑寅卯辰巳午未申酉戌亥])*)日/gu);
     for (const [, branches] of explicitBranches) assert.deepEqual(branches.split('、'), slot.branches, key);
     assert.equal(slot.valence, {control:'凶', drain:'耗', equal:'吉', support:'吉'}[slot.kind], key);
     assert.doesNotMatch(slot.text, /^(?:属吉应|属凶应|属耗应|属阶段提醒)/u, key);
    }
    dated += Number(row.timingSlots.length > 0);
    timingWindows += row.timingSlots.length;
    checkedArticles++;
   }
   const doc = await read('docs/' + directory + '/' + entry.path.split('/').at(-1).replace('.json', '.md'));
   const sections = doc.split(/(?=^## )/mu).slice(1);
   assert.equal(sections.length, shard.rows.length);
   for (let line = 1; line <= 6; line++) {
    for (const {branch} of MONTH_SLOTS) {
     const position = shard.monthSlots[line + ':' + branch];
     const row = shard.rows[position];
     const result = await product.getContent({...cast, questionId, context, primaryId:entry.primaryId, movingLine:line, monthBranch:branch});
     assert.equal(result.status, 'ready');
     assert.equal(result.monthBranch, branch);
     assert.equal(result.short, row.copy.short.text);
     assert.equal(result.reading.selectedMovingLine.text, row.movingLineText);
     assert.equal(result.calculationExplanation.month.branch, branch);
     assert.equal(result.calculationExplanation.void, undefined);
     assert.deepEqual(result.narrativeParagraphs.map(p => p.split('：', 1)[0]), ['开局','过程','结局','总断']);
     const parts = sections[position].split('\n\n');
     assert.equal(parts[3], '简断');
     assert.deepEqual(parts.slice(5,12).map(p => p.split('：',1)[0]), ['开局','过程','结局','应期','总断','古籍依据','动爻完整原文']);
     assert.equal(parts[12], '<details>\n<summary>计算说明</summary>');
     if (row.timingSlots.length) {
      assert.match(parts[8], /(?:本月|下月)\d+(?:、\d+)*号/u);
      for (const slot of row.timingSlots) assert.ok(parts[8].includes(slot.event + '，属' + slot.valence + '应。'));
     } else assert.ok(result.calculationExplanation.timing.omission.reason);
     for (const window of result.timingSection.windows) {
      const expected = findUpcomingCivilDayMatches({castingDate:cast.castingDate, branches:window.targetBranches});
      assert.deepEqual(window.displayedDates, expected.matches.slice(0,2).map(day => day.date));
      assert.ok(window.event && window.valence && window.calculationBasis);
      assert.ok(window.text.includes(window.event));
      assert.ok(window.displayedDates.every(day => day >= cast.castingDate && window.targetBranches.includes(getCivilDay(day).dayBranch)));
     }
     checkedKeys++;
    }
   }
  }
  assert.equal(checkedKeys, index.baseCaseCount);
  assert.equal(checkedKeys, 4608);
  assert.equal(checkedArticles, 1920);
  assert.equal(index.authorWholeArticleReviewed, checkedArticles);
  assert.equal(index.dated, dated);
  assert.equal(index.undated, checkedArticles - dated);
  assert.equal(index.timingWindowCount, timingWindows);
});
