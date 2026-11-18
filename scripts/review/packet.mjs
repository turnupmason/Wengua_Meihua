// Builds a review packet for one item and one hexagram: chart facts, full moving-line text and the
// current author draft for each of the 30 manuscripts. Diagnostic tier only locates boards; it is
// not a verdict. Usage: node scripts/review/packet.mjs <item-dir> <hex> [out.json]
import {readFile, writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const {bodyUseTier, suggest} = require('./policy-v2-diagnostic.cjs');
const [item, hexArg, out] = process.argv.slice(2);
const stem = 'hex-' + String(Number(hexArg)).padStart(3, '0');
const data = JSON.parse(await readFile(`data/authored-readings/${item}/${stem}.json`, 'utf8'));
// The pre-review draft comes from git HEAD so a rerun still shows what was there before this review.
const {execFileSync} = await import('node:child_process');
const headPath = `sources/editorial/${item}/${stem}.json`;
let drafts;
try { drafts = JSON.parse(execFileSync('git', ['show', 'HEAD:' + headPath], {encoding:'utf8', maxBuffer:1 << 26})); }
catch { drafts = JSON.parse(await readFile(headPath, 'utf8')); }
const fields = ['movingLine','monthOrder','outcome','title','short','opening','process','ending','summary','resolution','topicDetail'];
const rows = data.rows.map((r, i) => {
 const n = Object.fromEntries(r.facts.nodes.map(x => [x.role, x.trigram + x.element + x.qi]));
 const rel = Object.fromEntries(r.facts.directRelations.map(x => [x.role, x.type]));
 const diag = {n, rel, text: r.facts.movingLine.fullText};
 const b = bodyUseTier(diag), s = suggest(diag);
 return {index: i, key: [data.questionId, r.primaryId, r.movingLine, r.monthOrder].join('/'), monthBranches: r.monthBranches,
  stages: r.facts.stages.map(s => s.name).join(' → '), line: r.facts.movingLine.label, lineText: r.facts.movingLine.fullText,
  lineImage: r.facts.movingLine.image, nodes: n, relations: rel,
  diagnostic: {bodyUse: b.t + ' ' + b.why, withLine: s.t + ' ' + s.why},
  draft: Object.fromEntries(fields.map((f, j) => [f, drafts[i][j]])).valueOf()};
});
const packet = {item, questionId: data.questionId, hexagram: data.rows[0].facts.stages[0].name, primaryId: data.primaryId, rows};
const text = JSON.stringify(packet, null, 1);
if (out) await writeFile(out, text + '\n'); else console.log(text);
