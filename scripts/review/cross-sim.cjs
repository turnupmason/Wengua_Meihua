// 跨卦相似（2026-11-20）：第 64 卦换人通读查出未济与既济同爻同月篇约一半文字共用（成对卦盘面相近，写手照抄换字）。
// 每篇简断＋正文去掉「」引文、只留汉字，切 8 字片段；与其他卦单篇共用片段占本篇片段的比例取最高者。
// 门槛按用户亲写面试稿定：面试稿 4,176 篇最高 4%，无一篇超 8%。本卦超 8% 的篇须为 0。
// 用法：node scripts/review/cross-sim.cjs <问项目录> [--hex 1,2] [--max 0.08] [--list]
const fs = require('fs');
const args = process.argv.slice(2), item = args[0], list = args.includes('--list'), N = 8;
const hi = args.indexOf('--hex'), only = hi >= 0 ? new Set(args[hi + 1].split(',').map(Number)) : null;
const mi = args.indexOf('--max'), MAX = mi >= 0 ? +args[mi + 1] : 0.08;
const arts = [];
for (let h = 1; h <= 64; h++) {
 const p = `sources/editorial/${item}/monthly/hex-${String(h).padStart(3, '0')}.json`; if (!fs.existsSync(p)) continue;
 for (const a of JSON.parse(fs.readFileSync(p, 'utf8')).articles) {
  const t = [a.short, ...a.paragraphs].join('').replace(/「[^」]*」/gu, '').replace(/[^\p{Script=Han}]/gu, '');
  const g = new Set(); for (let i = 0; i + N <= t.length; i++) g.add(t.slice(i, i + N));
  arts.push({h, k:`${h}/${a.movingLine}/${a.monthBranch}`, g});
 }
}
const idx = new Map(); arts.forEach((a, ai) => { for (const s of a.g) { let l = idx.get(s); if (!l) idx.set(s, l = []); l.push(ai); } });
const hits = []; let checked = 0, top = 0;
arts.forEach(a => {
 if (only && !only.has(a.h)) return; checked++;
 const c = new Map(); for (const s of a.g) for (const bi of idx.get(s)) if (arts[bi].h !== a.h) c.set(bi, (c.get(bi) || 0) + 1);
 let best = 0, bk = ''; for (const [bi, n] of c) if (n > best) { best = n; bk = arts[bi].k; }
 const r = a.g.size ? best / a.g.size : 0; top = Math.max(top, r);
 if (r > MAX) hits.push({k:a.k, with:bk, share:+(r * 100).toFixed(1)});
});
hits.sort((x, y) => y.share - x.share);
if (list) for (const x of hits) console.log(`${x.k}\t~ ${x.with}\t${x.share}%`);
console.log(JSON.stringify({item, checked, over:hits.length, maxShare:+(top * 100).toFixed(1), threshold:MAX * 100}));
if (hits.length) process.exitCode = 1;
