// 逐月长稿：查「预告换季好转」「等一等再看」「许诺往后」三类句子（2026-11-19 加，同日放宽）。
// 依据：考试写作说明 READ_THROUGH_BRIEF 第 129 行「不安慰、不许诺下一次」（其他问项照此办理）；
// 所问只是「这一回」，换季以后是另一盘，用以后的季节旺衰推测好转属无据应期。面试逐月长稿 288 篇无此类句。
// 宁宽勿漏：命中的句子逐句判定，确属安慰、许诺、预告的改写；只是日常安排或相处之道的（如「下回怎么安排」），
// 记入豁免清单目录 sources/editorial/<问项>/consolation-allow/ 下任一 .json（各写手各用一个文件，免得互相覆盖）：[{key:"卦/爻/月", sentence:"原句全文", reason:"为何不算"}]。
// 豁免按「篇键 + 原句全文」精确匹配，句子改了豁免即失效。验收标准：扫描为 0。
// 用法：node scripts/review/consolation-scan.mjs <问项目录> [--hex 1,2,5-9] [--list]
import {readFileSync, readdirSync, existsSync} from 'node:fs';
const args = process.argv.slice(2), item = args[0], list = args.includes('--list');
const hi = args.indexOf('--hex');
const parse = s => new Set(s.split(',').flatMap(p => { const [a, b] = p.split('-').map(Number); return b ? Array.from({length:b - a + 1}, (_, i) => a + i) : [a]; }));
const only = hi >= 0 ? parse(args[hi + 1]) : null;
const RULES = [
 // 一、预告换季或气转。
 ['换季', /(?:春|夏|秋|冬)(?:天|季|令|末|初|木|金|水|火|土)?[^。！？，；]{0,4}(?:过去|一过|过了|来了|一到|到了|起来|回来|变了|转过来)|(?:金|木|水|火|土)(?:气|势)[^。！？，；]{0,3}(?:回升|起来|回来|转过来|上来|一起|过去|退了|松了)|来年|明年|开春|冬末|岁末|年后|时令(?:变|转|过)|气候转|换了季|过了这一季|这一季过去|等(?:火势|天凉|天暖)/u],
 // 二、等一等再看：等……再看／再说／再谈／再往前／再处理；……过去，再看。
 ['等一等', /(?:等|待|到)[^。！？]{0,24}再(?:看|说|谈|去|往前|处理|定|提|议)|(?:过去|回过气|缓过来|力气回来|有了力气|恢复)[^。！？]{0,12}再(?:看|说|谈|往前)/u],
 // 三、许诺往后：往后才有／往后还有／往后的路／日后／下一回才／不会后悔／迟早／总会。
 ['许诺', /往后(?:才|还|就|也)?(?:有|会|能|留|好)|往后的路|留着往后|日后|将来|下一回(?:才|的话|会|就)|以后(?:还|会|才|也)|不会(?:留下|积下)?(?:大的)?(?:遗憾|后悔|悔)|不至于(?:后悔|悔)|迟早|总会|终会|终究会|总有一天|会好起来|会过去的|会回来|会倒|会松动|留给往后|留到往后|还有机会|才有机会|不必(?:着急|灰心|失落|难过|沮丧|气馁|自责|伤心)|别(?:灰心|难过|着急|失落)|不用(?:着急|灰心|难过)/u],
];
const allowDir = `sources/editorial/${item}/consolation-allow/`;
const allow = existsSync(allowDir) ? readdirSync(allowDir).filter(f => f.endsWith('.json')).flatMap(f => JSON.parse(readFileSync(allowDir + f, 'utf8'))) : [];
const allowSet = new Set(allow.map(a => a.key + '\u0000' + a.sentence));
const out = [], perHex = {};let allowed = 0;
const dir = `sources/editorial/${item}/monthly/`;
for (const f of readdirSync(dir).filter(f => /^hex-\d{3}\.json$/.test(f))) {
 const h = Number(f.slice(4, 7)); if (only && !only.has(h)) continue;
 for (const a of JSON.parse(readFileSync(dir + f, 'utf8')).articles) {
  const key = `${h}/${a.movingLine}/${a.monthBranch}`;
  const texts = [['title', a.title], ['short', a.short], ...a.paragraphs.map((p, i) => ['p' + (i + 1), p])];
  for (const [where, t] of texts) for (const raw of t.split(/(?<=[。！？])/u)) {
   const s = raw.trim(); if (!s) continue;
   const plain = s.replace(/「[^」]*」/gu, '');
   // 说的就是本月的时令词不算换季：丑月的「冬末／岁末」，寅月的「开春」。
   const own = {丑:/冬末|岁末/gu, 寅:/开春/gu}[a.monthBranch];
   const plain2 = own ? plain.replace(own, '') : plain;
   const hit = RULES.find(([, re]) => re.test(plain2)); if (!hit) continue;
   if (allowSet.has(key + '\u0000' + s)) { allowed++; continue; }
   out.push({key, outcome:a.outcome, where, kind:hit[0], sentence:s});
   perHex[h] = (perHex[h] ?? 0) + 1;
  }
 }
}
console.log(JSON.stringify({item, sentences:out.length, articles:new Set(out.map(o => o.key)).size, allowed, byKind:out.reduce((m, o) => (m[o.kind] = (m[o.kind] ?? 0) + 1, m), {}), perHex}));
if (list) for (const o of out) console.log(`${o.key}\t${o.outcome}\t${o.where}\t${o.kind}\t${o.sentence}`);
if (out.length) process.exitCode = 1;
