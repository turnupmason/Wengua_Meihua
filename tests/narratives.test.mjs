import test from 'node:test';
import assert from 'node:assert/strict';
import {loadLibrary,createNarrativeRepository,MONTH_ORDERS,buildTimingPlan} from '../src/index.js';
const lib=await loadLibrary(),stories=createNarrativeRepository({library:lib});
const orderStates={spring:{strong:'木',weak:'土'},summer:{strong:'火',weak:'金'},autumn:{strong:'金',weak:'木'},winter:{strong:'水',weak:'火'},earth:{strong:'土',weak:'水'}};
test('all 1,920 prewritten stories use legal dependent charts, explicit qi orders and all four root relations',async()=>{
 const ids=new Set(),mutuals=new Set();
 for(let id=1;id<=64;id++)for(let line=1;line<=6;line++)for(const order of MONTH_ORDERS){
  const s=await stories.getBase({primaryId:id,movingLine:line,monthOrder:order.id}),r=lib.createReading({primaryId:id,movingLine:line,calendar:{season:order.season}});
  ids.add(s.id);mutuals.add(s.stageIds[1]);assert.deepEqual(s.stageIds,[id,r.stages.mutual.id,r.stages.changed.id]);
  assert.equal(s.paragraphs.length,3);assert.ok(s.paragraphs.every(p=>p.length>60));assert.equal(s.relations.length,4);assert.equal(s.nodes.length,6);
  for(const n of s.nodes){const expected=n.element===orderStates[order.season].strong?'strong':n.element===orderStates[order.season].weak?'weak':'not_explicit';assert.equal(n.state,expected);}
  assert.deepEqual(s.baseGrades,Object.values(r.stages).map(p=>p.baseGrade));
  assert.ok(!/果然|百分百|必然发生|第二天就|次日便/.test(s.story));
 }
 assert.equal(ids.size,1920);assert.equal(mutuals.size,16);
});
test('specific domain rules preserve the food exception and all 18 domains resolve to their own source',async()=>{
 let example;
 for(let id=1;id<=64&&!example;id++)for(let p=1;p<=6;p++){
  const r=lib.createReading({primaryId:id,movingLine:p});if(r.edges.find(e=>e.targetRole==='use').type==='body_controls_use'){example={primaryId:id,movingLine:p};break;}
 }
 const food=await stories.getStory({...example,monthOrder:'spring-wood',domainId:'domain-07'});assert.ok(food.story.includes('饮食有阻'));
 const foodMiddle=await stories.getStory({primaryId:42,movingLine:4,monthOrder:'spring-wood',domainId:'domain-07'});assert.ok(foodMiddle.story.includes('都有饮食受阻之意'));
 for(const d of lib.listDomains()){const s=await stories.getStory({...example,monthOrder:'summer-fire',domainId:d.id});assert.equal(s.domainId,d.id);assert.ok(s.sourceIds.includes(d.sectionId));assert.equal(s.reportedOutcome,null);}
 const sky=await stories.getStory({...example,monthOrder:'spring-wood',domainId:'domain-01'});assert.ok(sky.story.includes('天时占不分体用'));assert.ok(!sky.story.includes('你与事情之间有可供掌握'));
});
test('true void cannot be revived by later fills; moving empty use retains influence',async()=>{
 const opts={primaryId:1,movingLine:1,monthOrder:'summer-fire',domainId:'domain-10',voidContext:{ganzhi:'甲子',roleEvidence:{body:{severelyWeak:true,dayMonthAttacked:true}},filledBranches:['戌','亥']},timingScale:'day'};
 const s=await stories.getStory(opts);assert.equal(s.reading.nodes.find(n=>n.isBody).void.state,'true_void');assert.equal(s.timing.voidWindows.length,0);assert.ok(s.story.includes('不自动恢复'));
 assert.ok(s.paragraphs[0].includes('体卦真空'));assert.ok(!s.story.includes('有争取财利的空间'));assert.equal(s.compositionVersion,'1.2.0');
 const moving=await stories.getStory({...opts,voidContext:{ganzhi:'甲子'}});assert.equal(moving.voidNotes.find(n=>n.role==='use').state,'moving_exempt');assert.ok(moving.story.includes('正在发动，仍按有作用论'));
 const monthly=lib.createReading({primaryId:1,movingLine:1,calendar:{season:'earth'},voidContext:{ganzhi:'甲子'}});assert.equal(monthly.nodes.find(n=>n.isBody).void.state,'supported');assert.ok(monthly.nodes.find(n=>n.isBody).supportEvidence.some(e=>e.basis==='month-qi'));
 const daily=lib.createReading({primaryId:1,movingLine:1,calendar:{season:'summer'},voidContext:{ganzhi:'甲辰'}});assert.ok(daily.nodes.find(n=>n.isBody).supportEvidence.some(e=>e.basis==='day-branch'));
});
test('empty static mutual pressure is weakened without overwriting the fixed hexagram grades',async()=>{
 const s=await stories.getStory({primaryId:9,movingLine:4,monthOrder:'winter-water',voidContext:{ganzhi:'甲申',roleEvidence:{use_mutual:{severelyWeak:true,dayMonthAttacked:true}}}});
 const note=s.voidNotes.find(n=>n.role==='use_mutual');assert.equal(note.state,'true_void');assert.ok(note.text.includes('减轻该项克体压力'));assert.equal(s.reading.stages.primary.baseGrade,lib.getHexagram(9).grade.rawGrade);
 assert.ok(s.timing.blocked.some(b=>b.role==='use_mutual'));
});
test('fill then clash priority, conditional combine, and relative days are explicit',async()=>{
 const common={primaryId:1,movingLine:1,monthOrder:'autumn-metal',domainId:'domain-05',voidContext:{ganzhi:'甲子'},timingScale:'day'};
 const normal=await stories.getStory(common);assert.equal(normal.timing.voidWindows[0].mechanism,'fill');
 assert.equal(normal.timing.voidWindows.find(w=>w.branch==='戌'&&w.mechanism==='fill').afterDays,10);
 assert.equal(normal.timing.voidWindows.find(w=>w.branch==='辰'&&w.mechanism==='clash').afterDays,4);
 assert.ok(!normal.timing.voidWindows.some(w=>w.mechanism==='combine'));assert.deepEqual(normal.timing.gregorianDates,[]);
 const enabled=await stories.getStory({...common,voidContext:{ganzhi:'甲子',allowCombine:true,eventType:'marriage'}});assert.ok(enabled.timing.voidWindows.some(w=>w.mechanism==='combine'));
 const absent=await stories.getStory({primaryId:1,movingLine:1,monthOrder:'spring-wood'});assert.equal(absent.timing.dayGanzhi,null);assert.ok(absent.timing.qiWindows.every(w=>!('afterDays' in w)));
  const hour=await stories.getStory({...common,voidContext:{ganzhi:'甲子',basis:'hour-explicit-input'}});assert.equal(hour.timing.dayGanzhi,null);assert.ok(hour.timing.voidWindows.every(w=>!('afterDays' in w)));
  await assert.rejects(stories.getStory({...common,voidContext:{ganzhi:'甲子',roleEvidence:{body:{ganzhi:'甲戌'}}}}),/Mixed void ganzhi/);
});
test('numerical timing requires the original method and observed motion, not just a matching hexagram',async()=>{
 const context={method:'object-direction-hour',objectTrigramNumber:1,directionTrigramNumber:5,hourBranchNumber:4,motion:'walking'};
 const s=await stories.getStory({primaryId:44,movingLine:4,monthOrder:'spring-wood',timingScale:'day',castContext:context});assert.equal(s.timing.numericalWindow.count,5);
 const bare=await stories.getStory({primaryId:44,movingLine:4,monthOrder:'spring-wood',timingScale:'day'});assert.equal(bare.timing.numericalWindow,null);
 await assert.rejects(stories.getStory({primaryId:44,movingLine:5,monthOrder:'spring-wood',timingScale:'day',castContext:context}),/does not reproduce/);
});
test('book cases keep exact feedback, missing outcomes, and the 21-day prediction versus 20-day report',async()=>{
 const cases=await stories.getClassicalCases();assert.equal(cases.length,10);assert.equal(cases.reduce((n,c)=>n+c.charts.length,0),11);
 for(const c of cases){assert.ok(c.sourceText.includes(c.prediction.text));if(c.feedback)assert.ok(c.sourceText.includes(c.feedback.text));for(const x of c.charts){assert.equal(lib.getMutualHexagram(x.primaryId).id,x.mutualId);assert.equal(lib.getChangedHexagram(x.primaryId,x.movingLine).id,x.changedId);}}
 assert.equal(cases.find(c=>c.sourceSectionId==='mh-034').feedback,null);
 const cow=cases.find(c=>c.sourceSectionId==='mh-041');assert.equal(cow.timing.prediction.count,21);assert.equal(cow.timing.reported.count,20);
 const identical=await stories.getClassicalCases({primaryId:44,movingLine:4});assert.equal(identical.length,2);assert.notEqual(identical[0].feedback.text,identical[1].feedback.text);
});
test('unsupported month keys, alternative mutual policies and invalid timing scales fail explicitly',async()=>{
 await assert.rejects(stories.getBase({primaryId:1,movingLine:1,monthOrder:'寅'}),/monthOrder/);
 await assert.rejects(stories.getBase({primaryId:1,movingLine:1,monthOrder:'spring-wood',mutualPolicy:'pure-use-changed'}),/inner-lines/);
 assert.throws(()=>buildTimingPlan(lib.createReading({primaryId:1,movingLine:1}),{timingScale:'guessed'}));
 assert.throws(()=>{MONTH_ORDERS[0].label='bad';});
});

