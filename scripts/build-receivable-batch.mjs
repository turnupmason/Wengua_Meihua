import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {loadLibrary,MONTH_ORDERS} from '../src/index.js';
import {writeReceivableManuscript,profileKey} from './receivable-prose.mjs';
import {RECEIVABLE_NOTES} from '../sources/editorial/receivable-notes.mjs';
import {resolveManuscriptDates} from '../src/prewritten-manuscripts.js';
const root=new URL('../',import.meta.url),questionId='domain-10-receivable',lib=await loadLibrary();
const technicalReview=JSON.parse(await readFile(new URL('data/interpretation-reviews.json',root),'utf8'));
if(technicalReview.approvedBaseStoryCount!==0||technicalReview.approvedProfileStoryCount!==0)throw new Error('Legacy builder cannot certify interpretive approval; implement exact reviewed export first');
const path=`data/question-stories/${questionId}/`,save=async(p,value)=>writeFile(new URL(p,root),JSON.stringify(value)+'\n');
await mkdir(new URL(path,root),{recursive:true});
const stems=[...'甲乙丙丁戊己庚辛壬癸'],branches=[...'子丑寅卯辰巳午未申酉戌亥'];
const days=Array.from({length:60},(_,i)=>stems[i%10]+branches[i%12]);
const files=[];let bases=0,profiles=0,normalProfiles=0;const examples=[];
for(let primaryId=1;primaryId<=64;primaryId++){
 const textPool=[],textIds=new Map(),verdictPool=[],verdictIds=new Map(),timingPool=[],timingIds=new Map(),rows=[];
 const intern=p=>{if(!textIds.has(p)){textIds.set(p,textPool.length);textPool.push(p);}return textIds.get(p);};
 const internJSON=(value,pool,ids)=>{const key=JSON.stringify(value);if(!ids.has(key)){ids.set(key,pool.length);pool.push(value);}return ids.get(key);};
 const record=(r,o,withTrace=false)=>{const story=writeReceivableManuscript(r,o);return {paragraphIds:story.paragraphs.map(intern),verdictId:internJSON(story.verdict,verdictPool,verdictIds),timingId:internJSON(story.dateSlots,timingPool,timingIds),...(withTrace?{trace:story.trace}:{})};};
 for(let movingLine=1;movingLine<=6;movingLine++)for(const o of MONTH_ORDERS){
  const make=voidContext=>lib.createReading({primaryId,movingLine,domainId:'domain-10',question:'客户欠的这笔尾款能收到吗？',calendar:{season:o.season},voidContext});
  const baseReading=make({}),base=record(baseReading,o,true),variants=new Map();
  const insert=(r,context,kind)=>{const key=profileKey(r);if(!variants.has(key))variants.set(key,{profileKey:key,representativeContext:context,coverageKind:kind,...record(r,o)});};
  for(const ganzhi of days){
   const context={ganzhi},r=make(context);insert(r,context,'standard-day-context');
   const eligible=r.nodes.filter(n=>n.role!=='body_inherited'&&n.void.state==='dormant'&&n.void.hitKind==='full');
   for(let mask=1;mask<2**eligible.length;mask++){
    const roleEvidence=Object.fromEntries(eligible.filter((_,i)=>mask&(1<<i)).map(n=>[n.role,{severelyWeak:true,dayMonthAttacked:true}]));
    const explicit={ganzhi,roleEvidence};insert(make(explicit),explicit,'explicit-true-void-evidence-required');
   }
  }
  const row={primaryId,movingLine,monthOrder:o.id,stageIds:Object.values(baseReading.stages).map(s=>s.id),baseGrades:Object.values(baseReading.stages).map(s=>s.baseGrade),
   reviewStatus:'reviewed',baseAssumption:'month-qi-manuscript;void-not-yet-applied',base,variants:[...variants.values()]};
  rows.push(row);bases++;profiles+=variants.size;normalProfiles+=[...variants.values()].filter(v=>v.coverageKind==='standard-day-context').length;
  if([1,6,12,22,24,32,42,43,48,64].includes(primaryId)&&movingLine===(primaryId===48?5:primaryId===22?5:primaryId===42?4:primaryId===43?3:primaryId===12?3:1)&&o.id==='winter-water'){
   const r=make({ganzhi:'己丑'}),story=writeReceivableManuscript(r,o);examples.push({primaryId,movingLine,monthOrder:o.id,voidContext:{ganzhi:'己丑'},...story});
  }
 }
 const filePath=path+String(primaryId).padStart(2,'0')+'.json';
 const value={schemaVersion:'1.0.0',catalogVersion:'1.0.0',contentVersion:lib.contentVersion,questionId,manuscriptVersion:'receivable-1.0.0',hexagramId:primaryId,
  storage:'complete-ordered-paragraph-references;dictionary-compression-not-runtime-language-generation',sourceIds:['mh-007','mh-009','user-yijing64','mh-061','mh-072','mh-116','mh-117','mh-118','mh-119','mh-122','mh-143','user-void-extension','user-void-timing'],textPool,verdictPool,timingPool,rows};
 await save(filePath,value);files.push({hexagramId:primaryId,path:filePath,baseStoryCount:rows.length,profileStoryCount:rows.reduce((n,r)=>n+r.variants.length,0),sha256:createHash('sha256').update(JSON.stringify(value)+'\n').digest('hex')});
}
if(bases!==1920)throw new Error('Batch is not complete');
const manifest={schemaVersion:'1.0.0',catalogVersion:'1.0.0',contentVersion:lib.contentVersion,questionId,manuscriptVersion:'receivable-1.0.0',kind:'sharded-complete-manuscripts',
 baseStoryCount:bases,profileStoryCount:profiles,standardDayProfileStoryCount:normalProfiles,profilePolicy:'void-role-state-v1',files,
 review:{lineApplications:384,hexagramFinanceNotes:64,structureAndSources:'all rows checked by validator',prose:'build-time whole manuscripts from authored line-specific applications and explicit editorial rules;not separately hand-written 1920 times',
  cases:'new prospective symbolic prose;no historical feedback invented',dates:'resolved from frozen casting date;not stored as fixed day numbers',unknownContexts:'pending-no-fallback'},
 sourceIds:['mh-007','mh-009','user-yijing64','mh-061','mh-072','mh-116','mh-117','mh-118','mh-119','mh-122','mh-143','user-void-extension','user-void-timing']};
