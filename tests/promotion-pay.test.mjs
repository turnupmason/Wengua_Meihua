import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {READING_DOCUMENT_DEMO_DATE} from '../scripts/authored-reading-document.mjs';
import {assessSeasonalQi, interpretationArtifactDigest, loadLibrary, createProductRepository, findUpcomingCivilDayMatches, getCivilDay, MONTH_SLOTS} from '../src/index.js';

const questionId = 'career.promotion-pay.promotion';
const library = await loadLibrary();
const repository = createProductRepository({library});
const load = async path => JSON.parse(await readFile(new URL('../' + path, import.meta.url), 'utf8'));
const index = await load('data/authored-readings/promotion-pay/index.json');
const options = {questionId, castingDate:'2028-02-25', timingScale:'day', timingContext:{castingMethod:'pre-heaven',periodMethod:'element-qi'}};

test('each completed promotion chart resolves all twelve keys to its own reviewed text and pay verdict', async () => {
 let copies = 0, slots = 0, dated = 0;
 for (const entry of index.files) {
  const shard = await load(entry.path);
  assert.equal(shard.rows.length, 30);
  copies += shard.rows.length;
  for (const row of shard.rows) {
   const {artifactDigest, ...material} = row;
   assert.equal(await interpretationArtifactDigest(material), artifactDigest);
   assert.equal(row.movingLineText, library.getLineReading(row.primaryId, row.movingLine).text);
   assert.equal(row.review.independentReview.status, 'pending');
   if (row.timingSlots.length) {
    dated++;
    assert.equal(row.timingOmission, undefined);
   } else {
    assert.equal(row.timingOmission?.status, 'not-derived');
    assert.ok(row.timingOmission.reason && row.timingOmission.sourceIds.length);
   }
   for (const node of row.facts.nodes) assert.equal(node.qi, assessSeasonalQi(node.element, row.monthOrder).state);
   for (const evidence of row.decision.sourceEvidence) {
    const section = library.getSection(evidence.id);
    assert.ok(section.text.includes(evidence.quote));
    assert.deepEqual(evidence.locator, section.sourceRef);
   }
  }
  for (let movingLine = 1; movingLine <= 6; movingLine++) {
   for (const {branch, qi} of MONTH_SLOTS) {
    const result = await repository.getContent({...options, primaryId:entry.primaryId, movingLine, monthBranch:branch});
    const row = shard.rows[shard.monthSlots[movingLine + ':' + branch]];
    assert.equal(result.status, 'ready');
    assert.equal(result.monthBranch, branch);
    assert.equal(row.primaryId, entry.primaryId);
    assert.equal(row.movingLine, movingLine);
    assert.equal(row.monthOrder, qi);
    assert.deepEqual(row.stageIds, Object.values(result.reading.stages).map(stage => stage.id));
    assert.deepEqual(row.facts.directRelations, result.reading.edges.map(edge => ({role: edge.targetRole, type: edge.type})));
    assert.equal(result.short, row.copy.short.text);
    assert.equal(result.decision.id, row.copy.long.decisionId);
    assert.equal(result.decision.pay.state, result.decision.outcomeCode === 'favourable' ? 'follows-promotion' : 'unfavourable-with-promotion');
    assert.deepEqual(result.narrativeParagraphs.map(p => p.split('：',1)[0]), ['开局','过程','结局','总断']);
    if (row.decision.pay.range) assert.ok(result.narrativeParagraphs[2].endsWith(row.decision.pay.range));
    assert.equal(result.calculationExplanation.void, undefined);
    assert.equal(result.timingSection.windows.length, row.timingSlots.length);
    if (row.timingOmission) assert.deepEqual(result.calculationExplanation.timing.omission, row.timingOmission);
    assert.ok(result.calculationExplanation.paragraphs.some(p => p.startsWith('本互变：')));
    assert.ok(result.calculationExplanation.paragraphs.some(p => p.includes('体互') && p.includes('用互') && p.includes('变用')));
    for (const [i, window] of result.timingSection.windows.entries()) {
     const rule = row.timingSlots[i];
     const expected = findUpcomingCivilDayMatches({castingDate:options.castingDate, branches:rule.branches});
     assert.deepEqual(window.displayedDates, expected.matches.slice(0,2).map(day => day.date));
     assert.equal(window.event, rule.event);
     assert.equal(window.valence, rule.valence);
     assert.ok(window.text.includes(rule.text));
     assert.ok(window.displayedDates.every(day => day >= options.castingDate && rule.branches.includes(getCivilDay(day).dayBranch)));
     if (window.eventScope === 'positive-result-candidate') assert.equal(row.decision.outcomeCode, 'favourable');
    }
    slots++;
   }
  }
 }
 assert.equal(index.authorWholeArticleReviewed, copies);
 assert.equal(index.baseCaseCount, slots);
 assert.equal(index.remainingBaseSlots, 4608 - slots);
 assert.equal(index.dated, dated);
 assert.equal(index.undated, copies - dated);
 if (index.next) {
  const pending = await repository.getContent({...options, primaryId:index.next.primaryId, movingLine:1, monthBranch:'寅'});
  assert.equal(pending.status, 'pending-authoring');
  assert.equal(pending.story, null);
 }
});

