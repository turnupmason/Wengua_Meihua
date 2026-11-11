import {readFile} from 'node:fs/promises';
import {createInterviewReading} from '../../src/interview-manuscripts.js';
import {countHan} from '../../src/story-editorial.js';
export const BASE_AUTHORING_VERSION='interview-base-authoring-1.0.0';
const STRONG=new Set(['旺','相']);
const weak=n=>!STRONG.has(n.strength.state),strong=n=>STRONG.has(n.strength.state);
const terminal=n=>n.strength.state==='囚'||n.strength.state==='死';
const MONTH_NAMES={'spring-wood':'春令','summer-fire':'夏令','autumn-metal':'秋令','winter-water':'冬令','seasonal-earth':'土令'};
const ROOT_VOICE={旺:'你这边有较好的应对余地。',相:'你这边仍有主动回应的基础。',休:'精力宜先放在最相关的问题上。',囚:'回应要求时可能比较吃力。',死:'自己处理要求会较费力，宜先抓住重点。'};
const roles={use:'用卦',body_mutual:'体互',use_mutual:'用互',changed_use:'变用'};
export async function loadInterviewLineLedger(library){
 const result=new Map();
 for(const name of ['01-16','17-32','33-48','49-64']){
  const raw=JSON.parse(await readFile(new URL(`./interview-lines/${name}.json`,import.meta.url),'utf8'));
  for(const [id,entries] of Object.entries(raw))for(const [i,entry] of entries.entries()){
   const [type,meaning,advice]=entry.split('|'),source=library.getLineReading(Number(id),i+1);
   if(!'CAGFD'.includes(type)||!meaning||!advice||!source.text)throw new Error('Invalid curated line entry');
   result.set(`${id}/${i+1}`,{type,meaning,advice,fullText:source.text,sourceRef:source.sourceRef,
    method:'assistant-authored-modern-interview-application;not-historical-feedback',sourcePath:`sources/editorial/interview-lines/${name}.json#${id}/${i+1}`});
  }
 }
 if(result.size!==384)throw new Error('All 384 ordinary moving lines must have a curated entry');
 return result;
}
export function createBaseInterviewReading(options){
 const raw=createInterviewReading(options);
 // A deliberately separate BASE profile. This does not claim an actual cast has no empty branches.
 const nodes=raw.nodes.map(n=>({...n,supportEvidence:[],void:{state:'not_applied',label:'基础盘未应用旬空',effective:'active',hit:false,hitKind:'none',matchedBranches:[],branches:[],xun:n.void.xun,sourceId:'base-no-void'}}));
 const body=nodes.find(n=>n.role==='body'),inherited=nodes.find(n=>n.role==='body_inherited');inherited.void=body.void;inherited.strength=body.strength;
 return {...raw,nodes,edges:raw.edges.map(e=>({...e,voidEffect:'active',bodyVoidEffect:'active'})),profile:{...raw.profile,voidApplied:false,scope:'base-qi-and-body-use-only;not-an-actual-no-void-assertion'}};
}
const NODE=(r,role)=>r.nodes.find(n=>n.role===role),REL=(r,role)=>r.edges.find(e=>e.targetRole===role).type;
export function decideBaseInterview(reading,line){
 const body=NODE(reading,'body'),use=NODE(reading,'use'),end=NODE(reading,'changed_use'),bm=NODE(reading,'body_mutual');
 const u=REL(reading,'use'),z=REL(reading,'changed_use');
 const generating=reading.edges.filter(e=>e.type==='use_generates_body').map(e=>NODE(reading,e.targetRole));
 const strongHelp=generating.some(strong),hasHelp=generating.length>0;
 const fail=(rule,reason,sources)=>({outcome:'not-pass-this-round',rule,reason,sourceIds:sources});
 const pass=(rule,reason,sources)=>({outcome:'pass-with-conditions',rule,reason,sourceIds:sources});
 if(['A','D'].includes(line.type))return fail('curated-line-current-adversity','动爻对当前推进有明显警戒，这轮仍偏难落实。',['user-yijing64','mh-056','mh-117']);
 if(u==='use_controls_body'&&!hasHelp)return fail('use-control-without-generation','开头用卦克体，盘中又无直接生体；承接力与协调条件仍不足以形成通过的帮助。',['mh-071','mh-116']);
 const strongMutualSupport=['body_mutual','use_mutual'].some(role=>['use_generates_body','equal'].includes(REL(reading,role))&&strong(NODE(reading,role)));
 const strongLateGeneration=z==='use_generates_body'&&strong(end);
 if(z==='use_controls_body'){
  if(strong(body)&&weak(end)&&((u==='use_generates_body'&&strong(use)&&strongMutualSupport)||(u==='equal'&&strongMutualSupport&&['G','F'].includes(line.type))))
   return pass('strong-prior-foundation-with-weak-late-control','开头和中段的配合较实，原体有承接余地；末后虽仍有牵制，这轮仍保留通过机会，确认条件时要细致。',['mh-071','mh-101','mh-117','mh-119']);
  return fail('changed-control-with-insufficient-prior-support','末后仍有变用克体，前面的配合或帮助尚不足以充分承接这一处牵制，本轮落实偏难。',['mh-071','mh-101','mh-117','mh-119']);
 }
 if(REL(reading,'body_mutual')==='use_controls_body'&&strong(bm)&&weak(body)&&!(strongLateGeneration&&['G','F'].includes(line.type)&&strongHelp))
  return fail('strong-body-mutual-control-on-weak-body','中段体互对较弱的原体形成明显牵制，前后虽然仍有可用条件，这轮通过仍偏难。',['mh-101','mh-117','mh-119']);
 if(u==='use_controls_body'){
  if(strong(use)&&weak(body)&&!(strongLateGeneration&&line.type==='F'))return fail('strong-main-controller','开头的克体较实，原体承接偏弱，后段的帮助尚难补足这一轮的困难。',['mh-071','mh-101','mh-119']);
  if(!strongHelp)return fail('main-control-with-weak-help','开头仍受克，生体的帮助偏弱，缓和之处尚不足以支持本轮通过。',['mh-071','mh-101','mh-119']);
  return pass('main-control-with-sourced-relief','开头虽有牵制，后面仍有较实的直接帮助，末后也未继续克体，这轮保留通过机会。',['mh-071','mh-101','mh-117','mh-119']);
 }
 if(u==='body_controls_use'&&terminal(body)&&strong(use)&&!strongHelp&&line.type!=='F')
  return fail('weak-body-cannot-easily-control-strong-main','开头的要求较强，原体承接偏弱，直接帮助也不够有力，本轮较难落实通过。',['mh-071','mh-101','mh-119']);
 if(z==='body_generates_use'&&terminal(body)&&strong(end))
  return fail('weak-body-drains-to-strong-end','末后仍是较弱的原体继续投入，落实的耗费较重，这轮通过的支撑不足。',['mh-071','mh-101','mh-117']);
 if(z==='body_controls_use'&&terminal(body)&&strong(end)&&!strongHelp&&line.type!=='F')
  return fail('weak-body-cannot-easily-control-strong-end','末后的要求较难处理，生体帮助又偏弱，现有条件仍不足以把结果落实。',['mh-071','mh-101','mh-119']);
 if(u==='body_generates_use'&&!hasHelp&&z!=='equal')
  return fail('main-drain-without-generation','开头以投入为主，盘中缺少直接生体，后面也未形成足够的协调支撑，这轮仍较难成。',['mh-071','mh-101','mh-117']);
 if(u==='body_generates_use'&&!hasHelp&&weak(body))
  return fail('weak-main-drain-with-weak-equality','起初已有耗费，原体承接偏弱，末后虽有比和，仍缺少较实的生体帮助。',['mh-071','mh-101','mh-119']);
 if(hasHelp)return pass('direct-generation-without-decisive-obstruction','本盘仍有直接生体的帮助，末后未继续克体，结合动爻所示条件，这轮有望推进到通过。',['mh-071','mh-101','mh-117','mh-119']);
 if(!hasHelp&&weak(body))return fail('out-of-season-body-without-generation','原体不在旺相，盘中又无直接生体，协调或可处理的部分尚不足以把这一轮推进到通过。',['mh-071','mh-101','mh-119']);
 if(z==='equal'||u==='equal')return pass('equality-without-control','盘中没有直接克体的卦，协调基础仍在；把动爻提示的条件处理好，这轮有望通过。',['mh-071','mh-117']);
 return pass('body-control-without-control-against-body','体克用虽有迟成之意，盘中未见直接克体，现有要求仍有主动处理的余地。',['mh-071','mh-117']);
}
function fact(reading,role){
 const n=NODE(reading,role),b=NODE(reading,'body'),type=REL(reading,role),a=`${roles[role]}${n.trigram}${n.element}`,root=`原体${b.trigram}${b.element}`;
 const pair={use_generates_body:`${a}生${root}`,use_controls_body:`${a}克${root}`,body_generates_use:`${root}生${a}`,body_controls_use:`${root}克${a}`,equal:`${a}与${root}比和`}[type];
 const effect={
  use_generates_body:strong(n)?'帮助较有力，仍需把要求回应完整。':'帮助能够起作用，推动不算强，回应时宜抓住重点。',
  use_controls_body:strong(n)&&weak(b)?'牵制较实，处理要求时容易感到吃力。':weak(n)&&strong(b)?'牵制较弱，你这边仍有承接和解释的余地。':'牵制仍在，需要把不清楚的要求耐心说明。',
  body_generates_use:strong(n)&&weak(b)?'准备与回应的投入较吃力，宜先处理关键问题。':weak(n)?'仍有投入，但耗费相对较轻。':'回应要求需要花些精力，不宜作过多额外承诺。',
  body_controls_use:strong(b)&&weak(n)?'相关问题较有处理余地，落实仍须逐项确认。':weak(b)&&strong(n)?'原体承接偏弱，这一处的要求较难处理，事情不易很快说定。':'仍有可主动处理的部分，确认时宜细致一些。',
  equal:strong(n)&&strong(b)?'配合较有基础，适合把具体要求继续说明白。':'沟通仍有基础，同气也需有实际内容才能推进。'
 }[type];
 return `${a}在${MONTH_NAMES[reading.monthOrder]}属${n.strength.state}；${pair}，${effect}`;
}
const MAIN_PLAIN={
 use_generates_body:'开头仍有帮助，适合把需要说明的内容准备完整。',
 use_controls_body:'开头的要求可能不易协调，需要耐心把问题说明白。',
 body_generates_use:'前面的准备和回应会较费心，宜先处理最相关的问题。',
 body_controls_use:'起初需要主动弄清要求，能够处理的部分逐项说明。',
 equal:'开头有继续沟通的基础，回答宜具体，也要保持前后一致。'
};
function processPlain(r){
 const b=NODE(r,'body'),m=NODE(r,'body_mutual');
 if(REL(r,'body_mutual')==='use_controls_body')return strong(m)&&weak(b)?'中间的压力较难处理。':'中间仍可能有需要解释的地方。';
 if(r.edges.some(e=>['body_mutual','use_mutual'].includes(e.targetRole)&&e.type==='use_generates_body'))return '中间仍有帮助可以接上。';
 if(REL(r,'body_mutual')==='body_generates_use')return '中间的补充说明还要花些精力。';
 if(REL(r,'body_mutual')==='equal')return '中间有协调余地，仍要把细节说明白。';
 return '中间的细节仍需耐心处理。';
}
const ADVICE_END={
 true:'先把需要补充的内容做好，再等待这一轮确认。',
 false:'能修正的地方及时整理，也继续准备其他合适机会。'
};
function timing(reading,decision){
 const positive=decision.outcome.startsWith('pass'),gens=reading.edges.filter(e=>e.type==='use_generates_body'),controllers=reading.edges.filter(e=>e.type==='use_controls_body'),drains=reading.edges.filter(e=>e.type==='body_generates_use');
 const ordered=arr=>['use','body_mutual','use_mutual','changed_use'].map(role=>arr.find(e=>e.targetRole===role)).filter(Boolean);
 const slot=(kind,role,event,valence,scope,sourceIds,ruleIds,prefix,suffix)=>({id:'result',kind,role,event,valence,eventScope:scope,sourceIds,ruleIds,prefix,suffix});
 if(positive&&gens.length){const e=ordered(gens).find(e=>strong(NODE(reading,e.targetRole)))||ordered(gens)[0];return [slot('support',e.targetRole,'本轮面试出现积极反馈或通过结果明朗','吉','positive-result-candidate',['mh-071','mh-116','mh-143'],['fame-date'],'可留意','，这是本轮面试积极回应、通过结果较易明朗的参考时段，属吉应。')];}
 if(controllers.length){const e=ordered(controllers).find(e=>strong(NODE(reading,e.targetRole)))||ordered(controllers)[0];return [slot('control',e.targetRole,positive?'本轮面试的追问或条件确认受阻':'本轮面试受阻或出现不利反馈','凶',positive?'process-obstruction':'obstruction-or-adverse-result',['mh-116','mh-143'],['adverse-event'],'留意','前后的本轮进展，追问、条件确认或结果回应较易受阻，属凶应。')];}
 if(!positive&&drains.length){const e=ordered(drains)[0];return [slot('drain',e.targetRole,'本轮面试准备或补充说明的耗费增加','凶','process-drain',['mh-143'],['daily-qi-body-drain'],'可留意','前后，补充准备和解释的投入可能增加，属阶段性的凶应；这不是推定失败通知的日期。')];}
 if(!positive&&gens.length){const e=ordered(gens)[0];return [slot('support',e.targetRole,'本轮面试补充沟通出现回应或修正机会','吉','process-repair',['mh-071','mh-116','mh-143'],['good-event'],'可留意','，补充说明或修正问题可能较有回应，属阶段性的吉应；这一轮通过仍偏难。')];}
 return [slot('body-period','body',positive?'本轮面试的协调或通过反馈较易明确':'本轮面试的补充沟通或协调机会','吉',positive?'positive-result-candidate':'process-coordination',['mh-071','mh-143'],positive?['fame-body-fallback']:['daily-qi-equality'],'可留意',positive?'，在无克体的前提下，按体卦时序列作本轮积极反馈的参考窗口，属吉应。':'，可作本轮补充沟通与协调的参考，属阶段性吉应；这不是本轮已经通过的依据。')];
}
export function authorBaseInterview(reading,line){
 const d=decideBaseInterview(reading,line),ok=d.outcome.startsWith('pass'),b=NODE(reading,'body');
 const lead=ok?'这轮面试有望通过。':'这轮面试倾向难以通过。';
 const short=lead+ROOT_VOICE[b.strength.state]+MAIN_PLAIN[REL(reading,'use')]+processPlain(reading)+line.advice;
 const han=countHan(short);if(han<60||han>120)throw new Error(`Curated short length ${reading.primaryId}/${reading.movingLine}/${reading.monthOrder}: ${han}`);
 const firstAdvice=line.advice.split(/[，。；]/)[0];
 return {primaryId:reading.primaryId,movingLine:reading.movingLine,monthOrder:reading.monthOrder,outcome:d.outcome,
  title:(ok?'有望通过，':'通过偏难，')+firstAdvice,short,
  opening:`${b.trigram}${b.element}为体，在${MONTH_NAMES[reading.monthOrder]}属${b.strength.state}。${fact(reading,'use')}`,
  process:fact(reading,'body_mutual')+fact(reading,'use_mutual')+line.advice,
  ending:`${reading.selectedMovingLine.label}爻辞为“${line.fullText}”${line.meaning}${fact(reading,'changed_use')}${d.reason}`,
  summary:lead+line.advice+(ok?'把具体条件回应完整，后续按明确安排推进。':'把能确认的问题核实清楚，再考虑下一次争取。'),
  lineApplication:{evidence:[line.fullText],conditions:[line.meaning,'本条为面试语境的取象应用；古文人物、物品、数量与年数不转为已发生的现实事实。'],curatedType:line.type,sourcePath:line.sourcePath},
  counterevidence:[{fact:`本用${REL(reading,'use')}；体互${REL(reading,'body_mutual')}；用互${REL(reading,'use_mutual')}；变用${REL(reading,'changed_use')}；原体${b.strength.state}；动爻类型${line.type}`,
   resolution:d.reason+' 完整动爻的条件、各阶段关系和同一张五态表一并保留，不使用数值权重或任意传递链。'}],
  authorship:{method:'curated-line-ledger-and-explicit-base-policy-precompiled-to-complete-prose',version:BASE_AUTHORING_VERSION,lineSource:line.sourcePath,
   textCreation:'assistant-authored-line-explanation-and-voice-segments;offline-rule-compilation',manualWholeArticleReview:false},
  decisionPolicy:{id:d.rule,sourceIds:d.sourceIds,scope:'project-interview-stage-application;not-a-universal-classical-algorithm',lineType:line.type},
  timing:timing(reading,d),voidRelease:[],baseNoVoid:true};
}
