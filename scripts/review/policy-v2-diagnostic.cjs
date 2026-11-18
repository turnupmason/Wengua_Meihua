// Diagnostic only (docs/READING_POLICY_V2.md §二): locates and counts boards by the body-use tier.
// Line-text adjustments are judged per manuscript and are only flagged here, never applied.
const P = ['use','body_mutual','use_mutual','changed_use'];
const qiOf = s => s.slice(-1), strong = q => q === '旺' || q === '相', faint = q => q === '囚' || q === '死';
// V2.2：克体、生体之卦的「无气」含休（《五行大义》休「不能治事」，《火珠林》「休囚为无气」，屋宅占丑月离火休而称「无气」）。体卦本身仍以囚死为弱。
const noQi = q => q === '休' || faint(q);
const ADVERSE = /凶|泣血|勿用|无攸利|吝|厉/u, AUSPICIOUS = /元吉|大吉|无不利|终吉|往吉|贞吉|吉/u;
const calm = rel => rel === 'equal' || rel === 'body_controls_use';
function bodyUseTier(r) {
 const G = P.filter(k => r.rel[k] === 'use_generates_body'), K = P.filter(k => r.rel[k] === 'use_controls_body');
 const bq = qiOf(r.n.body), bodyStrong = strong(bq), endDrain = r.rel.changed_use === 'body_generates_use';
 const kWeak = K.every(k => !strong(qiOf(r.n[k])));
 if (!K.length) {
  const partyAll = P.filter(k => r.rel[k] === 'equal').map(k => qiOf(r.n[k]));
  if (endDrain && !G.length && bq === '死' && !partyAll.some(strong)) return {t:'D', why:'R1b′ 体衰党衰又变泄'};
  if (endDrain) return {t:'C', why:'R1↓ 变用体生用'};
  // V2.2：本用体生用（求名占「体生用，名不可就」；《体用互变之诀》「卦用最紧」），变用又不生体时，有生只解到有条件。
  // 变用生体则按《体用总诀》「用凶变吉者，先凶后吉」取吉（少年有喜色：用不生体，互变生之而吉，「不为其害」）。
  if (G.length && r.rel.use === 'body_generates_use' && r.rel.changed_use !== 'use_generates_body' ) return {t:'C', why:'R1a↓ 有生而本用泄、变不生'};
  if (G.length) return {t:'F', why:'R1a 有生无克'};
  if (r.rel.use === 'body_generates_use' && bq === '死' && !partyAll.some(strong)) return {t:'D', why:'R1b′ 体衰党衰又初泄'};
  if (r.rel.use === 'body_generates_use') return calm(r.rel.changed_use) ? {t:'C', why:'R1c 初泄末和'} : {t:'D', why:'R1c 泄而无生'};
  const party = P.filter(k => r.rel[k] === 'equal').map(k => qiOf(r.n[k]));
  // 无比和之卦时「体之卦党多」不适用：只有体死（衰）而无一处相助才取此条（《衰旺论》「体衰而有生体之卦，则衰稍解」反推）；体休、囚按《求名占》「体克用，名可成，但成迟」。
  if (((bq === '死') || (!bodyStrong && party.length)) && !party.some(strong)) return {t:'C', why:party.length ? 'R1b 体不旺相、党皆无气（「皆是衰卦，终不吉」）' : 'R1b 体死而无一处相助（衰不得解）'};
  return {t:'F', why:'R1b 无克体'};
 }
 if (G.length) {
  if (r.rel.use === 'use_controls_body' && r.rel.changed_use === 'use_controls_body') return {t:'D', why:'R2↓ 用变俱克'};
  if (K.includes('changed_use') && strong(qiOf(r.n.changed_use)) && faint(bq)) return {t:'D', why:'R2↓ 变克体旺而体弱'};
  if (bq === '死' && K.some(k => strong(qiOf(r.n[k]))) && !G.some(k => strong(qiOf(r.n[k])))) return {t:'D', why:'R2↓ 体衰克旺'};
  if (bodyStrong && kWeak && !['use_controls_body','body_generates_use'].includes(r.rel.changed_use) && (!['body_generates_use','use_controls_body'].includes(r.rel.use) || r.rel.changed_use === 'use_generates_body') && !G.every(k => noQi(qiOf(r.n[k])))) return {t:'F', why:'R2↑ 体旺克衰'};
  return {t:'C', why:'R2 有生有克'};
 }
 if (calm(r.rel.use) && calm(r.rel.changed_use) && bodyStrong && K.every(k => noQi(qiOf(r.n[k])))) return {t:'C', why:'R3↑ 本变皆吉，中段弱克'};
 if (K.length === 1 && K[0] === 'changed_use' && noQi(qiOf(r.n.changed_use)) && bodyStrong && ['use','body_mutual','use_mutual'].every(k => calm(r.rel[k])) && P.filter(k => r.rel[k] === 'equal').every(k => strong(qiOf(r.n[k]))) && P.some(k => r.rel[k] === 'equal')) return {t:'C', why:'R3↑′ 体党旺而末克弱'};
 return {t:'D', why:'R3 无生有克'};
}
function lineFlag(r) {
 if (ADVERSE.test(r.text)) return 'adverse-term';
 if (AUSPICIOUS.test(r.text)) return 'auspicious-term';
 return null;
}
module.exports = {bodyUseTier, lineFlag, suggest:r => ({...bodyUseTier(r), lineFlag:lineFlag(r)})};
if (require.main === module) {
 const fs = require('fs'), S = process.argv[2];
 const map = c => ({favourable:'F', conditional:'C', difficult:'D', 'not-pass-this-round':'D', 'not-pass-under-current-approach':'D'}[c] || (c.startsWith('pass') ? 'F' : '?'));
 for (const d of ['exam','interview-pass','promotion-pay','workplace-probation','relationship-reconciliation','relationship-establishment','new-relationship-opportunity','confession-decision']) {
  const rows = fs.readFileSync(S + '/' + d + '.jsonl', 'utf8').trim().split('\n').map(JSON.parse);
  const cur = {F:0, C:0, D:0}, nw = {F:0, C:0, D:0}, tr = {}, why = {};
  for (const r of rows) { const a = map(r.oc), b = bodyUseTier(r); cur[a]++; nw[b.t]++; tr[a + '>' + b.t] = (tr[a + '>' + b.t] || 0) + 1; why[b.why] = (why[b.why] || 0) + 1; }
  console.log(d.padEnd(30), 'cur', JSON.stringify(cur), 'tier', JSON.stringify(nw), JSON.stringify(tr));
  if (d === 'exam') console.log('  rules', JSON.stringify(why));
 }
}
