// Build-time editorial decisions and prose. The mobile reader never runs this authoring module.
import {relation,buildFullChartRelations} from '../src/index.js';
import {RECEIVABLE_NOTES} from '../sources/editorial/receivable-notes.mjs';
const at=(r,role)=>r.nodes.find(n=>n.role===role);
const edge=(r,role)=>r.edges.find(e=>e.targetRole===role);
const name=n=>n.trigram+n.element;
const off=n=>['suppressed','dormant'].includes(n.void.effective);
const beneficial=type=>['body_controls_use','use_generates_body','equal'].includes(type);
const GOOD=new Set(['use_generates_body','equal']);
const qi={木:['寅','卯'],火:['巳','午'],土:['辰','戌','丑','未'],金:['申','酉'],水:['亥','子']};
export const profileKey=r=>JSON.stringify(r.nodes.filter(n=>n.role!=='body_inherited').map(n=>[
 n.role,n.void.state,n.void.matchedBranches||[],n.void.effective,n.void.castingState||null
]));

function monthly(r,order){
 const b=at(r,'body'),u=at(r,'use'),m=b.strength.monthRelation.type;
 if(b.strength.state==='strong')return `${order.label}，你这一边的${name(b)}得令，催收有自身的支撑。`;
 if(b.strength.state==='weak')return `${order.label}，${name(b)}失令，你这一边办事费力，催收更要依靠盘中实际可用的帮助。`;
 if(m==='use_generates_body')return `${order.label}，月令生${name(b)}，你这一边得助，仍有力量推动结算。`;
 if(m==='body_generates_use')return `${order.label}，${name(b)}生当令之气，本身有泄，来回催问不宜无限加码。`;
 if(m==='use_controls_body')return `${order.label}，当令之气克${name(b)}，外在条件对你有牵制。`;
 return `${order.label}，${name(b)}克当令之气，收款仍须靠自己把责任与办理步骤理顺。`;
}

function voidWords(n,type){
 const label=name(n),help=GOOD.has(type),harm=['use_controls_body','body_generates_use'].includes(type),branches=(n.void.matchedBranches||[]).join('、');
 const role=n.role==='body'?'你这一边':n.role==='body_mutual'?'体互':n.role==='use_mutual'?'用互':n.role==='changed_use'?'末后的变用':'本用';
 switch(n.void.state){
 case 'true_void':return n.role==='body'?`${label}落真空，这一回难把应收款接住，宜先保住已有凭据，收住额外投入。`:`${role}${label}是真空，${harm?'原来这一路的阻力或耗力减弱':'这一路可指望的帮助没有落实'}。`;
 case 'dormant':return n.role==='body'?`${label}逢${branches}静空，眼下自己的承接还悬着，收款要先等填实的转机。`:`${role}${label}逢${branches}静空，${harm?'这一份牵制或耗力暂时使不上全力':help?'这份帮助眼下还未落地':'这部分财款条件眼下仍悬着'}。`;
 case 'supported':return n.role==='body'?`${label}虽逢${branches}空，却有明确生扶，作假空论；款项要落实，仍须等填实的条件接上。`:`${role}${label}逢${branches}空而有生扶，仍有作用，只是落实还须待填。`;
 case 'moving_exempt':return `${role}${label}虽逢${branches}空，却在发动，${harm?'这一份阻力或耗费仍在':help?'这一路配合仍能起作用':'相关款项仍可论其作用'}。`;
 case 'strong_exempt':return `${role}${label}正得令，虽逢${branches}空，仍按旺不为空论。`;
 case 'released':return `${role}${label}已满足所提供的填冲条件，这一路作用可以接续。`;
 case 'partial_pending':case 'partial_not_applied':return `${role}${label}只有所配的${branches}命中空，部分条件未定，余下的作用仍保留。`;
 default:return '';
 }
}

function initial(r){
 const b=at(r,'body'),u=at(r,'use'),t=edge(r,'use').type;
 const text={
 body_controls_use:`开头${name(b)}克${name(u)}，这笔尾款要靠你主动争取，把应付的项目和结算责任落实。`,
 use_controls_body:`开头${name(u)}克${name(b)}，催收受外在条件牵制，提出付款要求并不容易马上得到落实。`,
 body_generates_use:`开头${name(b)}生${name(u)}，是你往事情里出力，容易把心力耗在催问和解释上。`,
 use_generates_body:`开头${name(u)}生${name(b)}，事情有回过来帮助你的条件，付款这一步有可接续的配合。`,
 equal:`开头${name(b)}与${name(u)}比和，双方有协调的基础，适合把已经说过的付款安排落实清楚。`
 }[t];
 return text+voidWords(u,t);
}

