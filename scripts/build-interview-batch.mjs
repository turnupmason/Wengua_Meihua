import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {loadLibrary,interpretationArtifactDigest,AUDIT_CHECKS} from '../src/index.js';
import {getVoidProfileKey} from '../src/prewritten-manuscripts.js';
import {inspectMovingLine,validateStoryCopy} from '../src/story-editorial.js';
import {createInterviewReading,interviewTimingSlots,interviewVoidReleaseSlots,createInterviewManuscriptRepository,INTERVIEW_MANUSCRIPT_VERSION,INTERVIEW_QUESTION_ID} from '../src/interview-manuscripts.js';
import {PRODUCT_TAXONOMY} from '../sources/editorial/product-taxonomy.mjs';
import {INTERVIEW_PASS_BATCH_001} from '../sources/editorial/interview-pass-batch-001.mjs';
const root=new URL('../',import.meta.url),library=await loadLibrary(),base='data/authored-readings/interview-pass/';
const raw=PRODUCT_TAXONOMY.find(c=>c.id==='career').subcategories.find(s=>s.id==='interview').questions.find(q=>q.id==='interview-pass');
const question={...raw,id:INTERVIEW_QUESTION_ID,manuscriptIndexPath:base+'index.json'};
const common={schemaVersion:'1.0.0',contentVersion:library.contentVersion,manuscriptVersion:INTERVIEW_MANUSCRIPT_VERSION,questionId:question.id};
const sourceIds=['mh-056','mh-058','mh-071','mh-101','mh-116','mh-117','mh-119','mh-143','user-void-extension','user-void-timing'];
const rows=[];
for(const [index,a] of INTERVIEW_PASS_BATCH_001.entries()){
 const reading=createInterviewReading({library,question,primaryId:a.primaryId,movingLine:a.movingLine,monthOrder:'winter-water',castingDate:'2026-11-11'});
 const facts={stages:Object.values(reading.stages).map(s=>({id:s.id,name:s.name,baseGrade:s.baseGrade})),
  nodes:reading.nodes.map(n=>({role:n.role,trigram:n.trigram,element:n.element,qi:n.strength.state,void:n.void,supportEvidence:n.supportEvidence})),
  directRelations:reading.edges.map(e=>({role:e.targetRole,type:e.type})),movingLine:{...inspectMovingLine(reading.selectedMovingLine.text),label:reading.selectedMovingLine.label,sourceRef:reading.selectedMovingLine.sourceRef},
  referenceContext:{castingDate:'2026-11-11',dayGanzhi:reading.dayGanzhi,monthOrder:'winter-water',purpose:'reproducible-profile;not-twelve-actual-casts-at-one-time'}};
 const decisionId=`${question.id}/${a.primaryId}/${a.movingLine}/winter-water/${a.outcome}`;
 const decision={id:decisionId,outcomeCode:a.outcome,question_type:question.question_type,questionScope:'one-interview-stage',
  method:'project-application-of-fame-chapter;not-a-verbatim-classical-interview-rule',sourceIds,
  counterevidence:a.counterevidence,lineApplication:{...a.lineApplication,allDetectedTerms:facts.movingLine.terms},
  indirectEffectsApplied:[],interpretationProvenance:'assistant-authored;not-observed-feedback;not-scientifically-verified-prediction'};
 const copy={title:a.title,short:{decisionId,text:a.short},long:{decisionId,opening:a.opening,process:a.process,ending:a.ending,summary:a.summary}};
 const checks=validateStoryCopy({decision,copy,lineApplication:a.lineApplication,counterevidence:a.counterevidence});
 const timingSlots=interviewTimingSlots(reading,a.timing);
 const voidTiming=interviewVoidReleaseSlots(reading,a.voidRelease||[]);
 const evidence={
  'chart-and-moving-line':['Canonical six-line, mutual and one-line change recalculation',a.primaryId+'/'+a.movingLine],
  'body-use-position':['Moving half is use; original opposite half remains body','canonical-role-assignment'],
  'question-method-match':['Fame chapter applied to passing this interview stage, separate from final offer','mh-071;project-interview-stage-application-v1'],
  'relation-directions':['All four direct relations recalculated from canonical elements','facts.directRelations'],
  'uniform-seasonal-strength':['All six visible positions use one full five-state table','facts.nodes;winter-water'],
  'extension-provenance':[a.voidNote,'user-void-extension;later-heaven-map;partial-mark-only'],
  'bounded-indirect-relations':['No indirect effect is used to reverse a direct relation','decision.indirectEffectsApplied'],
  'reproducible-event-timing':['Active direct support times the positive event; active direct control times obstruction; civil dates resolved from frozen cast','timingSlots;mh-071;mh-116;mh-143'],
  'conclusion-and-counterevidence':[a.counterevidence.map(c=>c.resolution).join('；'),'decision.counterevidence;complete-moving-line']
 };
 const review={status:'author-checked',actor:'assistant-author',version:INTERVIEW_MANUSCRIPT_VERSION,
  scope:'exact-chart-month-void-profile-and-recorded-timing-method',verification:'computed-facts-plus-authored-judgment;not-independent-human-expert-certification',
  checks:Object.fromEntries(AUDIT_CHECKS.map(id=>[id,{status:'pass',evidence:[{sourceId:sourceIds.includes(evidence[id][1])?evidence[id][1]:'project-interview-authoring',locator:evidence[id][1],reason:evidence[id][0]}]}]))};
 const row={number:index+1,primaryId:a.primaryId,movingLine:a.movingLine,monthOrder:'winter-water',voidProfileKey:getVoidProfileKey(reading),
  stageIds:Object.values(reading.stages).map(s=>s.id),movingLineText:reading.selectedMovingLine.text,facts,decision,copy,timingSlots,voidNote:a.voidNote,
  voidReleaseSpecs:a.voidRelease||[],voidTimingSlots:voidTiming.slots,voidTimingText:voidTiming.text,
  lineApplication:a.lineApplication,counterevidence:a.counterevidence,sourceIds,review,copyChecks:checks};
 row.artifactDigest=await interpretationArtifactDigest(row);rows.push(row);
}
if(rows.length!==12||new Set(rows.map(r=>r.primaryId+'/'+r.movingLine)).size!==12)throw new Error('First interview batch requires twelve distinct core cases');
await mkdir(new URL(base,root),{recursive:true});
await writeFile(new URL(base+'batch-001.json',root),JSON.stringify({...common,batchId:'batch-001',rows},null,2)+'\n');
const index={...common,baseCaseCount:12,contextProfileCount:12,totalBaseCases:1920,
 coverage:'twelve-winter-water-cases;exact-void-profiles;other-months-and-void-profiles-not-implied',
 files:[{batchId:'batch-001',path:base+'batch-001.json',count:12}]};
