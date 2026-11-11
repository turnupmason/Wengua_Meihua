/** Deterministic knowledge layer. No LLM, network requests, or calendar guesses in createReading. */
import {readRepositoryJSON} from './io.js';
export {createDetailsRepository} from './details.js';
export {createNarrativeRepository,buildTimingPlan,MONTH_ORDERS} from './narratives.js';
export {TIMING_AUDIT_VERSION,DOMAIN_TIMING_SPECS,GLOBAL_TIMING_RULES,TRIGRAM_PERIOD_SPECS} from './timing-rules.js';
export {selectAuditedTiming} from './timing-audit.js';
export {getCivilDay,formatCivilDay,findCivilDayMatches,formatUpcomingCivilDay,findUpcomingCivilDayMatches} from './day-calendar.js';
export {buildFullChartRelations} from './full-chart.js';
export {INTERPRETATION_POLICY_VERSION,AUDIT_CHECKS,assessSeasonalQi,buildInterpretationEvidence,interpretationArtifactDigest,evaluateInterpretationReview} from './interpretation-audit.js';
export {STORY_EDITORIAL_VERSION,inspectMovingLine,collectStoryFacts,CONFLICT_CASE_POLICIES,resolveConflictCase,countHan,validateStoryCopy,getStoryCopy} from './story-editorial.js';
export {createQuestionRepository,questionStoryContextKey} from './questions.js';
export {createProductRepository} from './product.js';
export {getVoidProfileKey,unpackManuscript,resolveManuscriptDates} from './prewritten-manuscripts.js';
const BRANCHES = [...'子丑寅卯辰巳午未申酉戌亥'];
const STEMS = [...'甲乙丙丁戊己庚辛壬癸'];
const GENERATES = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const CONTROLS = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
const ELEMENTS = Object.keys(GENERATES);
const BRANCH_ELEMENTS={子:'水',丑:'土',寅:'木',卯:'木',辰:'土',巳:'火',午:'火',未:'土',申:'金',酉:'金',戌:'土',亥:'水'};
export const TRIGRAM_BRANCHES = deepFreeze({ 乾: ['戌','亥'], 兑: ['酉'], 离: ['午'], 震: ['卯'], 巽: ['辰','巳'], 坎: ['子'], 艮: ['丑','寅'], 坤: ['未','申'] });
const COMBINES = {子:'丑',丑:'子',寅:'亥',亥:'寅',卯:'戌',戌:'卯',辰:'酉',酉:'辰',巳:'申',申:'巳',午:'未',未:'午'};
const LABELS = { body_controls_use: '体克用', use_controls_body: '用克体', body_generates_use: '体生用', use_generates_body: '用生体', equal: '比和' };
const PHRASES = { body_controls_use: '主制事 · 可掌控', use_controls_body: '事克主 · 主不顺', body_generates_use: '主生事 · 有耗费', use_generates_body: '事生主 · 有助益', equal: '主事相和' };
function integer(n,min,max,label) { if(!Number.isSafeInteger(n)||n<min||n>max) throw new RangeError(`${label} must be an integer ${min}..${max}`); return n; }
function deepFreeze(x) { if(x&&typeof x==='object'&&!Object.isFrozen(x)){ Object.freeze(x);for(const v of Object.values(x))deepFreeze(v); } return x; }
function assertElement(e) { if(!ELEMENTS.includes(e))throw new RangeError(`Unknown element: ${e}`); }
export function relation(bodyElement,useElement) {
  assertElement(bodyElement);assertElement(useElement);
  const type=bodyElement===useElement?'equal':CONTROLS[bodyElement]===useElement?'body_controls_use':CONTROLS[useElement]===bodyElement?'use_controls_body':GENERATES[bodyElement]===useElement?'body_generates_use':'use_generates_body';
  return {type,label:LABELS[type],phrase:PHRASES[type],bodyElement,useElement};
}
export function getXunVoid(ganzhi) {
  if(typeof ganzhi!=='string'||[...ganzhi].length!==2)throw new TypeError('ganzhi must be a valid two-character stem/branch');
  const [g,z]=[...ganzhi],a=STEMS.indexOf(g),b=BRANCHES.indexOf(z);
  if(a<0||b<0||(b-a)%2!==0)throw new RangeError(`Invalid sexagenary pair: ${ganzhi}`);
  const firstBranch=(b-a+12)%12;
  return {ganzhi,xunHead:'甲'+BRANCHES[firstBranch],branches:[BRANCHES[(firstBranch+10)%12],BRANCHES[(firstBranch+11)%12]],sourceId:'user-void-extension'};
}
export function getVoidReleaseTargets(ganzhi) {
  const xun=getXunVoid(ganzhi);
  return {...xun,targets:xun.branches.map(b=>({emptyBranch:b,fill:b,clash:BRANCHES[(BRANCHES.indexOf(b)+6)%12],combine:COMBINES[b]})),priority:['fill','clash'],combineDefaultEnabled:false,sourceId:'user-void-timing'};
}
export function seasonalStrength(element,context={}) {
  assertElement(element);
  let {season,monthBranch}=context;
  if(monthBranch!==undefined&&!BRANCHES.includes(monthBranch))throw new RangeError('Invalid month branch');
  const monthSeason=monthBranch?(('辰戌丑未'.includes(monthBranch))?'earth':'寅卯'.includes(monthBranch)?'spring':'巳午'.includes(monthBranch)?'summer':'申酉'.includes(monthBranch)?'autumn':'winter'):undefined;
  if(season&& !['spring','summer','autumn','winter','earth'].includes(season))throw new RangeError('Unknown season');
  if(season&&monthSeason&&season!==monthSeason&&monthSeason!=='earth')throw new RangeError('Season conflicts with the explicitly supplied month branch');
  season=monthSeason||season;
  if(!season)return {state:'unresolved',label:'时令待提供',element,sourceSectionTitles:['卦气旺','卦气衰']};
  const strong={spring:'木',summer:'火',autumn:'金',winter:'水',earth:'土'}[season];
  const weak={spring:'土',summer:'金',autumn:'木',winter:'火',earth:'水'}[season];
  return {state:element===strong?'strong':element===weak?'weak':'not_explicit',label:element===strong?'旺':element===weak?'衰':'原条目未明示',element,season,monthBranch:monthBranch||null,monthElement:strong,monthRelation:relation(element,strong),sourceSectionTitles:['卦气旺','卦气衰'],note:'月支由调用方按选定历法提供；不将其他五行自动解释为平或空亡真空。'};
}
/** User-specified extension. Partial branch hits are visible but do not silently nullify a whole trigram. */
export function assessVoid(trigram,options={}) {
  if(!TRIGRAM_BRANCHES[trigram])throw new RangeError('Unknown trigram');
  const {ganzhi,moving=false,strength,filledBranches=[],releaseClashBranches=[],combineBranches=[],supported=false,severelyWeak=false,dayMonthAttacked=false,partialPolicy='mark-only',allowCombine=false,eventType='general'}=options;
  if(!['mark-only','any-hit','all-hit'].includes(partialPolicy))throw new RangeError('Unknown partialPolicy');
  for(const b of [...filledBranches,...releaseClashBranches,...combineBranches])if(!BRANCHES.includes(b))throw new RangeError('Invalid fill/release branch');
  if(severelyWeak&&(['strong','旺','相'].includes(strength)||supported))throw new RangeError('Conflicting casting-time evidence: severely weak versus strong/supported');
  if(!ganzhi)return {state:'unresolved',label:'旬空待提供',hit:null,matchedBranches:[],effective:'unknown',sourceId:'user-void-extension'};
  const xun=getXunVoid(ganzhi),branches=TRIGRAM_BRANCHES[trigram],matched=branches.filter(b=>xun.branches.includes(b));
  const base={sourceId:'user-void-extension',mappingPolicy:'later-heaven-branch-map-v1',partialPolicy,xun,branches:[...branches],matchedBranches:matched,hit:matched.length>0,hitKind:matched.length===0?'none':matched.length===branches.length?'full':'partial'};
  if(!matched.length)return {...base,state:'not_void',label:'未逢空',effective:'active'};
  const falseVoid=moving||['strong','旺','相'].includes(strength)||supported;
  const trueVoid=!falseVoid&&severelyWeak&&dayMonthAttacked;
  const releaseEvidence=matched.map(b=>({branch:b,fill:filledBranches.includes(b),clash:releaseClashBranches.some(r=>(BRANCHES.indexOf(r)-BRANCHES.indexOf(b)+12)%12===6),combine:combineBranches.includes(COMBINES[b])}));
  const combineEligible=allowCombine&&['marriage','cooperation'].includes(eventType)&&falseVoid;
  const releaseMatched=releaseEvidence.every(e=>e.fill||e.clash||(combineEligible&&e.combine));
  const withEvidence={...base,castingState:trueVoid?'true_void':falseVoid?'false_void':'static_unclassified',releaseEvidence,releaseTargets:getVoidReleaseTargets(ganzhi).targets.filter(t=>matched.includes(t.emptyBranch)),combineEligible};
  // User's latest correction: casting-time true void cannot be revived by a later fill/clash/combine.
  if(base.hitKind==='partial'&&partialPolicy==='mark-only')return {...withEvidence,state:'partial_pending',label:'部分地支逢空',effective:'unknown'};
  if(base.hitKind==='partial'&&partialPolicy==='all-hit')return {...withEvidence,state:'partial_not_applied',label:'部分命中，按全支策略不作整卦空',effective:'active'};
  if(trueVoid)return {...withEvidence,state:'true_void',label:'真空 · 后遇节点亦不自动恢复',effective:'suppressed'};
  if(releaseMatched)return {...withEvidence,state:'released',label:'填实／冲实或限定合空条件已提供',effective:'active'};
  if(moving)return {...withEvidence,state:'moving_exempt',label:'动不为空',effective:'active'};
  if(['strong','旺','相'].includes(strength))return {...withEvidence,state:'strong_exempt',label:'旺不为空',effective:'active'};
  if(supported)return {...withEvidence,state:'supported',label:'假空 · 得生扶待落实',effective:'conditional'};
  return {...withEvidence,state:'dormant',label:'静空待填／待冲',effective:'dormant'};
}
function escapeXML(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));}
export function createLibrary({catalog,sections,domains}) {
  if(catalog?.schemaVersion!=='1.0.0'||catalog.hexagrams?.length!==64)throw new TypeError('Expected validated catalog schema 1.0.0');
  catalog=structuredClone(catalog);sections=structuredClone(sections);domains=structuredClone(domains);
  deepFreeze(catalog);deepFreeze(sections);deepFreeze(domains);
  const byId=new Map(catalog.hexagrams.map(h=>[h.id,h])),byBits=new Map(catalog.hexagrams.map(h=>[h.bitsBottomUp.join(''),h]));
  const trigrams=new Map(catalog.trigrams.map(t=>[t.id,t]));
  const hex=id=>{integer(id,1,64,'hexagramId');return byId.get(id);};
  const bitsHex=bits=>{if(!Array.isArray(bits)||bits.length!==6||!bits.every(b=>b===0||b===1))throw new TypeError('Six bottom-up bits required');const h=byBits.get(bits.join(''));if(!h)throw new Error('Catalog structure missing');return h;};
  const changed=(id,line)=>{integer(line,1,6,'movingLine');const b=[...hex(id).bitsBottomUp];b[line-1]=1-b[line-1];return bitsHex(b);};
  const mutual=(id,line,policy='inner-lines')=>{
    if(!['inner-lines','pure-use-changed'].includes(policy))throw new RangeError('Unknown mutual policy');
    let h=hex(id);
    if(policy==='pure-use-changed'&&(id===1||id===2)){integer(line,1,6,'movingLine');h=changed(id,line);}
    const b=h.bitsBottomUp;return bitsHex([...b.slice(1,4),...b.slice(2,5)]);
  };
  const getLineReading=(id,line)=>{integer(line,1,6,'linePosition');return hex(id).lines[line-1];};
  function castByTrigramNumbers({upperNumber,lowerNumber,movingTotal}) {
    for(const [k,v] of Object.entries({upperNumber,lowerNumber,movingTotal}))integer(v,1,Number.MAX_SAFE_INTEGER,k);
    const u=catalog.trigrams[(upperNumber-1)%8],l=catalog.trigrams[(lowerNumber-1)%8];
    return {primaryId:bitsHex([...l.bitsBottomUp,...u.bitsBottomUp]).id,movingLine:(movingTotal-1)%6+1,upperNumber:(upperNumber-1)%8+1,lowerNumber:(lowerNumber-1)%8+1,sourceSectionTitles:['卦以八除','爻以六除']};
  }
  function castByTimeParts({yearBranchNumber,lunarMonth,lunarDay,hourBranchNumber}) {
    integer(yearBranchNumber,1,12,'yearBranchNumber');integer(lunarMonth,1,12,'lunarMonth');integer(lunarDay,1,30,'lunarDay');integer(hourBranchNumber,1,12,'hourBranchNumber');
    const upper=yearBranchNumber+lunarMonth+lunarDay,total=upper+hourBranchNumber;
    return {...castByTrigramNumbers({upperNumber:upper,lowerNumber:total,movingTotal:total}),method:'classical-time-parts',input:{yearBranchNumber,lunarMonth,lunarDay,hourBranchNumber},sourceSectionTitles:['年月日时起例']};
  }
  function createReading({primaryId,movingLine,domainId='domain-02',calendar={},voidContext={},mutualPolicy='inner-lines',question='',castId=null}) {
    integer(movingLine,1,6,'movingLine');
    const h=hex(primaryId),m=mutual(primaryId,movingLine,mutualPolicy),c=changed(primaryId,movingLine);
    const useSide=movingLine<=3?'lower':'upper',bodySide=useSide==='lower'?'upper':'lower';
    const body=trigrams.get(h[bodySide+'Trigram']),use=trigrams.get(h[useSide+'Trigram']);
    const domain=domains.find(d=>d.id===domainId);if(!domain)throw new RangeError('Unknown domainId');
    const nodes=[];
    for(const [stage,k] of [['primary',h],['mutual',m],['changed',c]])for(const side of ['lower','upper']){
      const t=trigrams.get(k[side+'Trigram']);const isBody=stage==='primary'&&side===bodySide;
      const role=stage==='primary'?(isBody?'body':'use'):stage==='mutual'?(side===bodySide?'body_mutual':'use_mutual'):(side===bodySide?'body_inherited':'changed_use');
      const strength=seasonalStrength(t.element,calendar);
      const explicit=voidContext.roleEvidence?.[role]||{};
      const supportEvidence=[];
      if(strength.monthRelation?.type==='use_generates_body')supportEvidence.push({basis:'month-qi',element:strength.monthElement,kind:'generates',sourceIds:['mh-007','mh-009','user-void-timing']});
      const basis=voidContext.basis||'day-explicit-input',ganzhi=explicit.ganzhi||voidContext.ganzhi;
      if(basis==='day-explicit-input'&&typeof ganzhi==='string'){
        const dayElement=BRANCH_ELEMENTS[[...ganzhi][1]];
        if(dayElement&&(dayElement===t.element||GENERATES[dayElement]===t.element))supportEvidence.push({basis:'day-branch',element:dayElement,kind:dayElement===t.element?'equal':'generates',sourceIds:['mh-007','mh-012','user-void-timing']});
      }
      const v=assessVoid(t.id,{...voidContext,...explicit,supported:Boolean(explicit.supported||voidContext.supported||supportEvidence.length),moving:role==='use'||role==='changed_use',strength:explicit.strength||strength.state});
      nodes.push({id:stage+'-'+side,stage,side,trigram:t.id,element:t.element,role,isBody,strength,supportEvidence,void:v});
    }
    // The unchanged trigram is the same body, including explicit true-void or release evidence.
    // It must not acquire a second, independently assessed state in the changed hexagram.
    const originalBody=nodes.find(n=>n.isBody),inheritedBody=nodes.find(n=>n.role==='body_inherited');
    inheritedBody.void=originalBody.void;inheritedBody.strength=originalBody.strength;inheritedBody.supportEvidence=originalBody.supportEvidence;
    const edges=nodes.filter(n=>!['body','body_inherited'].includes(n.role)).map(n=>{
      const r=relation(body.element,n.element);const bodyActs=['body_controls_use','body_generates_use'].includes(r.type);
      const effect=['suppressed','dormant'].includes(n.void.effective)?(['use_controls_body','body_generates_use'].includes(r.type)?'耗克作用暂减，仍核对体卦状态':'助益或可控条件暂难落实'):n.void.effective==='unknown'?'空亡资料待定，不作强弱结论':'保留本项生克作用';
      return {from:r.type==='equal'?'primary-'+bodySide:bodyActs?'primary-'+bodySide:n.id,to:r.type==='equal'?n.id:bodyActs?n.id:'primary-'+bodySide,targetRole:n.role,...r,sourceSectionTitles:['体用总诀','体用互变之诀'],voidEffect:n.void.effective,bodyVoidEffect:nodes.find(x=>x.isBody).void.effective,qualitativeNote:effect};
    });
    const selected=getLineReading(primaryId,movingLine);
    const panels={};
    for(const [stage,k,caption] of [['primary',h,'目前'],['mutual',m,'经过'],['changed',c,'结果']])panels[stage]={stage,id:k.id,name:k.name,symbol:k.symbol,bitsBottomUp:[...k.bitsBottomUp],baseGrade:k.grade.rawGrade,theme:k.grade.theme,caption,glowLine:stage==='primary'?movingLine:null,correspondingChangedLine:stage==='changed'?movingLine:null,detail:k};
    return deepFreeze({schemaVersion:'1.0.0',contentVersion:catalog.contentVersion,castId,question,primaryId,movingLine,mutualPolicy,body:{trigram:body.id,element:body.element,side:bodySide},use:{trigram:use.id,element:use.element,side:useSide},stages:panels,selectedMovingLine:{hexagramId:primaryId,position:movingLine,...selected},nodes,edges,domain,domainPassage:domain.relationPassages?.[relation(body.element,use.element).type]||null,
      contextualAssessment:{status:'qualitative-reference',summary:'基础等级、动爻资料与生克事实已接通；综合占断不由固定权重代替。',missing:[...(!calendar.season&&!calendar.monthBranch?['calendar-context']:[]),...(!voidContext.ganzhi?['void-ganzhi']:[])],sourceSectionTitles:['体用总诀','体用互变之诀','体用衰旺之诀'],baseGradesUnchanged:true},
      selectionPolicy:{movingLineScope:'primary-only',mutualHasIndependentMovingLine:false,specialUseNineSixAreOrdinaryLines:false},profile:{id:'user-classical-plus-void',version:'1.1.0',voidBasis:voidContext.basis||'day-explicit-input',partialPolicy:voidContext.partialPolicy||'mark-only',monthBoundary:'caller-supplied; no implicit timezone conversion'}});
  }
  function renderHexagramSVG(id,{movingLine=null,selectedLine=null,stage='primary',svgId='hexagram'}={}) {
    const h=hex(id);if(movingLine!==null)integer(movingLine,1,6,'movingLine');if(selectedLine!==null)integer(selectedLine,1,6,'selectedLine');
    if(!['primary','mutual','changed','library'].includes(stage))throw new RangeError('Unknown stage');
    if(!/^[A-Za-z][A-Za-z0-9_-]*$/.test(svgId))throw new TypeError('svgId must be a safe XML identifier');
    const groups=h.bitsBottomUp.map((bit,index)=>{
      const pos=index+1,y=22+(6-pos)*28,active=stage==='primary'&&movingLine===pos;
      const cl=active?'yao moving':selectedLine===pos?'yao selected':'yao';
      const rects=bit?`<rect x="24" y="${y}" width="120" height="10" rx="2"/>`:`<rect x="24" y="${y}" width="49" height="10" rx="2"/><rect x="95" y="${y}" width="49" height="10" rx="2"/>`;
      return `<g class="${cl}" data-line-position="${pos}" data-y="${y}" data-yang="${bit}" role="button" tabindex="0" aria-label="${escapeXML(h.lines[index].label)}${active?'，本卦动爻':''}"><rect class="hit-area" x="12" y="${y-8}" width="144" height="26" fill="transparent"/>${rects}</g>`;
    }).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 168 192" class="hexagram" data-hexagram-id="${id}" aria-labelledby="${svgId}-title"><title id="${svgId}-title">${escapeXML(h.name)}</title>${groups}</svg>`;
  }
  return Object.freeze({contentVersion:catalog.contentVersion,getHexagram:hex,getLineReading,castByTrigramNumbers,castByTimeParts,getChangedHexagram:changed,getMutualHexagram:mutual,getHexagramByBits:bitsHex,createReading,renderHexagramSVG,listHexagrams:()=>catalog.hexagrams,listDomains:()=>domains,listSections:()=>sections.sections,getSection:id=>sections.sections.find(s=>s.id===id),findSections:query=>sections.sections.filter(s=>s.kind==='section'&&(s.title.includes(query)||s.text.includes(query)))});
}
export async function loadLibrary({readJSON}={}) {
  if(!readJSON)readJSON=readRepositoryJSON;
  const [catalog,sections,domains]=await Promise.all(['data/catalog.json','data/meihua-sections.json','data/domains.json'].map(readJSON));
  return createLibrary({catalog,sections,domains});
}
