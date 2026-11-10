import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {loadLibrary} from '../src/index.js';
import {TIMING_AUDIT_VERSION,GLOBAL_TIMING_RULES,DOMAIN_TIMING_SPECS,TRIGRAM_PERIOD_SPECS,TIMING_TEXT_ISSUES} from '../src/timing-rules.js';
const root=new URL('../',import.meta.url),lib=await loadLibrary(),sections=new Map(lib.listSections().map(s=>[s.id,s]));
const get=p=>readFile(new URL(p,root),'utf8'),save=(p,s)=>writeFile(new URL(p,root),s);
function evidence(sectionId,quote){
 const s=sections.get(sectionId);if(!s)throw new Error('Missing section '+sectionId);
 const at=s.text.indexOf(quote);if(at<0)throw new Error('Quotation mismatch '+sectionId+': '+quote);
 return {sectionId,title:s.title,quote,sourceRef:s.sourceRef,quoteOffsetInSection:at,
  sectionSha256:createHash('sha256').update(s.text).digest('hex')};
}
const rules=GLOBAL_TIMING_RULES.map(r=>({...r,evidence:evidence(r.sectionId,r.quote)}));
const domains=DOMAIN_TIMING_SPECS.map(d=>({...d,source:evidence(d.sectionId,sections.get(d.sectionId).text),
 directRules:d.directRuleIds.map(id=>rules.find(r=>r.id===id)),
 generalRules:d.generalRuleIds.map(id=>rules.find(r=>r.id===id))}));
const periods=TRIGRAM_PERIOD_SPECS.map(p=>({...p,evidence:evidence(p.sectionId,p.quote)}));
const editions=await Promise.all([1,2,3].map(async n=>{const ref=JSON.parse(await get(`sources/references/meihua-${n}.json`));return {id:ref.id,url:ref.url,revisionId:ref.revisionId,textSha256:createHash('sha256').update(ref.text).digest('hex'),scope:'在线传世文本对校，不冒称已核纸本底本'};}));
const retrievals=JSON.parse(await get('sources/audit/timing-retrievals-20261110.json'));
const cases=JSON.parse(await get('data/classical-cases.json'));
const observations=cases.cases.map(c=>({caseId:c.id,sectionId:c.sourceSectionId,title:c.title,
 prediction:c.prediction,feedback:c.feedback,timing:c.timing,input:c.charts.map(x=>x.input),
 reusePolicy:c.reusePolicy,evidence:evidence(c.sourceSectionId,c.sourceText)}));
const result={schemaVersion:'1.0.0',auditVersion:TIMING_AUDIT_VERSION,contentVersion:lib.contentVersion,
 primaryBasis:'user-supplied-three-volumes;section text and quotations verified',editions,retrievals,
 scope:{domains:18,sourceSectionsReviewed:[...new Set([...rules.map(x=>x.sectionId),...domains.map(x=>x.sectionId),'mh-052','mh-108','mh-109','mh-110','mh-119','mh-120','mh-143','mh-144','mh-019','mh-026','mh-027','mh-028','mh-055','mh-059','mh-105','mh-113','mh-138','mh-146','mh-149',...observations.map(x=>x.sectionId)])],
  allStoriesRewrite:'waiting-for-user-style-approval',calendarSelection:'no implicit next-cycle event deadline',
  medical:'historical-reference-only;no clinical prognosis or treatment dates'},
 rules,domains,trigramPeriods:periods,cases:observations,issues:TIMING_TEXT_ISSUES,
 supplementalSubjects:[
  {label:'器物成毁',sectionIds:['mh-110','mh-122'],scope:'按材质、耐久与全卦原数定年/月/日；物毁与新置日期分开'},
  {label:'屋宅寿限',sectionIds:['mh-108','mh-109','mh-122'],scope:'保存三家原断与原数不统一的问题，不把矛盾数值写成通用算法'},
  {label:'种植与畜养',sectionIds:['mh-028','mh-029','mh-034','mh-035','mh-041','mh-042','mh-043','mh-110'],scope:'保留触发外应、原数与朝夕事理，不能移植历史天数及伤害结局'}],
 userVoidExtension:{sourceIds:['user-void-extension','user-void-timing'],separateFromClassical:true,
  releasePriority:['fill','clash','conditional-combine'],trueVoidDoesNotEraseAdverseTiming:true,
  releaseStateDoesNotProveEventFulfilled:true}};
if(domains.length!==18||domains.some(d=>d.directRules.some(x=>!x)||d.generalRules.some(x=>!x)))throw new Error('Incomplete domain rule coverage');
await save('data/timing-audit.json',JSON.stringify(result,null,2)+'\n');
const q=x=>"'"+JSON.stringify(x).replaceAll("'","''")+"'";
const sql=['PRAGMA foreign_keys=ON;','BEGIN;',
 'CREATE TABLE IF NOT EXISTS timing_audit_rules(id TEXT PRIMARY KEY,payload_json TEXT NOT NULL);',
 'CREATE TABLE IF NOT EXISTS domain_timing_profiles(domain_id TEXT PRIMARY KEY REFERENCES domains(id),payload_json TEXT NOT NULL);',
 'CREATE TABLE IF NOT EXISTS trigram_timing_periods(trigram TEXT PRIMARY KEY,payload_json TEXT NOT NULL);',
 'CREATE TABLE IF NOT EXISTS timing_audit_issues(id TEXT PRIMARY KEY,payload_json TEXT NOT NULL);'];
for(const [table,items,key] of [['timing_audit_rules',rules,'id'],['domain_timing_profiles',domains,'id'],['trigram_timing_periods',periods,'trigram'],['timing_audit_issues',TIMING_TEXT_ISSUES,'id']]){
 for(const r of items)sql.push(`INSERT OR REPLACE INTO ${table} VALUES ('${r[key]}',${q(r)});`);
}
sql.push('CREATE TABLE IF NOT EXISTS timing_audit_metadata(key TEXT PRIMARY KEY,value TEXT NOT NULL);');
for(const [k,v] of [['audit_version',TIMING_AUDIT_VERSION],['content_version',lib.contentVersion],['status','source-checked;open-text-issues']])sql.push(`INSERT OR REPLACE INTO timing_audit_metadata VALUES ('${k}','${v}');`);
sql.push('COMMIT;');await save('data/timing-audit.sql',sql.join('\n')+'\n');
console.log(`Timing audit: ${rules.length} checked clauses, 18 domains, 8 trigram period records, 10 source cases, ${TIMING_TEXT_ISSUES.length} scoped issues; JSON and supplemental SQL rebuilt.`);
