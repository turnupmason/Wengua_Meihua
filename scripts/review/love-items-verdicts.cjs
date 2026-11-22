// 复合（relationships.reconciliation.reconcile）、新桃花（relationships.new-partner.opportunity）结论规则（2026-11-21，用户定「按建议定」）。
// 能否类，只判成 favourable／不成 difficult。体为问事人，用为复合这件事／新感情的机会。
// 主章《婚姻占》（531 行），复合旁证《行人占》（567 行「用生体，行人即归」「体生用，行人未归」），
// 新桃花旁证《谒见占》（571 行「用克体，不见」「体用比和，欢然相见」）；三章与《婚姻占》同构，所以沿用确定关系的定稿口径
// （establishment-verdicts.cjs：tierFinal → 有条件按结局拆 → 专属爻辞只翻一次），只按问项换爻辞表。
// 爻辞表以确定关系表为底：象意对不上本问的删去，本问的题眼爻补入（复合看「复、归、得」，新桃花看「遇、见」）。说明见
// docs/review/LOVE_RECON_NEWPARTNER_POLICY_DRAFT_20261121.md 第四节。
const fs = require('fs');
const {establishmentOf, LINE_DOWN, LINE_UP} = require('./establishment-verdicts.cjs');
const ORDERS = ['spring-wood', 'summer-fire', 'autumn-metal', 'winter-water', 'seasonal-earth'];
const pick = (base, drop, add) => Object.fromEntries([...Object.entries(base).filter(([k]) => !drop[k]), ...Object.entries(add)]);
const ITEMS = {
 'relationship-reconciliation': {
  dropDown: {},
  addDown: {
   '61-1':'中孚初九「虞吉，有它不燕」：有它即另有所系，问的正是两人能否重回一处（用户 2026-11-21 定，RL06 回测）',
   '28-4':'大过九四「栋隆，吉；有它，吝」：王注「应在初，用心不弘」，有它即另有所系，与中孚初九同义（用户 2026-11-21 定补入）',
  },
  dropUp: {
   '33-6':'遯上九「肥遯无不利」：利在远去，落在退而不回，与复合相反',
   '17-1':'随初九「出门交，有功」：功在出门与外人交，不落在旧人回头',
  },
  addUp: {
   '9-1':'小畜初九「复自道，何其咎？吉」：从原路回来',
   '9-2':'小畜九二「牵复，吉」：相牵而回',
   '24-2':'复六二「休复，吉」：美善之复',
   '38-1':'睽初九「丧马，勿逐自复」：失去的不必追，自会回来',
   '51-2':'震六二「亿丧贝……勿逐，七日得」：失而复得',
   '63-2':'既济六二「妇丧其茀，勿逐，七日得」：失而复得',
  },
 },
 'new-relationship-opportunity': {
  dropDown: {},
  addDown: {
   '62-6':'小过上六「弗遇过之，飞鸟离之，凶」：弗遇，正落在遇不到上',
  },
  dropUp: {
   '33-6':'遯上九「肥遯无不利」：利在远离，不落在遇人',
  },
  addUp: {
   '1-2':'乾九二「见龙在田，利见大人」：利见',
   '1-5':'乾九五「飞龙在天，利见大人」：利见',
   '13-5':'同人九五「先号咷而后笑，大师克相遇」：相遇',
   '38-2':'睽九二「遇主于巷，无咎」：不期而遇',
   '55-4':'丰九四「遇其夷主，吉」：遇',
  },
 },
};
const tablesOf = item => { const c = ITEMS[item]; return {down:pick(LINE_DOWN, c.dropDown, c.addDown), up:pick(LINE_UP, c.dropUp, c.addUp)}; };
function verdictOf(item, fx, hexId, changedId, line) { return establishmentOf(fx, hexId, changedId, line, tablesOf(item)); }
function verdicts(item) {
 const out = [];
 for (let h = 1; h <= 64; h++) {
  const j = JSON.parse(fs.readFileSync(`data/authored-readings/exam/hex-${String(h).padStart(3, '0')}.json`, 'utf8'));
  for (let line = 1; line <= 6; line++) for (const month of ORDERS) {
   const r = j.rows.find(x => x.movingLine === line && x.monthOrder === month);
   const fx = {n:Object.fromEntries(r.facts.nodes.map(x => [x.role, x.trigram + x.element + x.qi])), rel:Object.fromEntries(r.facts.directRelations.map(x => [x.role, x.type])), text:''};
   out.push({hex:h, line, month, ...verdictOf(item, fx, h, r.stageIds.at(-1), line)});
  }
 }
 return out;
}
module.exports = {ITEMS, tablesOf, verdictOf, verdicts};
if (require.main === module) {
 for (const item of Object.keys(ITEMS)) { const v = verdicts(item), c = {}; for (const x of v) c[x.v] = (c[x.v] || 0) + 1; const t = tablesOf(item); console.log(item, JSON.stringify(c), 'down', Object.keys(t.down).length, 'up', Object.keys(t.up).length); }
}
