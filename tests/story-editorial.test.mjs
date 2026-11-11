import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {loadLibrary,createQuestionRepository,interpretationArtifactDigest} from '../src/index.js';
import {collectStoryFacts,inspectMovingLine,resolveConflictCase,validateStoryCopy,getStoryCopy,countHan} from '../src/story-editorial.js';
const library=await loadLibrary(),repo=createQuestionRepository({library});
const bundle=JSON.parse(await readFile(new URL('../data/ten-readings-v3.json',import.meta.url),'utf8'));

test('all ten samples bind canonical chart facts, complete moving-line text and one short/long decision',async()=>{
 assert.equal(bundle.items.length,10);assert.equal(bundle.scope.productionApproved,0);
 for(const s of bundle.items){
  const question=await repo.getQuestion(s.selection.questionId);
  const facts=collectStoryFacts({library,question,primaryId:s.facts.primaryId,movingLine:s.facts.movingLine,monthOrder:s.facts.monthOrder});
  assert.deepEqual(facts,s.facts);assert.equal(facts.line.fullText,library.getLineReading(facts.primaryId,facts.movingLine).text);
  assert.equal(s.lineApplication.allDetectedTerms.length,facts.line.terms.length);
  assert.ok(countHan(s.copy.short.text)>=60&&countHan(s.copy.short.text)<=120);
  assert.equal(validateStoryCopy(s).structuralCopyChecks,'passed');
  const rendered=getStoryCopy(s);assert.equal(rendered.productionAllowed,false);assert.equal(rendered.status,'editorial-preview');
  assert.equal(s.copy.short.decisionId,s.copy.long.decisionId);
  const material=structuredClone(s);delete material.artifactDigest;
  assert.equal(await interpretationArtifactDigest(material),s.artifactDigest);
 }
});

test('line inspection retains auspicious, adverse and conditional phrases without cancelling them or scoring words',()=>{
 const a=inspectMovingLine('贞吉，悔亡，无不利；无初有终；先庚三日，后庚三日，吉。');
 assert.deepEqual(a.terms.map(t=>t.term),['贞吉','悔亡','无不利','无初有终','吉']);assert.equal(a.automaticPolarityScore,null);
 for(const t of a.terms)assert.equal(a.fullText.slice(t.start,t.end),t.term);
 assert.deepEqual(inspectMovingLine('浚恒，贞凶，无攸利。').terms.map(t=>t.term),['贞凶','无攸利']);
 assert.deepEqual(inspectMovingLine('需于沙，小有言，终吉。').terms.map(t=>t.term),['终吉']);
});

test('weak final equality and strong final equality produce different explicit case decisions',()=>{
 const weak=bundle.items.find(s=>s.number===4),strong=bundle.items.find(s=>s.number===7);
 assert.equal(resolveConflictCase(weak.facts).outcomeCode,'promotion-unfavoured-this-attempt');
 const p=resolveConflictCase(strong.facts);assert.equal(p.outcomeCode,'contract-favoured-after-obstruction');
 assert.ok(p.conditions.includes('retain-core-terms-and-proper-conduct'));assert.ok(p.counterevidence);assert.equal(p.numericWeights,null);
});

test('a changed season, role strength, question, line text or extra void analysis cannot silently inherit either decision',()=>{
 for(const n of [4,7]){
  const f=bundle.items.find(s=>s.number===n).facts;
  for(const change of [x=>x.version='other',x=>x.monthOrder='summer-fire',x=>x.question_type='marriage_completion',x=>x.nodes[0].qi='旺',x=>x.line.fullText=x.line.fullText.slice(0,3),x=>x.scope.void='applied']){
   const x=structuredClone(f);change(x);assert.equal(resolveConflictCase(x).status,'unresolved');
  }
 }
 assert.equal(resolveConflictCase(bundle.items[0].facts).status,'unresolved');
});

test('mismatched short/long decisions and audit instructions are blocked before display',()=>{
 const s=structuredClone(bundle.items[0]);s.copy.short.decisionId='other';assert.throws(()=>getStoryCopy(s),/same decision/);
 const t=structuredClone(bundle.items[0]);t.copy.long.process+='不能把这些阻力写得过重。';assert.throws(()=>getStoryCopy(t),/Internal audit/);
 const date=structuredClone(bundle.items[0]);date.copy.long.ending+='本月14号成婚。';assert.throws(()=>getStoryCopy(date),/exact dates/);
});

test('item-specific scope and practical loss response remain explicit; symbolic hints do not claim a location',()=>{
 assert.equal(bundle.items[5].selection.questionScope.id,'current-collection-attempt');
 assert.equal(bundle.items[7].selection.questionScope.id,'current-order-terms');
 const wallet=bundle.items[8],phone=bundle.items[9];
 assert.equal(wallet.traditionalSearchHint.provesLocation,false);assert.equal(wallet.traditionalSearchHint.priority,'after-real-world-checks');
 assert.match(wallet.copy.short.text,/锁卡/);assert.match(phone.copy.short.text,/远程锁定/);
 assert.ok(wallet.copy.long.opening.startsWith('先确认钱包内'));assert.ok(phone.copy.long.opening.startsWith('先使用设备'));
});
