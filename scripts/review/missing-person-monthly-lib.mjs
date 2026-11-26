// 失联寻人独立预览：只计算、检查和排版已写定的文章，不生成正文或签署阅读回执。
import {readFile,readdir} from 'node:fs/promises';
import {loadLibrary} from '../../src/index.js';
import {createContextualReading,promotionTimingSlots} from '../../src/interview-manuscripts.js';
import {resolveManuscriptDates} from '../../src/prewritten-manuscripts.js';
export {MONTHS,QI,stem,sha256,han,normalize,stripQuotes,independentFacts} from './monthly-lib.mjs';

export const SCOPE='missing-person-search-preview-1.0.0';
export const QUESTION_ID='search.missing-contact.locate-preview';
export const SOURCE_DIR='sources/editorial/missing-contact/monthly';
export const REVIEW_DIR='sources/editorial/missing-contact/reviews-monthly';
export const SECOND_REVIEW_DIR='sources/editorial/missing-contact/second-reviews-monthly';
export const DOC_DIR='docs/missing-contact/monthly-preview';
export const DEMO_DATE='2026-11-21';
export const LABELS={body:'体卦',use:'本用',body_mutual:'体互',use_mutual:'用互',changed_use:'变用'};
export const REL_LABELS={equal:'与体比和',body_controls_use:'受体所克',use_controls_body:'克体',use_generates_body:'生体',body_generates_use:'受体所生'};
export const DIRECTIONS={乾:'西北',坤:'西南',震:'东方',巽:'东南',坎:'北方',离:'南方',艮:'东北',兑:'西方'};
export const VERDICTS={favourable:'寻获的传统支持较充分',conditional:'尚有寻获机会，须满足正文中的条件',difficult:'此次寻获困难'};
export const SOURCE_REFS={
 'ZY-SUI17-BENYI-COMPARISON':{title:'朱熹《周易本义》卷一·随上六（对读）',url:'../../../sources/reference/zhouyi-benyi/周易本義__四庫全書本__卷1.txt',scope:'升六四本义指义见随卦，于此核随上六的西山、祭享之解释。'},
 'YC-SHENG46':{title:'程颐《伊川易传》卷三·升卦',url:'../../../sources/reference/yichuan-yizhuan/伊川易傳__四庫全書本__卷3.txt',scope:'升六四止其所、顺上而进贤与王业之亨，依程传本释。'},
 'ZY-SHI7-3-COMPARISON':{title:'《周易正义》师卦六三（对读）',url:'../../../sources/reference/zhouyi-zhengyi-hans/02師.txt',scope:'升九三变师，辨别本卦实动爻与师卦同位之辞，师六三不作本盘的第二条动爻。'},
 'ZY-CUI45-2-COMPARISON':{title:'《周易正义》萃卦六二（对读）',url:'https://zh.wikisource.org/wiki/周易正義/05萃',scope:'升九二与萃六二共有孚乃利用禴之辞，两爻各依本卦动爻、体用和月令判断。'},
 'ZY-KUN47-2-COMPARISON':{title:'《周易正义》困卦九二（对读）',url:'https://zh.wikisource.org/wiki/周易正義/05困',scope:'萃六二变困时，仅对读两卦各自的祭礼文字，动爻仍为萃六二。'},
 'ZY-BENYI-2':{title:'朱熹《周易本义》卷二',url:'../../../sources/reference/zhouyi-benyi/周易本義__四庫全書本__卷2.txt',scope:'下经动爻的朱熹本义，与王弼注、孔颖达疏分别使用。'},
 'YC-2':{title:'程颐《伊川易传》卷二',url:'https://zh.wikisource.org/w/index.php?oldid=11131282&variant=zh-hans',scope:'程颐逐爻解释，与王弼注及孔颖达疏对读。'},
 'MH-XINGREN':{title:'《梅花易数》卷二·行人占第十三',url:'https://zh.wikisource.org/wiki/梅花易數/卷二#行人占第十三',scope:'体为主，用为行人；归来与在外处境分开论。向现代失联寻获迁移的部分见本目录政策。'},
 'MH-YEJIAN':{title:'《梅花易数》卷二·谒见占第十四',url:'https://zh.wikisource.org/wiki/梅花易數/卷二#謁見占第十四',scope:'是否得见与体用生克；不把求见原句直接当作失踪调查的已证实结果。'},
 'MH-QIUMOU':{title:'《梅花易数》卷二·求谋占第八',url:'https://zh.wikisource.org/wiki/梅花易數/卷二#求謀占第八',scope:'所谋之事的成否、迟速，辅助说明寻找过程。'},
 'MH-TIYONG':{title:'《梅花易数》卷三·体用互变之诀、占卦诀',url:'https://zh.wikisource.org/wiki/梅花易數/卷三',scope:'本用、两互、变用的阶段与生克，始终沿用原体。'},
 'MH-QI':{title:'《梅花易数》卷三·体用衰旺之诀',url:'https://zh.wikisource.org/wiki/梅花易數/卷三',scope:'旺衰决定作用轻重；项目五态细化与同表核对见规则页，不声称原文列出全套五态表。'},
 'MH-XIANG':{title:'《梅花易数》卷一·八卦万物属类',url:'https://zh.wikisource.org/wiki/梅花易數/卷一#八卦萬物屬類',scope:'本用方位及地理屋舍类象。用于人员方位是明示的编辑迁移，不是原书失物变卦定位法。'},
 'MH-YINGQI':{title:'《梅花易数》卷三·占卜克应之诀、占卜十应诀之日应',url:'https://zh.wikisource.org/wiki/梅花易數/卷三',scope:'克应先定事件与远近尺度；日应原论本日，未来阶段窗口为本项目明示迁移，候选日期不保证寻获或联系。'},
};
const PROFILE=Object.freeze({namedStageEvents:true,questionId:QUESTION_ID,questionType:'missing_person_search_preview'});
export const readJSON=async path=>JSON.parse(await readFile(path,'utf8'));
export async function listIds(){try{return (await readdir(SOURCE_DIR)).filter(f=>/^hex-\d{3}\.json$/.test(f)).map(f=>Number(f.slice(4,7))).sort((a,b)=>a-b);}catch(e){if(e.code==='ENOENT')return [];throw e;}}
export async function context(){
 const [library,zhengyiTitles]=await Promise.all([loadLibrary(),readJSON('sources/reference/zhouyi-zhengyi/_titles.json')]);
 return {library,zhengyiTitles};
}
export function readingFor(ctx,id,article,date=DEMO_DATE){
 return createContextualReading({library:ctx.library,question:{id:QUESTION_ID,mode:'narrative',question_type:'missing_person_search_preview',question:'失联的人能否寻得，有哪些寻找线索？',sourceDomainIds:['domain-13','domain-14','domain-08']},primaryId:id,movingLine:article.movingLine,monthBranch:article.monthBranch,castingDate:date,applyVoid:false});
}
export function resolveTiming(reading,article,date=DEMO_DATE,viewDate=date){
 if(typeof article.timing==='string')return {slots:[],paragraphs:[article.timing],dateMatches:[],status:'not-derived'};
 const slots=promotionTimingSlots(reading,article.timing,article.outcome,PROFILE).map(s=>({...s,suffix:`前后，${s.event}，属${s.valence}应。${s.text}`,calculationBasis:{...s.calculationBasis,interpretationReview:'editorial-preview',independentInterpretationReview:'pending',scopeVersion:SCOPE}}));
 return {slots,...resolveManuscriptDates({paragraphs:slots.map(s=>s.token),dateSlots:slots,reading,castingDate:date,viewDate,timingScale:'day',timingContext:{castingMethod:'pre-heaven',periodMethod:'element-qi'}})};
}
export function referencesFor(ctx,id,a,supplements={}){
 const extra=supplements[`${a.movingLine}/${a.monthBranch}`]??[];
 return [...new Set([...a.sourceRefs,...extra])].flatMap(key=>{
  if(SOURCE_REFS[key])return {key,...SOURCE_REFS[key]};
  const match=/^ZY-(\d+)-(\d+)$/.exec(key);
  if(!match||Number(match[1])!==id||Number(match[2])!==a.movingLine)throw new Error('Invalid source reference '+key);
  const h=ctx.library.getHexagram(id),line=h.lines[a.movingLine-1];
  const canonicalName=new URL(h.referenceUrl).searchParams.get('title')?.split('/').at(-1);
  const volume=id<=4?1:id<=16?2:id<=30?3:id<=42?4:id<=54?5:6;
  // The base text uses 无妄 in its URL; the verified commentary index uses 無妄.
  const commentaryName=canonicalName==='无妄'?'無妄':canonicalName;
  const commentaryTitle=`周易正義/0${volume}${commentaryName}`;
  if(!ctx.zhengyiTitles.includes(commentaryTitle))throw new Error('Missing verified commentary title '+commentaryTitle);
  return [{key,title:`《周易》${h.shortName}·${line.label}`,url:line.referenceUrl,scope:'本卦真实动爻、完整爻辞及小象。'},
   {key:key+'-ZHENGYI',title:`《周易正义》${h.shortName}卦注疏`,url:'https://zh.wikisource.org/wiki/'+commentaryTitle,scope:'王弼注与孔颖达疏分别标明，不将现代寻找解释冒作原注。'}];
 });
}
export function renderHex(ctx,source){
 const id=source.primaryId,s=`hex-${String(id).padStart(3,'0')}`,name=ctx.library.getHexagram(id).name;
 const out=[`# ${id} · ${name}：失联寻人，六动爻与十二月令`,
 `本页有 ${source.articles.length} 篇独立逐月长稿。所问为人找不到了：能否寻得、可核对的方位、处境与安危倾向、可能的失联原因，以及消息或寻找进展的应期。`,
 '[返回目录](README.md) · [寻人规则与出处](POLICY.md) · [分批审计](AUDIT.md)',
 `方位、安危与原因均为传统类象推断，现实情况尚须核实。应期统一以 **${DEMO_DATE}** 演示候选日期；实际使用须按本次起卦当地日期重算，候选日不是保证日期。异常失联或有现实危险迹象时，应及时寻求当地警方或紧急服务帮助，不等待候选日。`];
 for(const a of source.articles){
  const r=readingFor(ctx,id,a),timing=resolveTiming(r,a),line=r.selectedMovingLine;
  out.push(`## ${line.label}动 · ${a.monthBranch}月`,a.title,Object.values(r.stages).map(x=>x.name).join(' → '),...a.paragraphs,
   '### 方位与寻找线索',a.placeHint,'### 处境与安危倾向',a.circumstanceHint,'### 失联原因参考',a.reasonHint,
   '### 应期参考',...(timing.slots.length?['以下为传统推算的参考窗口。仅在已有可继续核查的现实渠道时观察对应事件；没有新的事实，也不因此推定找到人。']:[]),...timing.paragraphs,
   '<details>\n<summary>卦理与出处</summary>',`传统判断：${VERDICTS[a.outcome]}。`,
   '取用：体为寻找与核实一方，本用为所寻的失联者；其余节点说明过程与收尾。'+r.edges.map(e=>{const n=r.nodes.find(n=>n.role===e.targetRole);return `${LABELS[n.role]}${n.trigram}${n.element}${REL_LABELS[e.type]}`;}).join('；')+'。',
   `旺衰：${a.monthBranch}月，`+r.nodes.filter(n=>n.role!=='body_inherited').map(n=>`${LABELS[n.role]}${n.trigram}${n.element}${n.strength.state}`).join('；')+'。',
   `爻辞：${line.label}「${line.text.replace(/。$/u,'')}」；象曰「${line.image.replace(/。$/u,'')}」。`,
   '专业说明：'+a.judgment.replace(/\b(favourable|conditional|difficult)\b/g,code=>'「'+VERDICTS[code]+'」'),
   '取期依据：'+(typeof a.timing==='string'?a.timing:a.timing.map(t=>t[4]).join(' ')),
   '出处：'+referencesFor(ctx,id,a,source.supplementalSourceRefs).map(ref=>`[${ref.title}](${ref.url})`).join('；')+'。各出处的适用范围与现代迁移说明见[规则页](POLICY.md)。',
   `稿件键：\`${QUESTION_ID}/${id}/${a.movingLine}/${a.monthBranch}/${a.outcome}\`。作者源：[${s}.json](../../../${SOURCE_DIR}/${s}.json)。`,
   '首轮编辑全文核读与第二读者的实际范围见目录及审计。机器复算不代表现实预测验证，也不等于用户逐篇验收。',
   '</details>','<details>\n<summary>简断摘要</summary>',a.short,'</details>');
 }
 return out.join('\n\n')+'\n';
}
