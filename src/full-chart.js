import {relation} from './index.js';
const ROLE_LABELS={body:'本体',use:'本用',body_mutual:'体互',use_mutual:'用互',body_inherited:'变卦承原体',changed_use:'变用'};
function freeze(x){if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.freeze(x);Object.values(x).forEach(freeze);}return x;}
/** Six visible positions and their five-element relations; no invented weights or three new selves. */
export function buildFullChartRelations(reading){
 if(reading.nodes.length!==6)throw new Error('Six trigram positions required');
 const root=reading.nodes.find(n=>n.role==='body');if(!root)throw new Error('Original body required');
 const nodes=reading.nodes.map(n=>({...n,label:ROLE_LABELS[n.role],entityId:n.role==='body_inherited'?root.id:n.id,
  isInheritedBody:n.role==='body_inherited',rootBodyId:root.id,
  ...(n.role==='body_inherited'?{strength:root.strength,void:root.void,assessmentInheritedFrom:root.id}:{})}));
 const entities=nodes.filter(n=>!n.isInheritedBody),pairs=[];
 for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){
  const a=nodes[i],b=nodes[j],r=relation(a.element,b.element);
  const aActs=['body_controls_use','body_generates_use'].includes(r.type),equal=r.type==='equal';
  pairs.push({a:a.id,b:b.id,aRole:a.role,bRole:b.role,aTrigram:a.trigram,bTrigram:b.trigram,
   sameEntity:a.entityId===b.entityId,type:r.type,kind:equal?'equal':r.type.includes('generates')?'generates':'controls',
   from:equal?null:aActs?a.id:b.id,to:equal?null:aActs?b.id:a.id,
   assessments:[a,b].map(n=>({role:n.role,month:n.strength,void:n.void})),
   usage:'relationship-reference;not-independent-additive-energy',sourceIds:['mh-007','mh-061','mh-118','mh-119']});
 }
 const directed=pairs.filter(p=>p.kind!=='equal'&&p.aRole!=='body_inherited'&&p.bRole!=='body_inherited'),chains=[];
 for(const p of directed)for(const q of directed){
  if(p.to!==q.from||p.from===q.to)continue;
  if(q.to===root.id&&q.kind==='controls'&&p.kind==='controls')chains.push({kind:'restrain-controller',nodes:[p.from,p.to,q.to],sourceIds:['mh-109','mh-118'],usage:'检查制克体者的节点旺衰与空亡，不能自动判为已制住'});
  if(q.to===root.id&&q.kind==='generates'&&p.kind==='generates')chains.push({kind:'generation-path',nodes:[p.from,p.to,q.to],sourceIds:['mh-007','mh-061'],usage:'生扶路径备查，不自动抵销同时存在的克体'});
 }
 return freeze({rootBodyId:root.id,rootTrigram:root.trigram,rootElement:root.element,
  visiblePositions:6,rootBodyCount:1,independentNodeIdentities:entities.length,nodes,pairs,chains,
  sourceIds:['mh-061','mh-117','mh-118','mh-119'],numericEnergyScore:null});
}
