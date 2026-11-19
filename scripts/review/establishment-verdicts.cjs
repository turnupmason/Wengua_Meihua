// 确定关系（relationships.developing.relationship，能否类：成 favourable／不成 difficult）结论草案。只诊断，不写稿。
// 体为问事人，用为这段关系（《婚姻占》mh-067，531 行）：
//   「用生体，婚易成，或因婚有得；体生用，婚难成，或因婚有失。体克用，可成但成之迟；用克体，不可成，成亦有害。体用比和，婚姻吉利。」
//   与《求名占》《求谋占》同构，所以用定稿口径：tierFinal（READING_POLICY_V2 第二、八、十、十一、十四节；婚恋问项开姤「勿用取女」卦象）
//   → 有条件按结局拆（第十三节表）→ 爻辞只翻一次（第十三节第 3 步）。
// 「占婚，体为所占之家，用为所婚之家……生体，则得婚姻之财；或彼有相就之意；体生，则无嫁奁之资，或此去求婚方谐。若体用比和，则彼此相就，良配无疑。」
//   这一段写的是相就的方向（对方来就、要我方去求），写进正文，不另定档。
const fs = require('fs');
const {tierFinal} = require('./policy-final.cjs');
const {split} = require('./binary.cjs');
const {adjust} = require('./indirect-test.cjs');
const P4 = ['use', 'body_mutual', 'use_mutual', 'changed_use'];
const strong = q => q === '旺' || q === '相';
// 降档之辞：象意直接落在两人能否走到一起上（婚媾、取女、相见、相随、夫妻反目、所求落空），及征凶、往吝之辞（征、往即主动推进这段关系）。
const LINE_DOWN = {
  '3-3':'屯六三「即鹿无虞……往吝」', '4-1':'蒙初六「以往吝」', '9-6':'小畜上九「君子征凶」', '18-4':'蛊六四「往见吝」', '25-6':'无妄上九「行有眚，无攸利」', '27-2':'颐六二「征凶」', '28-6':'大过上六「过涉灭顶，凶」', '33-1':'遯初六「勿用有攸往」', '34-1':'大壮初九「壮于趾，征凶」', '41-2':'损九二「征凶」', '47-2':'困九二「征凶」', '49-3':'革九三「征凶，贞厉」', '49-6':'革上六「征凶，居贞吉」', '51-6':'震上六「征凶」',
  '1-1':'乾初九「潜龙勿用」：时未至，不被用', '3-2':'屯六二「匪寇婚媾，女子贞不字，十年乃字」：当下不字', '3-6':'屯上六「乘马班如，泣血涟如」：求婚媾而进退不前（定稿第二步例）',
  '4-3':'蒙六三「勿用取女，见金夫，不有躬，无攸利」', '8-3':'比六三「比之匪人」，小象「不亦伤乎」', '8-6':'比上六「比之无首，凶」，小象「无所终也」',
  '9-3':'小畜九三「舆说辐，夫妻反目」', '13-6':'同人上九「同人于郊」，小象「志未得也」，王注「不获同志」：所求相合未得', '12-3':'否六三「包羞」，小象「位不当也」，与否「天地不交」同向（定稿第二步卦象例）',
  '23-4':'剥六四「剥床以肤，凶」，小象「切近灾也」', '24-6':'复上六「迷复，凶，有灾眚」', '27-3':'颐六三「十年勿用，无攸利」',
  '31-2':'咸六二「咸其腓，凶；居吉」', '31-3':'咸九三「咸其股，执其随，往吝」', '32-3':'恒九三「不恒其德，或承之羞」',
  '42-6':'益上九「莫益之，或击之……凶」', '43-1':'夬初九「往不胜为咎」', '43-6':'夬上六「无号，终有凶」', '44-1':'姤初六「有攸往，见凶」',
  '44-4':'姤九四「包无鱼，起凶」', '47-3':'困六三「入于其宫，不见其妻，凶」', '48-1':'井初六「井泥不食」，小象「时舍也」',
  '53-3':'渐九三「夫征不复，妇孕不育，凶」', '54-6':'归妹上六「女承筐，无实……无攸利」', '55-6':'丰上六「阒其无人，三岁不觌，凶」：问的正是能否相见（定稿第二步例）',
};
// 升档之辞：婚媾、归妹、往吉之辞正对所问，及无条件的元吉、大吉、无不利。
const LINE_UP = {
  '11-1':'泰初九「征吉」', '17-1':'随初九「出门交，有功」', '25-1':'无妄初九「往吉」', '38-5':'睽六五「往何咎」，小象「往有庆也」', '47-6':'困上六「征吉」', '49-2':'革六二「征吉」', '55-1':'丰初九「往有尚」', '60-5':'节九五「甘节，吉，往有尚」',
  '2-2':'坤六二「不习无不利」', '4-2':'蒙九二「包蒙，吉；纳妇，吉」：纳配之吉正对所问', '2-5':'坤六五「黄裳，元吉」', '3-4':'屯六四「求婚媾，往吉，无不利」（定稿第二步例）', '6-5':'讼九五「元吉」',
  '10-6':'履上九「其旋元吉」', '11-5':'泰六五「帝乙归妹，以祉元吉」', '14-6':'大有上九「吉无不利」', '15-4':'谦六四「无不利」', '15-5':'谦六五「无不利」',
  '19-2':'临九二「吉，无不利」', '23-5':'剥六五「无不利」', '24-1':'复初九「元吉」', '26-4':'大畜六四「元吉」', '28-2':'大过九二「老夫得其女妻，无不利」',
  '30-2':'离六二「黄离，元吉」', '33-6':'遯上九「肥遯无不利」', '35-5':'晋六五「往吉，无不利」', '36-2':'明夷六二「用拯马壮，吉」', '37-4':'家人六四「富家，大吉」',
  '38-6':'睽上九「匪寇，婚媾；往遇雨则吉」', '40-6':'解上六「获之，无不利」', '41-5':'损六五「元吉」', '42-1':'益初九「元吉」', '42-2':'益六二「永贞吉；王用享于帝，吉」',
  '42-5':'益九五「勿问元吉」', '45-4':'萃九四「大吉」', '46-1':'升初六「允升，大吉」', '48-6':'井上六「元吉」', '50-6':'鼎上九「大吉，无不利」',
  '53-5':'渐九五「终莫之胜，吉」，小象「得所愿也」', '54-1':'归妹初九「征吉」', '54-5':'归妹六五「帝乙归妹……月几望，吉」', '57-5':'巽九五「无不利」',
  '59-1':'涣初六「用拯马壮吉」', '59-4':'涣六四「元吉」',
};
const ORDERS = ['spring-wood', 'summer-fire', 'autumn-metal', 'winter-water', 'seasonal-earth'];
function lineFlip(t, done, fx, key) {
  const a = adjust(fx), q = k => a.n[k].slice(-1), bq = fx.n.body.slice(-1);
  const G = P4.filter(k => fx.rel[k] === 'use_generates_body'), K = P4.filter(k => fx.rel[k] === 'use_controls_body');
  if (LINE_DOWN[key] && done === 'F') {
    const hit = K.includes('changed_use') ? '克体在变用' : (bq === '死' && K.some(k => strong(q(k)))) ? '体死而克体之卦有力' : !K.length ? '盘中无克体之卦，凶辞直接主断' : null;
    return hit ? {done:'D', note:'爻辞翻为不成（' + hit + '）：' + LINE_DOWN[key]} : {done, note:'爻辞作要过的坎：' + LINE_DOWN[key]};
  }
  if (LINE_UP[key] && done === 'D') {
    const end = fx.rel.changed_use;
    const ok = G.some(k => strong(q(k))) && bq !== '囚' && bq !== '死' && !/^R3/.test(t.why) && (t.t !== 'D' || fx.rel.use !== 'use_controls_body')
      && (end !== 'use_controls_body' || (!strong(q('changed_use')) && strong(bq)) || q('changed_use') === '死');
    if (ok) return {done:'F', note:'爻辞翻为成：' + LINE_UP[key]};
  }
  return {done, note:''};
}
function establishmentOf(fx, hexId, changedId, line) {
  const key = hexId + '-' + line;
  const t = tierFinal(fx, hexId, changedId, true);
  const d0 = split(t, fx, 'end');
  const s = lineFlip(t, d0, fx, key);
  const why = t.why + (t.t === 'C' ? ' → 有条件按结局拆为' + (d0 === 'F' ? '成' : '不成') : '') + (s.note ? ' → ' + s.note : '');
  return {v:s.done === 'F' ? 'favourable' : 'difficult', tier:t.t, split:d0, final:s.done, why};
}
function establishmentVerdicts() {
  const out = [];
  for (let h = 1; h <= 64; h++) {
    const id = String(h).padStart(3, '0');
    const j = JSON.parse(fs.readFileSync(`data/authored-readings/exam/hex-${id}.json`, 'utf8'));
    for (let line = 1; line <= 6; line++) for (const month of ORDERS) {
      const r = j.rows.find(x => x.movingLine === line && x.monthOrder === month);
      const fx = {n:Object.fromEntries(r.facts.nodes.map(x => [x.role, x.trigram + x.element + x.qi])), rel:Object.fromEntries(r.facts.directRelations.map(x => [x.role, x.type])), text:''};
      out.push({hex:h, line, month, ...establishmentOf(fx, h, r.stageIds.at(-1), line)});
    }
  }
  return out;
}
module.exports = {establishmentVerdicts, establishmentOf, LINE_DOWN, LINE_UP};
if (require.main === module) {
  const v = establishmentVerdicts(); const c = {}; for (const x of v) c[x.v] = (c[x.v] || 0) + 1; console.log(c);
  const tr = {}; let diff = 0;
  for (let h = 1; h <= 64; h++) { const d = JSON.parse(fs.readFileSync(`sources/editorial/relationship-establishment/hex-${String(h).padStart(3, '0')}.json`, 'utf8'));
    for (const r of d) { const x = v.find(y => y.hex === h && y.line === r[0] && y.month === r[1]); const k = r[2] + '→' + x.v; tr[k] = (tr[k] || 0) + 1; if (r[2] !== x.v) diff++; } }
  console.log('diff', diff, tr);
  const st = {}; for (const x of v) if (x.final !== x.split) { const k = x.split + '>' + x.final; st[k] = (st[k] || 0) + 1; } console.log('line flips', st);
  // 与考试同盘比较
  let ex = 0; for (let h = 1; h <= 64; h++) { const d = JSON.parse(fs.readFileSync(`sources/editorial/exam/hex-${String(h).padStart(3, '0')}.json`, 'utf8')); for (const r of d) { const x = v.find(y => y.hex === h && y.line === r[0] && y.month === r[1]); if (r[2] !== x.v) ex++; } }
  console.log('differs from exam', ex);
}
