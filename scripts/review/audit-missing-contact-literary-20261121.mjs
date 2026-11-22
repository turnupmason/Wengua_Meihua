import {readFile,writeFile} from 'node:fs/promises';
import {CONTACT_LITERARY_CAMPAIGN,inspectContactLiteraryBatch} from './check-missing-contact-literary-20261121.mjs';

const root=new URL('../../',import.meta.url);
const json=async path=>JSON.parse(await readFile(new URL(path,root),'utf8'));
const index=await json('data/authored-readings/missing-contact/index.json');
const catalog=await json('data/catalog.json');
const byBits=new Map(catalog.hexagrams.map(h=>[h.bitsBottomUp.join(''),h]));
// Keep explicit three-bit keys: these facts are reconstructed independently of
// createContextualReading and the manuscript build's relation/strength helpers.
const names={'111':'乾','110':'兑','101':'离','100':'震','011':'巽','010':'坎','001':'艮','000':'坤'};
const elements={乾:'金',兑:'金',离:'火',震:'木',巽:'木',坎:'水',艮:'土',坤:'土'};
const generates={木:'火',火:'土',土:'金',金:'水',水:'木'};
const controls={木:'土',土:'水',水:'火',火:'金',金:'木'};
const states={
 'spring-wood':{木:'旺',火:'相',水:'休',金:'囚',土:'死'},
 'summer-fire':{火:'旺',土:'相',木:'休',水:'囚',金:'死'},
 'autumn-metal':{金:'旺',水:'相',土:'休',火:'囚',木:'死'},
 'winter-water':{水:'旺',木:'相',金:'休',土:'囚',火:'死'},
 'seasonal-earth':{土:'旺',金:'相',火:'休',木:'囚',水:'死'},
};
const relation=(body,other)=>body===other?'equal':generates[body]===other?'body_generates_use':
 generates[other]===body?'use_generates_body':controls[body]===other?'body_controls_use':'use_controls_body';
const issues=[],batches=[],openingMap=new Map();
let articles=0,monthKeys=0,nodeChecks=0,relationChecks=0,stageChecks=0,copyChecks=0,polished=0,polishedKeys=0;
for(const file of index.files){
 const id=file.primaryId,stem='hex-'+String(id).padStart(3,'0')+'.json';
 const source='sources/editorial/missing-contact/';
 const drafts=await json(source+stem),authorReview=await json(source+'reviews/'+stem),shard=await json(file.path);
 const literary=await inspectContactLiteraryBatch({root,primaryId:id,drafts,authorReview});
 const hex=catalog.hexagrams.find(h=>h.id===id);
 if(literary)batches.push({primaryId:id,name:hex.name,articles:30,monthKeys:72,...literary.bodyHan,receiptPath:literary.receiptPath});
 for(const [i,row]of shard.rows.entries()){
  const label=stem+'/'+row.movingLine+'/'+row.monthOrder;
  const check=(condition,what)=>{if(!condition)issues.push({key:label,what});};
  const bits=hex.bitsBottomUp,lower=bits.slice(0,3),upper=bits.slice(3,6);
  const lowerMutual=bits.slice(1,4),upperMutual=bits.slice(2,5),changed=[...bits];
  changed[row.movingLine-1]=1-changed[row.movingLine-1];
  const bodyIsUpper=row.movingLine<=3;
  const expected={
   body:names[(bodyIsUpper?upper:lower).join('')],
   use:names[(bodyIsUpper?lower:upper).join('')],
   body_mutual:names[(bodyIsUpper?upperMutual:lowerMutual).join('')],
   use_mutual:names[(bodyIsUpper?lowerMutual:upperMutual).join('')],
   changed_use:names[(bodyIsUpper?changed.slice(0,3):changed.slice(3,6)).join('')],
  };
  for(const [role,name]of Object.entries(expected)){
   const n=row.facts.nodes.find(n=>n.role===role);
   check(n?.trigram===name&&n?.element===elements[name]&&n?.qi===states[row.monthOrder][elements[name]],'node '+role);
   nodeChecks++;
  }
  for(const role of ['use','body_mutual','use_mutual','changed_use']){
   check(row.facts.directRelations.find(e=>e.role===role)?.type===relation(elements[expected.body],elements[expected[role]]),'relation '+role);
   relationChecks++;
  }
  const stages=[id,byBits.get([...lowerMutual,...upperMutual].join(''))?.id,byBits.get(changed.join(''))?.id];
  check(JSON.stringify(row.stageIds)===JSON.stringify(stages),'primary-mutual-changed');stageChecks++;
  const draft=drafts[i];
  check(row.movingLine===draft[0]&&row.monthOrder===draft[1]&&row.decision.outcomeCode===draft[2],'source identity/outcome');
  const long=row.copy.long;
  check(JSON.stringify([row.copy.title,row.copy.short.text,long.opening,long.process,long.ending,long.summary])===JSON.stringify(draft.slice(3,9)),'source-to-app complete copy');copyChecks++;
  for(const branch of row.monthBranches)check(shard.monthSlots[row.movingLine+':'+branch]===i,'month mapping '+branch);
  if(literary){
   check(row.authorship.literaryPolish?.copySha256===literary.bindings[i].copySha256,'published review binding');
   for(const [field,column]of [['short',4],['opening',5]]){
    const prefix=draft[column].replace(/[^\p{Letter}\p{Number}]/gu,'').slice(0,8);
    const key=field+':'+prefix;
    if(!openingMap.has(key))openingMap.set(key,{field,prefix,articles:[]});
    openingMap.get(key).articles.push(label);
   }
   polished++;polishedKeys+=row.monthBranches.length;
  }
  articles++;monthKeys+=row.monthBranches.length;
 }
 const doc=await readFile(new URL('docs/missing-contact/'+stem.replace('.json','.md'),root),'utf8');
 for(const [i,draft]of drafts.entries())for(const text of draft.slice(3,9)){
  if(!doc.includes(text))issues.push({key:stem+'/'+i,what:'complete copy absent from reading document'});
 }
}
if(polished!==index.literaryPolish.completed||polishedKeys!==index.literaryPolish.monthKeyCount||articles-polished!==index.literaryPolish.remaining)
 issues.push({key:'index',what:'literary progress does not match verified receipts'});
