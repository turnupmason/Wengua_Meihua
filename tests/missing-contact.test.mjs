import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {loadLibrary,createProductRepository,findUpcomingCivilDayMatches} from '../src/index.js';

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
 let articles=0,keys=0;
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
   assert.ok(['mh-075','mh-076','mh-077'].every(id=>!row.sourceIds.includes(id)),key);
   assert.equal(row.contactApplication.personLocationInferred,false,key);
   assert.equal(row.contactApplication.healthOrFateInferred,false,key);
   assert.equal(row.contactApplication.privateIntentInferred,false,key);
   assert.equal(row.contactApplication.returnHomeInferred,false,key);
   assert.equal(row.contactApplication.application,c.application,key);
   for(const n of c.nodes)assert.equal(row.facts.nodes.find(f=>f.role===n.role).trigram,n.trigram,key);
   assert.ok((await read(c.lineCommentary.sourcePath)).includes(c.lineCommentary.quote),key);
   assert.ok(c.lineCommentary.locator&&c.lineCommentary.application,key);
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
 assert.equal(index.literaryPolish.required,false);
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

test('现实寻人线索 remains a guidance entry without a second predictive chart library',async()=>{
 const q=await product.getContent({questionId:'search.person-leads.guidance'});
 assert.equal(q.status,'guidance');
 assert.equal(q.predictionAllowed,false);
 assert.equal(q.provesLocation,false);
 assert.ok(q.guidanceParagraphs?.length||q.paragraphs?.length);
 assert.ok(!q.reading);
});
