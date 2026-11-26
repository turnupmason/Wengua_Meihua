// 逐月长稿预览目录与清单（各问项通用，照面试 update-interview-monthly-index.mjs）。不写正文，不签核读。
// 用法：node scripts/update-monthly-index.mjs <问项目录> --hex <已完成卦序> --added <本批新增卦序> [--publication-date YYYY-MM-DD]
import {readFile,writeFile} from 'node:fs/promises';
import {auditMonthly} from './review/check-monthly.mjs';
import {stem,item} from './review/monthly-lib.mjs';
const args=process.argv.slice(2),name=args[0],get=flag=>args.includes(flag)?args[args.indexOf(flag)+1]:null;
const c=item(name);
const publicationDate=get('--publication-date')||new Intl.DateTimeFormat('sv-SE',{timeZone:'America/New_York'}).format(new Date());
if(!/^\d{4}-\d{2}-\d{2}$/.test(publicationDate))throw new Error('Expected --publication-date YYYY-MM-DD');
if(!get('--hex')||!get('--added'))throw new Error('Explicit --hex completed-list and --added newly-published-list required');
const ids=get('--hex').split(',').map(Number).sort((a,b)=>a-b),added=get('--added').split(',').map(Number);
if(new Set(ids).size!==ids.length||added.some(id=>!ids.includes(id)))throw new Error('Duplicate IDs or added hexagram absent from completed list');
const report=await auditMonthly(name,{ids,docs:true});
if(report.errors.length)throw new Error(JSON.stringify(report.errors.slice(0,20)));
const receipts=await Promise.all(ids.map(id=>readFile(`${c.RECEIPT_DIR}/${stem(id)}.json`,'utf8').then(JSON.parse)));
const findingStatuses={};for(const receipt of receipts)for(const f of receipt.findings||[])findingStatuses[f.status]=(findingStatuses[f.status]||0)+1;
const current=report.articleCount;
const confession=name==='confession-decision';
let newArticles=added.length*72;
if(confession){
 const old=await readFile(`${c.DOC_DIR}/manifest.json`,'utf8').then(JSON.parse).catch(e=>{if(e.code==='ENOENT')return null;throw e;});
 const previous=new Map((old?.hexagrams||[]).map(h=>[h.primaryId,h.articles]));
 const delta=report.hexagrams.map(h=>({id:h.primaryId,count:h.articles-(previous.get(h.primaryId)||0)}));
 if(delta.some(h=>h.count<0)||[...previous.keys()].some(id=>!ids.includes(id)))throw new Error('Published confession article coverage cannot be silently reduced');
 if(delta.some(h=>h.count>0&&!added.includes(h.id))||delta.some(h=>added.includes(h.id)&&h.count===0))throw new Error('--added must list exactly hexagrams with increased article count');
 newArticles=delta.reduce((n,h)=>n+h.count,0);
}
const promotionCrossReadComplete=name==='promotion-pay'&&receipts.every(r=>
 r.independentReview?.status==='ai-cross-reviewed-with-open-findings'&&r.independentReview?.wholeArticlesRead===r.wholeArticlesRead&&
 r.independentReview?.sourceSha256===r.sourceSha256);
