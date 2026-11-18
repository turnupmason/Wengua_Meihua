// 口径一致性审查：对照最终口径 V2，逐篇检查结论与盘面事实是否相容。
// 只定位可疑篇目，不改稿。用法：node scripts/review/audit-v2.mjs <问项目录>
import {readFile, readdir, writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const {bodyUseTier} = createRequire(import.meta.url)('./policy-v2-diagnostic.cjs');
const [item] = process.argv.slice(2);
const P = ['use','body_mutual','use_mutual','changed_use'];
const qiOf = s => s.slice(-1), strong = q => q === '旺' || q === '相', faint = q => q === '囚' || q === '死';
const tierOf = {favourable:'F', conditional:'C', difficult:'D'};
const rank = {D:0, C:1, F:2};
const issues = [];
let total = 0;
for (const name of (await readdir(`sources/editorial/${item}/review-v2/`)).filter(n => /^hex-\d{3}\.json$/.test(n)).sort()) {
 const data = JSON.parse(await readFile(`data/authored-readings/${item}/${name}`, 'utf8'));
 const records = JSON.parse(await readFile(`sources/editorial/${item}/review-v2/${name}`, 'utf8'));
 for (const [i, rec] of records.entries()) {
  total++;
  const row = data.rows[i];
  const n = Object.fromEntries(row.facts.nodes.map(x => [x.role, x.trigram + x.element + x.qi]));
  const rel = Object.fromEntries(row.facts.directRelations.map(x => [x.role, x.type]));
  const G = P.filter(k => rel[k] === 'use_generates_body'), K = P.filter(k => rel[k] === 'use_controls_body');
  const bq = qiOf(n.body), v = tierOf[rec.newOutcome], b = bodyUseTier({n, rel});
  const flag = why => issues.push({key:rec.key, verdict:rec.newOutcome, tier:b.t + ' ' + b.why, why, reason:rec.reason?.slice(0, 160)});
  if (!v) { flag('结论码不在三档'); continue; }
  if (rel.use === 'use_controls_body' && !G.length && v !== 'D') flag('本用克体且无生体，应为难');
  if (!K.length && v === 'D' && !/R1b′|R1c/.test(b.why)) flag('全盘无克体却判难');
  if (Math.abs(rank[v] - rank[b.t]) === 2) flag('与体用初判相差两档');
  if (v === 'F' && b.t === 'C') {
   if (!G.length) flag('无生体却由有条件升吉');
   else if (G.every(k => faint(qiOf(n[k])))) flag('生体之卦全囚死却升吉');
   if (faint(bq)) flag('体囚死却升吉');
   if (/R1↓/.test(b.why) && !G.some(k => strong(qiOf(n[k])))) flag('变用泄之盘升吉，但无旺相生体之卦');
   if (K.includes('changed_use') && !(qiOf(n.changed_use) === '死' || (!strong(qiOf(n.changed_use)) && strong(bq)))) flag('变用克体之卦有力而升吉');
  }
  if (v === 'D' && b.t === 'C' && !(K.includes('changed_use') || (bq === '死' && K.some(k => strong(qiOf(n[k])))))) flag('有条件降为难，但克不在变用，也非体死克旺');
  if (v === 'C' && b.t === 'D' && !G.length && !/R3↑/.test(rec.reason ?? '')) flag('初判难而定有条件，记录未写明依据');
 }
}
await writeFile(`docs/review/${item}-audit.json`, JSON.stringify({item, total, flagged:issues.length, issues}, null, 1) + '\n');
const byWhy = {};
for (const x of issues) byWhy[x.why] = (byWhy[x.why] ?? 0) + 1;
console.log(JSON.stringify({total, flagged:issues.length, byWhy}));
