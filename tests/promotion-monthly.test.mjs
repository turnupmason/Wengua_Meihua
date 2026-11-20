import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {context,item,readingFor,renderHex,loadHex} from '../scripts/review/monthly-lib.mjs';
import {promotionArticleIssues} from '../scripts/review/check-monthly.mjs';

const ctx=await context(),promotion=item('promotion-pay');
const baseline=JSON.parse(await readFile(new URL('../sources/editorial/promotion-pay/hex-001.json',import.meta.url),'utf8'));
const original=baseline.find(row=>row[0]===3&&row[1]==='autumn-metal');
const payExplanation='随岗薪资宜以正式薪酬文件所列项目和生效日期为准，逐项确认基本工资与其他待遇，具体幅度不能从此卦推出。';
const article={movingLine:3,monthBranch:'申',outcome:'favourable',title:'能任其责，再看薪酬安排',
 short:'这次能升，宜依照正式任用和薪酬文件核对各项安排。',paragraphs:['本次能升，乾九三宜在承担职责时保持勤勉与警惕。'],
 judgment:'沿用考试定稿的共有体用规则，结合晋升专条，定为能升。',timing:'此盘暂无有据的日级窗口。',payExplanation,
 payCorrection:{old:original[11],new:payExplanation,reason:'原稿对薪档起算作了无据承诺，改为核对正式薪酬条件。',
  impact:{outcomeChanged:false,timingSignatureChanged:false}}};
const reading=readingFor(ctx,promotion,1,article);
const checks=a=>promotionArticleIssues(a,original,reading).map(issue=>issue.check);

test('promotion salary corrections bind the exact baseline text and keep outcome and timing unchanged',()=>{
 assert.deepEqual(checks(article),[]);
 for(const mutation of [
  {payExplanation:''},
  {payCorrection:undefined},
  {payCorrection:{...article.payCorrection,old:'另一个版本的薪资原文'}},
  {payCorrection:{...article.payCorrection,new:'不是当前显示的薪资说明'}},
  {payCorrection:{...article.payCorrection,impact:{outcomeChanged:true,timingSignatureChanged:false}}},
  {payCorrection:{...article.payCorrection,impact:{outcomeChanged:false,timingSignatureChanged:true}}},
 ])assert.notDeepEqual(checks({...article,...mutation}),[],JSON.stringify(mutation));
});

test('promotion control rule still blocks success when the controlling trigram is seasonally weak',()=>{
 const blocked={...article,movingLine:2};
 const r=readingFor(ctx,promotion,1,blocked);
 assert.equal(r.nodes.find(node=>node.role==='changed_use').strength.state,'囚');
 assert.equal(r.edges.find(edge=>edge.targetRole==='changed_use').type,'use_controls_body');
 assert.ok(promotionArticleIssues(blocked,original,r).some(issue=>issue.check==='promotion-incumbent-rule'));
 assert.ok(!promotionArticleIssues({...blocked,outcome:'difficult'},original,r).some(issue=>issue.check==='promotion-incumbent-rule'));
});

test('promotion scope check permits inherited-rule audit notes and rejects another question in public copy',()=>{
 assert.deepEqual(checks(article),[],'judgment may name the inherited exam rule');
 for(const mutation of [
  {title:'面试能通过'},
  {short:'这次能升，但先看考试结果。'},
  {paragraphs:['本次能升，面试时宜说明职责。']},
  {timing:[['equal','use','面试开始','按既定事项准备','这里是取期依据']]},
 ])assert.ok(checks({...article,...mutation}).includes('promotion-public-scope'));
});

test('negative promotion verdicts are not recognized as affirmative verdicts',()=>{
 for(const text of ['本次不能晋升','这次不能升职','这次升不了','这次无法晋升']) {
  assert.ok(promotion.verdict.difficult.test(text),text);
  assert.ok(!promotion.verdict.favourable.test(text),text);
 }
 for(const text of ['本次能升','这次能晋升','这次能够升职','这次可以晋升'])
  assert.ok(promotion.verdict.favourable.test(text),text);
});

test('promotion render separates salary from narrative and places it before timing',()=>{
 const bundle={source:{primaryId:1,articles:[article]},base:[original],data:null};
 const out=renderHex(ctx,promotion,bundle);
 assert.equal(out.split('### 随岗薪资').length-1,1);
 assert.ok(out.includes('### 随岗薪资\n\n'+payExplanation+'\n\n### 应期参考'));
 assert.ok(out.includes('薪资说明订正：'+article.payCorrection.reason));
 assert.ok(out.includes('career.promotion-pay.promotion/1/3/申/favourable'));
 assert.equal(article.paragraphs.length,1,'rendering never appends pay into author paragraphs');
});

test('promotion-only salary fields do not affect another question reading document',async()=>{
 for(const name of ['exam','relationship-establishment']) {
  const c=item(name),bundle=await loadHex(c,1);
  const before=renderHex(ctx,c,bundle),withPay=structuredClone(bundle);
  for(const a of withPay.source.articles){a.payExplanation=payExplanation;a.payCorrection=article.payCorrection;}
  assert.equal(renderHex(ctx,c,withPay),before,name);
  assert.ok(!before.includes('### 随岗薪资'));
 }
});
