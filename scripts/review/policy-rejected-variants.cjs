// 候选变体（未采用，见口径第九节）：生体被克即灭吉、升吉须生体旺相并体死降档。只诊断，保留作记录。
//  ①《体用》（682 行）「此卦生体，诸卦有克此卦者，彼灭其吉」：生体之卦被他卦所克（无他卦生之），其生体之吉作废。
//    有生无克的盘，若生体之卦全被灭吉，按无生无克论（体死而党不旺相 → 有条件）。
//  ②《衰旺论》（688 行）「生体之卦气亦宜旺」；田姓屋宅（751 行）丑月离火休而称「火虽无气」：休也是无气。
//    有生有克的盘升为吉（体旺克衰），须至少一处生体之卦旺相（有气），不能只靠休囚死的生体。
//  ③《衰旺论》「体衰而有生体之卦，则衰稍解」：体死（衰），有生无克而生体之卦都无气（休囚死），只算衰稍解 → 有条件。
const {adjust} = require('./indirect-test.cjs');
const {bodyUseTier} = require('./policy-v2-diagnostic.cjs');
const P = ['use','body_mutual','use_mutual','changed_use'];
const q = s => s.slice(-1), strong = x => x === '旺' || x === '相';
function tierV22(r) {
  const a = adjust(r);
  const G = P.filter(k => r.rel[k] === 'use_generates_body'), K = P.filter(k => r.rel[k] === 'use_controls_body');
  const cut = G.filter(k => a.notes.includes(k + ' 生体受制而薄'));
  const base = bodyUseTier(a);
  const bq = q(r.n.body);
  if (!K.length && G.length) {
    if (cut.length === G.length) {
      // 生体之吉全灭：把这些处当作不生体，重走无生无克/泄的判法。
      const rel = {...a.rel}; for (const k of cut) rel[k] = 'equal_void';
      const t = bodyUseTier({...a, rel});
      return {...t, why:'V2.2① 生体灭吉 → ' + t.why, notes:a.notes};
    }
    if (base.t === 'F' && bq === '死' && !G.some(k => strong(q(a.n[k])))) return {t:'C', why:'V2.2③ 体衰生无气', notes:a.notes};
  }
  if (base.why.startsWith('R2↑') && !G.some(k => strong(q(a.n[k])))) return {t:'C', why:'V2.2② 升吉须生体有气', notes:a.notes};
  return {...base, notes:a.notes};
}
module.exports = {tierV22};
