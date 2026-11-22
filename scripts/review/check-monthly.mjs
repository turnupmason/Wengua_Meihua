// 逐月长稿检查（各问项通用，照面试 check-interview-monthly.mjs）。
// 用法：node scripts/review/check-monthly.mjs <问项目录> [--hex 3,4] [--draft] [--docs] [--json path]
// 本检查不签署作者全文读回，也不代替独立解释审核。
import {writeFile,access} from 'node:fs/promises';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {MONTHS,QI,stem,sha256,han,normalize,stripQuotes,listMonthlyIds,context,loadHex,oldFor,rowFor,independentFacts,readingFor,resolveTiming,timingSignature,item} from './monthly-lib.mjs';

// 全卦通用的正文禁区（照面试月稿规范：不编人物心理、原话与具体经过；内部审稿用语不进正文）。
// 2026-11-20 加：规则名目（降档、升档、按结局拆、专属爻辞、只推迟时机）与专业说明的「定为……」是写给审稿看的，不进正文、简断、标题。
const INTERNAL = /口径|定档|有条件|R\d|盲断|复核|改判|原稿|待核|存疑|降档|升档|调档|翻档|专属爻辞|按结局拆|只推迟时机|升辞|降辞|列为降|列为升|定为(?:留|先准备|可走|能成|不成|能过|过不了|稳|有隐患|风险大|能升|升不了|能转正|转不了)/u;
const HEDGE = /有望|偏难|多半|大概率|成败两可|或许|未必|恐怕|把握不大|把握较大|胜算|可能性|说不准|难说|看运气/u;

// 晋升月稿单独说明随岗薪资。薪资文字不计入正文厚度，也不改变既定晋升判据。
// 此处只核可确定的字段绑定与盘面规则；具体类推是否恰当仍须作者全文审读。
export function promotionArticleIssues(article, baseline, reading) {
 const issues=[],add=(check,detail)=>issues.push({check,detail});
 const pay=article.payExplanation,oldPay=baseline[11]??'';
 if(typeof pay!=='string'||!pay.trim())add('pay-explanation','每篇须有独立的随岗薪资说明');
 else {
  if(!/薪|工资|报酬|待遇/u.test(pay))add('pay-explanation','随岗薪资说明须明确所谈的薪酬事项');
  if(pay!==oldPay) {
   const cr=article.payCorrection;
   if(!cr||cr.old!==oldPay||cr.new!==pay||typeof cr.reason!=='string'||han(cr.reason)<12||
      cr.impact?.outcomeChanged!==false||cr.impact?.timingSignatureChanged!==false)
    add('pay-correction','薪资订正须绑定原第12栏、新文、具体理由与不变的晋升结论及取期结构');
  } else if(article.payCorrection)add('pay-correction','薪资说明未改变，却带有订正记录');
 }
 const visibleTiming=typeof article.timing==='string'?article.timing:
  Array.isArray(article.timing)?article.timing.flatMap(s=>[s[2],s[3]]).join('\n'):'';
 const visible=[article.title,article.short,...(article.paragraphs||[]),pay,visibleTiming].join('\n');
 const otherItem=/面试|考试|考场|考生|试卷|卷面|阅卷|合格线|及格|分数|交卷|答卷|考题/u;
 if(otherItem.test(visible))add('promotion-public-scope',visible.match(otherItem)[0]);
 // 用户已定《求名占》在任专条：任一直接克原体，都不得写成能升。
 if(article.outcome==='favourable'&&reading.edges.some(edge=>edge.type==='use_controls_body'))
  add('promotion-incumbent-rule','盘中存在直接克原体之卦，不能判为能升；旺衰不取消该专项规则');
 return issues;
}