function mutual(r){
 const b=at(r,'body'),a=at(r,'body_mutual'),z=at(r,'use_mutual'),ta=edge(r,a.role).type,tz=edge(r,z.role).type;
 const both={
 body_controls_use:'都受你这一边所克，中段仍有能主动理顺的地方，宜把结算的具体条件逐项办妥',
 use_controls_body:'都来克体，中间阻力重，协商容易卡在彼此不肯相让的地方',
 body_generates_use:'都要由你来生，催收中的付出容易一层叠一层，应先守住投入的界限',
 use_generates_body:'都来生你，中间有帮助可接，适合把分散的承办责任合到付款这一步',
 equal:'都与你同气，中间有相互接应的基础，应把协调落实成可执行的付款安排'
 };
 let text;
 if(ta===tz){
  const names=a.trigram===z.trigram?`体互、用互两处${name(a)}`:`体互${name(a)}、用互${name(z)}`;
  if(off(a)&&off(z))return `互卦${r.stages.mutual.name}里，${names}都逢空，${GOOD.has(ta)?'这两份生扶或配合尚未落实':ta==='body_controls_use'?'中间可争取的财款条件还悬着':'原来的阻力或耗力暂时减轻'}。`;
  text=`互卦${r.stages.mutual.name}里，${names}${both[ta]}。`;
 }else{
  const part=(n,t)=>({
   body_controls_use:`${name(n)}受体所克，这一侧的条件还可主动处理`,
   use_controls_body:`${name(n)}克${name(b)}，${off(n)?'原本有牵制催收的一面':'这一路会牵制催收'}`,
   body_generates_use:`${name(b)}生${name(n)}，${off(n)?'原本有耗力的一面':'这里要花你的心力'}`,
   use_generates_body:`${name(n)}生${name(b)}，${off(n)?'原本有帮助的一面':'这里有帮助可接'}`,
   equal:`${name(n)}与体同气，${off(n)?'本来有协调的基础':'这里有能协调的基础'}`
  }[t]);
  text=`走到${r.stages.mutual.name}，体互这一侧，${part(a,ta)}；用互这一侧，${part(z,tz)}。`;
 }
 return text+voidWords(a,ta)+voidWords(z,tz);
}

function cross(r,graph){
 const byId=new Map(graph.nodes.map(n=>[n.id,n]));
 const rescues=graph.chains.filter(c=>c.kind==='restrain-controller');
 const generations=graph.chains.filter(c=>c.kind==='generation-path');
 const parts=[];
 for(const c of rescues.slice(0,1)){
  const [a,b]=c.nodes.map(id=>byId.get(id));
  const weak=off(a)||a.strength.state==='weak';
   parts.push(`${name(a)}又能制住克体的${name(b)}，有替你减轻阻力的一面${weak?'；只是它眼下'+(off(a)?'逢空':'失令')+'，这份解围的力量有限':'，催收时仍有另找接应、缓和分歧的余地'}。`);
 }
 if(generations.length){
  const [a,b,root]=generations[0].nodes.map(id=>byId.get(id));
  parts.push(`${name(a)}还能生${name(b)}，再由${name(b)}生${name(root)}${off(a)||off(b)?'，只是这条生扶中有一环尚未落实':'，帮助有接续到你这一边的路径'}。`);
 }
 // Also retain support feeding a controller, not only the comforting paths.
 const pairs=graph.pairs.filter(p=>p.kind==='generates'&&!p.sameEntity&&p.aRole!=='body_inherited'&&p.bRole!=='body_inherited');
 const controllerIds=new Set(r.edges.filter(e=>e.type==='use_controls_body').map(e=>r.nodes.find(n=>n.role===e.targetRole).id));
 const feeds=pairs.find(p=>controllerIds.has(p.to)&&p.from!==graph.rootBodyId);
 if(feeds){const a=byId.get(feeds.from),b=byId.get(feeds.to);parts.push(`${name(a)}也会生${name(b)}${off(a)?'，但生源逢空，这一路尚未充分接上':off(b)?'，不过受生的一侧眼下逢空，牵制暂减':'，克体的这一侧仍有来处，分歧不能只靠拖延消失'}。`);}
 return [...new Set(parts)].join('');
}

