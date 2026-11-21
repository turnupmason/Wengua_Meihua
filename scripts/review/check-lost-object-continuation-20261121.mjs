// 004–037 continuation: preserve the completed 001–003 and 038–064 campaigns.
// This gate validates existing prose and two actual readers' records; it never signs a read.
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {inspectLostObjectDepthBatch,depthCopyOf} from './check-lost-object-depth-20261121.mjs';
export const LOST_OBJECT_CONTINUATION_CAMPAIGN=Object.freeze({
 id:'lost-object-depth-continuation-20261121',targetArticles:1020,targetMonthKeys:2448,
 allowedHexagrams:Object.freeze(Array.from({length:34},(_,i)=>i+4)),
});
const SOURCE_DIR='sources/editorial/lost-object-recovery';
const DATA_DIR='data/authored-readings/lost-object-recovery';
const REVIEW_DIR=SOURCE_DIR+'/reviews-depth-continuation-20261121';
const QUESTION='search.lost-object.recovery';
const FIELDS=['title','short','opening','process','ending','summary'];
const ROOT=new URL('../../',import.meta.url);
const sha=value=>createHash('sha256').update(value).digest('hex');
const han=value=>(String(value).match(/\p{Script=Han}/gu)??[]).length;
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const nonempty=value=>typeof value==='string'&&value.trim().length>0;

