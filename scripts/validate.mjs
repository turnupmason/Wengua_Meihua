import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url),read=p=>readFile(new URL(p,root)),json=async p=>JSON.parse(await read(p));
const [catalog,sections,manifest,domains,patches]=await Promise.all(['data/catalog.json','data/meihua-sections.json','data/source-manifest.json','data/domains.json','data/editorial-patches.json'].map(json));
for(const s of manifest.sources){const b=await read(s.path);assert.equal(createHash('sha256').update(b).digest('hex'),s.sha256,s.path);assert.equal(b.length,s.bytes);}
for(const r of manifest.references){const x=await json(r.path);assert.equal(x.revisionId,r.revisionId);assert.equal(x.url,r.url);}
assert.equal(catalog.hexagrams.length,64);assert.equal(domains.length,18);assert.equal(catalog.lineOrder,'bottom-up');
assert.equal(new Set(catalog.hexagrams.map(h=>h.bitsBottomUp.join(''))).size,64);
let white=0,ordinary=0,special=0;
const sources=new Map(await Promise.all(manifest.sources.map(async s=>[s.id,[...(await read(s.path)).toString('utf8')]])));
function checkRef(ref){assert.ok(sources.has(ref.sourceId));assert.ok(ref.startChar>=0&&ref.endChar<=sources.get(ref.sourceId).length&&ref.startChar<ref.endChar);}
const ids=new Set(patches.map(p=>p.id));
for(const h of catalog.hexagrams){assert.equal(h.lines.length,6);ordinary+=h.lines.length;special+=h.specialLines.length;checkRef(h.sourceRef);checkRef(h.grade.sourceRef);assert.ok(['上上卦','中上卦','中中卦','中下卦','下下卦'].includes(h.grade.canonicalGrade));assert.equal(h.grade.rawGrade,h.id===44?'中卦':h.grade.canonicalGrade);for(const id of h.patchIds)assert.ok(ids.has(id));
  for(const p of [h.reading,...h.lines,...h.specialLines]){for(const k of ['text','image','vernacular','imageVernacular'])assert.ok(p[k]?.trim(),`${h.id}:${k}`);white+=2;}
  for(let i=0;i<6;i++){assert.equal(h.lines[i].position,i+1);assert.equal(h.bitsBottomUp[i],h.lines[i].label.includes('九')?1:0);checkRef(h.lines[i].sourceRef);}
}
assert.equal(ordinary,384);assert.equal(special,2);assert.equal(white,900);
const raw=sources.get('user-meihua');let next=0;
for(const s of sections.sections){checkRef(s.sourceRef);assert.equal(s.sourceRef.startChar,next);next=s.sourceRef.endChar;}
assert.equal(next,raw.length);assert.equal(sections.sections.filter(s=>s.kind==='section').length,132);
for(const d of domains)assert.ok(sections.sections.some(s=>s.id===d.sectionId&&s.text===d.text));
const report=await json('data/import-report.json');assert.equal(report.vernacularBlocks,white);assert.equal(report.editorialPatches,patches.length);
const profile=await json('data/rule-profile.json');assert.equal(profile.grades.latestOverrides['44'].display,'中卦');assert.equal(profile.void.combine.defaultEnabled,false);assert.equal(profile.void.futureNodeRevivesTrueVoid,false);
console.log(`Validated: 64 hexagrams, ${ordinary} lines, ${special} special texts, ${white} vernacular blocks, 132 sections, 18 domains, ${manifest.sources.length} source hashes, ${manifest.references.length} pinned references. Root: ${fileURLToPath(root)}`);
