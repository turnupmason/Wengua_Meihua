import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {loadLibrary,createQuestionRepository,createProductRepository} from '../src/index.js';
const library=await loadLibrary(),repo=createProductRepository({library});
const read=async p=>JSON.parse(await readFile(new URL('../'+p,import.meta.url),'utf8'));
const dated={primaryId:48,movingLine:5,monthOrder:'winter-water',castingDate:'2026-11-11',timingScale:'day',timingContext:{castingMethod:'pre-heaven',periodMethod:'element-qi'}};

test('user-selected six categories and all 52 named subcategories retain their order, with atomic question IDs',async()=>{
 const c=await repo.getCatalog();
 assert.deepEqual(c.categories.map(c=>c.label),['事业工作','财富财运','感情姻缘','健康疾病','家庭家宅','寻人失物']);
 assert.deepEqual(c.categories.map(c=>c.subcategories.length),[8,9,10,8,9,8]);
 assert.deepEqual(c.categories[0].subcategories.map(s=>s.label),['求职面试','升职加薪','跳槽去留','工作稳定','职场人际','考试考核','项目事业','竞聘选拔']);
 assert.deepEqual(c.categories[2].subcategories.map(s=>s.label),['暗恋心意','暧昧发展','表白追求','恋爱关系','冷战矛盾','分手复合','桃花正缘','谈婚论嫁','婚姻家庭','异地恋情']);
 const questions=c.categories.flatMap(c=>c.subcategories).flatMap(s=>s.questions);
 assert.equal(questions.length,81);assert.equal(new Set(questions.map(q=>q.id)).size,81);
 assert.equal(c.classicalDomainCount,18);assert.equal(library.listDomains().length,18);
 assert.equal(c.selectionPolicy.aiClassification,false);assert.equal(c.selectionPolicy.freeTextChangesQuestion,false);
 for(const category of c.categories)for(const sub of await repo.listSubcategories(category.id))assert.deepEqual(await repo.listQuestions(sub.id),sub.questions);
});

test('distinct outcomes stay distinct; same lost-object goal may share a type through explicit object context',async()=>{
 for(const [a,b] of [['career.interview.interview-pass','career.interview.job-offer'],['career.promotion-pay.promotion','career.promotion-pay.pay-rise'],['wealth.selling.sale','wealth.selling.price'],['relationships.reconciliation.reconcile','relationships.reconciliation.stability']])
  assert.notEqual((await repo.getQuestion(a)).question_type,(await repo.getQuestion(b)).question_type);
 assert.equal((await repo.getQuestion('search.lost-object.recovery')).question_type,(await repo.getQuestion('search.valuables.recovery')).question_type);
 assert.notEqual((await repo.getQuestion('search.pets.recovery')).question_type,'lost_object_recovery');
 assert.notEqual((await repo.getQuestion('search.missing-contact.contact')).question_type,'traveller_return');
});

test('only explicit exact question links delegate; interview and unrecorded objects never fall back to offer or wallet',async()=>{
 const real=createQuestionRepository({library}),calls=[];
 const fake={getQuestion:id=>real.getQuestion(id),getContent:async options=>{calls.push(options);return {status:'pending-review',selection:{questionId:options.questionId},story:null,paragraphs:[],productionAllowed:false};}};
 const product=createProductRepository({library,questionRepository:fake});
 assert.equal((await product.getContent({questionId:'career.interview.interview-pass',...dated})).status,'pending-authoring');assert.equal(calls.length,0);
 const offer=await product.getContent({questionId:'career.interview.job-offer',...dated});
 assert.equal(calls.at(-1).questionId,'domain-09-job-offer');assert.equal(offer.selection.questionId,'career.interview.job-offer');assert.equal(offer.legacySelection.questionId,'domain-09-job-offer');
 const needed=await product.getContent({questionId:'search.valuables.recovery',...dated});assert.equal(needed.status,'requires-context');assert.deepEqual(needed.missingContext,['objectKind']);
 await product.getContent({questionId:'search.valuables.recovery',context:{objectKind:'phone'},...dated});assert.equal(calls.at(-1).questionId,'domain-15-phone');
 const before=calls.length;
 assert.equal((await product.getContent({questionId:'search.lost-object.recovery',context:{objectKind:'other'},...dated})).status,'pending-authoring');
 assert.equal((await product.getContent({questionId:'search.pets.recovery',...dated})).status,'pending-authoring');assert.equal(calls.length,before);
});

