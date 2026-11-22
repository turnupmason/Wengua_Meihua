import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {loadLibrary,createProductRepository,findUpcomingCivilDayMatches} from '../src/index.js';
import {inspectContactLiteraryBatch} from '../scripts/review/check-missing-contact-literary-20261121.mjs';

const root=new URL('../',import.meta.url);
const read=p=>readFile(new URL(p,root),'utf8');
const json=async p=>JSON.parse(await read(p));
const digest=t=>createHash('sha256').update(t).digest('hex');
const library=await loadLibrary();
const product=createProductRepository({library});
const id='search.missing-contact.contact';
const context={timingScale:'day',timingContext:{castingMethod:'pre-heaven',periodMethod:'element-qi'}};

test('恢复联系 preserves distinct scope, source-applicability records and actual full-read receipts',async()=>{
 const index=await json('data/authored-readings/missing-contact/index.json');
 let articles=0,keys=0,questions=0,questionKeys=0,polished=0,polishedKeys=0;
 for(const file of index.files){
  const name=file.path.split('/').at(-1);
  const source='sources/editorial/missing-contact/';
  const drafts=await json(source+name);
  const cases=await json(source+'cases/'+name);
  const receipt=await json(source+'reviews/'+name);
  const shard=await json(file.path);
  assert.equal(receipt.sourceSha256,digest(await read(source+name)));
  assert.equal(receipt.casesSha256,digest(await read(source+'cases/'+name)));
  assert.equal(receipt.fullArticlesRead,30);
  assert.equal(receipt.entries.length,30);
  assert.equal(receipt.actor,'assistant-author');
  assert.equal(receipt.independentProfessionalReview,'pending');
  for(const [i,row]of shard.rows.entries()){
   const key=row.decision.id;
   const c=cases.entries.find(c=>c.movingLine===row.movingLine);
   assert.equal(receipt.entries[i].copySha256,digest(JSON.stringify(drafts[i])),key);
   assert.ok(receipt.entries[i].reviewFinding,key);
   assert.equal(row.decision.questionScope,'verified-two-way-contact-with-a-specific-out-of-contact-person',key);
   assert.equal(row.ruleVersions.scope,'missing-contact-modern-analogy-1.0.0',key);
   assert.equal(row.authorship.wholeArticleReadReceipt.sourceSha256,receipt.sourceSha256,key);
   if(receipt.extraLiteraryPolish===true){
    const literary=row.authorship.literaryPolish;
    assert.equal(literary.campaign,'missing-contact-literary-v1-20261121',key);
    assert.equal(literary.copySha256,digest(JSON.stringify(drafts[i])),key);
    assert.equal(literary.authorAgent,receipt.authorAgent,key);
    assert.notEqual(literary.authorAgent,literary.peerAgent,key);
    assert.equal(literary.reviewerIsHuman,false,key);
    const bodyHan=drafts[i].slice(5,9).join('').match(/\p{Script=Han}/gu)?.length??0;
    assert.equal(literary.bodyHan,bodyHan,key);
    assert.ok(bodyHan>=470,key);
    polished++;polishedKeys+=row.monthBranches.length;
   }else{
    assert.equal(row.authorship.literaryPolish,undefined,key);
   }
   assert.ok(['mh-075','mh-076','mh-077'].every(id=>!row.sourceIds.includes(id)),key);
   assert.equal(row.contactApplication.personLocationInferred,false,key);
   assert.equal(row.contactApplication.healthOrFateInferred,false,key);
   assert.equal(row.contactApplication.privateIntentInferred,false,key);
   assert.equal(row.contactApplication.returnHomeInferred,false,key);
   assert.equal(row.contactApplication.application,c.application,key);
   const questionsForMonth=(c.judgmentTensions??[]).filter(item=>item.monthOrders.includes(row.monthOrder));
   assert.deepEqual(row.contactApplication.judgmentTensions,questionsForMonth,key);
   if(questionsForMonth.length){questions++;questionKeys+=row.monthBranches.length;}
   for(const n of c.nodes)assert.equal(row.facts.nodes.find(f=>f.role===n.role).trigram,n.trigram,key);
   assert.ok((await read(c.lineCommentary.sourcePath)).includes(c.lineCommentary.quote),key);
   assert.ok(c.lineCommentary.locator&&c.lineCommentary.application,key);
   for(const source of c.lineCommentary.parallelReadings??[])assert.ok((await read(source.sourcePath)).includes(source.quote),key+' parallel commentary');
   for(const e of row.decision.sourceEvidence){
    const s=library.getSection(e.id);
    const line=s.sourceRef.startLine+s.text.slice(0,s.text.indexOf(e.quote)).split('\n').length-1;
    assert.equal(e.quoteLocator.startLine,line,key);
    assert.ok((await read('sources/revised/meihua-volumes-1-3.txt')).split('\n').slice(line-1,e.quoteLocator.endLine).join('\n').includes(e.quote),key);
   }
   for(const t of row.timingSlots){
    assert.ok(['support','control','equal'].includes(t.kind),key);
    assert.equal(t.scale,'day',key);
    assert.ok(!/归家|归来|安全|生死|死亡|所在地/u.test(t.event),key);
    assert.equal(t.calculationBasis.independentInterpretationReview,'pending',key);
   }
   articles++;keys+=row.monthBranches.length;
  }
 }
 assert.equal(articles,index.authorWholeArticleReviewed);
 assert.equal(keys,index.baseCaseCount);
 assert.equal(index.literaryPolish.required,true);
 assert.equal(index.literaryPolish.completed,polished);
 assert.equal(index.literaryPolish.monthKeyCount,polishedKeys);
 assert.equal(index.literaryPolish.remaining,articles-polished);
 assert.equal(index.literaryPolish.status,polished===articles?'completed':'in-progress');
 assert.equal(index.specificApplicationQuestions.articles,questions);
 assert.equal(index.specificApplicationQuestions.monthKeys,questionKeys);
 const plan=await json('data/product-authoring-plan.json');
 assert.equal(plan.items.find(q=>q.questionId===id).contentStatus,index.remainingBaseSlots?'writing-in-progress':'base-coverage-complete;classical-body-use');
 assert.equal(plan.currentAuthoring.questionId,id);
 assert.equal(plan.currentAuthoring.baseCasesWritten,index.baseCaseCount);
 assert.equal(plan.currentAuthoring.authorWholeArticleReviewed,articles);
});

