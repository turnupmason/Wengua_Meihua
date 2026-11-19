// 晋升加薪定稿结论（2026-11-18，用户定：用《求名占》在任专条）。只诊断/导出，不改稿。
// 规则：以考试同盘定稿结论为底（READING_POLICY_V2 第二、十三节）；盘中有克体之卦（四处任一处直接克体）一律不成
// （《求名占》「若在任占卜，最忌见克体之卦，如卦有克体者，即居官见祸」）；晋升专属爻辞降判见 LINE_DOWN。
const fs = require('fs');
const P4 = ['use','body_mutual','use_mutual','changed_use'];
const LINE_DOWN = {
  '3-5':'屯九五「小贞吉，大贞凶」：晋升属大事，取大贞凶（口径第二步：分大小之辞，按问项取一面）',
  '6-6':'讼上九「或锡之鞶带，终朝三褫之」：所赐一日三夺，正落在任命上',
  '11-6':'泰上六「城复于隍；勿用师，自邑告命，贞吝」，小象「其命乱也」：落在任命上',
  '33-3':'遯九三小象「畜臣妾吉，不可大事也」：晋升属大事',
  '55-3':'丰九三小象「丰其沛，不可大事也；折其右肱，终不可用也」：晋升属大事，且不被用',
};
function promotionVerdicts() {
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
      out.push({hex:h, index:i, line:d[0], month:d[1], exam:d[2], promotion:v, why});
    });
  }
  return out;
}
module.exports = {promotionVerdicts, LINE_DOWN};
if (require.main === module) {
  const v = promotionVerdicts(); const c = {favourable:0, difficult:0}; const w = {};
  v.forEach(x => { c[x.promotion]++; if (x.promotion !== x.exam) w[x.why.split('：')[0]] = (w[x.why.split('：')[0]] ?? 0) + 1; });
  let cur = 0; for (const x of v) { const s = JSON.parse(fs.readFileSync(`sources/editorial/promotion-pay/hex-${String(x.hex).padStart(3, '0')}.json`, 'utf8'))[x.index]; if (s[2] !== x.promotion) cur++; }
  console.log(JSON.stringify({counts:c, changedFromExam:w, differFromCurrentPromotion:cur}));
}
