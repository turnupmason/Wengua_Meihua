import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { AUDIT_CHECKS, createProductRepository, findUpcomingCivilDayMatches, loadLibrary, MONTH_SLOTS } from '../src/index.js';

const library = await loadLibrary();
const product = createProductRepository({library});
const questionId = 'career.exams.exam';
const date = '2026-11-13';
const timingContext = {castingMethod:'pre-heaven', periodMethod:'element-qi'};
const request = {questionId, castingDate:date, timingScale:'day', timingContext};
const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');
const json = async path => JSON.parse(await read(path));
const index = await json('data/authored-readings/exam/index.json');
const columns = ['开局','过程','结局','应期','总断','古籍依据','动爻完整原文'];

test('exam selects exact drafts, preserving separate credential, competition, and selection questions', async () => {
 const questions = await product.listQuestions('career.exams');
 assert.deepEqual(questions.map(question => question.id), [
  questionId, 'career.exams.credential', 'career.selection.competition', 'career.selection.selection',
 ]);
 const input = {...request, primaryId:1, movingLine:3, monthBranch:'酉'};
 for (const question of questions.slice(1)) {
  const result = await product.getContent({...input, questionId:question.id});
  assert.equal(result.selection.question_type, question.question_type);
  assert.equal(result.status, 'pending-authoring');
  assert.equal(result.story, null);
 }
 if (index.next) {
  const {primaryId, movingLine, monthBranches} = index.next;
  const pending = await product.getContent({...request, primaryId, movingLine, monthBranch:monthBranches[0]});
  assert.equal(pending.status, 'pending-authoring');
  assert.equal(pending.story, null);
 }
});

test('all published exam month keys retain authored copy, sources, layout, and computed dates', async () => {
 let bodies = 0;
 let months = 0;
 let dated = 0;
 const seen = new Set();
 for (const [fileIndex, entry] of index.files.entries()) {
  assert.equal(entry.primaryId, fileIndex + 1);
  const shard = await json(entry.path);
  const stem = entry.path.split('/').at(-1).replace('.json', '');
  const drafts = await json('sources/editorial/exam/' + stem + '.json');
  const sections = (await read('docs/exam/' + stem + '.md')).split(/(?=^## )/mu).slice(1);
  assert.equal(shard.rows.length, 30);
  assert.equal(sections.length, 30);
  assert.equal(Object.keys(shard.monthSlots).length, 72);
  for (const [i, row] of shard.rows.entries()) {
   const key = row.decision.id;
   assert.equal(row.decision.questionScope, 'result-of-this-exam', key);
   assert.equal(row.movingLineText, library.getLineReading(entry.primaryId, row.movingLine).text, key);
   assert.deepEqual(row.stageIds, [entry.primaryId, library.getMutualHexagram(entry.primaryId, row.movingLine).id,
    library.getChangedHexagram(entry.primaryId, row.movingLine).id], key);
   assert.deepEqual([row.copy.title, row.copy.short.text, row.copy.long.opening, row.copy.long.process,
    row.copy.long.ending, row.copy.long.summary], drafts[i].slice(3,9), key);
   assert.equal(row.copy.short.decisionId, key);
   assert.equal(row.copy.long.decisionId, key);
   assert.equal(row.review.independentReview.status, 'pending');
   assert.equal(row.review.independentReview.userAcceptedThisVersion, false);
   assert.deepEqual(row.decision.indirectEffectsApplied, []);
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

test('exam dates use the date of each cast and preserve the dates of a saved reading', async () => {
 const cast = {...request, primaryId:1, movingLine:3, monthBranch:'酉'};
 const first = await product.getContent({...cast, castingDate:'2026-11-11'});
 const later = await product.getContent({...cast, castingDate:'2026-11-30'});
 const saved = await product.getContent({...cast, castingDate:'2026-11-11', viewDate:'2026-12-03'});
 const fallback = await product.getContent({...cast, timingContext:{castingMethod:'post-heaven',periodMethod:'number'}});
 const windows = result => result.timingSection.windows;
 assert.deepEqual(windows(first)[0].targetBranches, ['戌','亥']);
 assert.deepEqual(windows(first)[0].displayedDates, windows(saved)[0].displayedDates);
 assert.notDeepEqual(windows(first)[0].displayedDates, windows(later)[0].displayedDates);
 assert.ok(windows(later)[0].displayedDates.every(day => day >= '2026-11-30'));
 assert.equal(fallback.status, 'ready');
 assert.equal(windows(fallback).length, 0);
});
