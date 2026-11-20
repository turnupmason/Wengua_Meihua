// 逐月长稿口吻检查（2026-11-19）：以用户亲写的面试逐月长稿为准，见 docs/review/MONTHLY_VOICE_GUIDE.md。
// 用法：node scripts/review/style-monthly.mjs <问项目录> [--hex 1,2,5-9] [--list]
import {readFileSync, readdirSync} from 'node:fs';
const args = process.argv.slice(2), item = args[0], list = args.includes('--list');
const hi = args.indexOf('--hex');
const parse = s => new Set(s.split(',').flatMap(p => { const [a, b] = p.split('-').map(Number); return b ? Array.from({length:b - a + 1}, (_, i) => a + i) : [a]; }));
const only = hi >= 0 ? parse(args[hi + 1]) : null;
const han = s => (s.match(/\p{Script=Han}/gu) || []).length;
const MONTH = /^[寅卯辰巳午未申酉戌亥子丑]月/u;
const LIGHT = /就好|就够了|就行了|就是了/gu, THIS = /这个月/gu;
// 写给作者的话（必须为 0）与替对方断心意的疑似句（列出供人工判，不计失败）。
const NOTE = /如实写|如实记下|写进正文|正文写|写给作者/gu;
const MIND = /对方(?:心里(?!有数)|心中|觉得|以为|想着|在意|喜欢|不想|厌|烦|累了|乏了|提不起|没兴致|犹豫)|两边都(?:累|乏|提不起|没劲|松|轻松|在意)|彼此都(?:在意|喜欢|放不下)|(?:上级|上司|领导|老板|主管|东家|新单位|原单位|单位|公司|人事|招聘方|那边)(?:心里|觉得|以为|看重你|器重|赏识|想留|想压|有意|嫌|不满|舍不得|在画饼|画饼)/gu;
const dir = `sources/editorial/${item}/monthly/`;
const rows = [];
for (const f of readdirSync(dir).filter(f => /^hex-\d{3}\.json$/.test(f))) {
 const h = Number(f.slice(4, 7)); if (only && !only.has(h)) continue;
 const arts = JSON.parse(readFileSync(dir + f, 'utf8')).articles;
 const sents = [], heads = {}, hits = [];
 let monthOpen = 0, monthShort = 0, shortHan = 0, light = 0, thisMonth = 0, yi = 0, note = 0, mind = 0;
 for (const a of arts) {
  const key = `${h}/${a.movingLine}/${a.monthBranch}`;
  if (MONTH.test(a.paragraphs[0])) { monthOpen++; hits.push(key + ' 正文以月开头'); }
  if (MONTH.test(a.short)) { monthShort++; hits.push(key + ' 简断以月开头'); }
  const head = a.paragraphs[0].replace(/[^\p{Script=Han}]/gu, '').slice(0, 8); heads[head] = (heads[head] ?? 0) + 1;
  shortHan += han(a.short);
  const body = a.paragraphs.join('\n');
  for (const s of body.split(/[。！？\n]/u)) { const n = han(s); if (n) { sents.push(n); if (n <= 10) hits.push(key + ' 短句：' + s.trim()); } }
  for (const m of body.matchAll(LIGHT)) { light++; hits.push(key + ' 轻飘收尾：' + m[0]); }
  for (const m of (body + a.short).matchAll(THIS)) { thisMonth++; hits.push(key + ' 这个月'); }
  yi += (body.match(/宜/gu) || []).length;
  const all = [a.title, a.short, body].join('\n').replace(/「[^」]*」/gu, '');
  for (const m of all.matchAll(NOTE)) { note++; hits.push(key + ' 写给作者的话：' + m[0]); }
  for (const m of all.matchAll(MIND)) { mind++; hits.push(key + ' 疑似替对方断心意（人工判）：' + m[0]); }
 }
 const n = arts.length, avg = sents.reduce((x, y) => x + y, 0) / sents.length, short10 = sents.filter(x => x <= 10).length / sents.length;
 const maxHead = Math.max(...Object.values(heads));
 const r = {hex:h, articles:n, monthOpen:+(monthOpen / n).toFixed(2), monthShort:+(monthShort / n).toFixed(2), maxSameHead:maxHead,
  avgSentence:+avg.toFixed(1), short10:+(short10 * 100).toFixed(1), light, thisMonth, yiPerMille:Math.round(yi / sents.length * 1000), shortAvg:Math.round(shortHan / n), note, mind};
 const fail = [];
 // 门槛按用户亲写面试稿（origin/main，58 卦 4,176 篇）各卦分布定，取面试稿最低一档以下一点，使面试稿各卦全过：平均句长 ≥28.5（面试最低 28.5）、短句 ≤5.5%（最高 5.3%）、宜 ≥55‰（最低 57）、简断均 ≥75（最低 76）、就好与这个月每卦 ≤1；
 // 月份开头面试单卦两极（多数 0，少数近 1），只按全库卡：正文 ≤15%（面试 12%）、简断 ≤10%（面试 4%）。
 if (r.avgSentence < 28.5) fail.push('平均句长<28.5');
 if (r.avgSentence > 34) fail.push('平均句长>34（面试最长 33.1，读着偏沉）');
 if (r.short10 > 5.5) fail.push('短句>5.5%');
 if (r.light > 1) fail.push('就好就够了>1');
 if (r.thisMonth > 1) fail.push('这个月>1');

 if (r.note) fail.push('写给作者的话');
 if (r.maxSameHead > 10 && !args.includes('--calibrate')) fail.push('同一开头>10篇（用户嫌开头都一样）');
 if (r.yiPerMille < 55) fail.push('宜<55‰');
 if (r.yiPerMille > 220) fail.push('宜>220‰（面试最高 218，用得太密）');
 if (r.shortAvg < 75) fail.push('简断均<75');
 r.status = fail.length ? 'failed' : 'passed'; r.fail = fail.join('、');
 rows.push(r); if (list) for (const x of hits) console.log(x);
 if (args.includes('--json')) continue;
}
if (args.includes('--json')) { console.log(JSON.stringify(rows)); process.exit(0); }
console.table(rows);
const total = rows.reduce((x, r) => x + r.articles, 0), mo = rows.reduce((x, r) => x + r.monthOpen * r.articles, 0) / total;
const ms = rows.reduce((x, r) => x + r.monthShort * r.articles, 0) / total;
const bad = rows.filter(r => r.status !== 'passed'), whole = [];
if (!only && mo > 0.15) whole.push('正文以月开头全库 ' + (mo * 100).toFixed(1) + '%>15%');
if (!only && ms > 0.10) whole.push('简断以月开头全库 ' + (ms * 100).toFixed(1) + '%>10%');
console.log(JSON.stringify({item, hexagrams:rows.length, passed:rows.length - bad.length, failed:bad.map(r => r.hex), monthOpenAll:+(mo * 100).toFixed(1), monthShortAll:+(ms * 100).toFixed(1), whole}));
if (bad.length || whole.length) process.exitCode = 1;
