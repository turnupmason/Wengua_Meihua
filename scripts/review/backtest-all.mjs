// 全部网上卦例：旧稿（各问项现有构建数据）对比口径 V2.2 体用定档，按问类统计。只诊断。
import {readFile, readdir, writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {loadLibrary} from '../../src/index.js';
const require = createRequire(import.meta.url);
const {tierV21, adjust} = require('./indirect-test.cjs');
const {xiang} = require('./xiang-rule.cjs');
const {split} = require('./binary.cjs');
const LOVE = new Set(['reconciliation','establishment','new-partner','confession','marriage']);
// 第二步爻辞调档的粗估：脚本不能判断象是否落在所问结果上，一律当作落在结果上（偏多调档），只作估算。
const DOWN = /凶|吝|灾|眚|无攸利|勿用|不食|大败|舆尸|不克征|无成|往不胜|不克讼|丧其资斧|号咷|不育/u, UP = /元吉|大吉|无不利|用拯马壮/u;
const P4 = ['use','body_mutual','use_mutual','changed_use'], sq = q => q === '旺' || q === '相';
function step2(t, fx, text) {
 const a = adjust(fx), q = k => a.n[k].slice(-1), bq = fx.n.body.slice(-1);
 const G = P4.filter(k => fx.rel[k] === 'use_generates_body'), K = P4.filter(k => fx.rel[k] === 'use_controls_body');
 const clean = text.replace(/[^\p{Script=Han}]/gu, '');
 if (DOWN.test(clean) && !/终吉|贞吉/u.test(clean)) {
  if (t === 'F') return 'C';
  if (t === 'C' && (K.includes('changed_use') || (bq === '死' && K.some(k => sq(q(k)))))) return 'D';
  return t;
 }
 if (UP.test(clean) && t !== 'F' && G.length && G.some(k => sq(q(k))) && !['囚','死'].includes(bq)) {
  if (K.includes('changed_use') && !((!sq(q('changed_use')) && sq(bq)) || q('changed_use') === '死')) return t;
  return t === 'D' ? 'C' : 'F';
 }
 return t;
}
const library = await loadLibrary();
const QI = {寅:'spring-wood',卯:'spring-wood',巳:'summer-fire',午:'summer-fire',申:'autumn-metal',酉:'autumn-metal',亥:'winter-water',子:'winter-water',辰:'seasonal-earth',未:'seasonal-earth',戌:'seasonal-earth',丑:'seasonal-earth'};
const names = new Map();
for (let id = 1; id <= 64; id++) { const h = library.getHexagram(id); for (const n of [h.name, h.shortName, h.name?.slice(-1), h.name?.slice(-2)].filter(Boolean)) if (!names.has(n)) names.set(n, id); }
const toId = n => { const s = String(n).replace(/卦$/u, '').trim(); return names.get(s) ?? names.get(s.slice(-2)) ?? names.get(s.slice(-1)); };
const ITEM = {exam:'exam', admission:'exam', interview:'interview-pass', 'job-search':'interview-pass', promotion:'promotion-pay', probation:'workplace-probation',
 stability:'workplace-stability', 'job-change':'job-change', reconciliation:'relationship-reconciliation', establishment:'relationship-establishment', 'new-partner':'new-relationship-opportunity', confession:'confession-decision'};
const CODE = c => c == null ? null : ({favourable:'F', conditional:'C', difficult:'D', stable:'F', watch:'C', strained:'D', switch:'F', prepare:'C', stay:'D'}[c] ?? (c.startsWith('pass-with') ? 'C' : c.startsWith('pass') ? 'F' : c.startsWith('not-pass') ? 'D' : null));
const cache = new Map();
const shard = async (item, id) => { const k = item + id; if (!cache.has(k)) cache.set(k, JSON.parse(await readFile(`data/authored-readings/${item}/hex-${String(id).padStart(3, '0')}.json`, 'utf8'))); return cache.get(k); };
const score = (t, w) => t == null ? null : t === w ? 1 : (t === 'C' || w === 'C') ? 0.5 : 0;
const rows = [];
for (const f of (await readdir('docs/marketing/cases')).filter(n => n.endsWith('.json')))
 for (const c of JSON.parse(await readFile('docs/marketing/cases/' + f, 'utf8'))) {
  // 六爻摇卦（castingMethod: liuyao）不是梅花先天起卦，判法不同，不进本回测（2026-11-19，见 PROBATION_REJUDGE_20261118.md 第七节）。
  if (c.castingMethod === 'liuyao') continue;
  const id = toId(c.hexagram), qi = QI[c.monthBranch], line = Number(c.movingLine);
  if (!id || !qi || !(line >= 1)) continue;
  const ex = (await shard('exam', id)).rows.find(x => x.movingLine === line && x.monthOrder === qi);
  const fx = {n:Object.fromEntries(ex.facts.nodes.map(x => [x.role, x.trigram + x.element + x.qi])), rel:Object.fromEntries(ex.facts.directRelations.map(x => [x.role, x.type])), text:''};
  const t0 = tierV21(fx), changedId = toId(ex.facts.stages.at(-1).name), t = {...t0, t:xiang(t0, fx.rel, id, changedId, LOVE.has(c.questionType), process.env.XIANG ?? 'both')}, est = step2(t.t, fx, ex.facts.movingLine.fullText), want = c.outcomeType === 'positive' ? 'F' : c.outcomeType === 'negative' ? 'D' : 'C';
  let old = null; const item = ITEM[c.questionType];
  if (item) {
   const s = await shard(item, id); const i = s.monthSlots[`${line}:${c.monthBranch}`];
   old = CODE(s.rows[i]?.decision?.outcomeCode);
  }
  if (item === 'exam') old = CODE(JSON.parse(require('child_process').execSync(`git show HEAD:sources/editorial/exam/hex-${String(id).padStart(3, '0')}.json`, {maxBuffer:1e8}).toString()).find(x => x[0] === line && x[1] === qi)[2]);
  rows.push({id:c.id, type:c.questionType, chart:ex.facts.stages.map(s => s.name).join('→'), line:ex.facts.movingLine.label, month:c.monthBranch,
   nodes:fx.n, rel:fx.rel, why:t.why, notes:t.notes, want, outcome:c.outcome, old, v22:t.t, est, bin:split({...t, t:est}, fx, process.env.BIN ?? 'end'), bin0:split(t, fx, process.env.BIN ?? 'end'), bin4:(() => { const s0 = split(t, fx, process.env.BIN ?? 'end'); const clean = ex.facts.movingLine.fullText.replace(/[^\p{Script=Han}]/gu, ''); const a = adjust(fx), K = P4.filter(k => fx.rel[k] === 'use_controls_body'), bq = fx.n.body.slice(-1); const gate = K.includes('changed_use') || (bq === '死' && K.some(k => sq(a.n[k].slice(-1)))) || t.t === 'F'; if (s0 === 'F' && DOWN.test(clean) && !/终吉|贞吉/u.test(clean) && (process.env.G4 === 'all' ? (K.includes('changed_use') || (bq === '死' && K.some(k => sq(a.n[k].slice(-1))))) || !K.length : gate)) return 'D'; const o = {D:0, C:1, F:2}; if (s0 === 'D' && o[est] > o[t.t]) return 'F'; return s0; })(), bin3:(() => { const s0 = split(t, fx, process.env.BIN ?? 'end'); const clean = ex.facts.movingLine.fullText.replace(/[^\p{Script=Han}]/gu, ''); if (s0 === 'F' && DOWN.test(clean) && !/终吉|贞吉/u.test(clean)) return 'D'; const o = {D:0, C:1, F:2}; if (s0 === 'D' && o[est] > o[t.t]) return 'F'; return s0; })(), bin2:(() => { const s0 = split(t, fx, process.env.BIN ?? 'end'), o = {D:0, C:1, F:2}; const d = o[est] - o[t.t]; return d < 0 ? 'D' : d > 0 ? 'F' : s0; })(), lineText:ex.facts.movingLine.fullText, sOld:score(old, want), sNew:score(t.t, want), sEst:score(est, want)});
 }
const by = {};
for (const r of rows) { const g = by[r.type] ||= {n:0, old:0, oldN:0, nw:0}; g.n++; g.nw += r.sNew; if (r.sOld != null) { g.old += r.sOld; g.oldN++; } }
await writeFile('docs/review/backtest-all.json', JSON.stringify({rows, byType:by}, null, 1) + '\n');
const T = {F:'吉', C:'有条件', D:'难'};
for (const r of rows) console.log([r.id, r.type, r.chart, r.line, r.month + '月', '旧', T[r.old] ?? '—', '新', T[r.v22], '实', T[r.want], r.sNew === 0 ? '✗' : r.sNew === 0.5 ? '△' : '✓', r.why].join(' '));
const tot = rows.reduce((a, r) => ({n:a.n + 1, nw:a.nw + r.sNew, old:a.old + (r.sOld ?? 0), oldN:a.oldN + (r.sOld != null)}), {n:0, nw:0, old:0, oldN:0});
const oldPaired = rows.filter(r => r.sOld != null);
console.log(JSON.stringify({byType:by, total:tot, pairedOld:oldPaired.reduce((a, r) => a + r.sOld, 0), pairedNew:oldPaired.reduce((a, r) => a + r.sNew, 0), pairedN:oldPaired.length,
 hitNew:rows.filter(r => r.sNew === 1).length, halfNew:rows.filter(r => r.sNew === 0.5).length, missNew:rows.filter(r => r.sNew === 0).length,
 hitOld:oldPaired.filter(r => r.sOld === 1).length, missOld:oldPaired.filter(r => r.sOld === 0).length}));
