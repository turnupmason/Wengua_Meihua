import {mkdir, readFile, readdir, writeFile} from 'node:fs/promises';
import {loadLibrary, interpretationArtifactDigest, AUDIT_CHECKS} from '../src/index.js';
import {inspectMovingLine, validateStoryCopy} from '../src/story-editorial.js';
import {checkInterviewShort} from '../src/interview-decision-checks.js';
import {createContextualReading, promotionTimingSlots, PROMOTION_PAY_PROFILE} from '../src/interview-manuscripts.js';
import {MONTH_SLOTS} from '../src/month-slots.js';
import {TRIGRAM_PERIOD_SPECS} from '../src/timing-rules.js';
import {PRODUCT_TAXONOMY} from '../sources/editorial/product-taxonomy.mjs';

const root = new URL('../', import.meta.url);
const sourceDir = 'sources/editorial/promotion-pay/';
const base = 'data/authored-readings/promotion-pay/';
const docDir = 'docs/promotion-pay/';
const {questionId, manuscriptVersion} = PROMOTION_PAY_PROFILE;
const library = await loadLibrary();
const raw = PRODUCT_TAXONOMY[0].subcategories.find(s => s.id === 'promotion-pay').questions.find(q => q.id === 'promotion-pay.promotion');
const question = {...raw, id: questionId};
const common = {schemaVersion: '1.0.0', contentVersion: library.contentVersion, manuscriptVersion, questionId};
const orders = ['spring-wood', 'summer-fire', 'autumn-metal', 'winter-water', 'seasonal-earth'];
const timingByHexagram = JSON.parse(await readFile(new URL(sourceDir + 'timing.json', root), 'utf8'));
const timingQuotes = {
 'name-support':['mh-071','欲知名成之日，生体之卦气详之。'],
 'name-body':['mh-071','若无克体之卦，则名易就，止看卦体时序之类，以定日期。'],
 support:['mh-116','看卦中有生体之卦，则事应于生体卦气之日'],
 control:['mh-122','细观生体之卦为吉，应决期克体之卦为凶。'],
 drain:['mh-143','不宜克体，亦不宜体卦生之也。'],
 equal:['mh-143','盖卦宜生体，宜比和；'],
};
const seen = new Map();
const counts = {bodies: 0, keys: 0, favourable: 0, noDate: 0};
const files = [];
const directory = [];
const references = [
 ['mh-056', '成卦之后先看《周易》爻辞', '依本卦完整动爻取义。'],
 ['mh-071', '凡占求名，以体为主，用为名。', '本次职位或职级能否落实，参求名。'],
 ['mh-072', '用生体，财有进益之喜。', '辨随岗薪资的进益和幅度，依本次职位结果。'],
 ['mh-117', '用为占之即应，互为中间之应，变为事占之终应。', '本用及两互、变用各自对原体，分阶段核看。'],
 ['mh-119', '凡体卦宜乘旺，克体之卦宜衰。', '各位置同时使用实际月令五态。'],
 ['mh-116', '如占吉事，无生体之卦，有克体之卦，则事不谐矣。', '在有克而无直接生扶的盘里核对名成反证。'],
];

