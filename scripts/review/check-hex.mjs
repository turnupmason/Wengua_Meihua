// Read-only check of one rewritten author file against the build gates, plus the V2 review rules
// (plain wording in user-facing text, cross-file duplicate sentences, review record completeness).
// Usage: node scripts/review/check-hex.mjs <item-dir> <hex> [--polish]
import {readFile, readdir} from 'node:fs/promises';
import {loadLibrary} from '../../src/index.js';
import {validateStoryCopy} from '../../src/story-editorial.js';
import {checkInterviewShort} from '../../src/interview-decision-checks.js';
import {createContextualReading, promotionTimingSlots, EXAM_PROFILE, INTERVIEW_V3_PROFILE, PROMOTION_V3_PROFILE, isExamLike, PROMOTION_PAY_PROFILE, JOB_CHANGE_PROFILE,
 WORKPLACE_STABILITY_PROFILE, WORKPLACE_PROBATION_PROFILE, NEW_RELATIONSHIP_OPPORTUNITY_PROFILE, CONFESSION_DECISION_PROFILE,
 RELATIONSHIP_ESTABLISHMENT_PROFILE, RELATIONSHIP_RECONCILIATION_PROFILE} from '../../src/interview-manuscripts.js';
import {MONTH_SLOTS} from '../../src/month-slots.js';
import {PRODUCT_TAXONOMY} from '../../sources/editorial/product-taxonomy.mjs';

const [item, hexArg, flag] = process.argv.slice(2);
const profiles = {exam:EXAM_PROFILE, 'interview-pass':INTERVIEW_V3_PROFILE, 'promotion-pay':PROMOTION_V3_PROFILE, 'job-change':JOB_CHANGE_PROFILE,
 'workplace-stability':WORKPLACE_STABILITY_PROFILE, 'workplace-probation':WORKPLACE_PROBATION_PROFILE,
 'new-relationship-opportunity':NEW_RELATIONSHIP_OPPORTUNITY_PROFILE, 'confession-decision':CONFESSION_DECISION_PROFILE,
 'relationship-establishment':RELATIONSHIP_ESTABLISHMENT_PROFILE, 'relationship-reconciliation':RELATIONSHIP_RECONCILIATION_PROFILE};
const outcomes = {exam:['favourable','conditional','difficult'], 'interview-pass':['favourable','difficult'], 'promotion-pay':['favourable','difficult'],
 'workplace-probation':['favourable','conditional','difficult'], 'workplace-stability':['stable','watch','strained'],
 'job-change':['stay','verify','prepare','switch']};
const profile = profiles[item];
if (!profile) throw new Error('Unknown item ' + item);
const allowed = outcomes[item] ?? ['favourable','conditional','difficult'];
const stem = 'hex-' + String(Number(hexArg)).padStart(3, '0');
const dir = 'sources/editorial/' + item + '/';
const drafts = JSON.parse(await readFile(dir + stem + '.json', 'utf8'));
const polishRecs = await readFile(dir + 'polish-v5/' + stem + '.json', 'utf8').then(JSON.parse).catch(() => null);
const library = await loadLibrary();
const questions = PRODUCT_TAXONOMY.flatMap(c => c.subcategories.flatMap(s => s.questions.map(q => ({...q, id:c.id + '.' + q.id}))));
const question = questions.find(q => q.id === profile.questionId);
const orders = ['spring-wood','summer-fire','autumn-metal','winter-water','seasonal-earth'];
const isPromotion = profile === PROMOTION_PAY_PROFILE;
const errors = [], warnings = [];
const han = s => s.match(/\p{Script=Han}/gu)?.length ?? 0;
// Calculation shorthand belongs in the resolution column and the generated calculation notes.
const JARGON = [/(?<!互)[旺相休囚死][乾兑离震巽坎艮坤]/u, /[乾兑离震巽坎艮坤][金木水火土]/u, /体互|用互|(?<!改)变用|(?<![基根])本用|原体|变卦|互卦|本卦/u,
 /[春夏秋冬土]令/u, /[寅卯辰巳午未申酉戌亥子丑](?:月|、[寅卯辰巳午未申酉戌亥子丑])/u, /(?<![学])生体|克体|(?<![具整])体克|(?<![具整])体生|比和|旺相|休囚/u, /判断口径|反证|(?<!选)取难|(?<!选)取吉|翻吉|翻难/u];
const STOCK = [/整体来看/u, /仍有一定的发展空间/u, /虽然有阻碍，但也有转机/u, /帮助能够起作用/u, /协调余地/u, /耐心等待，积极沟通/u, /最后仍需结合实际/u, /需要综合考虑/u];
const VOICE = [/不[^，。；]{1,12}，也不/u];

