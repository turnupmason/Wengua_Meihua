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
const petClassicalLines=(await read('sources/revised/meihua-volumes-1-3.txt')).split('\n');
const branches = {木:['寅','卯'],火:['巳','午'],土:['辰','戌','丑','未'],金:['申','酉'],水:['亥','子']};

test('职场情况 asks about stability; 能否转正 is its own entry (2026-11-14)', async () => {
 const workplace = await product.listQuestions('career.workplace');
 assert.deepEqual(workplace.map(q => q.id), [questionId, 'career.work-relations.coworker-support']);
 // 能否转正 reads the probation library; the two project questions it replaced are kept, archived.
 const probation = await product.listQuestions('career.probation');
 assert.deepEqual(probation.filter(q => !q.archived).map(q => q.id), [probationId]);
});

for (const [slug, id] of [
 ['workplace-stability',questionId],
 ['new-relationship-opportunity','relationships.new-partner.opportunity'],
 ['confession-decision','relationships.confession.decision'],
 ['relationship-establishment','relationships.developing.relationship'],
 ['relationship-reconciliation','relationships.reconciliation.reconcile'],
 ['lost-object-recovery','search.lost-object.recovery'],
 ['lost-pet-recovery','search.pets.recovery'],
]) {
test(slug + ' preserves author text, exact sources, layout and live timing for every written month key', async () => {
 const index = await json('data/authored-readings/' + slug + '/index.json');
 const sourceDir = 'sources/editorial/' + slug + '/';
 const context = slug === 'lost-object-recovery' ? {context:{objectKind:'other'}} : {};
 if (index.next) {
  const {primaryId,movingLine,monthBranches} = index.next;
  const pending = await product.getContent({...request,questionId:id,primaryId,movingLine,monthBranch:monthBranches[0],...context});
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
   const expectedCopy = drafts[i].slice(3,9);
   if(slug==='lost-pet-recovery'){
    const cases=await json(sourceDir+'cases/'+stem+'.json');
    const petCase=cases.entries.find(item=>item.movingLine===row.movingLine);
    assert.equal(row.petApplication.application,petCase.application,key);
    assert.equal(row.ruleVersions.scope,'pet-search-modern-analogy-1.0.0',key);
    assert.equal(row.petApplication.ruleVersion,row.ruleVersions.scope,key);
    assert.equal(row.petApplication.actualLocationVerified,false,key);
    assert.equal(row.petApplication.actualPetIdentityVerified,false,key);
    assert.equal(row.petApplication.healthOrFateInferred,false,key);
    assert.ok(row.authorship.wholeArticleReadReceipt.sourceSha256,key);
    assert.ok(!row.sourceIds.includes('mh-077'),key);
    assert.equal(row.decision.questionScope,'search-and-safe-reunion-with-a-specific-lost-pet',key);
    for(const n of petCase.nodes)assert.equal(row.facts.nodes.find(f=>f.role===n.role).trigram,n.trigram,key);
   }
   if (slug === 'lost-object-recovery') {
    const directionBatch = await json(sourceDir + 'directions/' + stem + '.json');
    const direction = directionBatch.entries.find(entry => entry.movingLine === row.movingLine);
    assert.equal(row.locationApplication.trigram,row.facts.nodes.find(node => node.role === 'changed_use').trigram,key);
    assert.equal(row.locationApplication.text,direction.text,key);
    assert.equal(row.locationApplication.realWorldLocationVerified,false,key);
    const images = await json(sourceDir + 'images/' + stem + '.json');
    const image = images.entries.find(entry => entry.movingLine === row.movingLine);
    assert.equal(row.imageApplication.objectTrigram,row.facts.nodes.find(node => node.role === 'use').trigram,key);
    assert.equal(row.imageApplication.environmentTrigram,row.locationApplication.trigram,key);
    assert.equal(row.imageApplication.text,image.text,key);
    assert.equal(row.imageApplication.actualFeaturesVerified,false,key);
    expectedCopy[4] += ' ' + direction.text + ' ' + image.text;
   }
   assert.deepEqual([title,short.text,long.opening,long.process,long.ending,long.summary],expectedCopy,key);
   assert.equal(short.decisionId,key);
   assert.equal(long.decisionId,key);
   assert.deepEqual(row.decision.indirectEffectsApplied,[]);
   assert.equal(row.review.independentReview.status,'pending');
   assert.equal(row.review.independentReview.userAcceptedThisVersion,false);
   for (const evidence of row.decision.sourceEvidence) {
    const section = library.getSection(evidence.id);
    assert.ok(section.text.includes(evidence.quote),evidence.id);
    assert.deepEqual(evidence.locator,section.sourceRef);
    if(slug==='lost-pet-recovery'){
     const startLine=section.sourceRef.startLine+section.text.slice(0,section.text.indexOf(evidence.quote)).split('\n').length-1;
     assert.deepEqual(evidence.quoteLocator,{sourceId:section.sourceRef.sourceId,startLine,endLine:startLine+evidence.quote.split('\n').length-1},key);
     assert.equal(evidence.quoteLocator.sourceId,'user-meihua',key);
     assert.ok(petClassicalLines.slice(evidence.quoteLocator.startLine-1,evidence.quoteLocator.endLine).join('\n').includes(evidence.quote),key+' exact raw source lines');
    }
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
    if (slot.kind === 'name-support' || slot.kind === 'name-body') {
     assert.equal(slot.stage,'closing',key);
     assert.equal(slot.eventScope,'positive-result-candidate',key);
    }
    if (slot.kind === 'name-body') {
     assert.equal(row.decision.outcomeCode,'favourable',key);
     assert.equal(slot.role,'body',key);
     assert.ok(row.facts.directRelations.every(edge => edge.type !== 'use_controls_body'),key);
     const period = TRIGRAM_PERIOD_SPECS.find(period => period.trigram === node.trigram);
     assert.deepEqual(slot.branches,period.branches,key);
    } else if (slot.method === 'trigram-periods') {
     assert.equal(slot.kind,'name-support',key);
     const period = TRIGRAM_PERIOD_SPECS.find(item => item.trigram === node.trigram);
     assert.deepEqual(slot.branches,period.branches,key);
     assert.equal(drafts[i][10][0][5],'trigram-periods',key);
     assert.ok(row.decision.sourceEvidence.some(item => item.id === 'mh-116' && item.quote.includes('八卦时序')),key);
    } else assert.deepEqual(slot.branches,branches[node.element],key);
    assert.ok(parts[8].includes(slot.event),key);
    assert.match(parts[8],/(?:本月|下月)\d+(?:、\d+)*号/u,key);
    if (slug === 'lost-object-recovery') {
     assert.equal((parts[8].match(/属[吉凶耗]应/gu) ?? []).length,1,key);
    }
    datedBodies++;
   } else assert.ok(row.timingOmission.reason,key);
  }
  for (let movingLine = 1; movingLine <= 6; movingLine++) {
   for (const {branch,qi} of MONTH_SLOTS) {
    const row = shard.rows[shard.monthSlots[movingLine + ':' + branch]];
    const result = await product.getContent({...request,questionId:id,primaryId:entry.primaryId,movingLine,monthBranch:branch,...context});
    assert.equal(result.status,'ready');
    assert.equal(result.short,row.copy.short.text);
    assert.equal(result.monthOrder,qi);
    assert.equal(result.calculationExplanation.month.branch,branch);
    assert.equal(result.voidMatch,'not-applied');
    if (slug === 'lost-object-recovery') {
     assert.ok(result.narrativeParagraphs[2].includes(row.locationApplication.text),row.decision.id);
     assert.ok(result.narrativeParagraphs[2].endsWith(row.imageApplication.text),row.decision.id);
     assert.deepEqual(result.calculationExplanation.images,row.imageApplication,row.decision.id);
     assert.deepEqual(result.calculationExplanation.location,row.locationApplication,row.decision.id);
    }
    if(slug==='lost-pet-recovery') assert.deepEqual(result.calculationExplanation.pet,row.petApplication,row.decision.id);
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
