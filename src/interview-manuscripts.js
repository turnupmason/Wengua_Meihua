import {assessVoid} from './index.js';
import {MONTH_ORDERS} from './narrative-rules.js';
import {assessSeasonalQi,interpretationArtifactDigest,AUDIT_CHECKS} from './interpretation-audit.js';
import {getCivilDay} from './day-calendar.js';
import {getVoidProfileKey,resolveManuscriptDates} from './prewritten-manuscripts.js';
import {ELEMENT_DAY_BRANCHES} from './timing-rules.js';
import {resolveMonthSlot} from './month-slots.js';
import {VOID_RULESET} from './void-policy.js';
import {checkInterviewDecision} from './interview-decision-checks.js';
export const INTERVIEW_MANUSCRIPT_VERSION='interview-pass-1.2.0';
export const INTERVIEW_QUESTION_ID='career.interview.interview-pass';
const GENERATES={木:'火',火:'土',土:'金',金:'水',水:'木'};
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.freeze(x);Object.values(x).forEach(freeze);}return x;};

/** Full five-state qi also governs the extension's strong/weak exemptions. */
export function createContextualReading({library,question,primaryId,movingLine,monthOrder,monthBranch,castingDate,voidContext={}}){
 if(!question?.id||question.mode!=='narrative')throw new Error('Typed narrative question required');
 const slot=resolveMonthSlot({monthBranch,monthOrder});monthOrder=slot?.qi;
 const order=MONTH_ORDERS.find(x=>x.id===monthOrder);if(!order)throw new RangeError('Explicit month qi required');
 const day=getCivilDay(castingDate);
 if(voidContext.ganzhi&&voidContext.ganzhi!==day.dayGanzhi)throw new RangeError('Casting date and day ganzhi disagree');
 if(voidContext.basis&&voidContext.basis!=='day-explicit-input')throw new RangeError('This batch uses casting-day void basis');
 const context={partialPolicy:'qualitative-reduction',...voidContext,ganzhi:day.dayGanzhi,basis:'day-explicit-input'};
 const raw=library.createReading({primaryId,movingLine,domainId:question.chartSourceDomainId||question.sourceDomainIds?.[0]||'domain-09',question:question.question,calendar:{season:order.season},voidContext:context});
 const movingUse=raw.nodes.find(n=>n.role==='use');
 const nodes=raw.nodes.map(n=>{
  const qi=assessSeasonalQi(n.element,monthOrder),explicit=context.roleEvidence?.[n.role]||{};
  const supportEvidence=[...n.supportEvidence];
  if(n.stage!=='changed'&&n.role!=='use'&&GENERATES[movingUse.element]===n.element)
   supportEvidence.push({basis:'internal-moving-direct-generation',actorRole:'use',scope:'void-falsehood-assessment-only;not-an-extra-root-energy-score',sourceIds:['user-void-timing']});
  if(explicit.ganzhi&&explicit.ganzhi!==day.dayGanzhi)throw new RangeError('Role evidence day does not match the cast');
  return {...n,supportEvidence,strength:{...qi,label:qi.state,season:order.season,monthBranch:slot.branch},
   void:assessVoid(n.trigram,{...context,...explicit,strength:qi.state,moving:['use','changed_use'].includes(n.role),
    supported:Boolean(context.supported||explicit.supported||supportEvidence.length),partialPolicy:context.partialPolicy})};
 });
 const body=nodes.find(n=>n.role==='body'),inherited=nodes.find(n=>n.role==='body_inherited');
 inherited.void=body.void;inherited.strength=body.strength;inherited.supportEvidence=body.supportEvidence;
 const edges=raw.edges.map(e=>({...e,voidEffect:nodes.find(n=>n.role===e.targetRole).void.effective,bodyVoidEffect:body.void.effective,qualitativeNote:'直接关系与各节点旺衰、空亡分别记录'}));
 return freeze({...raw,nodes,edges,castingDate,dayGanzhi:day.dayGanzhi,monthOrder,monthBranch:slot.branch,
  profile:{...raw.profile,id:'product-full-qi-void-1.0.0',voidRuleSetId:VOID_RULESET.id,monthStrength:'full-five-state',application:'typed-question;factual-assessment-only'}});
}

