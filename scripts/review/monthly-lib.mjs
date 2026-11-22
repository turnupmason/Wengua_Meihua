// 逐月长稿通用库（2026-11-19，用户定：面试以外各问项一律照面试逐月长稿的写作手法与格式，见
// origin/editorial/interview-preview-216-20261118 的 docs/review/INTERVIEW_MONTHLY_REWRITE_20261118.md 与 INTERVIEW_MONTHLY_AUDIT_METHOD.md）。
// 由面试的 interview-monthly-lib.mjs 按问项参数化而来；只核对与排版作者已写定的正文，不生成、不拼接、不改写文章。
import {readFile, readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {loadLibrary} from '../../src/index.js';
import {createContextualReading, promotionTimingSlots, EXAM_PROFILE, PROMOTION_V3_PROFILE, PROBATION_V3_PROFILE, STABILITY_V3_PROFILE,
 JOB_CHANGE_V3_PROFILE, ESTABLISHMENT_V3_PROFILE, RECONCILIATION_V3_PROFILE, NEW_PARTNER_V3_PROFILE} from '../../src/interview-manuscripts.js';
import {resolveManuscriptDates} from '../../src/prewritten-manuscripts.js';
import {CHOICE_WORDS, CHOICE_CONTRA} from './state-vocab.mjs';

export const MONTHS = [...'寅卯辰巳午未申酉戌亥子丑'];
export const QI = {寅:'spring-wood',卯:'spring-wood',辰:'seasonal-earth',巳:'summer-fire',午:'summer-fire',未:'seasonal-earth',申:'autumn-metal',酉:'autumn-metal',戌:'seasonal-earth',亥:'winter-water',子:'winter-water',丑:'seasonal-earth'};
export const DEMO_DATE = '2026-11-11';
// 各问项：问法、档案、结论码与首句判词。judgmentBaseline：strict = 专业说明须与五气作者源第 9 栏一致（改须带 judgmentCorrection）；
// sync = 五气作者源第 9 栏尚未写定（新补判问项），专业说明由月稿写定后回写五气源，检查同气一致与结论用语。
export const ITEMS = {
 'relationship-establishment':{
  title:'确定关系', questionId:'relationships.developing.relationship', profile:ESTABLISHMENT_V3_PROFILE, judgmentBaseline:'strict',
  question:{mode:'narrative', question_type:'relationship_establishment', question:'我们能确定恋爱关系吗？', sourceDomainIds:['domain-05']},
  scopeNote:'本页的“这一回”只指两人能否走到双方明确同意、确定恋爱关系。',
  verdictLabel:{favourable:'这段关系能确定下来', difficult:'这一回关系定不下来'},
  verdict:{
   favourable:/(?:能|能够|可以)(?:确定|定下|走到一起|在一起|确认)|关系能定|定得下来|走得到一起|会在一起|谈得成|能谈成|能成/u,
   difficult:/定不下来|确定不了|走不到一起|没走到一起|成不了|难成|不能确定|还定不下|定不了|没能在一起|不能在一起|走不到确定/u,
  },
  note:{favourable:/定为能成/u, difficult:/定为不成/u},
  forbid:/考试|考场|考生|卷面|试卷|阅卷|合格线|及格|分数|面试|晋升|升职|职级|转正|试用期|辞职|跳槽|裁员/u,
 },
 // 2026-11-21：复合、新桃花，口径同确定关系（docs/review/LOVE_RECON_NEWPARTNER_POLICY_DRAFT_20261121.md）。第 9 栏先按本问项改写定稿，再写月稿（strict）。
 'relationship-reconciliation':{
  title:'复合', questionId:'relationships.reconciliation.reconcile', profile:RECONCILIATION_V3_PROFILE, judgmentBaseline:'strict',
  question:{mode:'narrative', question_type:'relationship_reconciliation', question:'这段已经结束的感情能复合吗？', sourceDomainIds:['domain-05']},
  scopeNote:'本页的“复合”只指这段已经结束的感情，能否由两人都愿意而重新在一起。',
  verdictLabel:{favourable:'这段感情能复合', difficult:'这一回复合不了'},
  verdict:{
   favourable:/(?<!不)(?:能|能够|可以)(?:复合|和好|重新在一起|回到一起|走回一处)|复合得了|复合能成|合得回去|回得到一起/u,
   difficult:/复合不了|复合不成|没能复合|不能复合|难以复合|合不回去|回不到一起|和好不了|走不回一处|这一回合不上/u,
  },
  note:{favourable:/定为能成/u, difficult:/定为不成/u},
  forbid:/考试|考场|考生|卷面|试卷|阅卷|合格线|及格|分数|面试|晋升|升职|职级|转正|试用期|辞职|跳槽|裁员/u,
 },
 'new-relationship-opportunity':{
  title:'新桃花', questionId:'relationships.new-partner.opportunity', profile:NEW_PARTNER_V3_PROFILE, judgmentBaseline:'strict',
  question:{mode:'narrative', question_type:'new_relationship_opportunity', question:'近期有开始新感情的机会吗？何时可能遇到适合发展关系的人？', sourceDomainIds:['domain-02','domain-05']},
  scopeNote:'本页只看尚无确定对象的人，近期有没有开始一段新感情的机会、大致何时遇到。',
  verdictLabel:{favourable:'近期有开始新感情的机会', difficult:'近期还遇不到合适的人'},
  verdict:{
   favourable:/有(?:开始)?(?:一段)?新感情的机会|有机会遇到|遇得到|(?<!不)能遇到|会遇到合适|新感情能开始|能开始一段新感情/u,
   difficult:/遇不到|遇不上|没有(?:开始)?(?:一段)?新感情的机会|没有机会遇到|还没有合适的人|新感情还开始不了|开始不了新感情/u,
  },
  note:{favourable:/定为能成/u, difficult:/定为不成/u},
  forbid:/考试|考场|考生|卷面|试卷|阅卷|合格线|及格|分数|面试|晋升|升职|职级|转正|试用期|辞职|跳槽|裁员|复合|前任/u,
 },
 'job-change':{
  title:'跳槽去留', questionId:'career.job-change.decision', profile:JOB_CHANGE_V3_PROFILE, judgmentBaseline:'strict',
  question:{mode:'narrative', question_type:'job_change_decision', question:'现职和这份新工作怎么选，现在适合辞职吗？', sourceDomainIds:['domain-08','domain-09']},
  scopeNote:'本页只比较现职与这份具体的新工作，并判断现在宜留、宜先准备还是可以办辞职。',
  verdictLabel:{stay:'眼下宜留在现职', prepare:'新工作可取，先准备再办', switch:'可以换到新工作'},
  // 判词与相反说法沿用五气稿的 state-vocab（CHOICE_WORDS／CHOICE_CONTRA），2026-11-20 改。
  verdict:CHOICE_WORDS, contra:CHOICE_CONTRA,
  note:{stay:/定为留/u, prepare:/定为先准备/u, switch:/定为可走/u},
  // 他项用语（照 check-hex 跳槽段，去掉「能过／过不了」：长文里「便能过去」「过不了收尾」是常语）；「面试」「试用期」只能指这份新工作的环节，可写。
  forbid:/考试|考场|考生|卷面|试卷|阅卷|合格线|及格|分数|晋升|升职|职级|转正|裁员|被裁|稳得住|有隐患|风险大/u,
 },
 'workplace-stability':{
  title:'职场情况', questionId:'career.job-stability.layoff', profile:STABILITY_V3_PROFILE, judgmentBaseline:'strict',
  question:{mode:'narrative', question_type:'employment_stability', question:'当前工作的稳定性如何，会有被裁员的风险吗？', sourceDomainIds:['domain-09']},
  scopeNote:'本页只看眼下这份工作稳不稳、有没有中断的风险。',
  verdictLabel:{stable:'这份工作稳得住', watch:'这份工作有隐患', strained:'这份工作风险大'},
  verdict:{
   stable:/稳得住|能稳住|稳当|坐得稳|保得住|守得住|站得住|不在裁员之列|工作稳|位置稳|岗位稳/u,
   watch:/隐患|变数|松动|不算稳|不够稳/u,
   strained:/风险大|风险不小|风险很大|保不住|难保|站不稳|坐不稳|位置不稳|岗位不稳|工作不稳/u,
  },
  note:{stable:/定为稳/u, watch:/定为有隐患/u, strained:/定为风险大/u},
 },
 'workplace-probation':{
  title:'能否转正', questionId:'career.job-stability.probation', profile:PROBATION_V3_PROFILE, judgmentBaseline:'strict',
  question:{mode:'narrative', question_type:'probation_completion', question:'这次试用期能通过吗？', sourceDomainIds:['domain-09']},
  scopeNote:'本页的“这次”只指当前这段试用期能否转正。',
  verdictLabel:{favourable:'这次能转正', difficult:'这次转不了正'},
  verdict:{favourable:/能转正|转得了正|试用期能通过|能转为正式|转正能成/u, difficult:/转不了|转不成|没能转正|不能转正|还没转下来|试用期这回没过|转正还差/u},
  note:{favourable:/定为能转正|定为能过|定为能成/u, difficult:/定为转不了|定为过不了|定为不成/u},
 },
 'promotion-pay':{
  title:'晋升加薪', questionId:'career.promotion-pay.promotion', profile:PROMOTION_V3_PROFILE, judgmentBaseline:'strict',
  question:{mode:'narrative', question_type:'promotion', question:'这次能晋升加薪吗？', sourceDomainIds:['domain-09']},
  scopeNote:'本页的“这次”只指本次晋升及随岗加薪。',
  verdictLabel:{favourable:'这次能升', difficult:'这次升不了'},
  verdict:{favourable:/(?<!不)(?:能|能够|可以)(?:晋升|升职|升)|升得上去|晋升能落定|职级能动|升职能成/u, difficult:/升不了|升不上|不能晋升|无法晋升|不能升职|不能升|没升上去|没能晋升|这次没升成|职级这次没动|晋升没落定|还没轮到/u},
  note:{favourable:/定为能升|定为能过|定为能成/u, difficult:/定为升不了|定为过不了|定为不成/u},
 },
 exam:{
  title:'考试', questionId:'career.exams.exam', profile:EXAM_PROFILE, judgmentBaseline:'strict',
  question:{mode:'narrative', question_type:'examination_result', question:'这次考试能通过吗', sourceDomainIds:['domain-09']},
  scopeNote:'本页的“这次”只指本次考试能否达到合格要求。',
  verdictLabel:{favourable:'这次考试能通过', difficult:'这次考试过不了'},
  verdict:{favourable:/(?:能|能够|可以)通过|能过|过得了|考得过|能合格|能过线/u, difficult:/不能通过|过不了|无法通过|考不过|合格不了|还差一截|离合格线还差|没能过线/u},
  note:{favourable:/定为能过/u, difficult:/定为过不了|定为不成/u},
 },
};
export const item = name => { const c = ITEMS[name]; if (!c) throw new Error('Unknown monthly item ' + name); return {...c, name,
 SOURCE_DIR:`sources/editorial/${name}/monthly`, RECEIPT_DIR:`sources/editorial/${name}/reviews-monthly`, DOC_DIR:`docs/${name}/monthly-preview`}; };
const LABELS = {body:'体卦',use:'本用',body_mutual:'体互',use_mutual:'用互',changed_use:'变用',body_inherited:'变卦原体'};
const REL_LABELS = {equal:'与体比和',body_controls_use:'受体所克',use_controls_body:'克体',use_generates_body:'生体',body_generates_use:'受体所生'};

// 独立排盘表（照面试月稿：文王卦序上下卦、六爻位运算、八卦五行、五态），不调用引擎的排盘与生克函数。
const PAIRS = ('乾乾 坤坤 坎震 艮坎 坎乾 乾坎 坤坎 坎坤 巽乾 乾兑 坤乾 乾坤 乾离 离乾 坤艮 震坤 兑震 艮巽 坤兑 巽坤 离震 艮离 艮坤 坤震 乾震 艮乾 艮震 兑巽 坎坎 离离 兑艮 震巽 乾艮 震乾 离坤 坤离 巽离 离兑 坎艮 震坎 艮兑 巽震 兑乾 乾巽 兑坤 坤巽 兑坎 坎巽 兑离 离巽 震震 艮艮 巽艮 震兑 震离 离艮 巽巽 兑兑 巽坎 坎兑 巽兑 震艮 坎离 离坎').split(' ');
const TRIGRAM_BITS = {乾:'111',兑:'110',离:'101',震:'100',巽:'011',坎:'010',艮:'001',坤:'000'};
const BY_BITS = Object.fromEntries(Object.entries(TRIGRAM_BITS).map(([k,v])=>[v,k]));
const ELEMENT = {乾:'金',兑:'金',离:'火',震:'木',巽:'木',坎:'水',艮:'土',坤:'土'};
const GENERATES = {木:'火',火:'土',土:'金',金:'水',水:'木'};
const CONTROLS = {木:'土',火:'金',土:'水',金:'木',水:'火'};
const STATES = {
 'spring-wood':{木:'旺',火:'相',土:'死',金:'囚',水:'休'},
 'summer-fire':{木:'休',火:'旺',土:'相',金:'死',水:'囚'},
 'seasonal-earth':{木:'囚',火:'休',土:'旺',金:'相',水:'死'},
 'autumn-metal':{木:'死',火:'囚',土:'休',金:'旺',水:'相'},
 'winter-water':{木:'相',火:'死',土:'囚',金:'休',水:'旺'},
};
const BITS_TO_ID = Object.fromEntries(PAIRS.map(([upper,lower],i)=>[TRIGRAM_BITS[lower]+TRIGRAM_BITS[upper],i+1]));
export const stem = id=>'hex-'+String(id).padStart(3,'0');
export const sha256 = text=>createHash('sha256').update(text).digest('hex');
export const han = text=>(String(text).match(/\p{Script=Han}/gu)||[]).length;
export const normalize = text=>String(text).replace(/[^\p{Letter}\p{Number}]/gu,'');
export const stripQuotes = text=>String(text).replace(/[「『“][^」』”]*[」』”]/gu,'');
export const readJSON = async path=>JSON.parse(await readFile(path,'utf8'));
export async function listMonthlyIds(c) {
 try { return (await readdir(c.SOURCE_DIR)).filter(f=>/^hex-\d{3}\.json$/.test(f)).map(f=>Number(f.slice(4,7))).sort((a,b)=>a-b); } catch { return []; }
}
export function independentFacts(primaryId,movingLine,monthBranch) {
 const [upper,lower] = PAIRS[primaryId-1];
 const bits = (TRIGRAM_BITS[lower]+TRIGRAM_BITS[upper]).split('');
 const changed = [...bits];changed[movingLine-1]=changed[movingLine-1]==='1'?'0':'1';
 const mutual = [...bits.slice(1,4),...bits.slice(2,5)];
 const lowerMoving = movingLine<=3;
 const trigrams = {
  use:lowerMoving?lower:upper, body:lowerMoving?upper:lower,
  use_mutual:BY_BITS[(lowerMoving?mutual.slice(0,3):mutual.slice(3)).join('')],
  body_mutual:BY_BITS[(lowerMoving?mutual.slice(3):mutual.slice(0,3)).join('')],
  changed_use:BY_BITS[(lowerMoving?changed.slice(0,3):changed.slice(3)).join('')],
  body_inherited:lowerMoving?upper:lower,
 };
 const nodes=Object.entries(trigrams).map(([role,trigram])=>({role,trigram,element:ELEMENT[trigram],qi:STATES[QI[monthBranch]][ELEMENT[trigram]]}));
 const body = ELEMENT[trigrams.body];
 const rel = other=>other===body?'equal':GENERATES[body]===other?'body_generates_use':GENERATES[other]===body?'use_generates_body':CONTROLS[body]===other?'body_controls_use':'use_controls_body';
 const relations=['use','use_mutual','body_mutual','changed_use'].map(role=>({role,type:rel(ELEMENT[trigrams[role]])}));
 return {bits:bits.map(Number),stageIds:[primaryId,BITS_TO_ID[mutual.join('')],BITS_TO_ID[changed.join('')]],nodes,relations,lineLabel:(movingLine===1?'初':movingLine===6?'上':'')+(bits[movingLine-1]==='1'?'九':'六')+(movingLine>1&&movingLine<6?'二三四五'[movingLine-2]:'')};
}
export async function context() {return {library:await loadLibrary()};}
export function readingFor(ctx,c,id,article,date=DEMO_DATE) {
 return createContextualReading({library:ctx.library,question:{id:c.questionId,...c.question},primaryId:id,movingLine:article.movingLine,monthBranch:article.monthBranch,castingDate:date,applyVoid:false});
}
export function resolveTiming(c,reading,article,date=DEMO_DATE,viewDate=date) {
 if(typeof article.timing==='string')return {slots:[],paragraphs:[article.timing],dateMatches:[],status:'not-derived'};
 const slots=promotionTimingSlots(reading,article.timing,article.outcome,c.profile);
 return {slots,...resolveManuscriptDates({paragraphs:slots.map(s=>s.token),dateSlots:slots,reading,castingDate:date,viewDate,timingScale:'day',timingContext:{castingMethod:'pre-heaven',periodMethod:'element-qi'}})};
}
export async function loadHex(c,id) {
 const sourcePath=`${c.SOURCE_DIR}/${stem(id)}.json`;
 const raw=await readFile(sourcePath,'utf8');
 const source=JSON.parse(raw);
 const base=await readJSON(`sources/editorial/${c.name}/${stem(id)}.json`);
 let data=null;try {data=await readJSON(`data/authored-readings/${c.name}/${stem(id)}.json`);}catch(e){if(e.code!=='ENOENT')throw e;}
 let receipt=null;try {receipt=await readJSON(`${c.RECEIPT_DIR}/${stem(id)}.json`);}catch(e){if(e.code!=='ENOENT')throw e;}
 return {sourcePath,raw,source,base,data,receipt};
}
export function oldFor(bundle,a) {return bundle.base.find(d=>d[0]===a.movingLine&&d[1]===QI[a.monthBranch]);}
export function rowFor(bundle,a) {return bundle.data?.rows.find(r=>r.movingLine===a.movingLine&&r.monthOrder===QI[a.monthBranch]&&r.baseProse!==false)??null;}
export function timingSignature(timing) {return typeof timing==='string'?'not-derived':JSON.stringify(timing.map(s=>[s[0],s[1],s[5]||'element-qi']));}

export function renderHex(ctx,c,bundle) {
 const id=bundle.source.primaryId,name=ctx.library.getHexagram(id).name,s=stem(id);
 const foldTiming = c.name === 'exam' && id >= 7;
 const out=[`# ${id} · ${name}：六动爻与十二月令`,
 `本页为「${c.title}」逐月长稿预览中的${name}，共 ${bundle.source.articles.length} 篇：六个动爻各写十二个月。作者全文读回及古籍解释分歧见[核读记录](../../../${c.RECEIPT_DIR}/${s}.json)。`,
 `[返回预览目录](README.md) · [查看五气版作对照](../${s}.md)`,
 foldTiming ? c.scopeNote : `应期日期以 ${DEMO_DATE} 为演示基准，实际使用按起卦日换算。${c.scopeNote}`];
 for(const a of bundle.source.articles) {
  const r=readingFor(ctx,c,id,a),row=rowFor(bundle,a),timing=resolveTiming(c,r,a);
  const timingReason=typeof a.timing==='string'?a.timing:a.timing.map(x=>x[4]).join(' ');
  const effects=row?.decision?.indirectEffectsApplied||[];
  // The promotion manuscript follows Wang/Kong's punctuation here; preserve inherited chart facts.
  const guFirst=c.name==='promotion-pay'&&id===18&&a.movingLine===1;
  const inheritedGuLine='干父之蛊，有子考，无咎；厉终吉。';
  const collatedGuLine='干父之蛊，有子，考无咎，厉终吉。';
  if(guFirst&&![inheritedGuLine,collatedGuLine].includes(r.selectedMovingLine.text))
   throw new Error('Unexpected wording for promotion hex-18-line-1; recheck the punctuation witness');
  const displayedLine=guFirst?collatedGuLine:r.selectedMovingLine.text;
  const timingNotes=['### 应期参考',...(timing.slots.length?[
   foldTiming ? `以下以 ${DEMO_DATE} 演示传统推算的参考窗口，实际使用按起卦日换算。` : '以下为传统推算的参考窗口。',
  ]:[]),...timing.paragraphs];
  out.push(`## ${r.selectedMovingLine.label}动 · ${a.monthBranch}月`,a.title,Object.values(r.stages).map(x=>x.name).join(' → '),...a.paragraphs,
   ...(c.name==='promotion-pay'?['### 随岗薪资',a.payExplanation]:[]),
   ...(!foldTiming?timingNotes:[]),
   foldTiming ? '<details>\n<summary>卦理、出处与应期</summary>' : '<details>\n<summary>卦理与出处</summary>',
   `判断：${c.verdictLabel[a.outcome]}。`+r.edges.map(e=>{const n=r.nodes.find(n=>n.role===e.targetRole);return LABELS[n.role]+n.trigram+n.element+REL_LABELS[e.type];}).join('；')+'。',
   `旺衰：${a.monthBranch}月，`+r.nodes.filter(n=>n.role!=='body_inherited').map(n=>LABELS[n.role]+n.trigram+n.element+n.strength.state).join('；')+'。',
   ...(effects.length?['间接作用：按本库所取的一层作用解释，'+effects.map(e=>{const n=r.nodes.find(n=>n.role===e.role);return LABELS[e.role]+n.trigram+n.element+'：'+e.label;}).join('；')+'。上列月令五态保持原值，不作连环累计。']:[]),
   `爻辞：${r.selectedMovingLine.label}「${displayedLine}」；象曰「${r.selectedMovingLine.image}」。`,
   ...(guFirst?['句读依据：本页依[《周易正义·蛊》](https://zh.wikisource.org/wiki/周易正義/03蠱)断作“有子，考无咎”。王孔释为有子堪任父事，父乃无咎；知危而能承事，故终吉。']:[]),
   '专业说明：'+a.judgment,
   ...(a.judgmentCorrection?['说明订正：'+a.judgmentCorrection.reason+' 原文、新文及来源保存在作者源的 judgmentCorrection 中；本次未改变结论或取期结构。']:[]),
   ...(c.name==='promotion-pay'&&a.payCorrection?['薪资说明订正：'+a.payCorrection.reason+' 原文与新文保存在作者源的 payCorrection 中；本次未改变晋升结论或取期结构。']:[]),
   ...(foldTiming?timingNotes:[]), '取期依据：'+timingReason,
   ...(row?.decision?.sourceEvidence?.length?['条文对照：以下保留相关判读原文，供核对条件；并非每条都适用于本盘。具体采用、反证与尚待复核的权重，见上方专业说明及本卦核读记录。',
    row.decision.sourceEvidence.map(x=>`- 《梅花易数·${x.title}》：“${x.quote}”`).join('\n')]:[]),
   `稿件键：\`${c.questionId}/${id}/${a.movingLine}/${a.monthBranch}/${a.outcome}\`。作者源：[${s}.json](../../../${c.SOURCE_DIR}/${s}.json)。`,
   '</details>','<details>\n<summary>简断摘要</summary>',a.short,'</details>');
 }
 return out.join('\n\n')+'\n';
}
