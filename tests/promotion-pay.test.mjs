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
const trigramByBits = {111:'乾',110:'兑',101:'离',100:'震','011':'巽','010':'坎','001':'艮','000':'坤'};
const elementByTrigram = {乾:'金',兑:'金',离:'火',震:'木',巽:'木',坎:'水',艮:'土',坤:'土'};
const generates = {木:'火',火:'土',土:'金',金:'水',水:'木'};
const controls = {木:'土',土:'水',水:'火',火:'金',金:'木'};
const seasonQi = {
 'spring-wood':'木火水金土', 'summer-fire':'火土木水金', 'autumn-metal':'金水土火木',
 'winter-water':'水木金土火', 'seasonal-earth':'土金火木水',
};

function expectedChart(primaryId, movingLine, monthOrder) {
 const bits = library.getHexagram(primaryId).bitsBottomUp;
 const mutual = [...bits.slice(1, 4), ...bits.slice(2, 5)];
 const changed = bits.map((bit, index) => index === movingLine - 1 ? 1 - bit : bit);
 const useStart = movingLine > 3 ? 3 : 0;
 const bodyStart = 3 - useStart;
 const trigramAt = (lines, offset) => trigramByBits[lines.slice(offset, offset + 3).join('')];
 const expectedTrigrams = {
  body:trigramAt(bits, bodyStart), use:trigramAt(bits, useStart),
  body_mutual:trigramAt(mutual, bodyStart), use_mutual:trigramAt(mutual, useStart),
  changed_use:trigramAt(changed, useStart), body_inherited:trigramAt(changed, bodyStart),
 };
 const bodyElement = elementByTrigram[expectedTrigrams.body];
 const nodes = Object.fromEntries(Object.entries(expectedTrigrams).map(([role, trigram]) => {
  const element = elementByTrigram[trigram];
  return [role, {role, trigram, element, qi:'旺相休囚死'[seasonQi[monthOrder].indexOf(element)]}];
 }));
 const relationTo = element => {
  if (element === bodyElement) return 'equal';
  if (generates[element] === bodyElement) return 'use_generates_body';
  if (generates[bodyElement] === element) return 'body_generates_use';
  if (controls[element] === bodyElement) return 'use_controls_body';
  assert.equal(controls[bodyElement], element);
  return 'body_controls_use';
 };
 const relations = Object.fromEntries(['use','body_mutual','use_mutual','changed_use'].map(role => [role, relationTo(nodes[role].element)]));
 const stageIds = [primaryId, library.getHexagramByBits(mutual).id, library.getHexagramByBits(changed).id];
 return {nodes, relations, stageIds};
}

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
   const expected = expectedChart(row.primaryId, row.movingLine, row.monthOrder);
   assert.deepEqual(row.stageIds, expected.stageIds);
   assert.deepEqual(Object.fromEntries(row.facts.nodes.map(node => [node.role, node])), expected.nodes);
   assert.deepEqual(Object.fromEntries(row.facts.directRelations.map(edge => [edge.role, edge.type])), expected.relations);
   for (const node of row.facts.nodes) assert.equal(node.qi, assessSeasonalQi(node.element, row.monthOrder).state);
   if (row.decision.outcomeCode === 'favourable' && expected.relations.use === 'use_controls_body') {
    assert.ok(Object.values(expected.relations).includes('use_generates_body'), row.decision.id);
   }
   const hanCount = row.copy.short.text.match(/\p{Script=Han}/gu)?.length ?? 0;
   assert.ok(hanCount >= 60 && hanCount <= 120, row.decision.id);
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
    assert.equal(window.eventScope, rule.eventScope);
    assert.deepEqual(window.targetBranches, rule.branches);
     assert.ok(window.text.includes(rule.text));
     assert.ok(window.displayedDates.every(day => day >= options.castingDate && rule.branches.includes(getCivilDay(day).dayBranch)));
     if (window.eventScope === 'positive-result-candidate') {
     assert.equal(row.decision.outcomeCode, 'favourable');
     assert.ok(['name-support', 'name-body'].includes(rule.kind));
    }
    }
    slots++;
   }
  }
 }
 assert.equal(index.authorWholeArticleReviewed, copies);
 assert.equal(index.fullTwelveMonthCharts, 384);
 assert.equal(copies, 1920);
 assert.equal(slots, 4608);
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
