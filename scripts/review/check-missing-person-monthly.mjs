// Deterministic checks for the new search preview. This never writes an author/reader receipt.
import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {MONTHS,QI,stem,sha256,han,normalize,stripQuotes,independentFacts,SCOPE,QUESTION_ID,SOURCE_DIR,REVIEW_DIR,SECOND_REVIEW_DIR,DOC_DIR,DEMO_DATE,VERDICTS,context,listIds,readingFor,resolveTiming,referencesFor,renderHex} from './missing-person-monthly-lib.mjs';

const DAY_BRANCHES={金:[...'申酉'],木:[...'寅卯'],水:[...'亥子'],火:[...'巳午'],土:[...'辰戌丑未']};
const REL={support:'use_generates_body',equal:'equal',control:'use_controls_body'};
const PUBLIC_INTERNAL=/口径|定档|原稿|审计|稿件|待核|R\d|TODO|\[待(?:补|写)\]/u;
const OUTCOME_WORDS={
 favourable:/寻得|寻回|找到|找回|寻见|找到本人|寻获/u,
 conditional:/机会|余地|仍可|尚可|可望|有望|可寻|能寻|能够寻|找得|可以找到|有条件|若|只要|前提/u,
 difficult:/难|不易|找不到|寻不到|未能|不能|寻不回|找不回/u,
};
const maybeJSON=async path=>{try{return JSON.parse(await readFile(path,'utf8'));}catch(e){if(e.code==='ENOENT')return null;throw e;}};
const grams=text=>{const s=normalize(stripQuotes(text)),set=new Set();for(let i=0;i<s.length-2;i++)set.add(s.slice(i,i+3));return set;};
function jaccard(a,b){let intersection=0;for(const x of a)if(b.has(x))intersection++;return intersection/(a.size+b.size-intersection||1);}

