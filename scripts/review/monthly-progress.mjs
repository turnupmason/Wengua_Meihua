// 逐月长稿进度一览（接手用）：node scripts/review/monthly-progress.mjs <问项目录> [--git]
// 每卦列出：作者源篇数、回执是否在且哈希对得上、读回篇数、阅读页是否在；--git 另列是否已在 origin/main。
// 只看文件状态，不代替 check-monthly；「已齐」的卦仍须 check-monthly --hex N 为 passed 才算验收。
import {readFile, access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execSync} from 'node:child_process';

const item = process.argv[2], git = process.argv.includes('--git');
if (!item) { console.error('用法：node scripts/review/monthly-progress.mjs <问项目录> [--git]'); process.exit(2); }
const exists = p => access(p).then(() => true, () => false);
const onMain = new Set();
if (git) {
 const out = execSync(`git ls-tree --name-only origin/main sources/editorial/${item}/monthly/`, {encoding:'utf8'});
 for (const l of out.split('\n')) { const m = l.match(/hex-(\d{3})\.json$/); if (m) onMain.add(Number(m[1])); }
}
const rows = [], sum = {none:[], partial:[], complete:[], pushed:[]};
for (let h = 1; h <= 64; h++) {
 const id = String(h).padStart(3, '0'), mp = `sources/editorial/${item}/monthly/hex-${id}.json`, rp = `sources/editorial/${item}/reviews-monthly/hex-${id}.json`;
 if (!await exists(mp)) { sum.none.push(h); continue; }
 const raw = await readFile(mp, 'utf8'); let n = -1;
 try { n = JSON.parse(raw).articles.length; } catch { n = -1; }
 const sha = createHash('sha256').update(raw).digest('hex');
 let receipt = '无回执', read = 0;
 if (await exists(rp)) { try { const r = JSON.parse(await readFile(rp, 'utf8')); read = r.wholeArticlesRead ?? 0; receipt = r.sourceSha256 === sha ? '哈希相符' : '哈希过期'; } catch { receipt = '回执坏'; } }
 const doc = await exists(`docs/${item}/monthly-preview/hex-${id}.md`);
 const complete = n === 72 && receipt === '哈希相符' && read === 72;
 (complete ? sum.complete : sum.partial).push(h);
 if (onMain.has(h)) sum.pushed.push(h);
 rows.push({卦:h, 篇数:n, 回执:receipt, 读回:read, 阅读页:doc ? '有' : '无', ...(git ? {已推送:onMain.has(h) ? '是' : '否'} : {})});
}
console.table(rows);
const fmt = a => a.length ? a.join(',') : '—';
console.log(`未开始 ${sum.none.length} 卦：${fmt(sum.none)}`);
console.log(`写了一半或回执未齐 ${sum.partial.length} 卦：${fmt(sum.partial)}`);
console.log(`篇数与回执已齐 ${sum.complete.length} 卦（仍须 check-monthly 验收）：${fmt(sum.complete)}`);
if (git) console.log(`已在 origin/main ${sum.pushed.length} 卦：${fmt(sum.pushed)}`);
