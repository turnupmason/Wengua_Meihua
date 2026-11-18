// 二分定档（用户要求：只有成、不成两种结论）。把三档初判里的「有条件」按原书结局之法拆开。只诊断。
// 依据：《体用互变之诀》「变为事占之终应」「变生体及比和，则事事临终有吉利」「变卦克体，事于末后，必有不吉」；
// 《求名占》「体克用，名可成，但成迟」「体生用，名不可就」。
const {adjust} = require('./indirect-test.cjs');
const strong = q => q === '旺' || q === '相';
function split(t, fx, mode = 'end') {
  if (t.t !== 'C') return t.t;
  const end = fx.rel.changed_use, why = t.why;
  if (/R1a↓|R1↓|R1b|R3↑′/u.test(why)) return 'D';          // 本用泄而变不生、变泄、体与党皆无气、末段克：结局不吉
  if (/R1c/u.test(why)) return 'D';                             // 初泄末和：与 R1a↓ 同理，本用泄体（「体生用，名不可就」）而变用不生体，不成
  if (/R3↑/u.test(why)) return 'F';                       // 本变皆吉、中段弱克；初泄末和：先难后成
  // R2 有生有克：结局看变用
  if (end === 'use_generates_body' || end === 'equal' || end === 'body_controls_use') {
    if (mode === 'end+') { // 体弱而克体之卦有力者，仍不成
      const a = adjust(fx), bq = fx.n.body.slice(-1);
      const K = Object.keys(fx.rel).filter(k => fx.rel[k] === 'use_controls_body');
      if ((bq === '囚' || bq === '死') && K.some(k => strong(a.n[k].slice(-1)))) return 'D';
    }
    return 'F';
  }
  return 'D';                                                  // 变用克体或泄体
}
module.exports = {split};
