// Facts-only packet for blind judging: no current verdicts, drafts or diagnostic tiers.
// Usage: node scripts/review/blind-packet.mjs <item-dir> <hex> [<hex> ...]
import {readFile} from 'node:fs/promises';
const [item, ...hexes] = process.argv.slice(2);
const out = [];
for (const h of hexes) {
 const data = JSON.parse(await readFile(`data/authored-readings/${item}/hex-${String(Number(h)).padStart(3,'0')}.json`, 'utf8'));
 for (const r of data.rows) out.push({key:[data.questionId, r.primaryId, r.movingLine, r.monthOrder].join('/'), months:r.monthBranches.join('、') + '月',
  chart:r.facts.stages.map(s => s.name).join(' → '), line:r.facts.movingLine.label, lineText:r.facts.movingLine.fullText, lineImage:r.facts.movingLine.image,
  nodes:Object.fromEntries(r.facts.nodes.map(x => [x.role, x.trigram + x.element + x.qi])),
  relations:Object.fromEntries(r.facts.directRelations.map(x => [x.role, x.type]))});
}
console.log(JSON.stringify({item, questionId:out[0]?.key.split('/')[0], boards:out}, null, 1));
