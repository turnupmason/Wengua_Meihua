// 五气源专业说明三处核对（2026-11-21，复合、新桃花开写前用；确定关系整库集成前同样要过）：
// 第 9 栏（专业说明）、polish-v5 calculationNotes（计算说明，上线后界面显示）、review-v2 lineReading（爻辞读法）。
// 查：本篇结论写明且不写成另一档；他项用语；考试、面试残留；别的问项的用语；规则名目与写给审稿的话。体衰、篇名、间接作用另跑
// tishuai-audit、meihua-attr-audit --col9、indirect-audit --table。
// 用法：node scripts/review/col9-check.mjs <问项> [--hex 1,2] [--list]
import {readFileSync} from 'node:fs';
import {ITEMS} from './monthly-lib.mjs';
const args = process.argv.slice(2), item = args[0], list = args.includes('--list');
const hi = args.indexOf('--hex'), only = hi >= 0 ? new Set(args[hi + 1].split(',').map(Number)) : null;
const c = ITEMS[item]; if (!c) throw new Error('item?');
const NOTE = c.note;
const EXAM = /考试|考场|考生|卷面|试卷|阅卷|合格线|及格|分数|压轴|题面|答题|做题|全场|面试官|能过|过不了/u;
const RULE = /口径|定档|有条件|R\d|盲断|复核|改判|原稿|待核|存疑|降档|升档|调档|翻档|专属爻辞|专属降|专属升|按结局拆|只推迟时机|升辞|降辞|列为降|列为升|往上推|推一等|减一等|婚恋专属|定稿第|READING_POLICY|第[一二三四五六七八九十]+节/u;
// 写给作者的话（2026-11-21 查出：确定关系第 9 栏「写进正文」291、「只作写照」131、「写成提醒／写成相处之道」等约 170 行，月稿专业说明照抄后读者看得到；面试、考试几乎为 0）。「不翻」「不改结论」「翻为」是专业说明惯用语（面试、考试都用），可留。
const WRITER = /写进正文|正文写|如实写|只作写照|写照|写成|写作|写给/u;
const OTHER_ITEM = {
 'relationship-reconciliation':/确定关系|确定恋爱|关系能否确定|关系定下来|定得下来|定不下来|确定下来/u,
 'new-relationship-opportunity':/确定关系|确定恋爱|关系能否确定|关系定下来|定得下来|定不下来|确定下来|这段关系|复合|两人之间/u,
 'relationship-establishment':/复合|新桃花/u,
}[item] ?? /$^/u;
const hits = []; const count = {};
const add = (k, cat, s) => { count[cat] = (count[cat] ?? 0) + 1; hits.push(`${k}\t${cat}\t${s}`); };
for (let h = 1; h <= 64; h++) {
 if (only && !only.has(h)) continue;
 const id = String(h).padStart(3, '0'), dir = `sources/editorial/${item}/`;
 const src = JSON.parse(readFileSync(dir + `hex-${id}.json`, 'utf8'));
 const pol = JSON.parse(readFileSync(dir + `polish-v5/hex-${id}.json`, 'utf8'));
 const rev = JSON.parse(readFileSync(dir + `review-v2/hex-${id}.json`, 'utf8'));
 src.forEach((d, i) => {
  const k = `${h}#${i}`, out = d[2];
  const parts = {专业说明:String(d[9] ?? ''), 计算说明:(pol[i]?.calculationNotes ?? []).join('｜'), 爻辞读法:String(rev[i]?.lineReading ?? '')};
  for (const [name, t] of Object.entries(parts)) {
   const plain = t.replace(/「[^」]*」/gu, '');
   if (name !== '爻辞读法') {
    if (!NOTE[out]?.test(t)) add(k, name + '没写本篇结论', t.slice(0, 40));
    for (const [o, re] of Object.entries(NOTE)) if (o !== out && re.test(t)) add(k, name + '写成另一档', t.match(re)[0]);
    const r = plain.replace(/定为(?:能成|不成)/gu, ''); if (RULE.test(r)) add(k, name + '规则名目', r.match(RULE)[0]);
    if (WRITER.test(plain)) add(k, name + '写给作者的话', plain.slice(Math.max(0, plain.search(WRITER) - 10), plain.search(WRITER) + 12));
   }
   if (c.forbid?.test(plain)) add(k, name + '他项用语', plain.match(c.forbid)[0]);
   if (EXAM.test(plain)) add(k, name + '考试残留', plain.match(EXAM)[0]);
   if (OTHER_ITEM.test(plain)) add(k, name + '别项用语', plain.match(OTHER_ITEM)[0]);
  }
 });
}
if (list) for (const x of hits) console.log(x);
console.log(JSON.stringify({item, problems:hits.length, count}));
if (hits.length) process.exitCode = 1;
