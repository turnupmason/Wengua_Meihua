import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {loadLibrary,createNarrativeRepository,buildTimingPlan,selectAuditedTiming,DOMAIN_TIMING_SPECS,TRIGRAM_PERIOD_SPECS} from '../src/index.js';
const lib=await loadLibrary(),repo=createNarrativeRepository({library:lib});
const get=p=>readFile(new URL('../'+p,import.meta.url),'utf8').then(JSON.parse);
const context={castingMethod:'pre-heaven',periodMethod:'element-qi'};
test('18 timing profiles and 27 clauses reproduce exact supplied passages, with eight distinct trigram sequences',async()=>{
 const audit=await get('data/timing-audit.json'),sections=new Map(lib.listSections().map(s=>[s.id,s]));
 assert.equal(audit.domains.length,18);assert.equal(new Set(audit.domains.map(d=>d.id)).size,18);assert.equal(audit.rules.length,27);
 for(const r of [...audit.rules,...audit.trigramPeriods]){
  const s=sections.get(r.sectionId);assert.equal(s.text.slice(r.evidence.quoteOffsetInSection,r.evidence.quoteOffsetInSection+r.quote.length),r.quote);
 }
 for(const d of audit.domains){assert.equal(sections.get(d.sectionId).text,d.source.quote);assert.deepEqual(d.eventLabels,DOMAIN_TIMING_SPECS.find(p=>p.id===d.id).eventLabels);}
 assert.equal(audit.retrievals.length,3);assert.ok(audit.retrievals.every(r=>r.httpStatus===200));
 assert.deepEqual(TRIGRAM_PERIOD_SPECS.find(p=>p.trigram==='乾').branches,['戌','亥']);
 assert.deepEqual(TRIGRAM_PERIOD_SPECS.find(p=>p.trigram==='兑').branches,['酉']);
});
test('trade event, polarity, method and date-cycle selection stay separate',async()=>{
 const s=await repo.getStory({primaryId:42,movingLine:4,monthOrder:'spring-wood',domainId:'domain-11',voidContext:{ganzhi:'甲戌'},timingScale:'day',timingContext:context});
 assert.equal(s.timingDecision.event.label,'交易不成');assert.equal(s.timingDecision.event.valence,'凶');
 assert.deepEqual(s.timingDecision.period.branches,['申','酉']);assert.equal(s.timingDecision.period.selectedCycle,null);
 assert.ok(!/第10|第11|第十|第十一/.test(s.timingDecision.text));
 const dates=s.timing.calendarOccurrences.filter(x=>x.eventId===s.timingDecision.event.id&&x.periodMethod==='element-qi');
 assert.deepEqual(dates.map(d=>d.nextAfterDays),[10,11]);assert.ok(dates.every(d=>d.selectedAsEventDate===false));
 const tri=await repo.getStory({primaryId:42,movingLine:4,monthOrder:'spring-wood',domainId:'domain-11',voidContext:{ganzhi:'甲戌'},timingScale:'day',timingContext:{...context,periodMethod:'trigram-periods'}});
 assert.deepEqual(tri.timingDecision.period.branches,['戌','亥']);assert.ok(tri.timingDecision.sourceIds.includes('mh-052'));
});
test('true body void still permits adverse periods and properly supplied numerical adverse timing',async()=>{
 const voidContext={ganzhi:'甲子',roleEvidence:{body:{severelyWeak:true,dayMonthAttacked:true}}};
 const s=await repo.getStory({primaryId:1,movingLine:5,monthOrder:'summer-fire',domainId:'domain-10',voidContext,timingScale:'day',timingContext:context});
 assert.equal(s.reading.nodes.find(n=>n.isBody).void.state,'true_void');assert.equal(s.timingDecision.event.valence,'凶');
 assert.deepEqual(s.timingDecision.period.branches,['巳','午']);assert.ok(s.timing.qiWindows.filter(w=>w.role==='changed_use').every(w=>w.active));
 assert.equal(s.timing.voidWindows.length,0);assert.ok(s.timingDecision.event.label.includes('无财'));
 const count=await repo.getStory({primaryId:1,movingLine:1,monthOrder:'summer-fire',domainId:'domain-10',voidContext,timingScale:'day',
  castContext:{method:'object-direction-hour',objectTrigramNumber:1,directionTrigramNumber:1,hourBranchNumber:11,motion:'standing'},
  timingContext:{castingMethod:'post-heaven',periodMethod:'numerical',numericalApplicability:true}});
 assert.equal(count.timingDecision.kind,'audited-number');assert.equal(count.timing.numericalWindow.count,13);
 assert.equal(count.timingDecision.event.valence,'凶');assert.ok(count.timingDecision.text.includes('求财无所得'));
});
test('wealth loss and no gain are different events and both loss/drain and gain/control routes exist',()=>{
 const found={control:false,drain:false};
 for(let id=1;id<=64;id++)for(let line=1;line<=6;line++){
  const r=lib.createReading({primaryId:id,movingLine:line,domainId:'domain-10',voidContext:{ganzhi:'甲子'}}),p=buildTimingPlan(r,{timingScale:'day',timingContext:context});
  for(const e of p.events){
   if(e.relation==='body_controls_use'){found.control=true;assert.ok(e.periods.length);assert.ok(e.ruleIds.includes('wealth-control-gain'));}
   if(e.relation==='body_generates_use'){found.drain=true;assert.ok(e.periods.length);assert.ok(e.ruleIds.includes('wealth-drain-loss'));}
  }
  const failure=p.events.find(e=>e.relation==='use_controls_body'&&e.outcomeKind==='failure');
  if(failure){assert.equal(failure.event,'无财可得');assert.ok(p.events.some(e=>e.role===failure.role&&e.outcomeKind==='loss'&&e.event==='破财'));}
 }
 assert.ok(found.control&&found.drain);
});
test('marriage and burial quality periods are not forced into completion days',()=>{
 for(const domainId of ['domain-05','domain-18']){
  const r=lib.createReading({primaryId:1,movingLine:4,domainId,voidContext:{ganzhi:'甲子'}});
  const day=buildTimingPlan(r,{timingScale:'day',timingContext:context});assert.ok(day.events.every(e=>!e.eligible));
  const month=buildTimingPlan(r,{timingScale:'month',timingContext:context});assert.ok(month.events.some(e=>e.eligible&&e.valence==='吉'));
  assert.ok(month.events.every(e=>e.status==='period-quality-only'));assert.equal(month.calendarOccurrences.length,0);
 }
});
test('production follows use-trigram sequence in references, weather does not use body/use event rules, health has no clinical dates',()=>{
 for(const d of DOMAIN_TIMING_SPECS){
  const r=lib.createReading({primaryId:42,movingLine:4,domainId:d.id,voidContext:{ganzhi:'甲戌'}}),p=buildTimingPlan(r,{timingScale:'day',timingContext:context});
  assert.equal(p.domainTimingProfile.id,d.id);
  if(d.id==='domain-06'){assert.equal(p.referenceMethods[0].targetRole,'use');assert.equal(p.referenceMethods[0].trigram,r.use.trigram);assert.equal(p.events.length,0);}
  if(['domain-01','domain-16'].includes(d.id)){assert.equal(p.events.length,0);assert.ok(p.referenceMethods.length);}
 }
});
test('fame body fallback requires no controlling trigram and office-risk scope remains distinct',()=>{
 const noControl=lib.createReading({primaryId:12,movingLine:3,domainId:'domain-09',voidContext:{ganzhi:'甲子'}});
 const p=buildTimingPlan(noControl,{timingScale:'day',timingContext:context});assert.ok(p.events.some(e=>e.id.endsWith('body-period')));
 const controlled=lib.createReading({primaryId:42,movingLine:4,domainId:'domain-09',voidContext:{ganzhi:'甲戌'}});
 const q=buildTimingPlan(controlled,{timingScale:'day',timingContext:{...context,eventKind:'office-risk'}});
 assert.ok(!q.events.some(e=>e.id.endsWith('body-period')));assert.ok(q.events.every(e=>e.event==='在任职务不利'));
});
test('arrival timing is not replaced by a dated non-return event; delay counts are durations, not dates',()=>{
 const r=lib.createReading({primaryId:42,movingLine:4,domainId:'domain-13',voidContext:{ganzhi:'甲戌'}}),p=buildTimingPlan(r,{timingScale:'day',timingContext:context});
 const decision=selectAuditedTiming(r,p,{code:'failure'});assert.equal(decision.event,null);
 const mixed=lib.createReading({primaryId:49,movingLine:1,domainId:'domain-02',voidContext:{ganzhi:'甲子'}}),plan=buildTimingPlan(mixed,{timingScale:'day',timingContext:context});
 assert.ok(plan.relativePace.some(p=>p.role==='changed_use'&&p.pace==='稍迟'&&p.absoluteDays===null));
 assert.ok(plan.obstructionDurations.every(p=>p.kind==='delay-duration'&&p.eventDate===null&&p.notAdditive));
});
test('today scope prevents blindly turning total thirteen into thirteen days; clock hours do not use day offsets',async()=>{
 const s=await repo.getStory({primaryId:1,movingLine:1,monthOrder:'summer-fire',domainId:'domain-10',voidContext:{ganzhi:'甲子'},timingScale:'day',
  castContext:{method:'object-direction-hour',objectTrigramNumber:1,directionTrigramNumber:1,hourBranchNumber:11,motion:'standing'},
  timingContext:{castingMethod:'post-heaven',periodMethod:'numerical',eventWindow:'today',numericalApplicability:true}});
 assert.notEqual(s.timingDecision.kind,'audited-number');assert.ok(s.timing.missing.some(m=>m.includes('急缓')));
 const r=lib.createReading({primaryId:42,movingLine:4,domainId:'domain-11',voidContext:{ganzhi:'甲戌'}}),p=buildTimingPlan(r,{timingScale:'hour',timingContext:context});
 assert.equal(p.calendarOccurrences.length,0);assert.ok(p.qiWindows.every(w=>!('afterDays' in w)));
 assert.throws(()=>buildTimingPlan(r,{timingScale:'day',timingContext:{castingMethod:'pre-heaven',periodMethod:'numerical'}}),/post-heaven/);
});