test('all public stories end in a domain verdict, include the exact moving line, and expose four relation checks without hedge boilerplate',async()=>{
 const domains=lib.listDomains().filter(d=>!['domain-01','domain-06','domain-16'].includes(d.id));
 let count=0;
 for(let id=1;id<=64;id++)for(let line=1;line<=6;line++)for(const order of MONTH_ORDERS){
  for(const d of domains){
   const s=await stories.getStory({primaryId:id,movingLine:line,monthOrder:order.id,domainId:d.id,voidContext:{ganzhi:'甲子'},timingScale:'day'});
   assert.ok(s.verdict.summary.length>4);assert.notEqual(s.verdict.code,'reference-only');
   assert.ok(s.story.includes('所以这卦断：'+s.verdict.summary));
   assert.equal(s.movingLine.hexagramId,id);assert.equal(s.movingLine.position,line);
   assert.equal(s.movingLine.text,lib.getLineReading(id,line).text);assert.ok(s.story.includes(s.movingLine.text));
   assert.equal(s.movingLine.toTrigram,s.reading.nodes.find(n=>n.role==='changed_use').trigram);
   assert.equal(s.verdict.relationEvidence.length,4);assert.equal(s.verdict.finalRelation,s.reading.edges.find(e=>e.targetRole==='changed_use').type);
   assert.ok(!/可以观察|需要一起看|需要结合|画面转为|承接条件|势头正盛/.test(s.story),s.id+' '+d.id);
   assert.ok(s.timingDecision.windows.length<=2);assert.equal(s.reportedOutcome,null);
   for(const w of s.timingDecision.windows){assert.ok([...s.timing.voidWindows,...s.timing.qiWindows].some(x=>x.branch===w.branch&&x.role===w.role));}
   count++;
  }
 }
 assert.equal(count,28800);
});
test('direct result and timing respect true void, true-void pressure, weak support, and moving/strong empty exemptions',async()=>{
 const weak=await stories.getStory({primaryId:49,movingLine:1,monthOrder:'spring-wood',domainId:'domain-10',voidContext:{ganzhi:'甲子'},timingScale:'day'});
 assert.equal(weak.verdict.code,'gain');assert.ok(weak.verdict.summary.includes('所得不多'));
 assert.ok(weak.timingDecision.windows.every(w=>w.role==='changed_use')); // Empty mutual support is not a mandatory final wait.
 const root=await stories.getStory({primaryId:1,movingLine:1,monthOrder:'summer-fire',domainId:'domain-10',voidContext:{ganzhi:'甲子',roleEvidence:{body:{severelyWeak:true,dayMonthAttacked:true}}},timingScale:'day'});
 assert.equal(root.verdict.code,'failure');assert.equal(root.timingDecision.kind,'requires-context');assert.equal(root.timingDecision.windows.length,0);
 const strong=await stories.getStory({primaryId:22,movingLine:5,monthOrder:'summer-fire',domainId:'domain-14',voidContext:{ganzhi:'甲申'},timingScale:'day'});
 assert.equal(strong.reading.nodes.find(n=>n.isBody).void.state,'strong_exempt');assert.equal(strong.timingDecision.kind,'requires-context');assert.ok(strong.timing.events.some(e=>e.eligible&&e.role==='changed_use'));
 assert.ok(strong.movingLine.text.includes('终吉'));assert.ok(strong.verdict.summary.includes('能见到'));
 const dynamic=await stories.getStory({primaryId:28,movingLine:2,monthOrder:'summer-fire',domainId:'domain-03',voidContext:{ganzhi:'甲午'},timingScale:'day'});
 assert.equal(dynamic.reading.nodes.find(n=>n.role==='use').void.state,'moving_exempt');assert.notEqual(dynamic.timingDecision.kind,'fill');
});