manifest.technicalReview={status:'requires-revision',policyVersion:technicalReview.policyVersion,approvedBaseStories:0,approvedProfileStories:0,
 registry:'data/interpretation-reviews.json',legacyReviewStatusMeaning:'structural-only;not-nine-check-approval'};
await save(path+'index.json',manifest);
const indexPath=new URL('data/question-stories/index.json',root),index=JSON.parse(await readFile(indexPath,'utf8'));
index.files=index.files.filter(f=>f.questionId!==questionId);index.files.push({questionId,path:path+'index.json',kind:manifest.kind,baseStoryCount:bases,profileStoryCount:profiles});
index.writtenBaseStoryCount=index.files.reduce((n,f)=>n+(f.baseStoryCount||0),0);index.writtenProfileStoryCount=index.files.reduce((n,f)=>n+(f.profileStoryCount||0),0);
index.files=index.files.map(f=>({...f,technicalReviewStatus:'requires-revision'}));
index.approvedBaseStoryCount=0;index.approvedProfileStoryCount=0;index.interpretationPolicyVersion=technicalReview.policyVersion;
await save('data/question-stories/index.json',index);
await save('data/question-stories/receivable-review-samples.json',{schemaVersion:'1.0.0',catalogVersion:'1.0.0',contentVersion:lib.contentVersion,questionId,examples});
let doc='# 第1批：客户尾款（待修订稿）\n\n最新审查：本批九项断法审核尚未通过，可发布数为0。以下原稿和日期保留供内部逐项核对，不是审核通过的解读。已发现旺衰适用不完整、间接生克应用未经逐条批准、部分空亡解释和应期依据不足；须依据 INTERPRETATION_AUDIT_V2.md 修订。结构测试通过不代表预测或断法正确。\n\n本批1,920篇盘与月令基础稿，另有'+profiles+'篇预写空亡情境全文。所有文章在构建时写入，运行时按编号取已经排定的完整段落，只替换日期。采用段落字典减少重复存储，字典引用不增加新的现场写作步骤。\n\n384条动爻应用逐爻另写，并与原爻绑定；64条求款背景说明另写。完整稿由显式编者规则在构建阶段成文，不声称1,920篇分别逐字人工创作。旬空正常日基准穷举60干支，额外真空分支必须有调用方明确证据。未覆盖的释放或自定义条件仍返回缺稿，不近似匹配。\n\n';
doc+='以下为指定演示盘，统一按2026-11-11己丑日、冬水当令，演示先天卦气按日取期；不是同一时刻用同一算法自动起出的十张盘，也不冒充古籍真实案例。日期是相应事项的候选窗口。\n\n';
for(const e of examples){
 const reading=lib.createReading({primaryId:e.primaryId,movingLine:e.movingLine,domainId:'domain-10',calendar:{season:'winter'},voidContext:e.voidContext});
 const rendered=resolveManuscriptDates({paragraphs:e.paragraphs,dateSlots:e.dateSlots,reading,castingDate:'2026-11-11',timingScale:'day',timingContext:{castingMethod:'pre-heaven',periodMethod:'element-qi'}});
 if(rendered.status!=='resolved')throw new Error('Review sample dates failed to render');
 doc+='## '+lib.getHexagram(e.primaryId).name+' · '+lib.getLineReading(e.primaryId,e.movingLine).label+' · 冬水当令\n\n'+rendered.paragraphs.join('\n\n')+'\n\n';
}
doc+='## 调用与复核\n\n调用示例见 `docs/DATA_AND_API.md`。完整数据库由 `npm run build:questions` 生成 `dist/question-stories.sql`，`npm run build:sqlite` 将其与其他资料并入 `dist/wengua.sqlite`。校验执行 `npm run validate:receivable` 与 `npm run validate:questions`。\n';
await writeFile(new URL('docs/RECEIVABLE_BATCH_01.md',root),doc);
const catalog=JSON.parse(await readFile(new URL('data/question-items.json',root),'utf8'));
const allItems=catalog.domains.flatMap(d=>d.items).filter(q=>q.mode==='narrative').map(q=>q.id);
const preferred=['domain-10-receivable','domain-10-loan-return','domain-10-refund','domain-10-profit-share','domain-10-business-income'];
const queue=[...preferred,...allItems.filter(id=>!preferred.includes(id))],completed=new Map(index.files.map(f=>[f.questionId,f]));
await save('data/question-stories/batch-progress.json',{schemaVersion:'1.0.0',contentVersion:lib.contentVersion,targetQuestions:75,
 completedQuestions:0,generatedQuestions:index.files.filter(f=>f.baseStoryCount===1920).length,writtenBaseStoryCount:index.writtenBaseStoryCount,writtenProfileStoryCount:index.writtenProfileStoryCount,
 approvedBaseStoryCount:0,approvedProfileStoryCount:0,interpretationPolicyVersion:technicalReview.policyVersion,
 queue:queue.map(id=>({questionId:id,status:completed.get(id)?.baseStoryCount===1920?'generated-awaiting-technical-revision':'queued',baseStories:completed.get(id)?.baseStoryCount||0})),
 nextQuestionId:null,pausedReason:'Repair and review interpretation rules before expanding generated manuscripts',backgroundExecution:false});
console.log({questionId,baseStories:bases,profileStories:profiles,normalProfiles,shards:files.length});