const checksPath=`docs/review/${name.toUpperCase().replace(/-/g,'_')}_MONTHLY_CHECKS.json`;
const manifest={
 schemaVersion:'1.0.0',item:name,questionId:c.questionId,batch:`${name}-monthly-preview-${current}-${publicationDate.replaceAll('-','')}`,publicationDate,publicationTimeZone:'America/New_York',scope:'copy-preview-only',uploadedArticles:current,newArticlesSincePrevious:newArticles,newHexagrams:added,fullTarget:4608,remainingArticles:4608-current,authorWholeArticleReadback:receipts.reduce((n,r)=>n+r.wholeArticlesRead,0),
 hexagrams:report.hexagrams.map(h=>({primaryId:h.primaryId,name:h.name,articles:h.articles,fullArticleReadback:h.authorWholeArticlesRead,sourcePath:`${c.SOURCE_DIR}/${stem(h.primaryId)}.json`,sourceSha256:h.sourceSha256,receiptPath:`${c.RECEIPT_DIR}/${stem(h.primaryId)}.json`,readingPath:`${c.DOC_DIR}/${stem(h.primaryId)}.md`,outcomes:h.outcomes})),
 checks:{exactFullArticleDuplicates:report.duplicateArticles.length,exactParagraphDuplicates:report.duplicateParagraphs.length,exactSentences24HanOrMoreExcludingQuotedClassics:report.duplicateLongSentences.length,bodyHanRange:report.bodyHanRange,shortHanRange:report.shortHanRange,independentChartComparisons:report.chartComparisons,independentChartMismatches:report.chartMismatches.length,dateCases:report.dateCases,judgmentCorrectionArticles:report.judgmentCorrections.length,machineReport:checksPath},
 ruleFindingStatuses:findingStatuses,styleReference:'origin/editorial/interview-preview-216-20261118 docs/interview-pass/monthly-preview（用户批准的写作手法，2026-11-19）',
 independentFullCopyReview:'pending',classicalInterpretationReview:'partially-reviewed; see per-hexagram findings',userPerArticleAcceptance:false,runtimeChanged:false
};
if(confession){
 manifest.independentFullCopyReview='ai-independent-second-read-complete-for-published-articles';
 manifest.independentHumanReview='pending';
 manifest.independentWholeArticleReadback=report.confession.secondRead;
 manifest.checks.scopeArticlesChecked=report.confession.scopeArticlesChecked;
 manifest.checks.styleReport='docs/review/CONFESSION_DECISION_MONTHLY_STYLE.json';
 manifest.checks.timingCorrectionArticles=report.confession.timingCorrections.length;
 for(const [i,h] of manifest.hexagrams.entries()){h.completedMovingLines=h.articles/12;h.independentFullArticleReadback=report.hexagrams[i].independentWholeArticlesRead;h.secondReceiptPath=`${c.SECOND_RECEIPT_DIR}/${stem(h.primaryId)}.json`;}
}
if(name==='promotion-pay'){
 manifest.checks.payHanRange=report.payHanRange;
 manifest.checks.payCorrectionArticles=report.payCorrections.length;
 manifest.independentFullCopyReview=promotionCrossReadComplete?'ai-cross-reviewed-with-open-findings':'pending';
 manifest.independentReviewCoverage=receipts.map(r=>({primaryId:r.primaryId,sourceSha256:r.sourceSha256,
  wholeArticleCoverage:r.independentReview?.wholeArticlesRead??0,
  currentRevisionFullTextReadCount:r.independentReview?.currentRevisionFullTextReadCount??null,
  currentRevisionChangedArticleReadCount:r.independentReview?.currentRevisionChangedArticleReadCount??null,
  scope:r.independentReview?.scope??'见逐卦回执'}));
 manifest.independentHumanReview='pending';
}
const newNames=report.hexagrams.filter(h=>added.includes(h.primaryId)).map(h=>h.name).join('、');
const lines=[`# ${c.title}逐月长稿：${current} 篇预览`,
 `更新日期：${publicationDate}（America/New_York）。本批新增${newNames}，共 ${newArticles} 篇；累计 ${current} 篇。完整目标为 4,608 篇，尚余 ${4608-current} 篇未计入交付。写作手法照用户批准的面试逐月长稿。`,
 '| 卦 | 已上传篇数 | 正文 | 核读与规则审计 |','|---|---:|---|---|',
 ...report.hexagrams.map(h=>`| ${h.name} | ${h.articles}${confession?'/72':''} | [打开全文](${stem(h.primaryId)}.md) | [${confession?'首读':'查看记录'}](../../../${c.RECEIPT_DIR}/${stem(h.primaryId)}.json)${confession?` · [二读](../../../${c.SECOND_RECEIPT_DIR}/${stem(h.primaryId)}.json)`:''} |`),'',
 '每卦按初爻至上爻、寅卯辰巳午未申酉戌亥子丑排列。同气月份保持相同五态与判据，文章逐篇写定。正文以自然段展开，讲明判断、过程、爻义与对应准备；篇幅按解释所需伸缩，不以重复建议补字数。',
 ...(name==='promotion-pay'?['每篇另列随岗薪资，说明本次晋升与其所附调整的范围。金额、薪档、计薪及到账日期不由卦象代定；未晋升也不扩大为所有独立调薪或奖金均无。薪资说明不计入正文字数。',
 `[本批写作与晋升规则审计](../../review/PROMOTION_MONTHLY_REWRITE_20261120.md)。${promotionCrossReadComplete?'已发布各篇均有独立 AI 全文审读记录；修订稿另读全部改动，原全文记录与后续差异审读分别绑定各版源文件。具体阅读范围及解释分歧见逐卦回执，未冒称真人专业审核或用户逐篇验收。':'独立交叉全文审读状态见逐卦回执。'}`]:[]),
 ...(confession?['暧昧表白逐篇区分心意的传统取象、近期自行发起联络的倾向及表达分寸；不将相合、回复、好感或吉爻写成当事人已经同意。首编及不同独立 AI 阅读人均按实际完整篇数和当前源指纹登记，不冒充真人验收。',`[本项写作与规则审计](../../review/CONFESSION_MONTHLY_AUDIT_METHOD.md)`]:[]),
 '## 本批阅读入口',
 ...report.hexagrams.filter(h=>added.includes(h.primaryId)).map(h=>`- [${h.name}：${confession?`已完成 ${h.articles} 篇（${h.articles/12} 爻）`:'六爻十二月全文'}](${stem(h.primaryId)}.md)`),'',
 '## 检查与阅读状态',
 `${current} 篇均有作者逐篇全文读回记录。已发布全量的盘面比较 ${report.chartComparisons.toLocaleString('en-US')} 项，差异 ${report.chartMismatches.length}；日期用例 ${report.dateCases.toLocaleString('en-US')} 组。全文、整段及剔除引文后的 24 汉字以上长句重复均为零。正文实际 ${report.bodyHanRange[0]}–${report.bodyHanRange[1]} 汉字。`,
 `[逐月核查方法](../../review/MONTHLY_AUDIT_METHOD.md) · [机器核查记录](../../review/${checksPath.split('/').at(-1)}) · [交付清单](manifest.json)`,
 ...(confession?['[正文及简断风格全量核查](../../review/CONFESSION_DECISION_MONTHLY_STYLE.json) · 以实际篇数和源文件指纹登记。']:[]),
 '作者读回、独立排盘、古籍解释审计、独立全文复核和用户逐篇验收分别登记。机器通过不等于解释争议已经解决；用户对文风的认可，也不写成尚未查看稿件的逐篇验收。',
 '“卦理与出处”“简断摘要”可按需展开。应期是传统推算的参考窗口，阅读页日期采用演示基准；实际使用按起卦日换算。过程受阻的窗口不指称结果日期。',
 '本目录为文稿预览，正式应用版本将在整库完成与集成验收后更新。现实预测准确率未据此声称得到验证。'];
await writeFile(`${c.DOC_DIR}/README.md`,lines.join('\n\n').replaceAll('|\n\n|','|\n|')+'\n');
await writeFile(`${c.DOC_DIR}/manifest.json`,JSON.stringify(manifest,null,2)+'\n');
await writeFile(checksPath,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({item:name,articles:current,newArticles,hexagrams:ids.length,status:report.status}));
