import {writeFile} from 'node:fs/promises';
import {COMPOSITION_VERSION} from '../src/story-language.js';
import {loadLibrary,createNarrativeRepository} from '../src/index.js';
const library=await loadLibrary(),stories=createNarrativeRepository({library});
const examples=[
 ['求财：正在推进的一件财务事项',49,1,'spring-wood','domain-10','甲子'],
 ['合作：一项交易合作',42,4,'spring-wood','domain-11','甲戌'],
 ['感情：关系能否继续推进',32,1,'autumn-metal','domain-05','甲午'],
 ['出行：一项行程安排',33,3,'summer-fire','domain-12','甲寅'],
 ['计划：停下的事情想重新启动',24,1,'winter-water','domain-08','甲午'],
 ['失物：能否找回遗失物品',39,4,'winter-water','domain-15','甲寅'],
 ['求职：岗位或职位的争取',12,3,'seasonal-earth','domain-09','甲子'],
 ['会面：能否见到想见的人',22,5,'summer-fire','domain-14','甲申'],
 ['家宅：居家事务如何推进',28,2,'summer-fire','domain-03','甲午'],
 ['求财：体卦真空的条件例',1,1,'summer-fire','domain-10','甲子']
];
let doc='# 十个故事试读 · 直接断语版\n\n组合版本'+COMPOSITION_VERSION+'。以下是联调输出，尚未通过用户文风审稿。应期按十八门校核，缺少起卦法或取期依据时不填日期。示例不是读者个人占卦，未编造反馈。箭头为本、互、变。\n\n第10例另有明确输入：体卦衰极、受日月侵害。不能仅凭夏月或逢空就判真空。总断取用口径见 [DIRECT_STORIES.md](DIRECT_STORIES.md)。\n';
for(let i=0;i<examples.length;i++){
 const [title,primaryId,movingLine,monthOrder,domainId,ganzhi]=examples[i];
 const r=await stories.getStory({primaryId,movingLine,monthOrder,domainId,voidContext:{ganzhi,...(i===9?{roleEvidence:{body:{severelyWeak:true,dayMonthAttacked:true}}}:{})},timingScale:'day'});
 doc+='\n## '+(i+1)+'. '+title+'\n\n'+Object.values(r.reading.stages).map(s=>s.name).join(' → ')+'；'+r.movingLine.label+'动；'+r.monthOrder.label+'；示例日：'+ganzhi+'。\n\n'+r.story+'\n';
}
await writeFile(new URL('../docs/TEN_STORY_PREVIEWS.md',import.meta.url),doc);
console.log('Rebuilt ten exact direct-story outputs.');
