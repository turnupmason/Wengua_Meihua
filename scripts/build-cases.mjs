/** Preserve the book's predictions and reported feedback verbatim; recompute chart identities. */
import {writeFile} from 'node:fs/promises';
import {loadLibrary} from '../src/index.js';
const lib=await loadLibrary(),sections=lib.listSections();
const specs=[
 {sectionId:'mh-034',casts:[{method:'time',yearBranchNumber:5,lunarMonth:12,lunarDay:17,hourBranchNumber:9,expected:[49,1,44,31]}],prediction:'明晚当有女子折花，园丁不知而逐之，女子失惊坠地，逐伤其股。',feedback:null,time:{prediction:'明晚',reported:null},notes:['本节保留了预测，所给段落没有另述次日晚间的事后反馈。不得补写为已发生。']},
 {sectionId:'mh-035',casts:[{method:'time',yearBranchNumber:6,lunarMonth:3,lunarDay:16,hourBranchNumber:4,expected:[44,5,1,50]}],prediction:'此花明日午时，当为马所践毁。',feedback:'次日午时，果有贵官观牡丹，二马相啮，群至花间驰骤，花尽为之践毁。',time:{prediction:'明日午时',reported:'次日午时'},notes:[]},
 {sectionId:'mh-036',casts:[{method:'numbers',upperNumber:1,lowerNumber:5,movingTotal:16,expected:[44,4,1,57]}],prediction:'必斧也。',feedback:'闻之，果借斧',time:{prediction:'当晚借物',reported:'当晚问答'},notes:['加酉时十数，总十六；声音数与加时规则以此个案所述为准。原文另载其子误断锄，不能混作先生结论。']},
 {sectionId:'mh-037',casts:[{method:'numbers',upperNumber:8,lowerNumber:5,movingTotal:13,expected:[46,1,54,11]}],prediction:'今日有人相请，客不多，酒不醉，味至黍鸡而已。',feedback:'至晚果然。',time:{prediction:'今日',reported:'至晚'},notes:['“至晚果然”是原书概括性反馈；不补写具体席次、人物或菜目。']},
 {sectionId:'mh-038',casts:[{method:'numbers',upperNumber:7,lowerNumber:8,movingTotal:15,expected:[23,3,2,52]},{method:'numbers',upperNumber:7,lowerNumber:10,movingTotal:17,expected:[41,5,24,61]}],prediction:'寺中当有陰人之祸',feedback:'寺果无事。',time:{prediction:null,reported:null},notes:['保存添笔前后两张子盘。字画数按原书所给七、八、十采用，不冒充现代通行笔画字典的统计。原文依寺院外应取象，不能只以比和机械下结论。','添笔后损卦的两互分别为震木、坤土；“用互俱生体”不可扩写成每个互卦都生体。']},
 {sectionId:'mh-039',casts:[{method:'numbers',upperNumber:1,lowerNumber:5,movingTotal:10,expected:[44,4,1,57]}],prediction:'汝于五日内谨慎出入，恐有重祸。',feedback:'果五日，此老赴吉席，因鱼骨鲠而终。',time:{prediction:{count:5,unit:'day',operator:'within'},reported:{count:5,unit:'day'}},notes:['五日来自此案总数十、当事人在行而取半的说明；不能推广为所有盘一律取半。']},
 {sectionId:'mh-040',casts:[{method:'numbers',upperNumber:7,lowerNumber:3,movingTotal:17,expected:[22,5,40,37]}],prediction:'子于十七日内必有聘币之喜。',feedback:'至期，果然定亲。',time:{prediction:{count:17,unit:'day',operator:'within'},reported:'至期'},notes:['互卦为上震下坎，离体同时遇震木生、坎水克，变用巽木生体。原文“互变俱生之”不能扩写成全盘无克。']},
 {sectionId:'mh-041',casts:[{method:'numbers',upperNumber:8,lowerNumber:6,movingTotal:21,expected:[7,3,24,46]}],prediction:'此牛二十一日内必遭屠杀。',feedback:'后二十日，人果买此牛，杀以犒众，悉皆异之。',time:{prediction:{count:21,unit:'day',operator:'within'},reported:{count:20,unit:'day'}},notes:['预测是二十一日内，反馈是后二十日，不改成同一个数。','互卦上坤下震，对坤体分别为比和与克，不能说两个互卦都克体。']},
 {sectionId:'mh-042',casts:[{method:'numbers',upperNumber:5,lowerNumber:1,movingTotal:10,expected:[9,4,38,1]}],prediction:'此鸡十日当烹。',feedback:'果十日客至，有烹鸡之验。',time:{prediction:{count:10,unit:'day'},reported:{count:10,unit:'day'}},notes:[]},
 {sectionId:'mh-043',casts:[{method:'numbers',upperNumber:3,lowerNumber:2,movingTotal:10,expected:[38,4,63,41]}],prediction:'此树十日当伐。',feedback:'果十日，伐树起公榭，而匠者适字“元夫”也。',time:{prediction:{count:10,unit:'day'},reported:{count:10,unit:'day'}},notes:['匠者字元夫为书中反馈，不能在新盘中凭空为现实人物安名。']}
];
const cases=[];
for(const spec of specs){
 const section=sections.find(s=>s.id===spec.sectionId);if(!section)throw new Error('Missing case source');
 for(const quote of [spec.prediction,spec.feedback])if(quote&&!section.text.includes(quote))throw new Error(`Case quote not in source: ${spec.sectionId}`);
 const charts=spec.casts.map(input=>{
  const cast=input.method==='time'?lib.castByTimeParts(input):lib.castByTrigramNumbers(input);
  const r=lib.createReading(cast),actual=[r.primaryId,r.movingLine,r.stages.mutual.id,r.stages.changed.id];
  if(actual.some((v,i)=>v!==input.expected[i]))throw new Error(`Case does not reproduce: ${section.title} ${actual}`);
  return {input,primaryId:r.primaryId,movingLine:r.movingLine,mutualId:r.stages.mutual.id,changedId:r.stages.changed.id,body:r.body,use:r.use,relations:r.edges.map(e=>({role:e.targetRole,type:e.type})),structuralAudit:'recomputed-pass'};
 });
 cases.push({id:'case-'+section.id,title:section.title,sourceSectionId:section.id,sourceRef:section.sourceRef,sourceText:section.text,charts,
  prediction:{text:spec.prediction,status:'verbatim-source-claim'},feedback:spec.feedback?{text:spec.feedback,status:'reported-by-book;not-independently-verified'}:null,
  timing:spec.time,auditNotes:spec.notes,interpretationStatus:spec.notes.length?'read-with-scope-notes':'source-record',reusePolicy:'historical-study-only;never-paste-reported-events-as-new-user-outcomes'});
}
await writeFile(new URL('../data/classical-cases.json',import.meta.url),JSON.stringify({schemaVersion:'1.0.0',contentVersion:lib.contentVersion,caseVersion:'1.0.0',count:cases.length,chartCount:cases.reduce((n,c)=>n+c.charts.length,0),cases},null,2)+'\n');
console.log('Classical cases: 10 source records, 11 recomputed charts; exact predictions, separate reported feedback and timing; no invented outcomes.');
