// Copy-preview checker and renderer for newly authored wealth-fortune manuscripts.
// Does not generate readings from templates, sign receipts, infer reality, or change runtime.
// node scripts/review/wealth-fortune-monthly.mjs [--build] [--index] [--json path]
import {readFile,writeFile,readdir,mkdir} from 'node:fs/promises';
import {loadLibrary} from '../../src/index.js';
import {createContextualReading} from '../../src/interview-manuscripts.js';
import {MONTHS,QI,stem,sha256,han,independentFacts} from './monthly-lib.mjs';
const dir='sources/editorial/wealth-fortune',doc='docs/wealth-fortune/monthly-preview',review='docs/review/wealth-fortune';
const checkPath='docs/review/WEALTH_FORTUNE_MONTHLY_CHECKS.json';
const c={id:'wealth.near-term.outlook',mode:'narrative',question_type:'near_term_financial_outlook',question:'近期财务得失的传统趋势如何，有没有进账机会？',sourceDomainIds:['domain-10']};
const label={use:'本用',body:'原体',body_mutual:'体互',use_mutual:'用互',changed_use:'变用'};
const relation={equal:'与原体比和',use_generates_body:'直接生原体',body_generates_use:'受原体生而耗',use_controls_body:'直接克原体',body_controls_use:'受原体克'};
const outcomes={favourable:'求财较见进益，耗失可承',conditional:'有进有耗或仍需落实条件',difficult:'求财阻力或耗失占主导'};
const inflow={promising:'进账象较明确',conditional:'有争取的空间，落实仍受限',weak:'进账象薄，求财较难'};
const args=process.argv.slice(2),flag=f=>args.includes(f),arg=f=>flag(f)?args[args.indexOf(f)+1]:null;
const read=async p=>JSON.parse(await readFile(p,'utf8'));
const dump=x=>JSON.stringify(x,null,2)+'\n';
const library=await loadLibrary();
const ids=(await readdir(dir+'/monthly')).filter(x=>/^hex-\d{3}\.json$/.test(x)).map(x=>+x.slice(4,7)).sort((a,b)=>a-b);
const report={schemaVersion:'1.0.0',item:'wealth-fortune',scope:'copy-preview; structural, factual, lexical validation; not semantic or real-world prediction validation',status:'pending',articleCount:0,chartComparisons:0,chartMismatches:[],errors:[],scopeWarnings:[],resolvedScopeWarnings:[],expandedScopeArticles:0,authorReadback:0,secondReadback:0,bodyHanRange:[Infinity,0],shortHanRange:[Infinity,0],hexagrams:[],separateEvidenceCount:0};
const err=(key,check,detail)=>report.errors.push({key,check,detail});
const adjudications=(await read(dir+'/scope-flag-resolutions.json').catch(e=>{if(e.code==='ENOENT')return {resolutions:[]};throw e})).resolutions;
const warn=(key,check,detail,a)=>{const hash=a?sha256(JSON.stringify(a)):null;const resolved=adjudications.find(x=>x.key===key&&x.check===check&&x.articleSha256===hash&&x.reviewer&&x.finding);if(resolved)report.resolvedScopeWarnings.push({key,check,detail,articleSha256:hash,reviewer:resolved.reviewer,finding:resolved.finding});else report.scopeWarnings.push({key,check,detail});};
const textOk=(v,min)=>typeof v==='string'&&han(v)>=min;
const norm=s=>s.replace(/[「『“][^」』”]*[」』”]/gu,'').match(/\p{Script=Han}/gu)?.join('')??'';
const banned=/不能[^。！？；\n]{0,150}更不能/u;
const gain=/财|收入|进账|入账|款|收益|回款|所得|进益|钱|利/u;
const expenditure=/耗|支出|成本|开销|负担|损|破财|费用|留存|净利|结余|风险|余钱|余财|保住|入不敷出|花费|余额|财务责任|动用钱财|留.*资金|泄己|收支|收付|开支|实支|支用|余量|留财|已亏|付款|宽裕|财[^。]{0,12}不厚|财源相合却乏力|守成|财运有维持条件|财利有稳住的条件|赔钱|净留|财势平常|相冲|财务方向平顺|充裕|利润|留.*周转/u;
const dirs=['monthly','reviews-monthly','second-reviews-monthly'];
function compare(k,a,b,what){report.chartComparisons++;if(JSON.stringify(a)!==JSON.stringify(b)){report.chartMismatches.push({key:k,what,actual:a,expected:b});err(k,'chart',what);}}
function render(id,src,rs){
 const n=stem(id),name=library.getHexagram(id).name;
 const out=[`# ${id} · ${name}：六动爻与十二月令`,`本页为财富财运逐月原创断语，已完成 ${src.articles.length}/72 篇（${src.articles.length/12}爻），其中 ${src.articles.filter(a=>a.editorialVersion==='wealth-fortune-v2').length} 篇已按第二版完整求财口径更新。`,
 `[返回目录](README.md) · [作者逐篇读回](../../../${dir}/reviews-monthly/${n}.json) · [独立全文二读](../../../${dir}/second-reviews-monthly/${n}.json)`,
 '本问只看所选近期的总体求财、进账及耗失趋势。现有收入来源、款项、成本和资产须按实际核实；进账不等于净利，无财不等于破财。时段仅供已有财务事项参考。'];
 for(let i=0;i<src.articles.length;i++){
  const a=src.articles[i],r=rs[i];
  out.push(`## ${r.selectedMovingLine.label}动 · ${a.monthBranch}月`,a.title,Object.values(r.stages).map(x=>x.name).join(' → '),...a.paragraphs,'### 时段参考',a.timing,'<details>\n<summary>卦理与出处</summary>',
   '版本：'+(a.editorialVersion==='wealth-fortune-v2'?'第二版完整求财':'第一版财务进出')+'。',
   '判断：'+outcomes[a.outcome]+'；进账倾向：'+inflow[a.inflow]+'。',
   '作用：'+r.edges.map(x=>{const n=r.nodes.find(y=>y.role===x.targetRole);return label[n.role]+n.trigram+n.element+relation[x.type]}).join('；')+'。',
   '旺衰：'+r.nodes.filter(n=>n.role!=='body_inherited').map(n=>label[n.role]+n.trigram+n.element+n.strength.state).join('；')+'。',
   '爻辞：'+r.selectedMovingLine.label+'「'+r.selectedMovingLine.text+'」；象曰「'+r.selectedMovingLine.image+'」。',
   '专业说明：'+a.judgment,'逐项证据（具体适用由作者和独立读者核对）：',a.evidence.map(e=>'- '+e).join('\n'),
   `稿件键：\`wealth.near-term.outlook/${id}/${a.movingLine}/${a.monthBranch}\`。作者源：[源JSON](../../../${dir}/monthly/${n}.json)。`,
   '</details>','<details>\n<summary>简断摘要</summary>',a.short,'</details>');
 }
 return out.join('\n\n').replace(/[ \t]+$/gm,'')+'\n';
}
const seenText={body:new Map(),short:new Map()};
await mkdir(doc,{recursive:true});await mkdir(review,{recursive:true});
for(const id of ids){
 const n=stem(id),p=dir+'/monthly/'+n+'.json',raw=await readFile(p,'utf8'),src=JSON.parse(raw),sourceSha256=sha256(raw),rs=[];
 const rr=[];
 for(const [kind,f] of [['author','reviews-monthly'],['second','second-reviews-monthly']]){
  const path=dir+'/'+f+'/'+n+'.json',r=await read(path);rr.push(r);
  if(r.sourceSha256!==sourceSha256||r.wholeArticlesRead!==src.articles.length||r.articleReviews?.length!==src.articles.length)err(id,kind+'-receipt','source or count mismatch');
 }
 if(rr[0].editor===rr[1].editor)err(id,'reviewer','author and second reader must differ');
 if(src.primaryId!==id||!src.articles.length||src.articles.length>72||src.articles.length%12)err(id,'coverage','expected whole line groups');
 const q=new Map(),stats={favourable:0,conditional:0,difficult:0},inflows={promising:0,conditional:0,weak:0};
 for(const [i,a] of src.articles.entries()){
  const k=id+'/'+a.movingLine+'/'+a.monthBranch;report.articleCount++;if(a.editorialVersion==='wealth-fortune-v2')report.expandedScopeArticles++;else if(a.editorialVersion!==undefined)err(k,'edition','unrecognized editorial version');
  if(a.movingLine!==Math.floor(i/12)+1||a.monthBranch!==MONTHS[i%12])err(k,'coverage','wrong line or branch order');
  if(!(a.outcome in outcomes)||!(a.inflow in inflow))err(k,'outcome','invalid codes');else{stats[a.outcome]++;inflows[a.inflow]++}
  const qk=a.movingLine+'/'+QI[a.monthBranch],qv=JSON.stringify([a.outcome,a.inflow]);if(q.has(qk)&&q.get(qk)!==qv)err(k,'same-qi','outcome or inflow differs');q.set(qk,qv);
  if(!textOk(a.title,6)||!Array.isArray(a.paragraphs)||a.paragraphs.length<4||a.paragraphs.length>5||a.paragraphs.some(p=>!textOk(p,30))||!textOk(a.judgment,18)||!textOk(a.timing,12))err(k,'content','missing substantial fields');
  if(!Array.isArray(a.evidence)||a.evidence.length<2||a.evidence.length>(a.editorialVersion==='wealth-fortune-v2'?8:6)||a.evidence.some(v=>!textOk(v,6)&&!(textOk(v,3)&&/\d{2,3}/u.test(v))&&!(/^《说卦》\d{2}\.\d{2}:\d{2}/u.test(v)))||!a.evidence.some(v=>/\d{2,3}(?:[–—-]|行|[:：]|\.)/u.test(v)))err(k,'evidence','2–6 (v2 up to 8) concrete source observations and locator required');
  else report.separateEvidenceCount+=a.evidence.length;
  const body=a.paragraphs.join('\n'),b=han(body),s=han(a.short);
  if(b<500||b>650)err(k,'body-length',b);if(s<60||s>120)err(k,'short-length',s);
  for(const [f,l] of [['bodyHanRange',b],['shortHanRange',s]]){report[f][0]=Math.min(report[f][0],l);report[f][1]=Math.max(report[f][1],l)}
  if(banned.test([a.title,a.short,body].join('\n')))err(k,'banned-style','连环否定');
  for(const [f,v] of [['body',body],['short',a.short]]){
   if(!gain.test(v)||!expenditure.test(v))warn(k,'wealth-scope-'+f,'进财与收支/耗失词筛须实际读审');
   const x=norm(v);if(seenText[f].has(x))err(k,'exact-duplicate-'+f,seenText[f].get(x));seenText[f].set(x,k);
  }
  if(/(?:稳赚|保本保收益|必赚|保证收益|百分之百获利|闭眼买|加杠杆|重仓买入|必定到账|一定到账|肯定到账)/u.test([a.title,body,a.short,a.timing].join('\n')))warn(k,'definite-event','保证收益或交易指令词筛须按语境核对',a);
  if(/\d{1,2}月\d{1,2}日|\d{4}-\d{2}-\d{2}/u.test(a.timing))warn(k,'day-window','未给起卦日及问期，不列公历日期');
  for(const [j,r] of rr.entries()){
   const found=r.articleReviews.find(x=>x.key===k);
   if(!found||found.articleSha256!==sha256(JSON.stringify(a))||!textOk(found.finding,8))err(k,j?'second-article-receipt':'author-article-receipt','current object fingerprint or finding mismatch');else if(j)report.secondReadback++;else report.authorReadback++;
  }
  const f=independentFacts(id,a.movingLine,a.monthBranch);
  // The all-equal geometry has one strength across all direct roles. The
  // editorial rule keeps weak co-direction distinct from loss or control.
  if(f.relations.every(x=>x.type==='equal')){
   const state=f.nodes.find(n=>n.role==='body').qi;
   const expected={'旺':['favourable','promising'],'相':['favourable','promising'],'休':['conditional','conditional'],'囚':['conditional','weak'],'死':['difficult','weak']}[state];
   if(expected&&JSON.stringify([a.outcome,a.inflow])!==JSON.stringify(expected))err(k,'all-equal-strength','all-equal rule: '+state+' expected '+expected.join('/'));
  }
  const r=createContextualReading({library,question:c,primaryId:id,movingLine:a.movingLine,monthBranch:a.monthBranch,castingDate:'2026-11-28',applyVoid:false});rs.push(r);
  compare(k,r.stages.primary.bitsBottomUp,f.bits,'base bits');
  for(const [j,v] of Object.values(r.stages).entries())compare(k,v.id,f.stageIds[j],'stage '+j);
  compare(k,r.selectedMovingLine.label,f.lineLabel,'moving line');
  for(const x of f.nodes){const y=r.nodes.find(n=>n.role===x.role);for(const attr of ['trigram','element','qi'])compare(k,attr==='qi'?y?.strength.state:y?.[attr],x[attr],x.role+' '+attr)}
  for(const x of f.relations)compare(k,r.edges.find(e=>e.targetRole===x.role)?.type,x.type,x.role+' relation');
 }
 const rendered=render(id,src,rs),dp=doc+'/'+n+'.md';
 if(flag('--build'))await writeFile(dp,rendered);
 const actual=await readFile(dp,'utf8').catch(()=>null);
 if(actual!==rendered)err(id,'render','preview does not match actual source');
 report.hexagrams.push({primaryId:id,name:library.getHexagram(id).name,articles:src.articles.length,expandedScopeArticles:src.articles.filter(a=>a.editorialVersion==='wealth-fortune-v2').length,outcomes:stats,inflow:inflows,sourcePath:p,sourceSha256,readingPath:dp,authorReceiptPath:dir+'/reviews-monthly/'+n+'.json',secondReceiptPath:dir+'/second-reviews-monthly/'+n+'.json'});
}
report.status=report.errors.length?'failed':'passed';
if(arg('--json'))await writeFile(arg('--json'),dump(report));
if(flag('--index')&&!report.errors.length){
 const previous=await read(doc+'/manifest.json').catch(()=>null),old=previous?.uploadedArticles??0;
 const manifest={schemaVersion:'1.0.0',item:'wealth-fortune',scope:'copy-preview-only',questionIds:['wealth.near-term.outlook','wealth.near-term.inflow'],uploadedArticles:report.articleCount,expandedScopeReviewedArticles:report.expandedScopeArticles,remainingExpandedScopeArticles:4608-report.expandedScopeArticles,fullTarget:4608,remainingArticles:4608-report.articleCount,newArticlesSincePrevious:report.articleCount-old,publicationDate:'2026-11-28',authorWholeArticleReadback:report.authorReadback,independentWholeArticleReadback:report.secondReadback,independentHumanReview:'pending',runtimeChanged:false,userPerArticleAcceptance:false,hexagrams:report.hexagrams,checks:{bodyHanRange:report.bodyHanRange,shortHanRange:report.shortHanRange,chartComparisons:report.chartComparisons,chartMismatches:report.chartMismatches.length,scopeWarnings:report.scopeWarnings.length,machineReport:checkPath,styleReport:'docs/review/WEALTH_FORTUNE_MONTHLY_STYLE.json'}};
 await writeFile(doc+'/manifest.json',dump(manifest));await writeFile(checkPath,dump(report));
 const lines=[`# 财富财运逐月原创断语：${report.articleCount} 篇预览`,`累计 ${report.articleCount}/4,608 篇，剩余 ${4608-report.articleCount} 篇；已按第二版完整求财口径更新且双读锁定 ${report.expandedScopeArticles} 篇，第二版剩余 ${4608-report.expandedScopeArticles} 篇。已发布稿均由作者及不同独立AI逐篇全文读回，古籍及具体象类证据见每篇详情。[写作与规则证据](../RULE_AUDIT.md)及逐卦审计可对照。`,
 '| 卦 | 已发布篇数 | 第二版篇数 | 正文 | 核读回执 |','|---|---:|---:|---|---|',...report.hexagrams.map(x=>`| ${x.name} | ${x.articles}/72 | ${x.expandedScopeArticles}/72 | [读全文](${stem(x.primaryId)}.md) | [作者](../../../${x.authorReceiptPath}) · [独立](../../../${x.secondReceiptPath}) |`),
 '',`正文 ${report.bodyHanRange[0]}–${report.bodyHanRange[1]} 汉字，简断 ${report.shortHanRange[0]}–${report.shortHanRange[1]} 汉字。盘面比较 ${report.chartComparisons} 项，差异 ${report.chartMismatches.length}。本库依据求财专条区分进益、无财、耗失与比和，不将进账直接当作净利润，不保证现实收益或给投资指令。`,
 '[机器核验](../../review/WEALTH_FORTUNE_MONTHLY_CHECKS.json) · [全量风格核验](../../review/WEALTH_FORTUNE_MONTHLY_STYLE.json) · [逐卦规则审计](../../review/wealth-fortune/README.md) · [交付清单](manifest.json)'];
 await writeFile(doc+'/README.md',lines.join('\n\n').replaceAll('|\n\n|','|\n|')+'\n');
}
console.log(JSON.stringify({status:report.status,articles:report.articleCount,expandedScope:report.expandedScopeArticles,hexagrams:ids.length,bodyHanRange:report.bodyHanRange,shortHanRange:report.shortHanRange,chartComparisons:report.chartComparisons,errors:report.errors.slice(0,20),warnings:report.scopeWarnings.length,author:report.authorReadback,second:report.secondReadback},null,2));
if(report.errors.length)process.exitCode=1;
