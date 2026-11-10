import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {loadLibrary,getCivilDay,formatCivilDay,findCivilDayMatches,buildFullChartRelations} from '../src/index.js';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8'),lib=await loadLibrary();
test('two-year cache matches all 731 independently audited civil dates, including leap day',async()=>{
 const raw=await read('data/day-calendar.json'),cache=JSON.parse(raw),proof=JSON.parse(await read('sources/audit/day-calendar-verification-20261110.json'));
 assert.equal(cache.rows.length,731);assert.equal(proof.rowsChecked,731);assert.equal(proof.mismatches,0);
 assert.equal(createHash('sha256').update(raw).digest('hex'),proof.cacheSha256);
 for(const row of cache.rows)assert.deepEqual(getCivilDay(row.date),row);
 assert.ok(cache.rows.some(r=>r.date==='2028-02-29'));assert.equal(cache.rows.at(-1).date,'2028-11-09');
 assert.deepEqual(getCivilDay('2000-01-07'),{date:'2000-01-07',dayGanzhi:'甲子',dayBranch:'子'});
});
test('civil date API needs year/month/day but no location or clock time, and rejects invented dates',()=>{
 assert.equal(formatCivilDay('2026-11-14'),'2026年11月14日（壬辰日）');
 for(const x of ['14','2026-11-14T00:00:00Z','2026-02-30','2027-02-29'])assert.throws(()=>getCivilDay(x));
 const rows=findCivilDayMatches({startDate:'2026-11-11',endDate:'2026-11-22',branches:['申','酉']});
 assert.deepEqual(rows.map(r=>r.date),['2026-11-18','2026-11-19']);assert.ok(rows.every(r=>r.selectedAsEventDate===false));
 assert.throws(()=>findCivilDayMatches({startDate:'2026-11-22',endDate:'2026-11-11',branches:['申']}));
});
test('all 384 charts expose six positions and 15 comparisons while retaining one original body',()=>{
 for(let id=1;id<=64;id++)for(let line=1;line<=6;line++){
  const r=lib.createReading({primaryId:id,movingLine:line,calendar:{season:'winter'},voidContext:{ganzhi:'戊子'}}),f=buildFullChartRelations(r);
  assert.equal(f.visiblePositions,6);assert.equal(f.rootBodyCount,1);assert.equal(f.nodes.length,6);assert.equal(f.pairs.length,15);assert.equal(f.numericEnergyScore,null);
  const root=f.nodes.find(n=>n.role==='body'),copy=f.nodes.find(n=>n.role==='body_inherited');
  assert.equal(copy.entityId,root.entityId);assert.equal(copy.trigram,root.trigram);assert.strictEqual(copy.void,root.void);
 }
});
test('well chart includes weak empty fire restraining controlling metal and water supporting wood, without invented net strength',()=>{
 const r=lib.createReading({primaryId:48,movingLine:5,domainId:'domain-10',calendar:{season:'winter'},voidContext:{ganzhi:'戊子'}}),f=buildFullChartRelations(r);
 const roles=Object.fromEntries(f.nodes.map(n=>[n.role,n]));
 assert.equal(roles.use_mutual.trigram,'离');assert.equal(roles.use_mutual.void.state,'dormant');assert.equal(roles.use_mutual.strength.state,'weak');
 assert.ok(f.chains.some(c=>c.kind==='restrain-controller'&&c.nodes.join(',')===[roles.use_mutual.id,roles.body_mutual.id,roles.body.id].join(',')));
 assert.ok(f.chains.some(c=>c.kind==='generation-path'&&c.nodes.join(',')===[roles.body_mutual.id,roles.use.id,roles.body.id].join(',')));
});
test('changed body cannot quietly turn a true-void original body into another, revived self',()=>{
 const r=lib.createReading({primaryId:1,movingLine:5,calendar:{season:'summer'},voidContext:{ganzhi:'甲子',roleEvidence:{body:{severelyWeak:true,dayMonthAttacked:true}}}}),f=buildFullChartRelations(r);
 assert.equal(f.nodes.find(n=>n.role==='body').void.state,'true_void');assert.equal(f.nodes.find(n=>n.role==='body_inherited').void.state,'true_void');
});