test('contact dates follow each casting date and never advance a saved historical chart',async()=>{
 const index=await json('data/authored-readings/missing-contact/index.json');
 const shard=await json(index.files[0].path);
 const row=shard.rows.find(r=>r.timingSlots.length);
 assert.ok(row);
 const slot=row.timingSlots[0];
 for(const date of ['2026-11-19','2026-11-29','2026-11-30','2026-12-01']){
  const options={...context,questionId:id,primaryId:row.primaryId,movingLine:row.movingLine,monthBranch:row.monthBranches[0],castingDate:date};
  const result=await product.getContent(options);
  const saved=await product.getContent({...options,viewDate:'2027-01-01'});
  const dates=findUpcomingCivilDayMatches({castingDate:date,branches:slot.branches}).matches.slice(0,2).map(d=>d.date);
  assert.deepEqual(result.timingSection.windows[0].displayedDates,dates);
  assert.deepEqual(saved.timingSection.windows[0].displayedDates,dates);
  assert.ok(dates.length<=2&&dates.every(d=>d>=date));
  assert.equal(result.calculationExplanation.void,undefined);
 }
});

test('revised Yi line readings and punctuation apply across all twelve month keys',async()=>{
 const cases=[
  {primaryId:18,movingLine:1,adopted:'干父之蛊，有子，考无咎，厉终吉。',archive:/有子考，无咎/u,outcomes:Array(5).fill('difficult'),notes:/周易正义.*伊川易传.*周易本义/u},
  {primaryId:24,movingLine:6,adopted:'迷复，凶，有灾眚。用行师，终有大败。以其国君凶，至于十年不克征。',archive:/以其国，君凶/u,outcomes:Array(5).fill('difficult'),notes:/孔疏训以为用.*朱本义训以为及/u},
  {primaryId:41,movingLine:6,adopted:'弗损，益之，无咎，贞吉，利有攸往。得臣无家。',archive:/贞吉，有攸往/u,outcomes:['conditional','conditional','favourable','conditional','favourable'],notes:/伊川易传.*周易本义.*同有「利」字/u},
  {primaryId:62,movingLine:4,adopted:'无咎，弗过遇之，往厉必戒，勿用永贞。',archive:/勿用，永贞/u,outcomes:['difficult','conditional','conditional','difficult','conditional'],notes:/姚舜牧.*分读/u},
  {primaryId:64,movingLine:3,adopted:undefined,archive:/利涉大川/u,outcomes:['conditional','conditional','difficult','difficult','conditional'],notes:/简58.*脱「不」/u},
 ];
 for(const {primaryId,movingLine,adopted,archive,outcomes,notes} of cases){
  const stem='hex-'+String(primaryId).padStart(3,'0');
  const shard=await json('data/authored-readings/missing-contact/'+stem+'.json');
  const doc=await read('docs/missing-contact/'+stem+'.md');
  const rows=shard.rows.filter(row=>row.movingLine===movingLine);
  assert.deepEqual(rows.map(row=>row.decision.outcomeCode),outcomes);
  assert.equal(new Set(rows.flatMap(row=>row.monthBranches)).size,12);
  for(const row of rows){
   const canonical=row.contactApplication.lineCommentary;
   assert.match(canonical.versionDifference,notes);
   assert.ok(doc.includes('动爻完整原文：'+row.movingLineText));
   assert.ok(doc.includes(canonical.versionDifference));
   if(adopted){
    assert.equal(row.facts.movingLine.referenceUrl,canonical.referenceUrl);
    const witness=row.facts.movingLine.adoptedTextFrom??row.facts.movingLine.adoptedPunctuationFrom;
    assert.equal(witness.sourcePath,canonical.sourcePath);
   }
   for(const monthBranch of row.monthBranches){
    for(const castingDate of ['2026-11-19','2026-11-30']){
     const content=await product.getContent({...context,questionId:id,primaryId,movingLine,monthBranch,castingDate});
     assert.equal(content.status,'ready');
     assert.equal(content.monthBranch,monthBranch);
     assert.equal(content.movingLineText,adopted);
     assert.equal(content.movingLineText??content.reading.selectedMovingLine.text,row.movingLineText);
     assert.equal(row.facts.movingLine.fullText,row.movingLineText);
     assert.equal(row.lineApplication.evidence[0],row.movingLineText);
     assert.equal(content.calculationExplanation.void,undefined);
     assert.match(content.reading.selectedMovingLine.text,archive);
     const expectedDates=row.timingSlots.map(slot=>findUpcomingCivilDayMatches({castingDate,branches:slot.branches}).matches.slice(0,2).map(day=>day.date));
     assert.deepEqual(content.timingSection.windows.map(window=>window.displayedDates),expectedDates);
    }
   }
  }
 }
});

