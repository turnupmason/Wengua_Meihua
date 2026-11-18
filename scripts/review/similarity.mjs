// 断语相似度检查（只读）：同一卦同一动爻五个月令之间、同一卦 30 篇之间、全库之间的文字重复。
// 用法：node scripts/review/similarity.mjs <问项目录> [卦序]   不给卦序则查全库并输出总表。
import {readFileSync} from 'node:fs';
const [item, hexArg] = process.argv.slice(2);
const han = s => String(s).replace(/[^\p{Script=Han}]/gu, '');
const grams = (s, n = 3) => { const t = han(s), g = new Set(); for (let i = 0; i + n <= t.length; i++) g.add(t.slice(i, i + n)); return g; };
const jac = (a, b) => { let x = 0; for (const g of a) if (b.has(g)) x++; return x / (a.size + b.size - x || 1); };
const body = d => d.slice(3, 9).join('。');
const load = h => JSON.parse(readFileSync(`sources/editorial/${item}/hex-${String(h).padStart(3, '0')}.json`, 'utf8'));
const hexes = hexArg ? [Number(hexArg)] : Array.from({length:64}, (_, i) => i + 1);
// 门槛：同爻两篇正文三字组重合率 ≤ 0.06；同卦任意两篇 ≤ 0.08；任一 8 字以上片段不在全库其他篇出现（成语、爻辞引文除外）。
const LIMIT_LINE = 0.06, LIMIT_HEX = 0.08;
const report = [];
// 全库 8 字片段计数（排除爻辞与小象原文）
const all = [];
for (let h = 1; h <= 64; h++) load(h).forEach((d, i) => all.push({h, i, d}));
const quoteRe = /[「“][^」”]{2,40}[」”]/gu;
const eight = new Map();
for (const r of all) { const t = han(body(r.d).replace(quoteRe, '')); const seen = new Set(); for (let i = 0; i + 8 <= t.length; i++) seen.add(t.slice(i, i + 8)); for (const g of seen) eight.set(g, (eight.get(g) ?? 0) + 1); }
for (const h of hexes) {
  const src = load(h), G = src.map(d => grams(body(d).replace(quoteRe, '')));
  const flags = [];
  for (let a = 0; a < src.length; a++) for (let b = a + 1; b < src.length; b++) {
    const s = jac(G[a], G[b]), sameLine = src[a][0] === src[b][0];
    if ((sameLine && s > LIMIT_LINE) || s > LIMIT_HEX) flags.push({a, b, line:src[a][0], sameLine, sim:+s.toFixed(3)});
  }
  const shared = src.map((d, i) => { const t = han(body(d).replace(quoteRe, '')); const hits = new Set(); for (let k = 0; k + 8 <= t.length; k++) { const g = t.slice(k, k + 8); if ((eight.get(g) ?? 0) > 1) hits.add(g); } return {i, hits:[...hits].slice(0, 5), n:hits.size}; }).filter(x => x.n);
  report.push({hex:h, pairsOver:flags.length, maxSameLine:Math.max(0, ...flags.filter(f => f.sameLine).map(f => f.sim)), flags:flags.slice(0, 20), sharedEight:shared});
}
if (hexArg) console.log(JSON.stringify(report[0], null, 1));
else {
  const sum = report.reduce((a, r) => ({pairs:a.pairs + r.pairsOver, shared:a.shared + r.sharedEight.length}), {pairs:0, shared:0});
  console.log(JSON.stringify({limits:{sameLine:LIMIT_LINE, sameHex:LIMIT_HEX, eightCharShared:'0（引文除外）'}, ...sum, perHex:report.map(r => [r.hex, r.pairsOver, r.sharedEight.length])}));
}
