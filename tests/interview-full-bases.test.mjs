import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {loadLibrary,createProductRepository,MONTH_SLOTS,assessSeasonalQi,interpretationArtifactDigest} from '../src/index.js';
import {loadInterviewLineLedger,createBaseInterviewReading,decideBaseInterview} from '../sources/editorial/interview-base-authoring.mjs';
import {checkInterviewDecision,checkInterviewShort} from '../src/interview-decision-checks.js';
import {interviewTimingSlots} from '../src/interview-manuscripts.js';
import {resolveManuscriptDates} from '../src/prewritten-manuscripts.js';
const read=async p=>JSON.parse(await readFile(new URL('../'+p,import.meta.url),'utf8'));
const library=await loadLibrary(),product=createProductRepository({library}),question=await product.getQuestion('career.interview.interview-pass');
const index=await read('data/authored-readings/interview-pass/index.json'),files=await Promise.all(index.files.map(f=>read(f.path)));
const ledger=await loadInterviewLineLedger(library),allRows=files.flatMap(f=>f.rows),rows=allRows.filter(r=>r.baseProse);
const cast={castingDate:'2026-11-11',timingScale:'day',timingContext:{castingMethod:'pre-heaven',periodMethod:'element-qi'}};

test('all 64 hexagrams, 384 ordinary moving lines and 4608 month slots have complete prewritten base records',()=>{
 assert.equal(index.baseCaseCount,4608);assert.equal(index.baseVersionCount,1920);assert.equal(index.remainingBaseSlots,0);
 assert.equal(index.authoredVersionCount,allRows.length);
 assert.equal(index.voidScenarioCount,allRows.length-rows.length);
 assert.equal(files.length,64);assert.equal(rows.length,1920);assert.equal(ledger.size,384);
 const seen=new Set(),texts=new Set();
 for(const f of files){
  assert.equal(f.rows.filter(r=>r.baseProse).length,30);assert.equal(Object.keys(f.monthSlots).length,72);
  for(let line=1;line<=6;line++)for(const m of MONTH_SLOTS){
   const r=f.rows[f.monthSlots[`${line}:${m.branch}`]],key=`${f.primaryId}/${line}/${m.branch}`;
   assert.ok(r);assert.equal(r.primaryId,f.primaryId);assert.equal(r.movingLine,line);assert.equal(r.monthOrder,m.qi);
   assert.ok(!seen.has(key));seen.add(key);
  }
  for(const r of f.rows.filter(r=>r.baseProse)){checkInterviewShort(r.copy.short.text);texts.add(r.copy.short.text);assert.ok(r.copy.long.opening&&r.copy.long.process&&r.copy.long.ending&&r.copy.long.summary);}
 }
 assert.equal(seen.size,4608);assert.equal(texts.size,1920);
});

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
   if(rewritten){
    assert.equal(row.authorship.version,row.review.version);
    for(const source of row.decision.sourceEvidence)assert.ok(library.getSection(source.id).text.includes(source.quote));
   }
  }
 }
});

test('all stored timing forms have sourced events and convert a future casting date without reusing demonstration dates',()=>{
 const kinds=new Set();
 for(const row of rows){
  const reading=createBaseInterviewReading({library,question,...cast,castingDate:'2028-03-20',primaryId:row.primaryId,movingLine:row.movingLine,monthOrder:row.monthOrder});
  const slots=interviewTimingSlots(reading,row.timingSlots);slots.forEach(s=>kinds.add(s.kind));
  const rendered=resolveManuscriptDates({paragraphs:slots.map(s=>s.token),dateSlots:slots,reading,...cast,castingDate:'2028-03-20'});
  assert.equal(rendered.status,'resolved');assert.ok(rendered.paragraphs.every(p=>!p.includes('{{date:')));
  for(const window of rendered.dateMatches){assert.ok(window.event&&window.valence&&window.sourceIds.length);assert.ok(window.matches.every(d=>d.date>='2028-03-20'));}
  for(const slot of slots)if(slot.kind==='body-period')assert.ok(!reading.edges.some(e=>e.type==='use_controls_body'));
 }
 assert.ok(kinds.has('body-period'));assert.ok(kinds.has('drain'));assert.ok(kinds.has('support'));assert.ok(kinds.has('control'));
});

