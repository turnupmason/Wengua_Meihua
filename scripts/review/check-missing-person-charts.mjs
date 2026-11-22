import {writeFile} from 'node:fs/promises';
import {MONTHS,independentFacts,context,readingFor,SCOPE} from './missing-person-monthly-lib.mjs';
const ctx=await context(),report={schemaVersion:'1.0.0',scopeVersion:SCOPE,theoreticalInputs:0,comparisons:0,mismatches:[],authoringProgressCredit:0,scope:'chart-facts-only-not-prose-or-interpretation',realWorldPredictionAccuracy:'not-validated'};
const compare=(key,field,a,b)=>{report.comparisons++;if(JSON.stringify(a)!==JSON.stringify(b))report.mismatches.push({key,field,independent:a,engine:b});};
for(let id=1;id<=64;id++)for(let movingLine=1;movingLine<=6;movingLine++)for(const monthBranch of MONTHS){
 const key=`${id}/${movingLine}/${monthBranch}`,facts=independentFacts(id,movingLine,monthBranch),r=readingFor(ctx,id,{movingLine,monthBranch});report.theoreticalInputs++;
 compare(key,'bits',facts.bits,r.stages.primary.bitsBottomUp);compare(key,'stages',facts.stageIds,Object.values(r.stages).map(x=>x.id));compare(key,'line',facts.lineLabel,r.selectedMovingLine.label);
 for(const n of facts.nodes){const actual=r.nodes.find(x=>x.role===n.role);for(const f of ['trigram','element','qi'])compare(key,`${n.role}.${f}`,n[f],f==='qi'?actual.strength.state:actual[f]);}
 for(const edge of facts.relations)compare(key,`${edge.role}.relation`,edge.type,r.edges.find(x=>x.targetRole===edge.role)?.type);
}
report.status=report.mismatches.length?'failed':'passed';
await writeFile('docs/missing-contact/monthly-preview/CHART_COVERAGE.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));process.exitCode=report.mismatches.length?1:0;
