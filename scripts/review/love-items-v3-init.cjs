// 复合、新桃花改用确定关系同款作者源（2026-11-21，口径见 docs/review/LOVE_RECON_NEWPARTNER_POLICY_DRAFT_20261121.md）。旧稿移到 legacy-v1/ 留档。
// 结论取 love-items-verdicts.cjs；专业说明（第 9 栏）以确定关系同盘第 9 栏为底稿（已经体衰、篇名、间接作用订正），由作者按本问项改写后再写月稿；
// 应期沿用本问项旧稿（种类、位置、方法不改，至多一个事件）；正文（第 3–8 栏）暂放旧稿，月稿写定后回写。每个问项只建一次。
// 用法：node scripts/review/love-items-v3-init.cjs <relationship-reconciliation|new-relationship-opportunity>
const fs = require('fs'), crypto = require('crypto');
const {verdicts} = require('./love-items-verdicts.cjs');
const item = process.argv[2];
const QID = {'relationship-reconciliation':'relationships.reconciliation.reconcile', 'new-relationship-opportunity':'relationships.new-partner.opportunity'}[item];
if (!QID) throw new Error('item?');
const dir = `sources/editorial/${item}/`, legacy = dir + 'legacy-v1/', est = 'sources/editorial/relationship-establishment/';
if (fs.existsSync(legacy)) throw new Error('已建过');
fs.mkdirSync(legacy); fs.mkdirSync(dir + 'polish-v5', {recursive:true}); fs.mkdirSync(dir + 'review-v2', {recursive:true});
for (const f of fs.readdirSync(dir).filter(f => /^hex-\d{3}\.json$/.test(f))) fs.renameSync(dir + f, legacy + f);
const V = verdicts(item);
const F = ['title', 'short', 'opening', 'process', 'ending', 'summary'];
const LABEL = {favourable:'能成', difficult:'不成'};
const sha = o => crypto.createHash('sha256').update(JSON.stringify(o)).digest('hex');
const stat = {rows:0, changedFromOld:0, differsFromEstablishment:0};
for (let h = 1; h <= 64; h++) {
 const id = String(h).padStart(3, '0');
 const es = JSON.parse(fs.readFileSync(est + `hex-${id}.json`, 'utf8'));
 const esRev = JSON.parse(fs.readFileSync(est + `review-v2/hex-${id}.json`, 'utf8'));
 const esPol = JSON.parse(fs.readFileSync(est + `polish-v5/hex-${id}.json`, 'utf8'));
 const old = JSON.parse(fs.readFileSync(legacy + `hex-${id}.json`, 'utf8'));
 const rows = [], pol = [], rev = [];
 es.forEach((e, i) => {
  const o = old[i], v = V.find(x => x.hex === h && x.line === e[0] && x.month === e[1]);
  if (o[0] !== e[0] || o[1] !== e[1]) throw new Error('order ' + id + '#' + i);
  if (Array.isArray(o[10]) && o[10].length > 1) throw new Error('two events ' + id + '#' + i);
  stat.rows++; if (v.v !== o[2]) stat.changedFromOld++; if (v.v !== e[2]) stat.differsFromEstablishment++;
  const oldCopy = Object.fromEntries(F.map((f, k) => [f, o[3 + k]]));
  rows.push([e[0], e[1], v.v, ...F.map(f => oldCopy[f]), e[9], JSON.parse(JSON.stringify(o[10]))]);
  const key = `${QID}/${h}/${e[0]}/${e[1]}`;
  pol.push({key, outcome:v.v, original:oldCopy, polished:{...oldCopy}, hashBefore:sha(oldCopy), hashAfter:sha(oldCopy), changedFields:[],
   reasons:`按确定关系同款口径补判（2026-11-21）：${v.why}。旧结论 ${o[2]}。专业说明以确定关系同盘第 9 栏为底稿，待按本问项改写；正文待逐月长稿写定后回写。`, checks:{},
   calculationNotes:[...(esPol[i].calculationNotes ?? [])], status:'POLISH_COMPLETED', editor:'claude-opus-5-5', date:'2026-11-21', textFinal:false,
   oldOutcome:o[2], itemRule:LABEL[v.v] + '：' + v.why, oldBasis:o[9], judgmentBase:'relationship-establishment col9 (same board)'});
  const er = JSON.parse(JSON.stringify(esRev[i]));
  rev.push({...er, key, oldOutcome:o[2], newOutcome:v.v, changed:o[2] !== v.v, final:{...(er.final ?? {}), to:v.v, itemRule:LABEL[v.v] + '：' + v.why},
   derivedFrom:'relationship-establishment review-v2（同盘同爻）+ 本问项专属爻辞，见 docs/review/LOVE_RECON_NEWPARTNER_POLICY_DRAFT_20261121.md；lineReading 仍是确定关系读法，待按本问项改', reviewer:'claude-opus-5-5', date:'2026-11-21'});
 });
 fs.writeFileSync(dir + `hex-${id}.json`, JSON.stringify(rows, null, 2) + '\n');
 fs.writeFileSync(dir + `polish-v5/hex-${id}.json`, JSON.stringify(pol, null, 1) + '\n');
 fs.writeFileSync(dir + `review-v2/hex-${id}.json`, JSON.stringify(rev, null, 1) + '\n');
}
console.log(item, JSON.stringify(stat));