test('all eight health branches provide reference text without casting, severity grades, clinical forecasts or story fallback',async()=>{
 const health=await repo.listSubcategories('health');
 for(const sub of health)for(const q of sub.questions){
  const r=await repo.getContent({questionId:q.id});assert.equal(r.status,'reference');assert.equal(r.predictionAllowed,false);
  assert.equal(r.reading,undefined);assert.equal(r.verdict,undefined);assert.equal(r.dateResolution,undefined);assert.ok(r.paragraphs.length);
  assert.ok(r.practicalAdvice.length);assert.ok(r.sourceSections.every(Boolean));
 }
});

test('affection and missing-person questions do not inherit marriage, lost-object or traveller-return predictions',async()=>{
 const affection=await repo.getContent({questionId:'relationships.affection.affection',...dated});
 assert.equal(affection.status,'pending-authoring');assert.match(affection.selection.answerScope,/不核实对方真实心理/);
 const missing=await repo.getContent({questionId:'search.missing-contact.contact',...dated});
 assert.equal(missing.status,'pending-authoring');assert.equal(missing.story,null);assert.equal(missing.reading,undefined);assert.ok(missing.practicalAdvice.some(p=>p.includes('警方')));
 const leads=await repo.getContent({questionId:'search.person-leads.guidance'});assert.equal(leads.status,'guidance');assert.equal(leads.predictionAllowed,false);assert.equal(leads.provesLocation,false);
 const direction=await repo.getContent({questionId:'search.direction.symbolism'});assert.equal(direction.status,'reference');assert.equal(direction.provesLocation,false);
});

test('question context, selection identity and legacy type tampering fail before incorrect content can be served',async()=>{
 await assert.rejects(repo.getContent({questionId:'wealth.debt.receivable',categoryId:'career'}),/mismatch/);
 await assert.rejects(repo.getContent({questionId:'wealth.debt.receivable',text:'猜一个问题'}),/fixed product/);
 await assert.rejects(repo.getContent({questionId:'wealth.debt.receivable',legacyQuestionId:'domain-15-wallet'}),/legacy override/);
 await assert.rejects(repo.getContent({questionId:'search.valuables.recovery',context:{objectKind:'person'}}),/context value/);
 await assert.rejects(repo.getContent({questionId:'wealth.debt.receivable',context:{hiddenQuestion:'other'}}),/context field/);
 const annual=await repo.getContent({questionId:'career.promotion-pay.pay-rise',context:{targetYear:2027}});assert.match(annual.selection.question,/2027年/);
 const c=await read('data/product-categories.json');c.categories[0].subcategories[0].questions[0].legacyQuestionId='domain-09-job-offer';
 const tampered=createProductRepository({library,readJSON:async p=>p==='data/product-categories.json'?c:read(p)});
 await assert.rejects(tampered.getCatalog(),/changes question meaning/);
 const badSource=await read('data/product-categories.json');badSource.categories[3].subcategories[0].questions[0].sourceSections[0].sectionId='mh-071';
 await assert.rejects(createProductRepository({library,readJSON:async p=>p==='data/product-categories.json'?badSource:read(p)}).getCatalog(),/source identity/);
});

test('user acceptance binds all ten unchanged sample digests and does not request another style approval',async()=>{
 const acceptance=await read('data/editorial-acceptance.json'),samples=await read('data/ten-readings-v3.json');
 assert.equal(acceptance.userStatement,'通过了。保持这样。');assert.equal(acceptance.noRepeatedStyleApprovalRequired,true);
 assert.equal(acceptance.samples.length,10);
 for(const a of acceptance.samples)assert.equal(samples.items.find(s=>s.number===a.number).artifactDigest,a.artifactDigest);
 assert.equal(acceptance.scope.void,'not-applied');assert.equal(acceptance.scope.timing,'not-derived');
});
