// 文字终修逐卦清单：列出每篇在简断、总断、正文、计算说明、应期文字上的具体问题，供一次改完。只读。
// 用法：node scripts/review/text-packet.mjs <问项目录> <卦序>
import {readFileSync} from 'node:fs';
import {VOCAB} from './state-vocab.mjs';
const [item, hexArg] = process.argv.slice(2);
const id = String(Number(hexArg)).padStart(3, '0');
const src = JSON.parse(readFileSync(`sources/editorial/${item}/hex-${id}.json`, 'utf8'));
const pol = JSON.parse(readFileSync(`sources/editorial/${item}/polish-v5/hex-${id}.json`, 'utf8'));
const rep = JSON.parse(readFileSync(`docs/review/${item}-repeats.json`, 'utf8'));
const hot = rep.phrases.filter(p => p.count >= 12).map(p => p.phrase);
const hotOpen = rep.openings.filter(p => p.count >= 20).map(p => p.phrase);
const hotEnd = (rep.endings ?? []).filter(p => p.count >= 24).map(p => p.phrase);
const HEDGE = /有条件|有望|偏难|多半|大概率|过线有机会|能不能过|过不过|成败两可|两可|或许|未必|恐怕|把握不大|把握较大|把握不小|机会不小|希望很大|希望不大|胜算|可能性|难过线|很难过|难以过/u;
const PASS = /能过|过得了|过得去|可以过|会过|拿得下|拿下|顺利通过|能通过|能过关|过关|能合格|稳过|过线不难|能过线|可以过线|过得了线|考得过|通过这一场|这一关能过|能被录用|会被录用|录用你|拿得到这个岗位|过得了这一关|通过这一轮|这一轮能过|能进下一轮|拿到这个岗位|能升上去|这次能升|能晋升|晋升能落定|升得上去|职级能动|能升职|升职能成|能转正|试用期能通过|能转为正式员工|转正能成/u;
const FAIL = /过不了|不能过|过不去|没法过|无法过|不会过|过不了线|够不上|达不到|拿不下|过线无望|没能过|考不过|合格不了|过不去线|这次不过|还差一截|还差一口气|还差几分|离合格线还差|离线还差|差在线下|落在线下|落到线下|够不到线|够不着线|没够上线|没能过线|还没到线|未到合格线|差一点到线|差几分到线|停在线下|压在线下|没上线|上不了线|差着几分|还欠一截|还欠几分|离那条线|没摸到线|线下还差|还差半截|差了一口气|还差一步|差了一步|差一步|这一轮没过|没过这一轮|止步这一轮|没能进下一轮|没被选上|没选上|落选|未能录用|没被录用|没等到录用|没拿到这个岗位|这回没成|这次没成|升职还差一步|这次还没轮到|这次轮不到|还没轮到你|没升上去|职级没动|职级这次没动|晋升没落定|这次没升成|没能晋升|升职这回没成|晋升这回没成|这次还没转成|转正还差一步|还没转下来|这次没转成|转正这回没成|试用期这回没过|没能转正/u;
const BAN = /有条件|口径|R\d|盲断|复核|改判|原稿|定档|体用|旺相|休囚|生体|克体/u;
const V = VOCAB[item], isState = Boolean(V);
const N = isState ? V.LABEL : {favourable:'能过', difficult:'过不了'};
const out = [];
src.forEach((d, i) => {
  const [title, short, opening, process, ending, summary] = d.slice(3, 9);
  const head = short.split(/[。！？]/u).filter(Boolean).slice(0, 2).join('。');
  const f = [];
  const h1 = (short + summary).match(new RegExp((isState ? V.HEDGE : HEDGE).source, 'gu'));
  if (h1) f.push('含糊口气：' + [...new Set(h1)].join('、') + '（简断或总断里改成确定说法）');
  const want = isState ? V.WORDS[d[2]] : d[2] === 'favourable' ? PASS : FAIL;
  if (isState && V.CONTRA[d[2]].test(short + summary)) f.push('简断或总断有与结论相反的说法：' + (short + summary).match(V.CONTRA[d[2]])[0]);
  if (!want.test(head)) f.push(`简断前两句没有明说「${N[d[2]]}」`);
  if (!want.test(summary)) f.push(`总断没有明说「${N[d[2]]}」`);
  if (!isState && d[2] === 'favourable' && FAIL.test(short + summary)) f.push('判能过，简断或总断却有「过不了」类字样');
  if (!isState && d[2] === 'difficult' && PASS.test((short + summary).replace(/没能过|没被录用|未能录用|没等到录用|没拿到这个岗位|没被选上|没选上|没能进下一轮|进不了下一轮|没能晋升|没能转正/gu, '')) && !/不是过不了|能过的部分|过得去的部分/u.test(short + summary)) f.push('判过不了，简断或总断却有「能过」类字样，核对是否说反');
  const body = [title, short, opening, process, ending, summary].join('');
  const ban = body.match(new RegExp(BAN.source, 'gu'));
  if (ban) f.push('正文出现内部用语：' + [...new Set(ban)].join('、'));
  const used = hot.filter(p => body.replace(/[^\p{Script=Han}]/gu, '').includes(p));
  if (used.length) f.push('全库高频套话：' + used.slice(0, 6).join('、'));
  const op = short.replace(/[^\p{Script=Han}]/gu, '').slice(0, 5);
  if (hotOpen.includes(op)) f.push('简断开头是全库高频起句「' + op + '」');
  // 2026-11-19：全库任何一栏的句子开头都不许成套（考试全库为 0，以此为准）。
  for (const [name, text] of [['标题', title], ['开局', opening], ['过程', process], ['结局', ending], ['总断', summary], ['简断', short]]) {
   String(text).split(/[。！？]/u).map(x => x.replace(/[^\p{Script=Han}]/gu, '')).filter(x => x.length >= 6).forEach((x, k) => {
    if ((name !== '简断' || k > 0) && hotOpen.includes(x.slice(0, 5))) f.push(name + '有句子以全库高频起句「' + x.slice(0, 5) + '」开头');
    if (hotEnd.includes(x.slice(-5))) f.push(name + '有句子以全库高频收句「' + x.slice(-5) + '」结尾');
   });
  }
  const notes = (pol[i]?.calculationNotes ?? []).join('；');
  const nb = notes.match(/盲断|主审|作者|裁定|复核|原稿|改判|R\d|待核|有条件|存疑|口径/gu);
  if (nb) f.push('计算说明禁用词：' + [...new Set(nb)].join('、'));
  if (d[2] === 'favourable' && /判不成|定为不成|判难|取难/u.test(notes)) f.push('计算说明写成不成，与结论相反');
  if (d[2] === 'difficult' && /判成[，。；]|定为成|判能过|取吉/u.test(notes)) f.push('计算说明写成成，与结论相反');
  if (/有条件/u.test(JSON.stringify(d[10] ?? ''))) f.push('应期文字含「有条件」，只改措辞');
  out.push({index:i, line:d[0], qi:d[1], outcome:N[d[2]], title, short, summary, flags:f});
});
console.log(JSON.stringify({item, hex:Number(hexArg), flagged:out.filter(o => o.flags.length).length, boards:out}, null, 1));
