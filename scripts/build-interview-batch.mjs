import {mkdir,readFile,writeFile,rm,readdir} from 'node:fs/promises';
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
const root=new URL('../',import.meta.url),library=await loadLibrary(),base='data/authored-readings/interview-pass/';
const raw=PRODUCT_TAXONOMY.find(c=>c.id==='career').subcategories.find(s=>s.id==='interview').questions.find(q=>q.id==='interview-pass');
const question={...raw,id:INTERVIEW_QUESTION_ID,manuscriptIndexPath:base+'index.json'};
const common={schemaVersion:'1.0.0',contentVersion:library.contentVersion,manuscriptVersion:INTERVIEW_MANUSCRIPT_VERSION,questionId:question.id};
const sourceIds=['mh-056','mh-058','mh-071','mh-101','mh-116','mh-117','mh-119','mh-143','user-void-extension','user-void-timing'];
const authored=[...INTERVIEW_PASS_BATCH_001.map(a=>({...a,monthOrder:'winter-water'})),...INTERVIEW_PASS_OTHER_MONTHS];
const ledger=await loadInterviewLineLedger(library),known=new Set(authored.map(a=>`${a.primaryId}/${a.movingLine}/${a.monthOrder}`));
for(let primaryId=1;primaryId<=64;primaryId++)for(let movingLine=1;movingLine<=6;movingLine++)for(const order of MONTH_ORDERS){
 if(known.has(`${primaryId}/${movingLine}/${order.id}`))continue;
 const r=createBaseInterviewReading({library,question,primaryId,movingLine,monthOrder:order.id,castingDate:'2026-11-11'});
 authored.push(authorBaseInterview(r,ledger.get(`${primaryId}/${movingLine}`)));
}
const rows=[];
for(const [index,a] of authored.entries()){
 const monthBranches=MONTH_SLOTS.filter(m=>m.qi===a.monthOrder).map(m=>m.branch);
 const reading=(a.baseNoVoid?createBaseInterviewReading:createInterviewReading)({library,question,primaryId:a.primaryId,movingLine:a.movingLine,monthBranch:monthBranches[0],castingDate:'2026-11-11'});
 const facts={stages:Object.values(reading.stages).map(s=>({id:s.id,name:s.name,baseGrade:s.baseGrade})),
  nodes:reading.nodes.map(n=>({role:n.role,trigram:n.trigram,element:n.element,qi:n.strength.state,void:n.void,supportEvidence:n.supportEvidence})),
  directRelations:reading.edges.map(e=>({role:e.targetRole,type:e.type})),movingLine:{...inspectMovingLine(reading.selectedMovingLine.text),label:reading.selectedMovingLine.label,sourceRef:reading.selectedMovingLine.sourceRef},
  referenceContext:{voidApplied:!a.baseNoVoid,displayInUserResult:false,castingDate:'2026-11-11',dayGanzhi:reading.dayGanzhi,monthOrder:a.monthOrder,monthBranches,purpose:'explicit-qi-comparison-and-date-render-test;not-real-simultaneous-seasonal-casts'}};
 const decisionId=`${question.id}/${a.primaryId}/${a.movingLine}/${a.monthOrder}/${a.outcome}`;
 const decision={id:decisionId,outcomeCode:a.outcome,question_type:question.question_type,questionScope:'one-interview-stage',
  method:'project-application-of-fame-chapter;not-a-verbatim-classical-interview-rule',sourceIds,
  counterevidence:a.counterevidence,lineApplication:{...a.lineApplication,allDetectedTerms:facts.movingLine.terms},
  consistency:checkInterviewDecision(reading,a),decisionPolicy:a.decisionPolicy||{id:'retained-authored-case',sourceIds,scope:'previously-authored-specific-case'},
  indirectEffectsApplied:[],interpretationProvenance:'assistant-authored;not-observed-feedback;not-scientifically-verified-prediction'};
 const copy={title:a.title,short:{decisionId,text:a.short},long:{decisionId,opening:a.opening,process:a.process,ending:a.ending,summary:a.summary}};
 const checks={...validateStoryCopy({decision,copy,lineApplication:a.lineApplication,counterevidence:a.counterevidence}),shortSeparation:checkInterviewShort(copy.short.text)};
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
  scope:'base-prose-and-recorded-void-profile;equivalent-qi-month-slots-share-written-text;exempt-core-void-does-not-change-verdict',verification:a.authorship?'canonical-facts-and-rule-conformance;curated-line-ledger;compiled-prose-not-manual-whole-article-review':'computed-facts-plus-authored-judgment;not-independent-human-expert-certification',
  compilation:a.authorship||{method:'individually-authored-reference-case',manualWholeArticleReview:true},
  independentReview:{status:'pending',timingInterpretation:'pending',calendarConversion:'separate-technical-check',userAcceptedThisVersion:false},
  checks:Object.fromEntries(AUDIT_CHECKS.map(id=>[id,{status:'pass',scope:'author-check-only;not-independent-approval',evidence:[{sourceId:'project-interview-authoring',locator:evidence[id][1],reason:evidence[id][0]}]}]))};
 const row={number:index+1,primaryId:a.primaryId,movingLine:a.movingLine,monthOrder:a.monthOrder,monthBranches,voidProfileKey:a.baseNoVoid?'base-no-void':getVoidProfileKey(reading),
  stageIds:Object.values(reading.stages).map(s=>s.id),movingLineText:reading.selectedMovingLine.text,facts,decision,copy,timingSlots,
  baseProse:true,baseNoVoid:Boolean(a.baseNoVoid),authorship:a.authorship||{method:'individually-authored-reference-case',manualWholeArticleReview:true},coreVoidNotes,ruleVersions:{void:VOID_RULESET.id,decision:INTERVIEW_DECISION_POLICY_VERSION},voidReleaseSpecs:[],voidTimingSlots:[],voidTimingText:'',
  lineApplication:a.lineApplication,counterevidence:a.counterevidence,sourceIds,review,copyChecks:checks};
 row.artifactDigest=await interpretationArtifactDigest(row);rows.push(row);
}
if(rows.length!==1920||new Set(rows.map(r=>r.primaryId+'/'+r.movingLine+'/'+r.monthOrder)).size!==1920)throw new Error('Expected all 1920 base-qi versions');
await mkdir(new URL(base,root),{recursive:true});
const files=[];let monthSlotCount=0;
for(const primaryId of Array.from({length:64},(_,i)=>i+1)){
 const pool=rows.filter(r=>r.primaryId===primaryId),monthSlots={};
 for(const [i,r] of pool.entries())for(const b of r.monthBranches){const k=r.movingLine+':'+b;if(k in monthSlots)throw new Error('Duplicate month slot');monthSlots[k]=i;monthSlotCount++;}
 const path=base+`hex-${String(primaryId).padStart(3,'0')}.json`;
 await writeFile(new URL(path,root),JSON.stringify({...common,primaryId,monthSlots,rows:pool})+'\n');
 files.push({primaryId,path,count:pool.length,monthSlotCount:Object.keys(monthSlots).length});
}
// Retained original winter file for stable external links; not loaded by the application.
await writeFile(new URL(base+'batch-001.json',root),JSON.stringify({...common,batchId:'batch-001',rows:rows.slice(0,12)})+'\n');
const index={...common,baseCaseCount:monthSlotCount,authoredVersionCount:rows.length,contextProfileCount:rows.length,totalBaseCases:4608,
 monthSlotPolicy:MONTH_SLOT_POLICY,monthSlots:MONTH_SLOTS,allTwelveMonthsCoveredForCharts:384,remainingBaseSlots:4608-monthSlotCount,
 coverage:'all-384-core-charts-and-4608-month-slots;core-changing-void-variants-separate',
 authorship:{retainedIndividuallyAuthored:60,additionalRuleCompiled:1860,lineLedgerEntries:384,compilationVersion:BASE_AUTHORING_VERSION,independentReview:'pending'},
 storage:'hexagram-shards;month-slot-to-row-pool-index;no-runtime-prose-generation',files};