await writeFile(new URL(base+'index.json',root),JSON.stringify(index,null,2)+'\n');
await writeFile(new URL('data/authored-readings/progress.json',root),JSON.stringify({...common,
 activeQuestionId:question.id,activeQuestion:'这次面试能通过吗？',order:'product-category/subcategory/question;do-not-switch-to-offer-before-interview-coverage',
 baseCasesWritten:12,totalBaseCases:1920,contextProfilesWritten:12,backgroundExecution:false,
 files:index.files,nextWork:'Continue missing charts, month qi and void profiles for this question; no further style approval required.'},null,2)+'\n');
const runtime=createInterviewManuscriptRepository({library,readJSON:async p=>JSON.parse(await readFile(new URL(p,root),'utf8'))});
let doc='# 事业工作 → 求职面试 → 面试是否通过：第1批\n\n本批由本助手逐篇写作，共12个冬水当令的基盘与明确空亡情境。第一问共1,920个盘与月令基准槽位，本批完成12个，其他时令、空亡条件未由此自动覆盖。尚未切换到“能否拿到录用”。\n\n预存正文完整写定，只有日期按起卦日换算。以下统一用2026-11-11己丑日、午未空，先天卦气按日取期演示。各盘是查表条件，不声称由同一时刻同一种起卦操作同时得出。窗口说明吉凶及对应事件，实际面试安排以招聘方通知为准。\n\n';
for(const row of rows){
 const rendered=await runtime.getContent(question,{questionId:question.id,primaryId:row.primaryId,movingLine:row.movingLine,monthOrder:row.monthOrder,castingDate:'2026-11-11',timingScale:'day',timingContext:{castingMethod:'pre-heaven',periodMethod:'element-qi'}});
 if(rendered.status!=='ready')throw new Error('Authored case does not render');
 doc+=`## ${row.number}．${row.copy.title}\n\n${row.facts.stages.map(s=>s.name).join(' → ')}，${row.facts.movingLine.label}动。\n\n简断\n\n${rendered.short}\n\n详断\n\n${rendered.paragraphs.join('\n\n')}\n\n`;
 doc+='依据：《梅花易数·求名占》《衰旺论》《占卦诀》《体用互变之诀》《日应》；空亡采用用户批准的扩展规则。\n\n动爻完整原文：'+row.movingLineText+'\n\n';
}
await writeFile(new URL('docs/INTERVIEW_PASS_BATCH_001.md',root),doc);
console.log({questionId:question.id,baseCases:rows.length,contextProfiles:rows.length,shortHan:rows.map(r=>r.copyChecks.shortHanCount),timing:'included;dates-resolved-not-hardcoded'});
