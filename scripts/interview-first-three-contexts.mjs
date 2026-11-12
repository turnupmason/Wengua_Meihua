import {advice,judgments} from '../sources/editorial/interview-void-first-three-judgments.mjs';
import {createInterviewReading} from '../src/interview-manuscripts.js';
import {getVoidProfileKey} from '../src/prewritten-manuscripts.js';
import {MONTH_ORDERS} from '../src/narrative-rules.js';
import {firstThreeFullTextPath} from './interview-void-full-text.mjs';

const sourcePath = 'sources/editorial/interview-void-first-three-judgments.mjs';
const roles = {body:'原体',use:'本用',body_mutual:'体互',use_mutual:'用互',changed_use:'变用'};
const relationText = {
  equal:'与原体比和', use_controls_body:'克原体', use_generates_body:'直接生原体',
  body_controls_use:'受原体所克', body_generates_use:'受原体所生',
};
const effects = {
  reduced:'作用有所减弱，仍能参与',
  dormant:'作用暂时难以发挥',
  conditional:'虽有生扶，实际作用仍待落实',
};
const bodyPlain = {
  reduced:'准备和配合仍能派上用场，但你能承接的范围有所收窄。',
  dormant:'已有的准备暂时较难施展，问答要等实际条件明朗才容易接下去。',
  conditional:'眼下有一点可以借力的条件，能否把已有准备用上，还要看实际问答怎么接续。',
};
const stages = {use:'开头问答',body_mutual:'中段主要考察',use_mutual:'中段补充核对',changed_use:'收尾核对'};
const stagePlain = {
  equal:'还可以接着谈，双方把细节对到一起要多花些工夫。',
  use_controls_body:'的阻力有所缓和，碰到关键问题时仍要给出依据。',
  use_generates_body:'仍有帮助，可借的支持比原先少一些，宜先用在关键问题上。',
  body_controls_use:'要处理的要求有所缓和，实际能做到哪一步还要说明白。',
  body_generates_use:'需要的投入有所减轻，准备好的内容仍要按对方的实际要求答。',
};
const titleFocus = [
  ['先答实已经准备好的经历','把展示落到可核实的分工','留意前后说法能否对上','试答集中在可验证的一步','讲清强项在什么条件下适用','先收住超出证据的承诺'],
  ['趁早问清细小的疑点','顺着实际经过把步骤答实','把自己承担的事讲到交付','谨慎作答也要说够实绩','把得体表达落到可查的成果','先核对分歧所依据的条件'],
  ['从有把握的职责先补证据','把容易误会的分工解释清楚','先问清题意与必要条件','主动问明实际考察要求','守住有结果可证的一项能力','把反复追问的疑点集中说明'],
];

function reviewFor(base, reading, body, affected) {
  const monthIndex = MONTH_ORDERS.findIndex(m => m.id === base.monthOrder);
  const entry = judgments[base.primaryId-1][base.movingLine-1][monthIndex];
  if (base.primaryId === 1) return entry;
  if (base.primaryId === 2) return entry[body.void.effective === 'reduced' ? 0 : 1];
  if (body.void.effective === 'dormant') return entry[2];
  if (body.void.effective === 'conditional') return entry[3];
  return entry[affected.some(n => n.trigram === '坤') ? 0 : 1];
}

function timingFor(base, judgment, nodes) {
  const slot = base.timing[0];
  if (!slot) return {timing:[], timingOmission:base.timingOmission};
  const node = nodes.get(slot.role);
  const effect = node.void.effective;
  const resultUnsupported = slot.eventScope === 'positive-result-candidate' && !judgment.outcome.startsWith('pass');
  if (effect === 'active' && !resultUnsupported) return {timing:base.timing, timingOmission:undefined};
  const reason = effect === 'active'
    ? '本情境的承接条件不足以立本轮通过的应期，暂不列具体日期。'
    : `原先取期所用的${roles[slot.role]}${node.trigram}${effects[effect]}。该事件目前缺少可沿用的取期依据。`;
  return {
    timing:[],
    timingOmission:{status:'not-derived',reason,sourceIds:[...new Set([...slot.sourceIds,'user-void-extension'])]},
  };
}

