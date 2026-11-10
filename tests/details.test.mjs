import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {loadLibrary,createDetailsRepository} from '../src/index.js';
const library=await loadLibrary(),repo=createDetailsRepository({library});
const read=async p=>JSON.parse(await readFile(new URL('../'+p,import.meta.url),'utf8'));
test('all 64 details and 384 line identities, polarities, and changes join the canonical catalog',async()=>{
  for(let i=1;i<=64;i++){
    const h=await repo.getHexagram(i);assert.equal(h.id,i);assert.equal(h.lines.length,6);
    for(let p=1;p<=6;p++){
      const l=await repo.getLine(i,p),base=library.getLineReading(i,p);
      assert.equal(l.id,base.id);assert.equal(l.text,base.text);assert.equal(l.vernacular,base.vernacular);
      assert.equal(l.changedHexagram.id,library.getChangedHexagram(i,p).id);
      assert.equal(l.structure.correctPosition,h.bitsBottomUp[p-1]===(p%2));
      assert.equal(l.structure.central,p===2||p===5);assert.equal(l.hexagramId,i);
      assert.ok(!('groups' in h));assert.ok(!('sourceText' in l));
    }
  }
});
test('every cast keeps its original primary moving line when three-stage details load',async()=>{
  for(let i=1;i<=64;i++)for(let p=1;p<=6;p++){
    const r=library.createReading({primaryId:i,movingLine:p}),d=await repo.getReadingDetails(r);
    assert.equal(d.primary.id,i);assert.equal(d.mutual.id,r.stages.mutual.id);assert.equal(d.changed.id,r.stages.changed.id);
    assert.equal(d.selectedMovingLine.id,library.getLineReading(i,p).id);
  }
});
test('misplaced Tongren/Dayou/Guimei paragraphs cannot be read as the current line',async()=>{
  for(const [i,bad] of [[14,'同人卦'],[15,'大有卦']])for(let p=1;p<=6;p++){
    const r=await repo.getReferenceCommentary(i,{position:p});assert.ok(!JSON.stringify(r.groups).includes(bad));
    assert.ok((await repo.getLine(i,p)).editorialNotes.length);
  }
  const feng=await repo.getLine(55,1);assert.equal(feng.changedHexagram.id,62);assert.ok(feng.text.includes('遇其配主'));
  const f=JSON.stringify((await repo.getReferenceCommentary(55,{position:1})).groups);assert.ok(!f.includes('归妹以娣'));
  const dui=JSON.stringify((await repo.getReferenceCommentary(58,{position:4})).groups);assert.ok(!dui.includes('九五爻动'));assert.ok(dui.includes('第60卦'));
});
test('reference commentary is explicitly separate and author attribution is never marked verified',async()=>{
  const h=await repo.getHexagram(1);assert.equal(h.grade.rawGrade,'上上卦');
  const commentary=await repo.getReferenceCommentary(1);assert.ok(commentary.trustScope.startsWith('source-commentary-only'));
  assert.ok(commentary.groups.every(g=>g.key==='intro'));
  assert.equal((await repo.getHexagram(44)).grade.rawGrade,'中卦');
});
test('lazy loader coalesces concurrent file requests and retries failures',async()=>{
  let n=0;const r=createDetailsRepository({library,readJSON:async p=>{n++;return read(p);}});
  await Promise.all([r.getLine(55,1),r.getLine(55,2),r.getHexagram(55)]);assert.equal(n,1);
  let attempt=0;const flaky=createDetailsRepository({library,readJSON:async p=>{if(++attempt===1)throw new Error('offline');return read(p);}});
  await assert.rejects(flaky.getHexagram(55),/offline/);assert.equal((await flaky.getHexagram(55)).id,55);assert.equal(attempt,2);
});
test('bad identities, stale content and tampered reading stages fail before rendering',async()=>{
  await assert.rejects(repo.getLine(1,0));await assert.rejects(repo.getLine(1,7));await assert.rejects(repo.getHexagram(65));
  const stale=createDetailsRepository({library,readJSON:async p=>({...await read(p),contentVersion:'old'})});await assert.rejects(stale.getHexagram(1),/version mismatch/);
  const r=structuredClone(library.createReading({primaryId:49,movingLine:1}));r.stages.changed.id=1;await assert.rejects(repo.getReadingDetails(r),/stage IDs/);
});
