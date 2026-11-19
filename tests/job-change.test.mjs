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

// 跳槽去留 v3（job-change-3.0.0）的逐盘检查在 tests/job-change-v3.test.mjs；这里只留问法与旧分问的兼容。
test('job-change uses one reading for both parts and preserves historical casts', async () => {
 const questions = await product.listQuestions('career.job-change');
 assert.deepEqual(questions.filter(q => !q.archived).map(q => q.id), [questionId]);
 // Asked like every other entry (2026-11-13): nothing finer is required, and the reading is the same.
 const plain = await product.getContent({...cast, questionId});
 assert.equal(plain.missingContext, undefined);
 const choosing = await product.getContent({...cast, questionId, context});
 assert.equal(plain.short, choosing.short);
 assert.ok(['stay','prepare','switch'].includes(choosing.decision.outcomeCode));
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