test('现实寻人线索 remains a guidance entry without a second predictive chart library',async()=>{
 const q=await product.getContent({questionId:'search.person-leads.guidance'});
 assert.equal(q.status,'guidance');
 assert.equal(q.predictionAllowed,false);
 assert.equal(q.provesLocation,false);
 assert.ok(q.guidanceParagraphs?.length||q.paragraphs?.length);
 assert.ok(!q.reading);
});

test('remaining contact tensions have a traceable author recheck and matching revisions',async()=>{
 const directory='sources/editorial/missing-contact/';
 const ledger=await json(directory+'recheck/judgments.json');
 const edits=await json(directory+'recheck/edits.json');
 const laterEdits=[...await json(directory+'recheck/application-edits.json'),...await json(directory+'recheck/application-20-edits.json'),...await json(directory+'recheck/application-10-edits.json')];
 const lineRechecks=[...((await json(directory+'recheck/application-20-recheck.json')).records),...((await json(directory+'recheck/application-10-recheck.json')).records)];
 const laterLineText=new Map(lineRechecks.map(record=>[record.primaryId+':'+record.movingLine,record.lineText]));
 const laterOutcomes=new Map(laterEdits.map(edit=>[edit.primaryId+':'+edit.movingLine+':'+edit.monthOrder,edit.after[2]]));
 const study=await json(directory+'source-study.json');
 const keys=new Set(ledger.priorLineCollationsExcluded);
 const entries=new Map();
 let caseTensions=0,articles=0,monthKeys=0;
 for(let primaryId=1;primaryId<=64;primaryId++){
  const stem='hex-'+String(primaryId).padStart(3,'0');
  const cases=await json(directory+'cases/'+stem+'.json');
  const shard=await json('data/authored-readings/missing-contact/'+stem+'.json');
  for(const source of cases.entries){
   const key=primaryId+':'+source.movingLine;
   if(keys.has(key)||!source.judgmentTensions?.length)continue;
   const named=shard.rows.filter(row=>row.movingLine===source.movingLine&&source.judgmentTensions.some(t=>t.monthOrders.includes(row.monthOrder)));
   entries.set(key,named);
   caseTensions+=source.judgmentTensions.length;
   articles+=named.length;
   monthKeys+=named.reduce((n,row)=>n+row.monthBranches.length,0);
  }
 }
 assert.equal(ledger.records.length,entries.size);
 assert.equal(ledger.totals.lines,entries.size);
 assert.equal(ledger.totals.caseTensions,caseTensions);
 assert.equal(ledger.totals.articles,articles);
 assert.equal(ledger.totals.monthKeys,monthKeys);
 assert.deepEqual(study.judgmentRecheck.totals,ledger.totals);
 assert.equal(ledger.independentProfessionalReview,'pending');
 assert.equal(ledger.sourceCollations.length,study.unresolved.filter(x=>x.status==='source-collation-pending').length);
 for(const record of ledger.records){
  const key=record.primaryId+':'+record.movingLine;
  const rows=entries.get(key);
  assert.ok(rows?.length&&!keys.has(key)&&record.reason&&record.sources.length,key);
  keys.add(key);
  const current=record.monthlyDecisions.map(month=>({...month,outcome:laterOutcomes.get(key+':'+month.order)??month.outcome}));
  assert.deepEqual(current,rows.map(row=>({order:row.monthOrder,branches:row.monthBranches,outcome:row.decision.outcomeCode})),key);
  assert.equal(laterLineText.get(key)??record.lineText,rows[0].movingLineText,key);
  for(const source of record.sources)assert.ok(source.startLine>=1&&source.endLine>=source.startLine,key);
 }
 assert.equal(edits.length,ledger.totals.editedArticles);
 const changed=edits.filter(edit=>edit.before[2]!==edit.after[2]);
 assert.deepEqual(changed.map(edit=>[edit.primaryId,edit.movingLine,edit.monthOrder]),[
  [11,6,'autumn-metal'],[11,6,'seasonal-earth'],[51,4,'spring-wood'],[51,4,'winter-water'],
 ]);
 assert.equal(changed.length,ledger.totals.changedOutcomes);
 for(const edit of edits){
  const row=entries.get(edit.primaryId+':'+edit.movingLine).find(r=>r.monthOrder===edit.monthOrder);
  assert.equal(digest(JSON.stringify(edit.after)),edit.contentSha256);
  assert.equal(row.decision.outcomeCode,edit.after[2]);
  assert.equal(row.copy.long.ending,edit.after[7]);
  if(Array.isArray(edit.before[10]))assert.deepEqual(edit.before[10],edit.after[10]);
  else assert.ok(row.timingOmission?.reason&&row.timingSlots.length===0);
 }
});

