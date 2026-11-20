// 确定关系补判记录：由 establishment-verdicts.cjs 重生成第二节（分布）与第四节（婚恋专属爻辞表），使文档与规则一致。
// 用法：node scripts/review/establishment-doc-tables.cjs [--write]
const fs = require('fs');
const {establishmentVerdicts, LINE_DOWN, LINE_UP} = require('./establishment-verdicts.cjs');
const DOC = 'docs/review/ESTABLISHMENT_REJUDGE_20261119.md';
const write = process.argv.includes('--write');
const V = establishmentVerdicts();
const months = {'spring-wood':2, 'summer-fire':2, 'autumn-metal':2, 'winter-water':2, 'seasonal-earth':4};
const n = {favourable:0, difficult:0}, m = {favourable:0, difficult:0};
for (const v of V) { n[v.v]++; m[v.v] += months[v.month]; }
const fmt = x => x.toLocaleString('en-US');
const order = o => Object.keys(o).sort((a, b) => { const [ah, al] = a.split('-').map(Number), [bh, bl] = b.split('-').map(Number); return ah - bh || al - bl; });
const table = o => ['| 卦·爻 | 爻辞 |', '|---|---|', ...order(o).map(k => `| ${k.replace('-', '·')} | ${o[k]} |`)].join('\n');
const sec2 = `## 二、分布\n\n按五气（每卦三十气）与按逐月长稿（每卦七十二篇）分别计：\n\n| 结论 | 五气 | 逐月长稿 |\n|---|---|---|\n| 能成 | ${fmt(n.favourable)} | ${fmt(m.favourable)} |\n| 不成 | ${fmt(n.difficult)} | ${fmt(m.difficult)} |\n\n本节由 \`scripts/review/establishment-doc-tables.cjs\` 依现行规则生成。旧稿（relationship-establishment-1.0.0）按五气计成 345、有条件 713、不成 862。旧稿成批违背专章的情形见 \`REMAINING_DOMAINS_AUDIT_20261119.md\` 第二节：本用克体、全盘无生体而判成 38 篇；无克体、有生体而判不成 83 篇（多是「体弱难制旺用」反侮推理）。\n\n`;
const sec4 = `## 四、婚恋专属爻辞\n\n本节由 \`scripts/review/establishment-doc-tables.cjs\` 依 \`establishment-verdicts.cjs\` 的 LINE_DOWN、LINE_UP 生成，按卦序排列；降档 ${Object.keys(LINE_DOWN).length} 条，升档 ${Object.keys(LINE_UP).length} 条。\n\n### 降档\n\n${table(LINE_DOWN)}\n\n### 升档\n\n${table(LINE_UP)}\n\n`;
const doc = fs.readFileSync(DOC, 'utf8');
const s2 = doc.indexOf('## 二、'), s3 = doc.indexOf('## 三、'), s4 = doc.indexOf('## 四、'), s5 = doc.indexOf('## 五、');
if ([s2, s3, s4, s5].some(i => i < 0) || !(s2 < s3 && s3 < s4 && s4 < s5)) throw new Error('补判记录章节结构不对');
const out = doc.slice(0, s2) + sec2 + doc.slice(s3, s4) + sec4 + doc.slice(s5);
console.log(JSON.stringify({five:n, monthly:m, down:Object.keys(LINE_DOWN).length, up:Object.keys(LINE_UP).length, changed:out !== doc}));
if (write) fs.writeFileSync(DOC, out);
