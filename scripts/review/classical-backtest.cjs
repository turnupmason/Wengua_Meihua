// 原书卦例回测：V2 / V2.1 / V2.2 体用定档与原书断语对照（只诊断）。
const fs = require('fs');
const {bodyUseTier} = require('./policy-v2-diagnostic.cjs');
const {tierV21} = require('./indirect-test.cjs');
const {tierV22} = require('./policy-rejected-variants.cjs');
const {xiang} = require('./xiang-rule.cjs');
const MODE = process.env.XIANG ?? 'both';
const QI = ['spring-wood','summer-fire','autumn-metal','winter-water','seasonal-earth'];
const cases = JSON.parse(fs.readFileSync('docs/review/classical-cases.json', 'utf8'));
const score = (t, w) => t === w ? 1 : (t === 'C' || w === 'C') ? 0.5 : 0;
const tot = {v2:0, v21:0, v22:0}; let n = 0;
for (const c of cases) {
  const sh = JSON.parse(fs.readFileSync(`data/authored-readings/exam/hex-${String(c.hex).padStart(3,'0')}.json`, 'utf8'));
  const qs = c.qi === 'all' ? QI : c.qi; const res = {v2:[], v21:[], v22:[]};
  for (const qi of qs) {
    const r = sh.rows.find(x => x.movingLine === c.line && x.monthOrder === qi);
    const fx = {n:Object.fromEntries(r.facts.nodes.map(x => [x.role, x.trigram + x.element + x.qi])), rel:Object.fromEntries(r.facts.directRelations.map(x => [x.role, x.type])), text:r.facts.movingLine.fullText};
    const t21 = tierV21(fx); const changedId = sh.rows.find(x => x.movingLine === c.line && x.monthOrder === qi).facts.stages.at(-1).id;
    res.v2.push(bodyUseTier(fx).t); res.v21.push(MODE ? xiang(t21, fx.rel, c.hex, Number(String(changedId).replace(/D/g, '')), false, MODE) : t21.t); res.v22.push(tierV22(fx).t);
  }
  const s = k => res[k].reduce((a, t) => a + score(t, c.book), 0) / qs.length;
  for (const k of ['v2','v21','v22']) tot[k] += s(k); n++;
  console.log(c.id.padEnd(8), '原书', c.book, '| V2', res.v2.join(''), '| 定稿', res.v21.join(''), '| 未采用变体', res.v22.join(''), res.v22.join('') !== res.v21.join('') ? ' ←变' : '');
}
console.log('合计（满分 ' + n + '）', JSON.stringify(Object.fromEntries(Object.entries(tot).map(([k, v]) => [k, +v.toFixed(2)]))));
