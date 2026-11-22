// 核验已写定的失物长稿与审读回执。此程序不生成正文，也不签署全文阅读。
// node scripts/review/check-lost-object-polish.mjs [--json path] [--questions-md path]
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {independentFacts,MONTHS,QI,han,normalize,stripQuotes} from './monthly-lib.mjs';
import {loadLibrary} from '../../src/index.js';
import {createContextualReading,promotionTimingSlots,LOST_OBJECT_RECOVERY_PROFILE} from '../../src/interview-manuscripts.js';
import {resolveManuscriptDates} from '../../src/prewritten-manuscripts.js';
import {validateStoryCopy} from '../../src/story-editorial.js';

const sourceDir='sources/editorial/lost-object-recovery';
const dataDir='data/authored-readings/lost-object-recovery';
const campaign='lost-object-polish-20261120';
const json=async path=>JSON.parse(await readFile(path,'utf8'));
const sha=text=>createHash('sha256').update(text).digest('hex');
const copyOf=d=>Object.fromEntries(['title','short','opening','process','ending','summary'].map((k,i)=>[k,d[i+3]]));
const byRole=nodes=>[...nodes].sort((a,b)=>a.role.localeCompare(b.role));
const orderedNodes=nodes=>byRole(nodes.map(n=>({role:n.role,trigram:n.trigram,element:n.element,qi:n.qi})));
const report={schemaVersion:'1.0.0',campaign,scope:'source-export-review-binding-and-independent-chart-check',
 checkedBaseArticles:0,checkedMonthKeys:0,comparisons:0,chartComparisons:0,polishedArticles:0,polishedMonthKeys:0,
 bodyHanRange:[Infinity,0],shortHanRange:[Infinity,0],dateCases:0,hexagrams:[],errors:[],warnings:[],
 openInterpretationQuestions:[],humanProfessionalReview:'pending',userAcceptedThisVersion:false,
 semanticReview:'separate-author-and-peer-receipts;not-inferred-from-machine-checks',realWorldPredictionAccuracy:'not-validated'};
