import test from 'node:test';
import assert from 'node:assert/strict';
import {loadLibrary,createQuestionRepository,assessSeasonalQi,buildInterpretationEvidence,
 INTERPRETATION_POLICY_VERSION,AUDIT_CHECKS,evaluateInterpretationReview,interpretationArtifactDigest} from '../src/index.js';
const library=await loadLibrary();
const opts={questionId:'domain-10-receivable',primaryId:48,movingLine:5,monthOrder:'winter-water',castingDate:'2026-11-12',
 timingScale:'day',timingContext:{castingMethod:'pre-heaven',periodMethod:'element-qi'}};

test('all five elements use one qi rule, independent of whether they help or control the body',()=>{
 const tables={
  'spring-wood':{'木':'旺','火':'相','土':'死','金':'囚','水':'休'},
  'summer-fire':{'木':'休','火':'旺','土':'相','金':'死','水':'囚'},
  'autumn-metal':{'木':'死','火':'囚','土':'休','金':'旺','水':'相'},
  'winter-water':{'木':'相','火':'死','土':'囚','金':'休','水':'旺'},
  'seasonal-earth':{'木':'囚','火':'休','土':'旺','金':'相','水':'死'}
 };
 for(const [order,table] of Object.entries(tables))for(const [element,state] of Object.entries(table)){
  const qi=assessSeasonalQi(element,order);assert.equal(qi.state,state);assert.equal(qi.impliesNoEffect,false);assert.equal(qi.impliesTrueVoid,false);assert.equal(qi.numericMultiplier,null);
 }
 assert.throws(()=>assessSeasonalQi('水','11月'),/month qi/);
});

test('six positions share full strength evidence, inherited body is not a sixth independent force',()=>{
 const r=library.createReading({primaryId:48,movingLine:5,calendar:{season:'winter'},voidContext:{ganzhi:'己丑'}});
 const evidence=buildInterpretationEvidence(r,{monthOrder:'winter-water'});
 assert.equal(evidence.nodes.length,6);assert.equal(evidence.nodes.filter(n=>n.independent).length,5);
 for(const node of evidence.nodes)assert.deepEqual(node.strength,assessSeasonalQi(node.element,'winter-water'));
 for(const edge of evidence.directRelations)for(const node of edge.assessments)assert.equal(node.strength.policyVersion,INTERPRETATION_POLICY_VERSION);
 assert.deepEqual(evidence.appliedIndirectRules,[]);assert.equal(evidence.calendarBoundary.automaticCalendarSelection,false);
});

test('partial Kun void is only an annotation and never a computed whole-trigram or half-force effect',()=>{
 const r=library.createReading({primaryId:2,movingLine:1,calendar:{season:'winter'},voidContext:{ganzhi:'甲申'}});
 const kun=buildInterpretationEvidence(r,{monthOrder:'winter-water'}).nodes.find(n=>n.trigram==='坤');
 assert.deepEqual(kun.voidAnnotation.matchedBranches,['未']);assert.equal(kun.voidAnnotation.interpretiveImpact,'annotation-only;no-whole-trigram-or-fractional-effect');
});

test('existing generated manuscripts are withheld by default despite legacy reviewed flag and valid calendar',async()=>{
 const result=await createQuestionRepository({library}).getContent(opts);
 assert.equal(result.status,'pending-review');assert.equal(result.productionAllowed,false);assert.equal(result.story,null);assert.deepEqual(result.paragraphs,[]);
 assert.equal(result.audit.total,9);assert.equal(result.audit.passed,0);assert.equal(result.dateResolution,undefined);
 const preview=await createQuestionRepository({library,editorialPreview:true}).getContent(opts);
 assert.equal(preview.status,'review-preview');assert.equal(preview.productionAllowed,false);assert.equal(preview.dateResolution.interpretationReviewed,false);
 assert.ok(preview.story);assert.notEqual(preview.status,'ready');
});

test('question types separate reconciliation from marriage, and objects can share one method without including people',async()=>{
 const repo=createQuestionRepository({library});
 assert.notEqual((await repo.getQuestion('domain-05-reconcile')).question_type,(await repo.getQuestion('domain-05-marry')).question_type);
 assert.equal((await repo.getQuestion('domain-15-phone')).question_type,'lost_object_recovery');
 assert.equal((await repo.getQuestion('domain-15-wallet')).question_type,'lost_object_recovery');
 assert.notEqual((await repo.getQuestion('domain-12-return-trip')).question_type,(await repo.getQuestion('domain-13-family-return')).question_type);
 await assert.rejects(repo.getQuestion('domain-15-missing-person'),/Unknown/);
 await assert.rejects(repo.getContent({...opts,question_type:'marriage_completion'}),/question_type/);
});

test('only exact content-bound reviews with all nine evidence entries qualify; no wildcards or partial passes',async()=>{
 const digest=await interpretationArtifactDigest({paragraphs:['审查测试，不是正式断语']});
 assert.notEqual(digest,await interpretationArtifactDigest({paragraphs:['内容已改动']}));
 const binding={questionId:opts.questionId,question_type:'receivable_collection',key:'test-key',contextKey:'test-context',profileKey:'test-profile',
  artifactDigest:digest,contentVersion:library.contentVersion,policyVersion:INTERPRETATION_POLICY_VERSION,timingKey:'exact-timing-context'};
 const record={binding,status:'approved',reviewer:'test-fixture-only',reviewedAt:'2026-11-11T12:00:00Z',
  checks:Object.fromEntries(AUDIT_CHECKS.map(id=>[id,{status:'pass',evidence:[{sourceId:'test-fixture',locator:id,reason:'Tests evidence shape only; not a classical rule approval'}]}]))};
 const registry={policyVersion:INTERPRETATION_POLICY_VERSION,records:[record]};
 assert.equal(evaluateInterpretationReview(registry,binding).status,'approved');
 for(const field of Object.keys(binding))assert.equal(evaluateInterpretationReview(registry,{...binding,[field]:'other'}).status,'pending-review');
 const partial=structuredClone(registry);partial.records[0].checks[AUDIT_CHECKS[8]].evidence=[];
 assert.equal(evaluateInterpretationReview(partial,binding).passed,8);assert.equal(evaluateInterpretationReview(partial,binding).status,'pending-review');
 assert.equal(evaluateInterpretationReview({...registry,records:[record,record]},binding).status,'pending-review');
 assert.equal(evaluateInterpretationReview(registry,{}).status,'pending-review');
});
