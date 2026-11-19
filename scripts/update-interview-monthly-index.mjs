// Publish-index maintenance only: never writes prose or signs an author's readback.
import {readFile,writeFile} from 'node:fs/promises';
import {auditMonthly} from './review/check-interview-monthly.mjs';
import {SOURCE_DIR,RECEIPT_DIR,DOC_DIR,stem} from './review/interview-monthly-lib.mjs';

const args=process.argv.slice(2),get=flag=>args.includes(flag)?args[args.indexOf(flag)+1]:null;
if(!get('--hex')||!get('--added'))throw new Error('Explicit --hex completed-list and --added newly-published-list required');
const ids=get('--hex').split(',').map(Number).sort((a,b)=>a-b),added=get('--added').split(',').map(Number);
if(new Set(ids).size!==ids.length||added.some(id=>!ids.includes(id)))throw new Error('Duplicate IDs or added hexagram absent from completed list');
const report=await auditMonthly({ids,docs:true});
if(report.errors.length)throw new Error(JSON.stringify(report.errors.slice(0,20)));
const old=JSON.parse(await readFile(`${DOC_DIR}/manifest.json`,'utf8'));
const receipts=await Promise.all(ids.map(id=>readFile(`${RECEIPT_DIR}/${stem(id)}.json`,'utf8').then(JSON.parse)));
const findingStatuses={};for(const receipt of receipts)for(const f of receipt.findings||[])findingStatuses[f.status]=(findingStatuses[f.status]||0)+1;
const current=report.articleCount,newArticles=added.length*72;
const manifest={
 schemaVersion:'1.0.0',batch:`interview-monthly-preview-${current}-20261118`,scope:'copy-preview-only',uploadedArticles:current,newArticlesSincePrevious:newArticles,newHexagrams:added,fullTarget:4608,remainingArticles:4608-current,authorWholeArticleReadback:receipts.reduce((n,r)=>n+r.wholeArticlesRead,0),
 hexagrams:report.hexagrams.map(h=>({primaryId:h.primaryId,name:h.name,articles:h.articles,fullArticleReadback:h.authorWholeArticlesRead,sourcePath:`${SOURCE_DIR}/${stem(h.primaryId)}.json`,sourceSha256:h.sourceSha256,receiptPath:`${RECEIPT_DIR}/${stem(h.primaryId)}.json`,readingPath:`${DOC_DIR}/${stem(h.primaryId)}.md`,outcomes:h.outcomes})),
 checks:{exactFullArticleDuplicates:report.duplicateArticles.length,exactParagraphDuplicates:report.duplicateParagraphs.length,exactSentences24HanOrMoreExcludingQuotedClassics:report.duplicateLongSentences.length,bodyHanRange:report.bodyHanRange,shortHanRange:report.shortHanRange,independentChartComparisons:report.chartComparisons,independentChartMismatches:report.chartMismatches.length,dateCases:report.dateCases,judgmentCorrectionArticles:report.judgmentCorrections.length,machineReport:'docs/review/INTERVIEW_MONTHLY_CHECKS.json'},
 ruleFindingStatuses:findingStatuses,baselineCommit:old.baselineCommit,previousMainPublicationCommit:get('--previous-main')||old.previousMainPublicationCommit||null,
 independentFullCopyReview:'pending',classicalInterpretationReview:'partially-reviewed; see per-hexagram findings',userStyleApproval:old.userStyleApproval,userPerArticleAcceptance:false,runtimeChanged:false
};
const newNames=report.hexagrams.filter(h=>added.includes(h.primaryId)).map(h=>h.name).join('、');
const lines=[`# 面试逐月长稿：${current} 篇预览`,
 `更新日期：2026-11-18（America/New_York）。本批新增${newNames}，共 ${newArticles} 篇；累计 ${current} 篇。完整目标为 4,608 篇，尚余 ${4608-current} 篇未计入交付。继续以此前 576 篇的文风与厚度为参照。`,
 '| 卦 | 已上传篇数 | 正文 | 核读与规则审计 |','|---|---:|---|---|',
 ...report.hexagrams.map(h=>`| ${h.name} | ${h.articles} | [打开全文](${stem(h.primaryId)}.md) | [查看记录](../../../${RECEIPT_DIR}/${stem(h.primaryId)}.json) |`),'',
 '每卦按初爻至上爻、寅卯辰巳午未申酉戌亥子丑排列。同气月份保持相同五态与判据，文章逐篇写定。正文以自然段展开，讲明判断、过程、爻义与对应准备；篇幅按解释所需伸缩，不以重复建议补字数。',
 '## 本批阅读入口',
 ...report.hexagrams.filter(h=>added.includes(h.primaryId)).map(h=>`- [${h.name}：六爻十二月全文](${stem(h.primaryId)}.md)`),'',
 '新增稿清理了原文中缺少卦理根据的具体面试情节，并把正文、专业说明和应期事件一同核对。专业说明的订正保留原文、新文、来源和影响；真实吉意与当前结构判据仍有冲突的，继续列为开放问题。',
 '## 检查与阅读状态',
 `${current} 篇均有作者逐篇全文读回记录。已发布全量的盘面比较 ${report.chartComparisons.toLocaleString('en-US')} 项，差异 ${report.chartMismatches.length}；日期用例 ${report.dateCases.toLocaleString('en-US')} 组。全文、整段及剔除引文后的 24 汉字以上长句重复均为零。正文实际 ${report.bodyHanRange[0]}–${report.bodyHanRange[1]} 汉字。`,
 '[逐批核查方法](../../review/INTERVIEW_MONTHLY_AUDIT_METHOD.md) · [机器核查记录](../../review/INTERVIEW_MONTHLY_CHECKS.json) · [交付清单](manifest.json)',
 '作者读回、独立排盘、古籍解释审计、独立全文复核和用户逐篇验收分别登记。机器通过不等于解释争议已经解决；用户对已看文风的认可，也不写成尚未查看稿件的逐篇验收。',
 '“卦理与出处”“简断摘要”可按需展开。应期是传统推算的参考窗口，阅读页日期采用演示基准；实际使用按起卦日换算。过程受阻的窗口不指称结果公布日期。',
 '本目录为文稿预览，正式应用版本将在整库完成与集成验收后更新。源稿、核读记录和阅读页随批上传；未完成全文读回的稿件不计入数量。现实预测准确率未据此声称得到验证。'];
await writeFile(`${DOC_DIR}/README.md`,lines.join('\n\n').replaceAll('|\n\n|','|\n|')+'\n');
await writeFile(`${DOC_DIR}/manifest.json`,JSON.stringify(manifest,null,2)+'\n');
await writeFile('docs/review/INTERVIEW_MONTHLY_CHECKS.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({articles:current,newArticles,hexagrams:ids.length,status:report.status,sourceAuthorshipChanged:false}));
