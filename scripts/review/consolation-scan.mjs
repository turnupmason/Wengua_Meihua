// 逐月长稿：查「预告换季好转」与「安慰式等一等再看」两类收尾（2026-11-19 加）。
// 依据：考试写作说明 READ_THROUGH_BRIEF 第 129 行「不安慰、不许诺下一次」（其他问项照此办理）；
// 所问只是「这一回」，换季以后是另一盘，用以后的季节旺衰推测好转属无据应期。面试逐月长稿 288 篇无此两类句。
// 用法：node scripts/review/consolation-scan.mjs <问项目录> [--hex 1,2,5-9] [--list]
import {readFileSync, readdirSync} from 'node:fs';
const args = process.argv.slice(2), item = args[0], list = args.includes('--list');
const hi = args.indexOf('--hex');
const parse = s => new Set(s.split(',').flatMap(p => { const [a, b] = p.split('-').map(Number); return b ? Array.from({length:b - a + 1}, (_, i) => a + i) : [a]; }));
const only = hi >= 0 ? parse(args[hi + 1]) : null;
// 一、预告换季或气转：等春天、冬天过去、金气回升、木气起来、来年、明年、气候转过来。
const SEASON = /(?:等|到|待)[^。！？，]{0,4}(?:春|夏|秋|冬)(?:天|季|令)?[^。！？，]{0,3}(?:过去|来了|起来|回来|到了|一到)|(?:春|夏|秋|冬)天(?:过去|来了|一到)|(?:金|木|水|火|土)(?:气|势)(?:回升|起来|回来|转过来|上来|一起)|来年|明年|气候转过来|换了季|过了这一季|等火势过去/u;
// 二、安慰式等一等再看：等你力气回来、缓过来、自在了、这一阵过去……再看。
const WAIT = /等[^。！？]{0,14}(?:力气回来|缓过来|恢复|自在|有了力气|过去|回到自己|松下来|稳下来)[^。！？]{0,16}再(?:看|说|谈|去|往前)/u;
const out = [], perHex = {};
const dir = `sources/editorial/${item}/monthly/`;
for (const f of readdirSync(dir).filter(f => /^hex-\d{3}\.json$/.test(f))) {
 const h = Number(f.slice(4, 7)); if (only && !only.has(h)) continue;
 for (const a of JSON.parse(readFileSync(dir + f, 'utf8')).articles) {
  const texts = [['short', a.short], ...a.paragraphs.map((p, i) => ['p' + (i + 1), p])];
  for (const [where, t] of texts) for (const s of t.split(/(?<=[。！？])/u)) {
   const kind = SEASON.test(s) ? '换季' : WAIT.test(s) ? '等一等' : null;
   if (!kind) continue;
   out.push({key:`${h}/${a.movingLine}/${a.monthBranch}`, outcome:a.outcome, where, kind, sentence:s.trim()});
   perHex[h] = (perHex[h] ?? 0) + 1;
  }
 }
}
const articles = new Set(out.map(o => o.key));
console.log(JSON.stringify({item, sentences:out.length, articles:articles.size, byKind:out.reduce((m, o) => (m[o.kind] = (m[o.kind] ?? 0) + 1, m), {}), perHex}));
if (list) for (const o of out) console.log(`${o.key}\t${o.outcome}\t${o.where}\t${o.kind}\t${o.sentence}`);
