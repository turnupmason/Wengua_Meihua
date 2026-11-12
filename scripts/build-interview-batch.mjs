import {mkdir,readdir,readFile,writeFile} from 'node:fs/promises';
import {loadLibrary,interpretationArtifactDigest,AUDIT_CHECKS} from '../src/index.js';
import {getVoidProfileKey,resolveManuscriptDates} from '../src/prewritten-manuscripts.js';
import {inspectMovingLine,validateStoryCopy} from '../src/story-editorial.js';
import {createInterviewReading,interviewTimingSlots,createInterviewManuscriptRepository,INTERVIEW_MANUSCRIPT_VERSION,INTERVIEW_QUESTION_ID} from '../src/interview-manuscripts.js';
import {MONTH_SLOTS,MONTH_SLOT_POLICY} from '../src/month-slots.js';
import {VOID_RULESET} from '../src/void-policy.js';
import {checkInterviewDecision,checkInterviewShort,INTERVIEW_DECISION_POLICY_VERSION} from '../src/interview-decision-checks.js';
import {PRODUCT_TAXONOMY} from '../sources/editorial/product-taxonomy.mjs';
import {INTERVIEW_PASS_BATCH_001} from '../sources/editorial/interview-pass-batch-001.mjs';
import {INTERVIEW_PASS_OTHER_MONTHS} from '../sources/editorial/interview-pass-all-months.mjs';
import {MONTH_ORDERS} from '../src/narrative-rules.js';
import {loadInterviewLineLedger,createBaseInterviewReading,authorBaseInterview,BASE_AUTHORING_VERSION} from '../sources/editorial/interview-base-authoring.mjs';
import {loadInterviewRewrites,bindInterviewReference,bindInterviewRewrite,INTERVIEW_FINAL_REVIEW_REVISION,REWRITE_METHOD,REWRITE_VERSION} from './interview-rewrites.mjs';
import {authorInterviewVoidContexts} from '../sources/editorial/interview-void-contexts.mjs';
import {authorFirstThreeVoidContexts,renderFirstThreeVoidReview} from './interview-first-three-contexts.mjs';
import {writeFirstThreeVoidFullText} from './interview-void-full-text.mjs';
import {authorInterviewVoidRewrites,scanInterviewVoidProfiles,writeInterviewVoidRewrites} from './interview-void-rewrites.mjs';
const root=new URL('../',import.meta.url),library=await loadLibrary(),base='data/authored-readings/interview-pass/';
const raw=PRODUCT_TAXONOMY.find(c=>c.id==='career').subcategories.find(s=>s.id==='interview').questions.find(q=>q.id==='interview-pass');
const question={...raw,id:INTERVIEW_QUESTION_ID,manuscriptIndexPath:base+'index.json'};
const common={schemaVersion:'1.0.0',contentVersion:library.contentVersion,manuscriptVersion:INTERVIEW_MANUSCRIPT_VERSION,questionId:question.id};
const baselineSourceIds=['mh-056','mh-058','mh-071','mh-101','mh-116','mh-117','mh-119','mh-143','user-void-extension','user-void-timing'];
const referenceCases=[...INTERVIEW_PASS_BATCH_001.map(a=>({...a,monthOrder:'winter-water'})),...INTERVIEW_PASS_OTHER_MONTHS];
const authored=referenceCases.map(a=>{
 const reading=createBaseInterviewReading({library,question,primaryId:a.primaryId,movingLine:a.movingLine,monthOrder:a.monthOrder,castingDate:'2026-11-11'});
 const sourcePath=a.monthOrder==='winter-water'?'sources/editorial/interview-pass-batch-001.mjs':'sources/editorial/interview-pass-all-months.mjs';
 return bindInterviewReference(library,reading,a,sourcePath);
});
const ledger=await loadInterviewLineLedger(library),known=new Set(authored.map(a=>`${a.primaryId}/${a.movingLine}/${a.monthOrder}`));
const rewrites=await loadInterviewRewrites(library);
for(const key of rewrites.keys())if(known.has(key))throw new Error('Rewrite would replace an original reference case: '+key);
for(let primaryId=1;primaryId<=64;primaryId++)for(let movingLine=1;movingLine<=6;movingLine++)for(const order of MONTH_ORDERS){
 const key=`${primaryId}/${movingLine}/${order.id}`;
 if(known.has(key))continue;
 const r=createBaseInterviewReading({library,question,primaryId,movingLine,monthOrder:order.id,castingDate:'2026-11-11'});
 const rewrite=rewrites.get(key);
 authored.push(rewrite?bindInterviewRewrite(library,r,rewrite):authorBaseInterview(r,ledger.get(`${primaryId}/${movingLine}`)));
}
authored.push(...authorInterviewVoidContexts({library,question,ledger}));
authored.push(...authorFirstThreeVoidContexts({library,question,baseManuscripts:authored}));
const voidProfiles=scanInterviewVoidProfiles({library,question,primaryIds:Array.from({length:64},(_,i)=>i+1)});
const voidRevision=await authorInterviewVoidRewrites({root,library,question,existing:authored,profiles:voidProfiles});
authored.push(...voidRevision.authored);
const rows=[];
for(const [index,a] of authored.entries()){
 const allSourceIds=a.sourceIds||baselineSourceIds;
 const sourceIds=a.voidScenario?allSourceIds:allSourceIds.filter(id=>id!=='user-void-extension'&&id!=='user-void-timing');
 const rewritten=a.authorship?.method===REWRITE_METHOD;
 const retained=a.authorship?.method==='individually-authored-reference-case';
 const scenario=a.voidScenario;
 const castingDate=a.castingDate??'2026-11-11';
 const monthBranches=MONTH_SLOTS.filter(m=>m.qi===a.monthOrder).map(m=>m.branch);
 const reading=(a.baseNoVoid?createBaseInterviewReading:createInterviewReading)({library,question,primaryId:a.primaryId,movingLine:a.movingLine,monthBranch:monthBranches[0],castingDate});
 const facts={stages:Object.values(reading.stages).map(s=>({id:s.id,name:s.name,baseGrade:s.baseGrade})),
  nodes:reading.nodes.map(n=>({role:n.role,trigram:n.trigram,element:n.element,qi:n.strength.state,void:n.void,supportEvidence:n.supportEvidence})),
  directRelations:reading.edges.map(e=>({role:e.targetRole,type:e.type})),movingLine:{...inspectMovingLine(reading.selectedMovingLine.text),label:reading.selectedMovingLine.label,...(a.collatedLine||{sourceRef:reading.selectedMovingLine.sourceRef})},
  referenceContext:{voidApplied:!a.baseNoVoid,displayInUserResult:false,castingDate,dayGanzhi:reading.dayGanzhi,monthOrder:a.monthOrder,monthBranches,purpose:scenario?'representative-day-for-exact-void-profile':'explicit-qi-comparison-and-date-render-test;not-real-simultaneous-seasonal-casts'}};
 const decisionId=`${question.id}/${a.primaryId}/${a.movingLine}/${a.monthOrder}/${a.outcome}`+(scenario?`/void/${castingDate}`:'');
 const decision={id:decisionId,outcomeCode:a.outcome,question_type:question.question_type,questionScope:'one-interview-stage',
  method:'project-application-of-fame-chapter;not-a-verbatim-classical-interview-rule',sourceIds,
  counterevidence:a.counterevidence,lineApplication:{...a.lineApplication,allDetectedTerms:facts.movingLine.terms},
  ...(a.sourceEvidence?{sourceEvidence:a.sourceEvidence}:{}),
  consistency:checkInterviewDecision(reading,a),decisionPolicy:a.decisionPolicy||{id:'retained-authored-case',sourceIds,scope:'previously-authored-specific-case'},
  indirectEffectsApplied:[],interpretationProvenance:'assistant-authored;not-observed-feedback;not-scientifically-verified-prediction'};
 const copy={title:a.title,short:{decisionId,text:a.short},long:{decisionId,opening:a.opening,process:a.process,ending:a.ending,summary:a.summary}};
 const checks={...validateStoryCopy({decision,copy,lineApplication:a.lineApplication,counterevidence:a.counterevidence}),shortSeparation:checkInterviewShort(copy.short.text)};
 if(!scenario&&[copy.short.text,...Object.values(copy.long)].some(s=>/逢空|午空|空亡|动空|未支|申支/.test(s)))throw new Error('Base prose still contains a fixed void profile: '+decisionId);
 const timingSlots=interviewTimingSlots(reading,a.timing);
 if(!scenario){
  const stageByRole={use:'opening',body_mutual:'process',use_mutual:'process',changed_use:'closing',body:'closing'};
  for(const slot of timingSlots){
   const stage=stageByRole[slot.role];
   if(!slot.reason||slot.stage!==stage||(slot.eventScope!=='positive-result-candidate'&&!slot.eventScope.startsWith(stage+'-'))||
      (slot.eventScope==='positive-result-candidate'&&!a.outcome.startsWith('pass'))){
    throw new Error('Base timing event and source do not agree: '+decisionId+'/'+slot.id);
   }
  }
 }
 const coreVoidNotes=a.coreVoidNotes??reading.nodes.filter(n=>['body','use','changed_use'].includes(n.role)&&n.void.hit).map(n=>{
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
  'extension-provenance':scenario?[coreVoidNotes.join(' '),'user-void-extension;user-void-timing;exact-void-profile']:
   ['Production base manuscripts use classical body/use and monthly qi. Civil day is used for date conversion.','mh-061;mh-117;mh-119'],
  'bounded-indirect-relations':['No indirect effect reverses a direct relation','decision.indirectEffectsApplied'],
  'reproducible-event-timing':a.timingOmission?[a.timingOmission.reason,'timingOmission;mh-071;mh-116;mh-122;mh-143']:
   [a.timing[0]?.reason||'Stored support/control event distinguishes overall result from phase obstruction or repair; dates use saved casting day','timingSlots;mh-071;mh-116;mh-143'],
  'conclusion-and-counterevidence':[a.counterevidence.map(c=>c.resolution).join('；'),'decision.counterevidence;complete-moving-line']
 };
 const review={status:'author-checked',actor:'assistant-author',version:scenario||retained?a.authorship.version:rewritten?REWRITE_VERSION:INTERVIEW_MANUSCRIPT_VERSION,
  scope:scenario?'exact-void-profile-and-applicable-month-branches':rewritten?'exact-base-qi-text;classical-body-use':'reference-case-prose;equivalent-qi-month-slots-share-written-text',
  verification:scenario?(a.authorship.reviewedJudgment?'scenario-specific-authored-judgment-and-computed-stage-facts':'individually-authored-exact-void-context'):rewritten?'individual-rewrite-and-whole-article-author-review':a.authorship&&!retained?'canonical-facts-and-rule-conformance;curated-line-ledger;compiled-prose-not-manual-whole-article-review':'computed-facts-plus-authored-judgment;not-independent-human-expert-certification',
  compilation:a.authorship||{method:'individually-authored-reference-case',manualWholeArticleReview:true},
  independentReview:{status:'pending',timingInterpretation:'pending',calendarConversion:'separate-technical-check',userAcceptedThisVersion:false},
  checks:Object.fromEntries(AUDIT_CHECKS.map(id=>[id,{status:'pass',scope:'author-check-only;not-independent-approval',evidence:[{sourceId:'project-interview-authoring',locator:evidence[id][1],reason:evidence[id][0]}]}]))};
 const row={number:index+1,primaryId:a.primaryId,movingLine:a.movingLine,monthOrder:a.monthOrder,monthBranches,voidProfileKey:a.baseNoVoid?'base-no-void':getVoidProfileKey(reading),
  stageIds:Object.values(reading.stages).map(s=>s.id),movingLineText:reading.selectedMovingLine.text,facts,decision,copy,timingSlots,
  ...(a.timingOmission?{timingOmission:a.timingOmission}:{}),...(scenario?{voidScenario:scenario}:{}),
  baseProse:!scenario,baseNoVoid:Boolean(a.baseNoVoid),authorship:a.authorship||{method:'individually-authored-reference-case',manualWholeArticleReview:true},coreVoidNotes,ruleVersions:{void:VOID_RULESET.id,decision:INTERVIEW_DECISION_POLICY_VERSION},voidReleaseSpecs:[],voidTimingSlots:[],voidTimingText:'',
  lineApplication:a.lineApplication,counterevidence:a.counterevidence,sourceIds,review,copyChecks:checks};
 row.artifactDigest=await interpretationArtifactDigest(row);rows.push(row);
}
const baseRows=rows.filter(r=>r.baseProse),scenarioCount=rows.length-baseRows.length;
if(baseRows.length!==1920||new Set(baseRows.map(r=>r.primaryId+'/'+r.movingLine+'/'+r.monthOrder)).size!==1920)throw new Error('Expected all 1920 base-qi versions');
if(new Set(rows.map(r=>JSON.stringify([r.primaryId,r.movingLine,r.monthOrder,r.voidProfileKey]))).size!==rows.length)throw new Error('Duplicate authored interview profile');
await mkdir(new URL(base,root),{recursive:true});
const files=[];let monthSlotCount=0;
for(const primaryId of Array.from({length:64},(_,i)=>i+1)){
 const pool=rows.filter(r=>r.primaryId===primaryId),monthSlots={};
 for(const [i,r] of pool.entries())if(r.baseProse)for(const b of r.monthBranches){const k=r.movingLine+':'+b;if(k in monthSlots)throw new Error('Duplicate month slot');monthSlots[k]=i;monthSlotCount++;}
 const path=base+`hex-${String(primaryId).padStart(3,'0')}.json`;
 await writeFile(new URL(path,root),JSON.stringify({...common,primaryId,monthSlots,rows:pool})+'\n');
 files.push({primaryId,path,count:pool.length,monthSlotCount:Object.keys(monthSlots).length});
}
// Retained original winter file for stable external links; not loaded by the application.
await writeFile(new URL(base+'batch-001.json',root),JSON.stringify({...common,batchId:'batch-001',rows:rows.slice(0,12)})+'\n');
const index={...common,baseCaseCount:monthSlotCount,baseVersionCount:baseRows.length,authoredVersionCount:rows.length,contextProfileCount:rows.length,voidScenarioCount:scenarioCount,totalBaseCases:4608,
 monthSlotPolicy:MONTH_SLOT_POLICY,monthSlots:MONTH_SLOTS,allTwelveMonthsCoveredForCharts:384,remainingBaseSlots:4608-monthSlotCount,
 coverage:'all-384-core-charts-and-4608-month-slots;classical-body-use',
 authorship:editorialProgress(),
 storage:'hexagram-shards;month-slot-to-row-pool-index;no-runtime-prose-generation',files};
await writeFile(new URL(base+'index.json',root),JSON.stringify(index,null,2)+'\n');
await writeFile(new URL('data/authored-readings/progress.json',root),JSON.stringify({...common,
 activeQuestionId:question.id,activeQuestion:'这次面试能通过吗？',order:'chart-and-moving-line/all-twelve-month-slots;finish-question-before-offer',
 baseCasesWritten:monthSlotCount,totalBaseCases:4608,baseVersionsWritten:baseRows.length,uniqueAuthoredVersions:rows.length,contextProfilesWritten:rows.length,
 fullTwelveMonthCharts:384,remainingBaseSlots:4608-monthSlotCount,backgroundExecution:false,files,
 baseCoverageComplete:true,authorship:index.authorship,
 coreChangingVoidVariants:{...voidRevision.progress,productionUse:false,completedInCurrentRevision:scenarioCount},
 nextBaseRewrite:nextBaseRewrite()},null,2)+'\n');

function editorialProgress(){
 const retainedIndividuallyAuthored=baseRows.filter(r=>r.authorship.method==='individually-authored-reference-case').length;
 const revised=baseRows.filter(r=>r.authorship.method===REWRITE_METHOD);
 if(revised.length!==rewrites.size)throw new Error('Some interview rewrites were not built');
 return {
  editorialRevision:REWRITE_VERSION,finalReviewRevision:INTERVIEW_FINAL_REVIEW_REVISION,retainedIndividuallyAuthored,
  individuallyRewritten:revised.length,rewrittenAndWholeArticleReviewed:revised.filter(r=>r.authorship.manualWholeArticleReview).length,
  rewrittenMonthSlots:revised.reduce((count,r)=>count+r.monthBranches.length,0),
  remainingRuleCompiled:baseRows.length-retainedIndividuallyAuthored-revised.length,
  lineLedgerEntries:ledger.size,compilationVersion:BASE_AUTHORING_VERSION,independentReview:'pending',userAcceptedRewrites:0,
 };
}

function nextBaseRewrite(){
 const next=baseRows.find(r=>!r.authorship.manualWholeArticleReview);
 return next?{questionId:question.id,primaryId:next.primaryId,movingLine:next.movingLine,monthOrder:next.monthOrder,monthBranches:next.monthBranches}:null;
}
const readBuiltJSON=async p=>JSON.parse(await readFile(new URL(p,root),'utf8'));
const runtime=createInterviewManuscriptRepository({library,readJSON:readBuiltJSON});
const intro='本问64卦×6动爻×12月令，共4,608个基础槽位已全部覆盖，完整正文1,920份。同旺衰、同结论的月份明确共用全文。当前页保留首组60份对照稿；全部卦象见INTERVIEW_PASS_ALL_BASES.md。其余基础稿已逐篇重写并完成作者全文复核，详见完整目录。辰未戌丑按本项目四季土月口径，未自动推算每季末十八日。\n\n正文事先写定；日期以保存的起卦日换算。下列统一以2026-11-11演示日序，计算说明中的月令只作各组对照代表，实际软件显示传入的月令。日干支及应期日期按实际起卦日换算。演示日序和对照月令分别给定。\n\n';
let all='# 求职面试：十二月令首组完整稿\n\n'+intro,winter='# 求职面试：冬令首批\n\n'+intro;
for(const original of INTERVIEW_PASS_BATCH_001){
 all+=`## ${original.primaryId}卦 · ${original.movingLine}爻动\n\n`;
 for(const monthOrder of ['spring-wood','summer-fire','autumn-metal','winter-water','seasonal-earth']){
  const r=rows.find(r=>r.primaryId===original.primaryId&&r.movingLine===original.movingLine&&r.monthOrder===monthOrder);
  const rendered=await runtime.getContent(question,{questionId:question.id,primaryId:r.primaryId,movingLine:r.movingLine,monthBranch:r.monthBranches[0],castingDate:'2026-11-11',timingScale:'day',timingContext:{castingMethod:'pre-heaven',periodMethod:'element-qi'}});
  if(rendered.status!=='ready')throw new Error('Authored case does not render: '+r.decision.id);
  const comparedExplanation=rendered.calculationExplanation.paragraphs.map((p,i)=>i===0?`对照示例月令：${r.monthBranches[0]}月。本组正文适用于${r.monthBranches.map(b=>b+'月').join('、')}；实际调用显示本盘月令。`:p);
  const prose=rendered.paragraphs.map(p=>p.startsWith('应期：')?`应期：${rendered.timingSection.referenceNote}\n\n${rendered.timingSection.windows.map(w=>w.text).join('\n\n')}`:p);
  const text=`### ${r.monthBranches.map(b=>b+'月').join('、')}：${r.copy.title}\n\n${r.facts.stages.map(s=>s.name).join(' → ')}，${r.facts.movingLine.label}动。\n\n简断\n\n${rendered.short}\n\n详断\n\n${prose.join('\n\n')}\n\n依据：《梅花易数·求名占》《衰旺论》《占卦诀》《体用互变之诀》《日应》。\n\n动爻完整原文：${r.movingLineText}\n\n<details>\n<summary>计算说明</summary>\n\n${comparedExplanation.join('\n\n')}\n\n</details>\n\n`;
  all+=text;if(monthOrder==='winter-water')winter+=text;
 }
}
await writeFile(new URL('docs/INTERVIEW_PASS_ALL_MONTHS.md',root),all);
await writeFile(new URL('docs/INTERVIEW_PASS_BATCH_001.md',root),winter);
console.log({question:question.id,authoredVersions:rows.length,monthSlots:monthSlotCount,total:4608,shards:files.length,shortHanRange:[Math.min(...rows.map(r=>r.copyChecks.shortHanCount)),Math.max(...rows.map(r=>r.copyChecks.shortHanCount))]});

await mkdir(new URL('docs/interview-pass/',root),{recursive:true});
const reviewDocs=new Set(await readdir(new URL('docs/',root)));
let directory='# 求职面试：全部基础卦象\n\n目标问项为“这次面试能通过吗”。共有384种基础盘、4,608个月令检索位置、1,920篇不同正文。\n\n'+
 `保留原${index.authorship.retainedIndividuallyAuthored}篇逐篇稿。已逐篇重写并由作者全文复核${index.authorship.rewrittenAndWholeArticleReviewed}篇，覆盖${index.authorship.rewrittenMonthSlots}个月令位置。仍有${index.authorship.remainingRuleCompiled}篇为离线编译稿。独立专业审核仍待完成。\n\n`+
 '本问按本卦、真实动爻和月令查预写全文。应期日期按实际起卦日换算。[终校记录](INTERVIEW_FINAL_REVIEW_20261112.md)\n\n寅卯木、巳午火、申酉金、亥子水、辰未戌丑土，十二月令各自有键，同气且同结论时共用全文。文档日期为2026-11-11起卦的对照演示。\n\n';
for(const file of files){
 const pool=baseRows.filter(r=>r.primaryId===file.primaryId).sort((a,b)=>a.movingLine-b.movingLine||MONTH_ORDERS.findIndex(m=>m.id===a.monthOrder)-MONTH_ORDERS.findIndex(m=>m.id===b.monthOrder));
 const hexId=String(file.primaryId).padStart(3,'0');
 const name=library.getHexagram(file.primaryId).name,path=`docs/interview-pass/hex-${hexId}.md`;
 let doc=`# ${file.primaryId} · ${name}：六动爻与十二月令\n\n本页30份完整正文对应72个月令槽位。应期以2026-11-11作日序演示，各组月令另行给定。\n\n`;
 const rewrittenCount=pool.filter(r=>r.authorship.method===REWRITE_METHOD).length;
 if(rewrittenCount)doc+=`本卦有${rewrittenCount}篇已逐篇重写并完成作者全文复核。独立专业审核仍待完成。\n\n`;
 for(const row of pool){
  const r=createBaseInterviewReading({library,question,primaryId:row.primaryId,movingLine:row.movingLine,monthBranch:row.monthBranches[0],castingDate:'2026-11-11'});
  const c=row.copy.long,timingText=row.timingOmission?'此盘暂无有据的日期可列。':'以下为传统推算的参考窗口。\n'+row.timingSlots.map(s=>s.token).join(' ');
  const rendered=resolveManuscriptDates({paragraphs:['开局：'+c.opening,'过程：'+c.process,'结局：'+c.ending,'应期：'+timingText,'总断：'+c.summary],dateSlots:row.timingSlots,reading:r,castingDate:'2026-11-11',timingScale:'day',timingContext:{castingMethod:'pre-heaven',periodMethod:'element-qi'}});
  if(rendered.status!=='resolved')throw new Error('Base date render failed');
  const sources=row.decision.sourceEvidence;
  const titles=sources?`《周易·${name}》`+[...new Set(sources.map(s=>s.title))].map(title=>`《梅花易数·${title}》`).join(''):'《梅花易数·求名占》《衰旺论》《占卦诀》《体用互变之诀》《体用衰旺之诀》《日应》';
  const editorialDetails=sources?[
   row.counterevidence[0].resolution,
   row.timingOmission?.reason||row.timingSlots.map((s,i)=>`${s.valence}应 · ${s.event}。取${s.calculationBasis.trigram}${s.calculationBasis.element}，${s.branches.join('、')}日。用先天卦气法按日匹配，先查起卦当月余日，无匹配再查下月。示例 ${rendered.dateMatches[i].displayedDates.join('、')}。`).join('\n\n'),
   ...sources.map(s=>`- ${s.id}《${s.title}》，原文第 ${s.locator.startLine} 行起。\n  “${s.quote}”\n  ${s.reason}`),
  ].join('\n\n')+'\n\n':'';
  doc+=`## ${r.selectedMovingLine.label}动 · ${row.monthBranches.map(b=>b+'月').join('、')}\n\n${row.copy.title}\n\n${row.facts.stages.map(s=>s.name).join(' → ')}\n\n简断\n\n${row.copy.short.text}\n\n${rendered.paragraphs.join('\n\n')}\n\n古籍依据：${titles}。\n\n动爻完整原文：${row.movingLineText}\n\n<details>\n<summary>计算说明</summary>\n\n对照用月令：${row.monthBranches[0]}月；本组共用：${row.monthBranches.join('、')}。实际输入仍显示实际月令。\n\n${r.nodes.filter(n=>n.role!=='body_inherited').map(n=>n.role+'：'+n.trigram+n.element+'，'+n.strength.state).join('；')}。\n\n应期用实际起卦日重算。表中月份用于对照正文。\n\n${editorialDetails}判据：${row.decision.decisionPolicy.id}；写作方式：${row.authorship.method}。\n\n</details>\n\n`;
 }
 await writeFile(new URL(path,root),doc);
 const reviewDoc=`INTERVIEW_REWRITE_${hexId}.md`;
 const reviewLink=reviewDocs.has(reviewDoc)?` [审查记录](${reviewDoc})`:'';
 directory+=`- [${file.primaryId} ${name}](interview-pass/hex-${hexId}.md)：六动爻、十二月令，72槽位。${reviewLink}\n`;
}
await writeFile(new URL('docs/INTERVIEW_PASS_ALL_BASES.md',root),directory);
await writeFile(new URL('docs/INTERVIEW_VOID_FIRST_THREE.md',root),renderFirstThreeVoidReview(rows));
await writeFirstThreeVoidFullText({root,library,question,rows});
const archivalRuntime=createInterviewManuscriptRepository({library,readJSON:readBuiltJSON,includeHistoricalVoid:true});
await writeInterviewVoidRewrites({root,library,question,runtime:archivalRuntime,rows,progress:voidRevision.progress});
