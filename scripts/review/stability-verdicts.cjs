// 职场情况（career.job-stability.layoff，状况类：稳 stable / 有隐患 watch / 风险大 strained）结论草案。只诊断，不写稿。
// 三档初判取定稿口径 tierFinal（docs/READING_POLICY_V2.md 第二、八、十、十一节），再按《求名占》在任条分轻重：
//   「若在任占卜，最忌见克体之卦，如卦有克体者，即居官见祸，轻则上司责罚，重则削官退居」（553 行）；
//   《占卦诀》「占不吉之事，卦中有生体之卦，则有救无害；如无生体之卦，事必不吉矣」（793 行）。
const fs = require('fs');
const {tierFinal} = require('./policy-final.cjs');
const {adjust} = require('./indirect-test.cjs');
const strong = q => q === '旺' || q === '相';
const P4 = ['use', 'body_mutual', 'use_mutual', 'changed_use'];
// 职场专属爻辞降档（docs/review/STABILITY_REJUDGE_20261119.md 第二节）：象意直接落在现职能否保住上。只降一档：
// 稳→有隐患一律降；有隐患→风险大只在克体在变用，或体死而克体之卦有力时（READING_POLICY_V2 第二步）。
const LINE_DOWN = {
  '1-1':'乾初九「潜龙勿用」：不被起用', '6-6':'讼上九「终朝三褫之」：所得一日三夺', '11-6':'泰上六「城复于隍」，小象「其命乱也」',
  '23-1':'剥初六「剥床以足，蔑，贞凶」，小象「以灭下也」', '23-2':'剥六二「剥床以辨，蔑，贞凶」', '23-4':'剥六四「剥床以肤，凶」，小象「切近灾也」',
  '24-6':'复上六「迷复，凶，有灾眚」', '25-3':'无妄六三「无妄之灾」', '27-3':'颐六三「十年勿用，无攸利」',
  '28-6':'大过上六「过涉灭顶，凶」', '30-3':'离九三「日昃之离……凶」，小象「何可久也」', '32-3':'恒九三「不恒其德，或承之羞，贞吝」，小象「无所容也」',
  '36-1':'明夷初九「君子于行，三日不食……主人有言」', '42-6':'益上九「莫益之，或击之……凶」，小象「自外来也」',
  '43-6':'夬上六「无号，终有凶」，小象「终不可长也」', '48-1':'井初六「井泥不食，旧井无禽」，小象「时舍也」',
  '53-3':'渐九三「夫征不复……凶」，小象「离群丑也」', '54-6':'归妹上六「无攸利」，小象「承虚筐也」', '56-6':'旅上九「鸟焚其巢……凶」',
  '28-3':'大过九三「栋桡，凶」，程传「不胜其任」', '32-4':'恒九四「田无禽」，小象「久非其位，安得禽也」',
  '44-4':'姤九四「包无鱼，起凶」（原书老人有忧色占以为易辞不吉）', '45-3':'萃六三「萃如嗟如，无攸利；往无咎」：守原处无攸利，出路在往', '47-3':'困六三「入于其宫，不见其妻，凶」，小象「不祥也」', '48-2':'井九二「井谷射鲋，瓮敝漏」，小象「无与也」',
  '50-4':'鼎九四「鼎折足，覆公餗……凶」，小象「信如何也」', '55-3':'丰九三「折其右肱」，小象「终不可用也」',
  '61-6':'中孚上九「翰音登于天，贞凶」，小象「何可长也」', '62-6':'小过上六「飞鸟离之，凶，是谓灾眚」',
};
const ORDERS = ['spring-wood', 'summer-fire', 'autumn-metal', 'winter-water', 'seasonal-earth'];
function stabilityOf(fx, hexId, changedId, line) {
  const t = tierFinal(fx, hexId, changedId, false);
  const K = P4.filter(k => fx.rel[k] === 'use_controls_body');
  let v = t.t === 'F' ? 'stable' : t.t === 'C' ? 'watch' : 'strained';
  let why = t.why;
  if (K.length && v === 'stable') { v = 'watch'; why += ' → 在任见克体（' + K.join('、') + '），轻则上司责罚'; }
  if (!K.length && v === 'strained') { v = 'watch'; why += ' → 无克体之卦，不至削官退居'; }
  // 《体用衰旺之诀》「此得令之卦，乘旺之气，虽有他卦克之，亦无大害」「但不要克体之卦气旺」（804 行）；定稿口径第一节第 4 条旺、相同为有力：体有力而克体之卦都无气，属在任条之「轻」。
  if (v === 'strained') { const a = adjust(fx); if (strong(fx.n.body.slice(-1)) && K.every(k => !strong(a.n[k].slice(-1)))) { v = 'watch'; why += ' → 体有力（旺相）而克体之卦皆无气，亦无大害，属轻'; } }
  const ld = LINE_DOWN[hexId + '-' + line];
  if (ld) {
    const a = adjust(fx), bq = fx.n.body.slice(-1);
    if (v === 'stable') { v = 'watch'; why += ' → 爻辞降档：' + ld; }
    else if (v === 'watch' && (K.includes('changed_use') || (bq === '死' && K.some(k => strong(a.n[k].slice(-1)))))) { v = 'strained'; why += ' → 爻辞降档：' + ld; }
  }
  return {v, tier:t.t, why, K};
}
function stabilityVerdicts() {
  const out = [];
  for (let h = 1; h <= 64; h++) {
    const id = String(h).padStart(3, '0');
    const j = JSON.parse(fs.readFileSync(`data/authored-readings/exam/hex-${id}.json`, 'utf8'));
    for (let line = 1; line <= 6; line++) for (const month of ORDERS) {
      const r = j.rows.find(x => x.movingLine === line && x.monthOrder === month);
      const fx = {n:Object.fromEntries(r.facts.nodes.map(x => [x.role, x.trigram + x.element + x.qi])), rel:Object.fromEntries(r.facts.directRelations.map(x => [x.role, x.type])), text:''};
      const changedId = r.stageIds.at(-1);
      out.push({hex:h, line, month, ...stabilityOf(fx, h, changedId, line)});
    }
  }
  return out;
}
module.exports = {stabilityVerdicts, stabilityOf, LINE_DOWN};
if (require.main === module) {
  const v = stabilityVerdicts(); const c = {}; for (const x of v) c[x.v] = (c[x.v] || 0) + 1; console.log(c);
  const old = {}; let diff = 0; const tr = {};
  for (let h = 1; h <= 64; h++) { const d = JSON.parse(fs.readFileSync(`sources/editorial/workplace-stability/hex-${String(h).padStart(3, '0')}.json`, 'utf8'));
    for (const r of d) { const x = v.find(y => y.hex === h && y.line === r[0] && y.month === r[1]); old[r[2]] = (old[r[2]] || 0) + 1; if (x.v !== r[2]) { diff++; const k = r[2] + '→' + x.v; tr[k] = (tr[k] || 0) + 1; } } }
  console.log('old', old, 'diff', diff, tr);
}
