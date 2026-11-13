import {assessVoid} from './index.js';
import {MONTH_ORDERS} from './narrative-rules.js';
import {assessSeasonalQi,interpretationArtifactDigest,AUDIT_CHECKS} from './interpretation-audit.js';
import {getCivilDay} from './day-calendar.js';
import {getVoidProfileKey,resolveManuscriptDates} from './prewritten-manuscripts.js';
import {ELEMENT_DAY_BRANCHES,TRIGRAM_PERIOD_SPECS} from './timing-rules.js';
import {resolveMonthSlot} from './month-slots.js';
import {VOID_RULESET} from './void-policy.js';
import {checkInterviewDecision,checkInterviewShort} from './interview-decision-checks.js';
export const INTERVIEW_MANUSCRIPT_VERSION='interview-pass-2.0.0';
export const INTERVIEW_QUESTION_ID='career.interview.interview-pass';
export const PROMOTION_PAY_PROFILE=Object.freeze({questionId:'career.promotion-pay.promotion',questionType:'promotion',manuscriptVersion:'promotion-pay-1.0.0',directory:'promotion-pay'});
const INTERVIEW_PROFILE={questionId:INTERVIEW_QUESTION_ID,questionType:'interview_pass',manuscriptVersion:INTERVIEW_MANUSCRIPT_VERSION,directory:'interview-pass'};
const REFERENCE_WINDOW_NOTE='以下为传统推算的参考窗口。';
const NO_WINDOW_NOTE='此盘暂无有据的日期可列。';
const GENERATES={木:'火',火:'土',土:'金',金:'水',水:'木'};
const relationLabels={equal:'与体比和',body_controls_use:'受体所克',use_controls_body:'克体',use_generates_body:'生体',body_generates_use:'受体所生'};
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.freeze(x);Object.values(x).forEach(freeze);}return x;};

