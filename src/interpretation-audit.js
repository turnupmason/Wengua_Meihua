// Review policy, separate from the preserved classical-explicit engine profile.
export const INTERPRETATION_POLICY_VERSION='interpretation-2.0.0';
export const AUDIT_CHECKS=Object.freeze([
 'chart-and-moving-line','body-use-position','question-method-match',
 'relation-directions','uniform-seasonal-strength','extension-provenance',
 'bounded-indirect-relations','reproducible-event-timing','conclusion-and-counterevidence'
]);
const GENERATES={'木':'火','火':'土','土':'金','金':'水','水':'木'};
const CONTROLS={'木':'土','土':'水','水':'火','火':'金','金':'木'};
const GOVERNORS={'spring-wood':'木','summer-fire':'火','autumn-metal':'金','winter-water':'水','seasonal-earth':'土'};
const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.freeze(value);Object.values(value).forEach(freeze);}return value;};

/** monthOrder is an explicit qi category, never inferred from a Gregorian month. */
export function assessSeasonalQi(element,monthOrder){
 const governor=GOVERNORS[monthOrder];
 if(!governor||!Object.hasOwn(GENERATES,element))throw new RangeError('Explicit month qi order and element required');
 const state=element===governor?'旺':GENERATES[governor]===element?'相':GENERATES[element]===governor?'休':CONTROLS[element]===governor?'囚':'死';
 return freeze({element,monthOrder,governor,state,policyVersion:INTERPRETATION_POLICY_VERSION,
  sourceLayer:'user-supplied-winter-table;other-orders-derived-by-declared-five-element-rule',
  numericMultiplier:null,impliesNoEffect:false,impliesTrueVoid:false});
}

/** Inspectable facts only. They do not compute a verdict or authorize a story. */
export function buildInterpretationEvidence(reading,{monthOrder}={}){
 const body=reading.nodes.find(n=>n.role==='body');
 if(!body||reading.nodes.length!==6)throw new TypeError('A canonical six-position reading required');
 const nodes=reading.nodes.map(n=>({id:n.id,role:n.role,trigram:n.trigram,element:n.element,
  independent:n.role!=='body_inherited',strength:assessSeasonalQi(n.element,monthOrder),
  voidAnnotation:{state:n.void.state,matchedBranches:n.void.matchedBranches||[],hitKind:n.void.hitKind,
   sourceLayer:'user-void-extension',assignment:'later-heaven-directional;not-najia',
   interpretiveImpact:n.void.hitKind==='partial'?'annotation-only;no-whole-trigram-or-fractional-effect':'requires-extension-rule-review'}}));
 return freeze({policyVersion:INTERPRETATION_POLICY_VERSION,monthOrder,
  calendarBoundary:{status:'explicit-qi-category-only',automaticCalendarSelection:false,seasonalEarthConvention:'unresolved'},
  rootBodyId:body.id,nodes,directRelations:reading.edges.map(e=>({targetRole:e.targetRole,type:e.type,from:e.from,to:e.to,
   label:e.label,sourceSectionTitles:e.sourceSectionTitles,
   assessments:[nodes.find(n=>n.role==='body'),nodes.find(n=>n.role===e.targetRole)].map(n=>({role:n.role,strength:n.strength,voidAnnotation:n.voidAnnotation}))})),
  priority:['use','body_mutual','use_mutual','changed_use'],priorityIsNumericWeight:false,
  appliedIndirectRules:[],indirectPolicy:'direct-first;approved-conditional-rules-only;max-two-hops;no-cycles;no-double-count;no-automatic-overturn',
  assessment:'facts-for-review;not-a-final-interpretation',sourceIds:['mh-061','mh-117','mh-119']});
}

export async function interpretationArtifactDigest(material){
 const bytes=new TextEncoder().encode(JSON.stringify(material));
 return Array.from(new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
}

/** Approval is exact, evidence-bearing and content-bound. Legacy "reviewed" flags do not qualify. */
export function evaluateInterpretationReview(registry,binding){
 if(registry?.policyVersion!==INTERPRETATION_POLICY_VERSION||!Array.isArray(registry.records))return freeze({status:'pending-review',passed:0,total:9,reasons:['review-registry-missing-or-policy-mismatch']});
 const fields=['questionId','question_type','key','contextKey','profileKey','artifactDigest','contentVersion','policyVersion','timingKey'];
 if(!binding||fields.filter(f=>f!=='profileKey').some(f=>typeof binding[f]!=='string'||!binding[f].trim())||
  !(binding.profileKey===null||typeof binding.profileKey==='string'&&binding.profileKey.trim())||
  !/^[a-f0-9]{64}$/.test(binding.artifactDigest)||binding.policyVersion!==INTERPRETATION_POLICY_VERSION)
  return freeze({status:'pending-review',passed:0,total:9,reasons:['incomplete-or-invalid-review-binding']});
 const records=registry.records.filter(r=>fields.every(f=>r?.binding?.[f]===binding[f]));
 if(records.length!==1)return freeze({status:'pending-review',passed:0,total:9,reasons:[records.length?'duplicate-exact-review':'no-exact-nine-check-review']});
 const record=records[0];
 const checks=AUDIT_CHECKS.map(id=>({id,passed:record.checks?.[id]?.status==='pass'&&
  Array.isArray(record.checks[id].evidence)&&record.checks[id].evidence.length>0&&
  record.checks[id].evidence.every(e=>e&&typeof e.sourceId==='string'&&e.sourceId.trim()&&typeof e.locator==='string'&&e.locator.trim()&&typeof e.reason==='string'&&e.reason.trim())}));
 const passed=checks.filter(c=>c.passed).length;
 const approved=record.status==='approved'&&passed===9&&typeof record.reviewer==='string'&&record.reviewer.trim()&&/^\d{4}-\d{2}-\d{2}T/.test(record.reviewedAt||'');
 return freeze({status:approved?'approved':'pending-review',passed,total:9,checks,
  reasons:approved?[]:['nine-check-evidence-or-review-signature-incomplete']});
}
