import {mkdir,readdir,writeFile} from 'node:fs/promises';
import {createInterviewReading} from '../src/interview-manuscripts.js';
import {MONTH_ORDERS} from '../src/narrative-rules.js';
import {getVoidProfileKey} from '../src/prewritten-manuscripts.js';
import {bindInterviewRewrite} from './interview-rewrites.mjs';

export const VOID_REWRITE_METHOD = 'individually-rewritten-and-reviewed-void-context';
const version = 'interview-void-context-2.0.0';
const roles = {body:'原体',use:'本用',body_mutual:'体互',use_mutual:'用互',changed_use:'变用'};
const representativeDates = Array.from({length:60}, (_, index) =>
  new Date(Date.UTC(2027, 0, index + 1)).toISOString().slice(0, 10));
const sourceDir = 'sources/editorial/interview-void-rewrites/';

function readingKey(primaryId, movingLine, monthOrder) {
  return `${primaryId}/${movingLine}/${monthOrder}`;
}

function inactiveNodes(reading) {
  return Object.keys(roles).map(role => reading.nodes.find(node => node.role === role))
    .filter(node => node.void.effective !== 'active');
}

// With the production day inputs a full sexagenary cycle covers every reachable profile.
// Store the whole exact key even when branch hits differ and one reviewed article applies.
export function scanInterviewVoidProfiles({library, question, primaryIds}) {
  const charts = new Map();
  for (const primaryId of primaryIds) {
    for (let movingLine = 1; movingLine <= 6; movingLine++) {
      for (const {id:monthOrder} of MONTH_ORDERS) {
        const byProfile = new Map();
        for (const castingDate of representativeDates) {
          const reading = createInterviewReading({library,question,primaryId,movingLine,monthOrder,castingDate});
          const affected = inactiveNodes(reading);
          if (!affected.length) continue;
          const exact = getVoidProfileKey(reading);
          if (byProfile.has(exact)) continue;
          const effect = affected.map(node => `${node.role}=${node.void.effective}`).join(',');
          byProfile.set(exact, {reading,effect,affected});
        }
        charts.set(readingKey(primaryId,movingLine,monthOrder), byProfile);
      }
    }
  }
  return charts;
}

export async function authorInterviewVoidRewrites({root,library,question,existing,profiles}) {
  const files = (await readdir(new URL(sourceDir,root))).filter(name => /^hex-\d{3}\.mjs$/.test(name)).sort();
  const occupied = new Map();
  let retainedReferenceStates = 0;
  for (const row of existing) {
    if (row.baseNoVoid) continue;
    const chart = readingKey(row.primaryId,row.movingLine,row.monthOrder);
    const reading = createInterviewReading({library,question,primaryId:row.primaryId,movingLine:row.movingLine,
      monthOrder:row.monthOrder,castingDate:row.castingDate ?? '2026-11-11'});
    const exact = getVoidProfileKey(reading);
    if (!row.voidScenario && profiles.get(chart)?.has(exact)) retainedReferenceStates++;
    if (!occupied.has(chart)) occupied.set(chart,new Set());
    occupied.get(chart).add(exact);
  }
  const authored = [];
  const manuscripts = new Set();
  for (const file of files) {
    const sourcePath = sourceDir + file;
    const {default:batch} = await import(new URL(sourcePath,root));
    const {primaryId,lineApplications,rows} = batch;
    if (primaryId !== Number(file.slice(4,7))) throw new Error(`Void author source identity mismatch: ${file}`);
    for (const row of rows) {
      const chart = readingKey(primaryId,row.movingLine,row.monthOrder);
      const manuscriptKey = `${chart}/${row.effect}`;
      const prose = [row.title,row.short,row.opening,row.process,row.ending,row.summary,row.counterevidence];
      if (manuscripts.has(manuscriptKey) || prose.some(part => typeof part !== 'string' || !part.trim() || part.includes('*')) ||
          !lineApplications[row.movingLine] || !['pass-with-conditions','not-pass-this-round'].includes(row.outcome) ||
          Boolean(row.timing) === Boolean(row.timingOmission)) throw new Error(`Invalid void manuscript: ${manuscriptKey}`);
      const covered = occupied.get(chart) ?? new Set();
      const candidates = [...(profiles.get(chart) ?? [])].filter(([exact,profile]) =>
        profile.effect === row.effect && !covered.has(exact));
      if (!candidates.length) throw new Error(`No new exact void contexts for ${manuscriptKey}`);
      manuscripts.add(manuscriptKey);
      for (const [exact,{reading,affected}] of candidates) {
        const timing = row.timing ? {...row.timing,suffix:`，${row.timing.event}。`} : undefined;
        const draft = {...row,timing,primaryId,sourcePath,lineApplication:row.lineApplication ?? lineApplications[row.movingLine],
          strictControl:row.strictControl ?? true};
        const bound = bindInterviewRewrite(library,reading,draft);
        authored.push({...bound,baseNoVoid:false,castingDate:reading.castingDate,
          voidScenario:{origin:'individual-void-manuscript',manuscriptKey,effect:row.effect,
            xun:reading.nodes.find(node => node.role === 'body').void.xun.xunHead},
          coreVoidNotes:affected.map(node =>
            `${roles[node.role]}${node.trigram}${node.void.matchedBranches.join('、')}位命中，${node.void.label}。`),
          authorship:{method:VOID_REWRITE_METHOD,version,sourcePath,manuscriptKey,manualWholeArticleReview:true},
          decisionPolicy:{...bound.decisionPolicy,id:'individual-void-manuscript',scope:'actual-void-effect;one-interview-stage'},
        });
        covered.add(exact);
      }
      occupied.set(chart,covered);
    }
  }
  let required = 0;
  let coveredCount = 0;
  let next = null;
  for (const [chart,contexts] of profiles) {
    required += contexts.size;
    const matched = occupied.get(chart);
    const missing = [...contexts].filter(([exact]) => !matched?.has(exact));
    coveredCount += contexts.size - missing.length;
    if (missing.length && !next) {
      const {reading,effect} = missing[0][1];
      const {primaryId,movingLine,monthOrder,castingDate,dayGanzhi} = reading;
      next = {questionId:question.id,primaryId,movingLine,monthOrder,effect,castingDate,dayGanzhi};
    }
  }
  return {authored,progress:{
    status: next ? 'partially-authored' : 'complete',
    basis: 'current casting-day rules;all 60 civil-day Ganzhi;explicit month keys',
    requiredExactStates:required,coveredExactStates:coveredCount,remainingExactStates:required-coveredCount,
    retainedReferenceStates,newManuscriptsWrittenAndReviewed:manuscripts.size,newExactStates:authored.length,next,
  }};
}