/** Full five-state qi also governs the extension's strong/weak exemptions. */
export function createContextualReading({library,question,primaryId,movingLine,monthOrder,monthBranch,castingDate,voidContext={},applyVoid=true}){
 if(!question?.id||question.mode!=='narrative')throw new Error('Typed narrative question required');
 const slot=resolveMonthSlot({monthBranch,monthOrder});monthOrder=slot?.qi;
 const order=MONTH_ORDERS.find(x=>x.id===monthOrder);if(!order)throw new RangeError('Explicit month qi required');
 const day=getCivilDay(castingDate);
 if(applyVoid&&voidContext.ganzhi&&voidContext.ganzhi!==day.dayGanzhi)throw new RangeError('Casting date and day ganzhi disagree');
 if(applyVoid&&voidContext.basis&&voidContext.basis!=='day-explicit-input')throw new RangeError('This batch uses casting-day void basis');
 const context=applyVoid?{partialPolicy:'qualitative-reduction',...voidContext,ganzhi:day.dayGanzhi,basis:'day-explicit-input'}:{};
 const raw=library.createReading({primaryId,movingLine,domainId:question.chartSourceDomainId||question.sourceDomainIds?.[0]||'domain-09',question:question.question,calendar:{season:order.season},voidContext:context,applyVoid});
 const movingUse=raw.nodes.find(n=>n.role==='use');
 const nodes=raw.nodes.map(n=>{
  const qi=assessSeasonalQi(n.element,monthOrder);
  const strength={...qi,label:qi.state,season:order.season,monthBranch:monthBranch||null};
  if(!applyVoid)return {...n,strength};
  const explicit=context.roleEvidence?.[n.role]||{};
  const supportEvidence=[...n.supportEvidence];
  if(n.stage!=='changed'&&n.role!=='use'&&GENERATES[movingUse.element]===n.element)
   supportEvidence.push({basis:'internal-moving-direct-generation',actorRole:'use',scope:'void-falsehood-assessment-only;not-an-extra-root-energy-score',sourceIds:['user-void-timing']});
  if(explicit.ganzhi&&explicit.ganzhi!==day.dayGanzhi)throw new RangeError('Role evidence day does not match the cast');
  return {...n,supportEvidence,strength,
   void:assessVoid(n.trigram,{...context,...explicit,strength:qi.state,moving:['use','changed_use'].includes(n.role),
    supported:Boolean(context.supported||explicit.supported||supportEvidence.length),partialPolicy:context.partialPolicy})};
 });
 const body=nodes.find(n=>n.role==='body'),inherited=nodes.find(n=>n.role==='body_inherited');
 inherited.void=body.void;inherited.strength=body.strength;inherited.supportEvidence=body.supportEvidence;
 const edges=raw.edges.map(e=>({...e,voidEffect:nodes.find(n=>n.role===e.targetRole).void.effective,bodyVoidEffect:body.void.effective,qualitativeNote:applyVoid?'直接关系与各节点旺衰、空亡分别记录':'直接关系与各节点旺衰分别记录'}));
 return freeze({...raw,nodes,edges,castingDate,dayGanzhi:day.dayGanzhi,monthOrder,monthBranch:monthBranch||null,monthSlotForLookup:slot.branch,
  profile:{...raw.profile,...(applyVoid?{id:'product-full-qi-void-1.0.0',voidRuleSetId:VOID_RULESET.id}:{id:'product-full-qi-1.0.0',voidApplied:false}),monthStrength:'full-five-state',application:'typed-question;factual-assessment-only'}});
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
  const bodyPeriod=s.kind==='body-period'&&s.role==='body';
  const expected=s.kind==='support'?'use_generates_body':s.kind==='control'?'use_controls_body':s.kind==='drain'?'body_generates_use':null;
  if(!node||node.void.effective!=='active'||(bodyPeriod?reading.edges.some(e=>e.type==='use_controls_body'):!expected||edge?.type!==expected))throw new Error('Timing source must be an active direct support/controller, sourced drain or no-controller body period');
  const eventScope=s.eventScope||(s.id==='obstruction'?'process-obstruction':s.id==='repair'?'process-repair':s.kind==='support'?'positive-result-candidate':'obstruction-or-adverse-result');
  if(s.kind==='support'){
   const phase=s.stage?eventScope!=='positive-result-candidate':s.ruleIds.includes('good-event');
   if(!s.sourceIds.includes(phase?'mh-116':'mh-071')||!s.ruleIds.includes(phase?'good-event':'fame-date'))
    throw new Error('Interview support timing needs a rule and source for its event scope');
  }
  if(s.kind==='control'&&!s.sourceIds.includes('mh-116'))throw new Error('Timing event lacks its scoped source');
  if(s.kind==='drain'&&!s.sourceIds.includes('mh-143')||bodyPeriod&&!s.sourceIds.includes('mh-071'))throw new Error('Timing fallback lacks its scoped source');
  const calculationBasis={role:s.role,trigram:node.trigram,element:node.element,directRelation:bodyPeriod?'equal':edge.type,
   method:'pre-heaven-element-qi',scale:'day',ruleIds:[...s.ruleIds],sourceIds:[...s.sourceIds],
   ...(s.reason?{reason:s.reason,stage:s.stage,selectionOrder:['casting-month-remaining-days','next-month-if-no-match']}:{}),
   interpretationReview:'author-source-checked',independentInterpretationReview:'pending'};
  return {...s,eventScope,calculationBasis,token:`{{date:${s.id}}}`,branches:[...ELEMENT_DAY_BRANCHES[node.element]],displayLimit:2,
   method:'element-qi',scale:'day',emptyText:'本次可显示范围内暂无相应候选日期。'};
 });
}

const promotionTimingKinds={
 'name-support':{relation:'use_generates_body',valence:'吉',rule:'fame-date',source:'mh-071'},
 'name-body':{relation:'equal',valence:'吉',rule:'fame-body-fallback',source:'mh-071'},
 support:{relation:'use_generates_body',valence:'吉',rule:'good-event',source:'mh-116'},
 control:{relation:'use_controls_body',valence:'凶',rule:'adverse-event',source:'mh-122'},
 drain:{relation:'body_generates_use',valence:'凶',rule:'daily-qi-body-drain',source:'mh-143'},
 equal:{relation:'equal',valence:'吉',rule:'daily-qi-equal',source:'mh-143'},
};
const promotionTimingStages={body:'closing',use:'opening',body_mutual:'process',use_mutual:'process',changed_use:'closing'};

