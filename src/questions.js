import {readRepositoryJSON} from './io.js';
import {MONTH_ORDERS} from './narrative-rules.js';
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.freeze(x);Object.values(x).forEach(freeze);}return x;};
/** Identity of the reviewed casting conditions; a superficially similar chart cannot substitute. */
export function questionStoryContextKey(reading){
 return JSON.stringify(reading.nodes.filter(n=>n.role!=='body_inherited').map(n=>({
  role:n.role,trigram:n.trigram,month:n.strength.season,monthBranch:n.strength.monthBranch,
  strength:n.strength.state,void:n.void,support:n.supportEvidence
 })));
}
export function createQuestionRepository({library,readJSON=readRepositoryJSON}={}){
 if(!library?.contentVersion)throw new TypeError('Canonical library required');
 const cache=new Map();
 const read=path=>{
  if(!cache.has(path))cache.set(path,Promise.resolve().then(()=>readJSON(path)).then(value=>{
   if(value.schemaVersion!=='1.0.0'||value.contentVersion!==library.contentVersion)throw new Error('Question data version mismatch');
   return freeze(value);
  }).catch(error=>{cache.delete(path);throw error;}));
  return cache.get(path);
 };
 async function getCatalog(){
  const c=await read('data/question-items.json');
  if(c.domainCount!==18||c.count!==90||c.domains?.length!==18||c.selectionPolicy?.freeText!==false||c.selectionPolicy?.aiClassification!==false)throw new Error('Invalid fixed-choice catalog');
  const domains=new Set(),ids=new Set();
  for(const d of c.domains){
   const original=library.listDomains().find(x=>x.id===d.id);
   if(!original||domains.has(d.id)||d.items?.length!==5||d.sourceSectionId!==original.sectionId)throw new Error('Question domain mismatch');
   domains.add(d.id);
   const expectedMode=original.mode==='reference-only'?'reference':'narrative';
   for(const [i,q] of d.items.entries()){
    if(ids.has(q.id)||!q.id.startsWith(d.id+'-')||q.domainId!==d.id||q.position!==i+1||q.mode!==expectedMode||!q.question||!q.answerBrief||!q.sourceIds.includes(original.sectionId))throw new Error('Question identity mismatch');
    if(q.mode==='reference'&&(!q.referenceParagraphs?.length||q.referenceParagraphs.some(p=>typeof p!=='string'||!p.trim())))throw new Error('Reference explanation missing');
    ids.add(q.id);
   }
  }
  if(ids.size!==90)throw new Error('Question count mismatch');
  return c;
 }
 async function getQuestion(id){
  const c=await getCatalog(),q=c.domains.flatMap(d=>d.items).find(x=>x.id===id);
  if(!q)throw new RangeError('Unknown fixed question ID');return q;
 }
 async function listQuestions(domainId){
  const c=await getCatalog(),d=c.domains.find(x=>x.id===domainId);
  if(!d)throw new RangeError('Unknown question domain');return d.items;
 }
 async function getContent(options={}){
  if('question' in options||'text' in options||'prompt' in options)throw new TypeError('Formal questions use a fixed questionId, not free text');
  const q=await getQuestion(options.questionId);
  if(options.domainId!==undefined&&options.domainId!==q.domainId)throw new RangeError('Selected question does not belong to the selected domain');
  const selection={questionId:q.id,domainId:q.domainId,question:q.question,answerBrief:q.answerBrief,
   positiveEvent:q.positiveEvent,adverseEvent:q.adverseEvent,timingPolicy:q.timingPolicy,ruleReview:q.ruleReview};
  if(q.mode==='reference')return freeze({status:'reference',selection,paragraphs:q.referenceParagraphs,
   story:q.referenceParagraphs.join('\n\n'),sourceSections:q.sourceIds.map(id=>library.getSection(id)),reportedOutcome:null});
  const order=MONTH_ORDERS.find(o=>o.id===options.monthOrder);
  if(!order)throw new RangeError('Explicit month qi order required');
  const reading=library.createReading({primaryId:options.primaryId,movingLine:options.movingLine,domainId:q.domainId,
   question:q.question,calendar:{season:order.season},voidContext:options.voidContext||{},mutualPolicy:'inner-lines'});
  const key=`${q.id}/${reading.primaryId}/${reading.movingLine}/${order.id}`,contextKey=questionStoryContextKey(reading);
  const pending=()=>freeze({status:'pending-authoring',selection,reading,key,contextKey,paragraphs:[],story:null,
   reason:'No reviewed complete story for this exact question, chart, month qi and casting context',reportedOutcome:null});
  const index=await read('data/question-stories/index.json');
  if(index.catalogVersion!==(await getCatalog()).catalogVersion||!Array.isArray(index.files))throw new Error('Question story index mismatch');
  const entries=index.files.filter(f=>f.questionId===q.id);
  if(entries.length>1)throw new Error('Duplicate question story file');
  if(!entries.length)return pending();
  const entry=entries[0];
  if(entry.path!==`data/question-stories/${q.id}.json`)throw new Error('Question story path mismatch');
  const file=await read(entry.path);
  if(file.questionId!==q.id||file.catalogVersion!==index.catalogVersion||!Array.isArray(file.rows))throw new Error('Question story file identity mismatch');
  const rows=file.rows.filter(row=>row.primaryId===reading.primaryId&&row.movingLine===reading.movingLine&&row.monthOrder===order.id&&row.contextKey===contextKey);
  if(rows.length>1)throw new Error('Duplicate exact question story');
  if(!rows.length||rows[0].reviewStatus!=='reviewed')return pending();
  const row=rows[0],stageIds=Object.values(reading.stages).map(s=>s.id);
  if(!Array.isArray(row.stageIds)||row.stageIds.length!==3||stageIds.some((id,i)=>row.stageIds[i]!==id)||!row.paragraphs?.length||row.paragraphs.some(p=>typeof p!=='string'||!p.trim())||!row.sourceIds?.length)throw new Error('Authored story bindings invalid');
  // This is a complete authored base. Date resolution remains a separate verified step.
  return freeze({status:'authored-base',selection,reading,key,contextKey,paragraphs:row.paragraphs,
   story:row.paragraphs.join('\n\n'),sourceIds:row.sourceIds,requiresDateResolution:true,reportedOutcome:null});
 }
 return Object.freeze({getCatalog,getQuestion,listQuestions,getContent,clearCache:()=>cache.clear()});
}
