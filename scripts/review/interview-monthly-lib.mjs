// Monthly prose is written in the source JSON. This module only verifies and renders it.
import {readFile, readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {loadLibrary} from '../../src/index.js';
import {createContextualReading, promotionTimingSlots, INTERVIEW_V3_PROFILE} from '../../src/interview-manuscripts.js';
import {resolveManuscriptDates} from '../../src/prewritten-manuscripts.js';

export const MONTHS = [...'寅卯辰巳午未申酉戌亥子丑'];
export const QI = {寅:'spring-wood',卯:'spring-wood',辰:'seasonal-earth',巳:'summer-fire',午:'summer-fire',未:'seasonal-earth',申:'autumn-metal',酉:'autumn-metal',戌:'seasonal-earth',亥:'winter-water',子:'winter-water',丑:'seasonal-earth'};
export const SOURCE_DIR = 'sources/editorial/interview-pass/monthly';
export const RECEIPT_DIR = 'sources/editorial/interview-pass/reviews-monthly';
export const DOC_DIR = 'docs/interview-pass/monthly-preview';
export const DEMO_DATE = '2026-11-11';
export const QUESTION_ID = 'career.interview.interview-pass';
const QUESTION = {id:QUESTION_ID, mode:'narrative', question_type:'interview_pass', question:'这次面试能通过吗', sourceDomainIds:['domain-09']};
const LABELS = {body:'体卦',use:'本用',body_mutual:'体互',use_mutual:'用互',changed_use:'变用',body_inherited:'变卦原体'};
const REL_LABELS = {equal:'与体比和',body_controls_use:'受体所克',use_controls_body:'克体',use_generates_body:'生体',body_generates_use:'受体所生'};

// Independent, literal King Wen upper/lower order; no engine chart functions are reused here.
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
export const han = text=>(text.match(/\p{Script=Han}/gu)||[]).length;
export const normalize = text=>text.replace(/[^\p{Letter}\p{Number}]/gu,'');
export const stripQuotes = text=>text.replace(/[「『“][^」』”]*[」』”]/gu,'');
export const readJSON = async path=>JSON.parse(await readFile(path,'utf8'));
export async function listMonthlyIds() {
 return (await readdir(SOURCE_DIR)).filter(f=>/^hex-\d{3}\.json$/.test(f)).map(f=>Number(f.slice(4,7))).sort((a,b)=>a-b);
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
export function readingFor(ctx,id,article,date=DEMO_DATE) {
 return createContextualReading({library:ctx.library,question:QUESTION,primaryId:id,movingLine:article.movingLine,monthBranch:article.monthBranch,castingDate:date,applyVoid:false});
}
export function resolveTiming(reading,article,date=DEMO_DATE,viewDate=date) {
 if(typeof article.timing==='string')return {slots:[],paragraphs:[article.timing],dateMatches:[],status:'not-derived'};
 const slots=promotionTimingSlots(reading,article.timing,article.outcome,INTERVIEW_V3_PROFILE);
 return {slots,...resolveManuscriptDates({paragraphs:slots.map(s=>s.token),dateSlots:slots,reading,castingDate:date,viewDate,timingScale:'day',timingContext:{castingMethod:'pre-heaven',periodMethod:'element-qi'}})};
}
export async function loadHex(id) {
 const sourcePath=`${SOURCE_DIR}/${stem(id)}.json`;
 const raw=await readFile(sourcePath,'utf8');
 const source=JSON.parse(raw);
 const base=await readJSON(`sources/editorial/interview-pass/${stem(id)}.json`);
 const data=await readJSON(`data/authored-readings/interview-pass/${stem(id)}.json`);
 let receipt=null;try {receipt=await readJSON(`${RECEIPT_DIR}/${stem(id)}.json`);}catch(e){if(e.code!=='ENOENT')throw e;}
 return {sourcePath,raw,source,base,data,receipt};
}
export function oldFor(bundle,a) {return bundle.base.find(d=>d[0]===a.movingLine&&d[1]===QI[a.monthBranch]);}
export function rowFor(bundle,a) {return bundle.data.rows.find(r=>r.movingLine===a.movingLine&&r.monthOrder===QI[a.monthBranch]&&r.baseProse!==false);}
export function timingSignature(timing) {return typeof timing==='string'?'not-derived':JSON.stringify(timing.map(s=>[s[0],s[1],s[5]||'element-qi']));}

export function renderHex(ctx,bundle) {
 const id=bundle.source.primaryId,name=ctx.library.getHexagram(id).name,s=stem(id);
 const out=[`# ${id} · ${name}：六动爻与十二月令`,
 `本页为逐月长稿预览中的${name}，共 ${bundle.source.articles.length} 篇：六个动爻各写十二个月。作者全文读回及古籍解释分歧见[核读记录](../../../${RECEIPT_DIR}/${s}.json)。`,
 `[返回预览目录](README.md) · [查看原版作对照](../${s}.md)`,
 `应期日期以 ${DEMO_DATE} 为演示基准，实际使用按起卦日换算。本页的“本轮”只指本轮面试。`];
 for(const a of bundle.source.articles) {
  const r=readingFor(ctx,id,a),row=rowFor(bundle,a),timing=resolveTiming(r,a);
  const timingReason=typeof a.timing==='string'?a.timing:a.timing.map(s=>s[4]).join(' ');
  const effects=row.decision.indirectEffectsApplied||[];
  // Collate this quotation for the monthly reading page without changing chart facts.
  const xiaoguoFourth=id===62&&a.movingLine===4;
  const inheritedLine='无咎，弗过遇之；往厉必戒，勿用，永贞。';
  const collatedLine='无咎，弗过遇之；往厉必戒，勿用永贞。';
  if(xiaoguoFourth&&![inheritedLine,collatedLine].includes(r.selectedMovingLine.text))
   throw new Error('Unexpected wording for hex-62-line-4; recheck the punctuation witness');
  const displayedLine=xiaoguoFourth?collatedLine:r.selectedMovingLine.text;
  out.push(`## ${r.selectedMovingLine.label}动 · ${a.monthBranch}月`,a.title,Object.values(r.stages).map(s=>s.name).join(' → '),...a.paragraphs,
   '### 应期参考',...(timing.slots.length?['以下为传统推算的参考窗口。']:[]),...timing.paragraphs,
   '<details>\n<summary>卦理与出处</summary>',
   `判断：本轮面试${a.outcome==='favourable'?'能通过':'不能通过'}。`+r.edges.map(e=>{const n=r.nodes.find(n=>n.role===e.targetRole);return LABELS[n.role]+n.trigram+n.element+REL_LABELS[e.type];}).join('；')+'。',
   `旺衰：${a.monthBranch}月，`+r.nodes.filter(n=>n.role!=='body_inherited').map(n=>LABELS[n.role]+n.trigram+n.element+n.strength.state).join('；')+'。',
   ...(effects.length?['间接作用：按本库所取的一层作用解释，'+effects.map(e=>{const n=r.nodes.find(n=>n.role===e.role);return LABELS[e.role]+n.trigram+n.element+'：'+e.label;}).join('；')+'。上列月令五态保持原值，不作连环累计。']:[]),
   `爻辞：${r.selectedMovingLine.label}「${displayedLine}」；象曰「${r.selectedMovingLine.image}」。`,
   ...(xiaoguoFourth?['句读依据：本页依[《周易正义·小过》](https://zh.wikisource.org/zh-hans/周易正義/06小過)及程、朱注连读“勿用永贞”。王孔重免咎而不足长行其正，程传重随时之宜，不可固守。']:[]),
   '专业说明：'+a.judgment,
   ...(a.judgmentCorrection?['说明订正：'+a.judgmentCorrection.reason+' 原文、新文及来源保存在作者源的 judgmentCorrection 中；本次未改变结论或取期结构。']:[]),
   '取期依据：'+timingReason,
   '条文对照：以下保留相关判读原文，供核对条件；并非每条都适用于本盘。具体采用、反证与尚待复核的权重，见上方专业说明及本卦核读记录。',
   row.decision.sourceEvidence.map(s=>`- 《梅花易数·${s.title}》：“${s.quote}”`).join('\n'),
   `稿件键：\`${QUESTION_ID}/${id}/${a.movingLine}/${a.monthBranch}/${a.outcome}\`。作者源：[${s}.json](../../../${SOURCE_DIR}/${s}.json)。`,
   '</details>','<details>\n<summary>简断摘要</summary>',a.short,'</details>');
 }
 return out.join('\n\n')+'\n';
}
