import test from 'node:test';
import assert from 'node:assert/strict';
import {loadLibrary,relation,getXunVoid,getVoidReleaseTargets,assessVoid,seasonalStrength} from '../src/index.js';
const lib=await loadLibrary();
const triples=[['甲子','戌亥','辰巳','卯寅'],['甲戌','申酉','寅卯','巳辰'],['甲申','午未','子丑','未午'],['甲午','辰巳','戌亥','酉申'],['甲辰','寅卯','申酉','亥戌'],['甲寅','子丑','午未','丑子']];
test('six xun tables and all sixty stem/branch pairs',()=>{
  const stems=[...'甲乙丙丁戊己庚辛壬癸'],branches=[...'子丑寅卯辰巳午未申酉戌亥'];
  for(let n=0;n<60;n++){
    const g=stems[n%10]+branches[n%12],r=getXunVoid(g),t=triples[Math.floor(n/10)];
    assert.equal(r.xunHead,t[0]);assert.equal(r.branches.join(''),t[1]);
  }
  for(const [g,v,c,h] of triples){const r=getVoidReleaseTargets(g);assert.equal(r.targets.map(x=>x.fill).join(''),v);assert.equal(r.targets.map(x=>x.clash).join(''),c);assert.equal(r.targets.map(x=>x.combine).join(''),h);}
  assert.throws(()=>getXunVoid('甲丑'));assert.throws(()=>getXunVoid('hello'));
});
test('all 384 casts flip one correct bit; primary moving line maps to exact original text',()=>{
  assert.equal(new Set(lib.listHexagrams().map(h=>h.bitsBottomUp.join(''))).size,64);
  for(const h of lib.listHexagrams())for(let p=1;p<=6;p++){
    const r=lib.createReading({primaryId:h.id,movingLine:p});
    const changed=r.stages.changed.detail;
    assert.equal(changed.bitsBottomUp.filter((b,i)=>b!==h.bitsBottomUp[i]).length,1);
    assert.notEqual(h.bitsBottomUp[p-1],changed.bitsBottomUp[p-1]);
    assert.equal(lib.getChangedHexagram(changed.id,p).id,h.id);
    assert.equal(r.selectedMovingLine.text,h.lines[p-1].text);
    assert.equal(r.selectedMovingLine.label,h.lines[p-1].label);
    assert.equal(r.body.side,p<=3?'upper':'lower');assert.equal(r.use.side,p<=3?'lower':'upper');
    assert.equal(r.stages.mutual.glowLine,null);assert.equal(r.stages.changed.glowLine,null);
    assert.equal(r.stages.primary.baseGrade,h.grade.rawGrade);
    assert.equal(r.nodes.length,6);assert.equal(r.edges.length,4);
    const b=h.bitsBottomUp;assert.deepEqual(r.stages.mutual.bitsBottomUp,[b[1],b[2],b[3],b[2],b[3],b[4]]);
    assert.equal(r.nodes.find(n=>n.role==='body_inherited').trigram,r.body.trigram);
    const svg=lib.renderHexagramSVG(h.id,{movingLine:p});assert.equal((svg.match(/class="yao moving"/g)||[]).length,1);
    assert.ok(svg.includes(`data-line-position="${p}" data-y="${22+(6-p)*28}"`));
  }
});
test('classical plum and peony cases are reproducible',()=>{
  const plum=lib.castByTimeParts({yearBranchNumber:5,lunarMonth:12,lunarDay:17,hourBranchNumber:9});
  assert.equal(plum.primaryId,49);assert.equal(plum.movingLine,1);
  assert.equal(lib.getChangedHexagram(49,1).id,31);assert.equal(lib.getMutualHexagram(49).id,44);
  const peony=lib.castByTimeParts({yearBranchNumber:6,lunarMonth:3,lunarDay:16,hourBranchNumber:4});
  assert.equal(peony.primaryId,44);assert.equal(peony.movingLine,5);assert.equal(lib.getChangedHexagram(44,5).id,50);
  assert.equal(lib.castByTrigramNumbers({upperNumber:8,lowerNumber:8,movingTotal:6}).movingLine,6);
  assert.equal(lib.castByTrigramNumbers({upperNumber:8,lowerNumber:8,movingTotal:6}).primaryId,2);
});
test('mutual pure-hexagram alternative is explicit and deterministic',()=>{
  assert.equal(lib.getMutualHexagram(1).id,1);
  assert.equal(lib.getMutualHexagram(1,2,'pure-use-changed').id,lib.getMutualHexagram(lib.getChangedHexagram(1,2).id).id);
  assert.throws(()=>lib.getMutualHexagram(1,undefined,'pure-use-changed'));
});
test('all twenty-five element relations have the correct orientation',()=>{
  const gen={木:'火',火:'土',土:'金',金:'水',水:'木'},ctl={木:'土',土:'水',水:'火',火:'金',金:'木'};
  for(const a of Object.keys(gen))for(const b of Object.keys(gen)){
    const expected=a===b?'equal':ctl[a]===b?'body_controls_use':ctl[b]===a?'use_controls_body':gen[a]===b?'body_generates_use':'use_generates_body';assert.equal(relation(a,b).type,expected);
  }
  assert.throws(()=>relation('风','水'));
});
test('season evidence follows explicit source and does not invent other strengths',()=>{
  assert.equal(seasonalStrength('木',{season:'spring'}).state,'strong');
  assert.equal(seasonalStrength('土',{season:'spring'}).state,'weak');
  assert.equal(seasonalStrength('水',{monthBranch:'辰'}).state,'weak');
  assert.equal(seasonalStrength('水',{season:'spring'}).state,'not_explicit');
  assert.equal(seasonalStrength('水').state,'unresolved');
  assert.throws(()=>seasonalStrength('火',{monthBranch:'子',season:'summer'}));
});
test('true void is assessed at casting; future fills and clashes do not resurrect it',()=>{
  const x={ganzhi:'甲子',severelyWeak:true,dayMonthAttacked:true};
  assert.equal(assessVoid('乾',x).state,'true_void');
  assert.equal(assessVoid('乾',{...x,filledBranches:['戌','亥']}).state,'true_void');
  assert.equal(assessVoid('乾',{...x,releaseClashBranches:['辰','巳']}).effective,'suppressed');
  assert.throws(()=>assessVoid('乾',{...x,strength:'strong'}));
  assert.equal(assessVoid('乾',{ganzhi:'甲子',moving:true}).state,'moving_exempt');
  assert.equal(assessVoid('乾',{ganzhi:'甲子',strength:'strong'}).state,'strong_exempt');
});
test('fill first, clash second; default no combine; static combine cannot release void',()=>{
  assert.equal(assessVoid('乾',{ganzhi:'甲子',filledBranches:['戌','亥']}).state,'released');
  assert.equal(assessVoid('乾',{ganzhi:'甲子',releaseClashBranches:['辰','巳']}).state,'released');
  const x={ganzhi:'甲子',combineBranches:['卯','寅']};
  assert.equal(assessVoid('乾',x).state,'dormant');
  assert.equal(assessVoid('乾',{...x,allowCombine:true,eventType:'cooperation'}).state,'dormant');
  assert.equal(assessVoid('乾',{...x,allowCombine:true,eventType:'cooperation',supported:true}).state,'released');
  assert.equal(assessVoid('乾',{...x,allowCombine:true,eventType:'general',moving:true}).state,'moving_exempt');
});
test('partial branch hits are explicit, never silently nullify the entire trigram',()=>{
  assert.equal(assessVoid('艮',{ganzhi:'甲寅'}).state,'partial_pending');
  assert.equal(assessVoid('艮',{ganzhi:'甲寅',partialPolicy:'any-hit'}).state,'dormant');
  assert.equal(assessVoid('艮',{ganzhi:'甲寅',partialPolicy:'all-hit'}).state,'partial_not_applied');
  assert.equal(assessVoid('坎',{ganzhi:'甲寅'}).state,'dormant');
  assert.equal(assessVoid('离',{ganzhi:'甲寅'}).state,'not_void');
});
test('ordinary lines, special records, safety of UI IDs and input validation',()=>{
  assert.equal(lib.getHexagram(1).specialLines[0].label,'用九');
  assert.equal(lib.getHexagram(2).specialLines[0].label,'用六');
  assert.equal(lib.getHexagram(44).grade.rawGrade,'中卦');
  assert.equal(lib.getHexagram(44).grade.canonicalGrade,'中中卦');
  assert.ok(lib.listDomains().find(d=>d.id==='domain-07').relationPassages.body_controls_use.quote.includes('饮食有阻'));
  assert.throws(()=>lib.getLineReading(1,7));assert.throws(()=>lib.createReading({primaryId:0,movingLine:2}));
  assert.throws(()=>lib.createReading({primaryId:1,movingLine:0}));assert.throws(()=>lib.createReading({primaryId:1,movingLine:1,domainId:'oops'}));
  assert.throws(()=>lib.renderHexagramSVG(1,{svgId:'"><script>'}));
  assert.ok(!lib.renderHexagramSVG(1,{movingLine:1,stage:'mutual'}).includes('yao moving'));
  assert.throws(()=>{lib.getHexagram(1).name='oops';});
});
