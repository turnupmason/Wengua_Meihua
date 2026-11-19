// 能否转正定稿结论（2026-11-18，用户定：与晋升一样用《求名占》在任专条）。只诊断/导出。
// 规则：考试同盘定稿结论为底；盘中有克体之卦一律不成；转正专属降判见 LINE_DOWN。
// 不降（分大小之辞取小事一侧，或样稿已定）：屯九五「小贞吉」、遯九三「畜臣妾吉」、泰上六（样稿 S12）、丰上六（样稿 S10）。
const fs = require('fs');
const P4 = ['use','body_mutual','use_mutual','changed_use'];
const LINE_DOWN = {
  '6-6':'讼上九「或锡之鞶带，终朝三褫之」：所得一日三夺，正落在转正确认上',
};
function probationVerdicts() {
  const out = [];
  for (let h = 1; h <= 64; h++) {
    const id = String(h).padStart(3, '0');
    const ex = JSON.parse(fs.readFileSync(`sources/editorial/exam/hex-${id}.json`, 'utf8'));
    const j = JSON.parse(fs.readFileSync(`data/authored-readings/exam/hex-${id}.json`, 'utf8'));
    ex.forEach((d, i) => {
      const r = j.rows.find(x => x.movingLine === d[0] && x.monthOrder === d[1]);
      const rel = Object.fromEntries(r.facts.directRelations.map(x => [x.role, x.type]));
      const K = P4.filter(k => rel[k] === 'use_controls_body');
      let v = d[2], why = '考试同盘定稿';
      if (K.length) { if (v === 'favourable') why = '在任专条：' + K.join('、') + ' 克体'; v = 'difficult'; }
      const ld = LINE_DOWN[h + '-' + d[0]];
      if (ld && v === 'favourable') { v = 'difficult'; why = ld; }
      out.push({hex:h, index:i, line:d[0], month:d[1], exam:d[2], probation:v, why});
    });
  }
  return out;
}
module.exports = {probationVerdicts, LINE_DOWN};
if (require.main === module) {
  const v = probationVerdicts(); const c = {favourable:0, difficult:0}; const w = {};
  v.forEach(x => { c[x.probation]++; if (x.probation !== x.exam) w[x.why.split('：')[0]] = (w[x.why.split('：')[0]] ?? 0) + 1; });
  let cur = 0; for (const x of v) { const s = JSON.parse(fs.readFileSync(`sources/editorial/workplace-probation/hex-${String(x.hex).padStart(3, '0')}.json`, 'utf8'))[x.index]; if (s[2] !== x.probation) cur++; }
  const S = {S10:[55,6,'spring-wood'], S11:[1,1,'autumn-metal'], S12:[11,6,'seasonal-earth']};
  const samples = Object.fromEntries(Object.entries(S).map(([k, [h, l, m]]) => [k, v.find(x => x.hex === h && x.line === l && x.month === m).probation]));
  console.log(JSON.stringify({counts:c, changedFromExam:w, differFromCurrentProbation:cur, samples}));
}
