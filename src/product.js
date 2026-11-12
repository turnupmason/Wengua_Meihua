import {readRepositoryJSON} from './io.js';
import {createQuestionRepository} from './questions.js';
import {createInterviewManuscriptRepository} from './interview-manuscripts.js';
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.freeze(x);Object.values(x).forEach(freeze);}return x;};
const MODES=new Set(['narrative','reference','guidance']);
const CATEGORY_IDS=['career','wealth','relationships','health','home','search'];
const SUBCATEGORY_COUNTS=[8,9,10,8,9,8];
/** Product navigation is independent of the eighteen classical source domains. */
export function createProductRepository({library,readJSON=readRepositoryJSON,questionRepository,includeHistoricalInterviewVoid=false}={}){
 if(!library?.contentVersion)throw new TypeError('Canonical library required');
 const legacy=questionRepository||createQuestionRepository({library,readJSON}),authored=createInterviewManuscriptRepository({library,readJSON,includeHistoricalVoid:includeHistoricalInterviewVoid});let cache;
 async function getCatalog(){
  if(!cache)cache=Promise.resolve().then(()=>readJSON('data/product-categories.json')).then(async c=>{
   if(c.schemaVersion!=='1.0.0'||c.contentVersion!==library.contentVersion||c.productCatalogVersion!=='1.0.0'||c.categoryCount!==6||c.subcategoryCount!==52||c.categories?.length!==6||c.selectionPolicy?.aiClassification!==false||c.selectionPolicy?.freeTextChangesQuestion!==false)throw new Error('Invalid product catalog');
   const ids=new Set(),subIds=new Set(),categoryIds=new Set();let count=0;
   for(const [i,category] of c.categories.entries()){
    if(categoryIds.has(category.id)||category.id!==CATEGORY_IDS[i]||category.position!==i+1||category.subcategories?.length!==SUBCATEGORY_COUNTS[i])throw new Error('Product category identity mismatch');categoryIds.add(category.id);
    for(const sub of category.subcategories){
     if(subIds.has(sub.id)||sub.categoryId!==category.id||!sub.id.startsWith(category.id+'.'))throw new Error('Product subcategory identity mismatch');subIds.add(sub.id);
     for(const q of sub.questions){
      if(ids.has(q.id)||q.categoryId!==category.id||q.subcategoryId!==sub.id||!q.id.startsWith(sub.id+'.')||!q.question_type||!q.answerScope||!MODES.has(q.mode))throw new Error('Product question identity mismatch');
      if(category.id==='health'&&q.mode!=='reference')throw new Error('Health entries must be cultural references');
      if(q.mode==='reference'&&!q.referenceParagraphs?.length||q.mode==='guidance'&&!q.guidanceParagraphs?.length)throw new Error('Product reference or guidance missing');
      for(const domainId of q.sourceDomainIds)if(!library.listDomains().some(d=>d.id===domainId))throw new Error('Unknown source domain');
      if(q.sourceSections?.length!==q.sourceDomainIds.length||q.sourceSections.some((r,i)=>r.domainId!==q.sourceDomainIds[i]||library.listDomains().find(d=>d.id===r.domainId)?.sectionId!==r.sectionId)||q.chartSourceDomainId!==(q.sourceDomainIds[0]||null))throw new Error('Product source identity mismatch');
      const bindings=[q.legacyQuestionId,...Object.values(q.legacyBindings?.values||{})].filter(Boolean);
      for(const id of bindings){const original=await legacy.getQuestion(id);if(q.mode!=='narrative'||original.question_type!==q.question_type||!q.sourceDomainIds.includes(original.domainId))throw new Error('Legacy link changes question meaning');}
      ids.add(q.id);count++;
     }
    }
   }
   if(subIds.size!==52||count!==c.questionCount)throw new Error('Product counts mismatch');
   return freeze(c);
  }).catch(e=>{cache=undefined;throw e;});
  return cache;
 }
 async function getQuestion(id){const c=await getCatalog(),q=c.categories.flatMap(x=>x.subcategories).flatMap(s=>s.questions).find(q=>q.id===id);if(!q)throw new RangeError('Unknown product question');return q;}
 async function listSubcategories(categoryId){const c=(await getCatalog()).categories.find(x=>x.id===categoryId);if(!c)throw new RangeError('Unknown product category');return c.subcategories;}
 async function listQuestions(subcategoryId){const c=(await getCatalog()).categories.flatMap(x=>x.subcategories).find(s=>s.id===subcategoryId);if(!c)throw new RangeError('Unknown product subcategory');return c.questions;}
 async function getContent(options={}){
  if(['question','text','prompt','legacyQuestionId'].some(k=>k in options))throw new TypeError('Use a fixed product questionId; no text classification or manual legacy override');
  const q=await getQuestion(options.questionId),c=await getCatalog();
  if(options.categoryId!==undefined&&options.categoryId!==q.categoryId||options.subcategoryId!==undefined&&options.subcategoryId!==q.subcategoryId||options.question_type!==undefined&&options.question_type!==q.question_type)throw new RangeError('Product selection mismatch');
  const context=structuredClone(options.context||{}),missing=[];
  for(const k of Object.keys(context))if(!Object.hasOwn(q.contextFields,k))throw new RangeError('Unknown product context field');
  for(const [key,field] of Object.entries(q.contextFields)){
   const value=context[key];if(value===undefined||value===null||value===''){if(field.required)missing.push(key);continue;}
   if(field.options&&!field.options.includes(value)||field.type==='year'&&(!Number.isInteger(value)||value<1900||value>2200))throw new RangeError('Invalid product context value');
  }
  const selection={questionId:q.id,categoryId:q.categoryId,subcategoryId:q.subcategoryId,question_type:q.question_type,
   question:context.targetYear?q.question.replace('今年',context.targetYear+'年'):q.question,answerScope:q.answerScope,context};
  const practicalAdvice=[...q.practicalAdvice,...(context.objectKind?c.objectPracticalAdvice[context.objectKind]||[]:[])];
  const base={selection,practicalAdvice,sourceSections:q.sourceSections.map(s=>library.getSection(s.sectionId)),reportedOutcome:null};
  if(missing.length)return freeze({...base,status:'requires-context',missingContext:missing,paragraphs:[],story:null,predictionAllowed:false});
  if(q.mode!=='narrative'){
   const paragraphs=q.mode==='reference'?q.referenceParagraphs:q.guidanceParagraphs;
   return freeze({...base,status:q.mode,paragraphs,story:paragraphs.join('\n\n'),predictionAllowed:false,provesLocation:false});
  }
  if(q.manuscriptIndexPath){
   const result=await authored.getContent(q,options);
   return freeze({...result,...base,predictionAllowed:result.productionAllowed===true});
  }
  const legacyId=q.legacyQuestionId||q.legacyBindings?.values?.[context[q.legacyBindings?.contextKey]];
  if(!legacyId)return freeze({...base,status:'pending-authoring',paragraphs:[],story:null,predictionAllowed:false,reason:'No exact product-question manuscript or reviewed method; no domain fallback'});
  const result=await legacy.getContent({questionId:legacyId,question_type:q.question_type,primaryId:options.primaryId,movingLine:options.movingLine,monthOrder:options.monthOrder,
   voidContext:options.voidContext,castingDate:options.castingDate,viewDate:options.viewDate,timingScale:options.timingScale,timingContext:options.timingContext});
  return freeze({...result,...base,legacySelection:result.selection,predictionAllowed:result.productionAllowed===true});
 }
 return Object.freeze({getCatalog,getQuestion,listSubcategories,listQuestions,getContent,clearCache:()=>{cache=undefined;legacy.clearCache?.();authored.clearCache();}});
}