export function createInterviewReading(options){
 if(options.question.id!==INTERVIEW_QUESTION_ID||options.question.question_type!=='interview_pass')throw new Error('Interview-stage question required');
 return createContextualReading(options);
}

export function interviewVoidReleaseSlots(reading,specs=[]){
 const slots=[],sentences=[];
 for(const s of specs){
  const node=reading.nodes.find(n=>n.role===s.role),edge=reading.edges.find(e=>e.targetRole===s.role);
  if(!node||node.void.hitKind!=='full'||!['dormant','supported'].includes(node.void.state))throw new Error('Void-release date requires a full stationary, non-true-void profile');
  const expected=s.valence==='吉'?'body_controls_use':'body_generates_use';
  if(edge?.type!==expected)throw new Error('Void-release meaning must match the curated direct relation');
  const ids=[];
  for(const [mechanism,key] of [['填实','fill'],['冲空','clash']]){
   const id=`void-${s.role}-${key}`,branches=[...new Set(node.void.releaseTargets.map(t=>t[key]))];ids.push(id);
   slots.push({id,token:`{{date:${id}}}`,branches,prefix:'',suffix:'',displayLimit:2,emptyText:'暂无相应日期',
    event:s.event+'（'+mechanism+'）',valence:s.valence,sourceIds:['user-void-extension','user-void-timing'],ruleIds:['void-'+key],method:'void-release',scale:'day',eventScope:'void-release-stage',
    calculationBasis:{role:s.role,trigram:node.trigram,element:node.element,directRelation:edge.type,method:'void-release',scale:'day',mechanism,
     ruleIds:['void-'+key],sourceIds:['user-void-extension','user-void-timing'],interpretationReview:'author-source-checked',independentInterpretationReview:'pending'}});
  }
  sentences.push(`${node.void.matchedBranches.join('、')}位空亡的填实节点可留意{{date:${ids[0]}}}，冲空节点可留意{{date:${ids[1]}}}。${s.event}，偏${s.valence}。`);
 }
 return {slots,text:sentences.join(' ')};
}

export function interviewTimingSlots(reading,specs){
 return specs.map(s=>{
  const node=reading.nodes.find(n=>n.role===s.role),edge=reading.edges.find(e=>e.targetRole===s.role);
  const expected=s.kind==='support'?'use_generates_body':s.kind==='control'?'use_controls_body':null;
  if(!node||!expected||edge?.type!==expected||node.void.effective!=='active')throw new Error('Timing source must be an active direct support/controller');
  if(s.kind==='support'&&!s.sourceIds.includes('mh-071')||s.kind==='control'&&!s.sourceIds.includes('mh-116'))throw new Error('Timing event lacks its scoped source');
  const eventScope=s.eventScope||(s.id==='obstruction'?'process-obstruction':s.id==='repair'?'process-repair':s.kind==='support'?'positive-result-candidate':'obstruction-or-adverse-result');
  const calculationBasis={role:s.role,trigram:node.trigram,element:node.element,directRelation:edge.type,
   method:'pre-heaven-element-qi',scale:'day',ruleIds:[...s.ruleIds],sourceIds:[...s.sourceIds],
   interpretationReview:'author-source-checked',independentInterpretationReview:'pending'};
  return {...s,eventScope,calculationBasis,token:`{{date:${s.id}}}`,branches:[...ELEMENT_DAY_BRANCHES[node.element]],displayLimit:2,
   method:'element-qi',scale:'day',emptyText:'本次可显示范围内暂无相应候选日期。'};
 });
}

