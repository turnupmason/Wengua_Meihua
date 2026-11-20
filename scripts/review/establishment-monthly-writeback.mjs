// 确定关系：把逐月长稿每一气的专业说明（judgment）与取期（timing）回写到五气作者源第 9、10 栏。
// 用法：node scripts/review/establishment-monthly-writeback.mjs [--hex 1,2,5-9] [--write]
// 不带 --write 只核对、报告将改动的行。回写前逐气核对：同气各月的结论、专业说明、取期完全相同，结论等于五气源第 2 栏，
// 取期的种类、位置与条数与五气源原栏一致（只换事件、提示、依据的文字）。
import {readFile, writeFile, access} from 'node:fs/promises';
import {QI, MONTHS} from './monthly-lib.mjs';

const DIR = 'sources/editorial/relationship-establishment/';
const args = process.argv.slice(2), write = args.includes('--write');
const hi = args.indexOf('--hex');
const parseList = s => s.split(',').flatMap(p => { const [a, b] = p.split('-').map(Number); return b ? Array.from({length:b - a + 1}, (_, i) => a + i) : [a]; });
let hexes = hi >= 0 ? parseList(args[hi + 1]) : Array.from({length:64}, (_, i) => i + 1);
const exists = async p => access(p).then(() => true, () => false);
const shape = t => Array.isArray(t) ? JSON.stringify(t.map(x => [x[0], x[1]])) : (typeof t === 'string' ? 'none' : 'bad');

const report = {write, hexes:[], skipped:[], errors:[], rowsChanged:0, judgmentChanged:0, timingChanged:0};
for (const h of hexes) {
 const id = String(h).padStart(3, '0'), mp = `${DIR}monthly/hex-${id}.json`, sp = `${DIR}hex-${id}.json`;
 if (!await exists(mp)) { report.skipped.push(h); continue; }
 const m = JSON.parse(await readFile(mp, 'utf8')), raw = await readFile(sp, 'utf8'), s = JSON.parse(raw);
 if (JSON.stringify(s, null, 2) + '\n' !== raw) report.errors.push(`${h}: 五气源排版与 JSON.stringify(_,null,2) 不同，回写会改动无关字节`);
 if (m.articles.length !== 72) { report.errors.push(`${h}: 月稿只有 ${m.articles.length} 篇`); continue; }
 const byQi = new Map();
 for (const a of m.articles) {
  const k = `${a.movingLine}/${QI[a.monthBranch]}`, sig = JSON.stringify([a.outcome, a.judgment, a.timing]);
  if (byQi.has(k) && byQi.get(k).sig !== sig) report.errors.push(`${h}/${a.movingLine}/${a.monthBranch}: 同气各月专业说明或取期不同`);
  if (!byQi.has(k)) byQi.set(k, {sig, a});
 }
 let changed = 0;
 for (const row of s) {
  const g = byQi.get(`${row[0]}/${row[1]}`);
  if (!g) { report.errors.push(`${h}/${row[0]}/${row[1]}: 月稿缺这一气`); continue; }
  const {a} = g;
  if (a.outcome !== row[2]) report.errors.push(`${h}/${row[0]}/${row[1]}: 月稿结论 ${a.outcome} ≠ 五气源 ${row[2]}`);
  if (shape(a.timing) !== shape(row[10])) report.errors.push(`${h}/${row[0]}/${row[1]}: 取期种类、位置或条数与五气源不同`);
  const dj = row[9] !== a.judgment, dt = JSON.stringify(row[10]) !== JSON.stringify(a.timing);
  if (dj) report.judgmentChanged++;
  if (dt) report.timingChanged++;
  if (dj || dt) { changed++; row[9] = a.judgment; row[10] = a.timing; }
 }
 if (byQi.size !== 30) report.errors.push(`${h}: 月稿只有 ${byQi.size} 气`);
 report.rowsChanged += changed; report.hexes.push([h, changed]);
 if (write && changed && !report.errors.some(e => e.startsWith(h + ':') || e.startsWith(h + '/'))) await writeFile(sp, JSON.stringify(s, null, 2) + '\n');
}
report.status = report.errors.length ? 'failed' : 'passed';
console.log(JSON.stringify(report, null, 1));
if (report.errors.length) process.exitCode = 1;
void MONTHS;