const err=(key,check,detail)=>report.errors.push({key,check,detail});
const warn=(key,check,detail)=>report.warnings.push({key,check,detail});
const compare=(key,check,a,b)=>{report.comparisons++;if(check.startsWith('independent-'))report.chartComparisons++;if(JSON.stringify(a)!==JSON.stringify(b))err(key,check,{expected:a,actual:b});};
const library=await loadLibrary();
const question={id:'search.lost-object.recovery',mode:'narrative',question_type:'lost_object_recovery',question:'丢失的这件物品还能找回来吗？',sourceDomainIds:['domain-15']};
const allSentences=new Map(),allParagraphs=new Map(),openings=new Map();
const interpretationRows=[];
const files=(await readdir(sourceDir)).filter(f=>/^hex-\d{3}\.json$/.test(f)).sort();
for(const filename of files){
 const id=Number(filename.slice(4,7)),sourcePath=`${sourceDir}/${filename}`;
 const raw=await readFile(sourcePath,'utf8'),drafts=JSON.parse(raw),shard=await json(`${dataDir}/${filename}`);
 const directions=await json(`${sourceDir}/directions/${filename}`),images=await json(`${sourceDir}/images/${filename}`);
 let polish=null;try{polish=await json(`${sourceDir}/polish/${filename}`);}catch(e){if(e.code!=='ENOENT')throw e;}
 const current=polish?.campaign===campaign;
 const review=current?await json(polish.fullReviewPath):null;
 const document=current?await readFile(`docs/lost-object-recovery/${filename.replace('.json','.md')}`,'utf8'):null;
 if(drafts.length!==30||shard.rows.length!==30||Object.keys(shard.monthSlots).length!==72)err(id,'coverage','Expected 30 bodies and 72 month keys');
 if(current){
  report.hexagrams.push(id);
  if(review.primaryId!==id||review.sourceSha256!==sha(raw)||review.entries?.length!==30)err(id,'full-review-binding','Source hash, identity or entry count differs');
  if(review.authorAgent===review.peerAgent)err(id,'peer-identity','Second reader must differ from the author');
 }
 for(const [i,d] of drafts.entries()){
  const key=`${id}/${d[0]}/${d[1]}`,r=shard.rows[i],direction=directions.entries.find(x=>x.movingLine===d[0]),image=images.entries.find(x=>x.movingLine===d[0]);
  const copy=copyOf(d),assembled={...copy,ending:copy.ending+' '+direction.text+' '+image.text};
  report.checkedBaseArticles++;
  compare(key,'export-copy',Object.values(assembled),[r.copy.title,r.copy.short.text,r.copy.long.opening,r.copy.long.process,r.copy.long.ending,r.copy.long.summary]);
  compare(key,'export-outcome',d[2],r.decision.outcomeCode);
  compare(key,'export-judgment',d[9],r.decision.counterevidence[0].resolution);
  if(Array.isArray(d[10]))compare(key,'export-timing',d[10],r.timingSpecs);
  else compare(key,'export-no-timing',d[10],r.timingOmission?.reason);
  for(const month of MONTHS.filter(m=>QI[m]===d[1])){
   report.checkedMonthKeys++;
   const facts=independentFacts(id,d[0],month);
   compare(key+'/'+month,'month-key',i,shard.monthSlots[d[0]+':'+month]);
   compare(key+'/'+month,'independent-stages',facts.stageIds,r.stageIds);
   compare(key+'/'+month,'independent-nodes',orderedNodes(facts.nodes),orderedNodes(r.facts.nodes));
   compare(key+'/'+month,'independent-relations',byRole(facts.relations),byRole(r.facts.directRelations));
  }
  if(!current)continue;
  report.polishedArticles++;report.polishedMonthKeys+=r.monthBranches.length;
  const entry=polish.entries.find(x=>x.rowIndex===i),read=review.entries.find(x=>x.rowIndex===i);
  const copyHash=sha(JSON.stringify(copy)),assembledHash=sha(JSON.stringify(assembled));
  if(entry?.afterCopySha256!==copyHash||entry?.assembledCopySha256!==assembledHash)err(key,'polish-hash','Base or assembled text changed since review');
  if(read?.copySha256!==copyHash||read?.assembledCopySha256!==assembledHash||read?.authorFullRead!==true||read?.peerFullRead!==true||!read?.reviewFinding||!read?.peerFinding)err(key,'full-read-receipt','Missing concrete author/peer review or stale text binding');
  if(read?.reviewedRowSha256&&read.reviewedRowSha256!==sha(JSON.stringify(d)))err(key,'author-row-digest','Author whole-row readback no longer matches');
  if(read?.authorFieldsSha256&&read.authorFieldsSha256!==sha(JSON.stringify(d.slice(3,10))))err(key,'author-fields-digest','Author copy-and-rule readback no longer matches');
  if(read?.outcome!==d[2]||read?.movingLine!==d[0]||read?.monthOrder!==d[1])err(key,'review-key','Review no longer matches this article');
  for(const q of read?.openQuestions??[])report.openInterpretationQuestions.push({key,question:q});
  if(read?.openQuestions?.length)interpretationRows.push({key,id,movingLine:d[0],months:r.monthBranches,outcome:d[2],title:d[3],questions:[...new Set(read.openQuestions)],filename,reviewPath:polish.fullReviewPath});
  const body=d.slice(5,9).join('\n\n'),bodyLength=han(body),shortLength=han(d[4]);
  report.bodyHanRange=[Math.min(report.bodyHanRange[0],bodyLength),Math.max(report.bodyHanRange[1],bodyLength)];
  report.shortHanRange=[Math.min(report.shortHanRange[0],shortLength),Math.max(report.shortHanRange[1],shortLength)];
  if(bodyLength<430)err(key,'body-depth',bodyLength+' Han characters excluding title, short and supplements');
  else if(bodyLength<450||bodyLength>650)warn(key,'flexible-body-length',bodyLength);
  try{validateStoryCopy({decision:r.decision,copy:r.copy,lineApplication:r.lineApplication,counterevidence:r.counterevidence});}catch(e){err(key,'existing-copy-validator',e.message);}
  for(const text of d.slice(3,9))if(!document.includes(text))err(key,'document-roundtrip','Missing exact source text');
  const opening=normalize(d[5].split(/[。！？]/u)[0]);
  if(openings.has(opening))warn(key,'same-opening',openings.get(opening));else openings.set(opening,key);
  for(const [field,p] of d.slice(5,9).entries()){
   const np=normalize(p);if(allParagraphs.has(np))err(key,'duplicate-paragraph',allParagraphs.get(np));else allParagraphs.set(np,key+'/'+field);
   for(const sentence of stripQuotes(p).split(/[。！？]/u))if(han(sentence)>=24){const ns=normalize(sentence);if(allSentences.has(ns))err(key,'duplicate-long-sentence',allSentences.get(ns));else allSentences.set(ns,key+'/'+field);}
  }
  // 两个不同起卦基准包含跨年边界；复看历史仍按原日起算。
  for(const date of ['2026-11-11','2026-12-31']){
   const reading=createContextualReading({library,question,primaryId:id,movingLine:d[0],monthBranch:r.monthBranches[0],castingDate:date,applyVoid:false});
   const slots=Array.isArray(d[10])?promotionTimingSlots(reading,d[10],d[2],LOST_OBJECT_RECOVERY_PROFILE):[];
   const resolve=viewDate=>resolveManuscriptDates({paragraphs:slots.map(s=>s.token),dateSlots:slots,reading,castingDate:date,viewDate,timingScale:'day',timingContext:{castingMethod:'pre-heaven',periodMethod:'element-qi'}});
   const a=resolve(date),b=resolve('2027-03-15');report.dateCases++;
   compare(key+'/'+date,'history-date-stability',a.dateMatches,b.dateMatches);
   for(const match of a.dateMatches??[])for(const d of match.displayedDates??[])if(d<date)err(key,'past-date',d);
  }
 }
}
const index=await json(`${dataDir}/index.json`);
compare('index','campaign-count',report.polishedArticles,index.polishCampaign?.completed);
compare('index','campaign-month-keys',report.polishedMonthKeys,index.polishCampaign?.monthKeyCount);
compare('index','remaining',810-report.polishedArticles,index.polishCampaign?.remaining);
report.status=report.errors.length?'failed':'passed';
report.articlesWithInterpretationQuestions=interpretationRows.length;
const args=process.argv.slice(2),out=args.includes('--json')?args[args.indexOf('--json')+1]:null;
if(out)await writeFile(out,JSON.stringify(report,null,2)+'\n');
const questionsOut=args.includes('--questions-md')?args[args.indexOf('--questions-md')+1]:null;
if(questionsOut){
 const resultNames={favourable:'较有希望寻回',conditional:'有条件寻回',difficult:'偏难寻回'};
 const md=['# 失物精修：逐篇解释取舍索引','',
  `本轮核查包含 ${report.polishedArticles} 篇精修正文；其中 ${interpretationRows.length} 篇的全文审读保留了 ${report.openInterpretationQuestions.length} 条具体解释意见。同一篇可以同时有作者及第二读者的意见，条数不等于互不相同的问题数。`,'',
  '这里汇总的内容来自已绑定正文版本的逐篇审读记录。各篇保持原结果码，并在正文说明正反依据；列出的取舍未因文字润色或程序检查通过而记作已经完成专业裁定。卦爻、五态、关系、导出和日期的可复算项目见[结构核查](POLISH_CHECKS_20261120.json)。','',
  '本索引只整理既有意见，不生成新断语，也不代替后续对古籍通则与具体爻义的定权。对应全文及完整审读材料在每项下方链接。',''];
 let last=null;
 for(const row of interpretationRows){
  if(row.id!==last){md.push(`## 第${row.id}卦`,'');last=row.id;}
  md.push(`### 第${row.movingLine}爻 · ${row.months.join('、')}月`,'',`**${row.title}**。原结果：${resultNames[row.outcome]}。`,'',
   ...row.questions.map(q=>'- '+q),'',
   `[阅读正文](${row.filename.replace('.json','.md')}) · [完整规则及全文审读](../../${row.reviewPath})`,'');
 }
 await writeFile(questionsOut,md.join('\n'));
}
console.log(JSON.stringify({...report,openInterpretationQuestions:report.openInterpretationQuestions.length,errors:report.errors.slice(0,40),warnings:report.warnings.slice(0,12)},null,2));
if(report.errors.length)process.exitCode=1;
