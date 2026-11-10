import {TIMING_AUDIT_VERSION,DOMAIN_TIMING_SPECS,TRIGRAM_PERIOD_SPECS,ELEMENT_DAY_BRANCHES} from './timing-rules.js';
const LABEL={body_controls_use:'体克用',use_controls_body:'用克体',body_generates_use:'体生用',use_generates_body:'用生体',equal:'比和'};
const BRANCHES=[...'子丑寅卯辰巳午未申酉戌亥'];
const GENERATOR={木:'水',火:'木',土:'火',金:'土',水:'金'},CONTROLLER={木:'金',火:'水',土:'木',金:'火',水:'土'};
const active=n=>!['suppressed','dormant'].includes(n.void.effective);
const units={day:'日',month:'月',year:'年',hour:'时'};
const adverseCodes=new Set(['failure','loss']);
const commonKinds={body_controls_use:'吉',use_controls_body:'凶',body_generates_use:'凶',use_generates_body:'吉',equal:'吉'};
export function auditTimingCandidates(reading,legacy,{timingContext={}}={}){
 const profile=DOMAIN_TIMING_SPECS.find(d=>d.id===reading.domain.id);
 if(!profile)throw new RangeError('Timing profile missing');
 const castingMethod=timingContext.castingMethod||(legacy.numericalWindow?'post-heaven':null);
 const periodMethod=timingContext.periodMethod||(legacy.numericalWindow?'numerical':null);
 const eventWindow=timingContext.eventWindow||null;
 if(castingMethod!==null&&!['pre-heaven','post-heaven','manual'].includes(castingMethod))throw new RangeError('Unknown castingMethod');
 if(periodMethod!==null&&!['element-qi','trigram-periods','numerical'].includes(periodMethod))throw new RangeError('Unknown periodMethod');
 if(eventWindow!==null&&eventWindow!=='today')throw new RangeError('Unknown eventWindow');
 if(legacy.numericalWindow&&timingContext.castingMethod&&timingContext.castingMethod!=='post-heaven')throw new Error('Supplied object-direction-hour inputs belong to the post-heaven method');
 if(timingContext.eventKind!==undefined&&timingContext.eventKind!=='office-risk')throw new RangeError('Unknown eventKind');
 if(periodMethod==='numerical'&&castingMethod&&castingMethod!=='post-heaven')throw new Error('Numerical motion timing is scoped to the supplied post-heaven method');
 const body=reading.nodes.find(n=>n.isBody),events=[],relativePace=[],obstructionDurations=[];
 const numerical=legacy.numericalWindow?{...legacy.numericalWindow,certainty:'conditional-rule-calculation',canTimeAdverseOutcome:true,
  cannotReviveTrueVoid:body.void.state==='true_void',eventWindow,
  applicability:timingContext.numericalApplicability===true&&eventWindow!=='today'?'explicitly-affirmed':'requires-matter-and-urgency-review'}:null;
 const rulesFor=(...ids)=>[...new Set([profile.sectionId,...ids])];
 for(const e of reading.edges){
  const n=reading.nodes.find(n=>n.role===e.targetRole),type=e.type;
  if(profile.mode==='weather-special'||profile.clinicalReferenceOnly||profile.mode==='burial'||profile.mode==='marriage')continue;
  const valence=profile.id==='domain-07'&&type==='body_controls_use'?'凶':commonKinds[type];
  let eligibleType=['use_generates_body','equal','use_controls_body'].includes(type),ruleIds=['good-event','adverse-event'];
  if(profile.mode==='wealth'){
   eligibleType=true;
   ruleIds=[{body_controls_use:'wealth-control-gain',use_controls_body:'wealth-loss',body_generates_use:'wealth-drain-loss',use_generates_body:'wealth-gain',equal:'good-event'}[type]];
  }
  const returning=profile.mode==='traveler';
  if(returning){eligibleType=['use_generates_body','equal'].includes(type);ruleIds=['traveler-return'];}
  if(profile.mode==='fame'&&timingContext.eventKind==='office-risk'&&type!=='use_controls_body')continue;
  const rawLabel=profile.mode==='fame'&&timingContext.eventKind==='office-risk'?'在任职务不利':profile.eventLabels[type];
  if(profile.mode==='fame'&&timingContext.eventKind==='office-risk')ruleIds=['fame-office-risk'];
  // The wealth chapter distinguishes no gain from a loss. Keep both events separate.
  const label=rawLabel;
  const blockedByVoid=!active(n)||(valence==='吉'&&body.void.state==='true_void');
  const bases=[];
  if(eligibleType){
   bases.push({method:'element-qi',branches:ELEMENT_DAY_BRANCHES[n.element],sourceIds:rulesFor('mh-012','mh-116','mh-122','mh-143'),
    scope:'五行卦气候选；不是已选择的历法轮次'});
   const period=TRIGRAM_PERIOD_SPECS.find(p=>p.trigram===n.trigram);
   bases.push({method:'trigram-periods',branches:period.scales.includes(legacy.scale)?period.branches:[],periodText:period.quote,
    sourceIds:rulesFor('mh-052','mh-116'),scope:'经卦时序候选；数目照录，不自动解释为固定间隔'});
  }
  if(type==='use_generates_body')relativePace.push({role:n.role,pace:n.role==='use'?'即成':n.role==='changed_use'?'稍迟':'渐成',sourceIds:['mh-116'],absoluteDays:null});
  const outcomeKind=type==='body_generates_use'?(['domain-05','domain-07','domain-08','domain-09','domain-11','domain-14','domain-15'].includes(profile.id)?'failure':'loss'):type==='use_controls_body'?'failure':profile.mode==='wealth'?'gain':'success';
  const item={id:profile.id+':'+n.role+':'+type,outcomeKind,role:n.role,stage:n.stage,relation:type,trigram:n.trigram,element:n.element,
   event:label,valence,ruleIds,sourceIds:rulesFor('mh-116','mh-122'),periods:bases,
   status:!eligibleType?'no-dedicated-period-rule':blockedByVoid?'conditional-void-limitation':'source-supported-period-candidate',
   eligible:eligibleType&&!blockedByVoid,voidState:n.void.state,monthStrength:n.strength.state,
   scope:'候选事件；不得写成已发生的反馈'};
  events.push(item);
  if(profile.mode==='wealth'&&type==='use_controls_body'){
   item.ruleIds=['adverse-event'];
   events.push({...item,id:item.id+':loss',event:'破财',outcomeKind:'loss',ruleIds:['wealth-loss'],
    sourceIds:rulesFor('mh-072'),scope:'破财候选；总体断为无财不自动证明本金损失'});
  }
 }
 if(profile.mode==='marriage'||profile.mode==='burial'){
  for(const [kind,element,valence] of [['生体',GENERATOR[body.element],'吉'],['比和',body.element,'吉'],['克体',CONTROLLER[body.element],'凶']]){
   events.push({id:profile.id+':period:'+kind,role:'period-environment',stage:null,relation:kind,event:profile.label+valence+'期',valence,element,
    sourceIds:[profile.sectionId,'mh-122'],ruleIds:[profile.mode==='marriage'?'marriage-scope':'burial-scope'],
    periods:[{method:'element-qi',branches:ELEMENT_DAY_BRANCHES[element],scope:'吉凶年月，不是成婚或安葬完成日期',sourceIds:['mh-122','mh-143']}],
    eligible:['month','year'].includes(legacy.scale)&&!(valence==='吉'&&body.void.state==='true_void'),status:'period-quality-only',
    scope:'不自动刻成败日期'});
  }
 }
 // Fame has a conditional body-period fallback; no control means no control anywhere in the chart.
 if(profile.mode==='fame'&&timingContext.eventKind!=='office-risk'&&!reading.edges.some(e=>e.type==='use_controls_body')){
  const p=TRIGRAM_PERIOD_SPECS.find(p=>p.trigram===body.trigram);
  events.push({id:profile.id+':body-period',role:'body',stage:'primary',relation:'无克体参体时序',trigram:body.trigram,element:body.element,
   event:'名成',valence:'吉',eligible:body.void.state!=='true_void',status:'conditional-body-fallback',sourceIds:['mh-071','mh-052'],ruleIds:['fame-body-fallback'],
   periods:[{method:'trigram-periods',branches:p.scales.includes(legacy.scale)?p.branches:[],periodText:p.quote,sourceIds:['mh-071','mh-052']}]});
 }
 if(reading.edges.some(e=>e.type==='use_generates_body'&&active(reading.nodes.find(n=>n.role===e.targetRole)))){
  const numbers={乾:1,兑:2,离:3,震:4,巽:5,坎:6,艮:7,坤:8};
  for(const e of reading.edges.filter(e=>e.type==='use_controls_body')){
   const n=reading.nodes.find(n=>n.role===e.targetRole);if(active(n))obstructionDurations.push({role:n.role,trigram:n.trigram,count:numbers[n.trigram],unit:'day',kind:'delay-duration',event:'吉事有生扶又受克时的阻滞时长',sourceIds:['mh-116'],eventDate:null,notAdditive:true});
  }
 }
 const referenceMethods=[];
 if(profile.mode==='birth-reference'){
  const use=reading.nodes.find(n=>n.role==='use');const period=TRIGRAM_PERIOD_SPECS.find(p=>p.trigram===use.trigram);
  referenceMethods.push({event:'原典生产日辰',targetRole:'use',trigram:use.trigram,periodText:period.quote,sourceIds:['mh-068','mh-052'],status:'historical-reference-only'});
 }
 if(profile.mode==='health-reference')referenceMethods.push({event:'原典和平之日与危厄之期',rule:'和平之日主卦决之；危厄之期克体之卦定之',sourceIds:['mh-078','mh-122'],status:'historical-reference-only;主卦含义待核'});
 if(profile.mode==='weather-special')referenceMethods.push({event:'晴雨朝暮',rule:'离在艮上暮雨朝晴；离互艮宫暮晴朝雨；久雨得艮当止',sourceIds:['mh-063'],status:'requires-weather-context;no-body-use-transplant'});
 const waitingForVoid=reading.nodes.filter(n=>['body','changed_use'].includes(n.role)&&['dormant','supported'].includes(n.void.state)).map(n=>({role:n.role,state:n.void.state,fillBranches:(n.void.releaseTargets||[]).map(t=>t.fill),clashBranches:(n.void.releaseTargets||[]).map(t=>t.clash),sourceLayer:'user-extension',provesFulfilment:false}));
 const missing=[];
 if(!legacy.voidGanzhi)missing.push('已启用旬空扩展所需的干支基准');
 if(!castingMethod||castingMethod==='manual')missing.push('原起卦法');
 if(!legacy.scale)missing.push('所问远近及取年/月/日/时的尺度');
 if(!periodMethod)missing.push('本次采用五行卦气、经卦时序或原数的取期依据');
 if(periodMethod==='numerical'&&!numerical)missing.push('能复现原盘的原始取数和占者动静');
 if(periodMethod==='numerical'&&numerical?.applicability!=='explicitly-affirmed')missing.push('数期与所问事情急缓的适用判断');
 const typedVoidWindows=legacy.voidWindows.map(w=>({...w,kind:'release-state',event:'对应空象填实或冲实',valence:'未独立定吉凶',sourceLayer:'user-extension',provesFulfilment:false}));
 const calendarOccurrences=legacy.scale==='day'&&legacy.dayGanzhi?events.filter(e=>e.eligible).flatMap(e=>e.periods.flatMap(p=>p.branches.map(branch=>({
  eventId:e.id,event:e.event,valence:e.valence,periodMethod:p.method,branch,
  nextAfterDays:(BRANCHES.indexOf(branch)-BRANCHES.indexOf([...legacy.dayGanzhi][1])+12)%12||12,
  kind:'next-calendar-match',selectedAsEventDate:false,sourceLayer:'calendar-enumeration',gregorianDate:null
 })))):[];
 return {...legacy,sourceIds:[...new Set([...legacy.sourceIds,profile.sectionId,'mh-058','mh-116','mh-143',...events.flatMap(e=>e.sourceIds),...referenceMethods.flatMap(e=>e.sourceIds)])],auditVersion:TIMING_AUDIT_VERSION,domainTimingProfile:profile,events,referenceMethods,waitingForVoid,relativePace,obstructionDurations,
  numericalWindow:numerical,voidWindows:typedVoidWindows,calendarOccurrences,context:{...timingContext,castingMethod,periodMethod},
  status:profile.clinicalReferenceOnly?'historical-reference-only':missing.length?'requires-context':'period-candidates-ready',missing,
  dateSelection:{status:'unselected',reason:'原书不规定无条件取下一轮支日；历法候选未被当作确定应验日期'},
  sourceLayers:{classical:['mh-052','mh-058','mh-116','mh-122','mh-143',profile.sectionId],userExtension:['user-void-extension','user-void-timing'],calendar:'explicit-day-basis-only'},
  text:'应期按'+profile.label+'门类取用。'+profile.note+'候选支期、对应事件与吉凶见 events；具体轮次尚未选定。'};
}

