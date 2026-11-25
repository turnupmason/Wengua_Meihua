import test from 'node:test';
import assert from 'node:assert/strict';
import {workplaceScopeIssues} from '../scripts/review/workplace-scope.mjs';

const example='下季度西区展销会将由你临时代管';
const baseline=[1,'spring','watch',example,'','','','','','',[]];
const draft={title:'主管愿意让你知道多少',short:'现职有隐患。',paragraphs:['初六「濡其尾，吝」，要看上司肯不肯在决定前听你说。'],judgment:'本用克体。',timing:'此月不另外取日。'};
test('accepts observable support, communication and actual compensation',()=>{
 const text='关键项目或核心客户由谁负责，主管有没有给足权限？已经确定的评级和年终奖，是否认出了你的贡献？';
 assert.deepEqual(workplaceScopeIssues({...draft,paragraphs:[text]},baseline),[]);
});
test('checks industrial details even in conditional clauses and timing',()=>{
 for (const field of ['title','short','judgment','timing','paragraphs']) {
  const text='要是收尾时要清理积压的合同和库存，你处理得了。';
  assert.ok(workplaceScopeIssues({...draft,[field]:field==='paragraphs'?[text]:text},baseline).some(x=>x.check==='workplace-situation'));
 }
 assert.ok(workplaceScopeIssues({...draft,timing:[['control','use','若库存积压','留意权限。','取木日。']]},baseline).length);
});
test('detects carried-over narrative even without a known industry term',()=>{
 assert.ok(workplaceScopeIssues({...draft,short:'如果'+example+'，就看上司的态度。'},baseline).some(x=>x.check==='workplace-five-season-prose'));
 assert.deepEqual(workplaceScopeIssues(draft,[...baseline.slice(0,3),'初六「濡其尾，吝」',...baseline.slice(4)]),[]);
});
test('flags an assumed event and a truncated timing note',()=>{
 assert.ok(workplaceScopeIssues({...draft,timing:'本'},baseline).some(x=>x.check==='workplace-timing-fragment'));
 assert.ok(workplaceScopeIssues({...draft,short:'原来一处小问题已经处理好，工作仍有隐患。'},baseline).some(x=>x.check==='workplace-situation'));
});
