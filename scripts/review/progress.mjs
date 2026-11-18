// Per-item checkpoint for the V2 review: which hexagrams have review, blind and polish records, and the
// outcome counts so far. Usage: node scripts/review/progress.mjs <item-dir>
import {readFile, readdir, writeFile} from 'node:fs/promises';
const [item] = process.argv.slice(2);
const dir = `sources/editorial/${item}/`;
const list = async sub => { try { return new Set((await readdir(dir + sub)).filter(n => /^hex-\d{3}\.json$/.test(n))); } catch { return new Set(); } };
const [review, blind, polish] = await Promise.all(['review-v2/', 'blind-v2/', 'polish-v5/'].map(list));
const counts = {}, changes = {}, pending = [], hexes = [];
for (let h = 1; h <= 64; h++) {
 const name = 'hex-' + String(h).padStart(3, '0') + '.json';
 const entry = {hex:h, review:review.has(name), blind:blind.has(name), polish:polish.has(name)};
 if (entry.review) for (const r of JSON.parse(await readFile(dir + 'review-v2/' + name, 'utf8'))) {
  counts[r.newOutcome] = (counts[r.newOutcome] ?? 0) + 1;
  if (r.changed) changes[r.oldOutcome + '→' + r.newOutcome] = (changes[r.oldOutcome + '→' + r.newOutcome] ?? 0) + 1;
  if (r.status !== 'passed') pending.push({key:r.key, dispute:r.dispute});
 }
 hexes.push(entry);
}
const progress = {item, policy:'docs/READING_POLICY_V2.md', updated:new Date().toISOString(),
 reviewed:review.size, blindJudged:blind.size, polished:polish.size, manuscriptsReviewed:review.size * 30,
 outcomeCounts:counts, changes, pendingDisputes:pending, nextUnreviewed:hexes.find(x => !x.review)?.hex ?? null, hexes};
await writeFile(`docs/review/${item}-progress.json`, JSON.stringify(progress, null, 1) + '\n');
console.log(JSON.stringify({reviewed:progress.reviewed, blind:progress.blindJudged, polished:progress.polished, counts, changes, pending:pending.length}));
