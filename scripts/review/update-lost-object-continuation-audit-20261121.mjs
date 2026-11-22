// Summarize actual completed records; never create reader attestations or findings.
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {loadLibrary} from '../../src/index.js';
const ROOT=new URL('../../',import.meta.url),SOURCE='sources/editorial/lost-object-recovery',REVIEW=SOURCE+'/reviews-depth-continuation-20261121';
const json=async p=>JSON.parse(await readFile(new URL(p,ROOT),'utf8'));
const han=s=>(s.match(/\p{Script=Han}/gu)??[]).length;
const hash=s=>createHash('sha256').update(s).digest('hex');
const names=(await readdir(new URL(REVIEW,ROOT))).filter(x=>/^hex-\d{3}\.json$/.test(x)).sort();
const library=await loadLibrary();
const titleFor=id=>library.getHexagram(id).name;
const batches=[],questions=[],lengths=[],beforeLengths=[],shorts=[],shortOpenings=new Map();
for(const filename of names){
 const review=await json(REVIEW+'/'+filename),primaryId=review.primaryId;
 const raw=await readFile(new URL(SOURCE+'/'+filename,ROOT),'utf8');
 if(review.sourceSha256!==hash(raw))throw Error('Stale review '+filename);
 const rows=JSON.parse(raw),baseline=await json(REVIEW+'/baselines/'+filename);
 const range=rows.map(r=>han(r.slice(5,9).join(''))),before=baseline.map(r=>han(r.slice(5,9).join('')));
 lengths.push(...range);beforeLengths.push(...before);shorts.push(...rows.map(r=>han(r[4])));
 const rowQuestions=[];
 for(const entry of review.entries){
  if(!entry.authorFullRead||!entry.peerFullRead)throw Error('Incomplete double read '+filename+'/'+entry.rowIndex);
  const q={primaryId,rowIndex:entry.rowIndex,movingLine:entry.movingLine,monthOrder:entry.monthOrder,outcome:entry.outcome,title:rows[entry.rowIndex][3],author:entry.authorOpenQuestions??[],peer:entry.peerOpenQuestions??[]};
  if(q.author.length||q.peer.length){questions.push(q);rowQuestions.push(q);}
  const first=rows[entry.rowIndex][4].split(/[。！？]/u)[0];
  if(!shortOpenings.has(first))shortOpenings.set(first,[]);
  shortOpenings.get(first).push([primaryId,entry.rowIndex]);
 }
 batches.push({primaryId,filename,name:titleFor(primaryId)??String(primaryId),articles:rows.length,monthKeys:72,bodyMin:Math.min(...range),bodyMax:Math.max(...range),questionArticles:rowQuestions.length,authorAgent:review.authorAgent,peerAgent:review.peerAgent});
}
const count=batches.length*30,keys=batches.length*72;
const report={campaign:'lost-object-depth-continuation-20261121',targetArticles:1020,completedArticles:count,completedMonthKeys:keys,remainingArticles:1020-count,hexagrams:batches,
 bodyHanRange:count?[Math.min(...lengths),Math.max(...lengths)]:null,baselineBodyHanRange:count?[Math.min(...beforeLengths),Math.max(...beforeLengths)]:null,shortHanRange:count?[Math.min(...shorts),Math.max(...shorts)]:null,
 openQuestionArticles:questions.length,authorOpinionCount:questions.reduce((s,q)=>s+q.author.length,0),peerOpinionCount:questions.reduce((s,q)=>s+q.peer.length,0),
 repeatedShortOpeningCandidates:[...shortOpenings].filter(([text,rows])=>rows.length>1).map(([text,rows])=>({text,rows})),
 literaryReview:'two-actual-ai-readers-per-final-row',humanProfessionalReview:'pending',userAcceptedThisVersion:false};
