import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {loadLibrary,createProductRepository,getCivilDay,AUDIT_CHECKS,interpretationArtifactDigest} from '../src/index.js';
import {createInterviewReading,interviewTimingSlots} from '../src/interview-manuscripts.js';
import {MONTH_SLOTS,assessVoid} from '../src/index.js';
import {checkInterviewDecision,checkInterviewShort} from '../src/interview-decision-checks.js';
const read=async p=>JSON.parse(await readFile(new URL('../'+p,import.meta.url),'utf8'));
const library=await loadLibrary(),product=createProductRepository({library});
const question=await product.getQuestion('career.interview.interview-pass');
const index=await read('data/authored-readings/interview-pass/index.json');
const all=await Promise.all(index.files.map(f=>read(f.path)));
const batch={rows:all.flatMap(f=>f.rows).filter(r=>r.authorship.method==='individually-authored-reference-case')};
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
 assert.equal(adverse.timingDecision[0].eventScope,'opening-obstruction');
 for(const monthOrder of ['autumn-metal','seasonal-earth']){
  const gu=await product.getContent({questionId:question.id,...context,primaryId:18,movingLine:3,monthOrder});
  assert.equal(gu.decision.outcomeCode,'not-pass-this-round');
  const [timing]=gu.timingDecision;
  assert.equal(timing.eventScope,'process-drain');assert.equal(timing.role,'use_mutual');assert.deepEqual(timing.branches,['申','酉']);
  assert.ok(gu.dateResolution.dateMatches[0].matches.every(d=>timing.branches.includes(getCivilDay(d.date).dayBranch)));
 }
 for(const monthOrder of ['spring-wood','summer-fire','autumn-metal','winter-water']){
  const shiHe=await product.getContent({questionId:question.id,...context,primaryId:21,movingLine:4,monthOrder});
  assert.equal(shiHe.timingDecision[0].eventScope,'process-support');
  assert.equal(shiHe.timingDecision[0].role,'use_mutual');
  assert.deepEqual(shiHe.timingDecision[0].ruleIds,['good-event']);
  assert.ok(shiHe.timingDecision[0].sourceIds.includes('mh-116'));
 }
 const earthShiHe=await product.getContent({questionId:question.id,...context,primaryId:21,movingLine:4,monthOrder:'seasonal-earth'});
 assert.equal(earthShiHe.timingDecision[0].eventScope,'opening-drain');
 assert.equal(earthShiHe.timingDecision[0].role,'use');
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

