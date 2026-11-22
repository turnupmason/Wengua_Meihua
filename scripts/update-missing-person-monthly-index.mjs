import {readFile,writeFile} from 'node:fs/promises';
import {SOURCE_DIR,REVIEW_DIR,SECOND_REVIEW_DIR,DOC_DIR,SCOPE,QUESTION_ID,DEMO_DATE,stem,sha256,han,listIds,context,renderHex} from './review/missing-person-monthly-lib.mjs';
import {auditMissingMonthly} from './review/check-missing-person-monthly.mjs';
const ctx=await context(),rows=[];
for(const id of await listIds()){
 const s=stem(id),raw=await readFile(`${SOURCE_DIR}/${s}.json`,'utf8'),source=JSON.parse(raw),digest=sha256(raw);
 let author,reader,doc;try{author=JSON.parse(await readFile(`${REVIEW_DIR}/${s}.json`,'utf8'));reader=JSON.parse(await readFile(`${SECOND_REVIEW_DIR}/${s}.json`,'utf8'));doc=await readFile(`${DOC_DIR}/${s}.md`,'utf8');}catch(e){if(e.code==='ENOENT')continue;throw e;}
 if(source.articles.length!==72||source.scopeVersion!==SCOPE||author.sourceSha256!==digest||reader.sourceSha256!==digest||author.wholeArticlesRead!==72||reader.wholeArticlesRead!==72||reader.status!=='second-read-complete'||doc!==renderHex(ctx,source))continue;
 const sizes=source.articles.map(a=>han(a.paragraphs.join(''))).sort((a,b)=>a-b);
 rows.push({primaryId:id,name:ctx.library.getHexagram(id).name,articles:72,bodyHanRange:[sizes[0],sizes.at(-1)],medianBodyHan:(sizes[35]+sizes[36])/2,sourceSha256:digest,authorRead:72,secondRead:72});
}
if(rows.length){
 const checked=await auditMissingMonthly({ids:rows.map(r=>r.primaryId),docs:true,requireSecond:true});
 if(checked.errors.length)throw new Error('Index cannot credit unverified articles: '+JSON.stringify(checked.errors.slice(0,10)));
}
const completed=rows.reduce((n,r)=>n+r.articles,0),missing=Array.from({length:64},(_,i)=>i+1).filter(id=>!rows.some(r=>r.primaryId===id));
const progress={schemaVersion:'1.0.0',scopeVersion:SCOPE,questionId:QUESTION_ID,plannedArticles:4608,completedArticles:completed,remainingArticles:4608-completed,completeHexagrams:rows.map(r=>r.primaryId),remainingHexagrams:missing,independentlyWrittenMonthlyArticles:completed,legacyFiveQiArticles:1920,legacyContactLongFormArticlesCountedInThisPreview:0,legacyCountsUsedAsNewProgress:false,rows,runtimeIntegrated:false,independentHumanReview:'pending',userIndividuallyAccepted:false,realWorldPredictionAccuracy:'not-validated'};
await writeFile(`${DOC_DIR}/progress.json`,JSON.stringify(progress,null,2)+'\n');
const out=['# 失联寻人：逐月长稿预览',
 '本目录按“人找不到了，怎样寻人”写作。每一篇先讲能否寻得及其依据，再列方位与寻找线索、处境与安危倾向、可能的失联原因和应期。正文参考用户指定的面试篇、确定关系篇自然长稿，六爻与十二月逐篇独立写定。',
 `**本轮已完成 ${completed} / 4,608 篇，${rows.length} / 64 卦；尚余 ${4608-completed} 篇。** 每卦是 72 篇独立月稿，首轮编辑与第二位 AI 读者的全文意见均绑定当前文件。旧库的 1,920 篇五气稿及其精修进度，不计入这次的新范围完成数。`,
 '[规则、古籍与范围](POLICY.md) · [逐批审计](AUDIT.md) · [机器检查](CHECKS.json) · [完成进度](progress.json) · [旧复联稿对照](../README.md)',
 '## 阅读目录',
 '| 卦 | 独立月稿 | 正文汉字范围 | 正文中位数 | 首轮编辑与第二读者 |',
 '| --- | ---: | ---: | ---: | --- |',
 ...rows.map(r=>`| [${String(r.primaryId).padStart(3,'0')} ${r.name}](${stem(r.primaryId)}.md) | ${r.articles} | ${r.bodyHanRange.join('–')} | ${r.medianBodyHan} | [首轮编辑](../../../${REVIEW_DIR}/${stem(r.primaryId)}.json) · [第二读者](../../../${SECOND_REVIEW_DIR}/${stem(r.primaryId)}.json) |`),
 '## 本轮的写作与判读',
 '正文采用完整自然段，不套同一种开头，不把方位、安危、原因、应期或引文算进主体厚度。正反证都保留：有生扶便说明其作用，有克制便解释轻重，不靠一个“吉”“凶”字代替全盘。相同五态的月份保持判断依据一致，文字仍逐月成篇。',
 '本用代表失联者，体代表寻找与核实一方。得到转述、收到本人回复、确认所在地、实际寻获与归家分别处理。方位是传统类象，安危与原因是传统推断，均不能充当已经核实的现实消息。',
 `应期以 **${DEMO_DATE}** 演示具体候选日期；月份是显式月令输入，并非声称十二个月都发生在该日。实际起卦须重新换算。不足以取日的篇目说明原因，不补造“确定联系日”。遇真实异常失联或即时危险迹象，及时寻求当地警方或紧急服务协助，不等待候选日。`,
 '## 来源与状态',
 '- 文风参考：[指定面试分支](https://github.com/turnupmason/Wengua_Meihua/tree/editorial/interview-preview-216-20261118/docs/interview-pass/monthly-preview)、[确定关系篇](../../relationship-establishment/monthly-preview/README.md)。',
 '- 原典主要采用《梅花易数》行人占、谒见占、求谋与体用互变、卷一地理屋舍类象，动爻核《周易》及王弼注、孔颖达疏。直接出处列在各篇折叠说明与规则页。',
 '- 这是 GitHub 阅读预览，尚未切换正式应用的旧复联数据。两位 AI 的全文检查与机器复算均有实际记录；独立真人专业审核、现实预测效度及用户逐篇认可仍分别待完成。',
 `下一待完成卦：${missing.length?`${missing[0]} · ${ctx.library.getHexagram(missing[0]).name}`:'全部完成'}。`];
await writeFile(`${DOC_DIR}/README.md`,out.join('\n\n').replace(/\|\n\n\|/g,'|\n|')+'\n');
console.log(JSON.stringify({completedArticles:completed,remainingArticles:4608-completed,hexagrams:rows.map(r=>r.primaryId)}));
