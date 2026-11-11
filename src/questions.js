import {readRepositoryJSON} from './io.js';
import {MONTH_ORDERS} from './narrative-rules.js';
import {getCivilDay} from './day-calendar.js';
import {getVoidProfileKey,unpackManuscript,resolveManuscriptDates} from './prewritten-manuscripts.js';
import {questionTypeFor} from './question-types.js';
import {INTERPRETATION_POLICY_VERSION,buildInterpretationEvidence,interpretationArtifactDigest,evaluateInterpretationReview} from './interpretation-audit.js';
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.freeze(x);Object.values(x).forEach(freeze);}return x;};
/** Identity of the reviewed casting conditions; a superficially similar chart cannot substitute. */
export function questionStoryContextKey(reading){
 return JSON.stringify(reading.nodes.filter(n=>n.role!=='body_inherited').map(n=>({
  role:n.role,trigram:n.trigram,month:n.strength.season,monthBranch:n.strength.monthBranch,
  strength:n.strength.state,void:n.void,support:n.supportEvidence
 })));
}
export function createQuestionRepository({library,readJSON=readRepositoryJSON,editorialPreview=false}={}){
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
    if(q.question_type!==questionTypeFor(q))throw new Error('Question type mismatch');
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
  if(options.question_type!==undefined&&options.question_type!==q.question_type)throw new RangeError('Selected question_type does not match the fixed question');
  const selection={questionId:q.id,domainId:q.domainId,question_type:q.question_type,question:q.question,answerBrief:q.answerBrief,
   positiveEvent:q.positiveEvent,adverseEvent:q.adverseEvent,timingPolicy:q.timingPolicy,ruleReview:q.ruleReview};
  if(q.mode==='reference')return freeze({status:'reference',selection,paragraphs:q.referenceParagraphs,
   story:q.referenceParagraphs.join('\n\n'),sourceSections:q.sourceIds.map(id=>library.getSection(id)),reportedOutcome:null});
  const order=MONTH_ORDERS.find(o=>o.id===options.monthOrder);
  if(!order)throw new RangeError('Explicit month qi order required');
  const voidContext=structuredClone(options.voidContext||{});
  if(options.castingDate){
   const day=getCivilDay(options.castingDate);
   if(voidContext.ganzhi&&voidContext.ganzhi!==day.dayGanzhi)throw new RangeError('Casting date and saved day ganzhi disagree');
   voidContext.ganzhi=day.dayGanzhi;
  }
  const reading=library.createReading({primaryId:options.primaryId,movingLine:options.movingLine,domainId:q.domainId,
   question:q.question,calendar:{season:order.season},voidContext,mutualPolicy:'inner-lines'});
  const key=`${q.id}/${reading.primaryId}/${reading.movingLine}/${order.id}`,contextKey=questionStoryContextKey(reading);
  const evidence=buildInterpretationEvidence(reading,{monthOrder:order.id});
  const review=async(material,profileKey)=>{
   const binding={questionId:q.id,question_type:q.question_type,key,contextKey,profileKey,
    artifactDigest:await interpretationArtifactDigest(material),contentVersion:library.contentVersion,policyVersion:INTERPRETATION_POLICY_VERSION,
    timingKey:JSON.stringify({castingDate:options.castingDate??null,timingScale:options.timingScale??null,timingContext:options.timingContext??null})};
   const audit=evaluateInterpretationReview(await read('data/interpretation-reviews.json'),binding);
   return {audit,binding,evidence,productionAllowed:audit.status==='approved'};
  };
  const withheld=assessment=>freeze({status:'pending-review',selection,reading,key,contextKey,paragraphs:[],story:null,
   ...assessment,reason:'Generated draft requires nine evidence-bearing interpretive checks; structural review is insufficient',reportedOutcome:null});
  const pending=()=>freeze({status:'pending-authoring',selection,reading,key,contextKey,paragraphs:[],story:null,
   reason:'No reviewed complete story for this exact question, chart, month qi and casting context',reportedOutcome:null});
  const index=await read('data/question-stories/index.json');
  if(index.catalogVersion!==(await getCatalog()).catalogVersion||!Array.isArray(index.files))throw new Error('Question story index mismatch');
  const entries=index.files.filter(f=>f.questionId===q.id);
  if(entries.length>1)throw new Error('Duplicate question story file');
  if(!entries.length)return pending();
  const entry=entries[0];
  if(entry.kind==='sharded-complete-manuscripts'){
   if(entry.path!==`data/question-stories/${q.id}/index.json`)throw new Error('Question manuscript manifest path mismatch');
   if(voidContext.basis&&voidContext.basis!=='day-explicit-input')return pending();
   const manifest=await read(entry.path);
   if(manifest.questionId!==q.id||manifest.catalogVersion!==index.catalogVersion||manifest.baseStoryCount!==1920)throw new Error('Question manuscript manifest mismatch');
   const shard=manifest.files.find(f=>f.hexagramId===reading.primaryId);
   if(!shard||shard.path!==`data/question-stories/${q.id}/${String(reading.primaryId).padStart(2,'0')}.json`)throw new Error('Question manuscript shard mismatch');
   const file=await read(shard.path);
   if(file.questionId!==q.id||file.hexagramId!==reading.primaryId||file.catalogVersion!==index.catalogVersion)throw new Error('Question manuscript shard identity mismatch');
   const rows=file.rows.filter(r=>r.primaryId===reading.primaryId&&r.movingLine===reading.movingLine&&r.monthOrder===order.id);
   if(rows.length!==1||rows[0].reviewStatus!=='reviewed')return pending();
   const row=rows[0],stageIds=Object.values(reading.stages).map(s=>s.id);
   if(row.stageIds.some((id,i)=>id!==stageIds[i])||row.baseGrades.some((grade,i)=>grade!==Object.values(reading.stages)[i].baseGrade))throw new Error('Question manuscript chart or grade mismatch');
   const unresolved=reading.nodes.some(n=>n.void.state==='unresolved');
   const variants=row.variants.filter(v=>v.profileKey===getVoidProfileKey(reading));
   if(!unresolved&&variants.length!==1)return pending();
   const record=unresolved?row.base:variants[0],material=unpackManuscript(file,record);
   const profileKey=unresolved?null:variants[0].profileKey,assessment=await review(material,profileKey);
   if(!assessment.productionAllowed&&!editorialPreview)return withheld(assessment);
   const dates=resolveManuscriptDates({...material,reading,castingDate:options.castingDate,viewDate:options.viewDate,timingScale:options.timingScale,timingContext:options.timingContext});
   return freeze({status:assessment.productionAllowed?(dates.status==='resolved'?'ready':'authored-base'):'review-preview',selection,reading,key,contextKey,...assessment,
    profileKey:unresolved?null:variants[0].profileKey,paragraphs:dates.paragraphs,story:dates.paragraphs.join('\n\n'),
    verdict:material.verdict,sourceIds:material.sourceIds,dateResolution:{...dates,interpretationReviewed:assessment.productionAllowed},requiresDateResolution:dates.status!=='resolved',
    manuscriptVersion:manifest.manuscriptVersion,reportedOutcome:null});
  }
  if(entry.path!==`data/question-stories/${q.id}.json`)throw new Error('Question story path mismatch');
  const file=await read(entry.path);
  if(file.questionId!==q.id||file.catalogVersion!==index.catalogVersion||!Array.isArray(file.rows))throw new Error('Question story file identity mismatch');
  const rows=file.rows.filter(row=>row.primaryId===reading.primaryId&&row.movingLine===reading.movingLine&&row.monthOrder===order.id&&row.contextKey===contextKey);
  if(rows.length>1)throw new Error('Duplicate exact question story');
  if(!rows.length||rows[0].reviewStatus!=='reviewed')return pending();
  const row=rows[0],stageIds=Object.values(reading.stages).map(s=>s.id);
  if(!Array.isArray(row.stageIds)||row.stageIds.length!==3||stageIds.some((id,i)=>row.stageIds[i]!==id)||!row.paragraphs?.length||row.paragraphs.some(p=>typeof p!=='string'||!p.trim())||!row.sourceIds?.length)throw new Error('Authored story bindings invalid');
  const assessment=await review({paragraphs:row.paragraphs,sourceIds:row.sourceIds},null);
  if(!assessment.productionAllowed&&!editorialPreview)return withheld(assessment);
  // This is a complete authored base. Date resolution remains a separate verified step.
  return freeze({status:assessment.productionAllowed?'authored-base':'review-preview',selection,reading,key,contextKey,...assessment,paragraphs:row.paragraphs,
   story:row.paragraphs.join('\n\n'),sourceIds:row.sourceIds,requiresDateResolution:true,reportedOutcome:null});
 }
 return Object.freeze({getCatalog,getQuestion,listQuestions,getContent,clearCache:()=>cache.clear()});
}
