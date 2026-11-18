// Finds phrases repeated across many manuscripts of one item (V9 跨篇检查). Counts each 7-Han n-gram once per
// manuscript, plus repeated sentence openings and endings. Usage: node scripts/review/repeat-scan.mjs <item-dir> [minCount]
import {readFile, readdir, writeFile} from 'node:fs/promises';
const [item, minArg] = process.argv.slice(2);
const min = Number(minArg ?? 25), dir = `sources/editorial/${item}/`;
const grams = new Map(), openings = new Map(), endings = new Map();
const bump = (m, k) => m.set(k, (m.get(k) ?? 0) + 1);
for (const name of (await readdir(dir)).filter(n => /^hex-\d{3}\.json$/.test(n))) {
 for (const d of JSON.parse(await readFile(dir + name, 'utf8'))) {
  const seen = new Set();
  for (const field of d.slice(3, 9)) {
   const han = String(field).replace(/[^\p{Script=Han}]/gu, '');
   for (let i = 0; i + 7 <= han.length; i++) seen.add(han.slice(i, i + 7));
   for (const sentence of String(field).split(/[。！？]/u).map(s => s.replace(/[^\p{Script=Han}]/gu, '')).filter(s => s.length >= 6)) {
    bump(openings, sentence.slice(0, 5)); bump(endings, sentence.slice(-5));
   }
  }
  for (const g of seen) bump(grams, g);
 }
}
const top = (m, n) => [...m].filter(([, c]) => c >= n).sort((a, b) => b[1] - a[1]).slice(0, 150).map(([k, c]) => ({phrase:k, count:c}));
const report = {item, minCount:min, phrases:top(grams, min), openings:top(openings, min * 2), endings:top(endings, min * 2)};
await writeFile(`docs/review/${item}-repeats.json`, JSON.stringify(report, null, 1) + '\n');
console.log(JSON.stringify({phrases:report.phrases.slice(0, 25), openings:report.openings.slice(0, 15), endings:report.endings.slice(0, 15)}));
