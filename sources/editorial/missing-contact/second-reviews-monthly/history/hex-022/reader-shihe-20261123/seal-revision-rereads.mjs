import fs from 'node:fs';
import {hist,src,editor,sha} from './reading.mjs';
const findings=[
'改后整篇全部字段再次独立阅读。首段以「即使有人提供消息」取消现实已获消息的预设，后面仍按相离初助、旺震中克、末弱艮薄比判难；人物离南带参照，处境不越界，无日期理由保持。',
'完整复读最终对象。首段明确「若现实已有可核线索」，没有先认定渠道已接通；旺艮承初休火与末旺比、囚震缓克等正反齐备，末期仅一项身份现处核实，归家安全不混。',
'作者收准后全字段复读。首段「若现实已有可核接点」不再默认手上有消息或已经接近本人；旺火生相土、中段仍待办与末相比支持寻获较有望，时间未改而有近期渠道限制。',
'全部字段完整再读。首段明确力量来自「本盘前段有助，后段也有继续承接」，不再宣称现实后面有人力接手；旺体初助中可办末旺比与四土月一致，车徒不生路线和日期。',
'最终整篇全字段复读。已将刚接到消息改为「即使接到消息」，秋囚火薄生、休土承相水待制与末休比仍留条件，未知现实不预填；薄助弱比未夸强，位置安危与原用一致。',
'完整改后读回。第四段以「若现实线索已接近本人当前去向」明示前提，未再直接断已接近；旺末比和正证与中囚木克、弱水克火反面俱存，可靠现处即找到且时窗只有一事。',
'全对象再次独立读完。标题「若有接应」与首段两个若同时收准，不把六二依附变成现实确定知情人；旺离生相艮的初助与弱乾末耗、乾制震生坎全留，候选仅前段可查接触消息。',
'改后全文各字段已读。标题「即使有人传递」配正文同样条件句，避免预定现实传递人存在；旺乾制弱震减阻与生相坎牵连、土生乾耗方向准确，秋难断及无日期未变。',
'最终对象整篇复读。新线索和继续核查渠道均作为若有的现实条件，未由旺初助断已经接通；九三永贞保原约束，中末震克不被木火土生路抵消，前讯窗口不充寻获日。',
'独立完整复读。首段「若已有可核接触」明确材料前提，后续王孔四应初受三隔没有指现实嫌疑人；春旺震生、休坎克与末相比正反齐全，现处可靠核实即找到。',
'修改后所有字段重读。标题和首段均改「若有接点」，同时保留继续追问的自然表述；旺木助体与克艮减耗分清，不删初耗和水克，白马婚媾未配现实车辆关系或日期。',
'改后整篇全字段复读。首段两处均明确「若已有一处接触」「若手上已有消息」，不再假定现成证据；土令初耗实、中克缓、囚木薄生及末休比留有限机会，定期条件不足说明具体。',
'最终全部字段再次独立阅读。「前段需要费力」改为盘面过程判断，已不默认现实前面发生搜寻付出；王孔帛多俭约准确，夏旺离承两休木助、初土耗中水克俱留，末助时窗与巳月一致。'
];
const packets=[1,2,3].map(i=>JSON.parse(fs.readFileSync(`${hist}/revision-reread-${i}-objects.json`,'utf8')));
const articles=packets.flatMap(p=>p.articles),now=JSON.parse(fs.readFileSync(src,'utf8')).articles;
if(articles.length!==13||findings.length!==13)throw Error('13 actual rereads required');
for(const a of articles){const b=now.find(x=>x.movingLine===a.movingLine&&x.monthBranch===a.monthBranch);if(JSON.stringify(a)!==JSON.stringify(b))throw Error('Source changed after read');}
const record={editor,readCompletedAt:new Date().toISOString(),wholeArticlesReread:13,sourceSha256:sha(fs.readFileSync(src,'utf8')),method:'读者已逐篇显示并完整阅读修订后的所有字段，以下意见为实际阅读后手写；保留初读与修后对象。',articles,articleReviews:articles.map((a,i)=>({key:`22/${a.movingLine}/${a.monthBranch}`,finding:findings[i],articleSha256:sha(JSON.stringify(a)),editor,wholeArticleRead:true,allFieldsRead:true}))};
const out=`${hist}/revisions-independent-whole-reread.json`;if(fs.existsSync(out))throw Error('read record exists');fs.writeFileSync(out,JSON.stringify(record,null,2)+'\n');console.log('Sealed actual independent revised whole reads',articles.length);
