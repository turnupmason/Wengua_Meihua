import fs from 'node:fs';
import {hist,src,editor,sha} from './reading.mjs';
const raw=fs.readFileSync(src,'utf8'),source=JSON.parse(raw),map=new Map(),readHistory=[];
for(let line=1;line<=6;line++){
 const p=`${hist}/line-${line}-independent-read.json`,t=fs.readFileSync(p,'utf8'),r=JSON.parse(t);
 if(r.articles.length!==12||r.articleReviews.length!==12)throw Error('Incomplete actual line read');
 for(let i=0;i<12;i++){const article=r.articles[i],note=r.articleReviews[i];if(note.articleSha256!==sha(JSON.stringify(article)))throw Error('Bad read hash');map.set(note.key,{article,note});}
 readHistory.push({movingLine:line,path:p,sha256:sha(t),wholeArticlesRead:12});
}
const rereadPath=`${hist}/revisions-independent-whole-reread.json`,rereadRaw=fs.readFileSync(rereadPath,'utf8'),reread=JSON.parse(rereadRaw);
for(let i=0;i<reread.articles.length;i++){const article=reread.articles[i],note=reread.articleReviews[i];if(note.articleSha256!==sha(JSON.stringify(article)))throw Error('Bad reread hash');map.set(note.key,{article,note});}
for(const article of source.articles){const r=map.get(`22/${article.movingLine}/${article.monthBranch}`);if(!r||JSON.stringify(article)!==JSON.stringify(r.article))throw Error('Current article lacks actual complete independent read');}
if(source.articles.length!==72)throw Error('Not 72');
const authorPath='sources/editorial/missing-contact/reviews-monthly/hex-022.json',authorRaw=fs.readFileSync(authorPath,'utf8'),author=JSON.parse(authorRaw);
if(author.sourceSha256!==sha(raw)||author.editor===editor)throw Error('Author version or independence mismatch');
const evidence=(p,data)=>({...data,path:p,localFileSha256:sha(fs.readFileSync(p,'utf8')),readBy:editor});
const receipt={schemaVersion:'1.0.0',scopeVersion:source.scopeVersion,questionId:source.questionId,primaryId:22,status:'second-read-complete',editor,author:'/root/classical_source_review',reviewerIsHuman:false,userIndividuallyAccepted:false,realWorldPredictionAccuracy:'not-validated',wholeArticlesRead:72,movingLinesRead:[1,2,3,4,5,6],sourcePath:src,sourceSha256:sha(raw),reviewedAt:new Date().toISOString(),
 independence:'本读者未参与022任何正文写作、修改或首轮编辑。先独立核原典和六盘，再按六爻实际显示并逐篇完整阅读72篇全部字段；只向作者发出退修意见，13篇由作者手修后，本读者另逐篇完整复读，未代作者修改源稿。',
 fieldsRead:['movingLine','monthBranch','title','short','paragraphs','placeHint','circumstanceHint','reasonHint','outcome','judgment','timing','sourceRefs'],articleHashAlgorithm:'SHA-256 of UTF-8 JSON.stringify(article), preserving source property order',reviewGeneratedByScript:false,
 lineReviews:[
 {movingLine:1,wholeArticlesRead:12,editor,finding:'十二月全字段独立读完，原艮体离用，体互震克、用互坎待制和末艮比完整，春冬弱体受克难承、夏土初助末比较足、秋薄助弱比仍留条件。舍车取守义不编交通事实，六个现实材料前提退修后整篇复读闭合。'},
 {movingLine:2,wholeArticlesRead:12,editor,finding:'六二配合依托与现实已有人接应分开，末乾受土生耗、制震减阻及生坎牵连齐备，离克乾不抹土生金。夏土条件而春秋冬难，前段火日只到近期可查接触消息；巳酉两个标题或首段前提已作者改后全字段独立复读。'},
 {movingLine:3,wholeArticlesRead:12,editor,finding:'濡如润饰与永贞条件完整，中末同震都克艮也生离，水生木和木火土链不去木克土。夏土秋有条件而春冬难，秋薄助仍有用但无强取日期；巳月现实已接通渠道的预设收准后整篇复读。'},
 {movingLine:4,wholeArticlesRead:12,editor,finding:'原体固定离，原人物艮，初耗、中坎克与震生、末离比均核清，春夏土留条件而秋冬难。王孔四应初而隔于三与朱熹三求婚分开，不指真实嫌疑人白车或关系；寅卯丑三处现实已有接点条件化并全字段复读。'},
 {movingLine:5,wholeArticlesRead:12,editor,finding:'王孔质素俭约、帛因节用而多，与朱熹浅小、程传裁制成用分别记录。中震末巽生离、坎直接克离及木克艮减耗齐备，春较足夏土条件秋冬难；少年喜色古例不删坎、不套十七日。午月前段已费力改为需费力后整篇复读。'},
 {movingLine:6,wholeArticlesRead:12,editor,finding:'白贲取饰终反素守真，不定衣发原居处或平安。原艮末坤受离生耗，土制水减压与震制土生离的正证均留，不按两土数量加凶或把土制水写成土生火；春夏条件其余难，中助时间只到行迹补入，寻获不附加返家解释。'}
 ],
 sourceEvidence:[
 evidence('sources/reference/zhouyi-zhengyi-hans/03賁.txt',{url:'https://zh.wikisource.org/wiki/周易正義/03賁',revisionId:2404954,readScope:'本轮独立第二读实际完整阅读本地贲章卦辞、彖象、六爻经文及王弼注孔颖达疏；本回执不声称本读者在线核页或原刻影印校勘。',application:'六爻原义分别核对，六四王孔有应受阻不混朱熹三来婚媾，六五王孔节用而帛多不混礼少；各原象不生造现代车辆、人员、地址与安全事实。'}),
 evidence('sources/reference/zhouyi-benyi/周易本義__四庫全書本__卷1.txt',{url:'https://zh.wikisource.org/wiki/周易本義_(四庫全書本)/卷1',revisionId:12946269,readScope:'本轮实际读取卷一噬嗑及相邻贲完整段，本回执取贲六四六五等异说对照；未声称通读全卷。',application:'六四三非寇而求婚、六五戋戋浅小与王孔一路辨开，正文没有拼成一个古今实事故事。'}),
 evidence('sources/reference/yichuan-yizhuan/伊川易傳__四庫全書本__卷2.txt',{url:'https://zh.wikisource.org/wiki/伊川易傳_(四庫全書本)/卷2',revisionId:11131282,readScope:'独立二读后专读本地贲六四、六五、上九及相邻大象初二三爻段，重点完整核六四被三隔、六五受上裁制、上九质素不失实；未声称通读全卷。',application:'核作者审计所记程传与王孔朱熹差别，确认裁帛成用不冒称王孔解释，返素不等于省略必要事实。'}),
 evidence('sources/original/meihua-volumes-1-3.txt',{urls:['https://zh.wikisource.org/wiki/梅花易數/卷一','https://zh.wikisource.org/wiki/梅花易數/卷二','https://zh.wikisource.org/wiki/梅花易數/卷三'],readScope:'本轮先为021实际读五行旺衰、求谋、行人、谒见及相邻失物、体用互变生克衰旺动静与克应相关段；022另实际完整读离艮属类、少年有喜色占与卦断遗论原段。未声称通读三卷。',application:'原人物用、原体固定，归返寻获分开。少年古例贲六五之家人虽称互变俱生，本项目解互坎克离必须保留；原问婚聘与喜色外应、十七数不能套本问寻人。位置有现实参照，日尺度有近期渠道。'}),
 evidence('docs/missing-contact/monthly-preview/POLICY.md',{readScope:'本轮独立读前阅读规则，最终封存前再次完整输出并实读当前全文，含根编辑澄清的第一节寻获定义。',application:'可靠身份和当前所在地或实际见到本人即可找到，不另加持续回复、解释动机、见面返家；安危同步另核，传统日期不作现实必然安排，首编二读均真实逐篇。'}),
 evidence(`${hist}/independent-charts.json`,{readScope:'本读者先手排101001及互010100和六变，再用独立八卦位码、五行表复核六盘120有向关系，逐盘完整输出实际核读，未调用项目排盘或关系函数。',application:'下三艮体离用、体互震用互坎，末艮乾震；上三离体艮用、体互坎用互震，末离巽坤。全部正反生克、五气轻重及同气一致性据此复核。'}),
 evidence('docs/review/MISSING_PERSON_BI_022_RULE_AUDIT_20261123.md',{readScope:'独立二读后实际阅读作者规则审计正文，重点注家分歧、少年喜色旧例和30项阶段事件分布，与本人已读原段及72篇对核。',application:'作者审计不替代独立原典阅读，戋戋三说及互变俱生概括的限制有对应说明，既有13项退修与真实复读范围一致。'})
 ],
 readHistory,rereadHistory:[{path:rereadPath,sha256:sha(rereadRaw),wholeArticlesRead:13,keys:reread.articleReviews.map(a=>a.key),reading:'作者改后实际逐篇显示并完整独立阅读全部字段，不只审差异句。'}],closedRevisionRequests:reread.articleReviews.map(a=>a.key),
 findings:[
 {status:'resolved',topic:'chart-and-direction',finding:'独立六盘与120有向关系核对，原人物和原体均不交换，旁向制水制木正证不抹直接生耗或相克，双节点不按数量改旺衰。'},
 {status:'resolved',topic:'classical-interpretations',finding:'逐爻原义与条件完整；王孔六四六五解释与程朱差异分清。少年喜色原例问婚聘并有喜色外应，未迁为十二月必吉或十七日寻人，坎互克离明确保留。'},
 {status:'closed-after-author-and-independent-full-reread',topic:'real-world-premises',keys:reread.articleReviews.map(a=>a.key),finding:'13篇现实已有线索、接点、人手或已付出等前提由作者改为若有、即使或盘面阶段条件；作者与独立读者均改后全篇读回，结果、专业判断、应期不变。'},
 {status:'resolved',topic:'finding-safety-and-location',finding:'身份现处可靠核实即认找到，未增加归家、持续联系、解释动机要求。方位原离南或原艮东北且有参照，原爻物象不指车辆外貌地址，原体强弱不代人物安危。'},
 {status:'resolved',topic:'timing-and-same-qi',finding:'30篇各取一项阶段事件、42篇具体说明不定日；中途得讯与本人现处落实分开，现实近期可持续核查渠道为日尺度前提。同气结果判断时间完全一致。'}
 ],
 articleReviews:source.articles.map(a=>map.get(`22/${a.movingLine}/${a.monthBranch}`).note),
 validationScope:{aiIndependentWholeArticleReview:'complete',humanProfessionalReview:'pending',realWorldPredictionAccuracy:'not-validated',userIndividuallyAccepted:false,meaning:'传统原典解释、盘面一致性与文字质量的独立AI复核，不声称现实失踪预测有效。'},authorReceiptSha256:sha(authorRaw)
};
const snapshot=`${hist}/final-source-actually-read.json`;fs.writeFileSync(snapshot,raw);
const out='sources/editorial/missing-contact/second-reviews-monthly/hex-022.json';if(fs.existsSync(out))throw Error('Preserve prior receipt');fs.writeFileSync(out,JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify({sourceSha256:receipt.sourceSha256,secondReceiptSha256:sha(fs.readFileSync(out,'utf8')),wholeArticlesRead:72,revisedWholeArticlesReread:13}));