if (drafts.length !== 30) errors.push('需要 30 篇');
const timingJson = isPromotion ? JSON.parse(await readFile(dir + 'timing.json', 'utf8')) : null;
for (const [i, d] of drafts.entries()) {
 const [movingLine, monthOrder, outcome, title, short, opening, process, ending, summary, resolution, topicDetail] = d;
 const key = `${hexArg}/${movingLine}/${monthOrder}`;
 const err = m => errors.push(key + ': ' + m), warn = m => warnings.push(key + ': ' + m);
 if (movingLine !== Math.floor(i / 5) + 1 || monthOrder !== orders[i % 5]) err('爻位或月令顺序不对');
 if (!allowed.includes(outcome)) err('结论码不在 ' + allowed.join('/'));
 if (!resolution) err('第十栏复核依据为空');
 if (isPromotion && (outcome === 'favourable') !== Boolean(topicDetail)) err('晋升：只有 favourable 写薪资随岗说明');
 const decisionId = 'x/' + outcome;
 try {
  validateStoryCopy({decision:{id:decisionId}, copy:{title, short:{decisionId, text:short}, long:{decisionId, opening, process, ending, summary}},
   lineApplication:{evidence:['x'], conditions:[resolution]}, counterevidence:[{fact:'x', resolution}]});
  checkInterviewShort(short);
  if (!isPromotion && (han(short) < 60 || han(short) > 120)) err('简断需 60–120 个汉字，现 ' + han(short));
 } catch (e) { err(e.message); }
 for (const [field, value] of Object.entries({title, short, opening, process, ending, summary})) {
  for (const re of JARGON) if (re.test(value)) err(`${field} 含计算用语 ${value.match(re)[0]}`);
  for (const re of STOCK) if (re.test(value)) err(`${field} 含套话 ${value.match(re)[0]}`);
  for (const re of VOICE) if (re.test(value)) warn(`${field} 含「不…，也不…」句式`);
 }
 if (item === 'interview-pass' || item === 'promotion-pay') {
  const EXAMW = item === 'promotion-pay' ? /考试|考场|考生|卷面|卷尾|卷首|全卷|试卷|卷子|阅卷|合格线|及格|分数|得分|扣分|丢分|拿分|保分|交卷|答卷|考题|放榜|过线|面试官|面试/u : /考试|考场|考生|卷面|试卷|卷子|阅卷|合格线|及格|分数|得分|扣分|丢分|拿分|保分|交卷|答卷|考题/u;
  const all = [title, short, opening, process, ending, summary, resolution, JSON.stringify(topicDetail ?? ''), d[11] ?? '', ...(polishRecs?.[i]?.calculationNotes ?? [])].join('');
  if (EXAMW.test(all)) err('稿件含他项用语 ' + all.match(EXAMW)[0]);
 }
 if (profile.payDetail) {
  const pay = d[11] ?? '';
  if ((outcome === 'favourable') !== Boolean(pay)) err('晋升：能升的篇须写随岗薪资说明（第 12 栏），升不了的篇不写');
  for (const re of JARGON) if (pay && re.test(pay)) err('薪资说明含计算用语 ' + pay.match(re)[0]);
  if (pay && /\d+\s*%|百分之|\d+元|\d+万/u.test(pay)) err('薪资说明不写具体比例或金额');
 }
 // Event and display text of a timing declaration is read by users too.
 if (Array.isArray(topicDetail)) for (const spec of topicDetail) for (const value of [spec?.[2], spec?.[3]]) for (const re of JARGON) if (typeof value === 'string' && re.test(value)) err(`应期事件文字含计算用语 ${value.match(re)[0]}`);
 const monthBranches = MONTH_SLOTS.filter(s => s.qi === monthOrder).map(s => s.branch);
 const r = createContextualReading({library, question, primaryId:Number(hexArg), movingLine, monthBranch:monthBranches[0], castingDate:'2026-11-11', applyVoid:false});
 const timingSelection = isPromotion ? timingJson?.[Number(hexArg)]?.[movingLine - 1]?.[1]?.[i % 5] : topicDetail;
 if (!timingSelection?.length) { err('缺应期声明（数组或无期说明）'); continue; }
 if (typeof timingSelection !== 'string') {
  const specs = isPromotion ? timingSelection.map(k => timingJson[Number(hexArg)][movingLine - 1][0][k]) : timingSelection;
  if ((isExamLike(profile) || profile.namedStageEvents) && specs.length > 1) err('每篇至多一个日级事件');
  if ([NEW_RELATIONSHIP_OPPORTUNITY_PROFILE, CONFESSION_DECISION_PROFILE, RELATIONSHIP_ESTABLISHMENT_PROFILE, RELATIONSHIP_RECONCILIATION_PROFILE].includes(profile) && specs.some(s => !['support','control','equal'].includes(s[0]))) err('感情问项只取 support/control/equal');
  if ([WORKPLACE_STABILITY_PROFILE, JOB_CHANGE_PROFILE].includes(profile) && specs.some(s => !['support','control','drain','equal'].includes(s[0]))) err('只取 support/control/drain/equal');
  try { promotionTimingSlots(r, specs, outcome, profile); } catch (e) { err('应期声明不合：' + e.message + '（kind 必须与该位置对原体的关系一致；name-support/name-body 只用于 favourable）'); }
 }
 if ((isPromotion || isExamLike(profile) || profile === WORKPLACE_PROBATION_PROFILE) && outcome === 'favourable' &&
  r.edges.find(e => e.targetRole === 'use').type === 'use_controls_body' && !r.edges.some(e => e.type === 'use_generates_body')) err('本用克体且无生体，不能 favourable');
}
// Sentence-level duplicates inside this file and against every other author file of the item.
const norm = s => s.replace(/[^\p{Letter}\p{Number}]/gu, '');
const seen = new Map();
const files = (await readdir(dir)).filter(n => /^hex-\d{3}\.json$/.test(n)).sort();
for (const name of files) {
 const other = name === stem + '.json' ? drafts : JSON.parse(await readFile(dir + name, 'utf8'));
 for (const d of other) for (const value of d.slice(3, 9)) for (const sentence of String(value).split(/[。！？]/u)) {
  if (han(sentence) < 12) continue;
  const k = norm(sentence);
  if (!seen.has(k)) seen.set(k, []);
  seen.get(k).push(name.slice(4, 7) + '/' + d[0] + '/' + d[1]);
 }
}
for (const [k, where] of seen) if (where.length > 1 && where.some(w => w.startsWith(stem.slice(4)))) errors.push('重复句：' + k.slice(0, 30) + ' · ' + where.join(', '));
// Review record (stage 2) or polish record (stage 3).
const recordDir = flag === '--polish' ? 'polish-v5/' : 'review-v2/';
let original = null;
try { const {execFileSync} = await import('node:child_process'); original = JSON.parse(execFileSync('git', ['show', 'HEAD:' + dir + stem + '.json'], {encoding:'utf8', maxBuffer:1 << 26})); } catch { original = null; }
try {
 const records = JSON.parse(await readFile(dir + recordDir + stem + '.json', 'utf8'));
 if (records.length !== 30) errors.push(recordDir + ' 记录需 30 条');
 for (const [i, rec] of records.entries()) {
  const d = drafts[i];
  if (flag === '--polish') {
   if (!rec.key || !rec.original || !rec.polished || !rec.hashBefore || !rec.hashAfter || rec.status !== 'POLISH_COMPLETED') errors.push(`润色记录 ${i} 不完整`);
   if (rec.outcome !== d[2]) errors.push(`润色记录 ${i} 结论与稿件不一致`);
   if (rec.textFinal) {
    // 文字终修硬性要求（docs/review/TEXT_FINAL_BRIEF.md）
    const HEDGE = /有条件|有望|偏难|多半|大概率|过线有机会|能不能过|过不过|成败两可|两可|或许|未必|恐怕|把握不大|把握较大|把握不小|机会不小|希望很大|希望不大|胜算|可能性|难过线|很难过|难以过/u;
    const PASS = /能过|过得了|过得去|可以过|会过|拿得下|拿下|顺利通过|能通过|能过关|过关|能合格|稳过|过线不难|能过线|可以过线|过得了线|考得过|通过这一场|这一关能过|能被录用|会被录用|录用你|拿得到这个岗位|过得了这一关|通过这一轮|这一轮能过|能进下一轮|拿到这个岗位|能升上去|这次能升|能晋升|晋升能落定|升得上去|职级能动|能升职|升职能成/u;
    const FAIL = /过不了|不能过|过不去|没法过|无法过|不会过|过不了线|够不上|达不到|拿不下|过线无望|没能过|考不过|合格不了|过不去线|这次不过|还差一截|还差一口气|还差几分|离合格线还差|离线还差|差在线下|落在线下|落到线下|够不到线|够不着线|没够上线|没能过线|还没到线|未到合格线|差一点到线|差几分到线|停在线下|压在线下|没上线|上不了线|差着几分|还欠一截|还欠几分|离那条线|没摸到线|线下还差|还差半截|差了一口气|还差一步|差了一步|差一步|这一轮没过|没过这一轮|止步这一轮|没能进下一轮|没被选上|没选上|落选|未能录用|没被录用|没等到录用|没拿到这个岗位|这回没成|这次没成|升职还差一步|这次还没轮到|这次轮不到|还没轮到你|没升上去|职级没动|职级这次没动|晋升没落定|这次没升成|没能晋升|升职这回没成|晋升这回没成/u;
    const [, , , ttl, sh, op, pr, en, su] = d;
    const head2 = String(sh).split(/[。！？]/u).filter(Boolean).slice(0, 2).join('。');
    const want = d[2] === 'favourable' ? PASS : FAIL;
    if (HEDGE.test(sh + su)) errors.push(`稿件 ${i} 简断或总断含含糊口气：${(sh + su).match(HEDGE)[0]}`);
    if (!want.test(head2)) errors.push(`稿件 ${i} 简断前两句未明说结论`);
    if (!want.test(su)) errors.push(`稿件 ${i} 总断未明说结论`);
    if (/有条件|口径|生体|克体|旺相|休囚|定档|体用/u.test([ttl, sh, op, pr, en, su].join(''))) errors.push(`稿件 ${i} 正文含内部用语`);
    if (/^(初|二|三|四|五|上)?[九六一二三四五]?(爻)?[^，。]{0,4}(说|讲|写|道)[：，「“]/u.test(en) && /^[^，。]{0,6}(说|讲)/u.test(en)) errors.push(`稿件 ${i} 结局以「某爻说」起句`);
    if (/^(中段|中间)/u.test(pr)) errors.push(`稿件 ${i} 过程以「中段/中间」起句`);
    if (/^(开头|开场|开卷|开局|起步|起手|一开)/u.test(op)) errors.push(`稿件 ${i} 开局以固定词起句`);
    if (/^(这一场|这场|这次|这回)/u.test(sh)) errors.push(`稿件 ${i} 简断以「这一场/这次」起句`);
    if (/放到考场上/u.test([op, pr, en, su].join(''))) errors.push(`稿件 ${i} 用「放到考场上」接话`);
   }
   const notes = rec.calculationNotes;
   if (!Array.isArray(notes) || notes.length < 3 || notes.length > 5) errors.push(`润色记录 ${i} 须有 3–5 行 calculationNotes`);
   else {
    if (!/^(定档|判断)：/.test(notes[0]) || !notes.some(n => /^旺衰：/.test(n)) || !notes.some(n => /^爻辞：/.test(n))) errors.push(`润色记录 ${i} calculationNotes 须含 判断、旺衰、爻辞 三行`);
    // 文字终修后：计算说明不得出现内部用语（档、本馆、上传本、底本、不列日期）
    if (rec.textFinal && notes.some(n => /档|本馆|上传本|底本|不列日期|有条件|存疑|口径/u.test(n))) errors.push(`润色记录 ${i} 计算说明含内部用语`);
    for (const n of notes) {
     if (han(n) > 90) errors.push(`润色记录 ${i} 计算说明一行超过 90 字`);
     if (/盲断|主审|作者|裁定|复核|原稿|改判|第\s*\d+\s*条|R\d|待核/.test(n)) errors.push(`润色记录 ${i} 计算说明含审稿用语：${n.slice(0, 20)}`);
    }
   }
  } else {
   for (const f of ['key','oldOutcome','newOutcome','changed','reason','evidenceFor','evidenceAgainst','lineReading','timing','status'])
    if (rec[f] === undefined || rec[f] === '') errors.push(`复核记录 ${i} 缺 ${f}`);
   if (!['passed','pending-dispute'].includes(rec.status)) errors.push(`复核记录 ${i} status 只能是 passed 或 pending-dispute`);
   if (rec.status === 'pending-dispute' && !rec.dispute) errors.push(`复核记录 ${i} 待核须写 dispute`);
   if (original && rec.oldOutcome !== original[i]?.[2]) errors.push(`复核记录 ${i} oldOutcome 与 git HEAD 原稿 ${original[i]?.[2]} 不符`);
   if (original && rec.changed !== (rec.oldOutcome !== rec.newOutcome)) errors.push(`复核记录 ${i} changed 与新旧结论不符`);
   if (rec.newOutcome !== d[2]) errors.push(`复核记录 ${i} 新结论与稿件不一致`);
  }
 }
} catch (e) { errors.push('缺记录文件 ' + dir + recordDir + stem + '.json'); }
console.log(JSON.stringify({item, hex:Number(hexArg), errors, warnings}, null, 1));
process.exitCode = errors.length ? 1 : 0;
