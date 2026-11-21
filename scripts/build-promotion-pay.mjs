import {mkdir, readFile, readdir, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {loadLibrary, interpretationArtifactDigest, AUDIT_CHECKS} from '../src/index.js';
import {inspectMovingLine, validateStoryCopy} from '../src/story-editorial.js';
import {resolveManuscriptDates} from '../src/prewritten-manuscripts.js';
import {readingDocumentHeader, renderReadingDocumentEntry, READING_DOCUMENT_DEMO_DATE, READING_DOCUMENT_TIMING_CONTEXT} from './authored-reading-document.mjs';
import {checkInterviewShort} from '../src/interview-decision-checks.js';
import {createContextualReading, resolveContactLineText, promotionTimingSlots, MISSING_CONTACT_PROFILE, LOST_PET_RECOVERY_PROFILE, LOST_OBJECT_RECOVERY_PROFILE, RELATIONSHIP_RECONCILIATION_PROFILE, RELATIONSHIP_ESTABLISHMENT_PROFILE, CONFESSION_DECISION_PROFILE, PROMOTION_PAY_PROFILE, JOB_CHANGE_PROFILE, EXAM_PROFILE, INTERVIEW_V3_PROFILE, PROMOTION_V3_PROFILE, PROBATION_V3_PROFILE, STABILITY_V3_PROFILE, JOB_CHANGE_V3_PROFILE, ESTABLISHMENT_V3_PROFILE, isExamLike, WORKPLACE_STABILITY_PROFILE, WORKPLACE_PROBATION_PROFILE, NEW_RELATIONSHIP_OPPORTUNITY_PROFILE} from '../src/interview-manuscripts.js';
import {MONTH_SLOTS} from '../src/month-slots.js';
import {TRIGRAM_PERIOD_SPECS} from '../src/timing-rules.js';
import {PRODUCT_TAXONOMY} from '../sources/editorial/product-taxonomy.mjs';
import {LOST_OBJECT_DEPTH_CAMPAIGN, inspectLostObjectDepthBatch} from './review/check-lost-object-depth-20261121.mjs';
import {createRequire} from 'node:module';
// 口径 V2.1 间接生克（只算本用、两互、变用之间一层）：与复核记录同一实现，构建时如实记入 decision.indirectEffectsApplied。
const {adjust:indirectAdjust} = createRequire(import.meta.url)('./review/indirect-test.cjs');
const INDIRECT_QUOTE = '此卦生体，诸卦有克此卦者，彼灭其吉。此卦克体，诸卦又有克此卦者，稍解其穷。';
const INDIRECT_EFFECT = {'克体得生而盛':'control-strengthened', '克体受制而衰':'control-weakened', '生体受制而薄':'support-weakened'};

const root = new URL('../', import.meta.url);
const library = await loadLibrary();
const questions = PRODUCT_TAXONOMY.flatMap(category => category.subcategories.flatMap(subcategory =>
 subcategory.questions.map(question => ({...question, id:category.id + '.' + question.id}))));

async function buildAuthoredManuscripts(profile, config) {
const {directory: slug, questionId, manuscriptVersion} = profile;
const sourceDir = 'sources/editorial/' + slug + '/';
const base = 'data/authored-readings/' + slug + '/';
const docDir = 'docs/' + slug + '/';
const isPromotion = profile === PROMOTION_PAY_PROFILE;
const hasPay = isPromotion || profile.payDetail === true;
const question = questions.find(item => item.id === questionId);
if (!question) throw new Error('Unknown manuscript question: ' + questionId);
const common = {schemaVersion: '1.0.0', contentVersion: library.contentVersion, manuscriptVersion, questionId};
const orders = ['spring-wood', 'summer-fire', 'autumn-metal', 'winter-water', 'seasonal-earth'];
const timingByHexagram = isPromotion ? JSON.parse(await readFile(new URL(sourceDir + 'timing.json', root), 'utf8')) : null;
const timingQuotes = {
 'name-support':['mh-071','欲知名成之日，生体之卦气详之。'],
 'name-body':['mh-071','若无克体之卦，则名易就，止看卦体时序之类，以定日期。'],
 support:['mh-116','看卦中有生体之卦，则事应于生体卦气之日'],
 control:['mh-122','细观生体之卦为吉，应决期克体之卦为凶。'],
 drain:['mh-143','不宜克体，亦不宜体卦生之也。'],
 equal:['mh-143','盖卦宜生体，宜比和；'],
};
const seen = new Map();
const seenSentences = new Map();
const counts = {bodies: 0, keys: 0, timingWindows: 0, dated: 0, accepted: 0, applicationQuestions:0, applicationQuestionMonthKeys:0};
const literaryProgress = {standard:'V5.0', actor:'single-ai-literary-editor', completed:0, monthKeyCount:0, next:null};
// 2026-11-20 用户重新要求继续精修。旧 1–37 卦回执保留原范围，
// 本次 38–64 卦另外绑定合并方向、形色后的全文审读，不由构建程序签署审读。
const lostPolishCampaign = {id:'lost-object-polish-20261120',baselineCompleted:1110,targetArticles:810,completed:0,monthKeyCount:0,hexagrams:[]};
// 001–003 的补深另记一轮；回执绑定原稿、六字段、合并附文及最终整行的两位读者。
// 既有 810 篇精修计数不吸收本轮，也不把同一篇重复计入总篇数。
const lostDepthCampaign = {...LOST_OBJECT_DEPTH_CAMPAIGN,completed:0,monthKeyCount:0,hexagrams:[]};
const outcomeCounts = Object.fromEntries(config.outcomes.map(outcome => [outcome, 0]));
const files = [];
const directory = [];
const references = [
 ['mh-056', '成卦之后先看《周易》爻辞', '依本卦完整动爻取义。'],
 ...config.references,
 ['mh-117', '用为占之即应，互为中间之应，变为事占之终应。', '本用及两互、变用各自对原体，分阶段核看。'],
 ['mh-119', '凡体卦宜乘旺，克体之卦宜衰。', '各位置同时使用实际月令五态。'],
 ['mh-116', '如占吉事，无生体之卦，有克体之卦，则事不谐矣。', config.counterevidence],
];

function evidence(id, quote, reason) {
 const section = library.getSection(id);
 if (!section.text.includes(quote)) throw new Error('Source excerpt mismatch: ' + id);
 const startLine=section.sourceRef.startLine+section.text.slice(0,section.text.indexOf(quote)).split('\n').length-1;
 return {id, title: section.title, quote, locator: section.sourceRef, reason,
  ...([LOST_PET_RECOVERY_PROFILE,MISSING_CONTACT_PROFILE].includes(profile)?{quoteLocator:{sourceId:section.sourceRef.sourceId,startLine,endLine:startLine+quote.split('\n').length-1}}:{})};
}
const commonEvidence = references.map(args => evidence(...args));
const moneyClauses = {
 equal:'体用比和，财利快意。',
 body_controls_use:'体克用，有财；',
 use_controls_body:'用克体，无财。',
 use_generates_body:'用生体，财有进益之喜。',
 body_generates_use:'体生用，财有损耗之忧；',
};
const saveJSON = (path, value) => writeFile(new URL(path, root), JSON.stringify(value) + '\n');

await mkdir(new URL(base, root), {recursive: true});
await mkdir(new URL(docDir, root), {recursive: true});
const batches = (await readdir(new URL(sourceDir, root))).filter(name => /^hex-\d{3}\.json$/.test(name)).sort();
for (const [batchIndex, filename] of batches.entries()) {
 const primaryId = batchIndex + 1;
 const stem = 'hex-' + String(primaryId).padStart(3, '0');
 if (filename !== stem + '.json') throw new Error('Expected sequential author source: ' + stem);
 const sourcePath = sourceDir + filename;
 const drafts = JSON.parse(await readFile(new URL(sourcePath, root), 'utf8'));
 const contactCasesPath=sourceDir+'cases/'+filename;
 const contactCases=profile===MISSING_CONTACT_PROFILE?JSON.parse(await readFile(new URL(contactCasesPath,root),'utf8')):null;
 const contactReviewPath=sourceDir+'reviews/'+filename;
 const contactReview=contactCases?JSON.parse(await readFile(new URL(contactReviewPath,root),'utf8')):null;
 if(contactCases && (contactCases.primaryId!==primaryId || contactCases.entries.length!==6 || contactCases.ruleVersion!=='missing-contact-modern-analogy-1.0.0'))throw new Error('Invalid contact cases: '+stem);
 if(contactReview && (contactReview.questionId!==questionId || !Array.isArray(contactReview.entries) || contactReview.entries.length!==30 || contactReview.entries.some((entry,i)=>entry.movingLine!==drafts[i]?.[0] || entry.monthOrder!==drafts[i]?.[1] || entry.outcome!==drafts[i]?.[2] || !entry.reviewFinding || entry.copySha256!==createHash('sha256').update(JSON.stringify(drafts[i])).digest('hex'))))throw new Error('Contact per-article full-read receipts mismatch: '+stem);
 if(contactReview && (contactReview.actor!=='assistant-author' || contactReview.primaryId!==primaryId || contactReview.fullArticlesRead!==30 || !contactReview.reviewedAt || contactReview.sourceSha256!==createHash('sha256').update(await readFile(new URL(sourcePath,root))).digest('hex') || contactReview.casesSha256!==createHash('sha256').update(await readFile(new URL(contactCasesPath,root))).digest('hex')))throw new Error('Missing or stale contact full-read receipt: '+stem);
 const petCasesPath = sourceDir + 'cases/' + filename;
 const petCases = profile === LOST_PET_RECOVERY_PROFILE ? JSON.parse(await readFile(new URL(petCasesPath,root),'utf8')) : null;
 const petReviewPath=sourceDir+'reviews/'+filename;
 const petReview=petCases?JSON.parse(await readFile(new URL(petReviewPath,root),'utf8')):null;
 if(petReview && (petReview.primaryId!==primaryId || petReview.fullArticlesRead!==30 || petReview.actor!=='assistant-author' || !petReview.reviewedAt || petReview.sourceSha256!==createHash('sha256').update(await readFile(new URL(sourcePath,root))).digest('hex') || petReview.casesSha256!==createHash('sha256').update(await readFile(new URL(petCasesPath,root))).digest('hex')))throw new Error('Pet author full-read receipt is missing or stale: '+stem);
 if(petCases && (petCases.entries.length!==6 || petCases.primaryId!==primaryId || petCases.ruleVersion!=='pet-search-modern-analogy-1.0.0')) throw new Error('Pet case count mismatch: '+stem);
 const optionalRecords = async folder => { try { return JSON.parse(await readFile(new URL(sourceDir + folder + filename, root), 'utf8')); } catch (error) { if (error.code === 'ENOENT') return null; throw error; } };
 // V2 review (docs/READING_POLICY_V2.md) and V5 polish receipts; acceptance is recorded only where a record exists.
 const reviewRecords = await optionalRecords('review-v2/');
 const blindRecords = await optionalRecords('blind-v2/');
 const polishRecords = await optionalRecords('polish-v5/');
 if (drafts.length !== 30) throw new Error('An authored batch needs 30 individually written versions');
 let literaryReceipt = null;
 let literaryFullReview = null;
 let literaryDepthReview = null;
 const literaryReceiptPath = sourceDir + 'polish/' + filename;
 if (profile === LOST_OBJECT_RECOVERY_PROFILE) {
  try {
   literaryReceipt = JSON.parse(await readFile(new URL(literaryReceiptPath, root), 'utf8'));
  } catch (error) {
   if (error.code !== 'ENOENT') throw error;
  }
  if (literaryReceipt && (literaryReceipt.standard !== 'V5.0' || literaryReceipt.actor !== literaryProgress.actor ||
      literaryReceipt.sourcePath !== sourcePath || !/^[a-f0-9]{7,40}$/.test(literaryReceipt.originalCommit) ||
      !Array.isArray(literaryReceipt.entries) || new Set(literaryReceipt.entries.map(entry => entry.rowIndex)).size !== literaryReceipt.entries.length ||
      literaryReceipt.entries.some(entry => !Number.isInteger(entry.rowIndex) || entry.rowIndex < 0 || entry.rowIndex >= drafts.length))) {
   throw new Error('Invalid literary review receipt: ' + literaryReceiptPath);
  }
  if (literaryReceipt?.campaign === lostPolishCampaign.id) {
   if (literaryReceipt.fullReviewPath !== sourceDir + 'reviews-polish/' + filename) throw new Error('Unexpected full-review path: ' + filename);
   literaryFullReview = JSON.parse(await readFile(new URL(literaryReceipt.fullReviewPath, root), 'utf8'));
   if (literaryFullReview.primaryId !== primaryId || literaryFullReview.authorAgent === literaryFullReview.peerAgent ||
       literaryFullReview.sourceSha256 !== createHash('sha256').update(await readFile(new URL(sourcePath, root))).digest('hex') ||
       literaryFullReview.entries?.length !== 30) throw new Error('Stale full-copy readback: ' + filename);
  }
  if (literaryReceipt?.campaign === lostDepthCampaign.id) {
   literaryDepthReview = await inspectLostObjectDepthBatch({primaryId,root,literaryReceipt});
   if (literaryDepthReview.issues.length) throw new Error('Invalid depth full-read receipt: ' + filename + '\n' + JSON.stringify(literaryDepthReview.issues,null,2));
  }
 }
 let directionBatch = null;
 let directionRules = null;
 let imageBatch = null;
 let imageRules = null;
 const imageSourcePath = sourceDir + 'images/' + filename;
 const directionSourcePath = sourceDir + 'directions/' + filename;
 if (profile === LOST_OBJECT_RECOVERY_PROFILE) {
  directionBatch = JSON.parse(await readFile(new URL(directionSourcePath, root), 'utf8'));
  directionRules = JSON.parse(await readFile(new URL(sourceDir + 'directions/source-rules.json', root), 'utf8'));
  imageBatch = JSON.parse(await readFile(new URL(imageSourcePath, root), 'utf8'));
  imageRules = JSON.parse(await readFile(new URL(sourceDir + 'images/source-rules.json', root), 'utf8'));
  if (imageBatch.primaryId !== primaryId || imageBatch.questionId !== questionId || imageBatch.entries.length !== 6 || new Set(imageBatch.entries.map(entry => entry.movingLine)).size !== 6) throw new Error('Invalid image supplement batch: ' + imageSourcePath);
  if (directionBatch.primaryId !== primaryId || directionBatch.questionId !== questionId ||
      directionBatch.entries.length !== 6 || new Set(directionBatch.entries.map(entry => entry.movingLine)).size !== 6) {
   throw new Error('Invalid authored direction batch: ' + directionSourcePath);
  }
 }
 const rows = [];
 const monthSlots = {};
 const name = library.getHexagram(primaryId).name;
 let readingDoc = readingDocumentHeader(primaryId, name);
 for (const [i, draft] of drafts.entries()) {
  const [movingLine, monthOrder, outcome, title, short, opening, process, ending, summary, resolution, topicDetail] = draft;
  const payRange = isPromotion ? topicDetail : profile.payDetail ? draft[11] : undefined;
  if (movingLine !== Math.floor(i / 5) + 1 || monthOrder !== orders[i % 5] ||
      !config.outcomes.includes(outcome) || !resolution ||
      (hasPay && (outcome === 'favourable') !== Boolean(payRange))) throw new Error('Invalid author record: ' + stem + '/' + (i + 1));
  const monthBranches = MONTH_SLOTS.filter(slot => slot.qi === monthOrder).map(slot => slot.branch);
  const r = createContextualReading({library, question, primaryId, movingLine, monthBranch: monthBranches[0], castingDate: READING_DOCUMENT_DEMO_DATE, applyVoid: false});
  const contactCase=contactCases?.entries.find(entry=>entry.movingLine===movingLine);
  if(contactCases && (!contactCase || !contactCase.application || !contactCase.boundaries || contactCase.nodes.length!==5 || new Set(contactCase.nodes.map(n=>n.role)).size!==5 || contactCase.nodes.some(n=>r.nodes.find(f=>f.role===n.role)?.trigram!==n.trigram)))throw new Error('Contact facts mismatch: '+stem+'/'+movingLine);
  if(contactCase){
   const c=contactCase.lineCommentary;
   const raw=await readFile(new URL(c.sourcePath,root),'utf8');
   if(!raw.includes(c.quote)||!c.application||!c.referenceUrl||!c.locator)throw new Error('Contact line commentary mismatch: '+stem+'/'+movingLine);
  }
  const contactApplication=contactCase?{...contactCase,sourcePath:contactCasesPath,ruleVersion:contactCases.ruleVersion,judgmentTensions:(contactCase.judgmentTensions??[]).filter(item=>item.monthOrders.includes(monthOrder)),personLocationInferred:false,healthOrFateInferred:false,privateIntentInferred:false,returnHomeInferred:false}:null;
  const petCase = petCases?.entries.find(entry=>entry.movingLine===movingLine);
  if(petCases && (!petCase || !petCase.boundaries || !petCase.application || petCase.nodes.some(n=>r.nodes.find(f=>f.role===n.role)?.trigram!==n.trigram))) throw new Error('Invalid pet scene application: '+stem+'/'+movingLine);
  const petApplication = petCase ? {...petCase,ruleVersion:petCases.ruleVersion,sourcePath:petCasesPath,actualPetIdentityVerified:false,actualLocationVerified:false,healthOrFateInferred:false} : null;
  const directionEntry = directionBatch?.entries.find(entry => entry.movingLine === movingLine);
  const changedTrigram = r.nodes.find(node => node.role === 'changed_use').trigram;
  const directionRule = directionEntry ? directionRules.rules[changedTrigram] : null;
  if (directionBatch && (!directionEntry || directionEntry.changedTrigram !== changedTrigram ||
      directionEntry.sourceRule !== changedTrigram || directionEntry.status !== 'AUTHOR_READ' ||
      !directionEntry.reviewedAt || directionEntry.textSha256 !== createHash('sha256').update(directionEntry.text).digest('hex') ||
      !directionEntry.text.includes(directionRule.direction.replace(/方$/u, '')))) {
   throw new Error('Direction supplement facts or receipt mismatch: ' + directionSourcePath + '/' + movingLine);
  }
  const locationApplication = directionEntry ? {
   ruleVersion:directionRules.version, role:'changed_use', trigram:changedTrigram,
   direction:directionRule.direction, text:directionEntry.text, sourceId:directionRules.sourceId,
   quote:directionRule.quote, sourcePath:directionSourcePath, movingLine,
   referenceUrl:directionRules.referenceUrl, interpretation:'traditional-symbolic-search-hint',
   realWorldLocationVerified:false, referencePoint:'use-confirmed-real-world-route-or-storage-context',
   reviewedAt:directionEntry.reviewedAt, textSha256:directionEntry.textSha256,
  } : null;
  const imageEntry = imageBatch?.entries.find(entry => entry.movingLine === movingLine);
  const objectTrigram = r.nodes.find(node => node.role === 'use').trigram;
  if (imageBatch && (!imageEntry || imageEntry.objectRole !== 'use' || imageEntry.environmentRole !== 'changed_use' ||
      imageEntry.objectTrigram !== objectTrigram || imageEntry.environmentTrigram !== changedTrigram ||
      imageEntry.status !== 'AUTHOR_READ' || !imageEntry.reviewedAt ||
      imageEntry.textSha256 !== createHash('sha256').update(imageEntry.text).digest('hex'))) {
   throw new Error('Image roles or author receipt mismatch: ' + imageSourcePath + '/' + movingLine);
  }
  const imageApplication = imageEntry ? {
   ...imageEntry, ruleVersion:imageRules.version, sourcePath:imageSourcePath, sourceRulesPath:imageBatch.sourceRulesPath,
   interpretation:'conditional-traditional-class-comparison',
   actualFeaturesVerified:false, actualEnvironmentVerified:false,
   roleBoundaries:imageRules.selection.roleBoundaries,
   nonApplicableWithCurrentInputs:imageRules.nonApplicableWithCurrentInputs,
  } : null;
  const imageEvidence = imageApplication ? [
   ...[...imageEntry.sourceSelection.object,'observedShapeClass'].map(field => {
    const source = imageRules.rules[objectTrigram][field];
    return evidence(source.sourceId, source.quote, '本用' + objectTrigram + '用于对照原物已经知道的形制、材质、器物和颜色。形物条只分类已知特征，具体物色仍由原件资料确认。');
   }),
   ...[...imageEntry.sourceSelection.environment,...(changedTrigram === '艮' ? ['checkedGateImage'] : [])].map(field => {
    const source = imageRules.rules[changedTrigram][field];
    return evidence(source.sourceId, source.quote, '变用' + changedTrigram + '用于周边陈设、容器及实有环境的补查参照，所指与原物自身特征分别记录。');
   }),
  ] : [];
  for (const source of imageEvidence) {
   const section = library.getSection(source.id);
   const startLine = section.sourceRef.startLine + section.text.slice(0, section.text.indexOf(source.quote)).split('\n').length - 1;
   source.quoteLocator = {sourceId:section.sourceRef.sourceId,startLine,endLine:startLine + source.quote.split('\n').length - 1};
  }
  if (imageApplication) imageApplication.sourceEvidence = imageEvidence;
  const combinedEnding = ending + (locationApplication ? ' ' + locationApplication.text : '') +
   (imageApplication ? ' ' + imageApplication.text : '');
  const key = [questionId, primaryId, movingLine, monthOrder].join('/');
  const decisionId = key + '/' + outcome;
  const stageIds = Object.values(r.stages).map(stage => stage.id);
  const commentary = contactCase?.lineCommentary;
  const movingLineText = resolveContactLineText(commentary,r.selectedMovingLine);
  const lineApplication = {evidence: [movingLineText], conditions: [resolution], sourcePath};
  const counterevidence = [{fact: 'facts.directRelations; facts.nodes; facts.movingLine', resolution}];
  const copy = {title, short: {decisionId, text: short}, long: {decisionId, opening, process, ending:combinedEnding, summary}};
  let copyChecks;
  try {
   copyChecks = validateStoryCopy({decision: {id: decisionId}, copy, lineApplication, counterevidence});
   checkInterviewShort(short);
   if (!isPromotion) {
    const length = short.match(/\p{Script=Han}/gu)?.length ?? 0;
    if (length < 60 || length > 120) throw new Error('简断需有 60–120 个汉字');
   }
  } catch (error) {
   throw new Error(key + ': ' + error.message, {cause:error});
  }
  for (const [field, value] of Object.entries({title, short, opening, process, ending, summary, ...(payRange ? {payRange} : {})})) {
   const location = key + '/' + field;
   const sample = value.replace(/[^\p{Letter}\p{Number}]/gu, '');
   if (seen.has(sample)) throw new Error('Duplicate authored copy: ' + location + ' / ' + seen.get(sample));
   seen.set(sample, location);
   for (const sentence of value.split(/[。！？]/u)) {
    const hanCount = sentence.match(/\p{Script=Han}/gu)?.length ?? 0;
    if (hanCount < 12) continue;
    const normalized = sentence.replace(/[^\p{Letter}\p{Number}]/gu, '');
    if (seenSentences.has(normalized)) throw new Error('Duplicate authored sentence: ' + location + ' / ' + seenSentences.get(normalized));
    seenSentences.set(normalized, location);
   }
  }

  const timingLine = timingByHexagram?.[primaryId]?.[movingLine - 1];
  const timingSelection = isPromotion ? timingLine?.[1][i % orders.length] : topicDetail;
  if (!timingSelection?.length) throw new Error('Missing author timing: ' + key);
  const timingOmission = typeof timingSelection === 'string'
   ? {status:'not-derived', reason:timingSelection, sourceIds:[config.primarySource,'mh-122']}
   : null;
  const timingSpecs = timingOmission ? [] : isPromotion ? timingSelection.map(index => timingLine[0][index]) : timingSelection;
  if ((profile === JOB_CHANGE_PROFILE || profile === JOB_CHANGE_V3_PROFILE) && timingSpecs.some(spec => !['support','control','drain','equal'].includes(spec[0]))) {
   throw new Error('Job change only dates named transition events: ' + key);
  }
  if ((isExamLike(profile) || profile.namedStageEvents) && timingSpecs.length > 1) throw new Error('Only one event per draft: ' + key);
  if (profile === LOST_OBJECT_RECOVERY_PROFILE && timingSpecs.some(spec => !['support','control','equal'].includes(spec[0]))) {
   throw new Error('Lost-object timing requires a named lead, check or obstacle: ' + key);
  }
  if ([NEW_RELATIONSHIP_OPPORTUNITY_PROFILE, CONFESSION_DECISION_PROFILE, RELATIONSHIP_ESTABLISHMENT_PROFILE, ESTABLISHMENT_V3_PROFILE, RELATIONSHIP_RECONCILIATION_PROFILE].includes(profile) && timingSpecs.some(spec => !['support','control','equal'].includes(spec[0]))) {
   throw new Error('Relationship windows require supported contact, mutual interaction or a specific obstacle: ' + key);
  }
  if ((profile === WORKPLACE_STABILITY_PROFILE || profile === STABILITY_V3_PROFILE) && timingSpecs.some(spec => !['support','control','drain','equal'].includes(spec[0]))) {
   throw new Error('Workplace stability only dates named workplace events: ' + key);
  }
  if (timingSpecs.some(spec => spec?.length !== 5 &&
      !((isExamLike(profile) || (profile === WORKPLACE_PROBATION_PROFILE && spec?.[0] === 'name-support')) &&
        spec?.length === 6 && spec[5] === 'trigram-periods'))) {
   throw new Error('Invalid author timing: ' + key);
  }
  if(profile===MISSING_CONTACT_PROFILE && timingSpecs.some(spec=>!['support','control','equal'].includes(spec[0])))throw new Error('Contact timing must identify a sourced contact stage: '+key);
  const timingSlots = promotionTimingSlots(r, timingSpecs, outcome, profile);
  if (new Set(timingSlots.map(slot => slot.id)).size !== timingSlots.length) throw new Error('Duplicate event timing: ' + key);
  const timingReason = timingOmission?.reason ?? timingSlots.map(slot => slot.reason).join(' ');
  const timingSourceIds = timingOmission?.sourceIds ?? [...new Set(timingSlots.flatMap(slot => slot.sourceIds))];
  const openingRelation = r.edges.find(edge => edge.targetRole === 'use').type;
  const closingRelation = r.edges.find(edge => edge.targetRole === 'changed_use').type;
  if ((isPromotion || isExamLike(profile) || profile === WORKPLACE_PROBATION_PROFILE) && outcome === 'favourable' && openingRelation === 'use_controls_body' &&
      !r.edges.some(edge => edge.type === 'use_generates_body')) {
   throw new Error('求名 verdict conflicts with the opening 求名占 rule and has no direct 生体: ' + key);
  }
  const indirectNotes = reviewRecords?.[i] ? indirectAdjust({n:Object.fromEntries(r.nodes.map(x => [x.role, x.trigram + x.element + x.strength.state])),
   rel:Object.fromEntries(r.edges.map(e => [e.targetRole, e.type])), text:''}).notes : [];
  const sourceEvidence = [...commonEvidence,
   ...imageEvidence,
   ...(petCase ? petCase.evidence.map(s=>evidence(s.id,s.quote,s.reason)) : []),
   ...(contactCase ? contactCase.evidence.map(s=>evidence(s.id,s.quote,s.reason)) : []),
   ...(locationApplication ? [evidence(locationApplication.sourceId, locationApplication.quote, '按真实动爻改变的经卦取方位及场所，结合原行程补查，未据此认定真实所在地。')] : []),
   ...(indirectNotes.length ? [evidence('mh-099', INDIRECT_QUOTE, '口径 V2.1 间接生克：' + indirectNotes.join('；') + '。只算一层，不连环累计。')] : []),
   evidence(config.primarySource, config.clauses[openingRelation], '本用对原体为开局的直接依据。'),
   ...(openingRelation === closingRelation ? [] : [evidence(config.primarySource, config.clauses[closingRelation], '同一关系条文用于理解末段走势。')]),
   ...(hasPay ? [evidence('mh-072', moneyClauses[closingRelation], '财占条文供辨末段财利和耗费。本问的随岗调薪随任用判断。')] : []),
   evidence('mh-122', '应之期远，则以年，近则以月，又近则以日也。', config.timingContext),
   ...timingSlots.map(slot => evidence(...timingQuotes[slot.kind], slot.reason)),
   ...timingSlots.filter(slot => slot.kind === 'name-support' && slot.method === 'trigram-periods').map(slot => evidence(
    'mh-116', '便看生体之卦，于八卦时序类决其日时。', slot.reason)),
   ...timingSlots.filter(slot => slot.method === 'trigram-periods').map(slot => evidence('mh-052',
    TRIGRAM_PERIOD_SPECS.find(period => period.trigram === slot.calculationBasis.trigram).quote,
    slot.kind === 'name-body' ? '按原体所属时序取日支。' : '按本篇选定节点的经卦时序取日支。'))];
  const facts = {
   stages: Object.values(r.stages).map(s => ({id:s.id, name:s.name, baseGrade:s.baseGrade})),
   nodes: r.nodes.map(n => ({role:n.role, trigram:n.trigram, element:n.element, qi:n.strength.state})),
   directRelations: r.edges.map(e => ({role:e.targetRole, type:e.type})),
   movingLine: {...inspectMovingLine(movingLineText), label:r.selectedMovingLine.label, image:r.selectedMovingLine.image,
    sourceRef:r.selectedMovingLine.sourceRef, referenceUrl:movingLineText!==r.selectedMovingLine.text ? commentary.referenceUrl : r.selectedMovingLine.referenceUrl,
    ...(commentary?.adoptedPunctuation ? {adoptedPunctuationFrom:{sourcePath:commentary.sourcePath,locator:commentary.locator}} : {}),
    ...(commentary?.adoptedVariant ? {adoptedTextFrom:{sourcePath:commentary.sourcePath,locator:commentary.locator}} : {})},
  };
  const sourceIds = [...new Set([...sourceEvidence.map(s => s.id), ...timingSourceIds, facts.movingLine.sourceRef.sourceId])];
  const decision = {id:decisionId, outcomeCode:outcome, question_type:question.question_type,
   questionScope:profile.questionScope??'promotion-with-associated-pay', lineApplication, counterevidence, sourceEvidence,
   ...(hasPay ? {pay:outcome==='favourable'?{state:'follows-promotion',rangeKind:'qualitative',range:payRange}:{state:'unfavourable-with-promotion'}} : {}),
   indirectEffectsApplied:indirectNotes.map(note => {
     const [role, label] = note.split(' ');
     return {role, effect:INDIRECT_EFFECT[label], label, rule:'reading-policy-v2.1-indirect-one-layer', sourceId:'mh-099',
      quote:INDIRECT_QUOTE};
    })};
  const authorship = {method:'individually-written-and-reviewed', version:manuscriptVersion, sourcePath, manualWholeArticleReview:true};
  if(contactReview) authorship.wholeArticleReadReceipt={path:contactReviewPath,sourceSha256:contactReview.sourceSha256,casesSha256:contactReview.casesSha256,reviewedAt:contactReview.reviewedAt,actor:contactReview.actor};
  if(petReview) authorship.wholeArticleReadReceipt={path:petReviewPath,sourceSha256:petReview.sourceSha256,casesSha256:petReview.casesSha256,reviewedAt:petReview.reviewedAt,actor:petReview.actor};
  const literaryEntry = literaryReceipt?.entries.find(entry => entry.rowIndex === i);
  if (literaryEntry?.status === 'POLISH_COMPLETED') {
   const copyHash = createHash('sha256').update(JSON.stringify({title,short,opening,process,ending,summary})).digest('hex');
   if (literaryEntry.afterCopySha256 !== copyHash || literaryEntry.id !== decisionId || literaryEntry.outcome !== outcome ||
       !/^[a-f0-9]{64}$/.test(literaryEntry.beforeCopySha256) || !literaryEntry.reason || !literaryEntry.reviewedAt) {
    throw new Error('Stale literary review receipt: ' + key);
   }
   authorship[locationApplication ? 'priorLiteraryPolish' : 'literaryPolish'] = {scope:locationApplication ? 'base-recovery-copy-before-direction-merge' : 'whole-copy', standard:'V5.0', status:'POLISH_COMPLETED', actor:literaryProgress.actor,
    receiptPath:literaryReceiptPath, copySha256:copyHash, reviewedAt:literaryEntry.reviewedAt};
   literaryProgress.completed++;
   literaryProgress.monthKeyCount += monthBranches.length;
   if (literaryReceipt.campaign === lostPolishCampaign.id) {
    const assembledCopySha256 = createHash('sha256').update(JSON.stringify({title,short,opening,process,ending:combinedEnding,summary})).digest('hex');
    const fullRead = literaryFullReview.entries.find(entry => entry.rowIndex === i);
    if (literaryEntry.assembledCopySha256 !== assembledCopySha256 ||
        fullRead?.copySha256 !== copyHash || fullRead?.assembledCopySha256 !== assembledCopySha256 ||
        fullRead?.authorFullRead !== true || fullRead?.peerFullRead !== true || !fullRead?.reviewFinding || !fullRead?.peerFinding) {
     throw new Error('Stale assembled-copy review receipt: ' + key);
    }
    authorship.currentLiteraryPolish = {campaign:lostPolishCampaign.id,scope:'base-copy-and-existing-direction-image-supplements',
     receiptPath:literaryReceipt.fullReviewPath,copySha256:copyHash,assembledCopySha256,reviewedAt:literaryEntry.reviewedAt,
     editorAgent:literaryReceipt.editorAgent,reviewerIsHuman:false};
    lostPolishCampaign.completed++;
    lostPolishCampaign.monthKeyCount += monthBranches.length;
    if (!lostPolishCampaign.hexagrams.includes(primaryId)) lostPolishCampaign.hexagrams.push(primaryId);
   } else if (literaryReceipt.campaign === lostDepthCampaign.id) {
    const bound = literaryDepthReview.bindings.find(entry => entry.rowIndex === i);
    const assembledCopySha256 = createHash('sha256').update(JSON.stringify({title,short,opening,process,ending:combinedEnding,summary})).digest('hex');
    const reviewedRowSha256 = createHash('sha256').update(JSON.stringify(draft)).digest('hex');
    if (bound.copySha256 !== copyHash || bound.assembledCopySha256 !== assembledCopySha256 || bound.reviewedRowSha256 !== reviewedRowSha256) {
     throw new Error('Depth copy changed between validation and assembly: ' + key);
    }
    const fullRead = literaryDepthReview.review;
    authorship.currentLiteraryPolish = {campaign:lostDepthCampaign.id,scope:'full-author-row-and-existing-direction-image-supplements',
     receiptPath:literaryReceipt.fullReviewPath,baselinePath:fullRead.baselinePath,baselineSha256:fullRead.baselineSha256,
     sourceSha256:fullRead.sourceSha256,directionSourceSha256:fullRead.directionSourceSha256,imageSourceSha256:fullRead.imageSourceSha256,
     copySha256:copyHash,assembledCopySha256,reviewedRowSha256,reviewedAt:literaryEntry.reviewedAt,
     authorAgent:fullRead.authorAgent,peerAgent:fullRead.peerAgent,authorReviewedAt:fullRead.authorReviewedAt,peerReviewedAt:fullRead.peerReviewedAt,
     previousReceiptPath:literaryReceipt.previousReceiptPath,previousReceiptSha256:literaryReceipt.previousReceiptSha256,reviewerIsHuman:false};
    lostDepthCampaign.completed++;
    lostDepthCampaign.monthKeyCount += monthBranches.length;
    if (!lostDepthCampaign.hexagrams.includes(primaryId)) lostDepthCampaign.hexagrams.push(primaryId);
   }
  } else if (profile === LOST_OBJECT_RECOVERY_PROFILE && literaryProgress.next === null) {
   literaryProgress.next = {primaryId,movingLine,monthOrder,monthBranches};
  }
  if (locationApplication) authorship.directionSupplement = {method:'individually-authored-direction-supplement', sourcePath:directionSourcePath, reviewedAt:directionEntry.reviewedAt, textSha256:directionEntry.textSha256};
  if (imageApplication) authorship.imageSupplement = {method:'individually-authored-image-supplement', sourcePath:imageSourcePath, reviewedAt:imageEntry.reviewedAt, textSha256:imageEntry.textSha256, scope:'object-and-environment-role-bound-conditional-class-comparison'};
  const receipts = [
   ['facts.stages', stageIds.join(' / ') + '，' + facts.movingLine.label + '动'],
   ['facts.nodes', facts.nodes.map(n => n.role + ' ' + n.trigram).join(' / ')],
   [isPromotion ? 'mh-071;mh-072' : config.primarySource, config.scopeNote],
   ['facts.directRelations', facts.directRelations.map(e => e.role + ' ' + e.type).join(' / ')],
   ['facts.nodes', facts.nodes.map(n => n.trigram + n.qi).join(' / ')],
   ['mh-061;mh-117', '经典体用及同一月令五态'],
   ['decision.indirectEffectsApplied', reviewRecords?.[i] ? '口径 V2.1：本用、两互、变用之间只算一层间接生克（《体用》「彼灭其吉」「稍解其穷」）' : '四处各自对原体看直接作用'],
   [timingSourceIds.join(';'), timingReason],
   ['decision.counterevidence', resolution],
  ];
  const reviewRecord = reviewRecords?.[i], blindRecord = blindRecords?.[i], polishRecord = polishRecords?.[i];
  if (reviewRecord && (reviewRecord.key !== key || reviewRecord.newOutcome !== outcome)) throw new Error('Review record does not match draft: ' + key);
  if (polishRecord && (polishRecord.key !== key || polishRecord.outcome !== outcome)) throw new Error('Polish record does not match draft: ' + key);
  const delegatedPass = reviewRecord?.status === 'passed' && ['agreed','resolved'].includes(blindRecord?.agreement) && polishRecord?.status === 'POLISH_COMPLETED';
  const independentReview = delegatedPass ? {
   status:'ai-delegated-approved', timingInterpretation:'ai-delegated-approved', userAcceptedThisVersion:true,
   acceptance:'用户授权 AI 代审通过（2026-11-18）', reviewerIsHuman:false,
   reviewer:'Claude Opus 5.5 (claude-opus-5-5) · Claude Code 子调用逐卦复核、独立盲断、全文润色', policy:'docs/READING_POLICY_V2.md', date:reviewRecord.date,
  } : {status:reviewRecord?.status === 'pending-dispute' ? 'pending-dispute' : 'pending', timingInterpretation:'pending', userAcceptedThisVersion:false};
  const review = {status:reviewRecord ? (reviewRecord.status === 'passed' ? 'ai-reviewed-v2' : 'pending-dispute') : 'author-checked',
   actor:reviewRecord ? 'ai-delegated-reviewer' : 'assistant-author', version:manuscriptVersion,
   scope:reviewRecord ? 'facts-and-full-copy' : (imageApplication ? 'author-reviewed-base-copy-direction-and-image-supplements' : locationApplication ? 'author-reviewed-base-copy-and-direction-supplement' : 'facts-and-full-copy'), independentReview,
   ...(reviewRecord ? {reviewV2:{changed:reviewRecord.changed, oldOutcome:reviewRecord.oldOutcome, reason:reviewRecord.reason,
    blindVerdict:blindRecord?.verdict ?? null, blindAgreement:blindRecord?.agreement ?? null}} : {}),
   ...(polishRecord ? {polish:{status:polishRecord.status, hashBefore:polishRecord.hashBefore, hashAfter:polishRecord.hashAfter, date:polishRecord.date}} : {}),
   checks:Object.fromEntries(AUDIT_CHECKS.map((id, j) => [id, {status:'pass', evidence:[{locator:receipts[j][0],reason:receipts[j][1]}]}]))};
  const row = {primaryId, movingLine, monthOrder, monthBranches, stageIds, movingLineText, baseProse:true, voidProfileKey:'base-no-void',
   facts, decision, copy, copyChecks, ...(contactApplication ? {contactApplication} : {}), ...(petApplication ? {petApplication} : {}), ...(locationApplication ? {locationApplication} : {}), ...(imageApplication ? {imageApplication} : {}), sourceIds, lineApplication, counterevidence, authorship, review,
   timingSpecs, timingSlots, ...(timingOmission ? {timingOmission} : {}), voidTimingSlots:[], ruleVersions:{decision:manuscriptVersion,...(contactCases ? {scope:contactCases.ruleVersion} : {}),...(petCases ? {scope:petCases.ruleVersion} : {}),...(locationApplication ? {location:directionRules.version} : {}),...(imageApplication ? {images:imageRules.version} : {}),timing:profile.timingVersion ?? slug+'-day-1.0.0',...(reviewRecord ? {policy:'reading-policy-v2-20261118'} : {})},
   // 读者可见的计算说明：口径 V2 复核与润色后写定的定档、旺衰、爻辞依据（替换第十栏内部依据的显示）。
   ...(polishRecord?.calculationNotes ? {calculationNotes:polishRecord.calculationNotes} : {})};
  row.artifactDigest = await interpretationArtifactDigest(row);
  for (const branch of monthBranches) monthSlots[movingLine + ':' + branch] = i;
  rows.push(row);
  if(contactApplication?.judgmentTensions.length){counts.applicationQuestions++;counts.applicationQuestionMonthKeys+=monthBranches.length;}
  counts.bodies++;
  counts.keys += monthBranches.length;
  outcomeCounts[outcome]++;
  counts.accepted += Number(delegatedPass);
  counts.timingWindows += timingSlots.length;
  counts.dated += Number(timingSlots.length > 0);
  const timing = timingOmission ? null : resolveManuscriptDates({
   paragraphs: timingSlots.map(slot => slot.token),
   dateSlots: timingSlots,
   reading: r,
   castingDate: READING_DOCUMENT_DEMO_DATE,
   timingScale: 'day',
   timingContext: READING_DOCUMENT_TIMING_CONTEXT,
  });
  if (timing && (timing.status !== 'resolved' || timing.dateMatches.some(window => !window.displayedDates.length))) {
   throw new Error('Missing demonstration dates: ' + key);
  }
  const sourceTitles = `《周易·${name}》` + [...new Set(sourceIds.filter(id => id.startsWith('mh-')).map(id => library.getSection(id).title))]
   .map(title => `《梅花易数·${title}》`).join('');
  readingDoc += renderReadingDocumentEntry({
   row,
   reading: r,
   paragraphs: [
    '开局：' + opening,
    '过程：' + process,
    '结局：' + combinedEnding + (payRange ? ' ' + payRange : ''),
    timingOmission ? '应期：此盘暂无有据的日期可列。' : '应期：以下为传统推算的参考窗口。\n' +
     timing.paragraphs.map((text, index) => isExamLike(profile) || profile === LOST_OBJECT_RECOVERY_PROFILE || profile === LOST_PET_RECOVERY_PROFILE || profile === MISSING_CONTACT_PROFILE ? text : text.replace('。', '，属' + timingSlots[index].valence + '应。')).join(' '),
    '总断：' + summary,
   ],
   sourceTitles,
   calculation: [
    `对照起卦日：${r.castingDate}，${r.dayGanzhi}日。体用位置：${r.body.side === 'upper' ? '上卦' : '下卦'}为原体，${r.use.side === 'upper' ? '上卦' : '下卦'}为本用。`,
    r.edges.map(edge => edge.targetRole + '：' + edge.label).join('；') + '。',
    ...(row.calculationNotes ?? [resolution]),
    ...(contactApplication ? [contactApplication.application,contactApplication.boundaries,'恢复联系取义作者源：'+contactCasesPath+'，第 '+movingLine+' 爻。',contactApplication.lineCommentary.quote,contactApplication.lineCommentary.application,'注疏：'+contactApplication.lineCommentary.sourcePath+' · '+contactApplication.lineCommentary.locator] : []),
    ...(contactApplication?.lineCommentary.parallelReadings??[]).map(source=>'对照注疏：'+source.sourcePath+'。“'+source.quote+'” '+source.application),
    ...(contactApplication?.lineCommentary.versionDifference?[contactApplication.lineCommentary.versionDifference]:[]),
    ...(contactApplication?.lineCommentary.collation?.sources??[]).map(({work,locator,url,finding})=>'校勘对照：['+work+' · '+locator+']('+url+')。'+finding),
    ...(petApplication ? [petApplication.application,petApplication.boundaries,'[活体搜索与场景类象作者源](../../'+petCasesPath+')，第 '+movingLine+' 爻。'] : []),
    ...(imageApplication ? ['类象对照取本用' + objectTrigram + '参原物已知特征，变用' + changedTrigram + '参周边容器和实有场所。', '形状、材质、颜色、器物构造按原件照片或记录比对。未提供的物色和环境仍待实际核实。', '[形色器物作者源](../../' + imageSourcePath + ')，第 ' + movingLine + ' 爻。'] : []),
    ...(locationApplication ? [`方位取象取变用${changedTrigram}，传统方向${locationApplication.direction}。单爻所变经卦按失物章列象，实际排查以已知收放或行程为参照。`, '[方位场所作者源](../../' + directionSourcePath + ')，第 ' + movingLine + ' 爻。'] : []),
    ...(row.ruleVersions.policy ? ['断法依据：《梅花易数》体用生克、衰旺与互变之诀，2026-11-18 定稿（docs/READING_POLICY_V2.md）。'] : []),
    timingOmission?.reason ?? (config.timingDisplay ?? config.timingContext),
    ...timingSlots.map((slot, index) => {
     const {trigram, element} = slot.calculationBasis;
     const method = slot.method === 'trigram-periods' ? (slot.kind === 'name-body' ? '先天体卦时序法' : '先天经卦时序法') : '先天卦气法';
     return `${slot.valence}应 · ${slot.event}。取${trigram}${element}，${slot.branches.join('、')}日。用${method}按日匹配，先查起卦当月余日，无匹配再查下月。示例 ${timing.dateMatches[index].displayedDates.join('、')}。 ${slot.reason}`;
    }),
    ...sourceEvidence.map(source => `- ${source.id}《${source.title}》，原文第 ${source.quoteLocator?.startLine ?? source.locator.startLine} 行起。\n  “${source.quote}”\n  ${source.reason}`),
    `稿件键 \`${key}\` · [作者源](../../${sourcePath}) · [断法和出处](../${config.policy})`,
    `判据：${row.ruleVersions.decision}；写作方式：${row.authorship.method}。`,
   ],
  });
 }
 const path = base + stem + '.json';
 await saveJSON(path, {...common, primaryId, monthSlots, rows});
 files.push({primaryId, path, count:rows.length, monthSlotCount:Object.keys(monthSlots).length});
 await writeFile(new URL(docDir + stem + '.md', root), readingDoc.trimEnd() + '\n');
 directory.push('- [' + name + '](' + stem + '.md) · ' + rows.length + ' 篇');
}
const progress = {
 ...(profile===MISSING_CONTACT_PROFILE?{literaryPolish:{required:false,status:'not-required-by-user',completed:0},scopePolicy:'missing-contact-modern-analogy-1.0.0',specificApplicationQuestions:{articles:counts.applicationQuestions,monthKeys:counts.applicationQuestionMonthKeys,status:'pending-independent-application-review'},personLocationInferred:false,healthOrFateInferred:false,privateIntentInferred:false}:{}),
 ...(profile === LOST_PET_RECOVERY_PROFILE ? {literaryPolish:{required:false,status:'not-required-by-user',completed:0},scopePolicy:'pet-search-modern-analogy-1.0.0',locationClaimsVerified:false,animalHealthOrFateInferred:false} : {}),
 ...common, baseCaseCount:counts.keys, baseVersionCount:counts.bodies, authoredVersionCount:counts.bodies,
 contextProfileCount:counts.bodies, totalBaseCases:4608, totalCharts:384, fullTwelveMonthCharts:files.length * 6,
 remainingBaseSlots:4608-counts.keys, authorWholeArticleReviewed:counts.bodies,
 ...(profile === LOST_OBJECT_RECOVERY_PROFILE ? {imageCoverage:{charts:files.length*6,monthKeys:counts.keys,authoredSupplements:files.length*6,sourceRulesVersion:'lost-object-images-1.0.0',facets:['shape','material','color','utensil','environment'],extraLiteraryPolishRequired:true},directionCoverage:{charts:files.length*6,monthKeys:counts.keys,authoredSupplements:files.length*6,sourceRulesVersion:'lost-object-direction-1.0.0'},literaryPolish:{...literaryProgress,scope:'base-copy-with-separately-bound-supplement-review',required:true,status:literaryProgress.completed===counts.bodies?'completed':'in-progress',unpolished:counts.bodies-literaryProgress.completed,remaining:counts.bodies-literaryProgress.completed},polishCampaign:{...lostPolishCampaign,remaining:lostPolishCampaign.targetArticles-lostPolishCampaign.completed,reviewMethod:'author-full-read-and-second-ai-full-read',userAcceptedThisVersion:false},depthReviewCampaign:{...lostDepthCampaign,remaining:lostDepthCampaign.targetArticles-lostDepthCampaign.completed,reviewMethod:'author-full-read-and-second-ai-full-read-bound-to-final-row',userAcceptedThisVersion:false}} : {}),
 ...(isPromotion ? {favourable:outcomeCounts.favourable} : {outcomeCounts}),
 dated:counts.dated, undated:counts.bodies-counts.dated, timingWindowCount:counts.timingWindows, independentReview:counts.accepted === counts.bodies ? 'ai-delegated-approved' : 'pending', userAccepted:counts.accepted, files,
 next:files.length === 64 ? null : {primaryId:files.length+1, movingLine:1, monthOrder:orders[0], monthBranches:['寅','卯']},
};
await saveJSON(base + 'index.json', progress);
await writeFile(new URL(docDir + 'README.md', root), [
 '# ' + config.title + '断语', '', hasPay ? '问项为本次晋升及随岗加薪。' : config.scopeNote + '。', '',
 ...(profile === LOST_OBJECT_RECOVERY_PROFILE ? ['384 条按卦爻写定的方位场所补充已合入结局，覆盖全部 4,608 个月令键，原典定位与取象位置在计算说明中展开。'] : []),
 ...(profile === LOST_OBJECT_RECOVERY_PROFILE ? ['384 条形状、材质、颜色、器物与环境补充已写定并作者核读，逐条区分本用所参的原物特征与变用所参的周边场所，合入全部 1,920 篇正文。'] : []),
 '已逐篇写作并由作者核读 ' + counts.bodies + ' 篇，覆盖 ' + progress.fullTwelveMonthCharts + ' / 384 种基础盘、' + counts.keys + ' / 4,608 个月令检索位置。',
 ...(profile === LOST_OBJECT_RECOVERY_PROFILE ? [
  '2026-11-20 按用户新要求，以面试、确定关系的逐月长稿为文风标杆，继续精修第 38–64 卦原有的 810 篇。本次完成 ' + lostPolishCampaign.completed + ' 篇，覆盖 ' + lostPolishCampaign.monthKeyCount + ' 个月令键；尚余 ' + (lostPolishCampaign.targetArticles-lostPolishCampaign.completed) + ' 篇。',
  '本次已完成卦序：' + (lostPolishCampaign.hexagrams.length ? lostPolishCampaign.hexagrams.join('、') : '尚未发布') + '。作者逐篇核读、第二位 AI 全文复核及规则疑点见[本轮审计](POLISH_AUDIT_20261120.md)。这些记录不等于独立真人专业认可或用户逐篇验收。',
  '前 37 卦既有 V5.0 精修 1,110 篇保留原记录；累计精修 ' + literaryProgress.completed + ' 篇，对应 ' + literaryProgress.monthKeyCount + ' 个月令键。本轮保持每卦 30 篇五气正文与 72 个月令键的现有结构，同气共用不冒充十二份独立新稿。',
  '2026-11-21 另开第 1–3 卦的正文补深，共计划 90 篇；本轮已完成 ' + lostDepthCampaign.completed + ' 篇，覆盖 ' + lostDepthCampaign.monthKeyCount + ' 个月令键，尚余 ' + (lostDepthCampaign.targetArticles-lostDepthCampaign.completed) + ' 篇。已完成卦序：' + (lostDepthCampaign.hexagrams.length ? lostDepthCampaign.hexagrams.join('、') : '尚未发布') + '。这批属于既有 1,920 篇的再次精修，不计入上轮 810 篇，也不新增总篇数。',
  '本轮原稿、旧回执与作者及第二位 AI 的最终全文复读分别留档，见[补深审计](DEPTH_AUDIT_20261121.md)与[古籍后续复核](CLASSICAL_FOLLOWUP_20261121.md)。程序核验原档位、完整应期、六字段、合并附文和整行版本绑定；字数及哈希通过不代替逐篇内容审读。',
 ] : []),
 ...(isPromotion ? ['其中 ' + outcomeCounts.favourable + ' 篇倾向晋升并随岗加薪，' + outcomeCounts.difficult + ' 篇倾向本次难以落实。'] : hasPay ? ['其中能升 ' + outcomeCounts.favourable + ' 篇（随岗薪资一并说明），升不了 ' + outcomeCounts.difficult + ' 篇。'] : []),
 ...(profile===MISSING_CONTACT_PROFILE?['具体断法适用问题保留 '+counts.applicationQuestions+' 篇（'+counts.applicationQuestionMonthKeys+' 个月令键），逐条记录见作者 cases 与 source-study，不计作独立审核通过。']:[]),
 '已写入应期规则 ' + progress.dated + (profile===MISSING_CONTACT_PROFILE?' 篇，保留具体不取期原因 ':' 篇，待取期 ') + progress.undated + ' 篇。阅读文档使用 ' + READING_DOCUMENT_DEMO_DATE + ' 演示日期，软件按各次实际起卦日换算。独立专业审核待完成。',
 '下一键 ' + (progress.next ? [questionId,progress.next.primaryId,progress.next.movingLine,progress.next.monthOrder].join(' / ') : '已写满'),
 '', '[断法与古籍出处](../' + config.policy + ')', '', ...directory, '',
].join('\n'));
console.log({...progress,files:files.length});
}

const promotion = {
 title:'晋升加薪', policy:'PROMOTION_PAY_POLICY.md', primarySource:'mh-071',
 references:[
  ['mh-071','凡占求名，以体为主，用为名。','本次职位或职级能否落实，参求名。'],
  ['mh-072','用生体，财有进益之喜。','用于辨别与岗位有关的财利与投入，实际薪差依正式薪档。'],
 ],
 counterevidence:'在有克而无直接生扶的盘里核对名成反证。',
 clauses:{
  equal:'体用比和，功名称意。', body_controls_use:'体克用，名可成，但成迟。',
  use_controls_body:'用克体，名不可成。', use_generates_body:'用生体，名易成，或因名有得。',
  body_generates_use:'体生用，名不可就，或因名有丧。',
 },
 outcomes:['favourable','conditional','difficult'], scopeNote:'名分与随岗薪资同问，薪资承接晋升结果',
 timingContext:'日级窗口对应已经进入近期流程的评定。',
 timingDisplay:'日级参考窗口适用于评定已进入近期流程。',
};
const planning = {
 policy:'JOB_CHANGE_POLICY.md', primarySource:'mh-070',
 references:[
  ['mh-070','占求谋，以体为主，用为所谋之事。','以明确的离职或换职计划为所谋。'],
  ['mh-064','更详观互卦、变卦，以断吉凶；复究盛衰，以明休咎。','核对实际过渡过程和原体能否承接变化。'],
 ],
 clauses:{
  equal:'体用比和，求谋称意。', body_controls_use:'体克用，谋虽可成，但成迟。',
  use_controls_body:'用克体，求谋不成，谋亦有害。', use_generates_body:'用生体。不谋而成',
  body_generates_use:'体生用，多谋少遂。',
 },
 counterevidence:'检验克体和无生扶对具体换职计划的限制。',
 timingContext:'日级参考窗口适用于离职或换职已进入近期办理阶段。',
};
const jobChange = {
 ...planning, title:'跳槽去留', scopeNote:'就最看重的条件比较两份工作，并一并判断现在的辞职时机',
 outcomes:['stay','verify','prepare','switch'],
};
// 跳槽去留 v3（2026-11-19，docs/review/JOBCHANGE_REJUDGE_20261119.md）：定稿口径（开「用党多则体势衰」）+ 跳槽专属爻辞，有条件按结局拆，成者再分时机。
const jobChangeV3 = {
 title:'跳槽去留', policy:'review/JOBCHANGE_REJUDGE_20261119.md', primarySource:'mh-070',
 references:[
  ['mh-070','占求谋，以体为主，用为所谋之事。','原体为问事人，本用为换到这份新工作这件事；成与不成定取舍。'],
  ['mh-116','如生体是用卦，则事即成。生体是互卦，则渐成。生体是变卦，则稍迟耳。','成者再分时机：即成可按约定办，渐成、稍迟与有阻节的先准备。'],
  ['mh-074','体克用，可行，所至多得意。用克体，出则有祸。','出行之占与去留同向，只参照离开原处一面。'],
 ],
 clauses:planning.clauses,
 outcomes:['stay','prepare','switch'], scopeNote:'比较现职与这份新工作，并判断现在宜留、宜先准备还是可以办辞职',
 counterevidence:'核对换职计划的阻节、末段走向与爻辞所限，取舍与时机分开看。',
 timingContext:planning.timingContext,
};
const exam = {
 title:'这次考试能通过吗', policy:'EXAM_POLICY.md', primarySource:'mh-071', clauses:promotion.clauses,
 references:[
  ['mh-071','凡占求名，以体为主，用为名。','以求名类推本次考试的合格结果。原体为应试者，本用为所应考试。'],
  ['mh-064','更详观互卦、变卦，以断吉凶；复究盛衰，以明休咎。','分阶段检查备考、作答和交卷后的结果。'],
 ],
 outcomes:['favourable','difficult'], scopeNote:'只问本次考试是否达到合格要求',
 counterevidence:'核对能否达到考试要求，分清答题过程较顺、爻辞所限与结果有利。',
 timingContext:'日级窗口只适用于已进入近期流程的对应考试事项。考试日、查分日和合格标准依据主办方通知。',
};
// 面试求职按考试定稿口径重写（2026-11-18，docs/review/INTERVIEW_REJUDGE_20261118.md）。
const interviewV3 = {
 title:'这次面试能通过吗', policy:'review/INTERVIEW_REJUDGE_20261118.md', primarySource:'mh-071', clauses:promotion.clauses,
 references:[
  ['mh-071','凡占求名，以体为主，用为名。','以求名类推这一轮面试能否通过。原体为面试者，本用为这一轮考察。'],
  ['mh-076','体克用，可见；用克体，不见。','谒见之占与求名同向，只参照能否被接纳这一面。'],
  ['mh-064','更详观互卦、变卦，以断吉凶；复究盛衰，以明休咎。','分阶段检查准备、问答和结果。'],
 ],
 outcomes:['favourable','difficult'], scopeNote:'只问这一轮面试能否通过，不等同于最终录用',
 counterevidence:'核对能否通过这一轮考察，分清问答过程较顺、爻辞所限与结果有利。',
 timingContext:'日级窗口只适用于已进入近期流程的对应面试事项。面试日、通知日以对方安排为准。',
};
// 晋升加薪 v3（2026-11-18，docs/review/PROMOTION_REJUDGE_20261118.md）：考试定稿口径 + 《求名占》在任专条。
const promotionV3 = {
 title:'晋升加薪', policy:'review/PROMOTION_REJUDGE_20261118.md', primarySource:'mh-071', clauses:promotion.clauses,
 references:[
  ['mh-071','凡占求名，以体为主，用为名。','以求名看本次晋升能否落实。原体为求晋升的人，本用为所争的晋升。'],
  ['mh-071','若在任占卜，最忌见克体之卦，如卦有克体者，即居官见祸','求晋升者在任，盘中有克体之卦即判本次升不了。'],
  ['mh-064','更详观互卦、变卦，以断吉凶；复究盛衰，以明休咎。','分阶段检查评议、考察和定级。'],
 ],
 outcomes:['favourable','difficult'], scopeNote:'回答本次晋升及随岗加薪；能升的篇一并说明随岗薪资',
 counterevidence:'核对本次晋升能否落实，在任受克、过程较顺、爻辞所限与结果有利分开看。',
 timingContext:'日级窗口只适用于本次评定已进入近期流程。正式任命、定级与薪档以单位通知为准。',
};
// 能否转正 v3（2026-11-18，docs/review/PROBATION_REJUDGE_20261118.md）：考试定稿口径 + 《求名占》在任专条。
const probationV3 = {
 title:'这次试用期能通过吗', policy:'review/PROBATION_REJUDGE_20261118.md', primarySource:'mh-071', clauses:promotion.clauses,
 references:[
  ['mh-071','凡占求名，以体为主，用为名。','以名成类推这次试用期能否转正。原体为试用员工，本用为这次试用评定。'],
  ['mh-071','若在任占卜，最忌见克体之卦，如卦有克体者，即居官见祸','试用员工已在岗，盘中有克体之卦即判这次转不了正。'],
  ['mh-064','更详观互卦、变卦，以断吉凶；复究盛衰，以明休咎。','依次核对试用要求、实际工作和最后的评定。'],
 ],
 outcomes:['favourable','difficult'], scopeNote:'只判断这次试用期能否转正',
 counterevidence:'分别看评定标准、在岗受克、爻辞条件与末段，过程改善与最终转正各有证据。',
 timingContext:'日级窗口只在所指试用事项已有近期安排时取用。正式评定结果及日期以实际通知为准。',
};
// 职场情况 v3（2026-11-19，docs/review/STABILITY_REJUDGE_20261119.md）：定稿三档 + 《求名占》在任条分轻重。
const stabilityV3 = {
 title:'当前工作稳定性', policy:'review/STABILITY_REJUDGE_20261119.md', primarySource:'mh-064',
 references:[
  ['mh-071','若在任占卜，最忌见克体之卦，如卦有克体者，即居官见祸，轻则上司责罚，重则削官退居。','问稳定的人本在任上：有克体之卦即不判稳，轻重分有隐患、风险大。'],
  ['mh-064','体卦为主，用卦为宾。','原体为当前工作中的当事人，本用为工作安排及其外部要求。'],
  ['mh-064','更详观互卦、变卦，以断吉凶；复究盛衰，以明休咎。','依次核对眼下的安排、中途的变化和最后的走向。'],
 ],
 clauses:{
  equal:'体用比和，谋为吉利。', body_controls_use:'体克用则吉。',
  use_controls_body:'用克体不宜', use_generates_body:'用生体有进益之喜',
  body_generates_use:'体生用有耗失之患。',
 },
 outcomes:['stable','watch','strained'], scopeNote:'只判断当前工作稳定性和中断风险的传统倾向',
 counterevidence:'对照在任受克的轻重、生扶能否救、爻辞所限与尾段变化。普通工作压力与岗位中断分开看。',
 timingContext:'日级参考窗口适用于对应工作事项已进入近期流程。人事决定及日期以实际通知为准。',
};
const workplaceStability = {
 title:'当前工作稳定性', policy:'WORKPLACE_POLICY.md', primarySource:'mh-064',
 references:[
  ['mh-064','体卦为主，用卦为宾。','原体为当前工作中的当事人，本用为工作安排及其外部要求。'],
  ['mh-071','若在任占卜，最忌见克体之卦','在任受克条作工作受制的参照，按现有关系和旺衰判断作用范围。'],
 ],
 clauses:{
  equal:'体用比和，谋为吉利。', body_controls_use:'体克用则吉。',
  use_controls_body:'用克体不宜', use_generates_body:'用生体有进益之喜',
  body_generates_use:'体生用有耗失之患。',
 },
 outcomes:['stable','watch','strained'], scopeNote:'只判断当前工作稳定性和中断风险的传统倾向',
 counterevidence:'对照工作承接、外部要求、爻辞限制与尾段变化。普通工作压力与岗位中断分别判断。',
 timingContext:'日级参考窗口适用于对应工作事项已进入近期流程。人事决定及日期以实际通知为准。',
};
const workplaceProbation = {
 title:'这次试用期能通过吗', policy:'WORKPLACE_POLICY.md', primarySource:'mh-071', clauses:promotion.clauses,
 references:[
  ['mh-071','凡占求名，以体为主，用为名。','将名成类推至这次试用期的正式通过。原体为试用员工，本用为这次试用评定。'],
  ['mh-064','更详观互卦、变卦，以断吉凶；复究盛衰，以明休咎。','依次核对试用要求、实际工作和最后的评定。'],
 ],
 outcomes:['favourable','conditional','difficult'], scopeNote:'只判断当次试用期的通过倾向',
 counterevidence:'分别看评定标准、执行中的协作或限制、爻辞条件与末段。过程改善与最终通过各有证据。',
 timingContext:'日级窗口只在所指试用事项已有近期安排时取用。正式评定结果及日期以实际通知为准。',
};
const newRelationshipOpportunity = {
 title:'桃花缘分 · 近期新感情机会与相遇时机', policy:'NEW_RELATIONSHIP_OPPORTUNITY_POLICY.md', primarySource:'mh-064',
 references:[
  ['mh-064','体卦为主，用卦为宾。','原体为问事人，本用为接触新对象的现实条件。'],
  ['mh-067','体用比和，婚姻吉利。','只参照双方相就这一条件，类推新接触能否有来有往。'],
 ],
 clauses:workplaceStability.clauses,
 outcomes:['favourable','conditional','difficult'], scopeNote:'同篇回答近期新感情机会，以及何时较可能遇到适合继续了解的人',
 counterevidence:'区分初遇、再见、互相回应与可以继续发展，结合完整动爻及本互变的实际力量。',
 timingContext:'日级窗口对应一次有依据的初遇、再见或具体阻碍。应事发生阶段以所取节点为准。',
};
const confessionDecision = {
 title:'暧昧表白', policy:'CONFESSION_DECISION_POLICY.md', primarySource:'mh-064',
 references:[
  ['mh-064','体卦为主，用卦为宾。','体为问事人，用为与已知对象的往来及外部条件。'],
  ['mh-067','或彼有相就之意','古代婚占区分靠近的方向，现代类推限于交往倾向。实际心意以对方表达为准。'],
  ['mh-067','或此去求婚方谐','体生用时，须分清问事人投入和对方自发行动。'],
  ['mh-067','若体用比和，则彼此相就','比和用于判断互相接应的条件，不单凭比和决定谁先联络。'],
 ],
 clauses:workplaceStability.clauses,
 outcomes:['favourable','conditional','difficult'], scopeNote:'同篇回答对方心意的传统取象、近期主动联系倾向、现在是否适合表白',
 counterevidence:'区分有回应和对方主动，核对双方实际往来、完整动爻及表意的适用条件。',
 timingContext:'日级窗口仅用于近期可辨的联系、私下交谈或沟通受阻，依对应节点取日。',
};
const relationshipEstablishment = {
 title:'恋爱发展 · 我们能确定恋爱关系吗？',
 policy:'RELATIONSHIP_ESTABLISHMENT_POLICY.md', primarySource:'mh-067',
 references:[
  ['mh-064','更详观互卦、变卦，以断吉凶','所问是同意建立关系，分段判断联系能否走到双方确认。'],
  ['mh-067','若体用比和，则彼此相就','从古代婚占类推双方接应的条件，是否确立关系以两人明确同意为准。'],
 ],
 clauses:{
  equal:'体用比和，婚姻吉利。',
  body_controls_use:'体克用，可成但成之迟；',
  use_controls_body:'用克体，不可成，成亦有害。',
  use_generates_body:'用生体，婚易成，或因婚有得；',
  body_generates_use:'体生用，婚难成，或因婚有失。',
 },
 outcomes:['favourable','conditional','difficult'],
 scopeNote:'判断彼此能否明确同意建立恋爱关系，落实的门槛是双方有清楚而自愿的回应',
 counterevidence:'分别核对起初愿意往来、解决实际分歧和最后能否确认关系。完整爻辞的限制须放回具体阶段。',
 timingContext:'只有具备近期现实前提的见面、相互商量或具体阻节才取日窗。事件和所取节点一一对应。双方确认关系另外看是否有足够依据。',
};
// 确定关系 v3（2026-11-19，docs/review/ESTABLISHMENT_REJUDGE_20261119.md）：定稿口径（含用党多、姤「勿用取女」卦象）+ 婚恋专属爻辞，只判成与不成。
const establishmentV3 = {
 title:'恋爱发展 · 我们能确定恋爱关系吗？', policy:'review/ESTABLISHMENT_REJUDGE_20261119.md', primarySource:'mh-067',
 references:[
  ['mh-067','占婚姻以体为主，用为婚姻。','原体为问事人，本用为这段关系能否确定；古代婚占类推，以两人明确而自愿的同意为准。'],
  ['mh-067','若体用比和，则彼此相就，良配无疑。','生体为对方有相就之意，体生用为要我方去求；写进正文，不另定结论。'],
  ['mh-064','更详观互卦、变卦，以断吉凶；复究盛衰，以明休咎。','分阶段看来往、相处中的分歧和最后能否确认。'],
 ],
 clauses:relationshipEstablishment.clauses,
 outcomes:['favourable','difficult'], scopeNote:'只判断两人能否走到双方明确同意确定关系，不替对方断定心意',
 counterevidence:'核对能否确认关系，分清来往顺、爻辞所限与结果有利。',
 timingContext:relationshipEstablishment.timingContext,
};
const relationshipReconciliation = {
 title:'矛盾复合 · 这段已经结束的感情能复合吗？',
 policy:'RELATIONSHIP_RECONCILIATION_POLICY.md', primarySource:'mh-064',
 references:[
  ['mh-061','体为己身之兆，用为应事之端','原体看问事人面对修复的条件，本用看旧关系重启时遇到的现实。'],
  ['mh-067','若体用比和，则彼此相就','从古代婚占的相就类推修复中的双向配合，复合须双方同意并处理导致分开的要紧问题。'],
 ],
 clauses:{
  equal:'体用比和，谋为吉利。',
  body_controls_use:'体克用则吉。',
  use_controls_body:'用克体不宜，',
  use_generates_body:'用生体有进益之喜，',
  body_generates_use:'体生用有耗失之患。',
 },
 outcomes:['favourable','conditional','difficult'],
 scopeNote:'判断已经结束的感情能否经双方自愿、实际修复而重新建立',
 counterevidence:'分别核对恢复联络、处理当初分开的关键问题和双方明确同意复合。以完整爻辞检验推动和止退各自的条件。',
 timingContext:'日级窗口只用于近期可以观察的表态、修复行动或重遇旧的阻节，须与所取节点对应。复合本身没有依据则单独保留时机未明。',
};
const lostObjectRecovery = {
 title:'物品找回 · 寻回倾向与传统方位场所',
 policy:'LOST_OBJECT_RECOVERY_POLICY.md', primarySource:'mh-077',
 references:[
  ['mh-077','占失物，以体为主，用为失物。','依失物专章，原体指问事者能够动用的查找条件，本用指当前失物情势。'],
  ['mh-077','又以变卦为失物之所在。','依动侧变用取传统场所类象，只在已知行程内作补充排查。'],
 ],
 clauses:{
  equal:'体用比和，物不失矣。',
  body_controls_use:'体克用，可寻迟得；',
  use_controls_body:'用克体，不可寻。',
  use_generates_body:'用生体，物易寻。',
  body_generates_use:'体生用，物难见；',
 },
 outcomes:['favourable','conditional','difficult'],
 scopeNote:'同篇判断指定物品的寻回倾向，补充原物形状、材质、颜色与器物辨认，并参失物章给出周边环境、传统方位与实际行程回查提示。确认遗落范围、获得消息和领回原物分开记录',
 counterevidence:'核对初段难寻、两互能否提供有效线索及收尾能否领回。比和可取在已知处回查，不视为物品已定位。',
 timingContext:'近期已有可继续核查的记录或可联系的经手方时，才依生体、比和或克体择一个可观察的阶段事件，不据取日推定已经寻回。',
};
const lostPetRecovery = {
 "title": "宠物走失",
 "policy": "LOST_PET_RECOVERY_POLICY.md",
 "primarySource": "mh-070",
 "references": [
  [
   "mh-070",
   "占求谋，以体为主，用为所谋之事。",
   "现代类推：体指主人可调动的查找条件，用指寻找并安全接回的事情，不把原体作宠物健康或生死。"
  ],
  [
   "mh-028",
   "凡占群物之动，不可起卦。",
   "动物起卦原法有实际所见及方位等前提；本入口保留用户既有排盘，不虚构动物出现的外应。"
  ],
  [
   "mh-092",
   "乾为马，坤为牛，震为龙，巽为鸡，坎为豕，离为雉，艮为狗，兑为羊",
   "动物种类是象类，不据卦猜问的是什么宠物或推断伤病。"
  ],
  [
   "mh-048",
   "形物占者，凡见物形，可以起卦。",
   "形色器质仅供已知场景作条件性对照；毛色、体形和身份由主人实际照片核验。"
  ],
  [
   "mh-052",
   "右万物之象，庶事之多不止于此。占者宜各以其类而推之耳。",
   "仅取适合活体搜索的实有周边场所，不把静物收纳或植物生长断法用于宠物。"
  ]
 ],
 "clauses": {
  "equal": "体用比和，求谋称意。",
  "body_controls_use": "体克用，谋虽可成，但成迟。",
  "use_controls_body": "用克体，求谋不成，谋亦有害。",
  "use_generates_body": "用生体。不谋而成；",
  "body_generates_use": "体生用，多谋少遂。"
 },
 "outcomes": [
  "favourable",
  "conditional",
  "difficult"
 ],
 "scopeNote": "同篇判断寻找并安全接回指定走失宠物的倾向，分清可验证目击、接近条件和实际团聚。体指问事者的搜索协调，用指寻找接回之事。类象只在实际最后出现地点和可信目击周边参看，不推断真实位置、伤病、生死或被盗",
 "counterevidence": "逐篇核对完整爻意、四条直接关系与全部月令五态；弱体与衰比和不自动判有望接回，利见或无咎也不等于已经团聚。",
 "timingContext": "只对近期可实际推进的目击核实、搜寻协同或接近受阻，类推采用日尺度。取生体、比和或克体所在节点，一个窗口只指一个阶段事件，不能据此等到某日才找，也不把它当作宠物出现或团聚的保证。"
};
const missingContact={
 title:'失联寻人',policy:'MISSING_CONTACT_POLICY.md',primarySource:'mh-070',
 references:[['mh-070','占求谋，以体为主，用为所谋之事。','明示现代类推：体为问事者能核实和协调的联系条件，用为恢复本人可确认的双向联系之事；不用卦代指失联者身体。'],['mh-064','更详观互卦、变卦，以断吉凶；复究盛衰，以明休咎。','人事通则用于核看事情进程，不据类象定位、识别第三人或判断失联原因。']],
 clauses:{equal:'体用比和，求谋称意。',body_controls_use:'体克用，谋虽可成，但成迟。',use_controls_body:'用克体，求谋不成，谋亦有害。',use_generates_body:'用生体。不谋而成；',body_generates_use:'体生用，多谋少遂。'},
 outcomes:['favourable','conditional','difficult'],
 scopeNote:'仅判断与指定失联者恢复可确认双向联系的传统倾向。本人回复、渠道核实与转述消息分开；不套行人归期，不输出位置、安危、生死、失联动机或确定联系日期',
 counterevidence:'完整爻辞、四条直接关系及全部五态逐项核看；比和与利见有联系条件之利，但不能抹去勿用、有悔或末后克体。无咎不等于恢复联系。',
 timingContext:'仅在近期已有正当且可核查的联系渠道时，以卦气法类推观察核实、转达或沟通受阻的阶段事件；日尺度不表示本人会于该日回信，更不指归家或安危。缺少可用事件和依据时逐篇说明不取期原因。',
 timingDisplay:'动态窗口按实际当地起卦日匹配，限定近期可核查的联系阶段；已经过去的日期不会用于新起卦。不要等窗口才核实失联情况。',
};
const target = process.argv[2];
if (target && !['promotion-pay','promotion-pay-v3','interview-pass','job-change','exam','workplace-stability','workplace-probation','new-relationship-opportunity','confession-decision','relationship-establishment','relationship-reconciliation','lost-object-recovery','lost-pet-recovery','missing-contact'].includes(target)) throw new Error('Unknown manuscript target: ' + target);
if (target === 'missing-contact') {
 await buildAuthoredManuscripts(MISSING_CONTACT_PROFILE,missingContact);
} else if (target === 'lost-pet-recovery') {
 await buildAuthoredManuscripts(LOST_PET_RECOVERY_PROFILE, lostPetRecovery);
} else if (target === 'job-change') {
 await buildAuthoredManuscripts(JOB_CHANGE_V3_PROFILE, jobChangeV3);
} else if (target === 'promotion-pay-v3') {
 await buildAuthoredManuscripts(PROMOTION_V3_PROFILE, promotionV3);
} else if (target === 'interview-pass') {
 await buildAuthoredManuscripts(INTERVIEW_V3_PROFILE, interviewV3);
} else if (target === 'exam') {
 await buildAuthoredManuscripts(EXAM_PROFILE, exam);
} else if (target === 'workplace-stability') {
 await buildAuthoredManuscripts(STABILITY_V3_PROFILE, stabilityV3);
} else if (target === 'workplace-probation') {
 // 旧版 workplace-probation-1.0.0 留档于 sources/editorial/workplace-probation/legacy-v1/。
 await buildAuthoredManuscripts(PROBATION_V3_PROFILE, probationV3);
} else if (target === 'new-relationship-opportunity') {
 await buildAuthoredManuscripts(NEW_RELATIONSHIP_OPPORTUNITY_PROFILE, newRelationshipOpportunity);
} else if (target === 'confession-decision') {
 await buildAuthoredManuscripts(CONFESSION_DECISION_PROFILE, confessionDecision);
} else if (target === 'lost-object-recovery') {
 await buildAuthoredManuscripts(LOST_OBJECT_RECOVERY_PROFILE, lostObjectRecovery);
} else if (target === 'relationship-reconciliation') {
 await buildAuthoredManuscripts(RELATIONSHIP_RECONCILIATION_PROFILE, relationshipReconciliation);
} else if (target === 'relationship-establishment') {
 await buildAuthoredManuscripts(ESTABLISHMENT_V3_PROFILE, establishmentV3);
} else if (target === 'promotion-pay') {
 await buildAuthoredManuscripts(PROMOTION_V3_PROFILE, promotionV3);
} else {
 // 晋升旧版（promotion-pay-1.0.2，timing.json 格式）已留档于 sources/editorial/promotion-pay/legacy-v1/，不再构建。
 await buildAuthoredManuscripts(PROMOTION_V3_PROFILE, promotionV3);
}
