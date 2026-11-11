import {writeFile} from 'node:fs/promises';
import {loadLibrary,createQuestionRepository,interpretationArtifactDigest} from '../src/index.js';
import {collectStoryFacts,resolveConflictCase,validateStoryCopy,STORY_EDITORIAL_VERSION} from '../src/story-editorial.js';
import {TEN_READINGS_V3} from '../sources/editorial/ten-readings-v3.mjs';
const root=new URL('../',import.meta.url),library=await loadLibrary(),repo=createQuestionRepository({library});
const items=[];
for(const authored of TEN_READINGS_V3){
 const question=await repo.getQuestion(authored.questionId);
 const facts=collectStoryFacts({library,question,primaryId:authored.primaryId,movingLine:authored.movingLine,monthOrder:'winter-water'});
 const questionScope=authored.questionScope||{id:'catalog-question',question:question.question,outcomeTarget:question.positiveEvent};
 const decisionId=`${STORY_EDITORIAL_VERSION}/${question.id}/${questionScope.id}/${authored.primaryId}/${authored.movingLine}/winter-water/${authored.outcomeCode}`;
 const conflict=resolveConflictCase(facts);
 if(authored.conflictPolicyId&&(conflict.status!=='case-policy-matched'||conflict.policyId!==authored.conflictPolicyId||conflict.outcomeCode!==authored.outcomeCode))throw new Error('Conflict case and authored decision disagree');
 const decision={id:decisionId,outcomeCode:authored.outcomeCode,question_type:question.question_type,questionScope,
  sourceIds:authored.sourceIds,method:'curated-case-interpretation;no-numeric-weights',
  conflictResolution:authored.conflictPolicyId?conflict:{status:'curated-case-interpretation',counterevidence:authored.counterevidence},
  provenance:'project-editorial-application;not-a-classical-verbatim-verdict',productionAllowed:false};
 const sample={number:authored.number,selection:{questionId:question.id,question_type:question.question_type,domainId:question.domainId,questionScope},facts,decision,
  lineApplication:{...authored.lineApplication,allDetectedTerms:facts.line.terms},counterevidence:authored.counterevidence,
  copy:{title:authored.title,short:{decisionId,text:authored.short},long:{decisionId,opening:authored.opening,process:authored.process,ending:authored.ending,summary:authored.summary}},
  practicalAdvice:authored.practicalAdvice,...(authored.traditionalSearchHint?{traditionalSearchHint:authored.traditionalSearchHint}:{}),
  status:'editorial-preview',productionAllowed:false,reviewVersion:STORY_EDITORIAL_VERSION};
 sample.copyChecks=validateStoryCopy(sample);
 sample.artifactDigest=await interpretationArtifactDigest(sample);
 items.push(sample);
}
const sourceIds=[...new Set(items.flatMap(s=>s.decision.sourceIds))];
const sources=Object.fromEntries(sourceIds.map(id=>{const s=library.getSection(id);if(!s)throw new Error('Source missing');return [id,{title:s.title,fullText:s.text,sourceRef:s.sourceRef}];}));
const bundle={schemaVersion:'1.0.0',contentVersion:library.contentVersion,reviewVersion:STORY_EDITORIAL_VERSION,count:items.length,
 authorship:'new prose authored by the assistant;not-historical-case-feedback',
 scope:{monthOrder:'winter-water',void:'not-applied',timing:'not-derived',productionApproved:0,shortAndLong:'one-decision-id;semantic-consistency-still-requires-editorial-reading'},
 questions:'Exact catalog question plus declared questionScope; scopes 6 and 8 are not substitutes for every question under the parent IDs.',sources,items};
await writeFile(new URL('data/ten-readings-v3.json',root),JSON.stringify(bundle,null,2)+'\n');
let doc='# 十篇新样稿 V3：简断与详断\n\n断语由本助手撰写。以下为冬水当令的传统卦象解读样稿，不是古籍反馈案例。旬空扩展与精确应期未纳入这批；当前不进入正式结果库。\n\n每篇简断为60–120个汉字，与详断绑定同一结论。专业判断、反例和完整动爻保存在 data/ten-readings-v3.json。④、⑦采用有明确前提的项目判例，未推广为通用古籍公式。\n\n';
for(const s of items){
 const c=s.copy,f=s.facts;
 doc+=`## ${s.number}．${s.selection.questionScope.question}\n\n${f.stages.primary.name} → ${f.stages.mutual.name} → ${f.stages.changed.name}，${f.line.label}动。\n\n${c.title}\n\n简断\n\n${c.short.text}\n\n详断\n\n`;
 for(const [key,label] of [['opening','开局'],['process','过程'],['ending','结局'],['summary','总断']])doc+=label+'：'+c.long[key]+'\n\n';
 doc+='依据：《梅花易数》'+s.decision.sourceIds.map(id=>'《'+sources[id].title+'》').join('、')+'；《周易》本卦'+f.line.label+'。\n\n';
 doc+='动爻完整原文：'+f.line.fullText+'\n\n';
}
await writeFile(new URL('docs/TEN_READINGS_V3.md',root),doc);
console.log({samples:items.length,shortHan:items.map(s=>s.copyChecks.shortHanCount),exactConflictCases:items.filter(s=>s.decision.conflictResolution.status==='case-policy-matched').length,productionApproved:0});