function decide(r){
 const b=at(r,'body'),last=at(r,'changed_use'),end=edge(r,'changed_use').type,first=edge(r,'use').type;
 const helpers=r.edges.filter(e=>GOOD.has(e.type)&&!off(at(r,e.targetRole)));
 const controls=r.edges.filter(e=>e.type==='use_controls_body'&&!off(at(r,e.targetRole)));
 if(b.void.state==='true_void')return {code:'failure',result:'这笔尾款这一回难收回来，先保住已经成立的账目和凭据，收住额外投入。',reason:'true-body-void'};
 if(beneficial(end)&&off(last))return {code:'delay',result:'这笔尾款眼下还不能落实，最后一份能接上的条件仍悬着。',reason:'final-support-unavailable'};
 if(beneficial(end)&&['dormant','supported'].includes(b.void.state))return {code:'delay',result:'这笔尾款有收回的路，但眼下还落不到手，要先等体卦填实的转机。',reason:'body-awaits-fill'};
 if(end==='use_controls_body')return {code:'failure',result:['use_generates_body','equal'].includes(first)?'这笔尾款前面谈得动，最后仍会受阻，眼下收不到。':'这笔尾款眼下收不到，催收仍被外在条件压住。',reason:'final-controls-body',protected:helpers.length>0||b.strength.state==='strong'};
 if(end==='body_generates_use')return {code:'loss',result:'这笔尾款难顺利收回，催收还要耗费心力，继续追加投入须有界限。',reason:'final-drains-body'};
 if(end==='body_controls_use'&&b.strength.state==='weak'&&!helpers.length)return {code:'delay',result:'款项有可争取之处，但你这一边眼下力弱，又缺少接应，这笔尾款暂时难落实。',reason:'weak-body-no-help'};
 if(end==='body_controls_use')return {code:'gain',result:controls.length?'这笔尾款能争取收回，中间有阻力，最后仍需你主动把结算推进。':'这笔尾款能收回来，要把主动权用在确认结算、推动实际付款上。',reason:'final-body-controls-wealth'};
 if(end==='use_generates_body')return {code:'gain',result:['use_controls_body','body_generates_use'].includes(first)?'这笔尾款前头费力，后面有接应，最后能收回来。':'这笔尾款能收回来，最后有配合接住付款这一步。',reason:'final-generates-body'};
 return {code:'gain',result:controls.length?'这笔尾款中间有磋商，最后能够接上配合，款能收回来。':'这笔尾款能收回来，双方有把结算协调落实的基础。',reason:'final-equal'};
}

function ending(r,v){
 const b=at(r,'body'),u=at(r,'use'),z=at(r,'changed_use'),end=edge(r,'changed_use').type;
 const change=`动后${name(u)}变成${name(z)}，变卦为${r.stages.changed.name}。`;
 if(b.void.state==='true_void')return change+'体卦真空，眼下承接不住这一笔钱，收尾宜先守住已成立的依据，减少额外消耗。';
 const effect={body_controls_use:`最后是${name(b)}克${name(z)}，付款这一步仍有可争取的财。`,use_controls_body:`最后${name(z)}克${name(b)}，收尾时的牵制还在。`,body_generates_use:`最后${name(b)}生${name(z)}，你仍在向事情里付出，款项难轻松落袋。`,use_generates_body:`最后${name(z)}生${name(b)}，收尾转到事情来帮助你的一边。`,equal:`最后${name(z)}与原体比和，双方有把尾款接续落实的配合。`}[end];
 const protection=v.protected?'盘里仍有支撑，你还有守住约定、继续交涉的力量。':'';
 return change+effect+voidWords(z,end)+protection;
}

