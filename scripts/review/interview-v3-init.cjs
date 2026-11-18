// 面试求职改用考试同款作者源（2026-11-18，见 docs/review/INTERVIEW_REJUDGE_20261118.md）：
// 以考试定稿的同盘结论、判断依据、应期种类与计算说明为底，正文暂放现有面试稿，交逐卦重写。只建一次。
const fs = require('fs'), crypto = require('crypto');
const ORD = ['spring-wood','summer-fire','autumn-metal','winter-water','seasonal-earth'];
const out = 'sources/editorial/interview-pass/';
if (fs.existsSync(out + 'hex-001.json')) throw new Error('已建过，不重复覆盖');
fs.mkdirSync(out + 'polish-v5', {recursive:true}); fs.mkdirSync(out + 'review-v2', {recursive:true});
const F = ['title','short','opening','process','ending','summary'];
const sha = o => crypto.createHash('sha256').update(JSON.stringify(o)).digest('hex');
for (let h = 1; h <= 64; h++) {
  const id = String(h).padStart(3, '0');
  const ex = JSON.parse(fs.readFileSync(`sources/editorial/exam/hex-${id}.json`, 'utf8'));
  const exPolRaw = JSON.parse(fs.readFileSync(`sources/editorial/exam/polish-v5/hex-${id}.json`, 'utf8'));
  const exPol = Array.isArray(exPolRaw) ? exPolRaw : exPolRaw.records;
  const exRevRaw = JSON.parse(fs.readFileSync(`sources/editorial/exam/review-v2/hex-${id}.json`, 'utf8'));
  const exRev = Array.isArray(exRevRaw) ? exRevRaw : exRevRaw.records;
  const built = JSON.parse(fs.readFileSync(`data/authored-readings/interview-pass/hex-${id}.json`, 'utf8'));
  const drafts = [], pol = [], rev = [];
  ex.forEach((d, i) => {
    const [line, month] = d; if (line !== Math.floor(i / 5) + 1 || month !== ORD[i % 5]) throw new Error('order ' + id + ' ' + i);
    const r = built.rows.find(x => x.movingLine === line && x.monthOrder === month && x.voidProfileKey === 'base-no-void' && x.baseProse !== false)
      ?? built.rows.find(x => x.movingLine === line && x.monthOrder === month && x.baseProse !== false);
    if (!r) throw new Error('missing interview row ' + id + ' ' + line + ' ' + month);
    const old = {title:r.copy.title, short:r.copy.short.text, opening:r.copy.long.opening, process:r.copy.long.process, ending:r.copy.long.ending, summary:r.copy.long.summary};
    drafts.push([line, month, d[2], ...F.map(f => old[f]), d[9], JSON.parse(JSON.stringify(d[10]))]);
    const key = `career.interview.interview-pass/${h}/${line}/${month}`;
    pol.push({key, outcome:d[2], original:old, polished:{...old}, hashBefore:sha(old), hashAfter:sha(old), changedFields:[],
      reasons:'面试按考试定稿口径补判（2026-11-18）：结论取考试同盘定稿，正文待逐卦重写。旧结论码 ' + r.decision.outcomeCode + '。',
      checks:{}, calculationNotes:[...(exPol[i].calculationNotes ?? [])], status:'POLISH_COMPLETED', editor:'claude-opus-5-5', date:'2026-11-18', textFinal:true,
      oldOutcomeCode:r.decision.outcomeCode});
    const er = JSON.parse(JSON.stringify(exRev[i]));
    const swap = s => typeof s === 'string' ? s.replace(/考试/gu, '面试') : s;
    rev.push({...er, key, oldOutcome:r.decision.outcomeCode, newOutcome:d[2], changed:r.decision.outcomeCode !== d[2],
      lineReading:swap(er.lineReading), reason:swap(er.reason), final:er.final ? {...er.final, note:swap(er.final.note)} : er.final,
      derivedFrom:'exam review-v2（同盘同爻），面试逐爻重核见 docs/review/INTERVIEW_REJUDGE_20261118.md', reviewer:'claude-opus-5-5', date:'2026-11-18'});
  });
  fs.writeFileSync(out + `hex-${id}.json`, JSON.stringify(drafts, null, 2) + '\n');
  fs.writeFileSync(out + `polish-v5/hex-${id}.json`, JSON.stringify(pol, null, 1) + '\n');
  fs.writeFileSync(out + `review-v2/hex-${id}.json`, JSON.stringify(rev, null, 1) + '\n');
}
console.log('done');
