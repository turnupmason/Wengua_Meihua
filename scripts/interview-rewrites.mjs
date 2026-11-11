import {readdir} from 'node:fs/promises';
import {INTERVIEW_QUESTION_ID} from '../src/interview-manuscripts.js';
import {MONTH_ORDERS} from '../src/narrative-rules.js';

export const REWRITE_VERSION = 'interview-pass-2.1.0';
export const REWRITE_METHOD = 'individually-rewritten-and-reviewed';
const directory = new URL('../sources/editorial/interview-rewrites/', import.meta.url);
const sourceDirectory = 'sources/editorial/interview-rewrites/';
const draftKey = ({primaryId, movingLine, monthOrder}) => `${primaryId}/${movingLine}/${monthOrder}`;
const fameClauses = {
  equal: '体用比和，功名称意。',
  body_controls_use: '体克用，名可成，但成迟。',
  use_controls_body: '用克体，名不可成。',
  use_generates_body: '用生体，名易成，或因名有得。',
  body_generates_use: '体生用，名不可就，或因名有丧。',
};

export async function loadInterviewRewrites() {
  const rewrites = new Map();
  for (const filename of (await readdir(directory)).sort()) {
    if (!/^hex-\d{3}\.mjs$/.test(filename)) continue;
    const {default: batch} = await import(new URL(filename, directory).href);
    const {questionId, primaryId, rows, lineApplications} = batch;
    if (questionId !== INTERVIEW_QUESTION_ID || primaryId < 1 || primaryId > 64 ||
        filename !== `hex-${String(primaryId).padStart(3, '0')}.mjs`) {
      throw new Error(`Invalid interview rewrite batch: ${filename}`);
    }
    for (const row of rows) {
      const key = draftKey({...row, primaryId});
      const lineApplication = lineApplications[row.movingLine];
      const prose = [row.title, row.short, row.opening, row.process, row.ending, row.summary];
      if (rewrites.has(key) || !Number.isInteger(row.movingLine) || row.movingLine < 1 || row.movingLine > 6 ||
          !MONTH_ORDERS.some(order => order.id === row.monthOrder) || !lineApplication ||
          !['not-pass-this-round', 'pass-with-conditions'].includes(row.outcome) ||
          prose.some(p => typeof p !== 'string' || !p.trim() || p.includes('*')) || !row.counterevidence ||
          (row.timing ? !row.timing.reason || !row.timing.event || !row.timing.suffix ||
            !['control', 'support', 'body-period'].includes(row.timing.kind) || row.timingOmission : !row.timingOmission)) {
        throw new Error(`Invalid or duplicate interview rewrite: ${key}`);
      }
      rewrites.set(key, {...row, primaryId, lineApplication, sourcePath: `${sourceDirectory}${filename}`});
    }
  }
  return rewrites;
}

// Only provenance and storage fields are assembled here. The verdict, prose, rebuttal,
// event wording, and decision to omit a date come from the complete author source.
export function bindInterviewRewrite(library, reading, draft) {
  const excerpt = (id, quote, reason) => {
    const section = library.getSection(id);
    if (!section.text.includes(quote)) throw new Error(`Interview source excerpt mismatch: ${id}`);
    return {id, title: section.title, quote, locator: section.sourceRef, reason};
  };
  const selected = reading.selectedMovingLine;
  const relation = role => reading.edges.find(edge => edge.targetRole === role).type;
  const end = relation('changed_use');
  const uses = [
    excerpt('mh-056', '成卦之后先看《周易》爻辞，以断吉凶。', draft.lineApplication),
    excerpt('mh-071', fameClauses[relation('use')], '依本卦体用关系判初期。此处求名只类推本轮考察的结果。'),
    excerpt('mh-117', '用为占之即应，互为中间之应，变为事占之终应。', draft.counterevidence),
    excerpt('mh-119', '凡体卦宜乘旺，克体之卦宜衰。', '以同一五态评估体与各阶段，旺衰影响实际承接。'),
  ];
  if (end === 'body_controls_use') {
    uses.push(excerpt('mh-071', fameClauses[end], '说明末后可主动处理以及落实偏慢，实际能否处理依体用盛衰和爻意。'));
  }
  if (end === 'use_controls_body') {
    uses.push(excerpt('mh-117', '变卦克体，事于末后，必有不吉。', '收尾确有牵制。结合原体承接和前中段支持，分别判定对本轮结果的影响。'));
  }
  if (end === 'use_generates_body') {
    uses.push(excerpt('mh-117', '变生体及比和，则事事临终有吉利。', '末后直接生体，可支持转机。实际能否改变结果依生体旺衰与前中段条件。'));
  }
  const timing = draft.timing ? [bindTiming(draft.timing, excerpt, uses)] : [];
  const timingOmission = draft.timingOmission ? {
    status: 'not-derived',
    reason: draft.timingOmission,
    sourceIds: ['mh-071'],
  } : undefined;
  if (timingOmission) {
    uses.push(excerpt('mh-071', '欲知名成之日，生体之卦气详之。', timingOmission.reason));
  }
  const sourceIds = [...new Set(uses.map(source => source.id))];
  return {
    ...draft,
    sourceIds: [...sourceIds, selected.sourceRef.sourceId, 'user-void-extension', 'user-void-timing'],
    sourceEvidence: uses,
    lineApplication: {evidence: [selected.text], conditions: [draft.lineApplication], sourcePath: draft.sourcePath},
    counterevidence: [{fact: 'facts.directRelations; facts.nodes; facts.movingLine', resolution: draft.counterevidence}],
    decisionPolicy: {
      id: 'individual-interview-rewrite', sourceIds,
      scope: 'project-interview-stage-application;case-specific',
    },
    timing,
    timingOmission,
    voidRelease: [],
    baseNoVoid: true,
    authorship: {method: REWRITE_METHOD, version: REWRITE_VERSION, sourcePath: draft.sourcePath, manualWholeArticleReview: true},
  };
}

function bindTiming(spec, excerpt, uses) {
  const control = spec.kind === 'control';
  const support = spec.kind === 'support';
  const stage = {use: 'opening', body_mutual: 'process', use_mutual: 'process'}[spec.role] || 'closing';
  const basis = control
    ? excerpt('mh-116', '有克体之卦，则事败于克体卦气之日。', spec.reason)
    : excerpt('mh-071', support ? '欲知名成之日，生体之卦气详之。' : '止看卦体时序之类，以定日期。', spec.reason);
  const method = excerpt('mh-058', '又先天之卦，定事应之期，则取之卦气', '只在先天卦气取期的实际上下文中匹配日支。');
  const scale = excerpt('mh-122', '应之期远，则以年，近则以月，又近则以日也。', '限近期单轮面试，实际调用须具备先天卦气法、日级和当地起卦日期。');
  const branches = excerpt('mh-143', '本日所属卦气如寅卯木、巳午火、申酉金、亥子水、辰戌丑未土也。', '用所选经卦的五行匹配实际干支日支。');
  uses.push(basis, method, scale, branches);
  return {
    ...spec,
    id: control ? `${stage}-obstruction` : support ? `${stage}-support` : 'interview-result',
    valence: control ? '凶' : '吉',
    stage,
    prefix: '可留意',
    sourceIds: [basis.id, method.id, scale.id, branches.id],
    ruleIds: [control ? 'adverse-event' : support ? 'fame-good-event' : 'fame-body-fallback'],
  };
}
