// 卦例回测：把网上收集的卦例（docs/marketing/cases/*.json）放进口径 V2.1 的体用定档，和原帖结果对照。
// 只诊断，不改稿。用法：node scripts/review/backtest.mjs [案例文件 …]
import {readFile, readdir, writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {loadLibrary} from '../../src/index.js';
const require = createRequire(import.meta.url);
const {bodyUseTier} = require('./policy-v2-diagnostic.cjs');
const {tierV21} = require('./indirect-test.cjs');
const library = await loadLibrary();
const QI = {寅:'spring-wood', 卯:'spring-wood', 巳:'summer-fire', 午:'summer-fire', 申:'autumn-metal', 酉:'autumn-metal',
 亥:'winter-water', 子:'winter-water', 辰:'seasonal-earth', 未:'seasonal-earth', 戌:'seasonal-earth', 丑:'seasonal-earth'};
const names = new Map();
for (let id = 1; id <= 64; id++) { const h = library.getHexagram(id); for (const n of [h.name, h.shortName, h.name?.slice(-1), h.name?.slice(-2)].filter(Boolean)) if (!names.has(n)) names.set(n, id); }
const toId = n => { const s = String(n).replace(/卦$/u, '').trim(); return names.get(s) ?? names.get(s.slice(-2)) ?? names.get(s.slice(-1)); };
const shardCache = new Map();
async function facts(id, line, qi) {
 if (!shardCache.has(id)) shardCache.set(id, JSON.parse(await readFile(`data/authored-readings/exam/hex-${String(id).padStart(3, '0')}.json`, 'utf8')));
 const r = shardCache.get(id).rows.find(x => x.movingLine === line && x.monthOrder === qi);
 return {n:Object.fromEntries(r.facts.nodes.map(x => [x.role, x.trigram + x.element + x.qi])),
  rel:Object.fromEntries(r.facts.directRelations.map(x => [x.role, x.type])), text:r.facts.movingLine.fullText,
  chart:r.facts.stages.map(s => s.name).join('→'), label:r.facts.movingLine.label};
}
const files = process.argv.slice(2).length ? process.argv.slice(2) : (await readdir('docs/marketing/cases')).filter(n => n.endsWith('.json')).map(n => 'docs/marketing/cases/' + n);
const rows = [], skipped = [];
for (const f of files) for (const c of JSON.parse(await readFile(f, 'utf8'))) {
 const id = toId(c.hexagram), qi = QI[c.monthBranch], line = Number(c.movingLine);
 if (!id || !qi || !(line >= 1 && line <= 6)) { skipped.push({id:c.id, why:'卦名、动爻或月令无法识别', hexagram:c.hexagram, monthBranch:c.monthBranch}); continue; }
 const fx = await facts(id, line, qi);
 const v2 = bodyUseTier(fx).t, v21 = tierV21(fx).t;
 const src = JSON.parse(await readFile(`sources/editorial/exam/hex-${String(id).padStart(3, '0')}.json`, 'utf8')).find(x => x[0] === line && x[1] === qi);
 const fin = {favourable:'F', conditional:'C', difficult:'D'}[src[2]];
 const want = c.outcomeType === 'positive' ? 'F' : c.outcomeType === 'negative' ? 'D' : 'C';
 const score = t => t === want ? 1 : (t === 'C' || want === 'C') ? 0.5 : 0;
 rows.push({id:c.id, file:f, question:c.questionType, chart:fx.chart, line:fx.label, lineText:fx.text, month:c.monthBranch,
  rel:fx.rel, nodes:fx.n, v2, v21, outcome:c.outcomeType, outcomeText:c.outcome, scoreV2:score(v2), scoreV21:score(v21), final:fin, scoreFinal:score(fin), reliability:c.reliability});
}
const sum = k => rows.reduce((a, r) => a + r[k], 0);
const report = {cases:rows.length, skipped, scoreV2:sum('scoreV2'), scoreV21:sum('scoreV21'), scoreFinal:sum('scoreFinal'),
 hitV21:rows.filter(r => r.scoreV21 === 1).length, missV21:rows.filter(r => r.scoreV21 === 0).length, rows};
await writeFile('docs/review/backtest-online.json', JSON.stringify(report, null, 1) + '\n');
const T = {F:'吉', C:'有条件', D:'难'};
for (const r of rows) console.log(r.id, r.question, r.chart, r.line, r.month + '月', '| V2', T[r.v2], '| V2.1', T[r.v21], '| 现稿', T[r.final], '| 结果', r.outcome, r.scoreFinal === 0 ? '  ← 现稿不合' : '');
console.log(JSON.stringify({cases:report.cases, skipped:skipped.length, scoreV2:report.scoreV2, scoreV21:report.scoreV21, scoreFinal:report.scoreFinal, hitV21:report.hitV21, missV21:report.missV21}));
