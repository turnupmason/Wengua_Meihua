// 定稿口径（2026-11-18）的体用定档：V2 两步第一步 + V2.1 间接生克 + V2.2 休为无气、本用泄/克 + 无生无克时卦象主断。
// 只给初判；爻辞调档仍按 docs/READING_POLICY_V2.md 第二步逐篇定。
const {tierV21} = require('./indirect-test.cjs');
const {xiang} = require('./xiang-rule.cjs');
// fx: {n, rel, text}；hexId 本卦卦序；changedId 变卦卦序；love 是否婚恋问项（姤「勿用取女」只对婚恋）。
function tierFinal(fx, hexId, changedId, love = false, opts = {}) {
  const t = tierV21(fx, opts);
  const x = xiang(t, fx.rel, hexId, changedId, love, 'both');
  return x === t.t ? t : {...t, t:x, why:t.why + ' → 卦象主断（487 行「不必拘体用」）'};
}
module.exports = {tierFinal};
// 二分定档（用户 2026-11-18：每篇只判成或不成）：三档初判 → 有条件按结局拆 → 爻辞翻转在逐篇复核里定。
const {split} = require('./binary.cjs');
function verdictFinal(fx, hexId, changedId, love = false) {
  const t = tierFinal(fx, hexId, changedId, love);
  const v = split(t, fx, 'end');
  return {...t, tier:t.t, t:v, why:t.t === 'C' ? t.why + ' → 有条件按结局拆为' + (v === 'F' ? '成' : '不成') : t.why};
}
module.exports.verdictFinal = verdictFinal;
