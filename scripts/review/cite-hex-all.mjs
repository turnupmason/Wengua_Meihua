// 全领域引文出处核对（只读）：引了《周易》经传原文的，查它是否出在本篇所占的卦里；出在别卦的列出来人工看。
// 用法：node scripts/review/cite-hex-all.mjs [out.json]
import {readFileSync, readdirSync, writeFileSync} from 'node:fs';
const T2S = {陽:'阳',陰:'阴',於:'于',無:'无',龍:'龙',戰:'战'};
const han = s => [...String(s)].map(c => T2S[c] ?? c).join('').replace(/[^\p{Script=Han}]/gu, '');
const lines = readFileSync('sources/original/yijing64.txt', 'utf8').split(/\r?\n/);
const chap = []; let cur = 0;
for (const l of lines) { const m = l.match(/^第(.+?)卦：/u); if (m) { cur++; chap[cur] = ''; continue; } if (cur && !l.startsWith('【白话】')) chap[cur] += han(l) + '|'; }
const mh = han(readFileSync('sources/original/meihua-volumes-1-3.txt', 'utf8'));
const patches = JSON.parse(readFileSync('data/editorial-patches.json', 'utf8'));
for (const p of patches) { const m = String(p.recordId ?? '').match(/hex-(\d+)/); if (m && chap[+m[1]] !== undefined) chap[+m[1]] += han(p.after ?? '') + '|'; }
const items = readdirSync('data/authored-readings', {withFileTypes:true}).filter(d => d.isDirectory()).map(d => d.name);
const res = {};
function walk(v, path, out) { if (typeof v === 'string') out.push([path, v]); else if (Array.isArray(v)) v.forEach(x => walk(x, path, out)); else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { if (!path && k === 'facts') continue; walk(x, path ? path + '.' + k : k, out); } }
for (const item of items) {
  const bad = new Map();
  for (const f of readdirSync(`data/authored-readings/${item}`).filter(f => /^hex-\d{3}\.json$/.test(f))) {
    const j = JSON.parse(readFileSync(`data/authored-readings/${item}/${f}`, 'utf8'));
    for (const r of j.rows ?? []) {
      const own = r.primaryId ?? j.primaryId, chg = r.stageIds?.at(-1);
      const lc = han((r.facts?.movingLine?.fullText ?? '') + '|' + (r.facts?.movingLine?.image ?? ''));
      const strs = []; walk(r, '', strs);
      for (const [p, s] of strs) for (const m of s.matchAll(/「([^「」]{2,200})」/gu)) {
        const frags = m[1].split(/……|…/u).map(han).filter(x => x.length >= 3);
        for (const x of frags) {
          if (lc.includes(x) || mh.includes(x) || (chap[own] ?? '').includes(x)) continue;
          const where = []; for (let h = 1; h <= 64; h++) if (chap[h]?.includes(x)) where.push(h);
          if (!where.length) continue;               // 不在经传里（口语引号或异文），由 cite-audit-all 处理
          if (chg && where.includes(chg)) continue;  // 引变卦经文，另行允许
          const key = x + '｜' + own;
          if (!bad.has(key)) bad.set(key, {quote:m[1], frag:x, hex:own, foundIn:where, ctx:s.slice(Math.max(0, m.index - 16), m.index), field:p, n:0, at:[]});
          const b = bad.get(key); b.n++; if (b.at.length < 3) b.at.push(`${f.slice(4, 7)}#${r.movingLine}/${r.monthOrder}`);
        }
      }
    }
  }
  res[item] = [...bad.values()];
}
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(res, null, 1));
for (const [k, v] of Object.entries(res)) console.log(k, v.length);
