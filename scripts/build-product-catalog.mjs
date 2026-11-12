import {readFile,writeFile} from 'node:fs/promises';
import {loadLibrary,createQuestionRepository} from '../src/index.js';
import {PRODUCT_TAXONOMY,OBJECT_PRACTICAL_ADVICE} from '../sources/editorial/product-taxonomy.mjs';
const root=new URL('../',import.meta.url),library=await loadLibrary(),legacy=createQuestionRepository({library});
const classical=new Map(library.listDomains().map(d=>[d.id,d]));
const accepted=JSON.parse(await readFile(new URL('sources/editorial/accepted-samples-v3.json',root),'utf8'));
let authoredProgress=null;
try{authoredProgress=JSON.parse(await readFile(new URL('data/authored-readings/progress.json',root),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
const samples=JSON.parse(await readFile(new URL('data/ten-readings-v3.json',root),'utf8'));
for(const a of accepted.samples){const current=samples.items.find(s=>s.number===a.number);if(!current||current.artifactDigest!==a.artifactDigest)throw new Error('Accepted sample changed; do not silently carry acceptance onto revised text');}
const categories=[];
for(const c of PRODUCT_TAXONOMY){
 const subcategories=[];
 for(const [index,s] of c.subcategories.entries()){
  const subcategoryId=c.id+'.'+s.id,questions=[];
  for(const [position,raw] of s.questions.entries()){
   const id=subcategoryId+'.'+raw.id;
   for(const domain of raw.sourceDomainIds)if(!classical.has(domain))throw new Error('Unknown classical source domain');
   const possibleBindings=[raw.legacyQuestionId,...Object.values(raw.legacyBindings?.values||{})].filter(Boolean);
   for(const legacyId of possibleBindings){const q=await legacy.getQuestion(legacyId);if(q.question_type!==raw.question_type||!raw.sourceDomainIds.includes(q.domainId))throw new Error('Legacy link changes question meaning');}
   questions.push({...raw,id,position:position+1,categoryId:c.id,subcategoryId,
    chartSourceDomainId:raw.sourceDomainIds[0]||null,
    sourceSections:raw.sourceDomainIds.map(id=>({domainId:id,sectionId:classical.get(id).sectionId})),
    ruleStatus:raw.mode==='reference'?'reference-only':raw.mode==='guidance'?'practical-guidance-only':raw.manuscriptIndexPath?'author-checked-exact-cases;other-contexts-pending':possibleBindings.length?'exact-question-link;release-review-separate':'specific-method-review-required',
    sourceMappingMeaning:'scope-candidate-or-explicit-question-link;not-proof-of-modern-rule-approval',
    outputPolicy:{oneQuestionOnly:true,unverifiedDates:false,mentalStateIsFact:false,symbolicLocationIsFact:false},
    practicalAdvice:raw.practicalAdvice||[],contextFields:raw.contextFields||{}});
  }
  subcategories.push({id:subcategoryId,slug:s.id,label:s.label,position:index+1,categoryId:c.id,exampleQuestions:s.exampleQuestions,questions});
 }
 categories.push({id:c.id,number:c.number,label:c.label,position:categories.length+1,policy:c.policy||'typed-symbolic-interpretation',subcategories});
}
const subcategories=categories.flatMap(c=>c.subcategories),questions=subcategories.flatMap(s=>s.questions);
if(categories.length!==6||subcategories.length!==52||questions.length!==82||new Set(questions.map(q=>q.id)).size!==82)throw new Error('Product category coverage mismatch');
const base={schemaVersion:'1.0.0',contentVersion:library.contentVersion,productCatalogVersion:'1.0.0'};
const catalog={...base,categoryCount:6,subcategoryCount:52,questionCount:questions.length,
 selectionPolicy:{input:'category-subcategory-fixed-question',aiClassification:false,freeTextChangesQuestion:false,missingContent:'pending-no-fallback'},
 classicalDomainCount:classical.size,objectPracticalAdvice:OBJECT_PRACTICAL_ADVICE,categories};
await writeFile(new URL('data/product-categories.json',root),JSON.stringify(catalog,null,2)+'\n');
await writeFile(new URL('data/editorial-acceptance.json',root),JSON.stringify({...base,...accepted,scopeStillMatches:true},null,2)+'\n');
const plan={...base,acceptedSampleCount:accepted.samples.length,style:'user-accepted-story-editorial-3.0.0',
 activeAuthoring:authoredProgress?{questionId:authoredProgress.activeQuestionId,baseCasesWritten:authoredProgress.baseCasesWritten,totalBaseCases:4608,uniqueAuthoredVersions:authoredProgress.uniqueAuthoredVersions,contextProfilesWritten:authoredProgress.contextProfilesWritten,baseCoverageComplete:authoredProgress.baseCoverageComplete===true,progressPath:'data/authored-readings/progress.json'}:null,
 noFurtherStyleApprovalRequired:true,authorship:'assistant-authors;application-developers-integrate',backgroundExecution:false,
 categoryCount:6,subcategoryCount:52,questionCount:82,questionTypeCount:new Set(questions.map(q=>q.question_type)).size,
 sharedTypePolicy:'Explicit equivalent-scope references may share prose; question count is not independent-article count.',
 items:questions.map(q=>({questionId:q.id,question_type:q.question_type,categoryId:q.categoryId,subcategoryId:q.subcategoryId,
  mode:q.mode,ruleStatus:q.ruleStatus,contentStatus:q.mode==='narrative'?(authoredProgress?.activeQuestionId===q.id?(authoredProgress.baseCoverageComplete?'base-coverage-complete;classical-body-use':'writing-in-progress'):'exact-coverage-pending'):'reference-or-guidance-written',
  legacyQuestionId:q.legacyQuestionId||null,legacyBindings:q.legacyBindings||null}))};
await writeFile(new URL('data/product-authoring-plan.json',root),JSON.stringify(plan,null,2)+'\n');
let doc='# 正式产品分类 V1\n\n采用用户选定的6大类、52个细分项，名称与顺序保持原方案。常见问法归并同义项、拆开不同结果后，得到82个固定单事项入口。原18个古籍门类保留为后台来源，不再作为产品一级菜单。\n\n十篇V3简断与详断已获用户通过，内容及文风按原版本保留；无需重复请求文风确认。验收记录绑定原稿摘要，见 data/editorial-acceptance.json。\n\n';
for(const c of categories){doc+='## '+c.number+' · '+c.label+'\n\n';for(const s of c.subcategories){doc+='### '+s.label+'\n\n用户常见问法：'+s.exampleQuestions.join('；')+'\n\n';for(const q of s.questions)doc+='- '+q.question+'\n  - ID：'+q.id+'；类型：'+q.question_type+'\n  - 回答范围：'+q.answerScope+'\n';doc+='\n';}}
doc+='## 接入与边界\n\n使用 createProductRepository，而非将产品分类ID当作古籍domainId。固定选择路径是领域→细分类型→具体问题，辅助字段仅用来明确物品种类、所问年份、购买用途；备注不参与AI分类。明确同义的问法可以共用类型和已审核全文，面试/录用、升职/加薪、成交/理想价格、复合/复合后稳定分别处理。\n\n健康的8个细分全部为传统象意查阅，保留用户原示例，实际按钮使用查阅问法；不进行诊断、病情轻重评估、疗效预测或医疗决策。暗恋与合伙可靠性保留为关系取象问题，不核实真实心理或信用。投资不生成收益保证、产品推荐或买卖指令。\n\n寻人、宠物与物品使用独立类型。恢复联系不能套行人归期或物品找回。现实求助和排查建议优先显示，传统方位不表示已定位。遇到明确方法或稿件缺失，保留待写状态，不调用领域通用断语填补。\n\n来源关联是候选范围与明确问法的连接，不表示所有现代分支均已完成断法审核。接受十篇的内容与文风，不会自动把旧1,920篇批量稿或未覆盖的空亡、应期版本标成已审。\n\n构建 npm run build:product；完整数据构建也会生成本目录。产品JSON为 data/product-categories.json，SQL为 data/product-categories.sql，SQLite合并到 dist/wengua.sqlite。\n';
await writeFile(new URL('docs/PRODUCT_CATEGORIES_V1.md',root),doc);
console.log({categories:categories.length,subcategories:subcategories.length,questions:questions.length,questionTypes:plan.questionTypeCount,acceptedSamples:accepted.samples.length});
