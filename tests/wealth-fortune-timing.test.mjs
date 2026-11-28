import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {loadLibrary,createWealthFortunePreviewRepository,resolveWealthFortuneTiming,wealthTimingBranches,getCivilDay} from '../src/index.js';
import {createContextualReading} from '../src/interview-manuscripts.js';

const lib=await loadLibrary();
const readJSON=async p=>JSON.parse(await readFile(new URL('../'+p,import.meta.url),'utf8'));
const repo=createWealthFortunePreviewRepository({library:lib,readJSON});
const base={primaryId:6,movingLine:1};
const q={id:'wealth.near-term.outlook',mode:'narrative',question_type:'near_term_financial_outlook',question:'近期财运',sourceDomainIds:['domain-10']};
function chart(monthBranch,castingDate){return createContextualReading({library:lib,question:q,...base,monthBranch,castingDate,applyVoid:false})}
test('wealth current month dates recompute from a new date and select exact new month article',async()=>{
 const a=await repo.getReading({...base,monthBranch:'亥',referenceDate:'2026-11-28'});
 const b=await repo.getReading({...base,monthBranch:'子',referenceDate:'2026-12-05'});
 assert.equal(a.status,'preview');assert.equal(b.status,'preview');
 assert.equal(a.key,'6/1/亥');assert.equal(b.key,'6/1/子');
 assert.notDeepEqual(a.article,b.article);
 const first=a.timing.slots.find(s=>s.kind==='drain');
 assert.deepEqual(first.dates.map(x=>x.date),['2026-12-03','2026-12-04']);
 assert.equal(first.dates[0].display,'下月3号');
 const next=b.timing.slots.find(s=>s.kind==='drain');
 assert.deepEqual(next.dates.map(x=>x.date),['2026-12-15','2026-12-16']);
 for(const s of b.timing.slots)for(const d of s.dates){
  assert(d.date>='2026-12-05');assert(!d.expired);assert(s.branches.includes(getCivilDay(d.date).dayBranch));assert.equal(s.selectedAsEventDate,false);
 }
});
test('current-month priority, next-month fallback, and explicit end date constrain the wealth candidate',async()=>{
 const r=await repo.getReading({...base,monthBranch:'辰',referenceDate:'2026-11-28'});
 const g=r.timing.slots.find(s=>s.kind==='gain');
 assert.equal(g.monthOffset,1);
 assert.deepEqual(g.dates.map(x=>x.date),['2026-12-06','2026-12-07']);
 const s=await repo.getReading({...base,monthBranch:'辰',referenceDate:'2026-11-28',endDate:'2026-11-30'});
 assert.equal(s.timing.slots.find(s=>s.kind==='gain').dates.length,0);
 const risk=s.timing.slots.find(s=>s.kind==='risk-review');
 assert.equal(risk.dates[0].date,'2026-11-28');
});
test('history preserves original candidate date and marks it expired rather than recasting it',async()=>{
 const c=await repo.getReading({...base,monthBranch:'亥',referenceDate:'2027-01-03',castingDate:'2026-11-28',mode:'history'});
 const g=c.timing.slots.find(s=>s.kind==='drain');
 assert.deepEqual(g.dates.map(x=>x.date),['2026-12-03','2026-12-04']);
 assert(g.dates.every(x=>x.expired));
 assert.match(g.display,/已过/);
});
test('wealth timing guards reject wrong chart roles, body environments and stale date context',()=>{
 const reading=chart('辰','2026-11-28'),gain={kind:'gain',roles:['body_mutual'],event:'可控财落实',reason:'相乾制囚巽'};
 assert.deepEqual(wealthTimingBranches(reading,gain).branches,['寅','卯']);
 assert.throws(()=>wealthTimingBranches(reading,{...gain,roles:['use']}),/role\/relation/);
 assert.throws(()=>wealthTimingBranches(reading,{kind:'prepare',roles:['body'],element:'火',event:'蓄力',reason:'错误要拒绝'}),/Environment/);
 assert.throws(()=>resolveWealthFortuneTiming({reading,specs:[gain],referenceDate:'2026-12-01'}),/matching chart/);
 assert.throws(()=>resolveWealthFortuneTiming({reading,specs:[gain],referenceDate:'2026-11-28',endDate:'2026-11-27'}),/horizon/);
});
test('unpublished wealth hexagrams yield a review-required status, not a missing-file exception',async()=>{
 const query={primaryId:64,movingLine:1,monthBranch:'亥',referenceDate:'2026-11-28'};
 for(const missing of [Object.assign(new Error('not yet written'),{code:'ENOENT'}),Object.assign(new Error('not found'),{status:404})]){
  const pending=createWealthFortunePreviewRepository({library:lib,readJSON:async()=>{throw missing}});
  assert.deepEqual(await pending.getReading(query),{status:'requires-reviewed-preview',key:'64/1/亥'});
 }
 const corrupt=createWealthFortunePreviewRepository({library:lib,readJSON:async p=>{if(p.includes('/timing-monthly/'))throw new SyntaxError('malformed source');throw Object.assign(new Error('missing'),{code:'ENOENT'});}});
 await assert.rejects(corrupt.getReading(query),/malformed source/);
});
