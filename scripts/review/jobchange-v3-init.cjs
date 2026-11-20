// 跳槽去留改用考试同款作者源（2026-11-19，见 docs/review/JOBCHANGE_REJUDGE_20261119.md）。旧稿移到 legacy-v1/ 留档。
// 结论取 jobchange-verdicts.cjs；判断依据、计算说明以考试同盘为底（结论句待重写）；应期沿用旧跳槽稿（只用扶助、受制、耗费、比和四类事件，
// 旧稿一篇两个事件的留一个：留取受制或耗费，先准备、可走取扶助）；正文暂放旧跳槽稿，交逐卦重写。只建一次。
const fs = require('fs'), crypto = require('crypto');
const {jobChangeVerdicts} = require('./jobchange-verdicts.cjs');
const dir = 'sources/editorial/job-change/', legacy = dir + 'legacy-v1/';
if (fs.existsSync(legacy)) throw new Error('已建过');
fs.mkdirSync(legacy); fs.mkdirSync(dir + 'polish-v5', {recursive:true}); fs.mkdirSync(dir + 'review-v2', {recursive:true});
for (const f of fs.readdirSync(dir).filter(f => /^hex-\d{3}\.json$/.test(f))) fs.renameSync(dir + f, legacy + f);
const V = jobChangeVerdicts();
const F = ['title','short','opening','process','ending','summary'];
const LABEL = {stay:'留', prepare:'先准备', switch:'可走'};
const sha = o => crypto.createHash('sha256').update(JSON.stringify(o)).digest('hex');
let trimmed = 0;
for (let h = 1; h <= 64; h++) {
  const id = String(h).padStart(3, '0');
  const ex = JSON.parse(fs.readFileSync(`sources/editorial/exam/hex-${id}.json`, 'utf8'));
  const exPol = JSON.parse(fs.readFileSync(`sources/editorial/exam/polish-v5/hex-${id}.json`, 'utf8'));
  const exRev = JSON.parse(fs.readFileSync(`sources/editorial/exam/review-v2/hex-${id}.json`, 'utf8'));
  const oldSrc = JSON.parse(fs.readFileSync(legacy + `hex-${id}.json`, 'utf8'));
  const drafts = [], pol = [], rev = [];
  ex.forEach((d, i) => {
    const v = V.find(x => x.hex === h && x.line === d[0] && x.month === d[1]), o = oldSrc[i];
    if (o[0] !== d[0] || o[1] !== d[1]) throw new Error('order ' + id + '#' + i);
    const old = Object.fromEntries(F.map((f, k) => [f, o[3 + k]]));
    let timing = JSON.parse(JSON.stringify(o[10]));
    if (Array.isArray(timing) && timing.length > 1) {
      const want = v.v === 'stay' ? ['control', 'drain'] : ['support'];
      timing = [timing.find(s => want.includes(s[0])) ?? timing[0]]; trimmed++;
    }
    drafts.push([d[0], d[1], v.v, ...F.map(f => old[f]), d[9], timing]);
    const key = `career.job-change.decision/${h}/${d[0]}/${d[1]}`;
    pol.push({key, outcome:v.v, original:old, polished:{...old}, hashBefore:sha(old), hashAfter:sha(old), changedFields:[],
      reasons:`跳槽去留按定稿口径补判（2026-11-19）：${v.why}。旧结论 ${o[2]}。正文、判断依据结论句、计算说明待逐卦重写。`, checks:{},
      calculationNotes:[...(exPol[i].calculationNotes ?? [])], status:'POLISH_COMPLETED', editor:'claude-opus-5-5', date:'2026-11-19', textFinal:true,
      oldOutcome:o[2], jobChangeRule:LABEL[v.v] + '：' + v.why, oldBasis:o[9]});
    const er = JSON.parse(JSON.stringify(exRev[i]));
    rev.push({...er, key, oldOutcome:o[2], newOutcome:v.v, changed:o[2] !== v.v,
      final:{...(er.final ?? {}), to:v.v, jobChangeRule:LABEL[v.v] + '：' + v.why},
      derivedFrom:'exam review-v2（同盘同爻）+ 求谋占取舍、占卦诀时机与跳槽专属爻辞，见 docs/review/JOBCHANGE_REJUDGE_20261119.md；lineReading 仍是考试读法，待按跳槽改', reviewer:'claude-opus-5-5', date:'2026-11-19'});
  });
  fs.writeFileSync(dir + `hex-${id}.json`, JSON.stringify(drafts, null, 2) + '\n');
  fs.writeFileSync(dir + `polish-v5/hex-${id}.json`, JSON.stringify(pol, null, 1) + '\n');
  fs.writeFileSync(dir + `review-v2/hex-${id}.json`, JSON.stringify(rev, null, 1) + '\n');
}
console.log('done; two-event rows trimmed', trimmed);
