// 本轮 001–003 补深的独立门禁；不改动 2026-11-20 的 810 篇检查器。
// 核对已写定的正文、原档位/应期与实际审读者提交的回执，不生成或代签全文阅读。
// node scripts/review/check-lost-object-depth-20261121.mjs [--require-ids 1,2,3] [--json path]
import {readFile, readdir, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';

export const LOST_OBJECT_DEPTH_CAMPAIGN = Object.freeze({
 id:'lost-object-depth-20261121', targetArticles:90, targetMonthKeys:216,
 allowedHexagrams:Object.freeze([1,2,3]),
});
const SOURCE_DIR = 'sources/editorial/lost-object-recovery';
const DATA_DIR = 'data/authored-readings/lost-object-recovery';
const REVIEW_DIR = SOURCE_DIR + '/reviews-depth-20261121';
const QUESTION = 'search.lost-object.recovery';
const ORDERS = ['spring-wood','summer-fire','autumn-metal','winter-water','seasonal-earth'];
const FIELDS = ['title','short','opening','process','ending','summary'];
const ROOT = new URL('../../', import.meta.url);
const sha = value => createHash('sha256').update(value).digest('hex');
const han = value => (String(value).match(/\p{Script=Han}/gu)??[]).length;
const equal = (a,b) => JSON.stringify(a) === JSON.stringify(b);
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const date = value => nonempty(value) && Number.isFinite(Date.parse(value));
const digest = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const commit = value => typeof value === 'string' && /^[a-f0-9]{7,40}$/.test(value);
const filenameOf = id => 'hex-' + String(id).padStart(3,'0') + '.json';
export const depthCopyOf = row => Object.fromEntries(FIELDS.map((field,i) => [field,row[i+3]]));

/** Shared with the builder: validate source and receipts before any output is accepted.
 * A root URL can be supplied for isolated verification fixtures. No files are written.
 * Reading attestations remain the responsibility of the named readers, not this function.
 */
export async function inspectLostObjectDepthBatch({primaryId, root=ROOT, literaryReceipt}={}) {
 const issues = [];
 const fail = (check,detail,rowIndex) => issues.push({primaryId,...(rowIndex===undefined?{}:{rowIndex}),check,detail});
 const check = (condition,label,detail,rowIndex) => { if (!condition) fail(label,detail,rowIndex); };
 const filename = filenameOf(primaryId);
 const sourcePath = SOURCE_DIR + '/' + filename;
 const polishPath = SOURCE_DIR + '/polish/' + filename;
 const reviewPath = REVIEW_DIR + '/' + filename;
 const baselinePath = REVIEW_DIR + '/baselines/' + filename;
 const directionPath = SOURCE_DIR + '/directions/' + filename;
 const imagePath = SOURCE_DIR + '/images/' + filename;
 const read = async path => {
  try { const bytes=await readFile(new URL(path,root)); return {bytes,value:JSON.parse(bytes.toString('utf8'))}; }
  catch (error) { fail('read-json',{path,message:error.message}); return null; }
 };
 check(LOST_OBJECT_DEPTH_CAMPAIGN.allowedHexagrams.includes(primaryId),'campaign-range','Only hexagrams 001–003 belong to this campaign');
 if (issues.length) return {issues};
 const [source,baseline,direction,image,full,active] = await Promise.all([
  read(sourcePath),read(baselinePath),read(directionPath),read(imagePath),read(reviewPath),
  literaryReceipt ? Promise.resolve({value:literaryReceipt}) : read(polishPath),
 ]);
 if ([source,baseline,direction,image,full,active].some(value=>!value)) return {issues};
 const drafts=source.value, originals=baseline.value, directions=direction.value, images=image.value;
 const review=full.value, polish=active.value;
 if (!review || !polish || typeof review!=='object' || typeof polish!=='object') {
  fail('receipt-object','Active polish and full read receipts must be objects'); return {issues};
 }
 check(Array.isArray(drafts)&&drafts.length===30,'source-coverage','Expected 30 source rows');
 check(Array.isArray(originals)&&originals.length===30,'baseline-coverage','Expected 30 original source rows');
 const entries = (value,label,count,indexField) => {
  const rows = value?.entries;
  const valid = Array.isArray(rows) && rows.length===count &&
   rows.every(row=>row && Number.isInteger(row[indexField]) && row[indexField]>=(indexField==='rowIndex'?0:1) && row[indexField]<(indexField==='rowIndex'?count:count+1)) &&
   new Set(rows.map(row=>row[indexField])).size===count;
  check(valid,label,'Expected exactly '+count+' uniquely indexed entries');
  return valid;
 };
 const validPolish=entries(polish,'polish-coverage',30,'rowIndex');
 const validReview=entries(review,'full-read-coverage',30,'rowIndex');
 const validDirection=entries(directions,'direction-coverage',6,'movingLine');
 const validImage=entries(images,'image-coverage',6,'movingLine');
 check(polish.campaign===LOST_OBJECT_DEPTH_CAMPAIGN.id && polish.standard==='V5.0' && polish.actor==='single-ai-literary-editor',
  'active-campaign','Expected this campaign and the existing V5.0 actor interface');
 check(polish.sourcePath===sourcePath && polish.fullReviewPath===reviewPath && polish.monthKeyCount===72,
  'active-paths','Active receipt paths or 72-key coverage differ');
 check(review.campaign===LOST_OBJECT_DEPTH_CAMPAIGN.id && review.primaryId===primaryId && review.questionId===QUESTION,
  'review-identity','Full read campaign, question or primaryId differs');
 check(review.sourcePath===sourcePath && review.baselinePath===baselinePath,'review-paths','Full read source/baseline paths differ');
 check(commit(polish.originalCommit) && commit(review.baselineCommit) && polish.originalCommit===review.baselineCommit,
  'baseline-commit','The active receipt and full read must name the same original commit');
 check(review.sourceSha256===sha(source.bytes),'source-bytes','Final source bytes changed after the recorded reading');
 check(review.baselineSha256===sha(baseline.bytes),'baseline-bytes','Original baseline bytes differ from the read receipt');
 check(review.directionSourceSha256===sha(direction.bytes),'direction-bytes','Direction source bytes changed after the recorded reading');
 check(review.imageSourceSha256===sha(image.bytes),'image-bytes','Image source bytes changed after the recorded reading');
 check(nonempty(review.authorAgent) && nonempty(review.peerAgent) && review.authorAgent!==review.peerAgent,
  'two-readers','Named author and second reader must be distinct');
 check(nonempty(polish.editorAgent) && polish.editorAgent===review.authorAgent,'editor-identity','Active editor must match the full read author');
 check(date(review.authorReviewedAt) && date(review.peerReviewedAt),'review-dates','Both named readers need a dated reading');
 check(review.reviewerIsHuman===false && review.userAcceptedThisVersion===false,
  'review-boundary','AI reading receipts do not establish human review or user acceptance');
 for (const field of ['sourceRead','peerSources']) {
  check(Array.isArray(review[field]) && review[field].length>0 && review[field].every(entry=>nonempty(entry?.path)&&nonempty(entry?.scope)),
   'reading-source-locations',field+' must record concrete source paths and read scopes');
 }
 for (const [label,supplement] of [['direction',directions],['image',images]]) {
  check(supplement?.primaryId===primaryId && supplement?.questionId===QUESTION,label+'-identity','Supplement identity differs');
  if (Array.isArray(supplement?.entries)) for (const entry of supplement.entries) {
   check(nonempty(entry?.text) && entry.textSha256===sha(entry.text) && entry.status==='AUTHOR_READ' && date(entry.reviewedAt),
    label+'-entry-binding','Supplement text, status or date differs at moving line '+entry?.movingLine);
  }
 }
 // Archive the pre-existing receipt as bytes; it is historical evidence, not a new reading.
 const historicalPath=polish.previousReceiptPath;
 const safeHistoricalPath=typeof historicalPath==='string' &&
  new RegExp('^'+SOURCE_DIR+'/polish-history/(?:[a-zA-Z0-9_-]+/)*hex-'+String(primaryId).padStart(3,'0')+'\\.json$').test(historicalPath);
 check(safeHistoricalPath && digest(polish.previousReceiptSha256),'historical-receipt-path','A separate preserved polish receipt and its byte hash are required');
 const historical=safeHistoricalPath ? await read(historicalPath) : null;
 if (historical) {
  check(polish.previousReceiptSha256===sha(historical.bytes),'historical-receipt-bytes','The archived receipt is not the recorded original byte sequence');
  check(historical.value?.sourcePath===sourcePath && historical.value?.campaign!==LOST_OBJECT_DEPTH_CAMPAIGN.id,
   'historical-receipt-identity','The archived receipt must be the pre-existing record for this source');
 }
 const validHistorical=historical ? entries(historical.value,'historical-receipt-coverage',30,'rowIndex') : false;
 const bindings=[];
 if (!(Array.isArray(drafts)&&drafts.length===30 && Array.isArray(originals)&&originals.length===30 && validPolish && validReview && validDirection && validImage)) {
  return {issues};
 }
 for (const [rowIndex,row] of drafts.entries()) {
  const original=originals[rowIndex];
  const validRow=Array.isArray(row)&&row.length===11&&row[0]===Math.floor(rowIndex/5)+1&&row[1]===ORDERS[rowIndex%5]&&
   ['favourable','conditional','difficult'].includes(row[2])&&row.slice(3,10).every(nonempty)&&(Array.isArray(row[10])||nonempty(row[10]));
  const validOriginal=Array.isArray(original)&&original.length===11&&original[0]===Math.floor(rowIndex/5)+1&&original[1]===ORDERS[rowIndex%5];
  check(validRow,'source-row','Expected ordered, nonempty eleven-field authored row',rowIndex);
  check(validOriginal,'baseline-row','Expected the same ordered eleven-field baseline row',rowIndex);
  if (!validRow || !validOriginal) continue;
  const bodyHan=han(row.slice(5,9).join('')), shortHan=han(row[4]);
  check(bodyHan>=450 && bodyHan<=600,'body-depth-range',{actual:bodyHan,min:450,max:600,scope:'four base body fields; supplements excluded'},rowIndex);
  check(shortHan>=60 && shortHan<=120,'short-length-range',{actual:shortHan,min:60,max:120},rowIndex);
  const p=polish.entries.find(entry=>entry.rowIndex===rowIndex), r=review.entries.find(entry=>entry.rowIndex===rowIndex);
  const prior=validHistorical ? historical.value.entries.find(entry=>entry.rowIndex===rowIndex) : null;
  const d=directions.entries.find(entry=>entry.movingLine===row[0]), im=images.entries.find(entry=>entry.movingLine===row[0]);
  const copy=depthCopyOf(row), assembled={...copy,ending:copy.ending+' '+d.text+' '+im.text};
  const copySha256=sha(JSON.stringify(copy)), assembledCopySha256=sha(JSON.stringify(assembled));
  const baselineCopySha256=sha(JSON.stringify(depthCopyOf(original))), reviewedRowSha256=sha(JSON.stringify(row));
  const expectedId=[QUESTION,primaryId,row[0],row[1],row[2]].join('/');
  check(p.id===expectedId && p.outcome===row[2] && p.status==='POLISH_COMPLETED' && nonempty(p.reason) && date(p.reviewedAt),
   'active-row','Active row identity, completion or dated finding differs',rowIndex);
  check(r.movingLine===row[0] && r.monthOrder===row[1] && r.outcome===row[2],'review-row-identity','Full read row identity differs',rowIndex);
  check(equal(original.slice(0,3),row.slice(0,3)),'original-outcome','Moving line, monthly state or original outcome changed',rowIndex);
  check(equal(original[10],row[10]),'original-timing','Original complete timing value changed',rowIndex);
  check(r.outcomePreserved===true && r.timingPreserved===true,'preservation-attestation','Full read must explicitly record original outcome/timing preservation',rowIndex);
  check(p.beforeCopySha256===baselineCopySha256,'baseline-copy-binding','Active before-copy hash differs from the stored original row',rowIndex);
  if (prior) {
   check(prior.afterCopySha256===baselineCopySha256,'historical-copy-binding','Archived after-copy hash differs from the baseline row',rowIndex);
   check(prior.outcome===original[2] && prior.id===[QUESTION,primaryId,original[0],original[1],original[2]].join('/'),
    'historical-outcome-binding','Archived outcome or decision key differs from the baseline row',rowIndex);
  }
  check(p.afterCopySha256===copySha256 && r.copySha256===copySha256,'six-field-binding','Final six-field copy hash differs from a receipt',rowIndex);
  check(p.assembledCopySha256===assembledCopySha256 && r.assembledCopySha256===assembledCopySha256,
   'assembled-copy-binding','Final copy plus direction/image hash differs from a receipt',rowIndex);
  check(r.reviewedRowSha256===reviewedRowSha256 && r.authorReviewedRowSha256===reviewedRowSha256 && r.peerReviewedRowSha256===reviewedRowSha256,
   'whole-row-dual-binding','Both readers must bind the same final eleven-field row, including judgment and complete timing',rowIndex);
  check(r.authorFullRead===true && r.peerFullRead===true && nonempty(r.reviewFinding) && nonempty(r.peerFinding),
   'dual-read-attestation','Both actual readers need a full-read attestation and a concrete finding',rowIndex);
  // Optional hashes in the earlier receipt interface must remain true if retained.
  if (r.authorFieldsSha256!==undefined) check(r.authorFieldsSha256===sha(JSON.stringify(row.slice(3,10))),'author-fields-binding','Retained author-fields hash is stale',rowIndex);
  if (r.originalAuthorFieldsSha256!==undefined) check(r.originalAuthorFieldsSha256===sha(JSON.stringify(original.slice(3,10))),'original-author-fields-binding','Retained original author-fields hash is stale',rowIndex);
  bindings.push({rowIndex,copy,assembled,copySha256,assembledCopySha256,reviewedRowSha256,baselineCopySha256});
 }
 return {issues,primaryId,sourcePath,polishPath,reviewPath,baselinePath,directionPath,imagePath,drafts,originals,directions,images,review,polish,bindings};
}

async function main(args) {
 const options={requiredIds:[],jsonPath:null};
 for (let i=0;i<args.length;i++) {
  const arg=args[i];
  if (arg==='--help') {
   console.log('Usage: node scripts/review/check-lost-object-depth-20261121.mjs [--require-ids 1,2,3] [--json path]\nDefault: check all active 001–003 receipts marked lost-object-depth-20261121. No active receipt means not-started, never a 90-article pass. --require-ids fails if any requested hexagram is absent.');
   return;
  }
  if (arg==='--require-ids' || arg.startsWith('--require-ids=')) {
   const value=arg.includes('=')?arg.slice(arg.indexOf('=')+1):args[++i];
   if (!value || !/^\d+(?:,\d+)*$/.test(value)) throw new Error('--require-ids needs a comma-separated list such as 1,2,3');
   options.requiredIds=value.split(',').map(Number);
   if (new Set(options.requiredIds).size!==options.requiredIds.length || options.requiredIds.some(id=>!LOST_OBJECT_DEPTH_CAMPAIGN.allowedHexagrams.includes(id))) throw new Error('--require-ids accepts distinct IDs from 1,2,3 only');
  } else if (arg==='--json') {
   options.jsonPath=args[++i];
   if (!options.jsonPath || options.jsonPath.startsWith('--')) throw new Error('--json needs a file path');
  } else throw new Error('Unknown argument: '+arg);
 }
 const {independentFacts,MONTHS,QI,normalize,stripQuotes}=await import('./monthly-lib.mjs');
 const report={schemaVersion:'1.0.0',campaign:LOST_OBJECT_DEPTH_CAMPAIGN.id,
  scope:'marked-001-003-source-export-baseline-and-reader-binding',targetArticles:90,targetMonthKeys:216,
  requiredHexagrams:options.requiredIds,hexagrams:[],checkedArticles:0,checkedMonthKeys:0,comparisons:0,chartComparisons:0,
  byteBoundBatches:0,sixFieldBoundArticles:0,assembledBoundArticles:0,dualReadBoundArticles:0,
  originalOutcomePreserved:0,originalTimingPreserved:0,bodyHanRange:[Infinity,0],baselineBodyHanRange:[Infinity,0],shortHanRange:[Infinity,0],
  bodyDefinition:'Han characters in opening/process/base ending/summary; excludes title, short and existing supplements',
  requiredHanRanges:{body:[450,600],short:[60,120]},
  duplicationChecks:{scope:'all active 001–003 base bodies together; excludes shared direction/image supplements',
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
  if (polish.campaign!==LOST_OBJECT_DEPTH_CAMPAIGN.id) continue;
  report.hexagrams.push(primaryId);
  const batch=await inspectLostObjectDepthBatch({primaryId,literaryReceipt:polish});
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
   compare(key,'export-depth-binding',[LOST_OBJECT_DEPTH_CAMPAIGN.id,batch.reviewPath,copySha256,assembledCopySha256,reviewedRowSha256],
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
   const index=await readJSON(DATA_DIR+'/index.json'),depth=index.depthReviewCampaign;
   compare('index','total-authored-coverage',[1920,4608],[index.authoredVersionCount,index.baseCaseCount]);
   compare('index','total-polish-coverage',[1920,4608],[index.literaryPolish?.completed,index.literaryPolish?.monthKeyCount]);
   compare('index','old-campaign-identity','lost-object-polish-20261120',index.polishCampaign?.id);
   compare('index','old-campaign-preserved',[810,1944],[oldArticles,oldMonthKeys]);
   compare('index','old-campaign-counts',[oldArticles,oldMonthKeys,810-oldArticles],
    [index.polishCampaign?.completed,index.polishCampaign?.monthKeyCount,index.polishCampaign?.remaining]);
   compare('index','depth-campaign-identity',LOST_OBJECT_DEPTH_CAMPAIGN.id,depth?.id);
   compare('index','depth-campaign-target',[90,216],[depth?.targetArticles,depth?.targetMonthKeys]);
   compare('index','depth-campaign-counts',[report.checkedArticles,report.checkedMonthKeys,90-report.checkedArticles,report.hexagrams],
    [depth?.completed,depth?.monthKeyCount,depth?.remaining,depth?.hexagrams]);
   const readme=await readFile(new URL('docs/lost-object-recovery/README.md',ROOT),'utf8');
   for (const path of ['DEPTH_AUDIT_20261121.md','CLASSICAL_FOLLOWUP_20261121.md']) if (!readme.includes(']('+path+')')) error('README','depth-audit-link',path);
  } catch (failure) {error('index','published-campaign',failure.message);}
 }
 report.remainingArticles=90-report.checkedArticles;
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
