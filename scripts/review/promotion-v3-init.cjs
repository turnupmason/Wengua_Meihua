// 晋升加薪改用考试同款作者源（2026-11-18，见 docs/review/PROMOTION_REJUDGE_20261118.md）。旧稿与 timing.json 移到 legacy-v1/ 留档。
// 结论取 promotion-verdicts.cjs；判断依据、应期、计算说明以考试同盘为底；正文暂放旧晋升稿，交逐卦重写。只建一次。
const fs = require('fs'), crypto = require('crypto');
const {promotionVerdicts} = require('./promotion-verdicts.cjs');
const dir = 'sources/editorial/promotion-pay/', legacy = dir + 'legacy-v1/';
if (fs.existsSync(legacy)) throw new Error('已建过');
fs.mkdirSync(legacy); fs.mkdirSync(dir + 'polish-v5'); fs.mkdirSync(dir + 'review-v2');
for (const f of fs.readdirSync(dir).filter(f => /^hex-\d{3}\.json$|^timing\.json$/.test(f))) fs.renameSync(dir + f, legacy + f);
const V = promotionVerdicts();
const F = ['title','short','opening','process','ending','summary'];
const sha = o => crypto.createHash('sha256').update(JSON.stringify(o)).digest('hex');
for (let h = 1; h <= 64; h++) {
  const id = String(h).padStart(3, '0');
  const ex = JSON.parse(fs.readFileSync(`sources/editorial/exam/hex-${id}.json`, 'utf8'));
  const exPol = JSON.parse(fs.readFileSync(`sources/editorial/exam/polish-v5/hex-${id}.json`, 'utf8'));
  const exRev = JSON.parse(fs.readFileSync(`sources/editorial/exam/review-v2/hex-${id}.json`, 'utf8'));
  const oldSrc = JSON.parse(fs.readFileSync(legacy + `hex-${id}.json`, 'utf8'));
  const drafts = [], pol = [], rev = [];
  ex.forEach((d, i) => {
    const v = V.find(x => x.hex === h && x.index === i), o = oldSrc[i];
    if (o[0] !== d[0] || o[1] !== d[1]) throw new Error('order ' + id + '#' + i);
    const old = Object.fromEntries(F.map((f, k) => [f, o[3 + k]]));
    const pay = v.promotion === 'favourable' ? (o[2] === 'favourable' && o[10] ? o[10] : '') : '';
    const timing = JSON.parse(JSON.stringify(d[10]));
    const timingNeedsRework = v.promotion !== d[2] && Array.isArray(timing) && timing.some(t => /^name-/.test(t[0]));
    drafts.push([d[0], d[1], v.promotion, ...F.map(f => old[f]), d[9], timing, pay]);
    const key = `career.promotion-pay.promotion/${h}/${d[0]}/${d[1]}`;
    pol.push({key, outcome:v.promotion, original:old, polished:{...old}, hashBefore:sha(old), hashAfter:sha(old), changedFields:[],
      reasons:`晋升按考试定稿口径加在任专条补判（2026-11-18）：${v.why}。旧结论 ${o[2]}。正文待逐卦重写。`, checks:{},
      calculationNotes:[...(exPol[i].calculationNotes ?? [])], status:'POLISH_COMPLETED', editor:'claude-opus-5-5', date:'2026-11-18', textFinal:true,
      oldOutcome:o[2], promotionRule:v.why, ...(timingNeedsRework ? {timingNeedsRework:true} : {}), ...(v.promotion === 'favourable' && !pay ? {payNeedsWriting:true} : {})});
    const er = JSON.parse(JSON.stringify(exRev[i]));
    const swap = s => typeof s === 'string' ? s.replace(/考试/gu, '晋升') : s;
    rev.push({...er, key, oldOutcome:o[2], newOutcome:v.promotion, changed:o[2] !== v.promotion, lineReading:swap(er.lineReading), reason:swap(er.reason),
      final:{...(er.final ?? {}), to:v.promotion, note:swap(er.final?.note), promotionRule:v.why},
      derivedFrom:'exam review-v2（同盘同爻）+ 晋升在任专条与晋升专属爻辞，见 docs/review/PROMOTION_REJUDGE_20261118.md', reviewer:'claude-opus-5-5', date:'2026-11-18'});
  });
  fs.writeFileSync(dir + `hex-${id}.json`, JSON.stringify(drafts, null, 2) + '\n');
  fs.writeFileSync(dir + `polish-v5/hex-${id}.json`, JSON.stringify(pol, null, 1) + '\n');
  fs.writeFileSync(dir + `review-v2/hex-${id}.json`, JSON.stringify(rev, null, 1) + '\n');
}
console.log('done');