function authorContext(base, reading, affected) {
  const nodes = new Map(reading.nodes.map(n => [n.role,n]));
  const body = nodes.get('body');
  const edges = new Map(reading.edges.map(e => [e.targetRole,e.type]));
  const judgment = reviewFor(base,reading,body,affected);
  if (!judgment) throw new Error(`Missing reviewed void judgment: ${base.primaryId}/${base.movingLine}/${base.monthOrder}/${getVoidProfileKey(reading)}`);
  const {outcome,reason} = judgment;
  const favorable = outcome.startsWith('pass');
  const lead = favorable ? '这轮面试仍有望通过。' : '这轮面试通过偏难。';
  const recommendation = advice[base.primaryId-1][base.movingLine-1];
  const title = titleFocus[base.primaryId-1][base.movingLine-1] + (favorable ? '，本轮有望通过' : '，本轮通过偏难');
  const fact = role => {
    const node = nodes.get(role);
    const effect = effects[node.void.effective] ??
      (node.void.state === 'moving_exempt' ? '发动，仍有作用' : node.void.state === 'strong_exempt' ? '旺相有力，仍有作用' : '');
    const relationship = edges.get(role);
    return `${roles[role]}${node.trigram}${node.element}依月令属${node.strength.state}${relationship ? '，'+relationText[relationship] : ''}。${effect ? roles[role]+effect+'。' : ''}`;
  };
  const mainChange = ['changed_use','body_mutual','use_mutual','use'].map(role => nodes.get(role))
    .find(n => n.void.effective === 'reduced');
  const openingChange = bodyPlain[body.void.effective] ?? '';
  const shortChange = mainChange && !(base.primaryId === 2 && body.void.effective === 'reduced')
    ? stages[mainChange.role] + stagePlain[edges.get(mainChange.role)]
    : '';
  const short = lead + openingChange + shortChange + recommendation;
  const appliesTo = (...stageRoles) => affected.some(n => stageRoles.includes(n.role));
  const timing = timingFor(base,judgment,nodes);
  const selected = reading.selectedMovingLine;
  const sourceEvidence = base.sourceEvidence
    .filter(e => timing.timing.length || !base.timing.some(s => s.reason === e.reason))
    .map(e => e.id === 'mh-117' && e.reason === base.counterevidence[0].resolution ? {...e,reason} : e);
  const coreVoidNotes = affected.map(n =>
    `${roles[n.role]}${n.trigram}${n.element}${n.void.matchedBranches.join('、')}位命中，${n.void.label}。`);
  const {xunHead} = body.void.xun;
  const resultAlreadyStated = favorable
    ? /通过机会|有望(?:慢成|通过)/u.test(reason)
    : /本轮.{0,6}偏难|通过.{0,5}(?:偏难|仍难)|通过的依据仍弱/u.test(reason);
  return {
    ...base,...timing,outcome,title,short,castingDate:reading.castingDate,baseNoVoid:false,
    voidScenario:{xun:xunHead,origin:'first-three-reviewed-calendar-coverage'},
    opening:appliesTo('body','use') ? fact('body')+fact('use') : base.opening,
    process:appliesTo('body','body_mutual','use_mutual') ? fact('body_mutual')+fact('use_mutual') : base.process,
    ending:fact('changed_use') + `${selected.label}爻辞为“${selected.text}”` + reason + (resultAlreadyStated ? '' : lead),
    summary:lead+recommendation,
    sourceEvidence,coreVoidNotes,
    lineApplication:{...base.lineApplication,scenarioPath:sourcePath},
    counterevidence:[{fact:coreVoidNotes.join(' '),resolution:reason}],
    decisionPolicy:{...base.decisionPolicy,id:'reviewed-void-context'},
    authorship:{
      method:'reviewed-void-judgment-with-computed-stage-facts',version:'interview-void-first-three-1.0.0',
      sourcePath,manualWholeArticleReview:false,reviewedJudgment:true,
    },
  };
}

