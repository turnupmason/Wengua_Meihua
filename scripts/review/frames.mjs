// 逐篇通读检查（只读）：正文套路框架、第 10 栏与复核记录里的旧说法、脚本换过起头而未通读的篇、通读记录。
// 用法：node scripts/review/frames.mjs <问项目录> [卦序]   不给卦序则查全库并输出总表。
import {readFileSync} from 'node:fs';
const [item, hexArg] = process.argv.slice(2);
const pad = h => String(h).padStart(3, '0');
const han = s => String(s).replace(/[^\p{Script=Han}]/gu, '');
// 正文禁用的意思框架（去标点后匹配）
const FRAMES = ['本是吉辞', '这句本是', '吉只落在', '吉只到', '可这一盘', '分保得住', '过不费事', '要磨磨在', '只是得磨', '费工夫的地方在'];
// 第 10 栏旧说法
const OLD_COL10 = /档|R\d|有条件|存疑|待核|口径|原稿|改判|复核|盲断|属小事|是小事|体卦乘旺/u;
// 复核记录旧说法（R 代号在 final.rules 中允许）
const OLD_REVIEW = /档|有条件|存疑|待核|属小事|是小事|体卦乘旺/u;
// 应期文字（读者可见）
const T_OPEN = /^(若|如|近期|近来|近日|要是|假如|倘)/u;
const T_WORD = /评阅|讲评|答疑|老师|同学|请人|较有机会|可望|有望|或许|可能|较易|明朗/u;
const OMIT_WORD = /这一盘没有能单独定到某一天的事|生扶|克体|生体|日级|节点|依据不足|工夫腔/u;
const OLD_V21 = /档|R\d|有条件|留待核|待核|存疑/u;
// 篇章结构上限（第九节）
const VERDICT = /^(留在现职|现职更合适|先留|留下来|先准备|先筹备|可以换|可以辞|可以走|值得换|新工作更合适|稳得住|能稳住|工作稳|这份工作|有隐患|风险大|风险不小|能转正|这次能转正|能升|升不了|这次能升|晋升|这一轮|这轮面试|面试能过|能被录用|能过|稳过|过不了|考不过|过不去|够不上|合格不了|拿不下|考得过|能通过|过得了|过得去|能合格|拿得下|过关|能及格|考得上|稳稳过|合格|过线|这一卷|这张卷子|这一场)/u;
const RETAIN_A = /分|拿|丢|在手|算数|落袋/u, RETAIN_B = /稳|照|不会|丢不|拿得|实|足|都在|算数|一分|不少|落袋|跑不掉|在手/u;
// 第十节：过不了的篇，标题、简断、总断、无期说明不用生硬判词
const BLUNT = /一定被裁|必被裁|肯定被裁|被开除|失业|丢饭碗|转不了|转不成|不能转正|升不了|升不上|不能升|晋升不了|过不了|考不过|过不去|合格不了|拿不下|不能过|没法过|无法过|不会过|考不上|输在|栽在|败在|坏在|输了/u;
const allOpen = new Map();
for (let h = 1; h <= 64; h++) {
 for (const d of JSON.parse(readFileSync(`sources/editorial/${item}/hex-${pad(h)}.json`, 'utf8'))) {
  if (Array.isArray(d[10])) for (const w of d[10]) { const k = han(w[3]).slice(0, 4); allOpen.set(k, (allOpen.get(k) ?? 0) + 1); }
 }
}
const touchedPath = `docs/review/${item}-script-touched.json`;
const touched = (await import('node:fs')).existsSync(touchedPath) ? JSON.parse(readFileSync(touchedPath, 'utf8')) : [];
const hexes = hexArg ? [Number(hexArg)] : Array.from({length:64}, (_, i) => i + 1);
const report = [];
for (const h of hexes) {
 const src = JSON.parse(readFileSync(`sources/editorial/${item}/hex-${pad(h)}.json`, 'utf8'));
 const polRaw = JSON.parse(readFileSync(`sources/editorial/${item}/polish-v5/hex-${pad(h)}.json`, 'utf8'));
 const pol = Array.isArray(polRaw) ? polRaw : polRaw.records;
 const revRaw = JSON.parse(readFileSync(`sources/editorial/${item}/review-v2/hex-${pad(h)}.json`, 'utf8'));
 const rev = Array.isArray(revRaw) ? revRaw : revRaw.records;
 const frames = [], col10 = [], review = [], unread = [], scriptLeft = [], calc = [], timing = [], shape = [];
 {
  const sv = [], mv = [], rt = [], op = new Map(); let fails = 0;
  src.forEach((d, i) => {
   if (VERDICT.test(d[4])) sv.push(i);
   if (VERDICT.test(d[8])) mv.push(i);
   if (d[2] === 'difficult') { fails++; const ss = d[4].split(/(?<=[。！？])/u).filter(Boolean); const last = ss[ss.length - 1] ?? ''; if (RETAIN_A.test(last) && RETAIN_B.test(last)) rt.push(i); }
   const k = han(d[5]).slice(0, 2); if (!op.has(k)) op.set(k, []); op.get(k).push(i);
  });
  if (sv.length > 10) shape.push({shortVerdictLead:sv.length, cap:10, items:sv});
  if (mv.length > 12) shape.push({summaryVerdictLead:mv.length, cap:12, items:mv});
  const cap = Math.floor(fails / 3);
  if (rt.length > cap) shape.push({shortRetainTail:rt.length, cap, items:rt});
  for (const [k, v] of op) if (v.length > 5) shape.push({openingLead:k, n:v.length, cap:5, items:v});
 }
 const open3 = new Map();
 const lineNotes = new Map();
 src.forEach((d, i) => {
  const body = han(d.slice(3, 9).join(''));
  const hit = FRAMES.filter(f => body.includes(f));
  if (hit.length) frames.push({i, hit});
  const m10 = String(d[9]).match(OLD_COL10);
  if (m10) col10.push({i, word:m10[0]});
  if (d[2] === 'difficult' || d[2] === 'stay') {
   const parts = [['title', d[3]], ['short', d[4]], ['summary', d[8]]];
   if (typeof d[10] === 'string') parts.push(['omit', d[10]]);
   for (const [f, v] of parts) { const m = String(v).match(BLUNT); if (m) shape.push({i, blunt:m[0], field:f}); }
  }
  const t11 = d[10];
  if (typeof t11 === 'string') {
   const n = han(t11).length, m = t11.match(OMIT_WORD);
   if (m) timing.push({i, omitWord:m[0]});
   if (n < 30 || n > 60) timing.push({i, omitLen:n});
  } else if (Array.isArray(t11)) for (const w of t11) {
   const ev = String(w[2]), tx = String(w[3]);
   if (T_OPEN.test(tx)) timing.push({i, open:tx.slice(0, 6)});
   const m = (ev + '｜' + tx).match(T_WORD);
   if (m) timing.push({i, word:m[0]});
   const ne = han(ev).length, nt = han(tx).length;
   if (ne < 8 || ne > 22) timing.push({i, eventLen:ne});
   if (nt > 40) timing.push({i, textLen:nt});
   const k3 = han(tx).slice(0, 3);
   if (open3.has(k3)) timing.push({i, dupOpen3:k3, with:open3.get(k3)}); else open3.set(k3, i);
   const k4 = han(tx).slice(0, 4);
   if ((allOpen.get(k4) ?? 0) > 6) timing.push({i, libOpen4:k4, n:allOpen.get(k4)});
  }
  const r = rev[i];
  if (r?.v21) { const m = JSON.stringify(r.v21).match(OLD_V21); if (m) review.push({i, v21:m[0]}); }
  if (r) {
   const t = JSON.stringify([r.lineReading, r.reason, r.evidenceFor, r.evidenceAgainst, r.final?.note]);
   const rules = JSON.stringify(r.final?.rules ?? []).replace(/R\d[a-z]?[↑↓]?/gu, '');
   const m = (t + rules).match(OLD_REVIEW);
   if (m) review.push({i, word:m[0]});
  }
  const p = pol[i];
  const notes = p?.calculationNotes ?? [];
  const ch = FRAMES.filter(fr => han(notes.join('')).includes(fr));
  if (ch.length) calc.push({i, hit:ch});
  if (/由能过改为|由过不了改为|由成翻为|由不成翻为/u.test(notes.join(''))) calc.push({i, revisionWording:true});
  const yao = notes.find(n => /^爻辞：/u.test(n));
  if (yao) { const k = d[0] + '|' + yao; if (lineNotes.has(k)) calc.push({i, dupYao:lineNotes.get(k)}); else lineNotes.set(k, i); }
  if (!p?.readThrough || !p?.readNote) unread.push(i);
  for (const s of touched.filter(t => t.hex === h && t.index === i)) {
   const field = ['title', 'short', 'opening', 'process', 'ending', 'summary'].indexOf(s.field);
   if (field >= 0 && d[3 + field].includes(s.after) && !p?.readThrough) scriptLeft.push({i, field:s.field, sentence:s.after.slice(0, 20)});
  }
 });
 report.push({hex:h, frames, col10, review, unread, scriptLeft, calc, timing, shape,
  total:frames.length + col10.length + review.length + unread.length + scriptLeft.length + calc.length + timing.length + shape.length});
}
if (hexArg) console.log(JSON.stringify(report[0], null, 1));
else {
 const sum = k => report.reduce((a, r) => a + r[k].length, 0);
 console.log(JSON.stringify({frames:sum('frames'), col10:sum('col10'), review:sum('review'), unread:sum('unread'), scriptLeft:sum('scriptLeft'), calc:sum('calc'), timing:sum('timing'), shape:sum('shape'),
  perHex:report.filter(r => r.total).map(r => [r.hex, r.frames.length, r.col10.length, r.review.length, r.unread.length, r.timing.length, r.shape.length])}));
}