test('complete base coverage retains pending status for uncovered core-void profiles, while no supplied timing method yields a clear context requirement',async()=>{
 assert.equal((await product.getContent({questionId:question.id,...context,primaryId:1,movingLine:1})).status,'ready');
 assert.equal((await product.getContent({questionId:question.id,...context,primaryId:5,movingLine:2,monthOrder:'summer-fire'})).status,'ready');
 assert.equal((await product.getContent({questionId:question.id,...context,primaryId:5,movingLine:2,monthOrder:'summer-fire',castingDate:'2026-12-06'})).status,'pending-authoring');
 const changed=await product.getContent({questionId:question.id,...context,primaryId:5,movingLine:2,voidContext:{roleEvidence:{body_mutual:{severelyWeak:true,dayMonthAttacked:true}}}});
 assert.equal(changed.status,'pending-authoring');assert.equal(changed.story,null);
 assert.equal(changed.reading.nodes.find(n=>n.role==='body_mutual').void.state,'true_void');
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

test('progress stays on the first interview question and records all 4608 base slots without claiming final-offer coverage',async()=>{
 const progress=await read('data/authored-readings/progress.json');
 assert.equal(progress.activeQuestionId,question.id);assert.equal(progress.baseCasesWritten,4608);assert.equal(progress.totalBaseCases,4608);assert.equal(progress.backgroundExecution,false);
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
 assert.equal((await interview(18,3,'未')).decision.outcomeCode,'not-pass-this-round');
 await assert.rejects(product.getContent({questionId:question.id,...context,monthBranch:'卯',primaryId:5,movingLine:2}),/disagree/);
});

test('strong body or mutual equality cannot reverse unassisted use-control into passing an interview',async()=>{
 for(const [primaryId,movingLine] of [[27,2],[18,3]])for(const monthOrder of ['summer-fire','seasonal-earth']){
  const result=await product.getContent({questionId:question.id,...context,monthOrder,primaryId,movingLine});
  assert.equal(result.status,'ready');assert.equal(result.decision.outcomeCode,'not-pass-this-round');
  assert.equal(result.decision.consistency.noGenerationWithUseControl,true);
  assert.deepEqual(result.decision.consistency.generatingRoles,[]);
  assert.throws(()=>checkInterviewDecision(result.reading,{outcome:'pass-because-body-is-strong',counterevidence:[]}),/Unsupported favourable reversal/);
 }
 for(const monthBranch of MONTH_SLOTS.map(m=>m.branch)){
  const result=await product.getContent({questionId:question.id,...context,monthOrder:undefined,monthBranch,primaryId:27,movingLine:2});
  assert.equal(result.decision.outcomeCode,'not-pass-this-round');assert.match(result.long.ending,/征凶/);assert.match(result.long.ending,/不利于成就/);
 }
 for(const [movingLine,monthOrder,scope,role] of [
  [2,'summer-fire','opening-obstruction','use'],
  [2,'autumn-metal','closing-drain','changed_use'],
  [2,'seasonal-earth','closing-drain','changed_use'],
  [3,'spring-wood','opening-obstruction','use'],
  [3,'summer-fire','closing-repair','changed_use'],
  [3,'seasonal-earth','closing-repair','changed_use'],
 ]){
  const result=await product.getContent({questionId:question.id,...context,monthOrder,primaryId:27,movingLine});
  assert.match(result.decision.outcomeCode,/^not-pass/);
  const [window]=result.timingSection.windows;
  assert.equal(window.eventScope,scope);assert.equal(window.calculationBasis.role,role);
 }
});

test('half-void belongs to separately versioned calculation details, without altering month identity or entering prose',async()=>{
 const winter=await product.getContent({questionId:question.id,...context,primaryId:16,movingLine:2});
 const summer=await product.getContent({questionId:question.id,...context,monthOrder:'summer-fire',primaryId:16,movingLine:2});
 for(const result of [winter,summer]){
  assert.ok(!/半空|按半空减力|卦中提示/.test(result.short+result.story));
  assert.match(result.calculationExplanation.paragraphs.join('\n'),/半空减力/);
  assert.equal(result.calculationExplanation.void.id,'trigram-void-2.1.0');
  assert.equal(result.calculationExplanation.void.classicalUniformScoring,false);
  assert.equal(result.calculationExplanation.void.numericMultiplier,null);
 }
 assert.equal(winter.calculationExplanation.void.dayGanzhi,summer.calculationExplanation.void.dayGanzhi);
 assert.deepEqual(winter.calculationExplanation.void.emptyBranches,summer.calculationExplanation.void.emptyBranches);
 assert.notEqual(winter.calculationExplanation.month.qiCategory,summer.calculationExplanation.month.qiCategory);
});

test('opposite timing windows keep separate events and calculation bases and do not claim independent interpretation approval',async()=>{
 const result=await product.getContent({questionId:question.id,...context,primaryId:48,movingLine:5});
 const [adverse,positive]=result.dateResolution.dateMatches;
 assert.equal(adverse.eventScope,'process-obstruction');assert.equal(adverse.valence,'凶');
 assert.equal(adverse.calculationBasis.role,'body_mutual');assert.equal(adverse.calculationBasis.element,'金');assert.deepEqual(adverse.targetBranches,['申','酉']);
 assert.equal(positive.eventScope,'positive-result-candidate');assert.equal(positive.valence,'吉');
 assert.equal(positive.calculationBasis.role,'use');assert.equal(positive.calculationBasis.element,'水');assert.deepEqual(positive.targetBranches,['亥','子']);
 assert.notEqual(adverse.slotId,positive.slotId);assert.notEqual(adverse.event,positive.event);
 assert.equal(result.dateResolution.interpretationReviewed,false);
 assert.equal(result.dateResolution.independentInterpretationReview,'pending');
 assert.equal(result.review.independentReview.userAcceptedThisVersion,false);
 assert.equal(result.review.independentReview.timingInterpretation,'pending');
});

test('all short readings stay date-free while the reference timing field supplies independently labelled concrete windows',async()=>{
 for(const row of batch.rows){
  assert.equal(checkInterviewShort(row.copy.short.text).status,'passed');
  const out=await product.getContent({questionId:question.id,...context,primaryId:row.primaryId,movingLine:row.movingLine,monthOrder:row.monthOrder,monthBranch:row.monthBranches[0]});
  assert.equal(out.narrativeParagraphs.length,4);assert.ok(out.narrativeParagraphs.every(p=>!p.startsWith('应期：')));
  assert.equal(out.timingSection.windows.length,out.dateResolution.dateMatches.length);
  if(row.timingOmission){
   assert.equal(out.timingSection.referenceNote,'此盘暂无有据的日期可列。');
   assert.deepEqual(out.timingSection.windows,[]);
   assert.equal(row.timingOmission.status,'not-derived');
   assert.ok(row.timingOmission.reason&&row.timingOmission.sourceIds.length);
   continue;
  }
  assert.equal(out.timingSection.referenceNote,'以下为传统推算的参考窗口。');
  assert.ok(out.timingSection.windows.length);
  for(const w of out.timingSection.windows){
   assert.ok(w.event&&['吉','凶'].includes(w.valence)&&w.calculationBasis.sourceIds.length);
   assert.ok(w.displayedDates.length);assert.match(w.text,/号/);assert.ok(!w.text.includes('{{date:'));
  }
 }
 for(const forbidden of ['应期留意收到反馈的时段','留意有利窗口','计算说明里再看',''])assert.throws(()=>checkInterviewShort(forbidden),/natural prose/);
});

test('shared wood prose retains an explicit 卯 month and recalculates actual 2027 and 2028 day, void and date context',async()=>{
 const examples=[
  {date:'2027-03-20',day:'戊戌',empty:['辰','巳'],dates:['2027-03-30','2027-03-31']},
  {date:'2028-03-20',day:'甲辰',empty:['寅','卯'],dates:['2028-03-24','2028-03-25']}
 ];const contents=[];
 for(const example of examples){
  const out=await product.getContent({questionId:question.id,...context,monthOrder:undefined,monthBranch:'卯',castingDate:example.date,primaryId:5,movingLine:2});
  assert.equal(out.status,'ready');assert.equal(out.monthBranch,'卯');assert.equal(out.calculationExplanation.month.branch,'卯');
  assert.match(out.calculationExplanation.paragraphs[0],/^月令：卯月/);assert.ok(!out.calculationExplanation.paragraphs[0].includes('寅月'));
  assert.equal(out.calculationExplanation.void.dayGanzhi,example.day);assert.deepEqual(out.calculationExplanation.void.emptyBranches,example.empty);
  assert.equal(out.timingSection.castingDate,example.date);assert.deepEqual(out.timingSection.windows[0].displayedDates,example.dates);
  assert.ok(!JSON.stringify(out.calculationExplanation).includes('2026-11-11'));contents.push(out);
 }
 assert.equal(contents[0].short,contents[1].short);assert.notEqual(contents[0].timingSection.windows[0].text,contents[1].timingSection.windows[0].text);
});

test('legacy qi-only input never claims its representative lookup slot was the actual month',async()=>{
 const out=await product.getContent({questionId:question.id,...context,monthOrder:'spring-wood',primaryId:5,movingLine:2});
 assert.equal(out.status,'ready');assert.equal(out.monthBranch,null);assert.equal(out.calculationExplanation.month.branch,null);
 assert.equal(out.calculationExplanation.month.input,'qi-category-only');
 assert.match(out.calculationExplanation.paragraphs[0],/春木当令.*具体月令未提供/);
 assert.ok(!/月令：寅月/.test(out.calculationExplanation.paragraphs[0]));
});

test('lookup reads one hexagram shard and shared prose does not duplicate twelve full articles in memory',async()=>{
 const paths=[];const p=createProductRepository({library,readJSON:async path=>{paths.push(path);return read(path);}});
 for(const monthBranch of ['寅','卯','辰'])await p.getContent({questionId:question.id,...context,monthOrder:undefined,monthBranch,primaryId:5,movingLine:2});
 assert.deepEqual(paths.filter(p=>/\/hex-/.test(p)),['data/authored-readings/interview-pass/hex-005.json']);
 const file=all.find(f=>f.primaryId===5);assert.equal(file.rows.length,30);assert.equal(Object.keys(file.monthSlots).length,72);
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
