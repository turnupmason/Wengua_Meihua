// Combine already-written reader reports. This program never creates reading findings.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {LOST_OBJECT_CONTINUATION_CAMPAIGN,inspectLostObjectContinuationBatch} from './check-lost-object-continuation-20261121.mjs';
const ROOT=new URL('../../',import.meta.url);
const SOURCE='sources/editorial/lost-object-recovery';
const REVIEW=SOURCE+'/reviews-depth-continuation-20261121';
const HISTORY=SOURCE+'/polish-history/before-depth-continuation-20261121';
const QUESTION='search.lost-object.recovery';
const fields=['title','short','opening','process','ending','summary'];
const sha=value=>createHash('sha256').update(value).digest('hex');
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const copy=row=>Object.fromEntries(fields.map((field,i)=>[field,row[i+3]]));
const read=async path=>{const bytes=await readFile(new URL(path,ROOT));return {path,bytes,value:JSON.parse(bytes)};};
const save=async(path,value)=>writeFile(new URL(path,ROOT),JSON.stringify(value,null,2)+'\n');
const fail=message=>{throw Error(message);};
const ids=process.argv.slice(2).flatMap(arg=>arg.split(',')).map(Number);
if(!ids.length||new Set(ids).size!==ids.length||ids.some(id=>!LOST_OBJECT_CONTINUATION_CAMPAIGN.allowedHexagrams.includes(id)))fail('Supply distinct hexagram IDs from 4 through 37.');
for(const primaryId of ids){
 const filename='hex-'+String(primaryId).padStart(3,'0')+'.json';
 const [source,baseline,direction,image,previous,author,peer]=await Promise.all([
  read(SOURCE+'/'+filename),read(REVIEW+'/baselines/'+filename),read(SOURCE+'/directions/'+filename),read(SOURCE+'/images/'+filename),
  read(HISTORY+'/'+filename),read(REVIEW+'/author-reports/'+filename),read(REVIEW+'/peer-reports/'+filename),
 ]);
 const a=author.value,p=peer.value;
 for(const [kind,report]of [['author',a],['peer',p]]){
  if(report.campaign!==LOST_OBJECT_CONTINUATION_CAMPAIGN.id||report.primaryId!==primaryId||report.sourceSha256!==sha(source.bytes))fail(filename+': '+kind+' report is for different source bytes/campaign.');
  if(!report[kind+'Agent']||!Number.isFinite(Date.parse(report.reviewedAt))||report.entries?.length!==30||new Set(report.entries.map(x=>x.rowIndex)).size!==30)fail(filename+': invalid '+kind+' identity/date/coverage.');
  if(!Array.isArray(report.readSources)||!report.readSources.length)fail(filename+': '+kind+' must record actual source read scopes.');
 }
 if(a.authorAgent===p.peerAgent)fail(filename+': the second reader must be distinct.');
 if(!a.baselineCommit||!equal(baseline.value.map(r=>r.slice(0,3)),source.value.map(r=>r.slice(0,3))))fail(filename+': original outcomes changed.');
 if(!equal(baseline.value.map(r=>r[10]),source.value.map(r=>r[10])))fail(filename+': complete original timing changed.');
 const entries=source.value.map((row,rowIndex)=>{
  const before=baseline.value[rowIndex],ae=a.entries.find(x=>x.rowIndex===rowIndex),pe=p.entries.find(x=>x.rowIndex===rowIndex);
  const d=direction.value.entries.find(x=>x.movingLine===row[0]),im=image.value.entries.find(x=>x.movingLine===row[0]);
  const c=copy(row),assembled={...c,ending:c.ending+' '+d.text+' '+im.text};
  const hashes={reviewedRowSha256:sha(JSON.stringify(row)),copySha256:sha(JSON.stringify(c)),assembledCopySha256:sha(JSON.stringify(assembled))};
  for(const [kind,r]of [['author',ae],['peer',pe]]){
   if(!r||r[kind+'FullRead']!==true)fail(filename+'/'+rowIndex+': missing real '+kind+' full read.');
   for(const [field,value]of Object.entries(hashes))if(r[field]!==value)fail(filename+'/'+rowIndex+': '+kind+' '+field+' differs; reread the changed row.');
   if(!r[kind==='author'?'reviewFinding':'peerFinding'])fail(filename+'/'+rowIndex+': missing '+kind+' finding.');
  }
  return {rowIndex,primaryId,id:[QUESTION,primaryId,row[0],row[1],row[2]].join('/'),movingLine:row[0],monthOrder:row[1],outcome:row[2],
   ...hashes,authorReviewedRowSha256:hashes.reviewedRowSha256,peerReviewedRowSha256:hashes.reviewedRowSha256,
   authorAgent:a.authorAgent,peerAgent:p.peerAgent,authorReviewedAt:ae.reviewedAt??a.reviewedAt,peerReviewedAt:pe.reviewedAt??p.reviewedAt,
   authorFullRead:true,peerFullRead:true,outcomePreserved:true,timingPreserved:true,
   beforeCopySha256:sha(JSON.stringify(copy(before))),originalJudgment:before[9],revisedJudgment:row[9],
   reviewFinding:ae.reviewFinding,peerFinding:pe.peerFinding,
   authorLineMeaningReview:ae.lineMeaningReview??ae.authorLineMeaningReview,
   authorSupplementReview:ae.supplementReview??ae.authorSupplementReview,
   authorCounterevidenceResolution:ae.counterevidenceResolution??row[9],
   authorOpenQuestions:ae.openQuestions??[],peerOpenQuestions:pe.openQuestions??[],openQuestions:[...(ae.openQuestions??[]),...(pe.openQuestions??[])],
   directionTextSha256:sha(d.text),imageTextSha256:sha(im.text),
   humanProfessionalReview:'pending',userAcceptedThisVersion:false};
 });
 const full={schemaVersion:'1.0.0',campaign:LOST_OBJECT_CONTINUATION_CAMPAIGN.id,primaryId,questionId:QUESTION,
  sourcePath:source.path,sourceSha256:sha(source.bytes),baselineCommit:a.baselineCommit,baselinePath:baseline.path,baselineSha256:sha(baseline.bytes),
  directionPath:direction.path,directionSourceSha256:sha(direction.bytes),imagePath:image.path,imageSourceSha256:sha(image.bytes),
  authorAgent:a.authorAgent,peerAgent:p.peerAgent,authorReviewedAt:a.reviewedAt,peerReviewedAt:p.reviewedAt,
  sourceRead:a.readSources,peerSources:p.readSources,
  authorReportPath:author.path,authorReportSha256:sha(author.bytes),peerReportPath:peer.path,peerReportSha256:sha(peer.bytes),
  integrationScope:'Validated and combined two existing reports; no findings or reader attestations generated by this script.',
  reviewerIsHuman:false,humanProfessionalReview:'pending',userAcceptedThisVersion:false,realWorldPredictionAccuracy:'not-validated',entries};
 const active={standard:'V5.0',actor:'single-ai-literary-editor',campaign:full.campaign,editorAgent:a.authorAgent,
  sourcePath:source.path,originalCommit:a.baselineCommit,fullReviewPath:REVIEW+'/'+filename,monthKeyCount:72,
  previousReceiptPath:previous.path,previousReceiptSha256:sha(previous.bytes),
  entries:entries.map(e=>({rowIndex:e.rowIndex,id:e.id,outcome:e.outcome,status:'POLISH_COMPLETED',reason:e.reviewFinding,
   reviewedAt:e.authorReviewedAt,beforeCopySha256:e.beforeCopySha256,afterCopySha256:e.copySha256,assembledCopySha256:e.assembledCopySha256}))};
 await save(REVIEW+'/'+filename,full);
 await save(SOURCE+'/polish/'+filename,active);
 const checked=await inspectLostObjectContinuationBatch({primaryId});
 if(checked.issues.length)fail(JSON.stringify(checked.issues,null,2));
 console.log(filename+': final source, previous receipt, both reports and all 30 rows bound.');
}
