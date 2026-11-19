// Usage: node scripts/review/check-interview-monthly.mjs [--hex 3,4] [--draft] [--docs] [--json path]
// This audit does not sign an author's full-text readback or an independent interpretation review.
import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {MONTHS,QI,DOC_DIR,stem,sha256,han,normalize,stripQuotes,listMonthlyIds,context,loadHex,oldFor,rowFor,independentFacts,readingFor,resolveTiming,timingSignature} from './interview-monthly-lib.mjs';

export async function auditMonthly({ids,draft=false,docs=false}={}) {
 ids=ids||await listMonthlyIds();const ctx=await context();
 const report={schemaVersion:'1.0.0',scope:'monthly-source-and-render-validation',articleCount:0,hexagrams:[],errors:[],warnings:[],duplicateArticles:[],duplicateParagraphs:[],duplicateLongSentences:[],chartComparisons:0,chartMismatches:[],dateCases:0,bodyHanRange:[Infinity,0],shortHanRange:[Infinity,0],independentFullCopyReview:'not-performed-by-this-script',realWorldPredictionAccuracy:'not-validated'};
 const seenBody=new Map(),seenParagraph=new Map(),seenSentence=new Map();
 const err=(key,check,detail)=>report.errors.push({key,check,detail});
 const warn=(key,check,detail)=>report.warnings.push({key,check,detail});
 const compare=(key,field,a,b)=>{report.chartComparisons++;if(JSON.stringify(a)!==JSON.stringify(b)){const m={key,field,independent:a,engine:b};report.chartMismatches.push(m);err(key,'independent-chart',m);}};
 for(const id of ids) {
  const bundle=await loadHex(id),{source,receipt}=bundle;
  const keyRoot=String(id);let doc=null;
  if(docs)try {doc=await readFile(`${DOC_DIR}/${stem(id)}.md`,'utf8');}catch(e){err(keyRoot,'reading-document',e.message);}
  if(source.schemaVersion!=='1.0.0'||source.primaryId!==id)err(keyRoot,'identity','schemaVersion or primaryId mismatch');
  if(!Array.isArray(source.articles)){err(keyRoot,'articles','Expected array');continue;}
  if(!draft&&source.articles.length!==72)err(keyRoot,'coverage',`Expected 72, got ${source.articles.length}`);
  const keys=new Set(),sameQi=new Map();const counts={favourable:0,difficult:0};
  const detail={primaryId:id,name:ctx.library.getHexagram(id).name,articles:source.articles.length,sourceSha256:sha256(bundle.raw),authorWholeArticlesRead:receipt?.wholeArticlesRead??0,bodyHanRange:[Infinity,0],outcomes:counts};
  if(!draft) {
   if(!receipt)err(keyRoot,'author-receipt','Missing receipt');
   else {
    if(receipt.primaryId!==id)err(keyRoot,'author-receipt','primaryId mismatch');
    if(receipt.sourceSha256!==detail.sourceSha256)err(keyRoot,'author-receipt','Source hash is stale');
    if(receipt.wholeArticlesRead!==72)err(keyRoot,'author-receipt','Whole-article readback count must be 72');
   }
  }
  for(const [i,a] of source.articles.entries()) {
   report.articleCount++;const key=`${id}/${a.movingLine}/${a.monthBranch}`,monthKey=`${a.movingLine}/${a.monthBranch}`;
   if(keys.has(monthKey))err(key,'month-key','Duplicate');keys.add(monthKey);
   if(a.movingLine!==Math.floor(i/12)+1||a.monthBranch!==MONTHS[i%12])err(key,'order','Expected moving line then 寅卯辰巳午未申酉戌亥子丑');
   if(!QI[a.monthBranch]||!Number.isInteger(a.movingLine)||a.movingLine<1||a.movingLine>6){err(key,'identity','Invalid month/line');continue;}
   const old=oldFor(bundle,a);if(!old){err(key,'baseline','No source row');continue;}
   counts[a.outcome]=(counts[a.outcome]||0)+1;
   if(!['favourable','difficult'].includes(a.outcome))err(key,'outcome','Unexpected code');
   if(a.outcome!==old[2]||a.judgment!==old[9])err(key,'baseline-decision','Changed outcome/judgment requires a separately implemented, evidence-bound correction review');
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
   const first=a.paragraphs[0].split(/[。！？]/u)[0];
   const negative=/不能通过|过不了|无法通过|不会通过|不能过关/u.test(first);
   const positive=/(?:能|能够|可以)通过|能过关|能够过关|本轮能过|这一轮能过|这轮能过/u.test(first.replace(/不能通过|无法通过|不会通过|不能过关/gu,''));
   if(a.outcome==='difficult'?!negative:!positive||negative)err(key,'opening-verdict',first);
   const shortFirst=a.short.split(/[。！？]/u)[0];
   if(a.outcome==='difficult'&&!/不能通过|过不了|无法通过|不会通过|不能过关/u.test(shortFirst))err(key,'short-verdict',shortFirst);
   if(a.outcome==='favourable'&&!/(?:能|能够|可以)通过|能过关|能够过关|本轮能过|这一轮能过|这轮能过/u.test(shortFirst))err(key,'short-verdict',shortFirst);
   if(/\{\{|\bTODO\b|\[待(?:补|写)\]/u.test(body+a.short))err(key,'placeholder','Unfinished prose');
   const qiKey=`${a.movingLine}/${QI[a.monthBranch]}`,sig=JSON.stringify([a.outcome,a.judgment,timingSignature(a.timing)]);
   if(sameQi.has(qiKey)&&sameQi.get(qiKey)!==sig)err(key,'same-qi','Judgment or timing structure differs within same seasonal qi');sameQi.set(qiKey,sig);
   const nb=normalize(body);if(seenBody.has(nb))report.duplicateArticles.push([seenBody.get(nb),key]);else seenBody.set(nb,key);
   for(const [pidx,p] of a.paragraphs.entries()) {
    const pk=`${key}/p${pidx+1}`,np=normalize(p);if(seenParagraph.has(np))report.duplicateParagraphs.push([seenParagraph.get(np),pk]);else seenParagraph.set(np,pk);
    for(const s of stripQuotes(p).split(/[。！？]/u))if(han(s)>=24){const ns=normalize(s);if(seenSentence.has(ns))report.duplicateLongSentences.push({first:seenSentence.get(ns),second:pk,sentence:s});else seenSentence.set(ns,pk);}
   }
   const independent=independentFacts(id,a.movingLine,a.monthBranch),r=readingFor(ctx,id,a),row=rowFor(bundle,a);
   compare(key,'primaryBits',independent.bits,r.stages.primary.bitsBottomUp);
   compare(key,'stageIds',independent.stageIds,Object.values(r.stages).map(s=>s.id));
   compare(key,'lineLabel',independent.lineLabel,r.selectedMovingLine.label);
   for(const n of independent.nodes) {const actual=r.nodes.find(x=>x.role===n.role);for(const f of ['trigram','element','qi'])compare(key,`${n.role}.${f}`,n[f],f==='qi'?actual.strength.state:actual[f]);}
   for(const edge of independent.relations)compare(key,`${edge.role}.relation`,edge.type,r.edges.find(e=>e.targetRole===edge.role)?.type);
   if(row) {compare(key,'storedStageIds',independent.stageIds,row.facts.stages.map(s=>s.id));compare(key,'storedLineText',r.selectedMovingLine.text,row.facts.movingLine.fullText);}
   try {
    for(const date of ['2026-11-11','2026-12-31']) {
     const timing=resolveTiming(readingFor(ctx,id,a,date),a,date);report.dateCases++;
     for(const w of timing.dateMatches)if(w.displayedDates.some(d=>d<date))err(key,'past-date',{date,dates:w.displayedDates});
     if(timing.slots.some(s=>/^(name-support|name-body)$/.test(s.kind)&&a.outcome!=='favourable'))err(key,'timing-verdict','Favourable-result window on difficult verdict');
     const later=resolveTiming(readingFor(ctx,id,a,date),a,date,'2027-02-01');
     if(JSON.stringify(timing.dateMatches.map(m=>m.displayedDates))!==JSON.stringify(later.dateMatches.map(m=>m.displayedDates)))err(key,'history-date','Viewing date rolled saved candidate dates');
    }
   }catch(e){err(key,'timing',e.message);}
   if(doc)for(const [label,value] of [['title',a.title],['short',a.short],...a.paragraphs.map((p,i)=>['paragraph '+(i+1),p])])if(!doc.includes(value))err(key,'reading-document',`${label} missing from Markdown`);
  }
  if(!draft)for(let line=1;line<=6;line++)for(const month of MONTHS)if(!keys.has(`${line}/${month}`))err(`${id}/${line}/${month}`,'month-key','Missing');
  report.hexagrams.push(detail);
 }
 for(const field of ['duplicateArticles','duplicateParagraphs','duplicateLongSentences'])if(report[field].length)err('all',field,report[field].length);
 report.status=report.errors.length?'failed':'passed';return report;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
 const args=process.argv.slice(2),value=flag=>args.includes(flag)?args[args.indexOf(flag)+1]:null;
 const ids=value('--hex')?.split(',').map(Number);
 const report=await auditMonthly({ids,draft:args.includes('--draft'),docs:args.includes('--docs')});
 if(value('--json'))await writeFile(value('--json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({status:report.status,articles:report.articleCount,hexagrams:report.hexagrams.length,bodyHanRange:report.bodyHanRange,shortHanRange:report.shortHanRange,chartComparisons:report.chartComparisons,chartMismatches:report.chartMismatches.length,dateCases:report.dateCases,errors:report.errors.slice(0,30),duplicateLongSentences:report.duplicateLongSentences.slice(0,12),flexibleLengthWarnings:report.warnings.length},null,2));
 process.exitCode=report.errors.length?1:0;
}