function timing(r,v){
 const b=at(r,'body'),last=at(r,'changed_use'),end=edge(r,'changed_use').type,slots=[];
 const add=(id,branches,prefix,suffix,event,valence,sourceIds,emptyText)=>slots.push({id,token:`{{date:${id}}}`,branches,prefix,suffix,event,valence,sourceIds,displayLimit:2,emptyText});
 if(['dormant','supported'].includes(b.void.state)){
  const targets=b.void.releaseTargets||[];
  if(targets.length)add('fill',targets.map(t=>t.fill),'先留意','，这是体卦逢填实的候选日，所应是催收从悬着转向能够落实的机会。','催收填实转机','条件转机',['user-void-timing'],'这两个月尚未筛出体卦填实的日期，先把自己能够负责的催收步骤定清。');
 }else if(v.code==='gain'){
  const target=beneficial(end)?last:r.nodes.find(n=>n.role==='use'&&GOOD.has(edge(r,'use').type));
  if(target)add('receipt',qi[target.element],'收款可留意','，这几天对应的是尾款到手的机会，宜把金额、付款方式和到账安排一并确认。','客户尾款收到','吉',['mh-072','mh-116','mh-143'],'这两个月没有筛出与本盘取法相合的收款日期，先照已经确认的责任推进。');
 }
 const pressure=r.edges.find(e=>e.type==='use_controls_body'&&!off(at(r,e.targetRole)));
 if(pressure){const n=at(r,pressure.targetRole);add('obstruction',qi[n.element],'催收受阻可留意','，这些日子容易在结算条件上起分歧，宜把事实讲清，少为求快不断退让。','催收受阻或结算争议','凶',['mh-116','mh-143'],'本月和下月没有筛出这一处克体对应的阻力日，已有分歧仍按事实处理。');}
 else if(v.code==='loss')add('cost',qi[last.element],'催收耗力可留意','，所应是反复办理带来的消耗，宜先给额外付出定下界限。','催收耗费增加','凶',['mh-072','mh-143'],'这两个月没有筛出对应的耗费日，催收投入仍宜先有界限。');
 return slots;
}

export function writeReceivableManuscript(reading,order){
 const r=reading,b=at(r,'body'),v=decide(r),graph=buildFullChartRelations(r),card=RECEIVABLE_NOTES[r.primaryId];
 if(!card||card[1].length!==6)throw new Error('Moving-line editorial coverage missing');
 const l=r.selectedMovingLine,excerpt=l.text.length<=34&&!/[一二三四五六七八九十]+[日岁年]/.test(l.text)?l.text:l.text.split(/[，；。]/)[0]+'。';
 const turn=`${l.label}动在“${excerpt}”${card[1][r.movingLine-1]}`;
 const start=monthly(r,order)+initial(r)+voidWords(b,'body');
 const middle=mutual(r)+cross(r,graph),end=ending(r,v),slots=timing(r,v);
 // Structure follows the actual turn: early moving lines are discussed before the middle,
 // late moving lines after it. No runtime language composition or random synonym rotation.
 const paragraphs=r.movingLine<=3?
  [v.result+card[0],start+turn,middle,end]:
  [v.result+card[0],start,middle+turn,end];
 for(const slot of slots)paragraphs[slot.id==='fill'?1:slot.id==='obstruction'?2:3]+=slot.token;
 // Explain identical partial hits once, without pretending repeated body positions are new selves.
 const partialGroups=new Map();
 for(const n of r.nodes.filter(n=>n.role!=='body_inherited'&&n.void.state==='partial_pending')){
  const key=name(n)+':'+(n.void.matchedBranches||[]).join(',');if(!partialGroups.has(key))partialGroups.set(key,[]);partialGroups.get(key).push(n);
 }
 for(const group of partialGroups.values())if(group.length>1){
  let inserted=false;
  for(const n of group){const phrase=voidWords(n,n.role==='body'?'body':edge(r,n.role).type);
   for(let i=0;i<paragraphs.length;i++)if(paragraphs[i].includes(phrase)){
    paragraphs[i]=paragraphs[i].replace(phrase,inserted?'':`盘里几处${name(n)}都只命中${n.void.matchedBranches.join('、')}空，另一个所配地支未空，相关条件仍有未定之处。`);inserted=true;
   }
  }
 }
 return {paragraphs,verdict:v,dateSlots:slots,sourceIds:['mh-007','mh-009','mh-061','mh-072','mh-116','mh-117','mh-118','mh-119','mh-122','mh-143','user-void-extension','user-void-timing'],
  trace:{primaryId:r.primaryId,movingLine:r.movingLine,monthOrder:order.id,stageIds:Object.values(r.stages).map(s=>s.id),
   body:r.body,relations:r.edges.map(e=>({role:e.targetRole,type:e.type})),
   crossPaths:graph.chains.map(c=>({kind:c.kind,roles:c.nodes.map(id=>graph.nodes.find(n=>n.id===id).role)})),
   lineText:l.text,lineNote:card[1][r.movingLine-1],nodeStates:r.nodes.filter(n=>n.role!=='body_inherited').map(n=>({role:n.role,trigram:n.trigram,strength:n.strength.state,void:n.void.state,matched:n.void.matchedBranches||[]}))}};
}