export async function writeInterviewVoidRewrites({root,library,question,runtime,rows,progress}) {
  const catalogue = [
    '# 本轮面试空亡专稿', '',
    `当前历法可达的需查稿状态共 ${progress.requiredExactStates} 个，已覆盖 ${progress.coveredExactStates} 个，待写 ${progress.remainingExactStates} 个。`,
    `本次逐篇撰写及作者全文复核 ${progress.newManuscriptsWrittenAndReviewed} 篇，对应 ${progress.newExactStates} 个精确状态。独立专业审核待进行。`, '',
    `原逐篇参考稿已有 ${progress.retainedReferenceStates} 个可精确匹配的状态，沿用原稿。`, '',
    '同一篇只覆盖卦爻、月令气类和各节点实际作用均一致的状态。命中地支和真实起卦日期逐项匹配、分别显示。', '',
    '[乾、坤、屯既有稿](INTERVIEW_VOID_FULL_TEXT.md) · [基础正文](INTERVIEW_PASS_ALL_BASES.md) · [覆盖进度](../data/authored-readings/progress.json)', '',
  ];
  const groups = new Map();
  for (const row of rows) {
    if (row.authorship.method !== VOID_REWRITE_METHOD) continue;
    if (!groups.has(row.primaryId)) groups.set(row.primaryId,new Map());
    const hex = groups.get(row.primaryId);
    if (!hex.has(row.voidScenario.manuscriptKey)) hex.set(row.voidScenario.manuscriptKey,[]);
    hex.get(row.voidScenario.manuscriptKey).push(row);
  }
  await mkdir(new URL('docs/interview-void/',root),{recursive:true});
  for (const [primaryId,hex] of groups) {
    const name = library.getHexagram(primaryId).name;
    const path = `interview-void/hex-${String(primaryId).padStart(3,'0')}-reviewed.md`;
    catalogue.push(`- [${name}](${path}) · ${hex.size} 篇完整专稿`);
    const page = [`# ${name}面试空亡专稿`,'','[目录](../INTERVIEW_VOID_REWRITES.md)',''];
    for (const [key,states] of hex) {
      const row = states[0];
      const castingDate = row.facts.referenceContext.castingDate;
      const result = await runtime.getContent(question,{primaryId,movingLine:row.movingLine,monthBranch:row.monthBranches[0],castingDate,
        timingScale:'day',timingContext:{castingMethod:'pre-heaven',periodMethod:'element-qi'}});
      if (result.status !== 'ready' || result.decision.id !== row.decision.id) throw new Error(`Void manuscript does not render: ${key}`);
      const calculation = result.calculationExplanation.paragraphs.map((p,index) =>
        index === 0 ? `对照输入月令为${row.monthBranches[0]}月。此稿适用于${row.monthBranches.join('、')}月，实际查阅显示实际月令。` : p);
      page.push(
        `## ${row.facts.movingLine.label}动 · ${row.monthBranches.join('')}月 · ${row.copy.title}`, '',
        `稿件键 \`${key}\`。适用 ${states.length} 个精确状态。`, '',
        `简断\n\n${result.short}`, '', ...result.narrativeParagraphs.slice(0,-1).flatMap(p => [p,'']),
        '应期', '', result.timingSection.referenceNote, '',
        ...result.timingSection.windows.flatMap(w => [`${w.valence}应 · ${w.text}`,'']),
        result.narrativeParagraphs.at(-1), '',
        `动爻原文 · ${row.movingLineText}`, '',
        '<details>', '<summary>计算、出处与适用情境</summary>', '',
        ...calculation.flatMap(p => [p,'']),
        ...row.decision.sourceEvidence.map(s =>
          `- ${s.id}《${s.title}》第 ${s.locator.startLine} 行起。“${s.quote}” ${s.reason === row.counterevidence[0].resolution ? '此条的具体用法见上文判断。' : s.reason}`),
        '', '[旬空作用规则](../VOID_POLICY_V2.md)', '',
        '下列日期用于复现各组实际日干支与精确状态。月令为显式输入。', '',
        ...states.map(state => `- ${state.facts.referenceContext.castingDate} · ${state.facts.referenceContext.dayGanzhi} · ${state.coreVoidNotes.join(' ')}`),
        '', '</details>', '',
      );
    }
    await writeFile(new URL('docs/'+path,root),page.join('\n'));
  }
  await writeFile(new URL('docs/INTERVIEW_VOID_REWRITES.md',root),catalogue.join('\n').trimEnd()+'\n');
}
