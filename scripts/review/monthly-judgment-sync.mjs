// 逐月长稿专业说明同步（2026-11-20）：五气源第 9 栏订正后，把已写月稿的 judgment 照抄为新第 9 栏（strict 问项），
// 去掉因此失效的 judgmentCorrection，并在回执加一条 finding、重算 sourceSha256。正文、标题、简断、取期一字不动。
// 用法：node scripts/review/monthly-judgment-sync.mjs <问项> --hex 1,2,3 [--write]
import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {QI} from './monthly-lib.mjs';
const args = process.argv.slice(2), item = args[0], write = args.includes('--write');
const ids = args[args.indexOf('--hex') + 1].split(',').map(Number);
const out = [];
for (const h of ids) {
 const id = String(h).padStart(3, '0'), mp = `sources/editorial/${item}/monthly/hex-${id}.json`, rp = `sources/editorial/${item}/reviews-monthly/hex-${id}.json`;
 if (!existsSync(mp)) continue;
 const base = JSON.parse(readFileSync(`sources/editorial/${item}/hex-${id}.json`, 'utf8'));
 const src = JSON.parse(readFileSync(mp, 'utf8'));
 const keys = [];
 for (const a of src.articles) {
  const row = base.find(d => d[0] === a.movingLine && d[1] === QI[a.monthBranch]);
  if (a.judgment !== row[9] || a.judgmentCorrection) { keys.push(`${h}/${a.movingLine}/${a.monthBranch}`); a.judgment = row[9]; delete a.judgmentCorrection; }
 }
 out.push({hex:h, synced:keys.length});
 if (write && keys.length) {
  const text = JSON.stringify(src, null, 1) + '\n'; writeFileSync(mp, text);
  if (existsSync(rp)) { const r = JSON.parse(readFileSync(rp, 'utf8'));
   r.findings = r.findings || []; r.findings.push({id:`S${id}-J01`, status:'fixed-documentation-conflict', keys, finding:`2026-11-20 协调者：五气源第 9 栏清理了旧短稿编造的场面（及个别考试残留、写给作者的话），本卦 ${keys.length} 篇的专业说明照新第 9 栏同步，失效的 judgmentCorrection 一并去掉；标题、简断、正文、取期一字未动，结论不变。`});
   r.sourceSha256 = createHash('sha256').update(text).digest('hex'); writeFileSync(rp, JSON.stringify(r, null, 1) + '\n'); }
 }
}
console.log(JSON.stringify(out));