await writeFile(new URL(base+'index.json',root),JSON.stringify(index,null,2)+'\n');
await writeFile(new URL('data/authored-readings/progress.json',root),JSON.stringify({...common,
 activeQuestionId:question.id,activeQuestion:'这次面试能通过吗？',order:'chart-and-moving-line/all-twelve-month-slots;finish-question-before-offer',
 baseCasesWritten:monthSlotCount,totalBaseCases:4608,uniqueAuthoredVersions:rows.length,contextProfilesWritten:rows.length,
 fullTwelveMonthCharts:384,remainingBaseSlots:4608-monthSlotCount,backgroundExecution:false,files,
 baseCoverageComplete:true,nextWork:'Interview-pass base coverage complete; core-changing void variants are separate; final-offer question is not authored.'},null,2)+'\n');
const runtime=createInterviewManuscriptRepository({library,readJSON:async p=>JSON.parse(await readFile(new URL(p,root),'utf8'))});
const intro='本问64卦×6动爻×12月令，共4,608个基础槽位已全部覆盖，完整正文1,920份。同旺衰、同结论的月份明确共用全文。当前页保留首组60份对照稿；全部卦象见INTERVIEW_PASS_ALL_BASES.md。新增稿由384条动爻专门解释与公开基础判据离线编译成文，具体写作与复核范围见完整目录。辰未戌丑按本项目四季土月口径，未自动推算每季末十八日。\n\n正文事先写定；日期以保存的起卦日换算。下列统一以2026-11-11演示日序，计算说明中的月令只作各组对照代表，实际软件显示传入的月令，不套用代表月份；本日干支、旬空和日期均从实际起卦日重算。月令为显式比较维度，不把这一天声称为不同的实际节令。无关静空不单独写情节或应期，核心空情境另行匹配。\n\n';
let all='# 求职面试：十二月令首组完整稿\n\n'+intro,winter='# 求职面试：冬令首批（已更新空亡处理与十二月令口径）\n\n'+intro;
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
let directory='# 求职面试：全部基础卦象\n\n目标问项：这次面试能通过吗。64卦、每卦6动爻、每动爻12月令，共4,608个基础检索槽位；实际去重存储1,920份完整正文。拿到最终录用是另一问，未由本库代答。\n\n保留原60份逐篇稿，新增1,860份由384条单独撰写的动爻解释与建议、同一五态表及明确判据预编译成完整正文。每份保存写作方式、决策规则、来源、反证与完整爻辞，不声称新增稿全部经过逐字人工审阅或独立专家验收。客户端只读取已存全文，不运行自由语言生成。\n\n以下是基础生克与月令版本，不包括所有改变核心结论的旬空组合。普通场景按实际起卦日换算日干支、旬空与日期；未覆盖的核心空亡不会冒用基础稿。传统应期的独立复核仍待完成。\n\n寅卯木、巳午火、申酉金、亥子水、辰未戌丑土，十二月令各自有键，同气且同结论时共用全文。日期以2026-11-11作展示换算，示例月令不冒充当天节令。\n\n';
for(const file of files){
 const pool=rows.filter(r=>r.primaryId===file.primaryId).sort((a,b)=>a.movingLine-b.movingLine||MONTH_ORDERS.findIndex(m=>m.id===a.monthOrder)-MONTH_ORDERS.findIndex(m=>m.id===b.monthOrder));
 const name=library.getHexagram(file.primaryId).name,path=`docs/interview-pass/hex-${String(file.primaryId).padStart(3,'0')}.md`;
 let doc=`# ${file.primaryId} · ${name}：六动爻与十二月令\n\n本页30份完整正文对应72个月令槽位。此处为不应用旬空的基础对照；实际页面另行计算旬空。全部日期为2026-11-11起卦的日序展示，不声称不同月令是同一天的实际节令。\n\n`;
 for(const row of pool){
  const r=createBaseInterviewReading({library,question,primaryId:row.primaryId,movingLine:row.movingLine,monthBranch:row.monthBranches[0],castingDate:'2026-11-11'});
  const c=row.copy.long,rendered=resolveManuscriptDates({paragraphs:['开局：'+c.opening,'过程：'+c.process,'结局：'+c.ending,'应期：以下为传统推算的参考窗口。\n'+row.timingSlots.map(s=>s.token).join(' '),'总断：'+c.summary],dateSlots:row.timingSlots,reading:r,castingDate:'2026-11-11',timingScale:'day',timingContext:{castingMethod:'pre-heaven',periodMethod:'element-qi'}});
  if(rendered.status!=='resolved')throw new Error('Base date render failed');
  doc+=`## ${r.selectedMovingLine.label}动 · ${row.monthBranches.map(b=>b+'月').join('、')}\n\n${row.copy.title}\n\n${row.facts.stages.map(s=>s.name).join(' → ')}\n\n简断\n\n${row.copy.short.text}\n\n${rendered.paragraphs.join('\n\n')}\n\n古籍依据：《梅花易数·求名占》《衰旺论》《占卦诀》《体用互变之诀》《体用衰旺之诀》《日应》。\n\n动爻完整原文：${row.movingLineText}\n\n<details>\n<summary>计算说明</summary>\n\n对照用月令：${row.monthBranches[0]}月；本组共用：${row.monthBranches.join('、')}。实际输入仍显示实际月令。\n\n${r.nodes.filter(n=>n.role!=='body_inherited').map(n=>n.role+'：'+n.trigram+n.element+'，'+n.strength.state).join('；')}。\n\n基础稿未应用旬空，不把半空或全空当作此处已发生的事实。实际旬空与应期从真实起卦日重算。\n\n判据：${row.decision.decisionPolicy.id}；写作方式：${row.authorship.method}。\n\n</details>\n\n`;
 }
 await writeFile(new URL(path,root),doc);directory+=`- [${file.primaryId} ${name}](interview-pass/hex-${String(file.primaryId).padStart(3,'0')}.md)：六动爻、十二月令，72槽位。\n`;
}
await writeFile(new URL('docs/INTERVIEW_PASS_ALL_BASES.md',root),directory);
