import {MONTH_ORDERS} from './narrative-rules.js';
import {buildInterpretationEvidence} from './interpretation-audit.js';
import {questionTypeFor} from './question-types.js';
export const STORY_EDITORIAL_VERSION='story-editorial-3.0.0';
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.freeze(x);Object.values(x).forEach(freeze);}return x;};
const ROLES=['body','use','body_mutual','use_mutual','body_inherited','changed_use'];

/** Terms are source observations, never a numerical score or an automatic verdict. */
export function inspectMovingLine(text){
 if(typeof text!=='string'||!text.trim())throw new TypeError('Complete moving-line source text required');
 const terms=[...text.matchAll(/无初有终|无不利|无攸利|终吉|贞吉|贞凶|贞厉|征凶|无咎|悔亡|有攸往|吉|凶|利/gu)]
  .map(m=>({term:m[0],start:m.index,end:m.index+m[0].length,requiresContextualInterpretation:true}));
 return freeze({fullText:text,terms,automaticPolarityScore:null,applicationMustBeCurated:true});
}

/** All three charts, role assignments and qi states come from canonical code. */
export function collectStoryFacts({library,question,primaryId,movingLine,monthOrder}){
 if(!question?.id||question.question_type!==questionTypeFor(question))throw new TypeError('Canonical typed question required');
 const order=MONTH_ORDERS.find(o=>o.id===monthOrder);if(!order)throw new RangeError('Explicit month qi required');
 const r=library.createReading({primaryId,movingLine,domainId:question.domainId,question:question.question,calendar:{season:order.season}});
 const e=buildInterpretationEvidence(r,{monthOrder});
 return freeze({version:STORY_EDITORIAL_VERSION,contentVersion:library.contentVersion,questionId:question.id,
  question_type:question.question_type,domainId:question.domainId,primaryId,movingLine,monthOrder,
  stages:Object.fromEntries(Object.entries(r.stages).map(([k,s])=>[k,{id:s.id,name:s.name,baseGrade:s.baseGrade}])),
  nodes:e.nodes.map(n=>({role:n.role,trigram:n.trigram,element:n.element,qi:n.strength.state,independent:n.independent})),
  relations:e.directRelations.map(x=>({role:x.targetRole,type:x.type})),
  line:{label:r.selectedMovingLine.label,...inspectMovingLine(r.selectedMovingLine.text),image:r.selectedMovingLine.image,
   sourceRef:r.selectedMovingLine.sourceRef,referenceUrl:r.selectedMovingLine.referenceUrl},
  scope:{monthSelection:'explicit-category;not-automatic-calendar',void:'not-applied',timing:'not-derived',realWorldOutcome:'not-observed'}});
}

// These are declared project interpretations of TWO EXACT cases, not ancient universal formulas.
export const CONFLICT_CASE_POLICIES=freeze([
 {id:'conflict-promotion-weak-equality-01',question_type:'promotion',primaryId:27,movingLine:1,monthOrder:'winter-water',
  nodes:[['艮','囚'],['震','相'],['坤','囚'],['坤','囚'],['艮','囚'],['坤','囚']],
  relations:['use_controls_body','equal','equal','equal'],
  line:'舍尔灵龟，观我朵颐，凶。',outcomeCode:'promotion-unfavoured-this-attempt',
  trajectory:'initial-obstruction;later-easing-without-sufficient-support',
  counterevidence:'Final equality is a favourable change, but all earth companions are weak and no direct generating support appears.',
  adoptedInterpretation:'Weak body faces seasonally stronger control; weak equal companions ease conflict without establishing attainment.',
  conditions:[],sourceIds:['mh-056','mh-071','mh-101','mh-117','mh-119'],
  excludedConclusions:['dismissal','punishment','known-manager-intent']},
 {id:'conflict-contract-strong-equality-01',question_type:'sign_contract',primaryId:8,movingLine:2,monthOrder:'winter-water',
  nodes:[['坎','旺'],['坤','囚'],['艮','囚'],['坤','囚'],['坎','旺'],['坎','旺']],
  relations:['use_controls_body','use_controls_body','use_controls_body','equal'],
  line:'比之自内，贞吉。',outcomeCode:'contract-favoured-after-obstruction',
  trajectory:'initial-and-middle-obstruction;favourable-later-coordination',
  counterevidence:'Initial use and both mutual roles control the body; earlier obstacles remain part of the interpretation.',
  adoptedInterpretation:'The body is in season, controllers are weak, final equality is in season, and the line favours holding a proper position.',
  conditions:['retain-core-terms-and-proper-conduct'],sourceIds:['mh-056','mh-061','mh-073','mh-101','mh-117','mh-119'],
  excludedConclusions:['unconditional-signing','exact-number-of-negotiations','exact-signing-date']}
]);