// Independent Gregorian Julian day arithmetic; no call to the repository day-calendar helper.
export function independentDayBranch(date){
 const [y,m,d]=date.split('-').map(Number),a=Math.floor((14-m)/12),yy=y+4800-a,mm=m+12*a-3;
 const jdn=d+Math.floor((153*mm+2)/5)+365*yy+Math.floor(yy/4)-Math.floor(yy/100)+Math.floor(yy/400)-32045;
 return [...'子丑寅卯辰巳午未申酉戌亥'][((jdn+49)%12+12)%12];
}
function independentDates(castingDate,branches){
 const [y,m]=castingDate.split('-').map(Number),wanted=new Set(branches),maxOffset=y===2099&&m===12?0:1;
 for(let offset=0;offset<=maxOffset;offset++){
  const start=offset?new Date(Date.UTC(y,m,1)):new Date(castingDate+'T00:00:00Z');
  const end=new Date(Date.UTC(y,m+offset,0));const result=[];
  for(let t=start.getTime();t<=end.getTime();t+=86400000){const date=new Date(t).toISOString().slice(0,10);if(wanted.has(independentDayBranch(date)))result.push(date);}
  if(result.length)return result.slice(0,2);
 }
 return [];
}
export async function auditMissingMonthly({ids,draft=false,docs=false,requireSecond=false}={}){
 ids=ids||await listIds();const ctx=await context(),all=await listIds();
 const report={schemaVersion:'1.0.0',scopeVersion:SCOPE,questionId:QUESTION_ID,demoDate:DEMO_DATE,plannedArticles:4608,articleCount:0,authorReadbackArticles:0,secondReadArticles:0,hexagrams:[],articleChecks:[],errors:[],warnings:[],duplicates:[],nearDuplicates:[],chartComparisons:0,dateCases:0,bodyHanRange:[null,null],bodyHanExcludingQuotesRange:[null,null],shortHanRange:[null,null],humanProfessionalReview:'pending',userIndividuallyAccepted:false,realWorldPredictionAccuracy:'not-validated',reviewGeneratedByScript:false};
 const error=(key,check,detail)=>report.errors.push({key,check,detail});
 const warn=(key,check,detail)=>report.warnings.push({key,check,detail});
 const compare=(key,check,a,b)=>{report.chartComparisons++;if(JSON.stringify(a)!==JSON.stringify(b))error(key,check,{independent:a,engine:b});};
 const seen={body:new Map(),paragraph:new Map(),sentence:new Map(),title:new Map(),opening:new Map()};
 const gramBodies=[],starterGroups=new Map();
 function checkCopy(key,a,selected){
  const body=a.paragraphs.join('\n\n'),n=normalize(body),first=a.paragraphs[0].split(/[。！？]/u)[0];
  const add=(kind,text,owner)=>{if(!text)return;const prev=seen[kind].get(text);if(prev&&(selected||ids.includes(Number(prev.split('/')[0])))){report.duplicates.push({kind,first:prev,second:owner,text:kind==='sentence'?text:undefined});}else seen[kind].set(text,owner);};
  add('body',n,key);add('title',a.title,key);add('opening',normalize(first),key);
  for(const [i,p] of a.paragraphs.entries()){
   add('paragraph',normalize(p),key+'/p'+(i+1));
   for(const sentence of stripQuotes(p).split(/[。！？]/u))if(han(sentence)>=24)add('sentence',normalize(sentence),key+'/p'+(i+1));
  }
  const start=normalize(first).slice(0,12);if(start.length>=10){if(!starterGroups.has(start))starterGroups.set(start,[]);starterGroups.get(start).push(key);}
  const g=grams(body);for(const prev of gramBodies){if(!selected&&!prev.selected)continue;const score=jaccard(g,prev.grams);if(score>=0.64)report.nearDuplicates.push({first:prev.key,second:key,similarity:Number(score.toFixed(3))});}
  gramBodies.push({key,grams:g,selected});
 }
 for(const id of all.filter(id=>!ids.includes(id))){
  const source=await maybeJSON(`${SOURCE_DIR}/${stem(id)}.json`);
  for(const a of source?.articles||[])if(Array.isArray(a.paragraphs)&&a.paragraphs.length)checkCopy(`${id}/${a.movingLine}/${a.monthBranch}`,a,false);
 }
 for(const id of ids){
  const path=`${SOURCE_DIR}/${stem(id)}.json`,raw=await readFile(path,'utf8'),source=JSON.parse(raw),digest=sha256(raw);
  const old=await maybeJSON(`sources/editorial/missing-contact/${stem(id)}.json`);
  const receipt=await maybeJSON(`${REVIEW_DIR}/${stem(id)}.json`),second=await maybeJSON(`${SECOND_REVIEW_DIR}/${stem(id)}.json`);
  if(source.schemaVersion!=='1.0.0'||source.scopeVersion!==SCOPE||source.questionId!==QUESTION_ID||source.primaryId!==id)error(String(id),'scope-identity','New search preview requires its own explicit scope and identity');
  if(!/^[0-9a-f]{40}$/.test(source.baselineCommit||''))error(String(id),'baseline-commit','Missing exact source commit');
  if(!Array.isArray(source.articles)){error(String(id),'articles','Expected array');continue;}
  if(!draft&&source.articles.length!==72)error(String(id),'coverage',`Expected 72 independently authored monthly articles; got ${source.articles.length}`);
  const detail={primaryId:id,name:ctx.library.getHexagram(id).name,articles:source.articles.length,sourceSha256:digest,bodyHanRange:[null,null],bodyHanExcludingQuotesRange:[null,null],outcomes:{favourable:0,conditional:0,difficult:0},authorReadback:0,secondReadback:0};
  const expected=new Set(source.articles.map(a=>`${id}/${a.movingLine}/${a.monthBranch}`));
  const expectedArticleHashes=new Map(source.articles.map(a=>[`${id}/${a.movingLine}/${a.monthBranch}`,sha256(JSON.stringify(a))]));
  if(!draft){
   if(!receipt)error(String(id),'author-readback','Author receipt missing');
   else{
    if(receipt.sourceSha256!==digest||receipt.primaryId!==id||receipt.scopeVersion!==SCOPE)error(String(id),'author-version','Author receipt does not bind this final file/scope');
    if(receipt.wholeArticlesRead!==72||receipt.reviewerIsHuman!==false||receipt.userIndividuallyAccepted!==false||receipt.status!=='author-readback-complete'||typeof receipt.editor!=='string'||!receipt.editor.trim()||receipt.realWorldPredictionAccuracy!=='not-validated')error(String(id),'author-scope','Read count, status, reviewer identity, or validation scope is invalid');
    const keys=new Set((receipt.articleReviews||[]).map(x=>x.key));
    if(keys.size!==72||receipt.articleReviews.length!==72||[...expected].some(k=>!keys.has(k)))error(String(id),'author-article-reviews','Every article needs its actual readback note');
    for(const note of receipt.articleReviews||[])if(typeof note.finding!=='string'||han(note.finding)<8)error(note.key,'author-note','Specific reading note is missing');
    for(const note of receipt.articleReviews||[])if(note.articleSha256!==expectedArticleHashes.get(note.key))error(note.key,'author-article-version','The actual article read must match this final article, including hints and timing');
    if((receipt.lineReviews||[]).length!==6)error(String(id),'author-line-reviews','Six complete moving-line readings required');
    if(!receipt.sourceEvidence?.length)error(String(id),'author-source-evidence','Actual source-reading evidence is missing');
    if((receipt.findings||[]).some(x=>x.status==='open-blocking'))error(String(id),'author-open-findings','Unresolved blocking author finding');
    if(receipt.sourceSha256===digest&&receipt.wholeArticlesRead===72&&keys.size===72){detail.authorReadback=72;report.authorReadbackArticles+=72;}
   }
   if(requireSecond&&!second)error(String(id),'second-readback','Independent AI reader receipt missing');
   if(second){
    if(second.sourceSha256!==digest||second.primaryId!==id||second.scopeVersion!==SCOPE)error(String(id),'second-version','Second reading is not bound to final file/scope');
    if(second.wholeArticlesRead!==72||second.reviewerIsHuman!==false||second.userIndividuallyAccepted!==false||second.status!=='second-read-complete'||typeof second.editor!=='string'||!second.editor.trim()||second.realWorldPredictionAccuracy!=='not-validated')error(String(id),'second-scope','Second reader identity, actual read scope, status, or validation scope is invalid');
    if(second.editor===receipt?.editor)error(String(id),'second-identity','Author and independent reader task must differ');
    const keys=new Set((second.articleReviews||[]).map(x=>x.key));
    if(keys.size!==72||second.articleReviews.length!==72||[...expected].some(k=>!keys.has(k)))error(String(id),'second-article-reviews','Every article needs a specific second-reading note');
    for(const note of second.articleReviews||[])if(typeof note.finding!=='string'||han(note.finding)<8)error(note.key,'second-note','Specific second-reading note is missing');
    for(const note of second.articleReviews||[])if(note.articleSha256!==expectedArticleHashes.get(note.key))error(note.key,'second-article-version','The actual article read must match this final article, including hints and timing');
    if((second.lineReviews||[]).length!==6||!second.sourceEvidence?.length)error(String(id),'second-source-evidence','Six moving-line summaries and actual source-reading evidence are required');
    if((second.findings||[]).some(x=>x.status==='open-blocking'))error(String(id),'second-open-findings','Unresolved blocking review finding');
    if(second.sourceSha256===digest&&second.wholeArticlesRead===72&&keys.size===72){detail.secondReadback=72;report.secondReadArticles+=72;}
   }
  }
  const keys=new Set(),sameQi=new Map();
  for(const [i,a] of source.articles.entries()){
   const key=`${id}/${a.movingLine}/${a.monthBranch}`;report.articleCount++;
   if(keys.has(key))error(key,'duplicate-key','Duplicate monthly article');keys.add(key);
   if(a.movingLine!==Math.floor(i/12)+1||a.monthBranch!==MONTHS[i%12])error(key,'order','Expected six moving lines, each 寅卯辰巳午未申酉戌亥子丑');
   if(!QI[a.monthBranch]||!Number.isInteger(a.movingLine)||a.movingLine<1||a.movingLine>6){error(key,'identity','Invalid month or moving line');continue;}
   if(!(a.outcome in VERDICTS))error(key,'outcome','Unknown search judgment');else detail.outcomes[a.outcome]++;
   if(!Array.isArray(a.paragraphs)||a.paragraphs.length<3||a.paragraphs.some(x=>typeof x!=='string'||!x.trim())){error(key,'paragraphs','Missing authored natural paragraphs');continue;}
   const body=a.paragraphs.join('\n\n'),bodyHan=han(body),bodyHanExcludingQuotes=han(stripQuotes(body)),shortHan=han(a.short||'');
   for(const [object,field,count] of [[report,'bodyHanRange',bodyHan],[detail,'bodyHanRange',bodyHan],[report,'bodyHanExcludingQuotesRange',bodyHanExcludingQuotes],[detail,'bodyHanExcludingQuotesRange',bodyHanExcludingQuotes],[report,'shortHanRange',shortHan]])object[field]=[Math.min(object[field][0]??Infinity,count),Math.max(object[field][1]??0,count)];
   if(bodyHan<500||bodyHan>700)error(key,'body-length',{bodyHan,target:'500–650 Han, excluding hints/timing/audit'});else if(bodyHan>650)warn(key,'long-body',bodyHan);
   if(shortHan<60||shortHan>120)error(key,'short-length',shortHan);
   if(typeof a.title!=='string'||han(a.title)<5||han(a.title)>24)error(key,'title','Expected meaningful concise authored title');
   if(typeof a.judgment!=='string'||han(a.judgment)<45)error(key,'judgment','Missing substantive search judgment');
   const oldRow=old?.find(x=>x[0]===a.movingLine&&x[1]===QI[a.monthBranch]);
   if(a.judgment===oldRow?.[9])error(key,'scope-migration','Legacy contact judgment copied unchanged into person search');
   for(const field of ['placeHint','circumstanceHint','reasonHint'])if(typeof a[field]!=='string'||han(a[field])<30)error(key,field,'Missing authored explanation');
   if(PUBLIC_INTERNAL.test(body+a.short+a.title))error(key,'internal-language',(body+a.short+a.title).match(PUBLIC_INTERNAL)[0]);
   if(/\{\{|\bTODO\b|\[待(?:补|写)\]/u.test(body+a.short))error(key,'placeholder','Unfinished public text');
   if(!OUTCOME_WORDS[a.outcome]?.test(a.paragraphs[0])||!OUTCOME_WORDS[a.outcome]?.test(a.short))error(key,'opening-judgment','Opening paragraph and summary must explicitly state their search judgment');
   const qiKey=`${a.movingLine}/${QI[a.monthBranch]}`,sig=JSON.stringify([a.outcome,a.judgment,a.timing]);
   if(sameQi.has(qiKey)&&sameQi.get(qiKey)!==sig)error(key,'same-qi','Equivalent qi months must keep the same judgment and timing');sameQi.set(qiKey,sig);
   if(!Array.isArray(a.sourceRefs)||!a.sourceRefs.includes('MH-XINGREN')||!a.sourceRefs.includes('MH-XIANG')||!a.sourceRefs.includes(`ZY-${id}-${a.movingLine}`))error(key,'source-refs','Missing person, position, or actual moving-line source');
   else try{referencesFor(ctx,id,a);}catch(e){error(key,'source-refs',e.message);}
   checkCopy(key,a,true);
   const independent=independentFacts(id,a.movingLine,a.monthBranch),r=readingFor(ctx,id,a);
   compare(key,'primary-bits',independent.bits,r.stages.primary.bitsBottomUp);
   compare(key,'stage-ids',independent.stageIds,Object.values(r.stages).map(x=>x.id));
   compare(key,'moving-line',independent.lineLabel,r.selectedMovingLine.label);
   for(const n of independent.nodes){const actual=r.nodes.find(x=>x.role===n.role);for(const field of ['trigram','element','qi'])compare(key,`${n.role}.${field}`,n[field],field==='qi'?actual.strength.state:actual[field]);}
   for(const e of independent.relations)compare(key,`${e.role}.relation`,e.type,r.edges.find(x=>x.targetRole===e.role)?.type);
   const lineHan=normalize(r.selectedMovingLine.text),quotes=[...body.matchAll(/[「“]([^」”]+)[」”]/gu)].map(m=>normalize(m[1]));
   if(!quotes.some(q=>q.length>=2&&lineHan.includes(q)))error(key,'line-quotation','Body must discuss a quotation from its actual moving line');
   if(typeof a.timing!=='string'){
    if(!Array.isArray(a.timing)||a.timing.length!==1)error(key,'timing-count','At most one concrete stage event, or an authored no-date explanation');
    else for(const t of a.timing){
     if(!Array.isArray(t)||t.length!==5||!REL[t[0]]||r.edges.find(x=>x.targetRole===t[1])?.type!==REL[t[0]])error(key,'timing-relation','Timing kind/role must match the direct relation');
     if(han(t[4]||'')<25)error(key,'timing-basis','Specific event and stage basis required');
    }
   }else if(han(a.timing)<25)error(key,'no-date-reason','Explain the concrete missing timing condition');
   const dateEvidence=[];
   try{
    for(const date of [DEMO_DATE,'2026-12-31','2028-02-28']){
     const timing=resolveTiming(readingFor(ctx,id,a,date),a,date),later=resolveTiming(readingFor(ctx,id,a,date),a,date,'2028-04-01');report.dateCases++;
     if(JSON.stringify(timing.dateMatches.map(m=>m.displayedDates))!==JSON.stringify(later.dateMatches.map(m=>m.displayedDates)))error(key,'historical-date','Review date changed saved candidate dates');
     for(const m of timing.dateMatches){
      const slot=timing.slots.find(s=>s.id===m.slotId);if(!slot){error(key,'date-slot','No matching authored event slot');continue;}
      const expectedDates=independentDates(date,DAY_BRANCHES[slot.calculationBasis.element]);
      if(JSON.stringify(expectedDates)!==JSON.stringify(m.displayedDates))error(key,'date-independent',{date,expectedDates,actual:m.displayedDates});
      if(m.displayedDates.some(d=>d<date)||m.displayedDates.length>2)error(key,'date-range','Past date or excess candidates');
      if(date===DEMO_DATE)dateEvidence.push({event:slot.event,valence:slot.valence,role:slot.role,branches:slot.branches,displayedDates:m.displayedDates,scope:slot.eventScope});
     }
    }
   }catch(e){error(key,'timing',e.message);}
   report.articleChecks.push({key,outcome:a.outcome,legacyContactOutcome:oldRow?.[2]??null,legacyOutcomeIsNotSearchEvidence:true,articleSha256:sha256(JSON.stringify(a)),bodyHan,bodyHanExcludingQuotes,shortHan,facts:independent,referenceDates:dateEvidence});
  }
  if(!draft)for(let line=1;line<=6;line++)for(const month of MONTHS)if(!keys.has(`${id}/${line}/${month}`))error(`${id}/${line}/${month}`,'coverage','Missing monthly article');
  if(docs){try{const actual=await readFile(`${DOC_DIR}/${stem(id)}.md`,'utf8');if(actual!==renderHex(ctx,source))error(String(id),'render-parity','Markdown is not the exact rendering of final author source');}catch(e){error(String(id),'reading-document',e.message);}}
  report.hexagrams.push(detail);
 }
 for(const [prefix,keys] of starterGroups)if(keys.length>=4&&keys.some(k=>ids.includes(Number(k.split('/')[0]))))warn(keys.join(','),'repeated-opening-prefix',prefix);
 if(report.duplicates.length)error('all','duplicate-copy',report.duplicates.length);
 for(const pair of report.nearDuplicates)warn(pair.second,'near-duplicate-review',pair);
 report.status=report.errors.length?'failed':'passed';return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const args=process.argv.slice(2),value=flag=>args.includes(flag)?args[args.indexOf(flag)+1]:null;
 const report=await auditMissingMonthly({ids:value('--hex')?.split(',').map(Number),draft:args.includes('--draft'),docs:args.includes('--docs'),requireSecond:args.includes('--require-second')});
 if(value('--json'))await writeFile(value('--json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({status:report.status,articles:report.articleCount,authorReadback:report.authorReadbackArticles,secondRead:report.secondReadArticles,bodyHanRange:report.bodyHanRange,bodyHanExcludingQuotesRange:report.bodyHanExcludingQuotesRange,shortHanRange:report.shortHanRange,chartComparisons:report.chartComparisons,dateCases:report.dateCases,errors:report.errors.slice(0,40),duplicates:report.duplicates.slice(0,15),warnings:report.warnings.slice(0,20)},null,2));
 process.exitCode=report.errors.length?1:0;
}
