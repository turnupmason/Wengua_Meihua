// 全领域盘面说法核对（只读）：正文与说明里写到的「某卦/某行 + 旺相休囚死」、「某位生体/克体/比和」，对照本篇排盘。
// 用法：node scripts/review/fact-audit-all.mjs [out.json] [item]
import {readFileSync, readdirSync, writeFileSync} from 'node:fs';
const TRI = {乾:'金',兑:'金',离:'火',震:'木',巽:'木',坎:'水',艮:'土',坤:'土'};
const GEN = {木:'火',火:'土',土:'金',金:'水',水:'木'}, CTL = {木:'土',土:'水',水:'火',火:'金',金:'木'};
const SEASON = {'spring-wood':'木','summer-fire':'火','autumn-metal':'金','winter-water':'水','seasonal-earth':'土'};
const qiOf = (x, m) => x === m ? '旺' : GEN[m] === x ? '相' : GEN[x] === m ? '休' : CTL[x] === m ? '囚' : '死';
const SW = {春:'spring-wood',夏:'summer-fire',秋:'autumn-metal',冬:'winter-water'};
const RE = /([乾兑离震巽坎艮坤])?([金木水火土])?(春|夏|秋|冬|土月|土令|四季)?(?:令|月|天)?(旺|相|休|囚|死)(?![生克同比合对应当关处助反近似接连信识传见貌互依通好守板磕心记息想假去亡刑])/gu;
const ROLE = {本用:'use',用卦:'use',用互:'use_mutual',体互:'body_mutual',变用:'changed_use'};
const RREL = /(本用|用卦|用互|体互|变用)([乾兑离震巽坎艮坤]?[金木水火土]?)(?:[旺相休囚死])?(生体|克体|比和|受体所生|受体所克|为体所克|为体所制|受体所制)/gu;
const RT = {生体:'use_generates_body',克体:'use_controls_body',比和:'equal',受体所生:'body_generates_use',受体所克:'body_controls_use',为体所克:'body_controls_use',为体所制:'body_controls_use',受体所制:'body_controls_use'};
const items = process.argv[3] ? [process.argv[3]] : readdirSync('data/authored-readings', {withFileTypes:true}).filter(d => d.isDirectory()).map(d => d.name);
function walk(v, path, out) { if (typeof v === 'string') out.push([path, v]); else if (Array.isArray(v)) v.forEach(x => walk(x, path, out)); else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { if (!path && (k === 'facts')) continue; if (/sourceEvidence|referenceUrl|sourceRef/.test(k)) continue; walk(x, path ? path + '.' + k : k, out); } }
const res = {};
for (const item of items) {
  const bad = []; let n = 0;
  for (const f of readdirSync(`data/authored-readings/${item}`).filter(f => /^hex-\d{3}\.json$/.test(f))) {
    const j = JSON.parse(readFileSync(`data/authored-readings/${item}/${f}`, 'utf8'));
    for (const r of j.rows ?? []) {
      const m = SEASON[r.monthOrder]; if (!m) continue;
      const rel = Object.fromEntries((r.facts?.directRelations ?? []).map(x => [x.role, x.type]));
      const nodes = Object.fromEntries((r.facts?.nodes ?? []).map(x => [x.role, x]));
      const strs = []; walk(r, '', strs);
      for (const [p, s] of strs) {
        const at = `${f.slice(4,7)}#${r.movingLine}/${r.monthOrder}`;
        const chk = (e, mm, q, all, idx) => { n++; if (qiOf(e, mm) !== q) bad.push({item, at, field:p, kind:'qi', said:all, want:qiOf(e, mm), ctx:s.slice(Math.max(0, idx - 12), idx + all.length + 8)}); };
        const seasonOf = (sea, dflt) => !sea ? dflt : SW[sea] ? SEASON[SW[sea]] : '土';
        // P1：卦/行在前、气在后，如「兑金土相」「巽木冬相」「离火相」
        for (const x of s.matchAll(/([乾兑离震巽坎艮坤])?([金木水火土])?(春|夏|秋|冬|土)?(令|月|天)?(旺|相|休|囚|死)/gu)) {
          const [all, tri, el, sea, suf, q] = x; const after = s.slice(x.index + all.length, x.index + all.length + 1);
          if (!tri && !el) continue;
          if (/[乾兑离震巽坎艮坤金木水火土]/u.test(after)) continue;     // 「休乾旺坎」「死金」式：气属后一卦/行
          if (!tri && el === '土' && /[体用为是属变互的末初]$/u.test(s.slice(0, x.index))) continue; // 「体土相」的土是月令
          if (!tri && el === '土' && (suf === '令' || suf === '月') && !sea) continue; // 「土令相乾」的土是月令
          if (q === '相' && /[生克同比合对应当关处助反近似接连信识传见貌互依通好伤扶和遇处继宜称映配抵承济]/u.test(after)) continue;
          if (q === '死' && /[守板磕心记局路角线结活]/u.test(after)) continue;
          if (q === '休' && /[息想假止戚]/u.test(after)) continue;
          if (q === '旺' && /[时季盛]/u.test(after)) continue;
          if (/[较比如像]$/u.test(s.slice(0, x.index))) continue;
          if (/或[旺相休囚死]|[旺相休囚死]或/u.test(s.slice(x.index, x.index + all.length + 2))) continue; // 跨月份的「旺或相」
          let e = tri ? TRI[tri] : el, sea2 = sea;
          if (tri && el && TRI[tri] !== el) { if (el === '土' && !sea) { sea2 = '土'; } else { bad.push({item, at, field:p, kind:'trigram-element', said:all, ctx:s.slice(Math.max(0, x.index - 12), x.index + all.length + 8)}); continue; } }
          if (!tri && /[行性气类]$/u.test(s.slice(0, x.index))) continue;
          chk(e, seasonOf(sea2, m), q, all, x.index);
        }
        // P2：气在前、卦在后，如「相乾」「土令囚震」「死坎」
        for (const x of s.matchAll(/(春|夏|秋|冬|土)?(令|月)?(旺|相|休|囚|死)([乾兑离震巽坎艮坤])([金木水火土])?/gu)) {
          const [all, sea, suf, q, tri] = x; const before = s.slice(Math.max(0, x.index - 1), x.index);
          if (q === '相' && tri === '离' && !suf) continue;              // 「相离」多为分离义
          if (!sea && /[互变乾兑离震巽坎艮坤体用金木水火土]$/u.test(before)) continue; // 「艮相坎囚」「体死离旺」：气属前一卦
          if (q === '相' && /^[抵承克生合济]/u.test(s.slice(x.index + all.length - 1 + 1, x.index + all.length + 1))) continue;
          chk(TRI[tri], seasonOf(sea, m), q, all, x.index);
        }
        for (const x of s.matchAll(RREL)) {
          const [all, rn, tag, rt] = x; const role = ROLE[rn]; n++;
          if (/[须属入例不]$/u.test(s.slice(Math.max(0, x.index - 1), x.index)) || /^或|之例/u.test(s.slice(x.index + all.length, x.index + all.length + 2))) continue;
          if (rel[role] && rel[role] !== RT[rt]) bad.push({item, at:`${f.slice(4,7)}#${r.movingLine}/${r.monthOrder}`, field:p, kind:'relation', said:all, want:rel[role], ctx:s.slice(Math.max(0, x.index - 10), x.index + all.length + 6)});
          const nd = nodes[role]; if (nd && tag) { const tt = tag.match(/[乾兑离震巽坎艮坤]/u)?.[0], ee = tag.match(/[金木水火土]/u)?.[0]; if ((tt && tt !== nd.trigram) || (ee && ee !== nd.element)) bad.push({item, at:`${f.slice(4,7)}#${r.movingLine}/${r.monthOrder}`, field:p, kind:'role-trigram', said:all, want:nd.trigram + nd.element, ctx:s.slice(Math.max(0, x.index - 10), x.index + all.length + 6)}); }
        }
      }
    }
  }
  res[item] = {claims:n, bad};
}
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(res, null, 1));
for (const [k, v] of Object.entries(res)) { const c = {}; v.bad.forEach(b => c[b.kind] = (c[b.kind] ?? 0) + 1); console.log(k, 'claims', v.claims, 'bad', v.bad.length, JSON.stringify(c)); }
