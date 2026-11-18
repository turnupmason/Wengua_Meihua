// 面试问项 2026-11-18 起改为 interview-pass-3.0.0（考试定稿口径，见 docs/review/INTERVIEW_REJUDGE_20261118.md），空亡旧版只留档；
// 依赖旧版空亡正文与旧结论码的用例已移除，新版覆盖见 tests/interview-pass.test.mjs。
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {loadLibrary,createProductRepository,getCivilDay,AUDIT_CHECKS,interpretationArtifactDigest} from '../src/index.js';
import {createInterviewReading,interviewTimingSlots} from '../src/interview-manuscripts.js';
import {MONTH_SLOTS,assessVoid} from '../src/index.js';
import {checkInterviewDecision,checkInterviewShort} from '../src/interview-decision-checks.js';
const read=async p=>JSON.parse(await readFile(new URL('../'+p,import.meta.url),'utf8'));
const library=await loadLibrary(),product=createProductRepository({library,includeHistoricalInterviewVoid:true});
const question=await product.getQuestion('career.interview.interview-pass');
const index=await read('data/authored-readings/interview-pass/index.json');
const all=await Promise.all(index.files.map(f=>read(f.path)));
const batch={rows:all.flatMap(f=>f.rows).filter(r=>r.authorship.method==='individually-authored-reference-case')};
const classicalProduct=createProductRepository({library});
const context={castingDate:'2026-11-11',monthOrder:'winter-water',timingScale:'day',timingContext:{castingMethod:'pre-heaven',periodMethod:'element-qi'}};

test('complete qi governs void exemptions; stationary empty fire, moving empty fire and partial Kun are distinct',()=>{
 const reading=createInterviewReading({library,question,...context,primaryId:5,movingLine:2});
 assert.equal(reading.nodes.find(n=>n.role==='body').strength.state,'旺');
 assert.equal(reading.nodes.find(n=>n.role==='body_mutual').void.state,'dormant');
 assert.equal(reading.nodes.find(n=>n.role==='changed_use').void.state,'moving_exempt');
 assert.equal(reading.nodes.find(n=>n.role==='body_inherited').void,reading.nodes.find(n=>n.role==='body').void);
 const partial=createInterviewReading({library,question,...context,primaryId:16,movingLine:2}).nodes.find(n=>n.role==='use');
 assert.equal(partial.void.hitKind,'partial');assert.deepEqual(partial.void.matchedBranches,['未']);assert.equal(partial.void.state,'partial_reduced');assert.equal(partial.void.effective,'reduced');assert.equal(partial.void.numericMultiplier,null);
 const supported=createInterviewReading({library,question,...context,primaryId:40,movingLine:5}).nodes.find(n=>n.role==='body_mutual');
 assert.equal(supported.void.state,'supported');assert.ok(supported.supportEvidence.some(e=>e.basis==='internal-moving-direct-generation'));
 const wronglyChosen=()=>interviewTimingSlots(reading,[{kind:'support',role:'body_mutual',sourceIds:['mh-071']}]);
 assert.throws(wronglyChosen,/active direct/);
});

test('progress stays on the first interview question and records all 4608 base slots without claiming final-offer coverage',async()=>{
 const progress=await read('data/authored-readings/progress.json');
 assert.equal(progress.activeQuestionId,question.id);assert.equal(progress.baseCasesWritten,4608);assert.equal(progress.totalBaseCases,4608);assert.equal(progress.backgroundExecution,false);
 const offer=await product.getContent({questionId:'career.interview.job-offer',...context,primaryId:5,movingLine:2});
 assert.equal(offer.status,'pending-authoring');assert.equal(offer.story,null);
});

test('all short readings stay date-free while the reference timing field supplies independently labelled concrete windows',async()=>{
 for(const row of batch.rows){
  assert.equal(checkInterviewShort(row.copy.short.text).status,'passed');
  const out=await product.getContent({questionId:question.id,...context,primaryId:row.primaryId,movingLine:row.movingLine,monthOrder:row.monthOrder,monthBranch:row.monthBranches[0]});
  assert.equal(out.narrativeParagraphs.length,4);assert.ok(out.narrativeParagraphs.every(p=>!p.startsWith('应期：')));
  assert.equal(out.timingSection.windows.length,out.dateResolution.dateMatches.length);
  if(row.timingOmission){
   assert.equal(out.timingSection.referenceNote,'此盘暂无有据的日期可列。');
   assert.deepEqual(out.timingSection.windows,[]);
   assert.equal(row.timingOmission.status,'not-derived');
   assert.ok(row.timingOmission.reason&&row.timingOmission.sourceIds.length);
   continue;
  }
  assert.equal(out.timingSection.referenceNote,'以下为传统推算的参考窗口。');
  assert.ok(out.timingSection.windows.length);
  for(const w of out.timingSection.windows){
   assert.ok(w.event&&['吉','凶'].includes(w.valence)&&w.calculationBasis.sourceIds.length);
   assert.ok(w.displayedDates.length);assert.match(w.text,/号/);assert.ok(!w.text.includes('{{date:'));
  }
 }
 for(const forbidden of ['应期留意收到反馈的时段','留意有利窗口','计算说明里再看',''])assert.throws(()=>checkInterviewShort(forbidden),/natural prose/);
});

test('legacy qi-only input never claims its representative lookup slot was the actual month',async()=>{
 const out=await product.getContent({questionId:question.id,...context,monthOrder:'spring-wood',primaryId:5,movingLine:2});
 assert.equal(out.status,'ready');assert.equal(out.monthBranch,null);assert.equal(out.calculationExplanation.month.branch,null);
 assert.equal(out.calculationExplanation.month.input,'qi-category-only');
 assert.match(out.calculationExplanation.paragraphs[0],/春木当令.*具体月令未提供/);
 assert.ok(!/月令：寅月/.test(out.calculationExplanation.paragraphs[0]));
});

test('lookup reads one hexagram shard and shared prose does not duplicate twelve full articles in memory',async()=>{
 const paths=[];const p=createProductRepository({library,readJSON:async path=>{paths.push(path);return read(path);}});
 for(const monthBranch of ['寅','卯','辰'])await p.getContent({questionId:question.id,...context,monthOrder:undefined,monthBranch,primaryId:5,movingLine:2});
 assert.deepEqual(paths.filter(p=>/\/hex-/.test(p)),['data/authored-readings/interview-pass/hex-005.json']);
 const file=all.find(f=>f.primaryId===5);assert.equal(file.rows.filter(r=>r.baseProse).length,30);assert.equal(Object.keys(file.monthSlots).length,72);
});

test('whole-trigram branch matching distinguishes full and half hits, without inventing a percentage',()=>{
 const full=assessVoid('乾',{ganzhi:'甲子',strength:'休',partialPolicy:'qualitative-reduction'});
 assert.equal(full.hitKind,'full');assert.deepEqual(full.matchedBranches,['戌','亥']);assert.equal(full.state,'dormant');
 const half=assessVoid('艮',{ganzhi:'甲寅',strength:'休',partialPolicy:'qualitative-reduction'});
 assert.equal(half.hitKind,'partial');assert.deepEqual(half.matchedBranches,['丑']);assert.equal(half.state,'partial_reduced');assert.equal(half.numericMultiplier,null);
 const single=assessVoid('坎',{ganzhi:'甲寅',strength:'旺',partialPolicy:'qualitative-reduction'});
 assert.equal(single.hitKind,'full');assert.equal(single.state,'strong_exempt');
 assert.equal(assessVoid('离',{ganzhi:'甲子',partialPolicy:'qualitative-reduction'}).hit,false);
});
