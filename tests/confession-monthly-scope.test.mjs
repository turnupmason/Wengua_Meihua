import test from 'node:test';
import assert from 'node:assert/strict';
import {confessionScopeIssues} from '../scripts/review/confession-scope.mjs';
import {item} from '../scripts/review/monthly-lib.mjs';
const article=(short,body=[])=>({title:'话题接得上，心意仍要听本人说',short,paragraphs:body,timing:'没有足够证据对应具体近期事件，不指定日期。'});
test('natural lead with all three questions needs no fixed verdict first',()=>{
 const a=article('先听他说完这件事。卦上见亲近苗头，谁会先联络仍未定，正式表白宜缓。',['彼此对话可承接，不由回复替他断定心意。']);
 assert.deepEqual(confessionScopeIssues(a),{errors:[],warnings:[]});
 assert.equal(item('confession-decision').questionId,'relationships.confession.decision');
});
test('missing outreach is flagged, while 先起联系 is recognized',()=>{
 const a=article('好感未明，眼下宜缓表白。',['仍须本人自由表达。']);
 assert.equal(confessionScopeIssues(a).errors[0].check,'confession-three-questions');
 assert.match(confessionScopeIssues(a).errors[0].detail,/outreach/);
 assert.deepEqual(confessionScopeIssues(article('心意未明，对方先起联系的依据偏弱，表白宜缓。')),{errors:[],warnings:[]});
});
test('negated claims and hypotheses are not asserted as facts',()=>{
 const a=article('心意未明，近期主动未定，表白宜缓。',['不能断定对方必定来信。若对方已经喜欢你，也要让其自由表达。','不把普通回应当作对方已经动心。不能认定对方肯定接受告白。']);
 assert.deepEqual(confessionScopeIssues(a),{errors:[],warnings:[]});
});
test('definite claims about initiative and consent flagged for independent reading',()=>{
 const a=article('心意虽未明，近期对方必定来信，表白宜缓。',['对方一定会接受告白。']);
 const checks=confessionScopeIssues(a).warnings.map(w=>w.check);
 assert.ok(checks.includes('confession-definite-outreach'));
 assert.ok(checks.includes('confession-definite-consent'));
});
