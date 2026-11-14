import {mkdir, readFile, readdir, writeFile} from 'node:fs/promises';
import {loadLibrary, interpretationArtifactDigest, AUDIT_CHECKS} from '../src/index.js';
import {inspectMovingLine, validateStoryCopy} from '../src/story-editorial.js';
import {resolveManuscriptDates} from '../src/prewritten-manuscripts.js';
import {readingDocumentHeader, renderReadingDocumentEntry, READING_DOCUMENT_DEMO_DATE, READING_DOCUMENT_TIMING_CONTEXT} from './authored-reading-document.mjs';
import {checkInterviewShort} from '../src/interview-decision-checks.js';
import {createContextualReading, promotionTimingSlots, PROMOTION_PAY_PROFILE, JOB_CHANGE_PROFILE, EXAM_PROFILE, WORKPLACE_STABILITY_PROFILE} from '../src/interview-manuscripts.js';
import {MONTH_SLOTS} from '../src/month-slots.js';
import {TRIGRAM_PERIOD_SPECS} from '../src/timing-rules.js';
import {PRODUCT_TAXONOMY} from '../sources/editorial/product-taxonomy.mjs';

const root = new URL('../', import.meta.url);
const library = await loadLibrary();
const careerQuestions = PRODUCT_TAXONOMY[0].subcategories.flatMap(subcategory => subcategory.questions);

async function buildCareerManuscripts(profile, config) {
const {directory: slug, questionId, manuscriptVersion} = profile;
const sourceDir = 'sources/editorial/' + slug + '/';
const base = 'data/authored-readings/' + slug + '/';
const docDir = 'docs/' + slug + '/';
const isPromotion = profile === PROMOTION_PAY_PROFILE;
const raw = careerQuestions.find(q => 'career.' + q.id === questionId);
const question = {...raw, id: questionId};
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
 if (drafts.length !== 30) throw new Error('A career batch needs 30 individually written versions');
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
   if (seen.has(sample)) throw new Error('Duplicate career copy: ' + location + ' / ' + seen.get(sample));
   seen.set(sample, location);
   for (const sentence of value.split(/[。！？]/u)) {
    const hanCount = sentence.match(/\p{Script=Han}/gu)?.length ?? 0;
    if (hanCount < 12) continue;
    const normalized = sentence.replace(/[^\p{Letter}\p{Number}]/gu, '');
    if (seenSentences.has(normalized)) throw new Error('Duplicate career sentence: ' + location + ' / ' + seenSentences.get(normalized));
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
  if ((profile === EXAM_PROFILE || profile === WORKPLACE_STABILITY_PROFILE) && timingSpecs.length > 1) throw new Error('Only one event per draft: ' + key);
  if (profile === WORKPLACE_STABILITY_PROFILE && timingSpecs.some(spec => !['support','control','drain','equal'].includes(spec[0]))) {
   throw new Error('Workplace stability only dates named workplace events: ' + key);
  }
  if (timingSpecs.some(spec => spec?.length !== 5 &&
      !(profile === EXAM_PROFILE && spec?.length === 6 && spec[5] === 'trigram-periods'))) {
   throw new Error('Invalid author timing: ' + key);
  }
  const timingSlots = promotionTimingSlots(r, timingSpecs, outcome, profile);
  if (new Set(timingSlots.map(slot => slot.id)).size !== timingSlots.length) throw new Error('Duplicate event timing: ' + key);
  const timingReason = timingOmission?.reason ?? timingSlots.map(slot => slot.reason).join(' ');
  const timingSourceIds = timingOmission?.sourceIds ?? [...new Set(timingSlots.flatMap(slot => slot.sourceIds))];
  const openingRelation = r.edges.find(edge => edge.targetRole === 'use').type;
  const closingRelation = r.edges.find(edge => edge.targetRole === 'changed_use').type;
  if ((isPromotion || profile === EXAM_PROFILE) && outcome === 'favourable' && openingRelation === 'use_controls_body' &&
      !r.edges.some(edge => edge.type === 'use_generates_body')) {
   throw new Error('求名 verdict conflicts with the opening 求名占 rule and has no direct 生体: ' + key);
  }
  const sourceEvidence = [...commonEvidence,
   evidence(config.primarySource, config.clauses[openingRelation], '本用对原体为开局的直接依据。'),
   ...(openingRelation === closingRelation ? [] : [evidence(config.primarySource, config.clauses[closingRelation], '同一关系条文用于理解末段走势。')]),
   ...(isPromotion ? [evidence('mh-072', moneyClauses[closingRelation], '财占条文供辨末段财利和耗费。本问的随岗调薪随任用判断。')] : []),
   evidence('mh-122', '应之期远，则以年，近则以月，又近则以日也。', config.timingContext),
   ...timingSlots.map(slot => evidence(...timingQuotes[slot.kind], slot.reason)),
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
 ...(isPromotion ? {favourable:outcomeCounts.favourable} : {outcomeCounts}),
 dated:counts.dated, undated:counts.bodies-counts.dated, timingWindowCount:counts.timingWindows, independentReview:'pending', userAccepted:0, files,
 next:files.length === 64 ? null : {primaryId:files.length+1, movingLine:1, monthOrder:orders[0], monthBranches:['寅','卯']},
};
await saveJSON(base + 'index.json', progress);
await writeFile(new URL(docDir + 'README.md', root), [
 '# ' + config.title + '断语', '', isPromotion ? '问项为本次晋升及随岗加薪。' : config.scopeNote + '。', '',
 '已逐篇写作并由作者核读 ' + counts.bodies + ' 篇，覆盖 ' + progress.fullTwelveMonthCharts + ' / 384 种基础盘、' + counts.keys + ' / 4,608 个月令检索位置。',
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
const target = process.argv[2];
if (target && !['job-change','exam','workplace-stability'].includes(target)) throw new Error('Unknown career manuscript target: ' + target);
if (target === 'job-change') {
 await buildCareerManuscripts(JOB_CHANGE_PROFILE, jobChange);
} else if (target === 'exam') {
 await buildCareerManuscripts(EXAM_PROFILE, exam);
} else if (target === 'workplace-stability') {
 await buildCareerManuscripts(WORKPLACE_STABILITY_PROFILE, workplaceStability);
} else await buildCareerManuscripts(PROMOTION_PAY_PROFILE, promotion);
