import {readRepositoryJSON} from './io.js';
import {composeDirectStory,COMPOSITION_VERSION} from './story-language.js';
import {auditTimingCandidates} from './timing-audit.js';
import {buildFullChartRelations} from './full-chart.js';
import {monthOrder,MONTH_ORDERS} from './narrative-rules.js';
export {MONTH_ORDERS};
const BRANCHES=[...'子丑寅卯辰巳午未申酉戌亥'];
const QI_BRANCHES={木:['寅','卯'],火:['巳','午'],土:['辰','戌','丑','未'],金:['申','酉'],水:['亥','子']};
const ROLE_LABELS={body:'你一侧的根基',use:'眼前事情的条件',body_mutual:'过程中靠近你的一侧',use_mutual:'过程中靠近事情的一侧',changed_use:'末段的承接条件'};
export const VOID_ACTIONS=Object.freeze({
 true_void:'依现有证据已判真空，后遇填实或冲实也不自动恢复，不能把一个时间节点当成落实保证',
 dormant:'眼下有静空待实的意味，进程容易悬而未落，适合等实际条件与填实、冲实节点相互印证',
 moving_exempt:'虽有逢空的象意，本身仍在发动，保留生克作用；过程中可能反复，需看实际推进',
 strong_exempt:'虽有逢空的象意，仍因得令保留作用，不能把它直接看作失去力量',
 supported:'有明确生扶，按假空待落实看，适合观察帮助是否化为实际承接',
 partial_pending:'有一部分对应条件尚悬，依据还不足以判定整股力量失效',
 partial_not_applied:'只部分命中，依当前全支规则保留作用，仍需核对悬而未定的一面',
 released:'已提供填实或合规释放条件，需再与实际进展核对，不能只凭节点认定事情完成'
});
function freeze(x){if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.freeze(x);Object.values(x).forEach(freeze);}return x;}
function integer(x,min,max,label){if(!Number.isSafeInteger(x)||x<min||x>max)throw new RangeError(`${label} must be ${min}..${max}`);}
function roleEffect(type){return type==='use_controls_body'?'这会减轻该项克体压力':type==='use_generates_body'?'这使该项助益的落实更需观察':type==='body_generates_use'?'该项投入及消耗的实际程度仍需核对':type==='body_controls_use'?'原有可掌握的条件仍需落实':'原有相合条件仍需落实';}
/** Time windows are conditional branch candidates, not invented Gregorian dates or observed feedback. */
export function buildTimingPlan(reading,{timingScale=null,castContext=null,timingContext={}}={}){
 if(timingScale!==null&&!['day','month','year','hour'].includes(timingScale))throw new RangeError('Unknown timingScale');
 const ganzhis=[...new Set(reading.nodes.filter(n=>n.void.xun).map(n=>n.void.xun.ganzhi))];
 if(ganzhis.length>1)throw new Error('Mixed void ganzhi across chart roles; one casting basis required');
 const voidBasis=reading.profile?.voidBasis||'day-explicit-input',voidGanzhi=ganzhis[0]||null;
 const dayGanzhi=voidBasis==='day-explicit-input'?voidGanzhi:null;
 const currentBranch=dayGanzhi?[...dayGanzhi][1]:null;
 const decorate=branch=>({branch,...(timingScale==='day'&&currentBranch?{afterDays:(BRANCHES.indexOf(branch)-BRANCHES.indexOf(currentBranch)+12)%12||12,calendarOnly:true,selectedAsEventDate:false}:{})});
 const body=reading.nodes.find(n=>n.isBody),voidWindows=[],qiWindows=[],blocked=[];
 for(const n of reading.nodes.filter(n=>['body','use','body_mutual','use_mutual','changed_use'].includes(n.role))){
  if(n.void.hit!==true)continue;
  if(n.void.state==='true_void'||(n.role!=='body'&&body.void.state==='true_void')){
   blocked.push({role:n.role,state:n.void.state,reason:'真空不因未来填冲自动恢复'});continue;
  }
  if(['partial_pending','partial_not_applied','released'].includes(n.void.state))continue;
  for(const t of n.void.releaseTargets||[]){
   voidWindows.push({role:n.role,emptyBranch:t.emptyBranch,mechanism:'fill',priority:0,...decorate(t.fill),condition:'非真空；待与事情实际落实条件核对'});
   voidWindows.push({role:n.role,emptyBranch:t.emptyBranch,mechanism:'clash',priority:1,...decorate(t.clash),condition:'非真空；冲实为次选候选，不保证事情完成'});
   if(n.void.combineEligible)voidWindows.push({role:n.role,emptyBranch:t.emptyBranch,mechanism:'combine',priority:2,...decorate(t.combine),condition:'已启用；婚姻或合作；动或得令/生扶假空'});
  }
 }
 for(const e of reading.edges){
  const node=reading.nodes.find(n=>n.role===e.targetRole);
  const kind=e.type==='use_generates_body'?'support':e.type==='equal'?'equal':e.type==='use_controls_body'?'pressure':null;
  if(!kind)continue;
  const active=!['suppressed','dormant','unknown'].includes(node.void.effective)&&(kind==='pressure'||body.void.state!=='true_void');
  for(const branch of QI_BRANCHES[node.element])qiWindows.push({role:node.role,kind,element:node.element,...decorate(branch),active,condition:active?'按卦气择候，仍须结合所问事情及实际进展':'本项空亡/资料状态未允许直接作为落实应期'});
 }
 voidWindows.sort((a,b)=>a.priority-b.priority||(a.afterDays||0)-(b.afterDays||0));
 let numericalWindow=null;
 if(castContext){
  if(castContext.method!=='object-direction-hour')throw new RangeError('Numerical motion timing requires explicit object-direction-hour input');
  for(const k of ['objectTrigramNumber','directionTrigramNumber'])integer(castContext[k],1,8,k);
  integer(castContext.hourBranchNumber,1,12,'hourBranchNumber');
  if(!['walking','standing','sitting'].includes(castContext.motion))throw new RangeError('Explicit observed motion required');
  const names=['乾','兑','离','震','巽','坎','艮','坤'],total=castContext.objectTrigramNumber+castContext.directionTrigramNumber+castContext.hourBranchNumber;
  const h=reading.stages.primary.detail;
  if(names[castContext.objectTrigramNumber-1]!==h.upperTrigram||names[castContext.directionTrigramNumber-1]!==h.lowerTrigram||(total-1)%6+1!==reading.movingLine)throw new Error('Timing input does not reproduce the original chart');
  const count=total*(castContext.motion==='walking'?0.5:castContext.motion==='sitting'?2:1);
  numericalWindow={rawTotal:total,motion:castContext.motion,count,unit:'day',status:timingScale!=='day'?'requires-explicit-day-scale':!Number.isInteger(count)?'fractional-needs-interpretation':'conditional-numerical-candidate',sourceIds:['mh-039','mh-122']};
 }
 const legacy={basis:'conditional-traditional-timing',scale:timingScale,voidBasis,voidGanzhi,dayGanzhi:dayGanzhi||null,voidWindows,qiWindows,blocked,numericalWindow,
  text:'',
  sourceIds:['mh-012','mh-052','mh-122','user-void-timing'],priority:['fill','clash','conditional-combine'],gregorianDates:[],reportedOutcome:null};
 return freeze(auditTimingCandidates(reading,legacy,{timingContext}));
}
export function createNarrativeRepository({library,readJSON=readRepositoryJSON}){
 if(!library?.contentVersion)throw new TypeError('Canonical library required');const cache=new Map();
 const read=path=>{if(!cache.has(path))cache.set(path,Promise.resolve().then(()=>readJSON(path)).then(x=>{
  if(x.contentVersion!==library.contentVersion||x.narrativeVersion!=='1.0.0')throw new Error('Narrative version mismatch');return freeze(x);
 }).catch(e=>{cache.delete(path);throw e;}));return cache.get(path);};
 async function getBase({primaryId,movingLine,monthOrder:orderId,mutualPolicy='inner-lines'}){
  integer(primaryId,1,64,'primaryId');integer(movingLine,1,6,'movingLine');monthOrder(orderId);
  if(mutualPolicy!=='inner-lines')throw new RangeError('This prewritten edition uses inner-lines mutual policy');
  const file=await read(`data/stories/${String(primaryId).padStart(2,'0')}.json`);
  const row=file.rows.find(r=>r.primaryId===primaryId&&r.movingLine===movingLine&&r.monthOrder===orderId);
  if(!row)throw new Error('Prewritten narrative missing');
  const stageIds=[primaryId,library.getMutualHexagram(primaryId).id,library.getChangedHexagram(primaryId,movingLine).id];
  if(stageIds.some((id,i)=>row.stageIds[i]!==id||row.baseGrades[i]!==library.getHexagram(id).grade.rawGrade))throw new Error('Prewritten story chart or grade mismatch');
  return freeze({...row,story:row.paragraphs.join('\n\n')});
 }
 async function getStory({primaryId,movingLine,monthOrder:orderId,domainId='domain-02',voidContext={},timingScale=null,castContext=null,timingContext={},question='',mutualPolicy='inner-lines'}){
  const order=monthOrder(orderId),base=await getBase({primaryId,movingLine,monthOrder:orderId,mutualPolicy});
  const reading=library.createReading({primaryId,movingLine,domainId,calendar:{season:order.season},voidContext,question,mutualPolicy});
  const rules=await read('data/stories/domain-rules.json'),domain=rules.domains.find(d=>d.id===domainId);if(!domain)throw new RangeError('Unknown narrative domain');
  const voidNotes=[];
  for(const n of reading.nodes.filter(n=>['body','use','body_mutual','use_mutual','changed_use'].includes(n.role))){
   const action=VOID_ACTIONS[n.void.state];if(!action)continue;
   const edge=reading.edges.find(e=>e.targetRole===n.role);
   let text=ROLE_LABELS[n.role]+'，'+action;
   if(n.role==='use')text+='；'+domain.voidConcern;
   if(edge&&['suppressed','dormant'].includes(n.void.effective))text+='，'+roleEffect(edge.type);
   voidNotes.push({role:n.role,state:n.void.state,text:text+'。',sourceIds:['user-void-extension','user-void-timing',domain.sourceSectionId]});
  }
  const timing=buildTimingPlan(reading,{timingScale,castContext,timingContext});
  const composed=composeDirectStory({reading,domain,order,timing});
  return freeze({id:base.id,contentVersion:library.contentVersion,narrativeVersion:'1.0.0',compositionVersion:COMPOSITION_VERSION,monthOrder:order,domainId,reading,fullChart:buildFullChartRelations(reading),
   baseStory:base.story,...composed,story:composed.paragraphs.join('\n\n'),voidNotes,timing,sourceIds:[...new Set([...base.sourceIds,domain.sourceSectionId,...timing.sourceIds])],
   scope:'prospective-symbolic-reading;no invented retrospective events',reportedOutcome:null,baseGradesUnchanged:true});
 }
 async function getClassicalCases({primaryId,movingLine}={}){
  if(primaryId!==undefined)integer(primaryId,1,64,'primaryId');if(movingLine!==undefined)integer(movingLine,1,6,'movingLine');
  const d=await readJSON('data/classical-cases.json');if(d.contentVersion!==library.contentVersion)throw new Error('Case content version mismatch');
  return freeze(d.cases.filter(c=>c.charts.some(x=>(primaryId===undefined||x.primaryId===primaryId)&&(movingLine===undefined||x.movingLine===movingLine))));
 }
 return Object.freeze({getBase,getStory,getClassicalCases,getIndex:()=>read('data/stories/index.json'),clearCache:()=>cache.clear()});
}