/** Select a sourced event/period for prose; never promotes a next-match offset into a forecast. */
export function selectAuditedTiming(reading,plan,verdict){
 const p=plan.domainTimingProfile,ctx=plan.context;
 if(p.clinicalReferenceOnly)return {kind:'reference-only',windows:[],text:'本门类保留古籍取期原文，不输出真实健康结果或医疗日期。',event:null};
 if(p.mode==='weather-special')return {kind:'special-weather',windows:[],text:'天时按三卦、四时与晴雨背景取期，本次未确定具体天气应期。',event:null};
 const negative=adverseCodes.has(verdict.code),valence=negative?'凶':'吉';
 const n=plan.numericalWindow;
 if(ctx.periodMethod==='numerical'&&ctx.castingMethod==='post-heaven'&&n?.status==='conditional-numerical-candidate'&&n.applicability==='explicitly-affirmed'){
  const label=negative?{ 'domain-10':'求财无所得','domain-11':'交易不成','domain-15':'寻物难得'}[p.id]||p.label+'不遂':p.label+'有得';
  return {kind:'audited-number',windows:[],event:{label,valence},sourceIds:n.sourceIds,
   text:'应期：起卦后约'+n.count+'日；所应为'+label+'，属'+valence+'应。'};
 }
 if(plan.missing.length)return {kind:'requires-context',windows:[],event:null,missing:plan.missing,text:'应期尚未定：缺'+plan.missing.join('、')+'。'};
 if(ctx.periodMethod==='numerical')return {kind:'requires-context',windows:[],event:null,text:'本次原数尚不能据以确定所问事件的应期。'};
 let list=plan.events.filter(e=>e.eligible&&e.valence===valence);
 if(negative)list=list.filter(e=>e.outcomeKind===verdict.code||e.outcomeKind===undefined);
 if(p.mode==='traveler'&&negative)list=[]; // No return is not a dated arrival event.
 let chosen=list.find(e=>e.role==='changed_use')||list.find(e=>e.role==='use')||list[0];
 if(!chosen)return {kind:'no-supported-event-period',windows:[],event:null,text:'本次'+p.label+'尚缺能对应所断结果的取期依据。'};
 const period=chosen.periods.find(x=>x.method===ctx.periodMethod);
 if(!period?.branches.length)return {kind:'no-supported-event-period',windows:[],event:null,text:'本次所选取期法尚未给出可用支期。'};
 const phrase=period.branches.map(b=>b+(units[plan.scale]||'支')).join('、');
 return {kind:'audited-period',windows:[],event:{id:chosen.id,label:chosen.event,valence:chosen.valence},
  period:{...period,unit:plan.scale,selectedCycle:null},voidPrerequisites:negative?[]:plan.waitingForVoid,sourceIds:[...new Set([...chosen.sourceIds,...period.sourceIds])],
  text:'应期取'+phrase+'；所应为'+chosen.event+'，属'+chosen.valence+'应。'+(!negative&&plan.waitingForVoid.length?'此盘另须先待'+plan.waitingForVoid.flatMap(n=>n.fillBranches).join('、')+'填实，方论落实。':'')};
}
