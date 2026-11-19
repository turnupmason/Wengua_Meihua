// 考试问项定稿后全面自检（只读）：结论与正文、简断开头、残留口径词、应期、计算说明、同爻跨月。
const fs = require('fs');
const item = process.argv[2] || 'exam';
const issues = {};
const add = (k, v) => (issues[k] ||= []).push(v);
const PASS = /能过|过得了|过得去|可以过|会过|拿得下|拿下|顺利通过|能通过|能过关|过关|合格没问题|能合格|稳过|过线不难|能过线|过线没问题|可以过线|过得了线|考得过|通过这一场|这一关能过|能被录用|会被录用|录用你|拿得到这个岗位|过得了这一关|通过这一轮|这一轮能过|能进下一轮|拿到这个岗位|能升上去|这次能升|能晋升|晋升能落定|升得上去|职级能动|能升职|升职能成|能转正|试用期能通过|能转为正式员工|转正能成/u;
const FAIL = /过不了|难过|难以过|不能过|过不去|难通过|没法过|无法过|不会过|难合格|难以合格|难过关|过线难|落榜|不过线|希望不大|过不了线|够不上|难达到|难以达到|达不到|拿不下|难以通过|很难合格|过线无望|没能过|不太可能过|考不过|合格不了|过不去线|这次不过|还差一截|还差一口气|还差几分|离合格线还差|离线还差|差在线下|落在线下|落到线下|够不到线|够不着线|没够上线|没能过线|还没到线|未到合格线|差一点到线|差几分到线|停在线下|压在线下|没上线|上不了线|差着几分|还欠一截|还欠几分|离那条线|没摸到线|线下还差|还差半截|差了一口气|还差一步|差了一步|差一步|这一轮没过|没过这一轮|止步这一轮|没能进下一轮|没被选上|没选上|落选|未能录用|没被录用|没等到录用|没拿到这个岗位|这回没成|这次没成|升职还差一步|这次还没轮到|这次轮不到|还没轮到你|没升上去|职级没动|职级这次没动|晋升没落定|这次没升成|没能晋升|升职这回没成|晋升这回没成|这次还没转成|转正还差一步|还没转下来|这次没转成|转正这回没成|试用期这回没过|没能转正/u;
const LOOSE = /有条件|有望|偏难|多半|大概率|过线有机会|能不能过|过不过|成败两可|两可|或许|未必|恐怕|把握不大|把握较大|把握不小|机会不小|希望很大|希望不大|胜算/u;
for (let h = 1; h <= 64; h++) {
  const id = String(h).padStart(3, '0');
  const src = JSON.parse(fs.readFileSync(`sources/editorial/${item}/hex-${id}.json`, 'utf8'));
  const pol = JSON.parse(fs.readFileSync(`sources/editorial/${item}/polish-v5/hex-${id}.json`, 'utf8'));
  src.forEach((d, i) => {
    const key = `${h}#${i}(${d[0]}爻${d[1].split('-')[0]})`, oc = d[2];
    const [title, short, opening, process, ending, summary] = d.slice(3, 9);
    const all = [title, short, opening, process, ending, summary].join('');
    const head = short.split(/[。！？]/u).slice(0, 2).join('。');
    if (oc === 'conditional') add('残留有条件结论', key);
    if (LOOSE.test(short + summary)) add('简断总断含含糊口气', key + ' ' + (short + summary).match(LOOSE)[0]);
    if (oc === 'favourable') {
      if (!PASS.test(head)) add('成：简断前两句未明说能过', key + ' ' + head.slice(0, 50));
      if (FAIL.test(short + summary) && !/不是过不了|并非过不了|不至于过不了/u.test(short + summary)) add('成：简断或总断出现过不了字样', key + ' ' + (short + summary).match(FAIL)[0]);
    } else if (oc === 'difficult') {
      if (!FAIL.test(head)) add('不成：简断前两句未明说过不了', key + ' ' + head.slice(0, 50));
      if (/只要[^。]{0,20}(就能过|就能通过|就过)/u.test(all)) add('不成：只要……就能过', key);
      if (/(能过|能通过|有望|可以过)[。！]?$/u.test(summary.trim())) add('不成：总断收在能过', key);
    }
    // 应期
    const t = Array.isArray(d[10]) ? d[10] : [];
    for (const sp of t) if (Array.isArray(sp)) {
      if (oc === 'difficult' && sp[1] === 'changed_use' && ['support', 'equal', 'name-support', 'name-body'].includes(sp[0])) add('不成：用变用吉应', key);
      if (oc === 'difficult' && ['name-support', 'name-body'].includes(sp[0])) add('不成：用结果日', key);
      if (/有条件/u.test(JSON.stringify(sp))) add('应期文字含有条件', key);
    }
    // 计算说明
    const notes = (pol[i]?.calculationNotes ?? []).join('；');
    if (!notes) add('缺计算说明', key);
    if (/《时令之应》/u.test(notes)) add('篇名：时令之应', key);
    if (/《体用衰旺之诀》[^；]{0,8}生体之卦气亦宜旺/u.test(notes)) add('篇名：生体之卦气亦宜旺', key);
    if (/内外并无生体/u.test(notes) && !/订正/u.test(notes)) add('引文：并无未注订正本', key);
    if (/盲断|主审|作者|裁定|复核|原稿|改判|R\d|待核|有条件|存疑/u.test(notes)) add('计算说明含禁用词', key + ' ' + notes.match(/盲断|主审|作者|裁定|复核|原稿|改判|R\d|待核|有条件|存疑/u)[0]);
    if (!/^(定档|判断)：/u.test(notes)) add('计算说明缺判断行', key);
    if (oc === 'favourable' && /判不成|定为不成|判难/u.test(notes)) add('计算说明与结论相反(成)', key);
    if (oc === 'difficult' && /判成[，。；]|定为成|判能过/u.test(notes)) add('计算说明与结论相反(不成)', key);
    // 正文禁用
    if (/有条件|R\d|体用定档|口径|盲断/u.test(all)) add('正文含口径用语', key + ' ' + all.match(/有条件|R\d|体用定档|口径|盲断/u)[0]);
    if (pol[i] && pol[i].outcome !== oc) add('润色记录结论不一致', key);
  });
}
const summary = Object.fromEntries(Object.entries(issues).map(([k, v]) => [k, v.length]));
fs.writeFileSync(`docs/review/${item}-final-audit.json`, JSON.stringify({summary, issues}, null, 1) + '\n');
console.log(JSON.stringify(summary, null, 1));
for (const [k, v] of Object.entries(issues)) console.log('\n## ' + k + '\n' + v.slice(0, 8).join('\n'));
