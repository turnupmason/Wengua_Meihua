// 定稿口径一遍补判的逐卦清单：把每篇该查的点事先算好，供一名工作者一次做完。只读，不改稿。
// 用法：node scripts/review/final-packet.mjs <问项目录> <卦序>
import {readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const {adjust} = require('./indirect-test.cjs');
const {tierFinal, verdictFinal} = require('./policy-final.cjs');
const LOVE_ITEMS = new Set(['relationship-reconciliation','relationship-establishment','new-relationship-opportunity','confession-decision']);
const [item, hexArg] = process.argv.slice(2);
const id = String(Number(hexArg)).padStart(3, '0');
const read = async p => existsSync(p) ? JSON.parse(await readFile(p, 'utf8')) : null;
const src = await read(`sources/editorial/${item}/hex-${id}.json`);
const shard = await read(`data/authored-readings/${item}/hex-${id}.json`);
const rev = await read(`sources/editorial/${item}/review-v2/hex-${id}.json`) ?? [];
const pol = await read(`sources/editorial/${item}/polish-v5/hex-${id}.json`) ?? [];
const T = {favourable:'F', conditional:'C', difficult:'D'}, N = {F:'成', C:'有条件', D:'不成'};
const P = ['use','body_mutual','use_mutual','changed_use'], ROLE = {use:'本用', body_mutual:'体互', use_mutual:'用互', changed_use:'变用'};
const strong = q => q === '旺' || q === '相';
const DOWN = /凶|吝|灾|眚|无攸利|勿用|不食|大败|舆尸|不克征|无成|往不胜|不克讼|丧其资斧|号咷|不育/u, UP = /元吉|大吉|无不利|用拯马壮/u;
const out = [];
const byLine = {};
for (const [i, d] of src.entries()) {
  const r = shard.rows.find(x => x.movingLine === d[0] && x.monthOrder === d[1]);
  const fx = {n:Object.fromEntries(r.facts.nodes.map(x => [x.role, x.trigram + x.element + x.qi])), rel:Object.fromEntries(r.facts.directRelations.map(x => [x.role, x.type])), text:r.facts.movingLine.fullText};
  const t = verdictFinal(fx, Number(hexArg), r.facts.stages.at(-1).id, LOVE_ITEMS.has(item)), a = adjust(fx), cur = T[d[2]];
  const flags = [];
  // 1. 定档提示：初判与现结论不同，且不能用爻辞一档解释的，必须复判。
  const text = r.facts.movingLine.fullText.replace(/[^\p{Script=Han}]/gu, '');
  const ord = {D:0, C:1, F:2};
  const lineDown = DOWN.test(text) && !/终吉|贞吉/u.test(text), lineUp = UP.test(text);
  if (cur === 'C') flags.push(`定档：现结论为有条件，必须改为成或不成。二分初判${N[t.t]}（${t.why}）` + (lineDown ? '；爻辞有降档之辞，核象意是否落在结果上（落在则为不成）' : '') + (lineUp ? '；爻辞有升档之辞，核升档条件' : '') + '。');
  else if (cur !== t.t) flags.push(`定档：二分初判${N[t.t]}（${t.why}），现结论${N[cur]}。` + (cur === 'F' ? (lineUp ? '现为成，须爻辞升档条件成立，否则改不成。' : '爻辞无升档之辞，改为不成，除非有其他古籍依据。') : (lineDown ? '现为不成，须爻辞象意落在结果上，否则改为成。' : '爻辞无降档之辞，改为成，除非有其他古籍依据。')));
  // 2. 轻重写法：调整后强弱与原五态分档不同的处所，正文轻重要对。
  const strength = [];
  for (const k of P) {
    const rel = fx.rel[k]; if (!['use_controls_body','use_generates_body'].includes(rel)) continue;
    const raw = fx.n[k].slice(-1), adj = a.n[k].slice(-1);
    const was = strong(raw) ? '有力' : raw === '休' ? '休' : '无气', now = strong(adj) ? '有力' : '无气';
    const label = `${ROLE[k]}${fx.n[k].slice(0, 2)}${rel === 'use_controls_body' ? '克体' : '生体'}`;
    // 已按 V2.1 处理过（review-v2 有 v21 字段）的间接作用不再列，只列休按无气论这一项。
    const v21Done = Boolean(rev[i]?.v21);
    if ((was !== now && !(v21Done && adj !== raw)) || (raw === '休' && adj === raw)) strength.push(`${label}：月令${raw}${adj !== raw ? `，间接作用后按${adj === '旺' ? '有力' : '无气'}论（${a.notes.find(n => n.startsWith(k)) ?? ''}）` : '，休按无气论'}`);
  }
  if (strength.length) flags.push('轻重：' + strength.join('；') + '。正文、第 10 栏、计算说明的轻重要与此相合。');
  // 3. 应期：难档不用变用吉应。
  const timing = Array.isArray(d[10]) ? d[10] : [];
  if (cur === 'D' || t.t === 'D') for (const sp of timing)
    if (Array.isArray(sp) && ['support','equal','name-support','name-body'].includes(sp[0]) && sp[1] === 'changed_use') flags.push('应期：判难（或将判难）却取变用吉应，按边界第 9 条改为过程事件。');
  for (const sp of timing) if (Array.isArray(sp) && sp[0] === 'name-support' && d[2] !== 'favourable') flags.push('应期：结果日（name-support）只用于判成的篇；改判不成的，改为过程事件。');
  // 4. 计算说明引文
  const notes = (pol[i]?.calculationNotes ?? []).join('；');
  if (/《时令之应》/u.test(notes)) flags.push('引文：篇名应为《复明时令之应》（原书 654 行标题）。');
  if (/《占卦诀》[^；]{0,6}「?变卦克体|《占卦诀》[^；]{0,6}「?变生体/u.test(notes)) flags.push('引文：「变卦克体……变生体及比和」出自《体用互变之诀》（795 行起），不是《占卦诀》。');
  if (/《体用衰旺之诀》[^；]{0,8}「?生体之卦气亦宜旺/u.test(notes)) flags.push('引文：「生体之卦气亦宜旺」出自《衰旺论》（688 行）。');
  if (/内外并无生体/u.test(notes) && !/订正/u.test(notes)) flags.push('引文：「内外并无生体」是项目订正本文字（docs/EDITORIAL.md），要注「据订正本」或改引别句。');
  const bq = fx.n.body.slice(-1);
  if (bq === '相' && /体[^；，。]{0,4}旺|乘旺/u.test(notes) && !/旺相/u.test(notes)) flags.push('引文：体为相，不能写成旺，写「体有力（旺相）」。');
  if (/盲断|主审|作者|裁定|复核|原稿|改判|R\d|待核/u.test(notes)) flags.push('计算说明含禁用词。');
  // 5. 记录内部一致
  const rr = rev[i];
  if (rr && rr.newOutcome !== d[2]) flags.push('记录：review-v2 newOutcome 与作者源不一致。');
  if (rr && /升一档/u.test(rr.lineReading ?? '') && !(ord[cur] > ord[t.t])) flags.push('记录：lineReading 写升一档，结论却没升，核对文字。');
  (byLine[d[0]] ||= []).push({i, qi:d[1], lr:rr?.lineReading ?? ''});
  out.push({index:i, key:rr?.key ?? `${item}/${hexArg}/${d[0]}/${d[1]}`, line:r.facts.movingLine.label, qi:d[1], current:N[cur], tier:N[t.t], why:t.why,
    nodes:Object.fromEntries(Object.entries(a.n).map(([k, v]) => [k, v])), lineText:r.facts.movingLine.fullText, flags});
}
for (const [line, arr] of Object.entries(byLine)) {
  const land = arr.map(a => /不落|未落|不正对|非正对|并非正对|不直指|未言/u.test(a.lr) ? '不落' : /落在|正对|直指|落到/u.test(a.lr) ? '落' : '?');
  if (new Set(land.filter(x => x !== '?')).size > 1) for (const a of arr) out[a.i].flags.push(`同爻跨月：第 ${line} 爻五个月令对爻辞落不落在结果上读法不一（${arr.map((x, j) => x.qi + ':' + land[j]).join(' ')}），统一读法。`);
}
console.log(JSON.stringify({item, hex:Number(hexArg), boards:out, flagged:out.filter(o => o.flags.length).length}, null, 1));
