import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

export const CONTACT_LITERARY_CAMPAIGN = Object.freeze({
 id:'missing-contact-literary-v1-20261121',
 baselineCommit:'40227bd2cee5653742e60eb671fdc0b663905455',
 targetArticles:1920,
 minimumBodyHan:470,
 minimumBatchMedianHan:500,
 scope:'opening-process-ending-summary;short-timing-and-audit-excluded',
 reviewMethod:'author-full-read-and-distinct-ai-peer-full-read',
 reviewerIsHuman:false,
 userAcceptedThisVersion:false,
});

const sha = value => createHash('sha256').update(value).digest('hex');
const han = value => value.match(/\p{Script=Han}/gu)?.length ?? 0;
const assert = (condition, message) => { if (!condition) throw new Error(message); };

// This checks already-written readback reports. It never generates review findings,
// signs a readback, or treats a length/hash check as a substantive editorial review.
export async function inspectContactLiteraryBatch({root, primaryId, drafts, authorReview}) {
 const stem = 'hex-' + String(primaryId).padStart(3,'0') + '.json';
 const base = 'sources/editorial/missing-contact/';
 const paths = {
  source:base+stem,
  cases:base+'cases/'+stem,
  author:base+'reviews/'+stem,
  peer:base+'literary-reviews/'+stem,
  baselineSource:base+'literary-baseline-20261121/'+stem,
  baselineCases:base+'literary-baseline-20261121/cases/'+stem,
  baselineReview:base+'literary-baseline-20261121/reviews/'+stem,
 };
 let peerText;
 try { peerText = await readFile(new URL(paths.peer,root),'utf8'); }
 catch (error) {
  if (error.code !== 'ENOENT') throw error;
  assert(authorReview.extraLiteraryPolish !== true,
   'Polished contact source has no separate full-read report: '+stem);
  return null;
 }
 const peer = JSON.parse(peerText);
 const loaded = Object.fromEntries(await Promise.all(Object.entries(paths)
  .filter(([name])=>name!=='peer')
  .map(async ([name,path])=>[name,await readFile(new URL(path,root),'utf8')])));
 const original = JSON.parse(loaded.baselineSource);
 const originalReview = JSON.parse(loaded.baselineReview);
 const prefix = 'Invalid contact literary review '+stem+': ';
 assert(peer.version===CONTACT_LITERARY_CAMPAIGN.id &&
  authorReview.literaryPolishVersion===CONTACT_LITERARY_CAMPAIGN.id &&
  authorReview.extraLiteraryPolish===true,prefix+'campaign');
 assert(peer.primaryId===primaryId && peer.questionId===authorReview.questionId &&
  peer.actor==='independent-ai-reader' && peer.reviewerIsHuman===false,prefix+'identity');
 assert(authorReview.authorAgent && peer.reviewerAgent &&
  peer.authorAgent===authorReview.authorAgent && peer.reviewerAgent!==peer.authorAgent,
  prefix+'author and peer must be different readers');
 assert(peer.fullArticlesRead===30 && Array.isArray(peer.entries) &&
  peer.entries.length===30 && drafts.length===30 && original.length===30,prefix+'article count');
 assert(Number.isFinite(Date.parse(peer.reviewedAt)) &&
  peer.independentProfessionalReview==='pending' &&
  peer.independentTimingInterpretationReview==='pending',prefix+'review scope');
 assert(peer.baselineCommit===CONTACT_LITERARY_CAMPAIGN.baselineCommit,prefix+'baseline commit');
 const fields = {
  source:'sourceSha256',cases:'casesSha256',author:'authorReviewSha256',
  baselineSource:'baselineSourceSha256',baselineCases:'baselineCasesSha256',
  baselineReview:'baselineReviewSha256',
 };
 for (const [name,field] of Object.entries(fields)) {
  assert(peer[field]===sha(loaded[name]),prefix+field+' does not bind the final file');
 }
 assert(originalReview.sourceSha256===sha(loaded.baselineSource) &&
  originalReview.casesSha256===sha(loaded.baselineCases),prefix+'original receipt no longer matches baseline');
 const bindings = drafts.map((row,i)=>{
  const old = original[i], entry = peer.entries[i];
  const bodyHan = han(row.slice(5,9).join(''));
  assert([0,1,2,10].every(column=>JSON.stringify(row[column])===JSON.stringify(old[column])),
   prefix+'identity, outcome or complete timing changed at row '+i);
  assert(bodyHan>=CONTACT_LITERARY_CAMPAIGN.minimumBodyHan,prefix+'body too short at row '+i);
  assert(entry.rowIndex===i && entry.movingLine===row[0] && entry.monthOrder===row[1] &&
   entry.outcome===row[2] && entry.fullArticleRead===true,prefix+'entry mismatch at row '+i);
  assert(entry.copySha256===sha(JSON.stringify(row)) && entry.bodyHan===bodyHan,
   prefix+'stale row binding at row '+i);
  assert(han(entry.peerFinding??'')>=20,prefix+'missing substantive peer finding at row '+i);
  assert(authorReview.entries[i].copySha256===entry.copySha256,prefix+'author did not read final row '+i);
  return {rowIndex:i,copySha256:entry.copySha256,bodyHan,peerFinding:entry.peerFinding};
 });
 const lengths = bindings.map(entry=>entry.bodyHan).sort((a,b)=>a-b);
 const median = (lengths[14]+lengths[15])/2;
 assert(median>=CONTACT_LITERARY_CAMPAIGN.minimumBatchMedianHan,prefix+'batch median below standard');
 return {
  receiptPath:paths.peer,receiptSha256:sha(peerText),
  authorAgent:peer.authorAgent,peerAgent:peer.reviewerAgent,
  authorReviewedAt:authorReview.reviewedAt,peerReviewedAt:peer.reviewedAt,
  sourceSha256:peer.sourceSha256,casesSha256:peer.casesSha256,
  bodyHan:{minimum:lengths[0],median,maximum:lengths.at(-1)},bindings,
 };
}