test('promotion Markdown uses the existing interview extraction format and shows resolved dates', async () => {
 const readDocument = path => readFile(new URL('../' + path, import.meta.url), 'utf8');
 // Match the published interview layout, including punctuation and the position of the folded block.
 const readEntry = entry => {
  const [heading,title,stages,shortLabel,short,opening,process,ending,timing,summary,sources,line,details] = entry.split('\n\n');
  assert.match(heading, /^## (?:初[六九]|[六九][二三四五]|上[六九])动 · (?:[寅卯辰巳午未申酉戌亥子丑]月、)*[寅卯辰巳午未申酉戌亥子丑]月$/u);
  assert.ok(title && short);
  assert.match(stages, /^\S+ → \S+ → \S+$/u);
  assert.equal(shortLabel, '简断');
  assert.match(opening, /^开局：.+/u);
  assert.match(process, /^过程：.+/u);
  assert.match(ending, /^结局：.+/u);
  if (timing !== '应期：此盘暂无有据的日期可列。') {
   assert.match(timing, /^应期：以下为传统推算的参考窗口。\n可留意(?:本月|下月)\d+(?:、\d+)*号/u);
  }
  assert.match(summary, /^总断：.+/u);
  assert.match(sources, /^古籍依据：《周易·[^》]+》《梅花易数·[^》]+》/u);
  assert.match(line, /^动爻完整原文：.+/u);
  assert.equal(details, '<details>\n<summary>计算说明</summary>');
  assert.match(entry, /\n<\/details>\s*$/u);
  return {heading, title, stages, short, timing, line};
 };
 const interview = await readDocument('docs/interview-pass/hex-001.md');
 const reference = interview.split(/(?=^## )/mu).find(entry => entry.startsWith('## 九二动 · 寅月、卯月\n'));
 assert.ok(reference);
 readEntry(reference);

 for (const entry of index.files) {
  const shard = await load(entry.path);
  const stem = entry.path.split('/').at(-1).replace('.json', '.md');
  const doc = await readDocument('docs/promotion-pay/' + stem);
  assert.ok(doc.includes('应期以' + READING_DOCUMENT_DEMO_DATE + '作日序演示'));
  const sections = doc.split(/(?=^## )/mu).slice(1);
  assert.equal(sections.length, shard.rows.length);
  for (const [i, section] of sections.entries()) {
   const row = shard.rows[i];
   const rendered = readEntry(section);
   const result = await repository.getContent({...options, castingDate:READING_DOCUMENT_DEMO_DATE,
    primaryId:row.primaryId, movingLine:row.movingLine, monthBranch:row.monthBranches[0]});
   assert.equal(rendered.heading, '## ' + row.facts.movingLine.label + '动 · ' + row.monthBranches.map(branch => branch + '月').join('、'));
   assert.equal(rendered.title, row.copy.title);
   assert.equal(rendered.stages, row.facts.stages.map(stage => stage.name).join(' → '));
   assert.equal(rendered.short, result.short);
   assert.equal(rendered.line, '动爻完整原文：' + row.movingLineText);
   if (row.timingOmission) assert.equal(rendered.timing, '应期：此盘暂无有据的日期可列。');
   for (const window of result.timingSection.windows) {
    assert.ok(rendered.timing.includes(window.text.replace('。', '，属' + window.valence + '应。')), rendered.heading);
    for (const date of window.displayedDates) assert.ok(section.includes(date));
   }
   assert.doesNotMatch(section, /\{\{date:|卦象和依据/u);
  }
 }
});
