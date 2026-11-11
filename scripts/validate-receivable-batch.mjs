import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {loadLibrary,MONTH_ORDERS,getVoidProfileKey,unpackManuscript} from '../src/index.js';
import {RECEIVABLE_NOTES} from '../sources/editorial/receivable-notes.mjs';
const lib=await loadLibrary(),read=async p=>JSON.parse(await readFile(new URL('../'+p,import.meta.url),'utf8'));
const manifest=await read('data/question-stories/domain-10-receivable/index.json');
assert.equal(Object.keys(RECEIVABLE_NOTES).length,64);assert.equal(Object.values(RECEIVABLE_NOTES).flatMap(x=>x[1]).length,384);
assert.equal(new Set(Object.values(RECEIVABLE_NOTES).flatMap(x=>x[1])).size,384);
const sourceIds=new Set(lib.listSections().map(s=>s.id));
const stems=[...'甲乙丙丁戊己庚辛壬癸'],branches=[...'子丑寅卯辰巳午未申酉戌亥'];
let bases=0,profiles=0,normalChecks=0;const texts=new Set();
const forbidden=/需要一起看|需要结合|可以观察|有某某方向|综合考量|百分之百|保证到账|必定到账|本月\d+号|下月\d+号/;
for(const entry of manifest.files){
 const raw=await readFile(new URL('../'+entry.path,import.meta.url),'utf8');
 assert.equal(createHash('sha256').update(raw).digest('hex'),entry.sha256);
 const f=JSON.parse(raw);assert.equal(f.rows.length,30);assert.equal(f.hexagramId,entry.hexagramId);
 for(const id of f.sourceIds)assert.ok(id.startsWith('user-')||sourceIds.has(id));
 for(const row of f.rows){
  const order=MONTH_ORDERS.find(o=>o.id===row.monthOrder),r=lib.createReading({primaryId:row.primaryId,movingLine:row.movingLine,domainId:'domain-10',calendar:{season:order.season}});
  assert.deepEqual(row.stageIds,Object.values(r.stages).map(s=>s.id));assert.deepEqual(row.baseGrades,Object.values(r.stages).map(s=>s.baseGrade));
  assert.equal(row.base.trace.lineText,r.selectedMovingLine.text);assert.equal(row.base.trace.lineNote,RECEIVABLE_NOTES[row.primaryId][1][row.movingLine-1]);
  assert.deepEqual(row.base.trace.relations,r.edges.map(e=>({role:e.targetRole,type:e.type})));
  const base=unpackManuscript(f,row.base);texts.add(base.paragraphs.join('\n'));bases++;
  const keys=new Set();
  for(const v of row.variants){
   assert.ok(!keys.has(v.profileKey));keys.add(v.profileKey);profiles++;
   const vr=lib.createReading({primaryId:row.primaryId,movingLine:row.movingLine,domainId:'domain-10',calendar:{season:order.season},voidContext:v.representativeContext});
   assert.equal(getVoidProfileKey(vr),v.profileKey);
   const material=unpackManuscript(f,v),story=material.paragraphs.join('\n');
   assert.ok(story.length>=240);assert.ok(!forbidden.test(story));
   assert.ok(story.includes(RECEIVABLE_NOTES[row.primaryId][1][row.movingLine-1]));
   for(const n of vr.nodes)assert.ok(story.includes(n.trigram+n.element));
   const slotIds=new Set(material.dateSlots.map(s=>s.token));
   for(const token of story.match(/\{\{date:[^}]+\}\}/g)||[])assert.ok(slotIds.has(token));
   for(const slot of material.dateSlots){assert.ok(story.includes(slot.token));assert.ok(slot.event&&slot.valence);}
   if(vr.nodes.find(n=>n.role==='body').void.state==='true_void'){
    assert.equal(material.verdict.code,'failure');assert.ok(!material.dateSlots.some(s=>['fill','receipt'].includes(s.id)));
   }
  }
  for(let i=0;i<60;i++){
   const vr=lib.createReading({primaryId:row.primaryId,movingLine:row.movingLine,domainId:'domain-10',calendar:{season:order.season},voidContext:{ganzhi:stems[i%10]+branches[i%12]}});
   assert.ok(keys.has(getVoidProfileKey(vr)));normalChecks++;
  }
 }
}
assert.equal(bases,1920);assert.equal(texts.size,1920);assert.equal(profiles,manifest.profileStoryCount);assert.equal(normalChecks,115200);
console.log({baseManuscripts:bases,uniqueBaseTexts:texts.size,prewrittenVoidProfiles:profiles,standardDayContextChecks:normalChecks,movingLineApplications:384,sourceAndTokenGate:'passed'});