await writeFile(new URL('docs/lost-object-recovery/DEPTH_CONTINUATION_PROGRESS_20261121.json',ROOT),JSON.stringify(report,null,2)+'\n');
const lines=[
 '# 失物篇第004—037卦：正文补深与逐批审计','',
 '本轮接续已经完成的乾、坤、屯90篇补深。基线为 main 的 `e46eebc1b4b48ebbb7bdb7788e2ab2606abf7e71`。第004—037卦共1,020篇原稿的四段正文均不足450汉字，范围为157—277字；简断、方位、形色和应期不计入正文厚度。','',
 '文风对照采用用户指定的面试分支 `editorial/interview-preview-216-20261118`（核对到 `d3e942d8910ee8150fe43e45a1923f87548c4a1c`）与main确定关系逐月长稿。保留自然、有依据、能解释取舍的写法；失物继续使用自己的直接关系口径，不挪入范文的间接生克规则。','',
 '## 实际进度','',
 `已完成 **${count}／1,020篇**，对应${keys}个月令键；尚余${1020-count}篇。这些是既有1,920篇中的再次精修，不新增总篇数，也不与001—003的90篇或038—064的810篇重复计算。`,'',
 '| 卦 | 完整正文 | 四段汉字数 | 保留取权问题的篇数 | 本轮双读记录 |','| --- | ---: | ---: | ---: | --- |',
 ...batches.map(b=>`| [${String(b.primaryId).padStart(3,'0')} ${b.name}](${b.filename.replace('.json','.md')}) | 30篇／72键 | ${b.bodyMin}—${b.bodyMax} | ${b.questionArticles} | [最终版本](../../${REVIEW}/${b.filename}) |`),'',
 '## 正文与规则如何分别处理','',
 '每篇依次完整读原稿、写定新文、合并方向及形色附文读回，再交另一位AI逐篇审读。标题、简断与四段正文重新组织；语气和开头按各篇重点展开。古爻义保留其有利与限制条件，不能为配合原结果只摘一个吉凶字。','',
 '一个原体贯穿，本用、体互、用互、变用分别对原体。普通休态仍有常态作用，不直接称无气、力弱或薄助；克轻不等于没有克，主局有力也不等于末段可以省略。旧结果与完整应期逐字段锁定；若原判与相反证据之间仍有取权疑问，在本轮审计逐篇列出，正文不编造新规则替它背书。','',
 '找物时把获得消息、辨认确为原件、实际领回三件事讲清。原物特征与周围环境分角色使用；原爻中的郊、沙、泥、穴、寇、人数及期限，均不能直接指定真实地点、人物、盗窃或失而复得日期。现代建议须建立在实际使用、经手、可查记录等条件上。','',
 '## 原稿、回执与可复核记录','',
 `原稿保存在 [baselines](../../${REVIEW}/baselines)，旧文学回执按原字节保存在 [polish-history](../../${SOURCE}/polish-history/before-depth-continuation-20261121)。新的[作者报告](../../${REVIEW}/author-reports)与[第二读者报告](../../${REVIEW}/peer-reports)分别写定，最终回执核对两份报告原字节、六文案字段、整行十一字段和合并附文的摘要。`,'',
 '整合脚本只校验和合并两份已经存在的阅读报告，不生成意见，不把通过字数或摘要检查当成读过全文。修改某篇后，需要作者与第二读者重新读该篇最终全文，旧摘要不能自动改签。','',
 `本轮共有${questions.length}篇留有具体取权或用语问题；作者意见${report.authorOpinionCount}条、第二读者意见${report.peerOpinionCount}条。同一篇可以有多条意见，详见[逐篇问题](DEPTH_CONTINUATION_RULE_QUESTIONS_20261121.md)。这些记录保留分歧，不表示每条都是已确定的错误。`,'',
 '## 古籍核查范围','',
 '- [《梅花易数》卷二·失物占](https://zh.wikisource.org/wiki/梅花易數/卷二#失物占第十五)：失物与体用的基本关系；后半段另取变用的方位场所。','- [《梅花易数》卷三·体用互变与占卦诀](https://zh.wikisource.org/wiki/梅花易數/卷三#體用互變之訣)：原体、主次和阶段区别；日级事件不因把文字加长而新造。','- 每卦《周易正义》的经、王注、孔疏与小象在两份读者报告记录具体所读范围；既有参考源、方向和形色补充保持原版本。','',
 '蒙、需、讼特别核查：蒙初六明辨与解除疑滞、止于适当的处置；六四“实”的经注本义为阳爻，查找中的实证是现代类推。需初九只得守常无咎，九三仍留敬慎不败，九五保留需道亨通、可以宴乐的完整吉境，上六“三人”不指定现实人数。讼初六、六三的终吉完整保留，九二核对句读，九四交代先非理犯初、理屈后主动止争而吉，上九保留暂得难保之戒。','',
 ...(batches.some(b=>b.primaryId===7)?['师卦核查涵盖六爻经注疏。初六失律之下虽有功亦凶；九二居中任事、有功无咎与王三锡命的受赐成命一并说明；六三不借舆尸推现实伤亡；六四保留无应宜处、虽不能有获；六五兼顾有据而应与择任正反；上六功成论赏是古义时序，现代只类推如实交接查询成果。第17、27行完整不取期原文仍留休土弱说，正文已经按普通休态说明，术语差异另列而不声称已统一。','']:[]),
 '## 构建与检查','',
 '正文以作者JSON为源，统一渲染器重建阅读页与应用分片。批次检查核对原结果、完整应期、四段字数、开头和长句重复、两位读者的最终整行绑定，另用独立六爻算法复核本互变、体用、月令节点与直接生克。结果见[本轮检查](DEPTH_CONTINUATION_CHECKS_20261121.json)与[全库检查](POLISH_CHECKS_20261120.json)。另重建问项SQL及SQLite，沿用全量输出核对程序比较全部作者JSON、月令映射和数据库各表，见[SQL与SQLite一致性](DEPTH_CONTINUATION_SQLITE_20261121.json)；该程序仍保留原90篇与810篇的独立计数，本轮续写篇数与月令覆盖由本轮检查另行逐项核对。','',
 '机器通过只说明所列对照一致，文学判断以实际全文审读为准。两位审读者均为AI；独立真人专业审核和用户逐篇验收分别保留pending与false。这里没有实证准确率的认证。','',
];
await writeFile(new URL('docs/lost-object-recovery/DEPTH_CONTINUATION_AUDIT_20261121.md',ROOT),lines.join('\n'));
const qlines=['# 失物续写：逐篇保留的规则取舍','',`覆盖已完成${count}篇。以下${questions.length}篇有具体作者或第二读者意见；原结果和完整应期仍照原稿保存。`,''];
for(const q of questions){
 qlines.push(`## ${String(q.primaryId).padStart(3,'0')}／第${q.movingLine}爻／${q.monthOrder}（rowIndex ${q.rowIndex}）`,'',q.title,'',`原档位：${q.outcome}。`,'');
 for(const [label,list]of [['作者',q.author],['第二读者',q.peer]])for(const text of list)qlines.push(`- ${label}：${typeof text==='string'?text:JSON.stringify(text)}`);
 qlines.push('');
}
await writeFile(new URL('docs/lost-object-recovery/DEPTH_CONTINUATION_RULE_QUESTIONS_20261121.md',ROOT),qlines.join('\n'));
console.log({completed:count,remaining:1020-count,questionArticles:questions.length,bodyHanRange:report.bodyHanRange,repeatedShortOpeningCandidates:report.repeatedShortOpeningCandidates.length});