export function promotionTimingSlots(reading,specs,outcome){
 return specs.map(([kind,role,event,text,reason])=>{
  const rule=promotionTimingKinds[kind],stage=promotionTimingStages[role];
  const node=reading.nodes.find(n=>n.role===role);
  const edge=reading.edges.find(e=>e.targetRole===role);
  const bodyPeriod=kind==='name-body',isResult=kind==='name-support'||bodyPeriod;
  if(!rule||!stage||!node||!event||!text||!reason||(isResult&&outcome!=='favourable')||
    (bodyPeriod?role!=='body'||reading.edges.some(e=>e.type==='use_controls_body'):
     edge?.type!==rule.relation))throw new Error('Invalid promotion timing declaration');
  const period=bodyPeriod?TRIGRAM_PERIOD_SPECS.find(p=>p.trigram===node.trigram&&p.scales.includes('day')):null;
  const branches=period?.branches??ELEMENT_DAY_BRANCHES[node.element];
  if(!branches?.length||(bodyPeriod&&!period))throw new Error('Missing promotion day branches');
  const method=bodyPeriod?'trigram-periods':'element-qi';
  const sourceIds=[...new Set([rule.source,'mh-058','mh-117','mh-122',bodyPeriod?'mh-052':'mh-143'])];
  const ruleIds=[rule.rule,'method-order','horizon'];
  const id=kind+'-'+role;
  return {id,token:'{{date:'+id+'}}',kind,role,stage,event,text,reason,valence:rule.valence,
   eventScope:isResult?'positive-result-candidate':stage+'-'+kind,
   prefix:'可留意',suffix:'前后，'+text,displayLimit:2,
   emptyText:text,branches:[...branches],sourceIds,ruleIds,method,scale:'day',
   calculationBasis:{role,trigram:node.trigram,element:node.element,directRelation:rule.relation,
    method:bodyPeriod?'pre-heaven-trigram-periods':'pre-heaven-element-qi',scale:'day',ruleIds,sourceIds,
    reason,stage,selectionOrder:['casting-month-remaining-days','next-month-if-no-match'],
    interpretationReview:'author-source-checked',independentInterpretationReview:'pending'}};
 });
}

