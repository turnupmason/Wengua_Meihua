// Writes the 24 V2 sample boards: blind facts (no verdicts) and a full author view (old draft + diagnostic).
import {readFile, writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const {bodyUseTier, suggest} = createRequire(import.meta.url)('./policy-v2-diagnostic.cjs');
const orders = ['spring-wood','summer-fire','autumn-metal','winter-water','seasonal-earth'];
export const SAMPLES = [
 ['exam','48/5/seasonal-earth'],['exam','3/6/winter-water'],['exam','3/5/spring-wood'],
 ['interview-pass','25/2/winter-water'],['interview-pass','9/5/seasonal-earth'],['interview-pass','12/3/autumn-metal'],
 ['promotion-pay','3/4/summer-fire'],['promotion-pay','3/5/winter-water'],['promotion-pay','6/4/autumn-metal'],
 ['workplace-probation','55/6/spring-wood'],['workplace-probation','1/1/autumn-metal'],['workplace-probation','11/6/seasonal-earth'],
 ['relationship-reconciliation','55/6/summer-fire'],['relationship-reconciliation','48/5/seasonal-earth'],['relationship-reconciliation','25/2/winter-water'],
 ['relationship-establishment','3/6/winter-water'],['relationship-establishment','12/3/autumn-metal'],['relationship-establishment','9/5/seasonal-earth'],
 ['new-relationship-opportunity','55/6/spring-wood'],['new-relationship-opportunity','1/1/autumn-metal'],['new-relationship-opportunity','3/4/summer-fire'],
 ['confession-decision','40/3/spring-wood'],['confession-decision','3/6/spring-wood'],['confession-decision','6/4/autumn-metal'],
];
const questions = {exam:'这次考试能通过吗', 'interview-pass':'这次面试能通过吗', 'promotion-pay':'这次能晋升并随岗加薪吗',
 'workplace-probation':'这次试用期能通过吗', 'relationship-reconciliation':'我们还能复合吗', 'relationship-establishment':'我们能确定恋爱关系吗',
 'new-relationship-opportunity':'近期会有新的感情机会吗', 'confession-decision':'现在适合表白吗，对方有意吗'};
const blind = [], full = [];
for (const [n, [item, k]] of SAMPLES.entries()) {
 const [h, line, qi] = k.split('/');
 const data = JSON.parse(await readFile(`data/authored-readings/${item}/hex-${h.padStart(3,'0')}.json`, 'utf8'));
 const idx = data.monthSlots[`${line}:${data.rows.find(r => r.monthOrder === qi).monthBranches[0]}`];
 const r = data.rows[idx];
 const nodes = Object.fromEntries(r.facts.nodes.map(x => [x.role, x.trigram + x.element + x.qi]));
 const rel = Object.fromEntries(r.facts.directRelations.map(x => [x.role, x.type]));
 const facts = {sample:'S' + String(n + 1).padStart(2, '0'), item, question:questions[item], questionId:data.questionId, chart:r.facts.stages.map(s => s.name).join(' → '),
  movingLine:r.facts.movingLine.label, lineText:r.facts.movingLine.fullText, lineImage:r.facts.movingLine.image, months:r.monthBranches.join('、') + '月', nodes, relations:rel};
 blind.push(facts);
 let old;
 if (item === 'interview-pass') old = {outcome:r.decision.outcomeCode, title:r.copy.title, short:r.copy.short.text, ...r.copy.long};
 else { const d = JSON.parse(await readFile(`sources/editorial/${item}/hex-${h.padStart(3,'0')}.json`, 'utf8'))[(Number(line) - 1) * 5 + orders.indexOf(qi)];
  old = {outcome:d[2], title:d[3], short:d[4], opening:d[5], process:d[6], ending:d[7], summary:d[8], resolution:d[9]}; }
 const diag = {n:nodes, rel, text:facts.lineText};
 full.push({...facts, diagnostic:{bodyUse:bodyUseTier(diag), withLine:suggest(diag)}, old});
}
await writeFile('docs/review/samples/blind-facts.json', JSON.stringify(blind, null, 1) + '\n');
await writeFile('docs/review/samples/author-view.json', JSON.stringify(full, null, 1) + '\n');
console.log(full.map(f => f.sample + ' ' + f.item + ' ' + f.chart + ' ' + f.movingLine + ' ' + f.months + ' old=' + f.old.outcome + ' diag=' + f.diagnostic.withLine.t + ' ' + f.diagnostic.withLine.why).join('\n'));
