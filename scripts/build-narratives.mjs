import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {loadLibrary} from '../src/index.js';
import {MONTH_ORDERS,DOMAIN_STORY_RULES,RELATION_ORDER,DOMAIN_VOID_CONCERNS,relationPlot} from '../src/narrative-rules.js';
import {VOID_ACTIONS} from '../src/narratives.js';
const root=new URL('../',import.meta.url),json=async p=>JSON.parse(await readFile(new URL(p,root),'utf8'));
const lib=await loadLibrary(),book=await json('data/story-portraits.json'),portraits=new Map(book.rows.map(([id,name,opening,middle,ending])=>[id,{name,opening,middle,ending}]));
const save=async(p,d)=>writeFile(new URL(p,root),JSON.stringify(d)+'\n');await mkdir(new URL('data/stories/',root),{recursive:true});
const seasonSource=['mh-007','mh-009','mh-010','mh-061','mh-119'],flowSource=['mh-061','mh-117'];let total=0;const mutualIds=new Set();
for(const h of lib.listHexagrams()){
 if(portraits.get(h.id)?.name!==h.name)throw new Error('Portrait identity mismatch');
 const rows=[];
 for(let line=1;line<=6;line++)for(const order of MONTH_ORDERS){
  const r=lib.createReading({primaryId:h.id,movingLine:line,calendar:{season:order.season}}),body=r.nodes.find(n=>n.isBody);
  const edge=role=>r.edges.find(e=>e.targetRole===role),node=role=>r.nodes.find(n=>n.role===role);
  const plot=role=>relationPlot(edge(role).type,body.strength.state,node(role).strength.state);
  const p=portraits.get(h.id),m=portraits.get(r.stages.mutual.id),c=portraits.get(r.stages.changed.id);
  const monthlyBody={equal:'你一侧与当令之气同气，眼下的根基较得时势',use_generates_body:'当令之气还能生扶你的根基，为这一程提供一层支持',use_controls_body:'当令之气对你的根基有制约，先照顾承受力，再安排推进的分量',body_generates_use:'你一侧也在生助当令之气，行动时宜为持续付出留下余力',body_controls_use:'你一侧与当令之气存在制约关系，掌握局面时更需要留意分寸'}[body.strength.monthRelation.type];
  const mutualSame=edge('body_mutual').type===edge('use_mutual').type&&node('body_mutual').strength.state===node('use_mutual').strength.state;
  const mid=mutualSame?'这段过程的两侧都呈现相近的生克方向：'+plot('body_mutual'):'这一程里，一方面，'+plot('body_mutual')+'；另一方面，'+plot('use_mutual');
  const first=edge('use').type,last=edge('changed_use').type;
  const beneficial=new Set(['use_generates_body','equal']);const adverse=new Set(['use_controls_body','body_generates_use']);
  const arc=adverse.has(first)&&beneficial.has(last)?'开头的费力，与末段出现的承接并存，适合一步步把可用的支持接住':beneficial.has(first)&&adverse.has(last)?'开头虽有相助，后续仍出现需要应对的牵制或消耗，宜在顺手时预留余地':'这一程需要把眼前、中途和末段一起照顾，随着实际条件调整步伐';
  const paragraphs=[order.opening+'。眼下是“'+h.name+'”的场景：'+p.opening+'。'+monthlyBody+'。'+plot('use')+'。',
   '事情行到中段，画面转为“'+r.stages.mutual.name+'”：'+m.middle+'。'+mid+'。',
   '再往后，画面来到“'+r.stages.changed.name+'”：'+c.ending+'。'+plot('changed_use')+'。'+arc+'。'];
  rows.push({id:`${h.id}-${line}-${order.id}`,primaryId:h.id,movingLine:line,monthOrder:order.id,mutualPolicy:'inner-lines',
   stageIds:[h.id,r.stages.mutual.id,r.stages.changed.id],baseGrades:[r.stages.primary.baseGrade,r.stages.mutual.baseGrade,r.stages.changed.baseGrade],
   body:{trigram:r.body.trigram,element:r.body.element,side:r.body.side,state:body.strength.state},
   nodes:r.nodes.map(n=>({role:n.role,trigram:n.trigram,element:n.element,state:n.strength.state,monthRelation:n.strength.monthRelation.type})),
   relations:r.edges.map(e=>({targetRole:e.targetRole,type:e.type,from:e.from,to:e.to})),paragraphs,
   sourceIds:[...seasonSource,...flowSource],scope:'month-order-base;domain-and-void-and-timing-applied-separately'});
  mutualIds.add(r.stages.mutual.id);total++;
 }
 await save(`data/stories/${String(h.id).padStart(2,'0')}.json`,{schemaVersion:'1.0.0',contentVersion:lib.contentVersion,narrativeVersion:'1.0.0',hexagramId:h.id,rows});
}
const domains=lib.listDomains().map(d=>{
 const row=DOMAIN_STORY_RULES.find(r=>r[0]===d.id);if(!row)throw new Error('Missing domain narrative');
 return {id:d.id,label:row[1],subject:row[2],sourceSectionId:d.sectionId,mode:d.mode,voidConcern:DOMAIN_VOID_CONCERNS[d.id],relationshipText:Object.fromEntries(RELATION_ORDER.map((k,i)=>[k,row[3][i]])),sourceQuotes:d.relationPassages};
});
await save('data/stories/domain-rules.json',{schemaVersion:'1.0.0',contentVersion:lib.contentVersion,narrativeVersion:'1.0.0',kind:'new-editorial-paraphrase-with-source-quotes',domains});
await save('data/stories/void-rules.json',{schemaVersion:'1.0.0',contentVersion:lib.contentVersion,narrativeVersion:'1.0.0',states:VOID_ACTIONS,sourceIds:['user-void-extension','user-void-timing']});
await save('data/stories/index.json',{schemaVersion:'1.0.0',contentVersion:lib.contentVersion,narrativeVersion:'1.0.0',count:total,primaryHexagrams:64,movingLines:6,monthOrders:MONTH_ORDERS,
 supportedMutualPolicies:['inner-lines'],distinctMutualHexagrams:mutualIds.size,files:lib.listHexagrams().map(h=>({id:h.id,path:`data/stories/${String(h.id).padStart(2,'0')}.json`})),
 sourceIds:[...seasonSource,...flowSource],editorialScope:'symbolic prospective narratives;not classical quotes;no invented observed outcomes;no generated success rates',
 seasonPolicy:'five qi orders from supplied classical text;other element strengths remain not_explicit;not twelve branch stories',domainRulePath:'data/stories/domain-rules.json'});
if(total!==1920||mutualIds.size!==16)throw new Error('Unexpected legal chart coverage');
console.log('Narratives: 384 legal casts × 5 month qi orders = 1,920 complete three-stage base stories; 18 domain rule sets.');
