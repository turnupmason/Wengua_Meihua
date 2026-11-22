// 查找考试逐月稿中越出卦断范围的题情。命中后读回整篇，未命中也仍须全文核读。
import { readFile, readdir } from 'node:fs/promises';
import { parseArgs } from 'node:util';

const { values } = parseArgs({ options: {
  hex: { type: 'string' }, keys: { type: 'string' }, list: { type: 'boolean' }
} });
const directory = 'sources/editorial/exam/monthly';
const files = (await readdir(directory)).filter(f => /^hex-\d{3}\.json$/u.test(f)).sort();
const selected = values.keys === undefined ? null : new Set(values.keys.split(','));
const inspectedKeys = new Set();
const patterns = [
  ['具体试题', /题(?:干|面|型|序|头|尾)|(?:首|末|熟|旧|原|前|后|小|长|大|压轴|综合|选择|填空|材料|计算)题|(?:第[一二三四五六七八九十\d]+|头一|最后一|后几|前几|哪一|每一|每|几|一)(?:道|小)?(?:问|题)(?!考试|之义)|(?:卷首|卷尾|半张卷|卷头|卷末)/u],
  ['虚拟题例', /每盒|题后括号|两历对照|柜台日志|草稿纸|答题卡|阅卷(?:人|老师|细则)|扣[一二三四五六七八九十\d]+分|每[问题]给|卷上(?:写|给|说|列|要)|交卷前/u],
  ['设定作答形式', /(?:论述|限字|简答|证明|比较|长答)题|限定(?:了)?(?:篇幅|行数|字数)|题(?:中若|意许|定的(?:行数|位置|范围))|作答区域/u],
  ['通知方式', /报名系统|成绩系统|成绩单|查分(?:系统|页面|网站)|短信通知|准考证号/u]
];

function publicFields(a) {
  const fields = [['题名', a.title], ['简断', a.short],
    ...a.paragraphs.map((p, n) => ['正文' + (n + 1), p]), ['专业说明', a.judgment]];
  if (typeof a.timing === 'string') fields.push(['应期', a.timing]);
  else for (const [n, slot] of a.timing.entries()) {
    for (const [offset, label] of ['情形', '建议', '依据'].entries()) {
      fields.push(['应期' + (n + 1) + label, slot[offset + 2]]);
    }
  }
  return fields;
}

let articles = 0, flagged = 0;
for (const file of files) {
  const id = Number(file.slice(4, 7));
  if (values.hex !== undefined && id !== Number(values.hex)) continue;
  const data = JSON.parse(await readFile(directory + '/' + file, 'utf8'));
  for (const a of data.articles) {
    const key = [id, a.movingLine, a.monthBranch].join('/');
    if (selected && !selected.has(key)) continue;
    inspectedKeys.add(key);
    articles++;
    const findings = [];
    for (const [field, value] of publicFields(a)) {
      for (const [kind, re] of patterns) {
        const match = re.exec(value);
        if (match) findings.push({ field, kind, text: match[0] });
      }
    }
    if (findings.length) {
      flagged++;
      if (values.list) console.log(JSON.stringify({ key, findings }));
    }
  }
}
const missing = selected ? [...selected].filter(k => !inspectedKeys.has(k)) : [];
console.log(JSON.stringify({ articles, flagged, missing }));
process.exitCode = !articles || missing.length ? 2 : flagged ? 1 : 0;