export async function inspectLostObjectContinuationBatch(options={}) {
 const batch=await inspectLostObjectDepthBatch({...options,campaign:LOST_OBJECT_CONTINUATION_CAMPAIGN,reviewDir:REVIEW_DIR});
 if (!batch.review||!batch.drafts) return batch;
 const {review,bindings}=batch,root=options.root??ROOT;
 const fail=(check,detail,rowIndex)=>batch.issues.push({primaryId:options.primaryId,...(rowIndex===undefined?{}:{rowIndex}),check,detail});
 for (const kind of ['author','peer']) {
  const expectedPath=REVIEW_DIR+'/'+kind+'-reports/hex-'+String(options.primaryId).padStart(3,'0')+'.json';
  if (review[kind+'ReportPath']!==expectedPath) {fail('reader-report-path',kind);continue;}
  let raw,record;
  try {raw=await readFile(new URL(expectedPath,root));record=JSON.parse(raw);}
  catch(error){fail('reader-report-read',{kind,message:error.message});continue;}
  if (review[kind+'ReportSha256']!==sha(raw)) fail('reader-report-bytes',kind);
  if(record[kind+'Agent']!==review[kind+'Agent']||record.campaign!==LOST_OBJECT_CONTINUATION_CAMPAIGN.id||record.primaryId!==options.primaryId)fail('reader-report-identity',kind);
  if(record.sourceSha256!==review.sourceSha256)fail('reader-report-source',kind);
  if(!Number.isFinite(Date.parse(record.reviewedAt)))fail('reader-report-date',kind);
  if(!Array.isArray(record.entries)||record.entries.length!==30||new Set(record.entries.map(x=>x.rowIndex)).size!==30){fail('reader-report-coverage',kind);continue;}
  for (const bound of bindings) {
   const entry=record.entries.find(x=>x.rowIndex===bound.rowIndex),merged=review.entries.find(x=>x.rowIndex===bound.rowIndex);
   if (!entry){fail('reader-report-missing-row',kind,bound.rowIndex);continue;}
   if(entry[kind+'FullRead']!==true||entry.reviewedRowSha256!==bound.reviewedRowSha256||entry.copySha256!==bound.copySha256||entry.assembledCopySha256!==bound.assembledCopySha256)fail('reader-report-row-binding',kind,bound.rowIndex);
   const finding=kind==='author'?entry.reviewFinding:entry.peerFinding;
   if(!nonempty(finding)||finding!==merged[kind==='author'?'reviewFinding':'peerFinding'])fail('reader-report-finding',kind,bound.rowIndex);
   if(!equal(entry.openQuestions??[],merged[kind+'OpenQuestions']??[]))fail('reader-report-open-questions',kind,bound.rowIndex);
  }
 }
 return batch;
}
async function main(args) {
 const options={requiredIds:[],jsonPath:null};
 for (let i=0;i<args.length;i++) {
  const arg=args[i];
  if (arg==='--help') {
   console.log('Usage: node scripts/review/check-lost-object-continuation-20261121.mjs [--require-ids 4,5,6] [--json path]\nDefault: check all active 004–037 receipts marked lost-object-depth-continuation-20261121. No active receipt means not-started, never a 1020-article pass. --require-ids fails if any requested hexagram is absent.');
   return;
  }
  if (arg==='--require-ids' || arg.startsWith('--require-ids=')) {
   const value=arg.includes('=')?arg.slice(arg.indexOf('=')+1):args[++i];
   if (!value || !/^\d+(?:,\d+)*$/.test(value)) throw new Error('--require-ids needs a comma-separated list such as 4,5,6');
   options.requiredIds=value.split(',').map(Number);
   if (new Set(options.requiredIds).size!==options.requiredIds.length || options.requiredIds.some(id=>!LOST_OBJECT_CONTINUATION_CAMPAIGN.allowedHexagrams.includes(id))) throw new Error('--require-ids accepts distinct IDs from 4 through 37 only');
  } else if (arg==='--json') {
   options.jsonPath=args[++i];
   if (!options.jsonPath || options.jsonPath.startsWith('--')) throw new Error('--json needs a file path');
  } else throw new Error('Unknown argument: '+arg);
 }
 const {independentFacts,MONTHS,QI,normalize,stripQuotes}=await import('./monthly-lib.mjs');
 const report={schemaVersion:'1.0.0',campaign:LOST_OBJECT_CONTINUATION_CAMPAIGN.id,
  scope:'marked-004-037-source-export-baseline-and-reader-binding',targetArticles:1020,targetMonthKeys:2448,
  requiredHexagrams:options.requiredIds,hexagrams:[],checkedArticles:0,checkedMonthKeys:0,comparisons:0,chartComparisons:0,
  byteBoundBatches:0,sixFieldBoundArticles:0,assembledBoundArticles:0,dualReadBoundArticles:0,
  originalOutcomePreserved:0,originalTimingPreserved:0,bodyHanRange:[Infinity,0],baselineBodyHanRange:[Infinity,0],shortHanRange:[Infinity,0],
  bodyDefinition:'Han characters in opening/process/base ending/summary; excludes title, short and existing supplements',
  requiredHanRanges:{body:[450,600],short:[60,120]},
  duplicationChecks:{scope:'all active 004–037 base bodies together; excludes shared direction/image supplements',
   openings:0,paragraphs:0,longSentences:0,longSentenceMinimumHan:24,
   method:'Compare normalized first opening sentences and whole body fields; compare sentences of at least 24 Han characters after removing quoted text. Normalization retains letters and numbers only.',
   meaning:'Exact text reuse checks only; length and uniqueness do not establish literary quality or replace either named reader.'},
  ordinaryRestBoundary:{policy:'ordinary-rest-is-not-automatically-weak',articles:0,monthKeys:0,nodeOccurrences:0,rows:[],literalReviewCandidates:[],
   meaning:'Independent chart states and literal phrase candidates only. Wording and judgment weights require the named readers; a phrase hit is not a semantic verdict.'},
  errors:[],warnings:[],humanProfessionalReview:'pending',userAcceptedThisVersion:false,
  semanticReview:'separate-author-and-peer-receipts;not-inferred-from-machine-checks',realWorldPredictionAccuracy:'not-validated'};
 const error=(key,check,detail)=>report.errors.push({key,check,detail});
 const compare=(key,check,expected,actual)=>{report.comparisons++;if(check.startsWith('independent-'))report.chartComparisons++;if(!equal(expected,actual))error(key,check,{expected,actual});};
 const readJSON=async path=>JSON.parse(await readFile(new URL(path,ROOT),'utf8'));
 const sorted=rows=>[...rows].sort((a,b)=>a.role.localeCompare(b.role));
 const nodes=rows=>sorted((rows??[]).map(({role,trigram,element,qi})=>({role,trigram,element,qi})));
 const seenOpenings=new Map(),seenParagraphs=new Map(),seenLongSentences=new Map();
 const checkDuplicate=(key,field,text,seen,label)=>{
  const normalized=normalize(text);
  if (!normalized) return;
  if (seen.has(normalized)) error(key,label,{first:seen.get(normalized),field,text});
  else seen.set(normalized,{key,field});
 };
 let oldArticles=0,oldMonthKeys=0;
 const names=(await readdir(new URL(SOURCE_DIR+'/polish/',ROOT))).filter(name=>/^hex-\d{3}\.json$/.test(name)).sort();
 for (const filename of names) {
  const primaryId=Number(filename.slice(4,7)),polish=await readJSON(SOURCE_DIR+'/polish/'+filename);
  if (polish.campaign==='lost-object-polish-20261120') {
   const completed=polish.entries.filter(entry=>entry.status==='POLISH_COMPLETED');
   oldArticles+=completed.length;
   // Earlier receipts do not declare monthKeyCount; count their existing decision keys.
   for (const entry of completed) oldMonthKeys+=MONTHS.filter(month=>QI[month]===entry.id?.split('/')[3]).length;
  }
  if (polish.campaign!==LOST_OBJECT_CONTINUATION_CAMPAIGN.id) continue;
  report.hexagrams.push(primaryId);
  const batch=await inspectLostObjectContinuationBatch({primaryId,literaryReceipt:polish});
  report.errors.push(...batch.issues.map(issue=>({key:primaryId+'/'+(issue.rowIndex??'batch'),check:issue.check,detail:issue.detail})));
  if (!batch.drafts) continue;
  if (!batch.issues.some(issue=>['source-bytes','baseline-bytes','direction-bytes','image-bytes'].includes(issue.check))) report.byteBoundBatches++;
  let shard,document;
  try {
   [shard,document]=await Promise.all([readJSON(DATA_DIR+'/'+filename),readFile(new URL('docs/lost-object-recovery/'+filename.replace('.json','.md'),ROOT),'utf8')]);
  } catch (failure) {error(primaryId,'published-files',failure.message);continue;}
  compare(primaryId,'export-identity',[primaryId,QUESTION],[shard.primaryId,shard.questionId]);
  compare(primaryId,'export-coverage',[30,72],[shard.rows?.length,Object.keys(shard.monthSlots??{}).length]);
  for (const binding of batch.bindings) {
   const {rowIndex,copy,assembled,copySha256,assembledCopySha256,reviewedRowSha256}=binding;
   const row=batch.drafts[rowIndex],original=batch.originals[rowIndex],r=shard.rows?.[rowIndex],key=primaryId+'/'+row[0]+'/'+row[1];
   const rowIssues=batch.issues.filter(issue=>issue.rowIndex===rowIndex);
   report.checkedArticles++;
   if (!rowIssues.some(issue=>issue.check==='six-field-binding')) report.sixFieldBoundArticles++;
   if (!rowIssues.some(issue=>issue.check==='assembled-copy-binding')) report.assembledBoundArticles++;
   if (!batch.issues.some(issue=>['two-readers','review-dates','editor-identity'].includes(issue.check)) && !rowIssues.some(issue=>['whole-row-dual-binding','dual-read-attestation'].includes(issue.check))) report.dualReadBoundArticles++;
   if (equal(original.slice(0,3),row.slice(0,3))) report.originalOutcomePreserved++;
   if (equal(original[10],row[10])) report.originalTimingPreserved++;
   for (const [range,value] of [['bodyHanRange',han(row.slice(5,9).join(''))],['baselineBodyHanRange',han(original.slice(5,9).join(''))],['shortHanRange',han(row[4])]]) {
    report[range][0]=Math.min(report[range][0],value);report[range][1]=Math.max(report[range][1],value);
   }
   report.duplicationChecks.openings++;
   checkDuplicate(key,'opening',copy.opening.split(/[。！？]/u)[0],seenOpenings,'duplicate-opening');
   for (const field of FIELDS.slice(2)) {
    report.duplicationChecks.paragraphs++;
    checkDuplicate(key,field,copy[field],seenParagraphs,'duplicate-paragraph');
    for (const sentence of stripQuotes(copy[field]).split(/[。！？]/u)) if (han(sentence)>=24) {
     report.duplicationChecks.longSentences++;
     checkDuplicate(key,field,sentence,seenLongSentences,'duplicate-long-sentence');
    }
   }
   if (!r) {error(key,'export-row','Missing generated row');continue;}
   compare(key,'export-row-identity',[primaryId,row[0],row[1]],[r.primaryId,r.movingLine,r.monthOrder]);
   compare(key,'export-copy',Object.values(assembled),[r.copy?.title,r.copy?.short?.text,r.copy?.long?.opening,r.copy?.long?.process,r.copy?.long?.ending,r.copy?.long?.summary]);
   compare(key,'export-outcome',row[2],r.decision?.outcomeCode);
   compare(key,'export-judgment',row[9],r.decision?.counterevidence?.[0]?.resolution);
   compare(key,'export-timing',row[10],Array.isArray(row[10])?r.timingSpecs:r.timingOmission?.reason);
   compare(key,'direct-only-policy',[],r.decision?.indirectEffectsApplied);
   const current=r.authorship?.currentLiteraryPolish;
   compare(key,'export-depth-binding',[LOST_OBJECT_CONTINUATION_CAMPAIGN.id,batch.reviewPath,copySha256,assembledCopySha256,reviewedRowSha256],
    [current?.campaign,current?.receiptPath,current?.copySha256,current?.assembledCopySha256,current?.reviewedRowSha256]);
   const expectedMetadata={scope:'full-author-row-and-existing-direction-image-supplements',
    baselinePath:batch.baselinePath,baselineSha256:batch.review.baselineSha256,
    sourceSha256:batch.review.sourceSha256,directionSourceSha256:batch.review.directionSourceSha256,imageSourceSha256:batch.review.imageSourceSha256,
    reviewedAt:batch.polish.entries.find(entry=>entry.rowIndex===rowIndex).reviewedAt,
    authorAgent:batch.review.authorAgent,peerAgent:batch.review.peerAgent,
    authorReviewedAt:batch.review.authorReviewedAt,peerReviewedAt:batch.review.peerReviewedAt,
    previousReceiptPath:batch.polish.previousReceiptPath,previousReceiptSha256:batch.polish.previousReceiptSha256,reviewerIsHuman:false};
   for (const [field,value] of Object.entries(expectedMetadata)) compare(key,'export-depth-metadata-'+field,value,current?.[field]);
   for (const [field,value] of Object.entries({...assembled,judgment:row[9]})) if (!document.includes(value)) error(key,'reading-document-field',field+' is absent from the reading document');
   const months=MONTHS.filter(month=>QI[month]===row[1]);
   compare(key,'month-branches',months,r.monthBranches);
   const facts=independentFacts(primaryId,row[0],months[0]);
   const direction=batch.directions.entries.find(entry=>entry.movingLine===row[0]),image=batch.images.entries.find(entry=>entry.movingLine===row[0]);
   compare(key,'direction-role',facts.nodes.find(node=>node.role==='changed_use').trigram,direction.changedTrigram);
   compare(key,'image-roles',['use',facts.nodes.find(node=>node.role==='use').trigram,'changed_use',facts.nodes.find(node=>node.role==='changed_use').trigram],
    [image.objectRole,image.objectTrigram,image.environmentRole,image.environmentTrigram]);
   const ordinaryRest=facts.nodes.filter(node=>node.role!=='body_inherited'&&node.qi==='休');
   if (ordinaryRest.length) {
    report.ordinaryRestBoundary.articles++;report.ordinaryRestBoundary.monthKeys+=months.length;
    report.ordinaryRestBoundary.nodeOccurrences+=ordinaryRest.length;
    report.ordinaryRestBoundary.rows.push({primaryId,rowIndex,movingLine:row[0],monthOrder:row[1],months,nodes:ordinaryRest});
   }
   for (const [field,text] of Object.entries({...copy,judgment:row[9]})) {
    const candidates=text.split(/(?<=[。！？；\n])/u).filter(sentence=>/休/u.test(sentence)&&/力薄|薄弱|衰弱|无气|乏力|微弱|气弱|力弱|轻微|偏弱|力轻|力小/u.test(sentence));
    for (const excerpt of candidates) report.ordinaryRestBoundary.literalReviewCandidates.push({primaryId,rowIndex,field,excerpt,requiresHumanOrNamedReaderInterpretation:true});
   }
   for (const month of months) {
    report.checkedMonthKeys++;
    const expected=independentFacts(primaryId,row[0],month);
    compare(key+'/'+month,'month-key',rowIndex,shard.monthSlots?.[row[0]+':'+month]);
    compare(key+'/'+month,'independent-stages',expected.stageIds,r.stageIds);
    compare(key+'/'+month,'independent-nodes',nodes(expected.nodes),nodes(r.facts?.nodes));
    compare(key+'/'+month,'independent-relations',sorted(expected.relations),sorted(r.facts?.directRelations??[]));
   }
  }
 }
 for (const id of options.requiredIds) if (!report.hexagrams.includes(id)) error(id,'required-campaign','Requested hexagram has no active receipt for this campaign');
 if (report.hexagrams.length) {
  try {
   const index=await readJSON(DATA_DIR+'/index.json'),depth=index.continuationDepthCampaign;
   compare('index','total-authored-coverage',[1920,4608],[index.authoredVersionCount,index.baseCaseCount]);
   compare('index','total-polish-coverage',[1920,4608],[index.literaryPolish?.completed,index.literaryPolish?.monthKeyCount]);
   compare('index','old-campaign-identity','lost-object-polish-20261120',index.polishCampaign?.id);
   compare('index','old-campaign-preserved',[810,1944],[oldArticles,oldMonthKeys]);
   compare('index','old-campaign-counts',[oldArticles,oldMonthKeys,810-oldArticles],
    [index.polishCampaign?.completed,index.polishCampaign?.monthKeyCount,index.polishCampaign?.remaining]);
   compare('index','depth-campaign-identity',LOST_OBJECT_CONTINUATION_CAMPAIGN.id,depth?.id);
   compare('index','depth-campaign-target',[1020,2448],[depth?.targetArticles,depth?.targetMonthKeys]);
   compare('index','depth-campaign-counts',[report.checkedArticles,report.checkedMonthKeys,1020-report.checkedArticles,report.hexagrams],
    [depth?.completed,depth?.monthKeyCount,depth?.remaining,depth?.hexagrams]);
   const readme=await readFile(new URL('docs/lost-object-recovery/README.md',ROOT),'utf8');
   for (const path of ['DEPTH_CONTINUATION_AUDIT_20261121.md']) if (!readme.includes(']('+path+')')) error('README','depth-audit-link',path);
  } catch (failure) {error('index','published-campaign',failure.message);}
 }
 report.remainingArticles=1020-report.checkedArticles;
 for (const field of ['bodyHanRange','baselineBodyHanRange','shortHanRange']) if (!Number.isFinite(report[field][0])) report[field]=null;
 report.status=report.errors.length?'failed':report.hexagrams.length?'passed':'not-started';
 if (options.jsonPath) await writeFile(options.jsonPath,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({...report,ordinaryRestBoundary:{...report.ordinaryRestBoundary,rows:report.ordinaryRestBoundary.rows.length,
  literalReviewCandidates:report.ordinaryRestBoundary.literalReviewCandidates.length},errors:report.errors.slice(0,40)},null,2));
 if (report.errors.length) process.exitCode=1;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href===import.meta.url) {
 await main(process.argv.slice(2)).catch(error=>{console.error(error.message);process.exitCode=1;});
}