const repeatedOpeningCandidates=[...openingMap.values()].filter(item=>item.articles.length>=4);
const report={campaign:CONTACT_LITERARY_CAMPAIGN.id,baselineCommit:CONTACT_LITERARY_CAMPAIGN.baselineCommit,
 status:issues.length?'fail':'pass',articles,monthKeys,polished,polishedMonthKeys:polishedKeys,remaining:articles-polished,
 checks:{independentlyReconstructedNodes:nodeChecks,independentlyReconstructedRelations:relationChecks,
  independentlyReconstructedStages:stageChecks,sourceToApplicationCopy:copyChecks,
  reviewedRowsBoundToOriginalOutcomesAndCompleteTiming:polished,distinctAuthorAndPeerFullReadReports:batches.length},
 batches,repeatedOpeningCandidates,issues,limitations:['机器只核对所列事实与最终版本绑定，不能代替全文审读。','开头重复扫描只提供复读线索，不能单独认定文风质量。','传统规则内部一致不代表现实预测效度。','未完成精修的原稿和既有专业适用分歧仍保留。']};
await writeFile(new URL('docs/missing-contact/LITERARY_CHECKS_20261121.json',root),JSON.stringify(report,null,2)+'\n');
if(issues.length)throw new Error(JSON.stringify(issues.slice(0,15),null,2));
const lines=[
 '# 失联寻人长版精修与规则审计（2026-11-21）','',
 `本轮实际完成 **${polished} / ${articles} 篇**，覆盖 ${polishedKeys} 个月令键，尚余 ${articles-polished} 篇。原有全部 ${articles} 篇、${monthKeys} 键的基础覆盖与本轮长版精修分别统计。`,'',
 '参考稿为用户指定 [面试逐月稿](https://github.com/turnupmason/Wengua_Meihua/tree/editorial/interview-preview-216-20261118/docs/interview-pass/monthly-preview) 和 [main 关系确定逐月稿](../relationship-establishment/monthly-preview/README.md)。本轮按开局、过程、结局、总断四段统计汉字，简断、应期、原典引文和审计不计入厚度。每篇至少470字、整卦中位数至少500字；字数达标不能替代文笔与论证审读。','',
 '| 已发布卦 | 正文／月令键 | 四段汉字范围 | 中位数 | 第二读者逐篇记录 |','| --- | ---: | ---: | ---: | --- |',
 ...batches.map(b=>`| [${b.name}](hex-${String(b.primaryId).padStart(3,'0')}.md) | ${b.articles}／${b.monthKeys} | ${b.minimum}–${b.maximum} | ${b.median} | [全文复核](../../${b.receiptPath}) |`),'',
 '## 本轮写作与审读','',
 '各篇按真实本用、体互、用互、变用和该组月令重新展开。正文说明哪一项帮助可以使用、哪一处阻力仍未解决，以及爻辞中的吉意、戒意为何能同时成立；开头随各篇关键处变化。不得用模板换词、重复建议或额外附录凑正文长度。','',
 '第一批交叉审读另发现：坤、屯各有28条旧简断仍以“这次”起头，虽然长文已经重新组织，简断也必须同步重写。本轮将这些简断逐篇改写，并重读与详断的结论关系；不是只轮换“这次／本次”等起首词。','',
 '作者写定后实际逐篇读回，再由不同的AI读者阅读全文并留下具体意见。作者回执、第二读者报告均绑定最终稿。哈希校验程序不生成阅读意见，也不代签审读。两位读者均不是人类专家；原有独立专业断法、应期审核及用户逐篇认可状态没有随文学精修自动升级。','',
 '## 规则核验与具体修订','',
 '本问只判断与指定失联者恢复可确认双向联系的传统倾向。本人回复、别人答应转达、渠道核实和未经确认的消息各自区分；不把恢复通信写成同意见面、回家或恢复关系。体用五态只用于本问条件，不推人物所在地点、安危、生死与心理。','',
 '《梅花易数》[卷二·人事占、求谋占](https://zh.wikisource.org/wiki/梅花易數/卷二#求謀占第八)为明确现代事项类推提供体用通则；[卷三·体用互变之诀、体用衰旺之诀](https://zh.wikisource.org/wiki/梅花易數/卷三#體用互變之訣)用于阶段主次与月令轻重。恢复通信并非古籍原有专章，不转用《行人占》的归期和在外处境。','',
 '乾初九、九四不因体克用便径断能成，要解释勿用、或跃与各月体力差异；九二、九五完整保留利见的正面作用，同时交代末克无生的原取舍；九三无咎仍有勤惕条件，上九有悔不转换成他人心理。弱克仍保留作用方向，普通休态不与囚、死混用。','',
 '坤六三将“无成有终”的功成不自居与最终完成之义讲清，不能只摘无成作失败；六四谨慎与无誉同时保留，不能把无誉读成一定没有回复；六五元吉解释中顺条件，上六保留旺比和正证及戒争限制。','',
 '屯初九保留磐桓、居贞、建侯的完整脉络，六二不将婚媾与十年直接写成失联动机或日期。另修正 cases 中上六春、冬两组的一处旧问题描述：正文及既有作者修订已取 conditional，issue 却仍写取偏难。本轮仅将该说明与原采用的“有助可济、存在正当可回查渠道”对齐，结果不变，独立适用分歧继续 pending。','',
 '原稿全部结果档位及完整应期逐字段对照保存；不取期原因也保持完整。原典不同取权、现代适用与应期解释的既存疑点，继续见各卦 cases 与作者第十栏，未通过文笔润色宣称解决。','',
 '卷三在线转录存在“内外并也生体”的异文，本轮没有据此覆写库内“内外并无生体”；原典校勘与现代解释分开处理。','',
 '整库构建另定位到后续9卦16段旧注疏引文与当前共享参考文本不一致，其中12段涉及字句、4段仅是末尾空白。已逐段同步并保留旧引文，相关9卦共270篇原有短稿另作实际全文读回，不计入本轮长版完成数。中孚与既济的4篇旧稿还修正了把“已经得到本人回复”用作“有机会恢复联系”前提的循环表达，保持原档位和完整应期。详见[引文与局部判断复核](CITATION_RECHECK_20261121.md)。','',
 '## 原稿与检查记录','',
 `每批原稿、cases和旧作者回执保存在 [literary-baseline-20261121](../../sources/editorial/missing-contact/literary-baseline-20261121)，均来自提交 ${CONTACT_LITERARY_CAMPAIGN.baselineCommit}。本轮[作者记录](../../sources/editorial/missing-contact/reviews)与[第二读者记录](../../sources/editorial/missing-contact/literary-reviews)逐篇保留，不覆盖基线档案。`,'',
 `本轮[机器检查](LITERARY_CHECKS_20261121.json)独立从六爻位重算 ${stageChecks} 组本互变、${nodeChecks} 个体用月令节点及 ${relationChecks} 项直接生克；对照 ${copyChecks} 篇作者源与应用完整正文，以及阅读页和月令映射。已精修 ${polished} 篇另外核对最终作者与第二读者版本、原结果、完整应期与正文厚度。检查通过只表示这些具体对照一致。`,'',
 '重现命令：`node scripts/build-promotion-pay.mjs missing-contact`；`node scripts/review/audit-missing-contact-literary-20261121.mjs`；`node --test tests/missing-contact.test.mjs`。应用导出沿用 `npm run build:missing-contact`。','',
];
await writeFile(new URL('docs/missing-contact/LITERARY_AUDIT_20261121.md',root),lines.join('\n'));
console.log({status:report.status,polished,remaining:report.remaining,monthKeys:polishedKeys,issues:issues.length,batches:batches.length});
