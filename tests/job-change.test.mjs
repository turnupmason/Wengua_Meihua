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
const questions = [
 {questionId:'career.job-change.resign', directory:'job-resign', context:{jobPlan:'new-job-confirmed'}},
 {questionId:'career.job-change.compare-jobs', directory:'job-compare', context:{jobPriority:'income',comparisonTerms:'both-known'}},
];

test('job-change keeps the comparison and resignation conditions and outcomes distinct', async () => {
 const [resign, compare] = questions;
 assert.deepEqual((await product.getContent({...cast, questionId:resign.questionId})).missingContext, ['jobPlan']);
 assert.deepEqual((await product.getContent({...cast, questionId:compare.questionId})).missingContext, ['jobPriority','comparisonTerms']);
 const leaving = await product.getContent({...cast, questionId:resign.questionId, context:resign.context});
 const choosing = await product.getContent({...cast, questionId:compare.questionId, context:compare.context});
 assert.equal(leaving.decision.outcomeCode, 'leave');
 assert.equal(choosing.decision.outcomeCode, 'new');
 assert.notEqual(leaving.short, choosing.short);
 const pending = await product.getContent({...cast, questionId:resign.questionId, context:resign.context, primaryId:64});
 if (pending.status !== 'ready') {
  assert.equal(pending.status, 'pending-authoring');
  assert.equal(pending.story, null);
 }
});

test('job-change reads exact month keys with shared output order and actual dates', async () => {
 for (const {questionId, directory, context} of questions) {
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
 }
});
