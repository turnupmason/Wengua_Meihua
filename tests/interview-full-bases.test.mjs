// 面试问项 2026-11-18 起改为 interview-pass-3.0.0（考试定稿口径，见 docs/review/INTERVIEW_REJUDGE_20261118.md），空亡旧版只留档；
// 依赖旧版空亡正文与旧结论码的用例已移除，新版覆盖见 tests/interview-pass.test.mjs。
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {loadLibrary,createProductRepository,MONTH_SLOTS,assessSeasonalQi,interpretationArtifactDigest} from '../src/index.js';
import {loadInterviewLineLedger,createBaseInterviewReading,decideBaseInterview} from '../sources/editorial/interview-base-authoring.mjs';
import {checkInterviewDecision,checkInterviewShort} from '../src/interview-decision-checks.js';
import {interviewTimingSlots} from '../src/interview-manuscripts.js';
import {resolveManuscriptDates} from '../src/prewritten-manuscripts.js';
const read=async p=>JSON.parse(await readFile(new URL('../'+p,import.meta.url),'utf8'));
const library=await loadLibrary(),product=createProductRepository({library,includeHistoricalInterviewVoid:true}),question=await product.getQuestion('career.interview.interview-pass');
const currentProduct=createProductRepository({library});
const index=await read('data/authored-readings/interview-pass/index.json'),files=await Promise.all(index.files.map(f=>read(f.path)));
const ledger=await loadInterviewLineLedger(library),allRows=files.flatMap(f=>f.rows),rows=allRows.filter(r=>r.baseProse);
const cast={castingDate:'2026-11-11',timingScale:'day',timingContext:{castingMethod:'pre-heaven',periodMethod:'element-qi'}};

test('every full-base record independently binds canonical geometry, all five-state qi, exact moving text and digest',async()=>{
 for(const row of rows){
  const reading=createBaseInterviewReading({library,question,...cast,primaryId:row.primaryId,movingLine:row.movingLine,monthOrder:row.monthOrder});
  assert.deepEqual(row.stageIds,Object.values(reading.stages).map(s=>s.id));
  assert.equal(row.movingLineText,library.getLineReading(row.primaryId,row.movingLine).text);
  for(const n of row.facts.nodes)assert.equal(n.qi,assessSeasonalQi(n.element,row.monthOrder).state);
  assert.deepEqual(row.facts.directRelations,reading.edges.map(e=>({role:e.targetRole,type:e.type})));
  const material=structuredClone(row);delete material.artifactDigest;assert.equal(await interpretationArtifactDigest(material),row.artifactDigest);
  assert.equal(row.copy.short.decisionId,row.copy.long.decisionId);assert.equal(row.review.independentReview.status,'pending');
  checkInterviewDecision(reading,{outcome:row.decision.outcomeCode,counterevidence:row.counterevidence,decisionPolicy:row.decision.decisionPolicy});
  if(row.baseNoVoid){
   assert.equal(row.voidProfileKey,'base-no-void');assert.ok(row.lineApplication.sourcePath);
   const rewritten=row.authorship.method==='individually-rewritten-and-reviewed';
   assert.equal(row.authorship.manualWholeArticleReview,rewritten);
  }
  assert.equal(row.authorship.version,row.review.version);
  assert.equal(row.lineApplication.evidence[0],row.movingLineText);
  assert.ok(row.decision.sourceEvidence.length);
  for(const source of row.decision.sourceEvidence){
   const section=library.getSection(source.id);
   assert.ok(section.text.includes(source.quote));
   assert.deepEqual(source.locator,section.sourceRef);
  }
 }
});

test('different seasonal strength can change a verdict without ignoring weak end control or confusing mixed line clauses',()=>{
 const r=monthOrder=>createBaseInterviewReading({library,question,...cast,primaryId:1,movingLine:5,monthOrder});
 assert.match(decideBaseInterview(r('autumn-metal'),ledger.get('1/5')).outcome,/^pass/);
 assert.equal(decideBaseInterview(r('summer-fire'),ledger.get('1/5')).outcome,'not-pass-this-round');
 assert.equal(ledger.get('64/3').type,'C');assert.equal(ledger.get('49/3').type,'C');
 for(const monthOrder of ['summer-fire','seasonal-earth']){
  const reading=createBaseInterviewReading({library,question,...cast,primaryId:27,movingLine:2,monthOrder});
  assert.equal(decideBaseInterview(reading,ledger.get('27/2')).outcome,'not-pass-this-round');
 }
});

test('every base key has at least one eligible manuscript, preferring exact matches',async()=>{
 const dates=['2026-11-11','2026-11-21','2026-12-01','2026-12-11','2026-12-21','2026-12-31'];
 const missing=[];let ready=0;
 for(const row of rows){
  let found=false;
  for(const castingDate of dates){
   const out=await product.getContent({questionId:question.id,...cast,castingDate,primaryId:row.primaryId,movingLine:row.movingLine,monthBranch:row.monthBranches[0]});
   if(out.status==='ready'){
    const matched=out.voidMatch==='recorded-context'
     ?allRows.find(r=>r.decision.id===out.decision.id)
     :row;
    assert.ok(matched);assert.equal(out.short,matched.copy.short.text);assert.equal(out.decision.outcomeCode,matched.decision.outcomeCode);
    assert.ok(out.timingSection.windows.every(w=>w.displayedDates.every(d=>d>=castingDate)));found=true;ready++;break;
   }
   assert.equal(out.status,'pending-authoring');
  }
  if(!found)missing.push(`${row.primaryId}/${row.movingLine}/${row.monthOrder}`);
 }
 assert.deepEqual(missing,[]);assert.equal(ready,1920);
});
