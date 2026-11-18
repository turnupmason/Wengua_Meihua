// 注疏引文订正：按网上原本核对结果（docs/review/exam-citation-audit.md）改正字句与出处，
// 未能核到的引文在记录里标「待核」。只改复核记录，不改正文。用法：node scripts/review/fix-citations.mjs <问项目录>
import {readFile, readdir, writeFile} from 'node:fs/promises';
const [item] = process.argv.slice(2);
const unverified = ['处富有而能思艰', '常分也，不足谓之过咎', '我生，我之所行也', '遇其占者，无故而有灾',
 '非能出乎险也，唯益陷于深险耳', '始虽艰阻，终得无咎', '必见恶人则无咎'];
const fixes = [
 ['不为事始，须唱乃和，竟其终', '不为事始，须唱乃应，待命乃发'],
 ['王注「趣顺而已……小人之道」', '王注「巽顺而已，无所能为，小人之道也」'],
 ['不远而复……占者如是，则元吉也', '失之未远，能复于善，不抵于悔，大善而吉之道也'],
 ['若犯之而进，则有危厉，故利在已而不进', '有危则宜已，不可犯灾危而行也'],
 ['程传「何其通达之甚也」', '本义「何其通达之甚也」'],
 ['王注「恒住于中，能久中也」', '王注「恒位于中，可以消悔也」'],
 ['固志在三', '固志在一'],
 ['鼫鼠五能，不成一技之术', '鼫鼠五能，不成一伎术'],
];
const MARK = '（此句未能在公开本核到，待核）';
const dir = `sources/editorial/${item}/review-v2/`;
let fixed = 0, marked = 0;
for (const name of (await readdir(dir)).filter(n => /^hex-\d{3}\.json$/.test(n))) {
 let s = await readFile(dir + name, 'utf8');
 const before = s;
 for (const [a, b] of fixes) if (s.includes(a)) { fixed += s.split(a).length - 1; s = s.split(a).join(b); }
 for (const u of unverified) {
  let from = 0;
  for (;;) {
   const at = s.indexOf(u, from);
   if (at < 0) break;
   const close = s.indexOf('」', at);
   if (close < 0) break;
   if (!s.startsWith(MARK, close + 1)) { s = s.slice(0, close + 1) + MARK + s.slice(close + 1); marked++; }
   from = close + 1;
  }
 }
 if (s !== before) { JSON.parse(s); await writeFile(dir + name, s); }
}
// 正文（第 4–9 栏）不应含注疏引文；若有，列出供人工改。
const prose = [];
for (const name of (await readdir(`sources/editorial/${item}/`)).filter(n => /^hex-\d{3}\.json$/.test(n))) {
 for (const d of JSON.parse(await readFile(`sources/editorial/${item}/${name}`, 'utf8')))
  for (const v of d.slice(3, 9)) for (const u of [...unverified, ...fixes.map(f => f[0].replace(/^.*「|」.*$/g, ''))]) if (v.includes(u)) prose.push(name + ' ' + u);
}
console.log(JSON.stringify({fixed, marked, proseHits:prose}));
