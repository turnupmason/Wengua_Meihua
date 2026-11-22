// 一层间接作用说法核对（2026-11-20）：按运行数据 decision.indirectEffectsApplied（定稿第八节规则 1–3），
// 找第 9 栏或逐月正文里把「受制而衰」的克体之卦说成重／实，把「得生而盛」的说成轻／弱，把「受制而薄」的生体之卦说成实／足的句子。
// 启发式，只列疑似句供人工判。用法：node scripts/review/indirect-audit.mjs <问项> [--monthly] [--hex 1,2]
import {readFileSync, readdirSync, existsSync} from 'node:fs';
import {QI} from './monthly-lib.mjs';
const args = process.argv.slice(2), item = args[0], monthly = args.includes('--monthly');
// 2026-11-21：确定关系、复合、新桃花的运行数据仍是 1.0（无 indirectEffectsApplied），盘面与考试同盘，读考试运行数据。
const DATA_ITEM = ['relationship-establishment', 'relationship-reconciliation', 'new-relationship-opportunity'].includes(item) ? 'exam' : item;
const hi = args.indexOf('--hex'), only = hi >= 0 ? new Set(args[hi + 1].split(',').map(Number)) : null;
const NAME = {乾:'乾',兑:'兑',离:'离',震:'震',巽:'巽',坎:'坎',艮:'艮',坤:'坤'};
const BAD = {'control-weakened':/重|实|有力|最紧|压得|旺而克|克得深|克力足/u, 'generate-strengthened':/轻|无力|不重|弱|难伤|伤不到/u, 'support-weakened':/实|足|厚|有力|落得实/u};
const out = [];
for (let h = 1; h <= 64; h++) {
 if (only && !only.has(h)) continue;
 const id = String(h).padStart(3, '0'), dp = `data/authored-readings/${DATA_ITEM}/hex-${id}.json`; if (!existsSync(dp)) continue;
 const data = JSON.parse(readFileSync(dp, 'utf8')), base = JSON.parse(readFileSync(`sources/editorial/${item}/hex-${id}.json`, 'utf8'));
 const mp = `sources/editorial/${item}/monthly/hex-${id}.json`, arts = monthly && existsSync(mp) ? JSON.parse(readFileSync(mp, 'utf8')).articles : [];
 for (const r of data.rows) {
  if (r.baseProse === false) continue;
  const effs = r.decision?.indirectEffectsApplied || []; if (!effs.length) continue;
  const tri = role => r.facts.nodes.find(n => n.role === role)?.trigram;
  const texts = monthly ? arts.filter(a => a.movingLine === r.movingLine && QI[a.monthBranch] === r.monthOrder).map(a => [`${h}/${a.movingLine}/${a.monthBranch}`, a.paragraphs.join('')])
   : [[`${h}#${base.findIndex(d => d[0] === r.movingLine && d[1] === r.monthOrder)}(${r.movingLine}/${r.monthOrder})`, base.find(d => d[0] === r.movingLine && d[1] === r.monthOrder)[9]]];
  for (const e of effs) {
   const t = tri(e.role); if (!t) continue;
   for (const [key, text] of texts) for (const s of text.replace(/「[^」]*」/gu, '').split(/[。；]/u)) {
    if (!s.includes(t)) continue;
    const near = s.slice(s.indexOf(t), s.indexOf(t) + 16);
    if (BAD[e.effect]?.test(near)) out.push(`${key}\t${e.label}(${t})\t${s.trim()}`);
   }
  }
 }
}
for (const o of out) console.log(o);
console.log(JSON.stringify({item, monthly, suspects: out.length}));
// --table：逐行列出本问项每一盘的一层间接作用（卦、五态、作用），供人工核对第 9 栏与正文。
if (args.includes('--table')) {
 for (let h = 1; h <= 64; h++) {
  if (only && !only.has(h)) continue;
  const id = String(h).padStart(3, '0'), dp = `data/authored-readings/${DATA_ITEM}/hex-${id}.json`; if (!existsSync(dp)) continue;
  const data = JSON.parse(readFileSync(dp, 'utf8')), base = JSON.parse(readFileSync(`sources/editorial/${item}/hex-${id}.json`, 'utf8'));
  for (const r of data.rows) { if (r.baseProse === false) continue;
   const i = base.findIndex(d => d[0] === r.movingLine && d[1] === r.monthOrder);
   const nodes = r.facts.nodes.filter(n => n.role !== 'body_inherited').map(n => `${n.role}:${n.trigram}${n.element}${n.qi}`).join(' ');
   const effs = (r.decision?.indirectEffectsApplied || []).map(e => `${e.role}=${e.label}`).join('；') || '无';
   console.log(`${h}#${i}\t${r.movingLine}/${r.monthOrder}\t${nodes}\t间接：${effs}`);
  }
 }
}
