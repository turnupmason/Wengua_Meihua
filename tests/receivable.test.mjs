import test from 'node:test';
import assert from 'node:assert/strict';
import {loadLibrary,createQuestionRepository,getCivilDay} from '../src/index.js';
const library=await loadLibrary(),repo=createQuestionRepository({library,editorialPreview:true});
const opts={questionId:'domain-10-receivable',primaryId:48,movingLine:5,monthOrder:'winter-water'};
const dated={castingDate:'2026-11-12',timingScale:'day',timingContext:{castingMethod:'pre-heaven',periodMethod:'element-qi'}};

test('legacy editorial preview preserves stored text and moving-line binding without claiming approval',async()=>{
 const r=await repo.getContent({...opts,voidContext:{ganzhi:'己丑'}});
 assert.equal(r.status,'review-preview');assert.equal(r.verdict.code,'gain');
 assert.match(r.story,/井洌，寒泉食/);assert.equal(r.productionAllowed,false);assert.equal(r.audit.status,'pending-review');
 assert.ok(r.requiresDateResolution);
});

test('legacy preview calendar conversion derives day context and never inserts past dates; interpretation stays unapproved',async()=>{
 const r=await repo.getContent({...opts,...dated});
 assert.equal(r.status,'review-preview');assert.ok(!r.story.includes('{{date:'));
 assert.equal(r.dateResolution.dayGanzhi,getCivilDay(dated.castingDate).dayGanzhi);
 assert.ok(r.dateResolution.dateMatches.length);
 for(const event of r.dateResolution.dateMatches){assert.ok(event.event);assert.ok(event.valence);assert.equal(event.selectedCycle,null);for(const match of event.matches)assert.ok(match.date>=dated.castingDate);}
 assert.match(r.story,/本月14、17号/);assert.ok(!r.story.includes('本月8号'));
 await assert.rejects(repo.getContent({...opts,...dated,voidContext:{ganzhi:'甲子'}}),/disagree/);
});

test('month rollover and history labels retain the original chosen calendar window',async()=>{
 const o={...opts,...dated,primaryId:1,movingLine:1,castingDate:'2026-11-30'};
 const r=await repo.getContent(o);assert.equal(r.status,'review-preview');assert.match(r.story,/下月6、7号/);
 const history=await repo.getContent({...o,viewDate:'2027-01-12'});
 assert.match(history.story,/2026年12月6、7号/);
 assert.deepEqual(history.dateResolution.dateMatches.map(s=>s.displayedDates),r.dateResolution.dateMatches.map(s=>s.displayedDates));
});

test('static body void gets a named fill opportunity, not a fictional guaranteed payment day',async()=>{
 const r=await repo.getContent({...opts,...dated,primaryId:22,movingLine:5,castingDate:'2026-11-11'});
 assert.equal(r.verdict.code,'delay');assert.equal(r.status,'review-preview');
 assert.ok(r.dateResolution.dateMatches.some(s=>s.slotId==='fill'&&s.event==='催收填实转机'));
 assert.ok(!r.dateResolution.dateMatches.some(s=>s.slotId==='receipt'));
 assert.match(r.story,/本月16、28号/);
});

test('explicit true body void has its own complete manuscript and later fill does not revive it',async()=>{
 const o={...opts,primaryId:1,movingLine:5,monthOrder:'summer-fire',voidContext:{ganzhi:'甲子',roleEvidence:{body:{severelyWeak:true,dayMonthAttacked:true}}}};
 const before=await repo.getContent(o),after=await repo.getContent({...o,voidContext:{...o.voidContext,filledBranches:['戌','亥']}});
 assert.equal(before.status,'review-preview');assert.equal(before.verdict.code,'failure');
 assert.equal(before.reading.nodes.find(n=>n.role==='body_inherited').void.state,'true_void');
 assert.equal(before.reading.nodes.find(n=>n.role==='body_inherited').void,before.reading.nodes.find(n=>n.role==='body').void);
 if(after.status==='pending-authoring')assert.equal(after.story,null);
 else assert.equal(after.verdict.code,'failure');
});

test('unrecorded timing method and uncovered void releases do not silently reuse another story',async()=>{
 const manual=await repo.getContent({...opts,...dated,timingContext:{castingMethod:'manual',periodMethod:'element-qi'}});
 assert.equal(manual.status,'review-preview');assert.equal(manual.dateResolution.status,'requires-context');
 const released=await repo.getContent({...opts,primaryId:22,movingLine:5,voidContext:{ganzhi:'己丑',filledBranches:['午']}});
 assert.equal(released.status,'pending-authoring');assert.equal(released.story,null);
});
