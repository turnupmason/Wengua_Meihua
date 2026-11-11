import {selectAuditedTiming} from './timing-audit.js';
// Product wording, not additional classical quotations. See docs/DIRECT_STORIES.md.
export const COMPOSITION_VERSION='1.2.0';
const GOOD=new Set(['success','gain','stable']);
const EMPTY=new Set(['true_void','dormant']);
const ROLE_NAMES={body:'体卦',use:'用卦',body_mutual:'体互',use_mutual:'用互',changed_use:'变用'};
const TYPES=['body_controls_use','use_controls_body','body_generates_use','use_generates_body','equal'];
// Each row follows TYPES. Outcomes remain separate from the user's fixed grades.
const RESULTS={
 'domain-02':[['success','这件事能办成，但要费些工夫'],['failure','这件事办不成'],['loss','这件事费力，所得抵不过付出'],['success','这件事能成，而且对你有益'],['success','这件事能成']],
 'domain-03':[['stable','家宅能安稳下来'],['failure','家宅难安，家中事务不顺'],['loss','家中耗费增加，难有余裕'],['stable','家宅能逐渐安稳，也有进益'],['stable','家宅安稳']],
 'domain-04':[['stable','这处住居按卦断为吉'],['failure','这处住居按卦断不利'],['loss','住居一事耗财，开销增加'],['gain','住居一事能带来进益'],['stable','住居安稳']],
 'domain-05':[['success','这段婚事能成，但成得迟'],['failure','这段婚事不成，勉强成了也不利'],['failure','这段婚事难成，你的付出难有相应回报'],['success','这段婚事能成，对方有助于你'],['success','这段婚事能成']],
 'domain-07':[['failure','这顿宴饮有阻，眼下难成席'],['failure','这顿宴饮办不成'],['failure','这顿宴饮难办成，还要你多费心力'],['success','这顿宴饮能成席，招待较丰足'],['success','这顿宴饮能成席']],
 'domain-08':[['success','这个计划能成，但成得迟'],['failure','这个计划不成'],['failure','这个计划忙碌多，真正办成的少'],['success','这个计划能成，有助力'],['success','这个计划能成']],
 'domain-09':[['success','这次求名求职能成，但成得迟'],['failure','这次求名求职不成'],['failure','这次求名求职不成，还会耗费心力'],['success','这次求名求职能成，并有所得'],['success','这次求名求职能成']],
 'domain-10':[['gain','这次求财有财可得，但要费力争取'],['failure','这次求财求不到'],['loss','这次求财反有耗损'],['gain','这次求财有进账'],['gain','这次求财能得利']],
 'domain-11':[['success','这笔交易能成，也有利可得'],['failure','这笔交易谈不成'],['failure','这笔交易难成，还容易有损耗'],['success','这笔交易能成，也有收益'],['success','这笔交易能成交']],
 'domain-12':[['success','这趟可以成行，所行较顺'],['failure','这趟出行不顺，按卦不宜行'],['loss','这趟出行有耗费和损失'],['success','这趟可以成行，并有额外所得'],['success','这趟可以成行，行程较顺']],
 'domain-13':[['success','人会回来，但归得迟'],['failure','所问这段时间，人不会回来'],['delay','人暂时不回来'],['success','人会回来，归期较近'],['success','人会回来，归期近']],
 'domain-14':[['success','这次能见到对方'],['failure','这次见不到对方'],['failure','这次难见到，见了也少有所得'],['success','这次能见到对方，而且有所获'],['success','这次能见面，相见较融洽']],
 'domain-15':[['success','失物能找回，但找得迟'],['failure','这次失物找不回'],['failure','这次失物难找回'],['success','失物能找回，寻找较容易'],['success','失物可寻回']],
 'domain-17':[['success','本盘断你一方占优'],['failure','本盘断你一方处于下风'],['loss','本盘断争讼耗费多，对你不利'],['success','本盘断你一方得助，较有利'],['stable','本盘以调和止争为吉']],
 'domain-18':[['stable','本盘断这项安葬安排为吉'],['failure','本盘断这项安葬安排不利'],['loss','本盘断这项安排耗费较多'],['stable','本盘断这项安排得助'],['stable','本盘断这项安排相合']]
};
const NO_ROOT={
 'domain-02':'这件事眼下办不成','domain-03':'家宅眼下难安定','domain-04':'这项住居安排眼下不能落实',
 'domain-05':'这段婚事眼下成不了','domain-07':'这顿宴饮眼下成不了席','domain-08':'这个计划眼下办不成',
 'domain-09':'这次求名求职眼下成不了','domain-10':'这次求财眼下求不成','domain-11':'这笔交易眼下成不了',
 'domain-12':'这趟行程眼下不能照原计划落实','domain-13':'所问归期眼下不能落实','domain-14':'这次会面眼下成不了',
 'domain-15':'这次失物眼下找不回','domain-17':'本盘不作你方得胜之断','domain-18':'这项安葬安排眼下不能落实'
};
const LINE_NOTES={
 '49-1':'这爻说的是先守住，眼下还不到大改的时候。急着推翻原来的安排，反而把自己弄被动。',
 '42-4':'这爻讲的是先取得能作主之人的同意，再借力办事。事情的转折在于得到支持后再行动。',
 '32-1':'事情才开始，就急着要长久的保证，容易把事情弄僵。这一爻明确不利于求深、求快。',
 '33-3':'牵挂缠住了脚，想走也走不利索。眼下只能先处理小事，办不了大动作。',
 '24-1':'刚走偏就回头改正，还来得及。这一爻的好处，正在于纠错早，不让小错拖成大错。',
 '39-4':'往前硬闯，困难更重；回头联合别人的力量，事情才接得上。转折在于肯不肯借助别人。',
 '12-3':'“包羞”说的是位置不当，处境难堪。眼前硬争会碰壁，要先改掉不合适的做法。',
 '22-5':'这爻讲礼薄而诚，先有难为情，后来得吉。用心把事情做好，比撑排场管用。',
 '28-2':'枯杨重新发芽，衰弱的事情有了转机。这一爻取的是相互补足、让旧事重新活起来的意思。',
 '1-1':'时候还没到，先藏锋，不宜急着出手。眼前越急着证明自己，越容易用错力。'
};
const STEP={
 body_controls_use:'这事你还能管得住，由你来推动',
 use_controls_body:'事情压着你，往前办会受阻',
 body_generates_use:'你得往里付出，得到的却少',
 use_generates_body:'事情来生扶你，办起来能顺一些',
 equal:'彼此同气，这事办起来较顺'
};
const find=(r,role)=>r.nodes.find(n=>n.role===role);
const edge=(r,role)=>r.edges.find(e=>e.targetRole===role);
function voidSentence(n,r){
 const name=ROLE_NAMES[n.role],e=edge(r,n.role),harm=e&&['use_controls_body','body_generates_use'].includes(e.type);
 const effect=harm?'原来的阻力或消耗减轻':e?.type==='equal'?'这份配合眼下还没有落地':'这份帮助眼下还靠不上';
 switch(n.void.state){
  case 'true_void':return name+'是真空，'+(n.isBody?'自身无力承接，这一回难成；后遇填冲也不自动恢复':effect+'；后遇填冲也不自动恢复')+'。';
  case 'dormant':return name+'静空，'+effect+'。';
  case 'moving_exempt':return name+'虽逢空，但正在发动，仍按有作用论，不按落空论。';
  case 'strong_exempt':return name+'得令，旺不为空，仍起作用。';
  case 'supported':return name+'逢空却有生扶，作假空论，事情要等填实。';
  case 'partial_pending':case 'partial_not_applied':return name+'只部分逢空，不能把整卦的作用抹掉。';
  case 'released':return name+'已经满足所给的出空条件。';
  default:return '';
 }
}
function step(r,role,domain){
 const n=find(r,role),e=edge(r,role);
 if(EMPTY.has(n.void.state))return voidSentence(n,r);
 if(find(r,'body').void.state==='true_void'){
  const words={body_controls_use:'虽是体克用，你自身已真空，制不住这件事',use_controls_body:'你自身已真空，又受克，这次难成',body_generates_use:'你自身已真空，还要往外付出，耗费更重',use_generates_body:'虽有生体，你自身已真空，这次仍难成',equal:'虽是比和，你自身已真空，事情仍接不住'};
  return words[e.type]+'。'+voidSentence(n,r);
 }
 let text=domain?.id==='domain-07'&&e.type==='body_controls_use'?'饮食有阻，这顿宴饮不容易办起来':STEP[e.type];
 if(n.strength.state==='strong'&&e.type==='use_controls_body')text+='，克你的这一卦正得令，阻力重';
 if(n.strength.state==='weak'&&e.type==='use_generates_body')text+='，但生你的这一卦失令，所得不多';
 if(e.type==='equal'&&n.strength.state==='weak')text+='，只是同气而弱，进展慢';
 return text+'。'+voidSentence(n,r);
}
function middle(r,domain){
 const a=find(r,'body_mutual'),b=find(r,'use_mutual'),ea=edge(r,'body_mutual'),eb=edge(r,'use_mutual');
 const same=ea.type===eb.type&&a.void.state===b.void.state&&a.strength.state===b.strength.state;
 if(same){
  const names=a.trigram===b.trigram?'两处'+a.trigram+a.element:a.trigram+a.element+'、'+b.trigram+b.element+'两处';
  const intro='中途到了'+r.stages.mutual.name+'，'+names;
  if(EMPTY.has(a.void.state))return intro+'都'+(a.void.state==='true_void'?'是真空':'落了静空')+'，'+(['use_controls_body','body_generates_use'].includes(ea.type)?'原来的阻力或耗费减轻。':'原先的相帮都靠不上。');
  if(find(r,'body').void.state==='true_void')return intro+'虽有'+ea.label+'，体卦却已真空，这一回仍办不成。';
  if(domain.id==='domain-07'&&ea.type==='body_controls_use')return intro+'都有饮食受阻之意，中间仍难成席。';
  let text={body_controls_use:'都被体卦所克，这段事还能由你来理顺',use_controls_body:'都来克你，中间这段不好过',body_generates_use:'都要你往外付出，中间耗费多',use_generates_body:'都来生你，中间能得帮助',equal:'都与你同气，中间能相帮'}[ea.type];
  if(a.strength.state==='strong'&&ea.type==='use_controls_body')text+='；克你的卦又得令，阻力重';
  if(a.strength.state==='weak')text+=ea.type==='use_generates_body'||ea.type==='equal'?'，只是都失令，帮得有限':'，不过这两处失令，力量较弱';
  return intro+text+'。'+(a.void.state==='strong_exempt'?'这里旺不为空。':a.void.state==='supported'?'这两处得扶，作假空论。':'');
 }
 return '中途到了'+r.stages.mutual.name+'。'+a.trigram+a.element+'这一边，'+step(r,'body_mutual',domain)+b.trigram+b.element+'这一边，'+step(r,'use_mutual',domain);
}
function monthly(body,order){
 const head=order.label+'。';
 if(body.strength.state==='strong')return head+body.trigram+body.element+'得令，你自身有力。';
 if(body.strength.state==='weak')return head+body.trigram+body.element+'失令，你自身力弱，办这事费劲。';
 if(body.strength.monthRelation.type==='use_generates_body')return head+'月令生'+body.trigram+body.element+'，你这一方得助。';
 return head+'体为'+body.trigram+body.element+'，用为当下所问之事。';
}
export function composeDirectStory({reading:r,domain,order,timing}){
 const body=find(r,'body'),last=find(r,'changed_use'),first=edge(r,'use'),end=edge(r,'changed_use');
 const line=r.selectedMovingLine;
 const movingLine={hexagramId:r.primaryId,position:r.movingLine,label:line.label,text:line.text,
  explanation:LINE_NOTES[r.primaryId+'-'+r.movingLine]||line.vernacular,
  fromTrigram:r.use.trigram,toTrigram:last.trigram,fromRelation:first.type,toRelation:end.type,
  sourceRef:line.sourceRef,editorialNote:Boolean(LINE_NOTES[r.primaryId+'-'+r.movingLine])};
 const special=['domain-01','domain-06','domain-16'].includes(domain.id);
 if(special){
  const text=domain.id==='domain-01'?'天时占不分体用；本版未建立完整晴雨定断规则，不输出晴雨结论。':'此门类只提供古籍解读，不据卦象判断母婴安危、疾病诊断或治疗结果。';
  return {verdict:{code:'reference-only',summary:text,ruleId:'reference-only',sourceIds:[domain.sourceSectionId]},movingLine,
   timingDecision:{kind:'reference-only',windows:[],text:'不提供医疗或天气应验日期。'},
   paragraphs:[text,'本、互、变为'+Object.values(r.stages).map(s=>s.name).join('、')+'。动爻为'+line.label+'：“'+line.text+'”'+movingLine.explanation]};
 }
 const result=RESULTS[domain.id]?.[TYPES.indexOf(end.type)];if(!result)throw new Error('Missing direct verdict for '+domain.id);
 let [code,summary]=result;const reasons=[];
 if(body.void.state==='true_void'){
  code='failure';summary=NO_ROOT[domain.id]+'。体卦真空，自身无力承接';reasons.push('body-true-void');
 }else if(EMPTY.has(last.void.state)){
  if(GOOD.has(code)){code='delay';summary=NO_ROOT[domain.id]+'，末后的助力还在空中';}
  else {code='delay';summary=NO_ROOT[domain.id]+'；末后的凶力逢空，减轻了损害，仍不足以断成';}
  reasons.push('changed-use-'+last.void.state);
 }else if(GOOD.has(code)){
  if(['dormant','supported'].includes(body.void.state)){summary+='，但要等体卦填实';reasons.push('body-await-fill');}
  if(last.strength.state==='weak'&&end.type==='use_generates_body'){summary+='，所得不多';reasons.push('weak-final-support');}
  if(body.strength.state==='weak'&&!summary.includes('迟')){summary+='，只是自身力弱，进展慢';reasons.push('weak-body');}
 }
 const verdict={code,summary:summary+'。',ruleId:'direct-verdict-v1',reasons,finalRelation:end.type,
  sourceIds:['mh-061','mh-117',domain.sourceSectionId,...(r.nodes.some(n=>n.void.hit===true)?['user-void-extension','user-void-timing']:[])],basisQuote:domain.sourceQuotes?.[end.type]?.quote||null,
  status:'traditional-prediction-not-reported-fact',linePolicy:'exact-moving-line-explains-turn;no-keyword-scoring',
  relationEvidence:r.edges.map(e=>({role:e.targetRole,type:e.type,strength:find(r,e.targetRole).strength.state,voidState:find(r,e.targetRole).void.state}))};
 const turn='动在'+line.label+'：“'+line.text+'”'+movingLine.explanation;
 const change='这一爻动后，'+r.use.trigram+find(r,'use').element+'变成'+last.trigram+last.element+'，'+(first.type===end.type?'对原体仍是'+end.label:first.label+'变成'+end.label)+'。';
 const start='起初是'+r.stages.primary.name+'。'+monthly(body,order)+step(r,'use',domain)+voidSentence(body,r);
 const mid=middle(r,domain);
 const finish='最后变为'+r.stages.changed.name+'。'+change+(EMPTY.has(last.void.state)?voidSentence(last,r):'')+(body.void.state==='true_void'?'体卦真空，这些生克不能把结果改成有成；后遇填冲也不自动恢复。':'')+'所以这卦断：'+verdict.summary;
 const timingDecision=selectAuditedTiming(r,timing,verdict);
 return {verdict,movingLine,timingDecision,paragraphs:['卦断：'+verdict.summary,start,turn,mid,finish,timingDecision.text]};
}
