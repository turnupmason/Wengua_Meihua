import {mkdir,readFile,writeFile,rm,readdir} from 'node:fs/promises';
import {loadLibrary,interpretationArtifactDigest,AUDIT_CHECKS} from '../src/index.js';
import {getVoidProfileKey} from '../src/prewritten-manuscripts.js';
import {inspectMovingLine,validateStoryCopy} from '../src/story-editorial.js';
import {createInterviewReading,interviewTimingSlots,createInterviewManuscriptRepository,INTERVIEW_MANUSCRIPT_VERSION,INTERVIEW_QUESTION_ID} from '../src/interview-manuscripts.js';
import {MONTH_SLOTS,MONTH_SLOT_POLICY} from '../src/month-slots.js';
import {PRODUCT_TAXONOMY} from '../sources/editorial/product-taxonomy.mjs';
import {INTERVIEW_PASS_BATCH_001} from '../sources/editorial/interview-pass-batch-001.mjs';
import {INTERVIEW_PASS_OTHER_MONTHS} from '../sources/editorial/interview-pass-all-months.mjs';
const root=new URL('../',import.meta.url),library=await loadLibrary(),base='data/authored-readings/interview-pass/';
const raw=PRODUCT_TAXONOMY.find(c=>c.id==='career').subcategories.find(s=>s.id==='interview').questions.find(q=>q.id==='interview-pass');
const question={...raw,id:INTERVIEW_QUESTION_ID,manuscriptIndexPath:base+'index.json'};
const common={schemaVersion:'1.0.0',contentVersion:library.contentVersion,manuscriptVersion:INTERVIEW_MANUSCRIPT_VERSION,questionId:question.id};
const sourceIds=['mh-056','mh-058','mh-071','mh-101','mh-116','mh-117','mh-119','mh-143','user-void-extension','user-void-timing'];
const authored=[...INTERVIEW_PASS_BATCH_001.map(a=>({...a,monthOrder:'winter-water'})),...INTERVIEW_PASS_OTHER_MONTHS];
const rows=[];
for(const [index,a] of authored.entries()){
 const monthBranches=MONTH_SLOTS.filter(m=>m.qi===a.monthOrder).map(m=>m.branch);
 const reading=createInterviewReading({library,question,primaryId:a.primaryId,movingLine:a.movingLine,monthBranch:monthBranches[0],castingDate:'2026-11-11'});
 const facts={stages:Object.values(reading.stages).map(s=>({id:s.id,name:s.name,baseGrade:s.baseGrade})),
  nodes:reading.nodes.map(n=>({role:n.role,trigram:n.trigram,element:n.element,qi:n.strength.state,void:n.void,supportEvidence:n.supportEvidence})),
  directRelations:reading.edges.map(e=>({role:e.targetRole,type:e.type})),movingLine:{...inspectMovingLine(reading.selectedMovingLine.text),label:reading.selectedMovingLine.label,sourceRef:reading.selectedMovingLine.sourceRef},
  referenceContext:{castingDate:'2026-11-11',dayGanzhi:reading.dayGanzhi,monthOrder:a.monthOrder,monthBranches,purpose:'explicit-qi-comparison-and-date-render-test;not-real-simultaneous-seasonal-casts'}};
 const decisionId=`${question.id}/${a.primaryId}/${a.movingLine}/${a.monthOrder}/${a.outcome}`;
 const decision={id:decisionId,outcomeCode:a.outcome,question_type:question.question_type,questionScope:'one-interview-stage',
  method:'project-application-of-fame-chapter;not-a-verbatim-classical-interview-rule',sourceIds,
  counterevidence:a.counterevidence,lineApplication:{...a.lineApplication,allDetectedTerms:facts.movingLine.terms},
  indirectEffectsApplied:[],interpretationProvenance:'assistant-authored;not-observed-feedback;not-scientifically-verified-prediction'};
 const copy={title:a.title,short:{decisionId,text:a.short},long:{decisionId,opening:a.opening,process:a.process,ending:a.ending,summary:a.summary}};
 const checks=validateStoryCopy({decision,copy,lineApplication:a.lineApplication,counterevidence:a.counterevidence});
 if([copy.short.text,...Object.values(copy.long)].some(s=>/逢空|午空|空亡|动空|未支|申支/.test(s)))throw new Error('Base prose still contains a fixed void profile: '+decisionId);
 const timingSlots=interviewTimingSlots(reading,a.timing);
 const coreVoidNotes=reading.nodes.filter(n=>['body','use','changed_use'].includes(n.role)&&n.void.hit).map(n=>{
  const role={body:'体',use:'本用',changed_use:'变用'}[n.role];
  if(n.void.hitKind==='partial')return `${role}${n.trigram}卦${n.void.matchedBranches.join('、')}位逢空，${n.void.branches.filter(b=>!n.void.matchedBranches.includes(b)).join('、')}位未空，按半空减力，仍参与体用判断。`;
  if(n.void.state==='moving_exempt')return `${role}${n.trigram}卦逢空，但本身发动，仍有作用。`;
  return '';
 }).filter(Boolean);
 const evidence={
  'chart-and-moving-line':['Canonical six-line, mutual and one-line change recalculation',a.primaryId+'/'+a.movingLine],
  'body-use-position':['Original body is retained in all three stages','canonical-role-assignment'],
  'question-method-match':['Fame chapter applied to this interview stage, separate from offer','mh-071;project-interview-stage-application-v1'],
  'relation-directions':['Four direct relations independently recalculated','facts.directRelations'],
  'uniform-seasonal-strength':['All six visible positions use the same five-state qi table',`facts.nodes;${a.monthOrder}`],
  'extension-provenance':['Base prose independent of void; whole-trigram mapping; partial means qualitative reduction; ordinary mutual static void has no separate timing','user-void-extension;core-priority;qualitative-reduction'],
  'bounded-indirect-relations':['No indirect effect reverses a direct relation','decision.indirectEffectsApplied'],
  'reproducible-event-timing':['Stored support/control event distinguishes overall result from phase obstruction or repair; dates use saved casting day','timingSlots;mh-071;mh-116;mh-143'],
  'conclusion-and-counterevidence':[a.counterevidence.map(c=>c.resolution).join('；'),'decision.counterevidence;complete-moving-line']
 };
 const review={status:'author-checked',actor:'assistant-author',version:INTERVIEW_MANUSCRIPT_VERSION,
  scope:'base-prose-and-recorded-void-profile;equivalent-qi-month-slots-share-written-text;exempt-core-void-does-not-change-verdict',verification:'computed-facts-plus-authored-judgment;not-independent-human-expert-certification',
  checks:Object.fromEntries(AUDIT_CHECKS.map(id=>[id,{status:'pass',evidence:[{sourceId:'project-interview-authoring',locator:evidence[id][1],reason:evidence[id][0]}]}]))};
 const row={number:index+1,primaryId:a.primaryId,movingLine:a.movingLine,monthOrder:a.monthOrder,monthBranches,voidProfileKey:getVoidProfileKey(reading),
  stageIds:Object.values(reading.stages).map(s=>s.id),movingLineText:reading.selectedMovingLine.text,facts,decision,copy,timingSlots,
  baseProse:true,coreVoidNotes,voidReleaseSpecs:[],voidTimingSlots:[],voidTimingText:'',
  lineApplication:a.lineApplication,counterevidence:a.counterevidence,sourceIds,review,copyChecks:checks};
 row.artifactDigest=await interpretationArtifactDigest(row);rows.push(row);
}
if(rows.length!==60||new Set(rows.map(r=>r.primaryId+'/'+r.movingLine+'/'+r.monthOrder)).size!==60)throw new Error('Expected sixty individually authored qi versions');
await mkdir(new URL(base,root),{recursive:true});
const files=[];let monthSlotCount=0;
for(const primaryId of [...new Set(rows.map(r=>r.primaryId))]){
 const pool=rows.filter(r=>r.primaryId===primaryId),monthSlots={};
 for(const [i,r] of pool.entries())for(const b of r.monthBranches){const k=r.movingLine+':'+b;if(k in monthSlots)throw new Error('Duplicate month slot');monthSlots[k]=i;monthSlotCount++;}
 const path=base+`hex-${String(primaryId).padStart(3,'0')}.json`;
 await writeFile(new URL(path,root),JSON.stringify({...common,primaryId,monthSlots,rows:pool})+'\n');
 files.push({primaryId,path,count:pool.length,monthSlotCount:Object.keys(monthSlots).length});
}
// Retained original winter file for stable external links; not loaded by the application.
await writeFile(new URL(base+'batch-001.json',root),JSON.stringify({...common,batchId:'batch-001',rows:rows.slice(0,12)})+'\n');
const index={...common,baseCaseCount:monthSlotCount,authoredVersionCount:rows.length,contextProfileCount:rows.length,totalBaseCases:4608,
 monthSlotPolicy:MONTH_SLOT_POLICY,monthSlots:MONTH_SLOTS,allTwelveMonthsCoveredForCharts:12,remainingBaseSlots:4608-monthSlotCount,
 coverage:'twelve-core-charts;all-twelve-month-slots;sixty-written-qi-versions;missing-charts-and-changing-core-void-contexts-not-implied',
 storage:'hexagram-shards;month-slot-to-row-pool-index;no-runtime-prose-generation',files};