test('contact follow-up checks each outstanding application case and preserves its stage windows',async()=>{
 const source='sources/editorial/missing-contact/';
 const prior=await json(source+'recheck/judgments.json');
 const followup=await json(source+'recheck/application-followup.json');
 const edited=await json(source+'recheck/application-edits.json');
 const latestEdits=[...await json(source+'recheck/application-20-edits.json'),...await json(source+'recheck/application-10-edits.json')];
 const latestOutcomes=new Map(latestEdits.map(e=>[e.primaryId+':'+e.movingLine+':'+e.monthOrder,e.after[2]]));
 const study=await json(source+'source-study.json');
 const key=row=>row.primaryId+':'+row.movingLine;
 const pending=prior.records.filter(row=>row.status==='application-still-open');
 assert.deepEqual(followup.records.map(key).sort(),pending.map(key).sort());
 assert.deepEqual(followup.records.slice(0,2).map(key),['55:6','60:5']);
 assert.deepEqual(study.modernApplicationFollowup.totals,followup.totals);
 assert.equal(followup.independentProfessionalReview,'pending');
 assert.equal(followup.independentTimingInterpretationReview,'pending');
 let articles=0,months=0;
 for(const row of followup.records){
  assert.equal(new Set(row.sources.map(e=>e.author)).size,3,key(row));
  assert.ok(row.reason&&row.priorIssue,key(row));
  const baseline=pending.find(e=>key(e)===key(row));
  assert.deepEqual(row.monthlyDecisions.map(m=>({order:m.order,branches:m.branches,outcome:m.priorOutcome})),baseline.monthlyDecisions,key(row));
  const shard=await json('data/authored-readings/missing-contact/'+row.caseSource.split('/').at(-1));
  for(const month of row.monthlyDecisions){
   const current=shard.rows.find(e=>e.movingLine===row.movingLine&&e.monthOrder===month.order);
   assert.equal(current.decision.outcomeCode,latestOutcomes.get(key(row)+':'+month.order)??month.outcome,key(row));
   assert.deepEqual(current.facts.nodes.filter(n=>n.role!=='body_inherited').map(({role,trigram,qi})=>({role,trigram,qi})),month.states,key(row));
   assert.deepEqual(current.facts.directRelations,row.chart.relations,key(row));
   articles++;
   months+=month.branches.length;
  }
 }
 assert.equal(articles,followup.totals.articles);
 assert.equal(months,followup.totals.monthKeys);
 assert.deepEqual(edited.map(row=>key(row)+':'+row.monthOrder),[
  '55:6:spring-wood','55:6:summer-fire','60:5:summer-fire','3:6:spring-wood',
  '3:6:winter-water','51:6:winter-water','62:2:spring-wood','62:2:winter-water',
 ]);
 for(const edit of edited){
  const record=followup.records.find(row=>key(row)===key(edit));
  const month=record.monthlyDecisions.find(row=>row.order===edit.monthOrder);
  const filename=record.caseSource.split('/').at(-1);
  const drafts=await json(source+filename);
  const receipt=await json(source+'reviews/'+filename);
  if(receipt.extraLiteraryPolish===true){
   // The historical edit remains exact in the archived source. Its successor
   // must have final author/peer receipts and identical outcome and full timing.
   const baseline=await json(source+'literary-baseline-20261121/'+filename);
   assert.deepEqual(baseline.find(r=>r[0]===edit.movingLine&&r[1]===edit.monthOrder),edit.after);
   const checked=await inspectContactLiteraryBatch({root,primaryId:edit.primaryId,drafts,authorReview:receipt});
   assert.ok(checked?.bindings.length===30);
  }else{
   assert.deepEqual(drafts.find(r=>r[0]===edit.movingLine&&r[1]===edit.monthOrder),edit.after);
  }
  assert.equal(digest(JSON.stringify(edit.after)),edit.contentSha256);
  assert.equal(edit.before[2],month.priorOutcome);
  assert.equal(edit.after[2],month.outcome);
  const oldTiming=edit.before[10],newTiming=edit.after[10];
  if(Array.isArray(oldTiming))assert.deepEqual(oldTiming.map(slot=>slot.slice(0,4)),newTiming.map(slot=>slot.slice(0,4)));
  else assert.equal(typeof newTiming,'string');
  for(const monthBranch of month.branches){
   const options={...context,questionId:id,primaryId:edit.primaryId,movingLine:edit.movingLine,monthBranch,castingDate:'2026-11-30'};
   const result=await product.getContent(options);
   const historical=await product.getContent({...options,viewDate:'2027-01-01'});
   assert.equal(result.status,'ready');
   assert.equal(result.decision.outcomeCode,month.outcome);
   assert.equal(result.calculationExplanation.void,undefined);
   assert.equal(result.timingSection.castingDate,historical.timingSection.castingDate);
   const windowDates=({event,displayedDates})=>({event,displayedDates});
   assert.deepEqual(result.timingSection.windows.map(windowDates),historical.timingSection.windows.map(windowDates));
   assert.equal(result.timingSection.windows.length,Array.isArray(newTiming)?newTiming.length:0);
   assert.ok(result.timingSection.windows.every(w=>w.displayedDates.length<=2&&w.displayedDates.every(d=>d>=options.castingDate)));
  }
 }
});

