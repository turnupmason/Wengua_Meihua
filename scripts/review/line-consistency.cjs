// 复核记录一致性（只诊断）：①lineReading 写的升/降档与实际结论是否同向；②同一卦同一动爻五个月令的爻辞读法是否一致。
const fs = require('fs');
const {tierV21} = require('./indirect-test.cjs');
const item = process.argv[2] || 'exam';
const T = {favourable:'F', conditional:'C', difficult:'D'}, ORD = {D:0, C:1, F:2};
const out = {direction:[], crossMonth:[]};
for (let h = 1; h <= 64; h++) {
  const id = String(h).padStart(3, '0');
  const p = `sources/editorial/${item}/review-v2/hex-${id}.json`; if (!fs.existsSync(p)) continue;
  const recs = JSON.parse(fs.readFileSync(p, 'utf8'));
  const sh = JSON.parse(fs.readFileSync(`data/authored-readings/${item}/hex-${id}.json`, 'utf8'));
  const byLine = {};
  for (const rec of recs) {
    const [, , line, qi] = rec.key.split('/');
    const r = sh.rows.find(x => x.movingLine === +line && x.monthOrder === qi);
    const fx = {n:Object.fromEntries(r.facts.nodes.map(x => [x.role, x.trigram + x.element + x.qi])), rel:Object.fromEntries(r.facts.directRelations.map(x => [x.role, x.type])), text:r.facts.movingLine.fullText};
    const tier = tierV21(fx).t, fin = T[rec.newOutcome];
    const dir = ORD[fin] - ORD[tier];
    const lr = String(rec.lineReading || '');
    // 只看结论性措辞（「不升档」「不降档」「不调」之类先剔掉）
    const s = lr.split(/[。；]/u).filter(c => !/不升|不降|未升|未降|不调|无从|不能升|不得升|不再降|撤回|不因|同向|非正对|不正对|不落/u.test(c)).join('。');
    const saysUp = /升一档|升为吉|升档/u.test(s), saysDown = /降一档|降为|降档/u.test(s);
    if ((saysUp && dir <= 0) || (saysDown && dir >= 0) || (!saysUp && !saysDown && dir !== 0))
      out.direction.push({key:rec.key, tierV21:tier, final:fin, saysUp, saysDown, lineReading:lr.slice(0, 160)});
    (byLine[line] ||= []).push({qi, dir, landed:/落在|正对|直指|应在结果|落到结果/u.test(lr) && !/不落在|未落在|不正对|不直指|并非正对/u.test(lr), lr:lr.slice(0, 100)});
  }
  for (const [line, arr] of Object.entries(byLine)) {
    const l = new Set(arr.map(a => a.landed));
    if (l.size > 1) out.crossMonth.push({hex:h, line:+line, months:arr.map(a => `${a.qi}:${a.landed ? '落' : '不落'}:${a.dir}`)});
  }
}
fs.writeFileSync(`docs/review/${item}-line-consistency.json`, JSON.stringify(out, null, 1) + '\n');
console.log('direction', out.direction.length, 'crossMonth', out.crossMonth.length);
