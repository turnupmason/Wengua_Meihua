import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {loadLibrary,createQuestionRepository,questionStoryContextKey} from '../src/index.js';
const library=await loadLibrary(),questions=createQuestionRepository({library});
const read=async path=>JSON.parse(await readFile(new URL('../'+path,import.meta.url),'utf8'));

test('18 source domains each have five unique fixed questions, with no free-text or AI selection',async()=>{
 const c=await questions.getCatalog(),items=c.domains.flatMap(d=>d.items);
 assert.equal(c.domains.length,18);assert.equal(items.length,90);assert.equal(new Set(items.map(q=>q.id)).size,90);
 assert.equal(items.filter(q=>q.mode==='narrative').length,75);assert.equal(items.filter(q=>q.mode==='reference').length,15);
 assert.equal(c.selectionPolicy.freeText,false);assert.equal(c.selectionPolicy.aiClassification,false);
 for(const domain of c.domains){assert.equal((await questions.listQuestions(domain.id)).length,5);for(const q of domain.items){
  assert.equal((await questions.getQuestion(q.id)).domainId,domain.id);
  assert.ok(library.getSection(domain.sourceSectionId));assert.ok(q.answerBrief);assert.ok(q.positiveEvent);assert.ok(q.adverseEvent);
 }}
});

test('all 75 narrative choices route to their exact domain and canonical question, never a generic fallback',async()=>{
 const c=await questions.getCatalog();
 for(const q of c.domains.flatMap(d=>d.items).filter(q=>q.mode==='narrative')){
  const result=await questions.getContent({questionId:q.id,primaryId:48,movingLine:5,monthOrder:'winter-water',voidContext:{ganzhi:'己丑'}});
  assert.equal(result.selection.domainId,q.domainId);assert.equal(result.reading.domain.id,q.domainId);
  assert.equal(result.reading.question,q.question);
  if(q.id==='domain-10-receivable'){assert.equal(result.status,'authored-base');assert.ok(result.story.includes('尾款'));}
  else{assert.equal(result.status,'pending-authoring');assert.equal(result.story,null);assert.deepEqual(result.paragraphs,[]);}
 }
});

test('unknown IDs, cross-domain choices and free-form inputs are rejected',async()=>{
 await assert.rejects(questions.getQuestion('other'),/Unknown/);
 await assert.rejects(questions.listQuestions('other'),/Unknown/);
 await assert.rejects(questions.getContent({questionId:'domain-10-receivable',domainId:'domain-11'}),/does not belong/);
 await assert.rejects(questions.getContent({questionId:'domain-10-receivable',question:'随便问一个问题'}),/free text/);
 await assert.rejects(questions.getContent({questionId:'domain-10-receivable',primaryId:48,movingLine:5,monthOrder:'11月'}),/month qi/);
});

test('all 15 historical-reference choices return written explanations and no forecast or invented dates',async()=>{
 const c=await questions.getCatalog();
 for(const q of c.domains.flatMap(d=>d.items).filter(q=>q.mode==='reference')){
  const result=await questions.getContent({questionId:q.id});
  assert.equal(result.status,'reference');assert.equal(result.story,q.referenceParagraphs.join('\n\n'));
  assert.ok(result.sourceSections.every(Boolean));assert.equal(result.reading,undefined);assert.equal(result.reportedOutcome,null);
 }
});

test('authored lookup requires exact question, dependent charts, month qi and casting context',async()=>{
 const questionId='domain-10-receivable',options={questionId,primaryId:48,movingLine:5,monthOrder:'winter-water',voidContext:{ganzhi:'己丑'}};
 const pending=await questions.getContent(options),index=await read('data/question-stories/index.json');
 const file={schemaVersion:'1.0.0',catalogVersion:'1.0.0',contentVersion:library.contentVersion,questionId,rows:[{
  primaryId:48,movingLine:5,monthOrder:'winter-water',contextKey:pending.contextKey,stageIds:[48,38,46],reviewStatus:'reviewed',
  paragraphs:['用于验证精确绑定的测试稿，不作为产品正文。'],sourceIds:['mh-072']
 }]};
 const repo=createQuestionRepository({library,readJSON:async path=>path==='data/question-stories/index.json'?{...index,files:[{questionId,path:`data/question-stories/${questionId}.json`}]}:path===`data/question-stories/${questionId}.json`?file:read(path)});
 const content=await repo.getContent(options);assert.equal(content.status,'authored-base');assert.equal(content.requiresDateResolution,true);
 assert.equal((await repo.getContent({...options,questionId:'domain-10-refund'})).status,'pending-authoring');
 assert.equal((await repo.getContent({...options,movingLine:4})).status,'pending-authoring');
 assert.equal((await repo.getContent({...options,monthOrder:'spring-wood'})).status,'pending-authoring');
 assert.equal((await repo.getContent({...options,voidContext:{ganzhi:'甲子'}})).status,'pending-authoring');
 assert.equal(content.contextKey,questionStoryContextKey(content.reading));
});

test('tampered catalog and wrong story-file identity cannot be served',async()=>{
 const catalog=await read('data/question-items.json');
 const wrong=createQuestionRepository({library,readJSON:async path=>path==='data/question-items.json'?{...catalog,count:89}:read(path)});
 await assert.rejects(wrong.getCatalog(),/catalog/);
 const index=await read('data/question-stories/index.json');
 const repo=createQuestionRepository({library,readJSON:async path=>path==='data/question-stories/index.json'?{...index,files:[{questionId:'domain-10-receivable',path:'data/question-stories/domain-10-refund.json'}]}:read(path)});
 await assert.rejects(repo.getContent({questionId:'domain-10-receivable',primaryId:48,movingLine:5,monthOrder:'winter-water'}),/path mismatch/);
});
