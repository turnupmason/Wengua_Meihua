import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createProductRepository, findUpcomingCivilDayMatches, loadLibrary, MONTH_SLOTS, TRIGRAM_PERIOD_SPECS} from '../src/index.js';
import {checkChartFacts} from './helpers/chart-facts.mjs';

const library = await loadLibrary();
const product = createProductRepository({library});
const questionId = 'career.job-stability.layoff';
const probationId = 'career.job-stability.probation';
const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');
const json = async path => JSON.parse(await read(path));
const request = {
 castingDate:'2026-11-29',
 timingScale:'day',
 timingContext:{castingMethod:'pre-heaven',periodMethod:'element-qi'},
};
const branches = {木:['寅','卯'],火:['巳','午'],土:['辰','戌','丑','未'],金:['申','酉'],水:['亥','子']};

test('workplace retains its four precise questions', async () => {
 const questions = await product.listQuestions('career.workplace');
 assert.deepEqual(questions.map(q => q.id), [
  questionId, probationId, 'career.work-relations.leader',
  'career.work-relations.coworker-support',
 ]);
});

for (const [slug, id] of [['workplace-stability',questionId],['workplace-probation',probationId]]) {
test(slug + ' preserves author text, exact sources, layout and live timing for every written month key', async () => {
 const index = await json('data/authored-readings/' + slug + '/index.json');
 const sourceDir = 'sources/editorial/' + slug + '/';
 if (index.next) {
  const {primaryId,movingLine,monthBranches} = index.next;
  const pending = await product.getContent({...request,questionId:id,primaryId,movingLine,monthBranch:monthBranches[0]});
  assert.equal(pending.status,'pending-authoring');
  assert.equal(pending.story,null);
 }
 let months = 0;
 let datedBodies = 0;
 for (const entry of index.files) {
  const shard = await json(entry.path);
  const stem = entry.path.split('/').at(-1).split('.')[0];
  const drafts = await json(sourceDir + stem + '.json');
  const documents = (await read('docs/' + slug + '/' + stem + '.md')).split(/(?=^## )/mu).slice(1);
  assert.equal(shard.rows.length, 30);
  assert.equal(documents.length, 30);
  assert.equal(Object.keys(shard.monthSlots).length, 72);
  for (const [i,row] of shard.rows.entries()) {
   const key = row.decision.id;
   const {title,short,long} = row.copy;
   checkChartFacts(library,row,key);
   assert.equal(row.movingLineText,library.getLineReading(entry.primaryId,row.movingLine).text,key);
   assert.deepEqual([title,short.text,long.opening,long.process,long.ending,long.summary],drafts[i].slice(3,9),key);
   assert.equal(short.decisionId,key);
   assert.equal(long.decisionId,key);
   assert.deepEqual(row.decision.indirectEffectsApplied,[]);
   assert.equal(row.review.independentReview.status,'pending');
   assert.equal(row.review.independentReview.userAcceptedThisVersion,false);
   for (const evidence of row.decision.sourceEvidence) {
    const section = library.getSection(evidence.id);
    assert.ok(section.text.includes(evidence.quote),evidence.id);
    assert.deepEqual(evidence.locator,section.sourceRef);
   }
   const parts = documents[i].split('\n\n');
   assert.equal(parts[3],'简断',key);
   assert.deepEqual(parts.slice(5,12).map(p => p.split('：',1)[0]),[
    '开局','过程','结局','应期','总断','古籍依据','动爻完整原文',
   ],key);
   assert.equal(parts[12],'<details>\n<summary>计算说明</summary>',key);
   assert.ok(row.timingSlots.length <= 1,key);
   const [slot] = row.timingSlots;
   if (slot) {
    const node = row.facts.nodes.find(n => n.role === slot.role);
    if (slot.kind === 'name-body') {
     assert.equal(row.decision.outcomeCode,'favourable',key);
     assert.equal(slot.role,'body',key);
     assert.ok(row.facts.directRelations.every(edge => edge.type !== 'use_controls_body'),key);
     const period = TRIGRAM_PERIOD_SPECS.find(period => period.trigram === node.trigram);
     assert.deepEqual(slot.branches,period.branches,key);
    } else assert.deepEqual(slot.branches,branches[node.element],key);
    assert.ok(parts[8].includes(slot.event),key);
    assert.match(parts[8],/(?:本月|下月)\d+(?:、\d+)*号/u,key);
    datedBodies++;
   } else assert.ok(row.timingOmission.reason,key);
  }
  for (let movingLine = 1; movingLine <= 6; movingLine++) {
   for (const {branch,qi} of MONTH_SLOTS) {
    const row = shard.rows[shard.monthSlots[movingLine + ':' + branch]];
    const result = await product.getContent({...request,questionId:id,primaryId:entry.primaryId,movingLine,monthBranch:branch});
    assert.equal(result.status,'ready');
    assert.equal(result.short,row.copy.short.text);
    assert.equal(result.monthOrder,qi);
    assert.equal(result.calculationExplanation.month.branch,branch);
    assert.equal(result.voidMatch,'not-applied');
    assert.equal(result.calculationExplanation.void,undefined);
    assert.equal(result.timingSection.windows.length,row.timingSlots.length);
    for (const window of result.timingSection.windows) {
     const [slot] = row.timingSlots;
     assert.equal(window.event,slot.event);
     assert.deepEqual(window.targetBranches,slot.branches);
     const expected = findUpcomingCivilDayMatches({castingDate:request.castingDate,branches:slot.branches});
     assert.deepEqual(window.displayedDates,expected.matches.slice(0,2).map(d => d.date));
    }
    months++;
   }
  }
 }
 assert.equal(months,index.baseCaseCount);
 assert.equal(datedBodies,index.dated);
});
}