export function createInterviewManuscriptRepository({library,readJSON,includeHistoricalVoid=false,profile=INTERVIEW_PROFILE}){
 const directory='data/authored-readings/'+profile.directory+'/';
 const cache=new Map();
 const read=path=>{if(!cache.has(path))cache.set(path,Promise.resolve(readJSON(path)).then(v=>{
  if(v.schemaVersion!=='1.0.0'||v.contentVersion!==library.contentVersion||v.manuscriptVersion!==profile.manuscriptVersion)throw new Error('Authored interview version mismatch');return freeze(v);
 }).catch(e=>{cache.delete(path);throw e;}));
 while(cache.size>3){const victim=[...cache.keys()].find(k=>!k.endsWith('/index.json')&&k!==path);if(!victim)break;cache.delete(victim);}
 return cache.get(path);};
 async function getContent(question,options){
  if(question.id!==profile.questionId||question.question_type!==profile.questionType||question.manuscriptIndexPath!==directory+'index.json')throw new Error('Invalid authored manuscript binding');
  const missing=!options.castingDate?['castingDate']:[];if(!options.monthBranch&&!options.monthOrder)missing.push('monthBranch');
  if(missing.length)return {status:'requires-context',missingContext:missing,story:null,paragraphs:[],predictionAllowed:false,productionAllowed:false};
  const reading=createContextualReading({library,question,...options,applyVoid:includeHistoricalVoid});
  const index=await read(question.manuscriptIndexPath);
  if(index.questionId!==question.id)throw new Error('Authored interview question mismatch');
  const pending=()=>({status:'pending-authoring',reading,story:null,paragraphs:[],predictionAllowed:false,productionAllowed:false,
   coverage:{baseCases:index.baseCaseCount,authoredVersions:index.authoredVersionCount,contextProfiles:index.contextProfileCount,totalBaseCases:4608}});
  const entry=index.files.find(f=>f.primaryId===reading.primaryId);if(!entry)return pending();
  if(entry.path!==`${directory}hex-${String(reading.primaryId).padStart(3,'0')}.json`)throw new Error('Invalid authored shard path');
  const file=await read(entry.path);if(file.questionId!==question.id||file.primaryId!==reading.primaryId)throw new Error('Authored shard identity mismatch');
  const position=file.monthSlots[reading.movingLine+':'+reading.monthSlotForLookup];
  if(position===undefined)return pending();
  if(!Number.isInteger(position)||!file.rows[position])throw new Error('Invalid month slot reference');
  const matchesMonth=row=>row.primaryId===reading.primaryId&&row.movingLine===reading.movingLine&&
   row.monthOrder===reading.monthOrder&&row.monthBranches.includes(reading.monthSlotForLookup);
  const baseRow=file.rows[position];
  if(!matchesMonth(baseRow))throw new Error('Authored month slot mismatch');
  const key=includeHistoricalVoid?getVoidProfileKey(reading):null;
  const matchingContexts=includeHistoricalVoid?file.rows.filter(row=>row.voidProfileKey===key&&matchesMonth(row)):[];
  if(matchingContexts.length>1)throw new Error('Duplicate authored interview void profile');
  const exactProfile=matchingContexts.length===1;
  const row=matchingContexts[0]??baseRow;
  // The prose relies on both mutual trigrams for the middle stage.
  const baseEligible=baseRow.baseProse===true&&(!includeHistoricalVoid||reading.nodes.every(n=>n.role==='body_inherited'||n.void.effective==='active'));
  if(!exactProfile&&!baseEligible)return pending();
  const material=structuredClone(row);delete material.artifactDigest;
  if(await interpretationArtifactDigest(material)!==row.artifactDigest||row.review.status!=='author-checked'||AUDIT_CHECKS.some(id=>row.review.checks[id]?.status!=='pass'||!row.review.checks[id].evidence.length))throw new Error('Authored receipt or content binding invalid');
  if(profile===INTERVIEW_PROFILE)checkInterviewDecision(reading,{outcome:row.decision.outcomeCode,counterevidence:row.counterevidence,decisionPolicy:row.decision.decisionPolicy});
  else if(row.decision.question_type!==profile.questionType||row.decision.questionScope!=='promotion-with-associated-pay')throw new Error('Authored promotion scope mismatch');
  checkInterviewShort(row.copy.short.text);
  if(includeHistoricalVoid&&row.ruleVersions.void!==VOID_RULESET.id)throw new Error('Authored void ruleset version mismatch');
  if(row.movingLineText!==reading.selectedMovingLine.text||row.stageIds.some((id,i)=>id!==Object.values(reading.stages)[i].id))throw new Error('Authored chart/source identity mismatch');
  if(row.timingSlots.some(s=>reading.nodes.find(n=>n.role===s.role)?.void.effective!=='active'))return pending();
  const isPromotion=profile===PROMOTION_PAY_PROFILE;
  const actualSlots=isPromotion?promotionTimingSlots(reading,row.timingSpecs,row.decision.outcomeCode):interviewTimingSlots(reading,row.timingSlots);
  if(actualSlots.some((s,i)=>JSON.stringify(s.branches)!==JSON.stringify(row.timingSlots[i].branches)))throw new Error('Authored timing branch mismatch');
  const storedTiming=row.timingSlots.length>0||row.voidTimingSlots.length>0;
  const missingTiming=[];
  if(storedTiming&&options.timingScale!=='day')missingTiming.push('timingScale');
  if(storedTiming&&(options.timingContext?.castingMethod!=='pre-heaven'||options.timingContext?.periodMethod!=='element-qi'))missingTiming.push('timingMethod');
  if(includeHistoricalVoid&&missingTiming.length)return {status:'requires-context',missingContext:missingTiming,reading,story:null,paragraphs:[],predictionAllowed:false,productionAllowed:false};
  const hasTiming=storedTiming&&!missingTiming.length;
  const timingOmission=missingTiming.length?{status:'not-derived',reason:'此起卦方式或时间尺度无法按先天卦气取日。',sourceIds:['mh-058','mh-122']}:row.timingOmission;
  const voidDetails=interviewVoidReleaseSlots(reading,row.voidReleaseSpecs||[]);
  if(JSON.stringify(voidDetails.slots)!==JSON.stringify(row.voidTimingSlots||[])||voidDetails.text!==(row.voidTimingText||''))throw new Error('Authored void-release binding mismatch');
  const timingNote=isPromotion
   ? (hasTiming?'传统推算的参考窗口，适用于本次评定已进入近期流程。':row.timingOmission?NO_WINDOW_NOTE:'以下为这次评定各阶段的参考。')
   : (hasTiming?REFERENCE_WINDOW_NOTE:NO_WINDOW_NOTE);
  const c=row.copy.long;
  const payRange=row.decision.pay?.range;
  const stages=['开局：'+c.opening,'过程：'+c.process,'结局：'+c.ending+(payRange?' '+payRange:'')];
  const summary='总断：'+c.summary;
  const phaseNotes=isPromotion&&!hasTiming?actualSlots.map(slot=>slot.text):[];
  const timingBody=hasTiming?row.timingSlots.map(s=>s.token):phaseNotes;
  const paragraphs=[...stages,'应期：'+[timingNote,...timingBody].join('\n'),summary];
  const allSlots=hasTiming?[...row.timingSlots,...row.voidTimingSlots]:[];
  const dates=hasTiming?resolveManuscriptDates({paragraphs,dateSlots:allSlots,reading,castingDate:options.castingDate,viewDate:options.viewDate,timingScale:options.timingScale,timingContext:options.timingContext}):
   {status:'resolved',paragraphs,dateMatches:[],castingDate:reading.castingDate,dayGanzhi:reading.dayGanzhi};
  if(dates.status!=='resolved')throw new Error('Complete interview context failed to resolve dates');
  const dateResolution={...dates,interpretationReviewed:false,independentInterpretationReview:'pending',dateMatches:dates.dateMatches.map(d=>{
   const slot=allSlots.find(s=>s.id===d.slotId);
   const rendered=resolveManuscriptDates({paragraphs:[slot.token],dateSlots:[slot],reading,castingDate:options.castingDate,viewDate:options.viewDate,timingScale:options.timingScale,timingContext:options.timingContext});
   return {...d,text:rendered.paragraphs[0],eventScope:slot.eventScope,targetBranches:[...slot.branches],calculationBasis:slot.calculationBasis};
  })};
  const timingSection={title:'应期参考',referenceNote:timingNote,castingDate:reading.castingDate,
   windows:dateResolution.dateMatches,...(phaseNotes.length?{phaseNotes}:{})};
  const narrativeParagraphs=[...stages,summary];
  const labels={body:'原体',use:'本用',body_mutual:'体互',use_mutual:'用互',changed_use:'变用',body_inherited:'变卦沿用原体'};
  const detailLines=row.decision.sourceEvidence?[
   `本互变：${Object.values(reading.stages).map(stage=>stage.name).join(' → ')}，本卦${reading.selectedMovingLine.label}动。`,
   reading.nodes.map(n=>`${labels[n.role]}${n.trigram}${n.element}${n.strength.state}`).join('，')+'。',
   reading.edges.map(e=>labels[e.targetRole]+relationLabels[e.type]).join('，')+'。',
   ...(isPromotion?[`体用位置：${reading.body.side==='upper'?'上卦':'下卦'}为原体，动爻所在${reading.use.side==='upper'?'上卦':'下卦'}为本用。`]:[]),
   ...reading.nodes.filter(n=>n.role!=='body_inherited'&&n.void.hit).map(n=>
    `${labels[n.role]}${n.trigram}命中${n.void.matchedBranches.join('、')}，作用状态：${n.void.label}。`),
   ...row.counterevidence.map(c=>c.resolution),
   `判断口径：${row.ruleVersions.decision}。稿件版本：${row.review.version}。`,
  ]:[];
  const monthNote=reading.monthBranch?`月令：${reading.monthBranch}月。`:`月令气类：${MONTH_ORDERS.find(o=>o.id===reading.monthOrder).label}。具体月令未提供。`;
  const dayNote=`起卦日：${reading.castingDate}，${reading.dayGanzhi}日`;
  const dateAndMonthNotes=includeHistoricalVoid?[
   (reading.monthBranch?monthNote:monthNote.replace('。具体月令','；具体月令'))+'旺衰与旬空分别计算。',
   dayNote+`；旬空：${reading.nodes.find(n=>n.role==='body').void.xun.branches.join('、')}。`,
  ]:[monthNote,dayNote+'。'];
  const calculationExplanation={
   month:{branch:reading.monthBranch,input:reading.monthBranch?'explicit-branch':'qi-category-only',qiCategory:reading.monthOrder,states:reading.nodes.filter(n=>n.role!=='body_inherited').map(n=>({role:n.role,trigram:n.trigram,element:n.element,qi:n.strength.state}))},
   ...(includeHistoricalVoid?{void:{...VOID_RULESET,dayGanzhi:reading.dayGanzhi,emptyBranches:[...reading.nodes.find(n=>n.role==='body').void.xun.branches],
    nodes:reading.nodes.filter(n=>n.role!=='body_inherited').map(n=>({role:n.role,trigram:n.trigram,hitKind:n.void.hitKind,matchedBranches:[...n.void.matchedBranches],state:n.void.state,effective:n.void.effective})),notes:exactProfile?[...row.coreVoidNotes]:[]}}:{}),
   timing:{independentInterpretationReview:'pending',windows:dateResolution.dateMatches,...(timingOmission?{omission:timingOmission}:{})},
   paragraphs:[...dateAndMonthNotes,
    ...detailLines,
    ...(exactProfile&&row.voidScenario?.origin!=='individual-void-manuscript'?row.coreVoidNotes:[]),
    ...(includeHistoricalVoid?[`空亡依据：八卦配支补充法，版本${VOID_RULESET.id}。`]:[]),
    ...(timingOmission?[timingOmission.reason]:[]),
    ...dateResolution.dateMatches.map(d=>{
     const round=d.calculationBasis.selectionOrder&&d.matches.length?`（${d.matches[0].monthOffset?'下月匹配':'起卦当月匹配'}）`:'';
     const role=d.calculationBasis.role;
     const label=(!row.decision.sourceEvidence&&{body:'体',use:'用'}[role])||labels[role]||role;
     const ruleNote=isPromotion?` ${d.calculationBasis.reason} 依据 ${d.sourceIds.join('、')}。`:'';
     return `${d.valence}应 · ${d.event}：取${label}${d.calculationBasis.trigram}${d.calculationBasis.element}所应${d.targetBranches.join('、')}日；显示${d.displayedDates.join('、')}${round}。${ruleNote}`;
    })]};
  return freeze({status:'ready',reading,title:row.copy.title,short:row.copy.short.text,long:c,decision:row.decision,
   paragraphs:dates.paragraphs,story:dates.paragraphs.join('\n\n'),narrativeParagraphs,timingSection,dateResolution,calculationExplanation,timingDecision:allSlots,
   review:row.review,sourceIds:row.sourceIds,monthBranch:reading.monthBranch,monthOrder:reading.monthOrder,voidMatch:!includeHistoricalVoid?'not-applied':exactProfile?'recorded-context':'base-with-no-core-change',manuscriptVersion:row.review.version,productionAllowed:true,predictionAllowed:true,
   interpretationScope:'traditional-symbolic;author-checked-exact-case;not-verified-real-world-outcome',reportedOutcome:null});
 }
 return Object.freeze({getContent,clearCache:()=>cache.clear()});
}
