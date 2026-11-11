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
// 用 → 互 → 变 synthesis (user rule 2026-11-11 + 《体用互变之诀》).
const GEN={木:'火',火:'土',土:'金',金:'水',水:'木'},CTL={木:'土',土:'水',水:'火',火:'金',金:'木'};
const relOf=(b,u)=>b===u?'equal':CTL[b]===u?'body_controls_use':CTL[u]===b?'use_controls_body':GEN[b]===u?'body_generates_use':'use_generates_body';
const toneOf=t=>({use_generates_body:'favorable',equal:'favorable',body_controls_use:'favorable',body_generates_use:'draining',use_controls_body:'adverse'})[t];
test('all 384 casts: 体用, 体互/用互, 变用 and the 用→互→变 synthesis are derived independently and agree',()=>{
  // Independent trigram table (bottom-up bits), not taken from the catalog.
  const tri=new Map(Object.entries({'111':['乾','金'],'110':['兑','金'],'101':['离','火'],'100':['震','木'],'011':['巽','木'],'010':['坎','水'],'001':['艮','土'],'000':['坤','土']}).map(([k,[id,element]])=>[k,{id,element}]));
  const HEAD={favorable:{favorable:'始终顺遂',draining:'先顺后耗',adverse:'先易后难'},draining:{favorable:'先耗后得',draining:'多有耗费',adverse:'先耗后难'},adverse:{favorable:'先难后易',draining:'先难后耗',adverse:'始终受制'}};
  const LEAD={favorable:'以顺为主',draining:'以耗费为主',adverse:'以不顺为主'};
  let n=0;
  for(const h of lib.listHexagrams())for(let p=1;p<=6;p++){
    const r=lib.createReading({primaryId:h.id,movingLine:p});
    const b=h.bitsBottomUp,lower=tri.get(b.slice(0,3).join('')),upper=tri.get(b.slice(3).join(''));
    // 动者为用: the trigram holding the moving line is 用, the other is 体.
    const [body,use]=p<=3?[upper,lower]:[lower,upper];
    assert.equal(r.body.trigram,body.id);assert.equal(r.use.trigram,use.id);
    // 互卦: lower 二三四, upper 三四五; 体互 is on the 体 side.
    const mLower=tri.get([b[1],b[2],b[3]].join('')),mUpper=tri.get([b[2],b[3],b[4]].join(''));
    const [bodyMutual,useMutual]=p<=3?[mUpper,mLower]:[mLower,mUpper];
    // 变卦: only the moving line flips, so only the 用 side changes.
    const cb=[...b];cb[p-1]=1-cb[p-1];
    const changedUse=tri.get((p<=3?cb.slice(0,3):cb.slice(3)).join(''));
    assert.equal(tri.get((p<=3?cb.slice(3):cb.slice(0,3)).join('')).id,body.id);
    const y=r.synthesis;
    assert.equal(y.applicable,true);
    assert.deepEqual(y.stages.map(s=>s.stage),['use','mutual','changed']);
    const [su,sm,sc]=y.stages;
    assert.equal(su.main.trigram,use.id);assert.equal(su.main.type,relOf(body.element,use.element));
    assert.equal(sm.main.trigram,bodyMutual.id);assert.equal(sm.main.role,'body_mutual');assert.equal(sm.main.type,relOf(body.element,bodyMutual.element));
    assert.equal(sm.secondary.trigram,useMutual.id);assert.equal(sm.secondary.type,relOf(body.element,useMutual.element));
    assert.equal(sc.main.trigram,changedUse.id);assert.equal(sc.main.type,relOf(body.element,changedUse.element));
    for(const s of y.stages)assert.equal(s.tone,toneOf(s.main.type));
    // 用 leads; the headline pairs the start with the end.
    assert.equal(y.lead,su.tone);assert.equal(y.leadText,LEAD[su.tone]);assert.equal(y.headline,HEAD[su.tone][sc.tone]);
    if(su.tone==='adverse')assert.equal(y.leadText,'以不顺为主');
    assert.ok(y.summary.startsWith('开局')&&y.summary.includes('过程')&&y.summary.includes('结局'));
    assert.ok(!/\d/.test(y.headline+y.summary+y.notes.map(x=>x.text).join('')),'no invented numbers');
    n++;
  }
  assert.equal(n,384);
});
test('雷天大壮 初爻动: 用克体, 互克体, 变比和 → 先难后易, mainly 不顺',()=>{
  const r=lib.createReading({primaryId:34,movingLine:1});
  assert.equal(r.stages.mutual.name.includes('夬'),true);assert.equal(r.stages.changed.name.includes('恒'),true);
  const y=r.synthesis;
  assert.equal(y.stoneLine,'用克体 · 互克体 · 变比和');
  assert.equal(y.headline,'先难后易');assert.equal(y.leadText,'以不顺为主');assert.equal(y.classical,'用凶变吉者，先凶后吉');
  assert.equal(y.summary,'开局受制，过程受阻；结局顺和。');
  assert.ok(y.notes.some(x=>x.kind==='use-leads'));assert.ok(y.notes.some(x=>x.kind==='harm-many'));
  // Evidence by scope, and a conflict-aware verdict that does not let the end override the start.
  assert.deepEqual(y.stages.map(s=>s.scope),['当前','过程','后势']);
  assert.equal(y.stages[0].evidence,'当前不利，存在明显阻碍');assert.equal(y.stages[2].evidence,'后续存在改善条件');
  assert.equal(y.verdict.code,'bad-start-better-end');assert.equal(y.verdict.conflict,true);
  assert.equal(y.verdict.template.replace('{outcome}','拿到这份工作'),'前期阻力较大，后续有缓和机会，但目前不足以断定一定能拿到这份工作。');
  assert.ok(y.verdict.caveat.includes('不能单凭此断定事成'));assert.equal(y.verdict.conditions.length,3);
  assert.equal(y.evidenceSummary,'前期受制，中间多有牵制，末后出现比和之象。');
  assert.deepEqual(y.compact,['用克体','互克体','变比和']);
  // 雷火丰 九三: 体生用；体互兑金克体、用互巽木比和；变震比和.
  const f=lib.createReading({primaryId:55,movingLine:3}).synthesis;
  assert.deepEqual(f.compact,['体生用','互克兼比','变比和']);
  assert.equal(f.evidenceSummary,'前期耗费，中间有牵制也有配合，末后出现比和之象。');
});
test('the same 体用 evidence gives the same verdict in every category (only the wording of the matter changes)',()=>{
  const codes=new Set();
  for(const d of ['domain-02','domain-05','domain-08','domain-09','domain-10','domain-15','domain-16'])codes.add(lib.createReading({primaryId:34,movingLine:1,domainId:d}).synthesis.verdict.code);
  assert.equal(codes.size,1);
  for(const h of lib.listHexagrams())for(let p=1;p<=6;p++){
    const y=lib.createReading({primaryId:h.id,movingLine:p}).synthesis;
    assert.ok(y.verdict.template.includes('{outcome}'));
    assert.equal(y.verdict.conflict,(y.lead==='adverse'&&y.stages[2].tone==='favorable')||(y.lead==='favorable'&&y.stages[2].tone==='adverse'));
    if(y.verdict.conflict)assert.ok(y.verdict.caveat);
  }
});
test('天时 does not divide 体用; the synthesis says so instead of judging',()=>{
  const y=lib.createReading({primaryId:34,movingLine:1,domainId:'domain-01'}).synthesis;
  assert.equal(y.applicable,false);assert.ok(y.reason.includes('不分体用'));
  // 全观诸卦: 归妹 九二 → 互 既济 → 变 震: 震三、兑一、离一、坎一 → 震多.
  const w=lib.createReading({primaryId:54,movingLine:2,domainId:'domain-01'}).synthesis.weather;
  assert.deepEqual(w.counts,{震:3,兑:1,坎:1,离:1});assert.deepEqual(w.top,['震']);
  assert.equal(w.headline,'雷动');assert.equal(w.stoneLine,'天时 · 震多 · 雷动');
  assert.deepEqual(w.stages.map(s=>s.trigrams.join('')),['震兑','坎离','震震']);
  // 坎离同见且同多 → 时晴时雨.
  for(const h of lib.listHexagrams())for(let p=1;p<=6;p++){
    const ww=lib.createReading({primaryId:h.id,movingLine:p,domainId:'domain-01'}).synthesis.weather;
    assert.equal(Object.values(ww.counts).reduce((a,b)=>a+b,0),6);
    if(ww.counts.坎&&ww.counts.坎===ww.counts.离&&ww.top.includes('坎'))assert.equal(ww.headline,'时晴时雨');
    assert.ok(ww.headline.length>0&&!/\d/.test(ww.headline+ww.summary));
  }
});
test('body strength from the month softens or sharpens 克体 only when supplied',()=>{
  const spring=lib.createReading({primaryId:34,movingLine:1,calendar:{monthBranch:'卯'}}).synthesis;
  assert.ok(spring.notes.some(x=>x.kind==='body-strong'));
  const autumn=lib.createReading({primaryId:34,movingLine:1,calendar:{monthBranch:'酉'}}).synthesis;
  assert.ok(autumn.notes.some(x=>x.kind==='body-weak'));
  const none=lib.createReading({primaryId:34,movingLine:1}).synthesis;
  assert.ok(!none.notes.some(x=>x.kind.startsWith('body-s')||x.kind==='body-weak'));
});
