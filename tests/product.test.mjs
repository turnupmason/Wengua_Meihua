import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {loadLibrary,createQuestionRepository,createProductRepository} from '../src/index.js';
const library=await loadLibrary(),repo=createProductRepository({library});
const read=async p=>JSON.parse(await readFile(new URL('../'+p,import.meta.url),'utf8'));
const dated={primaryId:48,movingLine:5,monthOrder:'winter-water',castingDate:'2026-11-11',timingScale:'day',timingContext:{castingMethod:'pre-heaven',periodMethod:'element-qi'}};

test('six domains and 31 navigation entries match the new names and order',async()=>{
 const c=await repo.getCatalog();
 assert.deepEqual(c.categories.map(c=>c.label),['事业工作','财富财运','感情姻缘','健康疾病','家庭家宅','寻人失物']);
 assert.deepEqual(c.categories.map(c=>c.subcategories.map(s=>s.label)),[
  ['求职录用','晋升加薪','跳槽去留','职场情况','考试选拔','项目任务'],
  ['财运收入','投资理财','经营合作','订单合同','借款尾款','买卖求财'],
  ['桃花心意','暧昧表白','恋爱发展','矛盾复合','谈婚论嫁','夫妻婚姻'],
  ['身体象意','病势象意','诊疗康复','家人健康'],
  ['房屋买卖','租住环境','搬家迁居','装修建造','家庭亲子'],
  ['物品找回','方向原因','宠物走失','失联寻人']
 ]);
 const questions=c.categories.flatMap(c=>c.subcategories).flatMap(s=>s.questions);
 assert.equal(questions.length,83);assert.equal(new Set(questions.map(q=>q.id)).size,83);
 assert.equal(c.subcategoryCount,31);
 assert.equal(c.classicalDomainCount,18);assert.equal(library.listDomains().length,18);
 assert.equal(c.selectionPolicy.aiClassification,false);assert.equal(c.selectionPolicy.freeTextChangesQuestion,false);
 for(const category of c.categories)for(const sub of await repo.listSubcategories(category.id))assert.deepEqual(await repo.listQuestions(sub.id),sub.questions);
});

test('distinct outcomes stay distinct; same lost-object goal may share a type through explicit object context',async()=>{
 for(const [a,b] of [['career.interview.interview-pass','career.interview.job-offer'],['career.promotion-pay.promotion','career.promotion-pay.pay-rise'],['wealth.selling.sale','wealth.selling.price'],['relationships.reconciliation.reconcile','relationships.reconciliation.stability'],['relationships.conflict.reunite','relationships.conflict.improvement']])
  assert.notEqual((await repo.getQuestion(a)).question_type,(await repo.getQuestion(b)).question_type);
 assert.equal((await repo.getQuestion('search.lost-object.recovery')).question_type,(await repo.getQuestion('search.valuables.recovery')).question_type);
 assert.equal((await repo.getQuestion('search.valuables.recovery')).subcategoryId,'search.lost-object');
 assert.equal((await repo.getQuestion('career.work-relations.leader')).subcategoryId,'career.workplace');
 assert.notEqual((await repo.getQuestion('search.pets.recovery')).question_type,'lost_object_recovery');
 assert.notEqual((await repo.getQuestion('search.missing-contact.contact')).question_type,'traveller_return');
});

test('only explicit exact question links delegate; interview and unrecorded objects never fall back to offer or wallet',async()=>{
 const real=createQuestionRepository({library}),calls=[];
 const fake={getQuestion:id=>real.getQuestion(id),getContent:async options=>{calls.push(options);return {status:'pending-review',selection:{questionId:options.questionId},story:null,paragraphs:[],productionAllowed:false};}};
 const product=createProductRepository({library,questionRepository:fake});
 assert.equal((await product.getContent({questionId:'career.interview.interview-pass',...dated})).status,'ready');assert.equal(calls.length,0);
 const offer=await product.getContent({questionId:'career.interview.job-offer',...dated});
 assert.equal(calls.at(-1).questionId,'domain-09-job-offer');assert.equal(offer.selection.questionId,'career.interview.job-offer');assert.equal(offer.legacySelection.questionId,'domain-09-job-offer');
 const needed=await product.getContent({questionId:'search.valuables.recovery',subcategoryId:'search.lost-object',...dated});assert.equal(needed.status,'requires-context');assert.deepEqual(needed.missingContext,['objectKind']);
 await product.getContent({questionId:'search.valuables.recovery',context:{objectKind:'phone'},...dated});assert.equal(calls.at(-1).questionId,'domain-15-phone');
 const before=calls.length;
 assert.equal((await product.getContent({questionId:'search.lost-object.recovery',context:{objectKind:'other'},...dated})).status,'pending-authoring');
 assert.equal((await product.getContent({questionId:'search.pets.recovery',...dated})).status,'pending-authoring');assert.equal(calls.length,before);
});

test('all eight health questions across four branches provide reference text without casting, severity grades, clinical forecasts or story fallback',async()=>{
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
 assert.equal((await repo.getQuestion('career.promotion-pay.pay-rise')).archived,true);
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
