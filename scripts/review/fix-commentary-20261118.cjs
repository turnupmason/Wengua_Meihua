// 注疏引文逐字订正（2026-11-18）：依 sources/reference 下维基文库《周易正义》核对结果，改考试、面试作者源
// （正文、判断依据、应期、计算说明、复核记录），并同步 polish-v5 的 polished/hashAfter。异文不定的改为转述或换用已核对的原句。
const fs = require('fs'), crypto = require('crypto');
const R = [
  ['趣顺而已', '巽顺而已'], ['趣順而已', '巽順而已'],
  ['王弼注「授不得正则众不从」', '王弼注以授任不得其人则众不从为解'],
  ['可以征邑国而已', '可以邑一国而已'], ['「征邑国而已」', '「邑一国而已」'],
  ['居内得位，柔顺寡见', '居观得位，柔顺寡见'], ['上为化主', '上为观主'], ['在予一人', '在于一人'],
  ['故任其质素', '故在其质素'], ['「任其质素', '「在其质素'],
  ['「无首，后也」', '「处卦之终，是后夫也」'],
  ['「刑不可长也」', '「刑不可长」'],
  ['王弼注「居不获安，行无其应」', '王弼注「居不获安」'],
  ['其人信有穷凶也', '其人信其穷凶也'], ['固志在三', '固志在一'], ['危至而后求行', '危至而后行'],
  ['枕者，枝而不安之谓也', '枕者，枕枝而不安之谓也'], ['而了讼必辩明也', '而了讼必辩明矣'],
  ['未可上汲养人也', '未可上给养人也'], ['未可上汲養人也', '未可上給養人也'],
];
const F = ['title','short','opening','process','ending','summary'];
const sub = s => { let t = s, n = 0; for (const [a, b] of R) while (t.includes(a)) { t = t.replace(a, b); n++; } return [t, n]; };
const walk = v => { if (typeof v === 'string') { const [t, n] = sub(v); tot += n; return t; } if (Array.isArray(v)) return v.map(walk); if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)])); return v; };
let tot = 0;
for (const item of ['exam', 'interview-pass']) for (let h = 1; h <= 64; h++) {
  const id = String(h).padStart(3, '0'), dir = `sources/editorial/${item}/`;
  const before = tot;
  const src = walk(JSON.parse(fs.readFileSync(dir + `hex-${id}.json`, 'utf8')));
  const polRaw = JSON.parse(fs.readFileSync(dir + `polish-v5/hex-${id}.json`, 'utf8')); const pol = Array.isArray(polRaw) ? polRaw : polRaw.records;
  pol.forEach((r, i) => { r.calculationNotes = walk(r.calculationNotes); const p = {...r.polished}; F.forEach((f, k) => p[f] = src[i][3 + k]);
    if (JSON.stringify(p) !== JSON.stringify(r.polished)) { r.polished = p; r.hashAfter = crypto.createHash('sha256').update(JSON.stringify(p)).digest('hex'); r.changedFields = F.filter(f => r.original[f] !== p[f]).concat((r.changedFields || []).filter(f => !F.includes(f))); } });
  const revRaw = walk(JSON.parse(fs.readFileSync(dir + `review-v2/hex-${id}.json`, 'utf8')));
  if (tot === before) continue;
  fs.writeFileSync(dir + `hex-${id}.json`, JSON.stringify(src, null, 2) + '\n');
  fs.writeFileSync(dir + `polish-v5/hex-${id}.json`, JSON.stringify(polRaw, null, 1) + '\n');
  fs.writeFileSync(dir + `review-v2/hex-${id}.json`, JSON.stringify(revRaw, null, 1) + '\n');
  console.log(item, id, tot - before);
}
console.log('total', tot);
