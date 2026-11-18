// 各问项现有结论与定稿体用初判（tierFinal + 二分）对照（只诊断，不含爻辞翻转）。
// 用法：node scripts/review/policy-gap-all.cjs
const fs = require('fs');
const {tierFinal} = require('./policy-final.cjs');
const {split} = require('./binary.cjs');
const LOVE = new Set(['relationship-establishment','relationship-reconciliation','new-relationship-opportunity','confession-decision']);
const CODE = c => ({favourable:'F', conditional:'C', difficult:'D', stable:'F', watch:'C', strained:'D'}[c] ?? (String(c).startsWith('pass') ? (c === 'pass-with-conditions' ? 'C' : 'F') : String(c).startsWith('not-pass') ? 'D' : null));
const names = {}; 
const items = fs.readdirSync('data/authored-readings', {withFileTypes:true}).filter(d => d.isDirectory()).map(d => d.name);
const out = {};
for (const item of items) {
  const g = {rows:0, cur:{}, fin:{}, agree:0, curC:0, diff:{}};
  for (const f of fs.readdirSync('data/authored-readings/' + item).filter(f => /^hex-\d{3}\.json$/.test(f))) {
    const j = JSON.parse(fs.readFileSync(`data/authored-readings/${item}/${f}`, 'utf8'));
    for (const r of j.rows) {
      if (r.baseProse === false || !r.facts?.nodes) continue;
      const cur = CODE(r.decision?.outcomeCode); if (!cur) continue;
      g.rows++;
      const fx = {n:Object.fromEntries(r.facts.nodes.map(x => [x.role, x.trigram + x.element + x.qi])), rel:Object.fromEntries(r.facts.directRelations.map(x => [x.role, x.type]))};
      const t = tierFinal(fx, r.primaryId ?? j.primaryId, r.stageIds?.at(-1), LOVE.has(item));
      const fin = split(t, fx, 'end');
      g.cur[cur] = (g.cur[cur] ?? 0) + 1; g.fin[fin] = (g.fin[fin] ?? 0) + 1;
      if (cur === fin) g.agree++; else { const k = cur + '→' + fin; g.diff[k] = (g.diff[k] ?? 0) + 1; }
    }
  }
  out[item] = g;
  console.log(item.padEnd(30), 'rows', g.rows, 'cur', JSON.stringify(g.cur), 'final', JSON.stringify(g.fin), 'agree', g.agree, 'diff', JSON.stringify(g.diff));
}
fs.writeFileSync('docs/review/policy-gap-all.json', JSON.stringify(out, null, 1) + '\n');
