// 晋升、转正作者源与记录收尾（2026-11-18）：用法 node scripts/review/promotion-scene-cleanup.cjs [promotion-pay|workplace-probation]
// 判断依据、应期依据与无期说明、计算说明里残留的考试口吻换成晋升说法；
// review-v2 的 reason/final 写明晋升改判依据。同步 polish-v5 的 polished/hashAfter。
const fs = require('fs'), crypto = require('crypto');
const ITEM = process.argv[2] ?? 'promotion-pay';
const NOUN = ITEM === 'workplace-probation' ? '转正' : '晋升', RULE = ITEM === 'workplace-probation' ? 'probationRule' : 'promotionRule';
const R = [
  [/卷尾/gu, '末段'], [/卷首/gu, '开头'], [/全卷/gu, '全盘'], [/卷面/gu, '评定'],
  [/不落在合格上/gu, '不落在' + NOUN + '结果上'], [/直落合格/gu, '直落' + NOUN + '结果'], [/非直言合格/gu, '非直言能' + (NOUN === '转正' ? '转正' : '升')], [/不正对合格/gu, '不正对' + NOUN], [/不是合格消息/gu, '不是' + NOUN + '消息'], [/合格消息/gu, NOUN + '消息'],
  [/此盘过不了，/gu, NOUN === '转正' ? '此盘转不了正，' : '此盘升不了，'], [/这一盘过不了，/gu, NOUN === '转正' ? '此盘转不了正，' : '此盘升不了，'], [/过不了的盘/gu, NOUN === '转正' ? '转不了正的盘' : '升不了的盘'], [/过不了/gu, NOUN === '转正' ? '转不了正' : '升不了'],
  [/作答/gu, '评议'], [/零碎失分/gu, '零碎缺漏'], [/便失分/gu, '便被扣下'], [/失分无从补/gu, '缺漏无从补'], [/失分/gu, '缺漏'], [/不失分寸/gu, '不失分寸'],
  [/正卡在线下/gu, '正卡在门槛前'], [/仍压在线下/gu, '仍够不上'], [/差在线下/gu, '差在门槛前'],
  [/不是放榜的日子/gu, NOUN === '转正' ? '不是转正通知的日子' : '不是任命的日子'], [/出成绩的日子/gu, '出结果的日子'], [/能单独定到成绩的那一天/gu, NOUN === '转正' ? '能单独定到转正通知的那一天' : '能单独定到任命的那一天'], [/不作成绩日/gu, '不作结果日'],
  [/理清题目边界/gu, '理清职责边界'], [/顺着题目走/gu, '顺着要求走'],
];
const sub = s => typeof s === 'string' ? R.reduce((t, [a, b]) => t.replace(a, b), s) : s;
const deep = v => typeof v === 'string' ? sub(v) : Array.isArray(v) ? v.map(deep) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deep(x)])) : v;
const F = ['title','short','opening','process','ending','summary'];
const RV = [[/考试/gu, NOUN], [/合格/gu, NOUN], [/过线/gu, '成事'], [/线下/gu, '门槛前'], [/卷面/gu, '评定'], [/卷尾/gu, '末段'], [/卷首/gu, '开头'], [/分数/gu, '结果'], [/原稿/gu, '旧稿'], [/口径/gu, '定稿规则']];
const subR = s => typeof s === 'string' ? RV.reduce((t, [a, b]) => t.replace(a, b), s) : s;
let n = 0;
for (let h = 1; h <= 64; h++) {
  const id = String(h).padStart(3, '0'), dir = `sources/editorial/${ITEM}/`;
  const src = JSON.parse(fs.readFileSync(dir + `hex-${id}.json`, 'utf8'));
  const pol = JSON.parse(fs.readFileSync(dir + `polish-v5/hex-${id}.json`, 'utf8'));
  const rev = JSON.parse(fs.readFileSync(dir + `review-v2/hex-${id}.json`, 'utf8'));
  const before = JSON.stringify([src, pol.map(r => r.calculationNotes), rev]);
  src.forEach(d => { d[9] = sub(d[9]); d[10] = deep(d[10]); });
  pol.forEach((r, i) => { r.calculationNotes = r.calculationNotes.map(sub); if (typeof r.opusWrite === 'string') r.opusWrite = [...new Set(r.opusWrite.split('；'))].join('；');
    const p = {...r.polished}; F.forEach((f, k) => p[f] = src[i][3 + k]);
    if (JSON.stringify(p) !== JSON.stringify(r.polished)) { r.polished = p; r.hashAfter = crypto.createHash('sha256').update(JSON.stringify(p)).digest('hex'); } });
  rev.forEach((r, i) => {
    const rule = r.final?.[RULE] ?? '考试同盘定稿';
    r.reason = subR(r.reason); if (r.final) r.final.note = subR(r.final.note);
    if (rule !== '考试同盘定稿' && !String(r.reason).startsWith(NOUN)) {
      r.reason = NOUN + '定为不成：' + rule + '。体用初判另见下文——' + r.reason;
      if (r.final) { r.final.note = NOUN + '定为不成：' + rule + '。'; r.final.rules = [...(r.final.rules ?? []).filter(x => !x.startsWith(NOUN)), NOUN + '：' + rule]; }
    }
    r.evidenceFor = (r.evidenceFor ?? []).map(subR); r.evidenceAgainst = (r.evidenceAgainst ?? []).map(subR);
  });
  if (JSON.stringify([src, pol.map(r => r.calculationNotes), rev]) === before) continue;
  fs.writeFileSync(dir + `hex-${id}.json`, JSON.stringify(src, null, 2) + '\n');
  fs.writeFileSync(dir + `polish-v5/hex-${id}.json`, JSON.stringify(pol, null, 1) + '\n');
  fs.writeFileSync(dir + `review-v2/hex-${id}.json`, JSON.stringify(rev, null, 1) + '\n'); n++;
}
console.log('files', n);