export function resolveConflictCase(facts){
 if(facts.version!==STORY_EDITORIAL_VERSION)return freeze({status:'unresolved',productionAllowed:false,reason:'Case policy version mismatch'});
 const applicable=CONFLICT_CASE_POLICIES.filter(p=>p.question_type===facts.question_type&&p.primaryId===facts.primaryId&&p.movingLine===facts.movingLine&&p.monthOrder===facts.monthOrder);
 if(applicable.length!==1||facts.scope?.void!=='not-applied'||facts.scope?.timing!=='not-derived')
  return freeze({status:'unresolved',productionAllowed:false,reason:'No exact project case policy; do not let prose invent a resolution'});
 const p=applicable[0],nodes=ROLES.map(role=>facts.nodes.find(n=>n.role===role));
 const relations=['use','body_mutual','use_mutual','changed_use'].map(role=>facts.relations.find(r=>r.role===role)?.type);
 if(nodes.some((n,i)=>!n||n.trigram!==p.nodes[i][0]||n.qi!==p.nodes[i][1])||JSON.stringify(relations)!==JSON.stringify(p.relations)||facts.line?.fullText!==p.line)
  return freeze({status:'unresolved',productionAllowed:false,reason:'Case facts do not match policy prerequisites'});
 return freeze({status:'case-policy-matched',policyVersion:STORY_EDITORIAL_VERSION,policyId:p.id,outcomeCode:p.outcomeCode,trajectory:p.trajectory,
  counterevidence:p.counterevidence,adoptedInterpretation:p.adoptedInterpretation,conditions:p.conditions,sourceIds:p.sourceIds,
  excludedConclusions:p.excludedConclusions,scope:'exact-project-interpretation;not-generalized-classical-formula',
  productionAllowed:false,releaseReview:'separate-nine-check-review-required',numericWeights:null});
}

const INTERNAL_LANGUAGE=[/不能把.{0,32}(写|叠加|单独当|判成|当作)/u,/不由.{0,45}(推成|推为)|不据此限定/u,/不宜写|写得过重|写成.{0,10}结论|模型|审核|规则权重|算法|生成流程|需要一起看/u];
export function countHan(text){return [...text.matchAll(/\p{Script=Han}/gu)].length;}
export function validateStoryCopy(sample){
 const {decision,copy}=sample;
 if(!decision?.id||copy?.short?.decisionId!==decision.id||copy?.long?.decisionId!==decision.id)throw new Error('Short and long text must bind the same decision');
 const n=countHan(copy.short.text);if(n<60||n>120)throw new Error(`Short reading requires 60–120 Han characters, got ${n}`);
 const texts=[copy.title,copy.short.text,...['opening','process','ending','summary'].map(k=>copy.long[k])];
 if(texts.some(t=>typeof t!=='string'||!t.trim()))throw new Error('Complete short and four-part long text required');
 if(texts.some(t=>t.includes('*')||INTERNAL_LANGUAGE.some(re=>re.test(t))))throw new Error('Internal audit language or asterisks in user-facing text');
 if(texts.some(t=>/\d+\s*(号|月|日)|本月\d|下月\d/u.test(t)))throw new Error('This draft scope has no verified exact dates');
 if(!Array.isArray(sample.lineApplication?.evidence)||!sample.lineApplication.evidence.length||
  !Array.isArray(sample.lineApplication?.conditions)||!sample.lineApplication.conditions.length||
  !Array.isArray(sample.counterevidence)||!sample.counterevidence.length||sample.counterevidence.some(e=>!e.fact||!e.resolution))
  throw new Error('Line application and counterevidence record required');
 return freeze({shortHanCount:n,structuralCopyChecks:'passed',semanticConsistency:'requires-editorial-reading;not-proven-by-identical-IDs'});
}

export function getStoryCopy(sample){
 validateStoryCopy(sample);
 return freeze({decisionId:sample.decision.id,title:sample.copy.title,short:sample.copy.short.text,
  long:{opening:sample.copy.long.opening,process:sample.copy.long.process,ending:sample.copy.long.ending,summary:sample.copy.long.summary},
  productionAllowed:false,status:'editorial-preview'});
}
