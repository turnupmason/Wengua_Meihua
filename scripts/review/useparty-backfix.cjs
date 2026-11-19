// 用党多回改（2026-11-19，用户定「补进口径，做完跳槽再回改」）：把新结论同步进各问项作者源第 2 栏、polish-v5.outcome、review-v2.newOutcome/final.to。
// 只改结论，正文、判断依据、计算说明交写手按新结论重写。用法：node scripts/review/useparty-backfix.cjs [--write]
const fs = require('fs');
const WRITE = process.argv.includes('--write');
const pad = h => String(h).padStart(3, '0');
const UPM_NOTE = '用党多则体势衰（《体用》494 行「体党多而体势盛，用党多则体势衰」，2026-11-19 补进定稿口径）';
const EXAM_FLIP = new Set(['14-3', '20-3', '27-6']); // 无生无克而用党多：R1b 判成改为有条件，按定稿第十三节表拆为不成
const changes = [];
function apply(item, h, i, to, why) {
  const dir = `sources/editorial/${item}/`;
  const s = JSON.parse(fs.readFileSync(dir + `hex-${pad(h)}.json`, 'utf8'));
  if (s[i][2] === to) return;
  changes.push(`${item} ${h}#${i} ${s[i][0]}/${s[i][1]} ${s[i][2]}→${to}`);
  if (!WRITE) return;
  s[i][2] = to; fs.writeFileSync(dir + `hex-${pad(h)}.json`, JSON.stringify(s, null, 2) + '\n');
  const pp = dir + `polish-v5/hex-${pad(h)}.json`, rp = dir + `review-v2/hex-${pad(h)}.json`;
  const p = JSON.parse(fs.readFileSync(pp, 'utf8')); const pa = Array.isArray(p) ? p : p.records;
  pa[i].outcome = to; pa[i].useParty = UPM_NOTE + '：' + why; fs.writeFileSync(pp, JSON.stringify(p, null, 1) + '\n');
  const r = JSON.parse(fs.readFileSync(rp, 'utf8')); const ra = Array.isArray(r) ? r : r.records;
  ra[i].newOutcome = to; ra[i].changed = ra[i].oldOutcome !== to; ra[i].final = {...(ra[i].final ?? {}), to, useParty:UPM_NOTE + '：' + why};
  fs.writeFileSync(rp, JSON.stringify(r, null, 1) + '\n');
}
// 考试与面试（面试与考试同盘同结论）
for (const item of ['exam', 'interview-pass']) for (let h = 1; h <= 64; h++) {
  const s = JSON.parse(fs.readFileSync(`sources/editorial/${item}/hex-${pad(h)}.json`, 'utf8'));
  s.forEach((d, i) => { if (EXAM_FLIP.has(h + '-' + d[0]) && d[2] === 'favourable') apply(item, h, i, 'difficult', '无生无克之盘用党多，体势衰，按定稿第十三节表 R1b 判不成'); });
}
// 晋升、转正以考试定稿为底
if (WRITE) {
  for (const [item, mod, key] of [['promotion-pay', './promotion-verdicts.cjs', 'promotion'], ['workplace-probation', './probation-verdicts.cjs', 'probation']]) {
    delete require.cache[require.resolve(mod)];
    const fn = Object.values(require(mod)).find(f => typeof f === 'function');
    for (const x of fn()) apply(item, x.hex, x.index, x[key], '考试同盘改判：' + x.why);
  }
} else changes.push('（晋升、转正在 --write 时随考试新结论重算）');
// 职场情况
{
  const {stabilityVerdicts} = require('./stability-verdicts.cjs');
  for (const x of stabilityVerdicts()) {
    const s = JSON.parse(fs.readFileSync(`sources/editorial/workplace-stability/hex-${pad(x.hex)}.json`, 'utf8'));
    const i = s.findIndex(d => d[0] === x.line && d[1] === x.month);
    apply('workplace-stability', x.hex, i, x.v, x.why);
  }
}
console.log(changes.length + '\n' + changes.join('\n'));
