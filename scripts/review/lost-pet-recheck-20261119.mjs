// Deterministic verification and serialization of already written review records.
// This script does not write interpretations or approve professional judgments.
import assert from 'node:assert/strict';
import {readFile, writeFile, readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {loadLibrary, createProductRepository} from '../../src/index.js';

const dir='sources/editorial/lost-pet-recovery';
const auditDir=dir+'/recheck-20261119';
const json=async p=>JSON.parse(await readFile(p,'utf8'));
const sha=s=>createHash('sha256').update(s).digest('hex');
const compact=s=>s.replace(/\s/g,'');
const baseline=await json(dir+'/final-audit-20261119.json');
const judgments=await json(auditDir+'/judgment-rechecks.json');
const library=await loadLibrary();
const product=createProductRepository({library});
const sources=new Map(),cases=new Map(),shards=new Map(),batchHashes=[];
const quoteMatches=[],fieldSeen=new Map(),sentenceSeen=new Map();
let fields=0,sentences=0,monthKeys=0;
async function quoted(q,context){
 const path=q.sourcePath??q.path;
 const text=q.id?library.getSection(q.id).text:await readFile(path,'utf8');
 const index=text.indexOf(q.quote);
 assert.ok(index>=0||compact(text).includes(compact(q.quote)),context+': quote mismatch');
 return {sourceId:q.id??null,sourcePath:path??null,quote:q.quote,quoteSha256:sha(q.quote),sourceSha256:sha(text),match:index>=0?'exact':'whitespace-only',startChar:index>=0?index:null};
}
for(let id=1;id<=64;id++){
 const stem='hex-'+String(id).padStart(3,'0')+'.json';
 const sp=dir+'/'+stem,cp=dir+'/cases/'+stem;
 const raw=await readFile(sp),cr=await readFile(cp),s=JSON.parse(raw),c=JSON.parse(cr);
 const review=await json(dir+'/reviews/'+stem);
 assert.equal(review.sourceSha256,sha(raw));assert.equal(review.casesSha256,sha(cr));
 const shard=await json('data/authored-readings/lost-pet-recovery/'+stem);
 assert.equal(s.length,30);assert.equal(shard.rows.length,30);assert.equal(Object.keys(shard.monthSlots).length,72);
 monthKeys+=72;sources.set(id,s);cases.set(id,c);shards.set(id,shard);
 batchHashes.push({primaryId:id,sourcePath:sp,sourceSha256:sha(raw),casesPath:cp,casesSha256:sha(cr)});
 for(const e of c.entries){
  const lc=e.lineCommentary;
  if(!lc)continue;
  const previous=baseline.commentaryMatches.find(x=>x.primaryId===id&&x.movingLine===e.movingLine&&x.caseField==='lineCommentary.quote');
  assert.ok(previous,'missing original commentary source locator '+id+'/'+e.movingLine);
  quoteMatches.push({primaryId:id,movingLine:e.movingLine,field:'lineCommentary.quote',...await quoted({sourcePath:previous.sourcePath,quote:lc.quote},id+'/'+e.movingLine)});
  for(const [i,q]of (lc.parallelReadings??[]).entries())quoteMatches.push({primaryId:id,movingLine:e.movingLine,field:'parallelReadings.'+i,...await quoted(q,id+'/'+e.movingLine+'/'+i)});
 }
 for(const [i,r]of s.entries())for(const [j,field]of r.slice(3,9).entries()){
  const location=id+'/'+r[0]+'/'+r[1]+'/'+(j+3);
  const normalized=field.replace(/[^\p{Script=Han}]/gu,'');
  if(normalized.length>=12){assert.ok(!fieldSeen.has(normalized),'duplicate field '+location+' / '+fieldSeen.get(normalized));fieldSeen.set(normalized,location);fields++;}
  // Keep semicolon clauses together, as in the established build check: full
  // canonical line quotations may legitimately recur across seasonal articles.
  for(const sentence of field.split(/[。！？]/u)){
   const n=sentence.replace(/[^\p{Script=Han}]/gu,'');
   if(n.length<12)continue;
   assert.ok(!sentenceSeen.has(n),'duplicate sentence '+location+' / '+sentenceSeen.get(n));sentenceSeen.set(n,location);sentences++;
  }
  assert.equal(shard.rows[i].copy.title,s[i][3]);
 }
}
assert.equal(monthKeys,4608);assert.equal(quoteMatches.length,690);
const omissions=[];
for(const t of baseline.timingOmissions){
 const id=Number(t.key.split('/')[1]),row=sources.get(id)[t.rowIndex];
 const stem='timing-'+String(id).padStart(3,'0')+'.json',receipt=await json(auditDir+'/'+stem);
 const entry=receipt.entries.find(x=>x[0]===t.rowIndex);assert.ok(entry,t.key);
 const added=Array.isArray(row[10]);assert.equal(entry[1],added?'add-rule':'retain-omission');
 if(!added)assert.ok(typeof row[10]==='string'&&row[10].length>30,t.key+' missing specific reason');
 omissions.push({originalKey:t.key,primaryId:id,movingLine:row[0],monthOrder:row[1],disposition:entry[1],currentTiming:row[10],receiptPath:auditDir+'/'+stem});
}
assert.equal(omissions.length,89);assert.equal(omissions.filter(x=>x.disposition==='add-rule').length,34);
assert.equal(judgments.entries.length,146);assert.equal(new Set(judgments.entries.map(e=>e.caseIndex)).size,146);
const judgmentProofs=[];
for(const [i,e]of judgments.entries.entries()){
 assert.equal(e.caseIndex,i);const original=baseline.judgmentTensions[i];
 assert.equal(e.primaryId,original.primaryId);assert.equal(e.movingLine,original.movingLine);
 assert.deepEqual(Object.keys(e.conclusions).sort(),original.keys.map(k=>k.split('/').at(-1)).sort());
 for(const [order,outcome]of Object.entries(e.conclusions))assert.equal(sources.get(e.primaryId).find(r=>r[0]===e.movingLine&&r[1]===order)[2],outcome);
 assert.equal(e.independentProfessionalReview,'pending');assert.equal(e.actor,'single-assistant-author');
 assert.ok(e.finding&&e.remainingQuestion&&e.sourceEvidence.length);
 const proofs=[];for(const q of e.sourceEvidence)proofs.push(await quoted(q,'judgment '+i));
 judgmentProofs.push({caseIndex:i,primaryId:e.primaryId,movingLine:e.movingLine,keys:original.keys,disposition:e.disposition,sourceEvidence:proofs});
}
const copyChanges=[];
for(const file of (await readdir(auditDir)).filter(x=>/^decision-copy-\d{3}\.json$/.test(x))){
 const p=auditDir+'/'+file,r=await json(p),id=r.primaryId;
 const old=JSON.parse(execFileSync('git',['show','c9f2cdc2:'+r.sourcePath],{encoding:'utf8'}));
 for(const e of r.changes){
  const original=e.baselineBefore??e.before;
  assert.deepEqual(original,old[e.rowIndex]);assert.deepEqual(e.after,sources.get(id)[e.rowIndex]);
  copyChanges.push({primaryId:id,movingLine:e.after[0],monthOrder:e.after[1],before:original[2],after:e.after[2],beforeSha256:sha(JSON.stringify(original)),afterSha256:sha(JSON.stringify(e.after)),path:p,...(e.beforeStage?{intermediateBeforeStage:e.beforeStage}: {})});
 }
}
assert.equal(copyChanges.length,12);
const dateChecks=[];
for(const row of omissions.filter(x=>x.disposition==='add-rule'))for(const castingDate of ['2026-11-19','2026-11-30']){
 const result=await product.getContent({questionId:'search.pets.recovery',primaryId:row.primaryId,movingLine:row.movingLine,monthOrder:row.monthOrder,castingDate,timingScale:'day',timingContext:{castingMethod:'pre-heaven',periodMethod:'element-qi'}});
 assert.equal(result.status,'ready');assert.equal(result.timingSection.windows.length,1);assert.equal(result.voidMatch,'not-applied');
 const w=result.timingSection.windows[0];assert.ok(w.displayedDates.length>0&&w.displayedDates.length<=2);
 for(const date of w.displayedDates)assert.ok(date>=castingDate);
 dateChecks.push({primaryId:row.primaryId,movingLine:row.movingLine,monthOrder:row.monthOrder,castingDate,event:w.event,dates:w.displayedDates,text:w.text});
}
const counts=judgments.entries.reduce((out,e)=>(out[e.disposition]=(out[e.disposition]??0)+1,out),{});
const index=await json('data/authored-readings/lost-pet-recovery/index.json');
assert.equal(index.dated,1865);assert.equal(index.undated,55);
const judgmentArticleConditionKeys=judgmentProofs.reduce((n,e)=>n+e.keys.length,0);
const judgmentMonthKeys=judgmentProofs.reduce((n,e)=>n+e.keys.reduce((m,k)=>m+(k.split('/').at(-1)==='seasonal-earth'?4:2),0),0);
const actualJudgmentMonthKeys=new Set();
for(const e of judgments.entries)for(const [slot,i]of Object.entries(shards.get(e.primaryId).monthSlots)){
 const row=shards.get(e.primaryId).rows[i];
 if(row.movingLine===e.movingLine&&Object.hasOwn(e.conclusions,row.monthOrder))actualJudgmentMonthKeys.add(e.primaryId+'/'+slot);
}
assert.equal(judgmentArticleConditionKeys,362);assert.equal(judgmentMonthKeys,878);
assert.equal(actualJudgmentMonthKeys.size,judgmentMonthKeys);
const datedMonthKeys=[...shards.values()].reduce((n,s)=>n+Object.values(s.monthSlots).filter(i=>s.rows[i].timingSlots.length).length,0);
const report={revision:'pet-recheck-20261119.1',questionId:'search.pets.recovery',baselineCommit:'c9f2cdc2',manuscriptVersion:index.manuscriptVersion,
 counts:{charts:384,monthKeys,manuscripts:1920,originalTimingOmissions:89,timingAdded:34,timingReasonsRetained:55,dated:index.dated,undated:index.undated,datedMonthKeys,undatedMonthKeys:monthKeys-datedMonthKeys,judgmentCasesRead:146,judgmentArticleConditionKeys,judgmentMonthKeys,judgmentDispositions:counts,revisedArticles:copyChanges.length,targetedWholeArticleReads:89+judgments.entries.reduce((n,e)=>n+e.fullArticlesReadThisRecheck,0),outcomes:index.outcomeCounts},
 reviewLimits:{actor:'single-assistant-author',extraLiteraryPolishPerformed:false,voidApplied:false,independentProfessionalReview:'pending',independentTimingInterpretationReview:'pending',unresolvedModernApplicationCases:68,authorRecheckIsNotIndependentApproval:true},
 checks:{hashes:batchHashes.length,commentaryExcerptMatches:quoteMatches.length,judgmentQuoteMatches:judgmentProofs.reduce((n,e)=>n+e.sourceEvidence.length,0),newRuleActualDateComputations:dateChecks.length,exactNormalizedHanFields:fields,exactNormalizedHanSentences:sentences,duplicateFields:0,duplicateSentences:0,semanticNoRepetitionGuaranteed:false},
 timingRechecks:omissions,judgmentProofs,copyChanges,quoteMatches,batchHashes,dateChecks};
await writeFile(auditDir+'/verification.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({counts:report.counts,checks:report.checks,reviewLimits:report.reviewLimits},null,2));