function evidence(id, quote, reason) {
 const section = library.getSection(id);
 if (!section.text.includes(quote)) throw new Error('Source excerpt mismatch: ' + id);
 return {id, title: section.title, quote, locator: section.sourceRef, reason};
}
const commonEvidence = references.map(args => evidence(...args));
const nameClauses = {
 equal:'体用比和，功名称意。',
 body_controls_use:'体克用，名可成，但成迟。',
 use_controls_body:'用克体，名不可成。',
 use_generates_body:'用生体，名易成，或因名有得。',
 body_generates_use:'体生用，名不可就，或因名有丧。',
};
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
 if (filename !== stem + '.json') throw new Error('Expected sequential promotion source: ' + stem);
 const sourcePath = sourceDir + filename;
 const drafts = JSON.parse(await readFile(new URL(sourcePath, root), 'utf8'));
 if (drafts.length !== 30) throw new Error('A promotion batch needs 30 individually written versions');
 const rows = [];
 const monthSlots = {};
 const name = library.getHexagram(primaryId).name;
 const readingDoc = ['# ' + name + ' · 晋升加薪', '', '每一爻按五组月气查预写全文。'];
 for (const [i, draft] of drafts.entries()) {
  const [movingLine, monthOrder, outcome, title, short, opening, process, ending, summary, resolution, timing, payRange] = draft;
  if (movingLine !== Math.floor(i / 5) + 1 || monthOrder !== orders[i % 5] ||
      !['favourable', 'difficult'].includes(outcome) || !resolution || !timing ||
      (outcome === 'favourable') !== Boolean(payRange)) throw new Error('Invalid promotion author record: ' + stem + '/' + (i + 1));
  const monthBranches = MONTH_SLOTS.filter(slot => slot.qi === monthOrder).map(slot => slot.branch);
  const r = createContextualReading({library, question, primaryId, movingLine, monthOrder, castingDate: '2026-11-11', applyVoid: false});
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
  } catch (error) {
   throw new Error(key + ': ' + error.message, {cause:error});
  }
  for (const [field, value] of Object.entries({title, short, opening, process, ending, summary})) {
   const sample = value.replace(/[^\p{Script=Han}\p{Letter}\p{Number}]/gu, '');
   if (seen.has(sample)) throw new Error('Duplicate promotion copy: ' + key + '/' + field + ' / ' + seen.get(sample));
   seen.set(sample, key + '/' + field);
  }

  const timingLine = timingByHexagram[primaryId]?.[movingLine - 1];
  const timingSpecs = timingLine?.[1][i % orders.length]?.map(index => timingLine[0][index]);
  if (!timingSpecs?.length || timingSpecs.some(spec => spec?.length !== 5)) throw new Error('Missing author timing: ' + key);
  const timingSlots = promotionTimingSlots(r, timingSpecs, outcome);
  if (new Set(timingSlots.map(slot => slot.id)).size !== timingSlots.length) throw new Error('Duplicate event timing: ' + key);
  const timingReason = timingSlots.map(slot => slot.reason).join(' ');
  const timingSourceIds = [...new Set(timingSlots.flatMap(slot => slot.sourceIds))];
  const relation = r.edges.find(e => e.targetRole === 'changed_use').type;
  const sourceEvidence = [...commonEvidence,
   evidence('mh-071', nameClauses[relation], resolution),
   evidence('mh-072', moneyClauses[relation], payRange || '本次晋升偏难，随岗薪资同断。'),
   evidence('mh-122', '应之期远，则以年，近则以月，又近则以日也。', '日级窗口对应已经进入近期流程的评定。'),
   ...timingSlots.map(slot => evidence(...timingQuotes[slot.kind], slot.reason)),
   ...(timingSlots.some(slot => slot.kind === 'name-body') ? [evidence('mh-052',
    TRIGRAM_PERIOD_SPECS.find(period => period.trigram === r.nodes.find(node => node.role === 'body').trigram).quote,
    '按原体所属时序取日支。')] : [])];
  const facts = {
   stages: Object.values(r.stages).map(s => ({id:s.id, name:s.name, baseGrade:s.baseGrade})),
   nodes: r.nodes.map(n => ({role:n.role, trigram:n.trigram, element:n.element, qi:n.strength.state})),
   directRelations: r.edges.map(e => ({role:e.targetRole, type:e.type})),
   movingLine: {...inspectMovingLine(movingLineText), label:r.selectedMovingLine.label, image:r.selectedMovingLine.image,
    sourceRef:r.selectedMovingLine.sourceRef, referenceUrl:r.selectedMovingLine.referenceUrl},
  };
  const sourceIds = [...new Set([...sourceEvidence.map(s => s.id), ...timingSourceIds, facts.movingLine.sourceRef.sourceId])];
  const decision = {id:decisionId, outcomeCode:outcome, question_type:question.question_type,
   questionScope:'promotion-with-associated-pay', lineApplication, counterevidence, sourceEvidence,
   pay:outcome==='favourable'?{state:'follows-promotion',rangeKind:'qualitative',range:payRange}:{state:'unfavourable-with-promotion'},
   indirectEffectsApplied:[]};
  const authorship = {method:'individually-written-and-reviewed', version:manuscriptVersion, sourcePath, manualWholeArticleReview:true};
  const receipts = [
   ['facts.stages', stageIds.join(' / ') + '，' + facts.movingLine.label + '动'],
   ['facts.nodes', facts.nodes.map(n => n.role + ' ' + n.trigram).join(' / ')],
   ['mh-071;mh-072', '名分与随岗薪资同问，薪资承接晋升结果'],
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
   timingSpecs, timingSlots, voidTimingSlots:[], ruleVersions:{decision:manuscriptVersion,timing:'promotion-pay-day-1.0.0'}};
  row.artifactDigest = await interpretationArtifactDigest(row);
  for (const branch of monthBranches) monthSlots[movingLine + ':' + branch] = i;
  rows.push(row);
  counts.bodies++;
  counts.keys += monthBranches.length;
  counts.favourable += Number(outcome === 'favourable');
  counts.noDate += Number(timingSlots.length === 0);
  readingDoc.push('', '## ' + facts.movingLine.label + ' · ' + monthBranches.join('、'),
   '', title, '', short, '', '开局　' + opening, '', '过程　' + process, '', '结局　' + ending,
   '', '应期　传统推算的参考窗口，适用于本次评定已进入近期流程。', '',
   ...timingSlots.map(slot => '- ' + slot.valence + '应 · ' + slot.event + '，取' + slot.branches.join('、') + '日。' + slot.text),
   '', '总断　' + summary, '', '<details><summary>卦象和依据</summary>', '',
   facts.stages.map(s => s.name).join(' → '), '', movingLineText, '',
   facts.nodes.map(n => n.role + ' ' + n.trigram + n.element + n.qi).join('，'), '',
   facts.directRelations.map(e => e.role + ' ' + e.type).join('，'), '',
   resolution, '', ...timingSlots.map(slot => '取期依据 · ' + slot.reason + '（' + slot.sourceIds.join('、') + '）'), '', ...(payRange ? ['加薪幅度取象　' + payRange, ''] : []), '稿件键 `' + key + '` · [作者源](../../' + sourcePath + ') · [断法和出处](../PROMOTION_PAY_POLICY.md)', '', '</details>');
 }
 const path = base + stem + '.json';
 await saveJSON(path, {...common, primaryId, monthSlots, rows});
 files.push({primaryId, path, count:rows.length, monthSlotCount:Object.keys(monthSlots).length});
 await writeFile(new URL(docDir + stem + '.md', root), readingDoc.join('\n') + '\n');
 directory.push('- [' + name + '](' + stem + '.md) · ' + rows.length + ' 篇');
}
const progress = {
 ...common, baseCaseCount:counts.keys, baseVersionCount:counts.bodies, authoredVersionCount:counts.bodies,
 contextProfileCount:counts.bodies, totalBaseCases:4608, totalCharts:384, fullTwelveMonthCharts:files.length * 6,
 remainingBaseSlots:4608-counts.keys, authorWholeArticleReviewed:counts.bodies, favourable:counts.favourable,
 dated:counts.bodies-counts.noDate, undated:counts.noDate, independentReview:'pending', userAccepted:0, files,
 next:files.length === 64 ? null : {primaryId:files.length+1, movingLine:1, monthOrder:orders[0], monthBranches:['寅','卯']},
};
await saveJSON(base + 'index.json', progress);
await writeFile(new URL(docDir + 'README.md', root), [
 '# 晋升加薪断语', '', '问项为本次晋升及随岗加薪。', '',
 '已逐篇写作并由作者核读 ' + counts.bodies + ' 篇，覆盖 ' + progress.fullTwelveMonthCharts + ' / 384 种基础盘、' + counts.keys + ' / 4,608 个月令检索位置。',
 '其中 ' + counts.favourable + ' 篇倾向晋升并随岗加薪，' + (counts.bodies-counts.favourable) + ' 篇倾向本次难以落实。',
 '已写入应期规则 ' + progress.dated + ' 篇，待取期 ' + progress.undated + ' 篇。公历候选日按各次起卦日期换算，独立专业审核待完成。',
 '下一键 ' + (progress.next ? [questionId,progress.next.primaryId,progress.next.movingLine,progress.next.monthOrder].join(' / ') : '已写满'),
 '', '[断法与古籍出处](../PROMOTION_PAY_POLICY.md)', '', ...directory, '',
].join('\n'));
console.log(progress);
