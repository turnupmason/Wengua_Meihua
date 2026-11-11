import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {loadLibrary,createProductRepository,getCivilDay,AUDIT_CHECKS,interpretationArtifactDigest} from '../src/index.js';
import {createInterviewReading,interviewTimingSlots} from '../src/interview-manuscripts.js';
import {MONTH_SLOTS,assessVoid} from '../src/index.js';
const read=async p=>JSON.parse(await readFile(new URL('../'+p,import.meta.url),'utf8'));
const library=await loadLibrary(),product=createProductRepository({library});
const question=await product.getQuestion('career.interview.interview-pass');
const index=await read('data/authored-readings/interview-pass/index.json');
const all=await Promise.all(index.files.map(f=>read(f.path)));
const batch={rows:all.flatMap(f=>f.rows)};
const context={castingDate:'2026-11-11',monthOrder:'winter-water',timingScale:'day',timingContext:{castingMethod:'pre-heaven',periodMethod:'element-qi'}};

test('sixty separately authored qi versions retain full sources, all qi states, nine scoped checks and shared short/long decisions',async()=>{
 assert.equal(batch.rows.length,60);
 for(const r of batch.rows){
  const material=structuredClone(r);delete material.artifactDigest;assert.equal(await interpretationArtifactDigest(material),r.artifactDigest);
  assert.equal(r.movingLineText,library.getLineReading(r.primaryId,r.movingLine).text);
  assert.equal(r.copy.short.decisionId,r.copy.long.decisionId);assert.ok(r.copyChecks.shortHanCount>=60&&r.copyChecks.shortHanCount<=120);
  assert.equal(r.review.actor,'assistant-author');assert.ok(AUDIT_CHECKS.every(id=>r.review.checks[id].status==='pass'&&r.review.checks[id].evidence.length));
  assert.ok(r.counterevidence.length);assert.deepEqual(r.decision.indirectEffectsApplied,[]);
  const result=await product.getContent({questionId:question.id,...context,monthBranch:r.monthBranches[0],monthOrder:r.monthOrder,primaryId:r.primaryId,movingLine:r.movingLine});
  assert.equal(result.status,'ready');assert.equal(result.selection.question_type,'interview_pass');assert.equal(result.decision.questionScope,'one-interview-stage');
  assert.equal(result.short,r.copy.short.text);assert.ok(!result.story.includes('{{date:'));assert.match(result.story,/应期：/);
  for(const event of result.dateResolution.dateMatches){assert.ok(event.event.includes('本轮面试'));assert.ok(['吉','凶'].includes(event.valence));for(const date of event.matches)assert.ok(date.date>=context.castingDate);}
 }
});

test('positive and adverse windows independently match support/control branches and never become office-loss or hiring dates',async()=>{
 const positive=await product.getContent({questionId:question.id,...context,primaryId:5,movingLine:2});
 assert.match(positive.story,/本月18、19号/);assert.ok(positive.dateResolution.dateMatches.every(s=>s.valence==='吉'));
 const adverse=await product.getContent({questionId:question.id,...context,primaryId:18,movingLine:3});
 assert.match(adverse.story,/本月12、13号/);assert.ok(adverse.dateResolution.dateMatches.every(s=>s.valence==='凶'));
 for(const r of [positive,adverse])for(const event of r.dateResolution.dateMatches)for(const d of event.matches)
  assert.ok(r.timingDecision.find(s=>s.id===event.slotId).branches.includes(getCivilDay(d.date).dayBranch));
 assert.ok(![...positive.timingDecision,...adverse.timingDecision].some(s=>s.ruleIds.includes('fame-office-risk')));
 const mixed=await product.getContent({questionId:question.id,...context,primaryId:48,movingLine:5});
 assert.match(mixed.story,/本月18、19号/);assert.match(mixed.story,/本月21、22号/);
 assert.deepEqual(mixed.dateResolution.dateMatches.slice(0,2).map(x=>x.valence),['凶','吉']);
 const release=mixed.dateResolution.dateMatches.filter(x=>x.slotId.startsWith('void-'));
 assert.equal(release.length,0);assert.ok(!mixed.story.includes('空亡节点')); 
});

test('complete qi governs void exemptions; stationary empty fire, moving empty fire and partial Kun are distinct',()=>{
 const reading=createInterviewReading({library,question,...context,primaryId:5,movingLine:2});
 assert.equal(reading.nodes.find(n=>n.role==='body').strength.state,'旺');
 assert.equal(reading.nodes.find(n=>n.role==='body_mutual').void.state,'dormant');
 assert.equal(reading.nodes.find(n=>n.role==='changed_use').void.state,'moving_exempt');
 assert.equal(reading.nodes.find(n=>n.role==='body_inherited').void,reading.nodes.find(n=>n.role==='body').void);
 const partial=createInterviewReading({library,question,...context,primaryId:16,movingLine:2}).nodes.find(n=>n.role==='use');
 assert.equal(partial.void.hitKind,'partial');assert.deepEqual(partial.void.matchedBranches,['未']);assert.equal(partial.void.state,'partial_reduced');assert.equal(partial.void.effective,'reduced');assert.equal(partial.void.numericMultiplier,null);
 const supported=createInterviewReading({library,question,...context,primaryId:40,movingLine:5}).nodes.find(n=>n.role==='body_mutual');
 assert.equal(supported.void.state,'supported');assert.ok(supported.supportEvidence.some(e=>e.basis==='internal-moving-direct-generation'));
 const wronglyChosen=()=>interviewTimingSlots(reading,[{kind:'support',role:'body_mutual',sourceIds:['mh-071']}]);
 assert.throws(wronglyChosen,/active direct/);
});

