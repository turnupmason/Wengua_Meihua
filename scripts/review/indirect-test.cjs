// 候选规则 V2.1「间接生克」回测（只诊断，不改稿）。
// 依据：《体用》（682 行）「此卦生体，诸卦有克此卦者，彼灭其吉。此卦克体，诸卦又有克此卦者，稍解其穷」；
// 观梅（143 行）「互中巽木，复三起离火，则克体之卦气盛」；田姓屋宅（751 行）「虽兑金克木，得有离火……终是制金」。
// 做法：只看本用、两互、变用四处之间一层，不连环累计。
//  克体之卦：另有一处生它 → 视同有力；另有一处克它 → 视同气弱；两者都有则相抵。
//  生体之卦：另有一处克它 → 视同气弱（灭其吉）。
const {bodyUseTier} = require('./policy-v2-diagnostic.cjs');
const P = ['use','body_mutual','use_mutual','changed_use'];
const GEN = {木:'火', 火:'土', 土:'金', 金:'水', 水:'木'};
const CTL = {木:'土', 土:'水', 水:'火', 火:'金', 金:'木'};
const el = s => s[1], qi = s => s.slice(-1);
function adjust(r) {
  const n = {...r.n}, notes = [];
  for (const k of P) {
    const e = el(n[k]), others = P.filter(o => o !== k).map(o => el(r.n[o]));
    const fed = others.some(o => GEN[o] === e), cut = others.some(o => CTL[o] === e);
    if (r.rel[k] === 'use_controls_body') {
      if (fed && !cut) { n[k] = n[k].slice(0, -1) + '旺'; notes.push(k + ' 克体得生而盛'); }
      if (cut && !fed) { n[k] = n[k].slice(0, -1) + '死'; notes.push(k + ' 克体受制而衰'); }
    }
    if (r.rel[k] === 'use_generates_body' && cut && !fed) { n[k] = n[k].slice(0, -1) + '死'; notes.push(k + ' 生体受制而薄'); }
  }
  return {n, rel:r.rel, text:r.text, notes};
}
module.exports = {adjust, tierV21: (r, opts = {}) => { const a = adjust(r); return {...bodyUseTier(a, opts), notes:a.notes}; }};