test('twenty historical contact disputes record their sources, manuscript changes and dynamic windows',async()=>{
 const base='sources/editorial/missing-contact/';
 const prior=await json(base+'recheck/application-followup.json');
 const ledger=await json(base+'recheck/application-20-recheck.json');
 const edits=await json(base+'recheck/application-20-edits.json');
 const laterLedger=await json(base+'recheck/application-10-recheck.json');
 const laterEdits=await json(base+'recheck/application-10-edits.json');
 const study=await json(base+'source-study.json');
 const key=({primaryId,movingLine})=>primaryId+':'+movingLine;
 const pending=prior.records.filter(r=>r.status==='specific-disagreement-remains');
 assert.deepEqual(ledger.records.map(key).sort(),pending.map(key).sort());
 assert.deepEqual(ledger.records.slice(0,3).map(key),['10:6','54:5','43:6']);
 assert.deepEqual(ledger.totals,study.modernApplicationTwentyFollowup.totals);
 assert.equal(ledger.independentProfessionalReview,'pending');
 assert.equal(ledger.independentTimingInterpretationReview,'pending');
 assert.deepEqual(edits.filter(e=>e.before[2]!==e.after[2]).map(e=>[key(e),e.monthOrder,e.after[2]]),[
  ['10:6','autumn-metal','conditional'],['10:6','seasonal-earth','conditional'],
  ['54:5','autumn-metal','conditional'],['54:5','seasonal-earth','conditional'],
  ['23:2','summer-fire','conditional'],['23:2','seasonal-earth','conditional'],
  ['53:3','winter-water','conditional'],['62:6','summer-fire','conditional'],
 ]);
 assert.equal(edits.length,13);
 assert.equal(edits.reduce((sum,e)=>sum+e.monthBranches.length,0),34);
 let articles=0,keys=0;
 for(const record of ledger.records){
  const priorRecord=pending.find(r=>key(r)===key(record));
  assert.deepEqual(record.sources,priorRecord.sources,key(record));
  assert.equal(new Set(record.sources.map(s=>s.author)).size,3,key(record));
  assert.ok(record.reason&&record.priorIssue&&record.lineText,key(record));
  const name=record.caseSource.split('/').at(-1);
  const drafts=await json(base+name);
  const shard=await json('data/authored-readings/missing-contact/'+name);
  for(const month of record.monthlyDecisions){
   const old=priorRecord.monthlyDecisions.find(m=>m.order===month.order);
   const row=shard.rows.find(r=>r.movingLine===record.movingLine&&r.monthOrder===month.order);
   assert.equal(month.priorOutcome,old.outcome);
   assert.deepEqual(month.branches,old.branches);
   const newer=laterLedger.records.find(r=>key(r)===key(record));
   const newestEdit=laterEdits.find(e=>key(e)===key(record)&&e.monthOrder===month.order);
   assert.equal(row.decision.outcomeCode,newer?.monthlyDecisions.find(m=>m.order===month.order)?.outcome??month.outcome);
   assert.equal(row.movingLineText,newer?.lineText??record.lineText);
   assert.deepEqual(row.facts.directRelations,record.chart.relations);
   assert.deepEqual(row.facts.nodes.filter(n=>n.role!=='body_inherited').map(({role,trigram,qi})=>({role,trigram,qi})),month.states);
   articles++;
   keys+=month.branches.length;
   const edit=edits.find(e=>key(e)===key(record)&&e.monthOrder===month.order);
   if(!edit)continue;
   if(newestEdit)assert.deepEqual(newestEdit.before,edit.after);
   const currentEdit=newestEdit??edit;
   const currentDraft=drafts.find(d=>d[0]===record.movingLine&&d[1]===month.order);
   const receipt=await json(base+'reviews/'+name);
   if(receipt.extraLiteraryPolish===true){
    // Keep historical dispute edits immutable while checking the signed literary
    // successor against that baseline, including its complete original timing.
    const baseline=await json(base+'literary-baseline-20261121/'+name);
    assert.deepEqual(currentEdit.after,baseline.find(d=>d[0]===record.movingLine&&d[1]===month.order));
    const checked=await inspectContactLiteraryBatch({root,primaryId:record.primaryId,drafts,authorReview:receipt});
    assert.equal(checked?.bindings.length,30);
   }else{
    assert.deepEqual(currentEdit.after,currentDraft);
   }
   assert.equal(digest(JSON.stringify(edit.after)),edit.contentSha256);
   assert.equal(row.copy.long.ending,currentDraft[7]);
   const slots=timing=>Array.isArray(timing)?timing.map(slot=>slot.slice(0,2)):timing;
   assert.deepEqual(slots(edit.before[10]),slots(edit.after[10]));
   for(const monthBranch of month.branches){
    const options={...context,questionId:id,primaryId:record.primaryId,movingLine:record.movingLine,monthBranch,castingDate:'2026-11-30'};
    const reading=await product.getContent(options);
    const saved=await product.getContent({...options,viewDate:'2027-01-01'});
    const dates=r=>r.timingSection.windows.map(w=>w.displayedDates);
    const expected=row.timingSlots.map(s=>findUpcomingCivilDayMatches({castingDate:options.castingDate,branches:s.branches}).matches.slice(0,2).map(d=>d.date));
    assert.deepEqual(dates(reading),expected);
    assert.deepEqual(dates(saved),expected);
    assert.equal(reading.calculationExplanation.void,undefined);
   }
  }
 }
 assert.deepEqual([articles,keys],[86,208]);
});
test('the ten remaining contact disputes have traceable dispositions and preserve timing rules',async()=>{
 const base='sources/editorial/missing-contact/';
 const prior=await json(base+'recheck/application-20-recheck.json');
 const latest=await json(base+'recheck/application-10-recheck.json');
 const edits=await json(base+'recheck/application-10-edits.json');
 const study=await json(base+'source-study.json');
 const key=({primaryId,movingLine})=>primaryId+':'+movingLine;
 const pending=prior.records.filter(r=>r.status==='open');
 assert.deepEqual(latest.records.map(key).sort(),pending.map(key).sort());
 assert.deepEqual(latest.records.slice(0,2).map(key),['43:6','18:1']);
 assert.deepEqual(latest.records.filter(r=>r.status==='open').map(key),['27:3','28:3','30:4','33:1','55:3']);
 assert.deepEqual(latest.totals,study.modernApplicationTenFollowup.totals);
 assert.equal(latest.independentProfessionalReview,'pending');
 assert.equal(latest.independentTimingInterpretationReview,'pending');
 assert.deepEqual(edits.filter(e=>e.before[2]!==e.after[2]).map(e=>[key(e),e.monthOrder,e.after[2]]),[
  ['43:6','autumn-metal','conditional'],['43:6','seasonal-earth','conditional'],
 ]);
 assert.equal(edits.length,4);
 assert.equal(edits.reduce((n,e)=>n+e.monthBranches.length,0),12);
 let articles=0,keys=0;
 for(const record of latest.records){
  const previous=pending.find(r=>key(r)===key(record));
  assert.equal(record.priorLineText,previous.lineText);
  assert.ok(record.reason&&record.priorIssue);
  for(const loc of record.sources){
   const lines=(await read(loc.path)).split(/\r?\n/);
   assert.ok(loc.startLine>0&&loc.endLine<=lines.length);
   assert.ok(lines.slice(loc.startLine-1,loc.endLine).join('').trim());
  }
  const filename=record.caseSource.split('/').at(-1);
  const drafts=await json(base+filename);
  const shard=await json('data/authored-readings/missing-contact/'+filename);
  for(const month of record.monthlyDecisions){
   const old=previous.monthlyDecisions.find(m=>m.order===month.order);
   assert.deepEqual([month.branches,month.states,month.priorOutcome],[old.branches,old.states,old.outcome]);
   const row=shard.rows.find(r=>r.movingLine===record.movingLine&&r.monthOrder===month.order);
   assert.equal(row.decision.outcomeCode,month.outcome);
   assert.equal(row.movingLineText,record.lineText);
   assert.deepEqual(row.facts.directRelations,record.chart.relations);
   articles++;
   keys+=month.branches.length;
   const edit=edits.find(e=>key(e)===key(record)&&e.monthOrder===month.order);
   if(!edit){assert.equal(month.outcome,month.priorOutcome);continue;}
   const currentDraft=drafts.find(d=>d[0]===record.movingLine&&d[1]===month.order);
   const receipt=await json(base+'reviews/'+filename);
   if(receipt.extraLiteraryPolish===true){
    const baseline=await json(base+'literary-baseline-20261121/'+filename);
    assert.deepEqual(edit.after,baseline.find(d=>d[0]===record.movingLine&&d[1]===month.order));
    const checked=await inspectContactLiteraryBatch({root,primaryId:record.primaryId,drafts,authorReview:receipt});
    assert.equal(checked?.bindings.length,30);
   }else{
    assert.deepEqual(edit.after,currentDraft);
   }
   assert.equal(digest(JSON.stringify(edit.after)),edit.contentSha256);
   assert.deepEqual(edit.after[10],edit.before[10]);
   assert.equal(row.copy.long.ending,currentDraft[7]);
   if(record.primaryId===43){
    assert.equal(row.timingSlots.length,0);
    assert.ok(row.timingOmission?.reason);
    assert.ok(row.decision.sourceEvidence.some(e=>e.id==='mh-070'&&e.quote==='体用比和，求谋称意。'));
   }
   for(const monthBranch of month.branches){
    const options={...context,questionId:id,primaryId:record.primaryId,movingLine:record.movingLine,monthBranch,castingDate:'2026-11-30'};
    const result=await product.getContent(options);
    const saved=await product.getContent({...options,viewDate:'2027-01-01'});
    const expected=row.timingSlots.map(s=>findUpcomingCivilDayMatches({castingDate:options.castingDate,branches:s.branches}).matches.slice(0,2).map(d=>d.date));
    assert.deepEqual(result.timingSection.windows.map(w=>w.displayedDates),expected);
    assert.deepEqual(saved.timingSection.windows.map(w=>w.displayedDates),expected);
    assert.equal(result.calculationExplanation.void,undefined);
   }
  }
 }
 assert.deepEqual([articles,keys],[44,106]);
});
