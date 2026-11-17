import {mkdir, readFile, readdir, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {loadLibrary, interpretationArtifactDigest, AUDIT_CHECKS} from '../src/index.js';
import {inspectMovingLine, validateStoryCopy} from '../src/story-editorial.js';
import {resolveManuscriptDates} from '../src/prewritten-manuscripts.js';
import {readingDocumentHeader, renderReadingDocumentEntry, READING_DOCUMENT_DEMO_DATE, READING_DOCUMENT_TIMING_CONTEXT} from './authored-reading-document.mjs';
import {checkInterviewShort} from '../src/interview-decision-checks.js';
import {createContextualReading, promotionTimingSlots, LOST_OBJECT_RECOVERY_PROFILE, RELATIONSHIP_RECONCILIATION_PROFILE, RELATIONSHIP_ESTABLISHMENT_PROFILE, CONFESSION_DECISION_PROFILE, PROMOTION_PAY_PROFILE, JOB_CHANGE_PROFILE, EXAM_PROFILE, WORKPLACE_STABILITY_PROFILE, WORKPLACE_PROBATION_PROFILE, NEW_RELATIONSHIP_OPPORTUNITY_PROFILE} from '../src/interview-manuscripts.js';
import {MONTH_SLOTS} from '../src/month-slots.js';
import {TRIGRAM_PERIOD_SPECS} from '../src/timing-rules.js';
import {PRODUCT_TAXONOMY} from '../sources/editorial/product-taxonomy.mjs';

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
const counts = {bodies: 0, keys: 0, timingWindows: 0, dated: 0};
const literaryProgress = {standard:'V5.0', actor:'single-ai-literary-editor', completed:0, monthKeyCount:0, next:null};
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
 return {id, title: section.title, quote, locator: section.sourceRef, reason};
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
 if (drafts.length !== 30) throw new Error('An authored batch needs 30 individually written versions');
 let literaryReceipt = null;
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
 }
 const rows = [];
 const monthSlots = {};
 const name = library.getHexagram(primaryId).name;
 let readingDoc = readingDocumentHeader(primaryId, name);
 for (const [i, draft] of drafts.entries()) {
  const [movingLine, monthOrder, outcome, title, short, opening, process, ending, summary, resolution, topicDetail] = draft;
  const payRange = isPromotion ? topicDetail : undefined;
  if (movingLine !== Math.floor(i / 5) + 1 || monthOrder !== orders[i % 5] ||
      !config.outcomes.includes(outcome) || !resolution ||
      (isPromotion && (outcome === 'favourable') !== Boolean(payRange))) throw new Error('Invalid author record: ' + stem + '/' + (i + 1));
  const monthBranches = MONTH_SLOTS.filter(slot => slot.qi === monthOrder).map(slot => slot.branch);
  const r = createContextualReading({library, question, primaryId, movingLine, monthBranch: monthBranches[0], castingDate: READING_DOCUMENT_DEMO_DATE, applyVoid: false});
  const key = [questionId, primaryId, movingLine, monthOrder].join('/');
  const decisionId = key + '/' + outcome;
  const stageIds = Object.values(r.stages).map(stage => stage.id);
  const movingLineText = r.selectedMovingLine.text;
  const lineApplication = {evidence: [movingLineText], conditions: [resolution], sourcePath};
  const counterevidence = [{fact: 'facts.directRelations; facts.nodes; facts.movingLine', resolution}];
  const copy = {title, short: {decisionId, text: short}, long: {decisionId, opening, process, ending, summary}};
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
  if (profile === JOB_CHANGE_PROFILE && timingSpecs.some(spec => !['support','control','drain','equal'].includes(spec[0]))) {
   throw new Error('Job change only dates named transition events: ' + key);
  }
  if ((profile === EXAM_PROFILE || profile.namedStageEvents) && timingSpecs.length > 1) throw new Error('Only one event per draft: ' + key);
  if (profile === LOST_OBJECT_RECOVERY_PROFILE && timingSpecs.some(spec => !['support','control','equal'].includes(spec[0]))) {
   throw new Error('Lost-object timing requires a named lead, check or obstacle: ' + key);
  }
  if ([NEW_RELATIONSHIP_OPPORTUNITY_PROFILE, CONFESSION_DECISION_PROFILE, RELATIONSHIP_ESTABLISHMENT_PROFILE, RELATIONSHIP_RECONCILIATION_PROFILE].includes(profile) && timingSpecs.some(spec => !['support','control','equal'].includes(spec[0]))) {
   throw new Error('Relationship windows require supported contact, mutual interaction or a specific obstacle: ' + key);
  }
  if (profile === WORKPLACE_STABILITY_PROFILE && timingSpecs.some(spec => !['support','control','drain','equal'].includes(spec[0]))) {
   throw new Error('Workplace stability only dates named workplace events: ' + key);
  }
  if (timingSpecs.some(spec => spec?.length !== 5 &&
      !((profile === EXAM_PROFILE || (profile === WORKPLACE_PROBATION_PROFILE && spec?.[0] === 'name-support')) &&
        spec?.length === 6 && spec[5] === 'trigram-periods'))) {
   throw new Error('Invalid author timing: ' + key);
  }
  const timingSlots = promotionTimingSlots(r, timingSpecs, outcome, profile);
  if (new Set(timingSlots.map(slot => slot.id)).size !== timingSlots.length) throw new Error('Duplicate event timing: ' + key);
  const timingReason = timingOmission?.reason ?? timingSlots.map(slot => slot.reason).join(' ');
  const timingSourceIds = timingOmission?.sourceIds ?? [...new Set(timingSlots.flatMap(slot => slot.sourceIds))];
  const openingRelation = r.edges.find(edge => edge.targetRole === 'use').type;
  const closingRelation = r.edges.find(edge => edge.targetRole === 'changed_use').type;
  if ((isPromotion || profile === EXAM_PROFILE || profile === WORKPLACE_PROBATION_PROFILE) && outcome === 'favourable' && openingRelation === 'use_controls_body' &&
      !r.edges.some(edge => edge.type === 'use_generates_body')) {
   throw new Error('求名 verdict conflicts with the opening 求名占 rule and has no direct 生体: ' + key);
  }
  const sourceEvidence = [...commonEvidence,
   evidence(config.primarySource, config.clauses[openingRelation], '本用对原体为开局的直接依据。'),
   ...(openingRelation === closingRelation ? [] : [evidence(config.primarySource, config.clauses[closingRelation], '同一关系条文用于理解末段走势。')]),
   ...(isPromotion ? [evidence('mh-072', moneyClauses[closingRelation], '财占条文供辨末段财利和耗费。本问的随岗调薪随任用判断。')] : []),
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
    sourceRef:r.selectedMovingLine.sourceRef, referenceUrl:r.selectedMovingLine.referenceUrl},
  };
  const sourceIds = [...new Set([...sourceEvidence.map(s => s.id), ...timingSourceIds, facts.movingLine.sourceRef.sourceId])];
  const decision = {id:decisionId, outcomeCode:outcome, question_type:question.question_type,
   questionScope:profile.questionScope??'promotion-with-associated-pay', lineApplication, counterevidence, sourceEvidence,
   ...(isPromotion ? {pay:outcome==='favourable'?{state:'follows-promotion',rangeKind:'qualitative',range:payRange}:{state:'unfavourable-with-promotion'}} : {}),
   indirectEffectsApplied:[]};
  const authorship = {method:'individually-written-and-reviewed', version:manuscriptVersion, sourcePath, manualWholeArticleReview:true};
  const literaryEntry = literaryReceipt?.entries.find(entry => entry.rowIndex === i);
  if (literaryEntry?.status === 'POLISH_COMPLETED') {
   const copyHash = createHash('sha256').update(JSON.stringify({title,short,opening,process,ending,summary})).digest('hex');
   if (literaryEntry.afterCopySha256 !== copyHash || literaryEntry.id !== decisionId || literaryEntry.outcome !== outcome ||
       !/^[a-f0-9]{64}$/.test(literaryEntry.beforeCopySha256) || !literaryEntry.reason || !literaryEntry.reviewedAt) {
    throw new Error('Stale literary review receipt: ' + key);
   }
   authorship.literaryPolish = {standard:'V5.0', status:'POLISH_COMPLETED', actor:literaryProgress.actor,
    receiptPath:literaryReceiptPath, copySha256:copyHash, reviewedAt:literaryEntry.reviewedAt};
   literaryProgress.completed++;
   literaryProgress.monthKeyCount += monthBranches.length;
  } else if (profile === LOST_OBJECT_RECOVERY_PROFILE && literaryProgress.next === null) {
   literaryProgress.next = {primaryId,movingLine,monthOrder,monthBranches};
  }
  const receipts = [
   ['facts.stages', stageIds.join(' / ') + '，' + facts.movingLine.label + '动'],
   ['facts.nodes', facts.nodes.map(n => n.role + ' ' + n.trigram).join(' / ')],
   [isPromotion ? 'mh-071;mh-072' : config.primarySource, config.scopeNote],
   ['facts.directRelations', facts.directRelations.map(e => e.role + ' ' + e.type).join(' / ')],
   ['facts.nodes', facts.nodes.map(n => n.trigram + n.qi).join(' / ')],
   ['mh-061;mh-117', '经典体用及同一月令五态'],
   ['decision.indirectEffectsApplied', '四处各自对原体看直接作用'],
   [timingSourceIds.join(';'), timingReason],
   ['decision.counterevidence', resolution],
  ];
  const review = {status:'author-checked', actor:'assistant-author', version:manuscriptVersion,
   scope:'facts-and-full-copy', independentReview:{status:'pending', timingInterpretation:'pending', userAcceptedThisVersion:false},
   checks:Object.fromEntries(AUDIT_CHECKS.map((id, j) => [id, {status:'pass', evidence:[{locator:receipts[j][0],reason:receipts[j][1]}]}]))};
  const row = {primaryId, movingLine, monthOrder, monthBranches, stageIds, movingLineText, baseProse:true, voidProfileKey:'base-no-void',
   facts, decision, copy, copyChecks, sourceIds, lineApplication, counterevidence, authorship, review,
   timingSpecs, timingSlots, ...(timingOmission ? {timingOmission} : {}), voidTimingSlots:[], ruleVersions:{decision:manuscriptVersion,timing:profile.timingVersion ?? slug+'-day-1.0.0'}};
  row.artifactDigest = await interpretationArtifactDigest(row);
  for (const branch of monthBranches) monthSlots[movingLine + ':' + branch] = i;
  rows.push(row);
  counts.bodies++;
  counts.keys += monthBranches.length;
  outcomeCounts[outcome]++;
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
    '结局：' + ending + (payRange ? ' ' + payRange : ''),
    timingOmission ? '应期：此盘暂无有据的日期可列。' : '应期：以下为传统推算的参考窗口。\n' +
     timing.paragraphs.map((text, index) => profile === EXAM_PROFILE ? text : text.replace('。', '，属' + timingSlots[index].valence + '应。')).join(' '),
    '总断：' + summary,
   ],
   sourceTitles,
   calculation: [
    `对照起卦日：${r.castingDate}，${r.dayGanzhi}日。体用位置：${r.body.side === 'upper' ? '上卦' : '下卦'}为原体，${r.use.side === 'upper' ? '上卦' : '下卦'}为本用。`,
    r.edges.map(edge => edge.targetRole + '：' + edge.label).join('；') + '。',
    resolution,
    timingOmission?.reason ?? (config.timingDisplay ?? config.timingContext),
    ...timingSlots.map((slot, index) => {
     const {trigram, element} = slot.calculationBasis;
     const method = slot.method === 'trigram-periods' ? (slot.kind === 'name-body' ? '先天体卦时序法' : '先天经卦时序法') : '先天卦气法';
     return `${slot.valence}应 · ${slot.event}。取${trigram}${element}，${slot.branches.join('、')}日。用${method}按日匹配，先查起卦当月余日，无匹配再查下月。示例 ${timing.dateMatches[index].displayedDates.join('、')}。 ${slot.reason}`;
    }),
    ...sourceEvidence.map(source => `- ${source.id}《${source.title}》，原文第 ${source.locator.startLine} 行起。\n  “${source.quote}”\n  ${source.reason}`),
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
 ...common, baseCaseCount:counts.keys, baseVersionCount:counts.bodies, authoredVersionCount:counts.bodies,
 contextProfileCount:counts.bodies, totalBaseCases:4608, totalCharts:384, fullTwelveMonthCharts:files.length * 6,
 remainingBaseSlots:4608-counts.keys, authorWholeArticleReviewed:counts.bodies,
 ...(profile === LOST_OBJECT_RECOVERY_PROFILE ? {literaryPolish:{...literaryProgress,remaining:counts.bodies-literaryProgress.completed}} : {}),
 ...(isPromotion ? {favourable:outcomeCounts.favourable} : {outcomeCounts}),
 dated:counts.dated, undated:counts.bodies-counts.dated, timingWindowCount:counts.timingWindows, independentReview:'pending', userAccepted:0, files,
 next:files.length === 64 ? null : {primaryId:files.length+1, movingLine:1, monthOrder:orders[0], monthBranches:['寅','卯']},
};
await saveJSON(base + 'index.json', progress);
await writeFile(new URL(docDir + 'README.md', root), [
 '# ' + config.title + '断语', '', isPromotion ? '问项为本次晋升及随岗加薪。' : config.scopeNote + '。', '',
 '已逐篇写作并由作者核读 ' + counts.bodies + ' 篇，覆盖 ' + progress.fullTwelveMonthCharts + ' / 384 种基础盘、' + counts.keys + ' / 4,608 个月令检索位置。',
 ...(profile === LOST_OBJECT_RECOVERY_PROFILE ? ['V5.0 单 AI 全文精修已完成 ' + literaryProgress.completed + ' / ' + counts.bodies + ' 篇，对应 ' + literaryProgress.monthKeyCount + ' / ' + counts.keys + ' 个月令键。剩余 ' + (counts.bodies-literaryProgress.completed) + ' 篇待精修。'] : []),
 ...(profile === LOST_OBJECT_RECOVERY_PROFILE && literaryProgress.next ? ['下一精修键 ' + [questionId,literaryProgress.next.primaryId,literaryProgress.next.movingLine,literaryProgress.next.monthOrder].join(' / ')] : []),
 ...(isPromotion ? ['其中 ' + outcomeCounts.favourable + ' 篇倾向晋升并随岗加薪，' + outcomeCounts.difficult + ' 篇倾向本次难以落实。'] : []),
 '已写入应期规则 ' + progress.dated + ' 篇，待取期 ' + progress.undated + ' 篇。阅读文档使用 ' + READING_DOCUMENT_DEMO_DATE + ' 演示日期，软件按各次实际起卦日换算。独立专业审核待完成。',
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
 outcomes:['favourable','difficult'], scopeNote:'名分与随岗薪资同问，薪资承接晋升结果',
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
 outcomes:['favourable','difficult'], scopeNote:'只判断当次试用期的通过倾向',
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
 title:'物品找回 · 丢失的这件物品还能找回来吗？',
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
 scopeNote:'判断指定物品是否有望核实并实际取回。确认遗落范围、获得消息和领回原物分开记录',
 counterevidence:'核对初段难寻、两互能否提供有效线索及收尾能否领回。比和可取在已知处回查，不视为物品已定位。',
 timingContext:'近期已有可继续核查的记录或可联系的经手方时，才依生体、比和或克体择一个可观察的阶段事件，不据取日推定已经寻回。',
};
const target = process.argv[2];
if (target && !['job-change','exam','workplace-stability','workplace-probation','new-relationship-opportunity','confession-decision','relationship-establishment','relationship-reconciliation','lost-object-recovery'].includes(target)) throw new Error('Unknown manuscript target: ' + target);
if (target === 'job-change') {
 await buildAuthoredManuscripts(JOB_CHANGE_PROFILE, jobChange);
} else if (target === 'exam') {
 await buildAuthoredManuscripts(EXAM_PROFILE, exam);
} else if (target === 'workplace-stability') {
 await buildAuthoredManuscripts(WORKPLACE_STABILITY_PROFILE, workplaceStability);
} else if (target === 'workplace-probation') {
 await buildAuthoredManuscripts(WORKPLACE_PROBATION_PROFILE, workplaceProbation);
} else if (target === 'new-relationship-opportunity') {
 await buildAuthoredManuscripts(NEW_RELATIONSHIP_OPPORTUNITY_PROFILE, newRelationshipOpportunity);
} else if (target === 'confession-decision') {
 await buildAuthoredManuscripts(CONFESSION_DECISION_PROFILE, confessionDecision);
} else if (target === 'lost-object-recovery') {
 await buildAuthoredManuscripts(LOST_OBJECT_RECOVERY_PROFILE, lostObjectRecovery);
} else if (target === 'relationship-reconciliation') {
 await buildAuthoredManuscripts(RELATIONSHIP_RECONCILIATION_PROFILE, relationshipReconciliation);
} else if (target === 'relationship-establishment') {
 await buildAuthoredManuscripts(RELATIONSHIP_ESTABLISHMENT_PROFILE, relationshipEstablishment);
} else await buildAuthoredManuscripts(PROMOTION_PAY_PROFILE, promotion);
