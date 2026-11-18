// Compares blind verdicts with the author's V2 verdicts for one item and marks agreement.
// Disagreements stay 'disagreed' until a resolution note is written. Usage: node scripts/review/blind-compare.mjs <item-dir>
import {readFile, writeFile, readdir} from 'node:fs/promises';
const [item] = process.argv.slice(2);
const dir = `sources/editorial/${item}/`;
const report = {agreed:0, disagreed:0, resolved:0, missing:0, cases:[]};
for (const name of (await readdir(dir + 'review-v2/')).filter(n => /^hex-\d{3}\.json$/.test(n)).sort()) {
 const review = JSON.parse(await readFile(dir + 'review-v2/' + name, 'utf8'));
 let blind;
 try { blind = JSON.parse(await readFile(dir + 'blind-v2/' + name, 'utf8')); } catch { report.missing += review.length; continue; }
 for (const [i, rec] of review.entries()) {
  const b = blind[i];
  if (!b || b.key !== rec.key) throw new Error('Blind record mismatch ' + name + ' ' + i);
  if (b.agreement === 'resolved' && b.authorVerdictAtResolution === rec.newOutcome) { report.resolved++; continue; }
  b.agreement = b.verdict === rec.newOutcome ? 'agreed' : 'disagreed';
  report[b.agreement]++;
  if (b.agreement === 'disagreed') report.cases.push({key:rec.key, author:rec.newOutcome, blind:b.verdict, authorReason:rec.reason, blindReasons:b.reasons});
 }
 await writeFile(dir + 'blind-v2/' + name, JSON.stringify(blind, null, 1) + '\n');
}
await writeFile(`docs/review/${item}-blind-disagreements.json`, JSON.stringify(report, null, 1) + '\n');
console.log(JSON.stringify({agreed:report.agreed, disagreed:report.disagreed, resolved:report.resolved, missing:report.missing}));
