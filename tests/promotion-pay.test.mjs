import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {loadLibrary, createProductRepository, MONTH_SLOTS} from '../src/index.js';

const questionId = 'career.promotion-pay.promotion';
const repository = createProductRepository({library: await loadLibrary()});
const load = async path => JSON.parse(await readFile(new URL('../' + path, import.meta.url), 'utf8'));
const index = await load('data/authored-readings/promotion-pay/index.json');
const options = {questionId, castingDate:'2026-11-11'};

test('each completed promotion chart resolves all twelve keys to its own reviewed text and pay verdict', async () => {
 let copies = 0, slots = 0;
 for (const entry of index.files) {
  const shard = await load(entry.path);
  assert.equal(shard.rows.length, 30);
  copies += shard.rows.length;
  for (let movingLine = 1; movingLine <= 6; movingLine++) {
   for (const {branch} of MONTH_SLOTS) {
    const result = await repository.getContent({...options, primaryId:entry.primaryId, movingLine, monthBranch:branch});
    const row = shard.rows[shard.monthSlots[movingLine + ':' + branch]];
    assert.equal(result.status, 'ready');
    assert.equal(result.monthBranch, branch);
    assert.equal(result.short, row.copy.short.text);
    assert.equal(result.decision.id, row.copy.long.decisionId);
    assert.equal(result.decision.pay.state, result.decision.outcomeCode === 'favourable' ? 'follows-promotion' : 'unfavourable-with-promotion');
    const payParagraph = result.narrativeParagraphs.find(paragraph => paragraph.startsWith('加薪幅度：'));
    assert.equal(payParagraph, row.decision.pay.range ? '加薪幅度：' + row.decision.pay.range : undefined);
    assert.equal(result.calculationExplanation.void, undefined);
    assert.ok(result.timingSection.windows.length || result.calculationExplanation.timing.omission.reason);
    slots++;
   }
  }
 }
 assert.equal(index.authorWholeArticleReviewed, copies);
 assert.equal(index.baseCaseCount, slots);
 assert.equal(index.remainingBaseSlots, 4608 - slots);
 if (index.next) {
  const pending = await repository.getContent({...options, primaryId:index.next.primaryId, movingLine:1, monthBranch:'寅'});
  assert.equal(pending.status, 'pending-authoring');
  assert.equal(pending.story, null);
 }
});
