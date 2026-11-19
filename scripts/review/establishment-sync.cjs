// 确定关系：规则改后把结论同步进五气作者源（第 2 栏）、polish-v5（outcome、establishmentRule）与 review-v2（newOutcome、final.to）。只改结论不同的篇。
const fs = require('fs');
const {establishmentVerdicts} = require('./establishment-verdicts.cjs');
const LABEL = {favourable:'能成', difficult:'不成'};
const V = establishmentVerdicts(); const ch = [];
for (let h = 1; h <= 64; h++) {
  const id = String(h).padStart(3, '0'), dir = 'sources/editorial/relationship-establishment/';
  const sp = dir + `hex-${id}.json`, pp = dir + `polish-v5/hex-${id}.json`, rp = dir + `review-v2/hex-${id}.json`;
  const s = JSON.parse(fs.readFileSync(sp, 'utf8')); const idx = [];
  s.forEach((d, i) => { const v = V.find(x => x.hex === h && x.line === d[0] && x.month === d[1]); if (v.v !== d[2]) idx.push([i, v]); });
  if (!idx.length) continue;
  const p = JSON.parse(fs.readFileSync(pp, 'utf8')), r = JSON.parse(fs.readFileSync(rp, 'utf8'));
  for (const [i, v] of idx) { ch.push(`${h}#${i} ${s[i][2]}→${v.v}`); s[i][2] = v.v; p[i].outcome = v.v; p[i].establishmentRule = LABEL[v.v] + '：' + v.why;
    r[i].newOutcome = v.v; r[i].changed = r[i].oldOutcome !== v.v; r[i].final = {...(r[i].final ?? {}), to:v.v, establishmentRule:LABEL[v.v] + '：' + v.why}; }
  fs.writeFileSync(sp, JSON.stringify(s, null, 2) + '\n'); fs.writeFileSync(pp, JSON.stringify(p, null, 1) + '\n'); fs.writeFileSync(rp, JSON.stringify(r, null, 1) + '\n');
}
console.log(ch.length + ' ' + ch.join(' '));