export function renderFirstThreeVoidReview(rows) {
  const reviewed = rows.filter(r => r.voidScenario?.origin === 'first-three-reviewed-calendar-coverage');
  const judgmentCount = new Set(reviewed.map(r => r.counterevidence[0].resolution)).size;
  const lines = [
    '# 乾、坤、屯面试断语旬空复核', '',
    '**[直接阅读 90 条基础稿和 353 份旬空情境稿](INTERVIEW_VOID_FULL_TEXT.md)**', '',
    `90 条基础断语对应 216 个月令入口。补齐 ${reviewed.length} 个精确取稿状态，共 ${judgmentCount} 个情境判断。仅配支命中或日扶记录不同、实际作用及判断相同的状态可共用断语。日序和实际命中各自保存。`,
    '',
    '同一旬内的日支可影响静空位置是否得扶。半空保留定性减力，发动、旺相和原体承接分别说明。应期仍以实际起卦日换算；原稿取期节点减力、静待或通过依据不足时，详列暂缓取期的原因。',
    '',
    '代表日用于复现状态，月令为显式输入。点击稿号跳到全文，展开对应的旬空稿。稿号也对应各卦 JSON 中的 `number`。', '',
    '[逐案判断来源](../sources/editorial/interview-void-first-three-judgments.mjs) · [两年回放](../scripts/replay-interview-calendar.mjs)', '',
  ];
  for (const id of [1,2,3]) {
    lines.push(`## ${['乾为天','坤为地','水雷屯'][id-1]}`, '',
      `[基础正文](interview-pass/hex-00${id}.md) · [稿件 JSON](../data/authored-readings/interview-pass/hex-00${id}.json)`, '',
      '| 稿号 | 动爻与月令 | 代表日与旬首 | 影响位置 | 判断与理由 | 应期 |',
      '| --- | --- | --- | --- | --- | --- |');
    for (const row of reviewed.filter(r => r.primaryId === id)) {
      const result = row.decision.outcomeCode.startsWith('pass') ? '有望通过' : '通过偏难';
      const timing = row.timingSlots.length
        ? row.timingSlots.map(s => `${s.event}，取${s.branches.join('、')}日`).join('。')
        : row.timingOmission.reason;
      const fullText = firstThreeFullTextPath(id,row.movingLine)+`#manuscript-${row.number}`;
      lines.push(`| [${row.number}](${fullText}) | ${row.facts.movingLine.label} · ${row.monthBranches.join('')} | ${row.facts.referenceContext.castingDate} · ${row.voidScenario.xun} | ${row.coreVoidNotes.join('')} | ${result}。 ${row.counterevidence[0].resolution} | ${timing} |`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

export function authorFirstThreeVoidContexts({library,question,baseManuscripts}) {
  const manuscripts = baseManuscripts.filter(a => a.primaryId <= 3);
  if (manuscripts.length !== 90) throw new Error('Expected all 90 Qian, Kun and Tun base manuscripts');
  const examples = Array.from({length:60},(_,i) => new Date(Date.UTC(2027,0,i+1)).toISOString().slice(0,10));
  return manuscripts.flatMap(base => {
    const byProfile = new Map();
    for (const castingDate of examples) {
      const {primaryId,movingLine,monthOrder} = base;
      const reading = createInterviewReading({library,question,primaryId,movingLine,monthOrder,castingDate});
      const affected = reading.nodes.filter(n => n.role !== 'body_inherited' && n.void.effective !== 'active');
      if (affected.length === 0) continue;
      const key = getVoidProfileKey(reading);
      if (!byProfile.has(key)) byProfile.set(key,authorContext(base,reading,affected));
    }
    return [...byProfile.values()];
  });
}