export function createInterviewManuscriptRepository({library,readJSON}){
 const cache=new Map();
 const read=path=>{if(!cache.has(path))cache.set(path,Promise.resolve(readJSON(path)).then(v=>{
  if(v.schemaVersion!=='1.0.0'||v.contentVersion!==library.contentVersion||v.manuscriptVersion!==INTERVIEW_MANUSCRIPT_VERSION)throw new Error('Authored interview version mismatch');return freeze(v);
 }).catch(e=>{cache.delete(path);throw e;}));
 while(cache.size>3){const victim=[...cache.keys()].find(k=>!k.endsWith('/index.json')&&k!==path);if(!victim)break;cache.delete(victim);}
 return cache.get(path);};
 async function getContent(question,options){
  if(question.id!==INTERVIEW_QUESTION_ID||question.manuscriptIndexPath!=='data/authored-readings/interview-pass/index.json')throw new Error('Invalid interview manuscript binding');
  const missing=!options.castingDate?['castingDate']:[];if(!options.monthBranch&&!options.monthOrder)missing.push('monthBranch');
  if(missing.length)return {status:'requires-context',missingContext:missing,story:null,paragraphs:[],predictionAllowed:false,productionAllowed:false};
  const reading=createInterviewReading({library,question,...options});
  const index=await read(question.manuscriptIndexPath),key=getVoidProfileKey(reading);
  if(index.questionId!==question.id)throw new Error('Authored interview question mismatch');
  const pending=()=>({status:'pending-authoring',reading,story:null,paragraphs:[],predictionAllowed:false,productionAllowed:false,
   coverage:{baseCases:index.baseCaseCount,authoredVersions:index.authoredVersionCount,contextProfiles:index.contextProfileCount,totalBaseCases:4608}});
  const entry=index.files.find(f=>f.primaryId===reading.primaryId);if(!entry)return pending();
  if(entry.path!==`data/authored-readings/interview-pass/hex-${String(reading.primaryId).padStart(3,'0')}.json`)throw new Error('Invalid authored shard path');
  const file=await read(entry.path);if(file.questionId!==question.id||file.primaryId!==reading.primaryId)throw new Error('Authored shard identity mismatch');
  const position=file.monthSlots[reading.movingLine+':'+reading.monthBranch];
  if(position===undefined)return pending();
  if(!Number.isInteger(position)||!file.rows[position])throw new Error('Invalid month slot reference');
  const row=file.rows[position];
  if(row.primaryId!==reading.primaryId||row.movingLine!==reading.movingLine||row.monthOrder!==reading.monthOrder||!row.monthBranches.includes(reading.monthBranch))throw new Error('Authored month slot mismatch');
  const exactProfile=row.voidProfileKey===key;
  const baseEligible=row.baseProse===true&&reading.nodes.filter(n=>['body','use','changed_use'].includes(n.role)).every(n=>n.void.hitKind==='none'||n.void.effective==='active');
  if(!exactProfile&&!baseEligible)return pending();
  const material=structuredClone(row);delete material.artifactDigest;
  if(await interpretationArtifactDigest(material)!==row.artifactDigest||row.review.status!=='author-checked'||AUDIT_CHECKS.some(id=>row.review.checks[id]?.status!=='pass'||!row.review.checks[id].evidence.length))throw new Error('Authored receipt or content binding invalid');
  checkInterviewDecision(reading,{outcome:row.decision.outcomeCode,counterevidence:row.counterevidence});
  if(row.ruleVersions.void!==VOID_RULESET.id)throw new Error('Authored void ruleset version mismatch');
  if(row.movingLineText!==reading.selectedMovingLine.text||row.stageIds.some((id,i)=>id!==Object.values(reading.stages)[i].id))throw new Error('Authored chart/source identity mismatch');
  if(row.timingSlots.some(s=>reading.nodes.find(n=>n.role===s.role)?.void.effective!=='active'))return pending();
  const actualSlots=interviewTimingSlots(reading,row.timingSlots);
  if(actualSlots.some((s,i)=>JSON.stringify(s.branches)!==JSON.stringify(row.timingSlots[i].branches)))throw new Error('Authored timing branch mismatch');
  const missingTiming=[];
  if(options.timingScale!=='day')missingTiming.push('timingScale');
  if(options.timingContext?.castingMethod!=='pre-heaven'||options.timingContext?.periodMethod!=='element-qi')missingTiming.push('timingMethod');
  if(missingTiming.length)return {status:'requires-context',missingContext:missingTiming,reading,story:null,paragraphs:[],predictionAllowed:false,productionAllowed:false};
  const voidDetails=interviewVoidReleaseSlots(reading,row.voidReleaseSpecs||[]);
  if(JSON.stringify(voidDetails.slots)!==JSON.stringify(row.voidTimingSlots||[])||voidDetails.text!==(row.voidTimingText||''))throw new Error('Authored void-release binding mismatch');
  const c=row.copy.long,paragraphs=['开局：'+c.opening,'过程：'+c.process,'结局：'+c.ending,'应期：'+row.timingSlots.map(s=>s.token).join(' '),'总断：'+c.summary];
  const allSlots=[...row.timingSlots,...row.voidTimingSlots];
  const dates=resolveManuscriptDates({paragraphs,dateSlots:allSlots,reading,castingDate:options.castingDate,viewDate:options.viewDate,timingScale:options.timingScale,timingContext:options.timingContext});
  if(dates.status!=='resolved')throw new Error('Complete interview context failed to resolve dates');
  const dateResolution={...dates,interpretationReviewed:false,independentInterpretationReview:'pending',dateMatches:dates.dateMatches.map(d=>{
   const slot=allSlots.find(s=>s.id===d.slotId);
   return {...d,eventScope:slot.eventScope,targetBranches:[...slot.branches],calculationBasis:slot.calculationBasis};
  })};
  const labels={body:'体',use:'用',body_mutual:'体互',use_mutual:'用互',changed_use:'变用'};
  const calculationExplanation={
   month:{branch:reading.monthBranch,qiCategory:reading.monthOrder,states:reading.nodes.filter(n=>n.role!=='body_inherited').map(n=>({role:n.role,trigram:n.trigram,element:n.element,qi:n.strength.state}))},
   void:{...VOID_RULESET,dayGanzhi:reading.dayGanzhi,emptyBranches:[...reading.nodes.find(n=>n.role==='body').void.xun.branches],
    nodes:reading.nodes.filter(n=>n.role!=='body_inherited').map(n=>({role:n.role,trigram:n.trigram,hitKind:n.void.hitKind,matchedBranches:[...n.void.matchedBranches],state:n.void.state,effective:n.void.effective})),notes:exactProfile?[...row.coreVoidNotes]:[]},
   timing:{independentInterpretationReview:'pending',windows:dateResolution.dateMatches},
   paragraphs:[`月令：${reading.monthBranch}月。旺衰与旬空分别计算。`,`起卦日：${reading.castingDate}，${reading.dayGanzhi}日；旬空：${reading.nodes.find(n=>n.role==='body').void.xun.branches.join('、')}。`,
    ...(exactProfile?row.coreVoidNotes:[]),
    `空亡依据：八卦配支补充法，版本${VOID_RULESET.id}。`,
    ...dateResolution.dateMatches.map(d=>`${d.valence}应 · ${d.event}：取${labels[d.calculationBasis.role]||d.calculationBasis.role}${d.calculationBasis.trigram}${d.calculationBasis.element}所应${d.targetBranches.join('、')}日；显示${d.displayedDates.join('、')}。`)]};
  return freeze({status:'ready',reading,title:row.copy.title,short:row.copy.short.text,long:c,decision:row.decision,
   paragraphs:dates.paragraphs,story:dates.paragraphs.join('\n\n'),dateResolution,calculationExplanation,timingDecision:allSlots,
   review:row.review,sourceIds:row.sourceIds,monthBranch:reading.monthBranch,monthOrder:reading.monthOrder,voidMatch:exactProfile?'recorded-context':'base-with-no-core-change',manuscriptVersion:INTERVIEW_MANUSCRIPT_VERSION,productionAllowed:true,predictionAllowed:true,
   interpretationScope:'traditional-symbolic;author-checked-exact-case;not-verified-real-world-outcome',reportedOutcome:null});
 }
 return Object.freeze({getContent,clearCache:()=>cache.clear()});
}
