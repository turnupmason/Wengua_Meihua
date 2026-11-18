// 全领域古籍引文核对（只读）：正文、判断依据、计算说明、来源证据里的引文，逐段对照 sources/original 原书。
// 用法：node scripts/review/cite-audit-all.mjs [out.json]
import {readFileSync, readdirSync, writeFileSync, existsSync} from 'node:fs';
const T2S = {陽:'阳',陰:'阴',於:'于',無:'无',爲:'为',為:'为',後:'后',來:'来',與:'与',貞:'贞',凶:'凶',厲:'厉',悔:'悔',吝:'吝',咎:'咎',龍:'龙',戰:'战',見:'见',號:'号',濟:'济',麗:'丽',離:'离',兌:'兑',艮:'艮',震:'震',巽:'巽',坎:'坎',乾:'乾',坤:'坤',剝:'剥',復:'复',頤:'颐',過:'过',險:'险',恆:'恒',遯:'遁',壯:'壮',晉:'晋',傷:'伤',睽:'睽',蹇:'蹇',解:'解',損:'损',益:'益',夬:'夬',姤:'姤',萃:'萃',升:'升',困:'困',井:'井',革:'革',鼎:'鼎',漸:'渐',歸:'归',豐:'丰',旅:'旅',渙:'涣',節:'节',孚:'孚',濟:'济',屯:'屯',蒙:'蒙',需:'需',訟:'讼',師:'师',比:'比',畜:'畜',履:'履',泰:'泰',否:'否',謙:'谦',豫:'豫',隨:'随',蠱:'蛊',臨:'临',觀:'观',噬:'噬',嗑:'嗑',賁:'贲',妄:'妄',體:'体',變:'变',應:'应',體:'体',卦:'卦',則:'则',剋:'克',尅:'克',旺:'旺',衰:'衰',氣:'气',時:'时',終:'终',吉:'吉',凡:'凡',當:'当',從:'从',進:'进',退:'退',輿:'舆',車:'车',馬:'马',鳥:'鸟',魚:'鱼',貝:'贝',門:'门',東:'东',鄰:'邻',殺:'杀',還:'还',寧:'宁',憂:'忧',聽:'听',說:'说',談:'谈',語:'语',誠:'诚',誨:'诲',讎:'雠',麗:'丽',虛:'虚',實:'实',盡:'尽',餘:'余',飲:'饮',食:'食',衆:'众',眾:'众',長:'长',內:'内',兩:'两',會:'会',斷:'断',圖:'图',國:'国',家:'家',異:'异',數:'数',學:'学',問:'问',書:'书',對:'对',頭:'头',顛:'颠',貴:'贵',賤:'贱',財:'财',貨:'货',資:'资',斧:'斧',喪:'丧',徵:'征',懼:'惧',禍:'祸',災:'灾',眚:'眚',憂:'忧',樂:'乐',號:'号',咷:'咷',笑:'笑',亂:'乱',難:'难',順:'顺',剛:'刚',柔:'柔',節:'节',義:'义',處:'处',極:'极',盛:'盛',彊:'强',強:'强',專:'专',誌:'志',聞:'闻',閑:'闲',開:'开',關:'关',歲:'岁',蕃:'蕃',築:'筑',藩:'藩',羸:'羸',觸:'触',羝:'羝',據:'据',窮:'穷',擊:'击',繫:'系',係:'系',辭:'辞',傳:'传',象:'象',彖:'彖',筮:'筮'};
const han = s => [...String(s)].map(c => T2S[c] ?? c).join('').replace(/[^\p{Script=Han}]/gu, '');
const corpus = ['yijing64.txt', 'meihua-volumes-1-3.txt', 'grades64.txt', 'grade-correction.txt', 'void-rules.txt', 'void-time-nodes.txt']
  .map(f => han(readFileSync(`sources/original/${f}`, 'utf8'))).join('|')
  + '|' + JSON.parse(readFileSync('data/editorial-patches.json', 'utf8')).map(p => han(p.after ?? '')).join('|');
const lineCorpus = new Set();
const COMM = /(王注|王弼|孔疏|孔颖达|程传|程颐|伊川|本义|朱熹|朱子|正义|周易正义|疏|注)[^「」]{0,6}$/u;
const items = readdirSync('data/authored-readings', {withFileTypes:true}).filter(d => d.isDirectory()).map(d => d.name);
const res = {};
function walk(v, path, out) {
  if (typeof v === 'string') out.push([path, v]);
  else if (Array.isArray(v)) v.forEach((x, i) => walk(x, path, out));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { if (path === '' && k === 'facts') continue; walk(x, path ? path + '.' + k : k, out); }
}
for (const item of items) {
  const bad = new Map(); let nq = 0, rows = 0;
  for (const f of readdirSync(`data/authored-readings/${item}`).filter(f => /^hex-\d{3}\.json$/.test(f))) {
    const j = JSON.parse(readFileSync(`data/authored-readings/${item}/${f}`, 'utf8'));
    for (const r of j.rows ?? []) {
      rows++; const strs = []; walk(r, '', strs);
      const lc = han((r.facts?.movingLine?.fullText ?? '') + '|' + (r.facts?.movingLine?.image ?? ''));
      for (const [p, s] of strs) {
        const qs = [];
        for (const m of s.matchAll(/「([^「」]{2,200})」/gu)) qs.push([m[1], s.slice(Math.max(0, m.index - 14), m.index)]);
        if (/sourceEvidence\.quote$|lineApplication\.evidence$/.test(p)) qs.push([s, p]);
        for (const [q, ctx] of qs) {
          nq++;
          const frags = q.split(/……|…|\.\.\.|⋯/u).map(han).filter(x => x.length >= 2);
          if (!frags.length) continue;
          const miss = frags.filter(x => !corpus.includes(x) && !lc.includes(x));
          if (!miss.length) continue;
          const kind = COMM.test(ctx) ? 'commentary' : 'text';
          const key = kind + '｜' + q;
          if (!bad.has(key)) bad.set(key, {kind, quote:q, miss, ctx, field:p, n:0, where:[]});
          const b = bad.get(key); b.n++; if (b.where.length < 3) b.where.push(`${f.slice(4,7)}#${r.movingLine}/${r.monthOrder}`);
        }
      }
    }
  }
  res[item] = {rows, quotes:nq, unmatched:[...bad.values()].sort((a, b) => b.n - a.n)};
}
const out = process.argv[2];
if (out) writeFileSync(out, JSON.stringify(res, null, 1));
for (const [k, v] of Object.entries(res)) {
  const t = v.unmatched.filter(x => x.kind === 'text').length, c = v.unmatched.filter(x => x.kind === 'commentary').length;
  console.log(`${k}: rows ${v.rows} quotes ${v.quotes} unmatched-unique text ${t} commentary ${c}`);
}