export async function auditMonthly(name,{ids,draft=false,docs=false}={}) {
 const c=item(name);
 ids=ids||await listMonthlyIds(c);const ctx=await context();
 const outcomes=Object.keys(c.verdict);
 const report={schemaVersion:'1.0.0',item:name,scope:'monthly-source-and-render-validation',articleCount:0,hexagrams:[],errors:[],warnings:[],judgmentCorrections:[],duplicateArticles:[],duplicateParagraphs:[],duplicateLongSentences:[],chartComparisons:0,chartMismatches:[],dateCases:0,bodyHanRange:[Infinity,0],shortHanRange:[Infinity,0],independentFullCopyReview:'not-performed-by-this-script',realWorldPredictionAccuracy:'not-validated'};
 if(name==='promotion-pay'){report.payHanRange=[Infinity,0];report.payCorrections=[];}
 const seenBody=new Map(),seenParagraph=new Map(),seenSentence=new Map();
 const err=(key,check,detail)=>report.errors.push({key,check,detail});
 const warn=(key,check,detail)=>report.warnings.push({key,check,detail});
 const compare=(key,field,a,b)=>{report.chartComparisons++;if(JSON.stringify(a)!==JSON.stringify(b)){const m={key,field,independent:a,engine:b};report.chartMismatches.push(m);err(key,'independent-chart',m);}};
 // 全库查重：已写定的其他卦也纳入（只比对，不报它们自己的错）。
 const allIds=await listMonthlyIds(c);
 for(const other of allIds.filter(x=>!ids.includes(x))) {
  try {const b=await loadHex(c,other);for(const a of b.source.articles||[]) {const key=`${other}/${a.movingLine}/${a.monthBranch}`;if(!Array.isArray(a.paragraphs))continue;
   seenBody.set(normalize(a.paragraphs.join('')),key);
   for(const [pidx,p] of a.paragraphs.entries()){seenParagraph.set(normalize(p),key+'/p'+(pidx+1));for(const s of stripQuotes(p).split(/[。！？]/u))if(han(s)>=24)seenSentence.set(normalize(s),key+'/p'+(pidx+1));}}}catch{}
 }
 for(const id of ids) {
  const bundle=await loadHex(c,id),{source,receipt}=bundle;
  const keyRoot=String(id);let doc=null;
  if(docs)try {doc=await readFile(`${c.DOC_DIR}/${stem(id)}.md`,'utf8');}catch(e){err(keyRoot,'reading-document',e.message);}
  if(source.schemaVersion!=='1.0.0'||source.primaryId!==id)err(keyRoot,'identity','schemaVersion or primaryId mismatch');
  if(!Array.isArray(source.articles)){err(keyRoot,'articles','Expected array');continue;}
  if(!draft&&source.articles.length!==72)err(keyRoot,'coverage',`Expected 72, got ${source.articles.length}`);
  const keys=new Set(),sameQi=new Map();const counts=Object.fromEntries(outcomes.map(o=>[o,0]));
  const detail={primaryId:id,name:ctx.library.getHexagram(id).name,articles:source.articles.length,sourceSha256:sha256(bundle.raw),authorWholeArticlesRead:receipt?.wholeArticlesRead??0,bodyHanRange:[Infinity,0],outcomes:counts};
  const hex = ctx.library.getHexagram(id);
  const calendarLead = new RegExp(`^(?:(?:${hex.name}|${hex.shortName})卦?)?(?:初[六九]|[六九][二三四五]|上[六九])(?:动)?(?:行至|行到|进到|逢|临|值|遇|至|到|在|入)?[寅卯辰巳午未申酉戌亥子丑]月?[，。]`, 'u');
  if(!draft) {
   if(!receipt)err(keyRoot,'author-receipt','Missing receipt');
   else {
    if(receipt.primaryId!==id)err(keyRoot,'author-receipt','primaryId mismatch');
    if(receipt.sourceSha256!==detail.sourceSha256)err(keyRoot,'author-receipt','Source hash is stale');
    if(receipt.wholeArticlesRead!==72)err(keyRoot,'author-receipt','Whole-article readback count must be 72');
    if(!Array.isArray(receipt.lineReviews)||receipt.lineReviews.length!==6)err(keyRoot,'author-receipt','lineReviews must cover six moving lines');
   }
  }
  for(const [i,a] of source.articles.entries()) {
   report.articleCount++;const key=`${id}/${a.movingLine}/${a.monthBranch}`,monthKey=`${a.movingLine}/${a.monthBranch}`;
   if(keys.has(monthKey))err(key,'month-key','Duplicate');keys.add(monthKey);
   if(a.movingLine!==Math.floor(i/12)+1||a.monthBranch!==MONTHS[i%12])err(key,'order','Expected moving line then 寅卯辰巳午未申酉戌亥子丑');
   if(!QI[a.monthBranch]||!Number.isInteger(a.movingLine)||a.movingLine<1||a.movingLine>6){err(key,'identity','Invalid month/line');continue;}
   const old=oldFor(bundle,a);if(!old){err(key,'baseline','No source row');continue;}
   counts[a.outcome]=(counts[a.outcome]||0)+1;
   if(!outcomes.includes(a.outcome))err(key,'outcome','Unexpected code');
   if(a.outcome!==old[2])err(key,'baseline-decision','Outcome changed without a separately implemented decision correction review');
   if(typeof a.judgment!=='string'||han(a.judgment)<20)err(key,'judgment','Missing professional judgment');
   else {
    if(!c.note[a.outcome]?.test(a.judgment))err(key,'judgment-verdict','专业说明须写明本篇结论（'+c.note[a.outcome]+'）');
    for(const [o,re] of Object.entries(c.note))if(o!==a.outcome&&re.test(a.judgment))err(key,'judgment-verdict','专业说明写成了另一档：'+a.judgment.match(re)[0]);
   }
   if(c.judgmentBaseline==='strict'&&a.judgment!==old[9]) {
    const cr=a.judgmentCorrection;
    if(!cr||cr.old!==old[9]||cr.new!==a.judgment||typeof cr.reason!=='string'||han(cr.reason)<12||cr.impact?.outcomeChanged!==false||cr.impact?.timingSignatureChanged!==false)err(key,'judgment-correction','Correction must bind exact old/new wording, a substantive reason and unchanged outcome/timing structure');
    else {
     const local=(cr.sourceEvidence||[]).filter(e=>typeof e?.path==='string'&&typeof e?.scope==='string'&&e.scope.trim());
     if(!local.length)err(key,'judgment-correction','At least one concrete local source path and scope are required');
     for(const e of local) {
      if(!/^(sources|data|docs)\//u.test(e.path)||e.path.split('/').includes('..'))err(key,'judgment-correction','Source must be a repository-relative evidence path');
      else try {await access(e.path);}catch {err(key,'judgment-correction','Evidence path not found: '+e.path);}
     }
     report.judgmentCorrections.push({key,old:cr.old,new:cr.new,reason:cr.reason,sourceEvidence:cr.sourceEvidence,interpretationApproval:'not-implied-by-structural-check'});
    }
   } else if(c.judgmentBaseline==='strict'&&a.judgmentCorrection)err(key,'judgment-correction','Correction record present but judgment is unchanged');
   if(timingSignature(a.timing)!==timingSignature(old[10]))err(key,'baseline-timing','Changed timing kind, role, method, count or presence');
   if(typeof a.title!=='string'||!a.title.trim()||typeof a.short!=='string'||!Array.isArray(a.paragraphs)||a.paragraphs.some(p=>typeof p!=='string'||!p.trim())){err(key,'copy-shape','Missing title, short or nonempty paragraphs');continue;}
   const body=a.paragraphs.join('\n\n'),bLen=han(body),sLen=han(a.short);
   detail.bodyHanRange=[Math.min(detail.bodyHanRange[0],bLen),Math.max(detail.bodyHanRange[1],bLen)];
   report.bodyHanRange=[Math.min(report.bodyHanRange[0],bLen),Math.max(report.bodyHanRange[1],bLen)];
   report.shortHanRange=[Math.min(report.shortHanRange[0],sLen),Math.max(report.shortHanRange[1],sLen)];
   if(bLen<400||bLen>700)err(key,'body-length',`${bLen} Han; expected full long-form copy around 450–650`);
   else if(bLen<450||bLen>650)warn(key,'flexible-body-length',bLen);
   if(sLen<60||sLen>120)err(key,'short-length',sLen);
   if(a.paragraphs.length<3)err(key,'body-paragraphs','Too few independent paragraphs');
   // 考试首段须让读者知道成否，容许先把本篇缘由讲出来。其他问项仍查首句。
   const verdictLead=paragraph=>{
    const sentences=paragraph.split(/[。！？]/u),verdict=c.verdict[a.outcome];
    if(name!=='exam'||verdict.test(sentences[0]))return sentences[0];
    const opening=sentences.slice(0,2).join('。');
    return verdict.test(opening)?opening:sentences.slice(2).find(sentence=>verdict.test(sentence))??opening;
   };
   const first=verdictLead(a.paragraphs[0]),shortFirst=verdictLead(a.short);
   if(name==='exam' && calendarLead.test(a.paragraphs[0]))
    err(key,'exam-opening', '正文首句重复了标题中的爻位和月令');
   for(const [label,sent] of [['opening-verdict',first],['short-verdict',shortFirst]]) {
    if(!c.verdict[a.outcome].test(sent))err(key,label,sent);
    if(c.contra){if(c.contra[a.outcome].test(sent))err(key,label,'含相反说法：'+sent);}
    else for(const o of outcomes)if(o!==a.outcome&&c.verdict[o].test(sent.replace(c.verdict[a.outcome],'')))err(key,label,'含另一档判词：'+sent);
   }
   if(/\{\{|\bTODO\b|\[待(?:补|写)\]/u.test(body+a.short))err(key,'placeholder','Unfinished prose');
   if(INTERNAL.test(body+a.short+a.title))err(key,'internal-terms',(body+a.short+a.title).match(INTERNAL)[0]);
   // 他项用语（各问项 forbid，2026-11-20 加）：标题、简断、正文、专业说明、取期文字都查。
   if(c.forbid){const all=[a.title,a.short,body,a.judgment,JSON.stringify(a.timing)].join('\n');if(c.forbid.test(all))err(key,'other-item-terms',all.match(c.forbid)[0]);}
   if(HEDGE.test(a.short+first))err(key,'hedge',(a.short+first).match(HEDGE)[0]);
   const lineText=readingFor(ctx,c,id,a).selectedMovingLine.text.replace(/[^\p{Script=Han}]/gu,'');
   const quoted=[...body.matchAll(/「([^」]+)」/gu)].map(m=>m[1].replace(/[^\p{Script=Han}]/gu,'')).filter(q=>q.length>=2);
   if(!quoted.some(q=>lineText.includes(q)))err(key,'line-quote','正文须引动爻爻辞原句');
   const qiKey=`${a.movingLine}/${QI[a.monthBranch]}`,sig=JSON.stringify([a.outcome,a.judgment,timingSignature(a.timing)]);
   if(sameQi.has(qiKey)&&sameQi.get(qiKey)!==sig)err(key,'same-qi','Judgment or timing structure differs within same seasonal qi');sameQi.set(qiKey,sig);
   const nb=normalize(body);if(seenBody.has(nb))report.duplicateArticles.push([seenBody.get(nb),key]);else seenBody.set(nb,key);
   for(const [pidx,p] of a.paragraphs.entries()) {
    const pk=`${key}/p${pidx+1}`,np=normalize(p);if(seenParagraph.has(np))report.duplicateParagraphs.push([seenParagraph.get(np),pk]);else seenParagraph.set(np,pk);
    for(const s of stripQuotes(p).split(/[。！？]/u))if(han(s)>=24){const ns=normalize(s);if(seenSentence.has(ns))report.duplicateLongSentences.push({first:seenSentence.get(ns),second:pk,sentence:s});else seenSentence.set(ns,pk);}
   }
   const independent=independentFacts(id,a.movingLine,a.monthBranch),r=readingFor(ctx,c,id,a),row=rowFor(bundle,a);
   if(name==='promotion-pay') {
    for(const issue of promotionArticleIssues(a,old,r))err(key,issue.check,issue.detail);
    if(typeof a.payExplanation==='string') {
     const n=han(a.payExplanation);report.payHanRange=[Math.min(report.payHanRange[0],n),Math.max(report.payHanRange[1],n)];
    }
    if(a.payCorrection)report.payCorrections.push({key,sourcePath:bundle.sourcePath.replace('/monthly/','/'),baselineFieldIndex:11,
     old:a.payCorrection.old,new:a.payCorrection.new,reason:a.payCorrection.reason,
     interpretationApproval:'not-implied-by-structural-check'});
   }
   compare(key,'primaryBits',independent.bits,r.stages.primary.bitsBottomUp);
   compare(key,'stageIds',independent.stageIds,Object.values(r.stages).map(s=>s.id));
   compare(key,'lineLabel',independent.lineLabel,r.selectedMovingLine.label);
   for(const n of independent.nodes) {const actual=r.nodes.find(x=>x.role===n.role);for(const f of ['trigram','element','qi'])compare(key,`${n.role}.${f}`,n[f],f==='qi'?actual.strength.state:actual[f]);}
   for(const edge of independent.relations)compare(key,`${edge.role}.relation`,edge.type,r.edges.find(e=>e.targetRole===edge.role)?.type);
   if(row) {compare(key,'storedStageIds',independent.stageIds,row.facts.stages.map(s=>s.id));compare(key,'storedLineText',r.selectedMovingLine.text,row.facts.movingLine.fullText);}
   try {
    for(const date of ['2026-11-11','2026-12-31']) {
     const timing=resolveTiming(c,readingFor(ctx,c,id,a,date),a,date);report.dateCases++;
     for(const w of timing.dateMatches)if(w.displayedDates.some(d=>d<date))err(key,'past-date',{date,dates:w.displayedDates});
     if(timing.slots.some(s=>/^(name-support|name-body)$/.test(s.kind)&&a.outcome!=='favourable'))err(key,'timing-verdict','Favourable-result window on non-favourable verdict');
     const later=resolveTiming(c,readingFor(ctx,c,id,a,date),a,date,'2027-02-01');
     if(JSON.stringify(timing.dateMatches.map(m=>m.displayedDates))!==JSON.stringify(later.dateMatches.map(m=>m.displayedDates)))err(key,'history-date','Viewing date rolled saved candidate dates');
    }
   }catch(e){err(key,'timing',e.message);}
   if(doc)for(const [label,value] of [['title',a.title],['short',a.short],...a.paragraphs.map((p,i)=>['paragraph '+(i+1),p]),...(name==='promotion-pay'?[['payExplanation',a.payExplanation]]:[])])if(!doc.includes(value))err(key,'reading-document',`${label} missing from Markdown`);
  }
  if(!draft)for(let line=1;line<=6;line++)for(const month of MONTHS)if(!keys.has(`${line}/${month}`))err(`${id}/${line}/${month}`,'month-key','Missing');
  report.hexagrams.push(detail);
 }
 for(const field of ['duplicateArticles','duplicateParagraphs','duplicateLongSentences'])if(report[field].length)err('all',field,report[field].length);
 report.status=report.errors.length?'failed':'passed';return report;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
 const args=process.argv.slice(2),value=flag=>args.includes(flag)?args[args.indexOf(flag)+1]:null;
 const name=args[0];if(!name||name.startsWith('--'))throw new Error('Usage: check-monthly.mjs <item> [--hex 3,4] [--draft] [--docs] [--json path]');
 const ids=value('--hex')?.split(',').map(Number);
 const report=await auditMonthly(name,{ids,draft:args.includes('--draft'),docs:args.includes('--docs')});
 if(value('--json'))await writeFile(value('--json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({status:report.status,item:name,articles:report.articleCount,hexagrams:report.hexagrams.length,bodyHanRange:report.bodyHanRange,shortHanRange:report.shortHanRange,...(name==='promotion-pay'?{payHanRange:report.payHanRange,payCorrectionArticles:report.payCorrections.length}:{}),chartComparisons:report.chartComparisons,chartMismatches:report.chartMismatches.length,dateCases:report.dateCases,errors:report.errors.slice(0,30),duplicateLongSentences:report.duplicateLongSentences.slice(0,12),flexibleLengthWarnings:report.warnings.length},null,2));
 process.exitCode=report.errors.length?1:0;
}
