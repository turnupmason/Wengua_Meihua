import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createProductRepository, findUpcomingCivilDayMatches, loadLibrary, MONTH_SLOTS } from '../src/index.js';

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
 const pending = await product.getContent({...cast, questionId, context, primaryId:64});
 if (pending.status !== 'ready') {
  assert.equal(pending.status, 'pending-authoring');
  assert.equal(pending.story, null);
 }
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

test('job-change reads exact month keys with shared output order and actual dates', async () => {
  const index = JSON.parse(await read('data/authored-readings/' + directory + '/index.json'));
  let checkedKeys = 0;
  for (const entry of index.files) {
   const shard = JSON.parse(await read(entry.path));
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
     assert.equal(result.calculationExplanation.void, undefined);
     assert.deepEqual(result.narrativeParagraphs.map(p => p.split('：', 1)[0]), ['开局','过程','结局','总断']);
     const parts = sections[position].split('\n\n');
     assert.equal(parts[3], '简断');
     assert.deepEqual(parts.slice(5,12).map(p => p.split('：',1)[0]), ['开局','过程','结局','应期','总断','古籍依据','动爻完整原文']);
     assert.equal(parts[12], '<details>\n<summary>计算说明</summary>');
     if (row.timingSlots.length) assert.match(parts[8], /(?:本月|下月)\d+号|(?:本月|下月)\d+(?:、\d+)+号/u);
     else assert.ok(result.calculationExplanation.timing.omission.reason);
     for (const window of result.timingSection.windows) {
      const expected = findUpcomingCivilDayMatches({castingDate:cast.castingDate, branches:window.targetBranches});
      assert.deepEqual(window.displayedDates, expected.matches.slice(0,2).map(day => day.date));
      assert.ok(window.event && window.valence && window.calculationBasis);
     }
     checkedKeys++;
    }
   }
  }
  assert.equal(checkedKeys, index.baseCaseCount);
  assert.equal(index.authorWholeArticleReviewed, index.files.length * 30);
});