test('authored Qian rewrites return a dated stage event only where supported',async()=>{
 const options={questionId:question.id,primaryId:1,castingDate:'2026-11-11'};
 const result=await product.getContent({...options,movingLine:1,monthBranch:'卯'});
 assert.equal(result.status,'ready');
 assert.equal(result.manuscriptVersion,'interview-pass-2.1.0');
 assert.equal(result.monthBranch,'卯');
 assert.equal(result.timingSection.windows.length,0);
 assert.ok(result.calculationExplanation.timing.omission.reason);
 assert.ok(result.review.compilation.manualWholeArticleReview);

 const held=await product.getContent({...cast,...options,movingLine:3,monthBranch:'子'});
 assert.equal(held.status,'ready');
 assert.equal(held.decision.outcomeCode,'pass-with-conditions');
 assert.equal(held.timingSection.windows[0].eventScope,'positive-result-candidate');
 assert.deepEqual(held.timingSection.windows[0].targetBranches,['申','酉']);
 assert.deepEqual(held.timingSection.windows[0].displayedDates,['2026-11-18','2026-11-19']);

 const pressure=await product.getContent({...cast,...options,castingDate:'2026-11-21',movingLine:2,monthBranch:'酉'});
 assert.equal(pressure.status,'ready');
 assert.equal(pressure.decision.outcomeCode,'not-pass-this-round');
 assert.deepEqual(pressure.decision.consistency.controllingRoles,['changed_use']);
 assert.throws(()=>checkInterviewDecision(pressure.reading,{
  outcome:'pass-with-conditions',decisionPolicy:pressure.decision.decisionPolicy,
 }),/无生体而有克体/);
 assert.equal(pressure.timingSection.windows[0].eventScope,'closing-obstruction');
 assert.equal(pressure.timingSection.windows[0].valence,'凶');
 assert.deepEqual(pressure.timingSection.windows[0].targetBranches,['巳','午']);
});

test('authored Tun separates opening support, process obstruction, and closing confirmation',async()=>{
 const input={...cast,castingDate:'2026-12-21',questionId:question.id,primaryId:3};
 const early=await product.getContent({...input,movingLine:5,monthBranch:'午'});
 assert.equal(early.status,'ready');
 assert.equal(early.decision.outcomeCode,'not-pass-this-round');
 assert.equal(early.timingSection.windows[0].eventScope,'process-repair');
 assert.equal(early.timingSection.windows[0].calculationBasis.stage,'opening');
 assert.deepEqual(early.timingSection.windows[0].calculationBasis.ruleIds,['good-event']);
 assert.ok(!early.timingSection.windows[0].sourceIds.includes('mh-071'));
 assert.deepEqual(early.timingSection.windows[0].targetBranches,['亥','子']);

 const mid=await product.getContent({...input,movingLine:3,monthBranch:'卯'});
 assert.equal(mid.status,'ready');
 assert.equal(mid.timingSection.windows[0].eventScope,'process-obstruction');
 assert.equal(mid.timingSection.windows[0].calculationBasis.role,'body_mutual');
 assert.equal(mid.timingSection.windows[0].calculationBasis.stage,'process');

 const late=await product.getContent({...input,movingLine:4,monthBranch:'子'});
 assert.equal(late.status,'ready');
 assert.equal(late.decision.outcomeCode,'pass-with-conditions');
 assert.equal(late.timingSection.windows[0].eventScope,'closing-obstruction');
 assert.equal(late.timingSection.windows[0].calculationBasis.stage,'closing');
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

test('a reduced mutual trigram with no exact manuscript withholds story and timing',async()=>{
 const out=await product.getContent({...cast,questionId:question.id,primaryId:3,movingLine:1,monthBranch:'亥',castingDate:'2026-11-26'});
 assert.equal(out.reading.nodes.find(n=>n.role==='body_mutual').void.effective,'reduced');
 assert.equal(out.status,'pending-authoring');
 assert.equal(out.story,null);
 assert.deepEqual(out.paragraphs,[]);
 assert.equal(out.timingSection,undefined);
});

test('the ten corrected Tun line quotations point to the collated text and retain the upload reference',async()=>{
 const source=await readFile(new URL('../sources/revised/yijing64.txt',import.meta.url),'utf8');
 const patches=await read('data/editorial-patches.json');
 const corrected=rows.filter(r=>r.primaryId===3&&[2,3].includes(r.movingLine));
 assert.equal(corrected.length,10);
 for(const row of corrected){
  const line=row.facts.movingLine;
  const ref=line.sourceRef;
  assert.equal(ref.sourceId,'collated-yijing64');
  assert.equal([...source].slice(ref.startChar,ref.endChar).join(''),`${line.label}，${row.movingLineText}`);
  assert.equal(source.split('\n')[ref.startLine-1],`${line.label}，${row.movingLineText}`);
  assert.equal(line.originalSourceRef.sourceId,'user-yijing64');
  assert.ok(patches.some(p=>p.id===line.patchId&&p.recordId===`hex-03-line-${row.movingLine}`));
 }
});