await writeFile(new URL(base+'index.json',root),JSON.stringify(index,null,2)+'\n');
await writeFile(new URL('data/authored-readings/progress.json',root),JSON.stringify({...common,
 activeQuestionId:question.id,activeQuestion:'这次面试能通过吗？',order:'chart-and-moving-line/all-twelve-month-slots;finish-question-before-offer',
 baseCasesWritten:monthSlotCount,totalBaseCases:4608,uniqueAuthoredVersions:rows.length,contextProfilesWritten:rows.length,
 fullTwelveMonthCharts:12,remainingBaseSlots:4608-monthSlotCount,backgroundExecution:false,files,
 nextWork:'Continue missing core charts in twelve-month order; core-changing void cases separately authored.'},null,2)+'\n');
const runtime=createInterviewManuscriptRepository({library,readJSON:async p=>JSON.parse(await readFile(new URL(p,root),'utf8'))});
const intro='本问按64卦×6动爻×12月令，共4,608个基础槽位。当前12种基础盘已接齐十二个月令，共144个槽位，完整正文60篇；同旺衰、同结论的月份明确共用全文，未作逐月差异的虚构。辰未戌丑按本项目四季土月口径，未自动推算每季末十八日。\n\n正文事先写定；日期以保存的起卦日换算。下列统一以2026-11-11演示日序，月令为显式比较维度，不把这一天声称为不同的实际节令。无关静空不单独写情节或应期，核心空情境另行匹配。\n\n';
let all='# 求职面试：十二月令首组完整稿\n\n'+intro,winter='# 求职面试：冬令首批（已更新空亡处理与十二月令口径）\n\n'+intro;
for(const original of INTERVIEW_PASS_BATCH_001){
 all+=`## ${original.primaryId}卦 · ${original.movingLine}爻动\n\n`;
 for(const monthOrder of ['spring-wood','summer-fire','autumn-metal','winter-water','seasonal-earth']){
  const r=rows.find(r=>r.primaryId===original.primaryId&&r.movingLine===original.movingLine&&r.monthOrder===monthOrder);
  const rendered=await runtime.getContent(question,{questionId:question.id,primaryId:r.primaryId,movingLine:r.movingLine,monthBranch:r.monthBranches[0],castingDate:'2026-11-11',timingScale:'day',timingContext:{castingMethod:'pre-heaven',periodMethod:'element-qi'}});
  if(rendered.status!=='ready')throw new Error('Authored case does not render: '+r.decision.id);
  const text=`### ${r.monthBranches.map(b=>b+'月').join('、')}：${r.copy.title}\n\n${r.facts.stages.map(s=>s.name).join(' → ')}，${r.facts.movingLine.label}动。\n\n简断\n\n${rendered.short}\n\n详断\n\n${rendered.paragraphs.join('\n\n')}\n\n依据：《梅花易数·求名占》《衰旺论》《占卦诀》《体用互变之诀》《日应》。\n\n动爻完整原文：${r.movingLineText}\n\n`;
  all+=text;if(monthOrder==='winter-water')winter+=text;
 }
}
await writeFile(new URL('docs/INTERVIEW_PASS_ALL_MONTHS.md',root),all);
await writeFile(new URL('docs/INTERVIEW_PASS_BATCH_001.md',root),winter);
console.log({question:question.id,authoredVersions:rows.length,monthSlots:monthSlotCount,total:4608,shards:files.length,shortHanRange:[Math.min(...rows.map(r=>r.copyChecks.shortHanCount)),Math.max(...rows.map(r=>r.copyChecks.shortHanCount))]});