test('unknown chart/month/void profiles remain pending, while no supplied timing method yields a clear context requirement',async()=>{
 assert.equal((await product.getContent({questionId:question.id,...context,primaryId:1,movingLine:1})).status,'pending-authoring');
 assert.equal((await product.getContent({questionId:question.id,...context,primaryId:5,movingLine:2,monthOrder:'summer-fire'})).status,'ready');
 assert.equal((await product.getContent({questionId:question.id,...context,primaryId:5,movingLine:2,monthOrder:'summer-fire',castingDate:'2026-12-06'})).status,'pending-authoring');
 const changed=await product.getContent({questionId:question.id,...context,primaryId:5,movingLine:2,voidContext:{roleEvidence:{body_mutual:{severelyWeak:true,dayMonthAttacked:true}}}});
 assert.equal(changed.status,'ready');assert.ok(!changed.story.includes('空亡节点'));
 const manual=await product.getContent({questionId:question.id,...context,primaryId:5,movingLine:2,timingContext:{castingMethod:'manual',periodMethod:'element-qi'}});
 assert.equal(manual.status,'requires-context');assert.ok(manual.missingContext.includes('timingMethod'));
 await assert.rejects(product.getContent({questionId:question.id,...context,primaryId:5,movingLine:2,voidContext:{ganzhi:'甲子'}}),/disagree/);
});

test('other cast dates re-evaluate the profile and render future-only dates or withhold unrecorded profiles',async()=>{
 let ready=0,pending=0;
 for(const date of ['2026-11-12','2026-11-15','2026-11-30','2026-12-06','2026-12-31','2027-01-10']){
  const r=await product.getContent({questionId:question.id,...context,monthOrder:'summer-fire',castingDate:date,primaryId:5,movingLine:2});
  if(r.status==='ready'){ready++;for(const e of r.dateResolution.dateMatches)for(const d of e.matches)assert.ok(d.date>=date);}
  else{pending++;assert.equal(r.status,'pending-authoring');assert.equal(r.story,null);}
 }
 assert.ok(ready);assert.ok(pending);
});

test('progress stays on the first interview question and does not claim all 4608 slots or final-offer coverage',async()=>{
 const progress=await read('data/authored-readings/progress.json');
 assert.equal(progress.activeQuestionId,question.id);assert.equal(progress.baseCasesWritten,144);assert.equal(progress.totalBaseCases,4608);assert.equal(progress.backgroundExecution,false);
 const offer=await product.getContent({questionId:'career.interview.job-offer',...context,primaryId:5,movingLine:2});
 assert.equal(offer.status,'pending-authoring');assert.equal(offer.story,null);
});

test('all twelve branch slots resolve each authored chart, with month-dependent verdicts retained',async()=>{
 const cores=[...new Map(batch.rows.map(r=>[r.primaryId+'/'+r.movingLine,r])).values()];
 assert.equal(cores.length,12);let resolved=0;
 for(const r of cores)for(const month of MONTH_SLOTS){
  const out=await product.getContent({questionId:question.id,...context,monthOrder:undefined,monthBranch:month.branch,primaryId:r.primaryId,movingLine:r.movingLine});
  assert.equal(out.status,'ready');assert.equal(out.monthBranch,month.branch);assert.equal(out.monthOrder,month.qi);resolved++;
 }
 assert.equal(resolved,144);
 const interview=(id,line,monthBranch)=>product.getContent({questionId:question.id,...context,monthOrder:undefined,monthBranch,primaryId:id,movingLine:line});
 assert.match((await interview(48,5,'亥')).decision.outcomeCode,/^pass/);
 assert.equal((await interview(48,5,'申')).decision.outcomeCode,'not-pass-this-round');
 assert.equal((await interview(16,2,'辰')).decision.outcomeCode,'not-pass-this-round');
 assert.match((await interview(18,3,'未')).decision.outcomeCode,/^pass/);
 await assert.rejects(product.getContent({questionId:question.id,...context,monthBranch:'卯',primaryId:5,movingLine:2}),/disagree/);
});

test('lookup reads one hexagram shard and shared prose does not duplicate twelve full articles in memory',async()=>{
 const paths=[];const p=createProductRepository({library,readJSON:async path=>{paths.push(path);return read(path);}});
 for(const monthBranch of ['寅','卯','辰'])await p.getContent({questionId:question.id,...context,monthOrder:undefined,monthBranch,primaryId:5,movingLine:2});
 assert.deepEqual(paths.filter(p=>/\/hex-/.test(p)),['data/authored-readings/interview-pass/hex-005.json']);
 const file=all.find(f=>f.primaryId===5);assert.equal(file.rows.length,5);assert.equal(Object.keys(file.monthSlots).length,12);
});

test('whole-trigram branch matching distinguishes full and half hits, without inventing a percentage',()=>{
 const full=assessVoid('乾',{ganzhi:'甲子',strength:'休',partialPolicy:'qualitative-reduction'});
 assert.equal(full.hitKind,'full');assert.deepEqual(full.matchedBranches,['戌','亥']);assert.equal(full.state,'dormant');
 const half=assessVoid('艮',{ganzhi:'甲寅',strength:'休',partialPolicy:'qualitative-reduction'});
 assert.equal(half.hitKind,'partial');assert.deepEqual(half.matchedBranches,['丑']);assert.equal(half.state,'partial_reduced');assert.equal(half.numericMultiplier,null);
 const single=assessVoid('坎',{ganzhi:'甲寅',strength:'旺',partialPolicy:'qualitative-reduction'});
 assert.equal(single.hitKind,'full');assert.equal(single.state,'strong_exempt');
 assert.equal(assessVoid('离',{ganzhi:'甲子',partialPolicy:'qualitative-reduction'}).hit,false);
});
