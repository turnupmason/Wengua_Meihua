// Audited policy records. Quotations are checked against the supplied text at build time.
export const TIMING_AUDIT_VERSION='1.0.0';
export const RELATION_KEYS=['body_controls_use','use_controls_body','body_generates_use','use_generates_body','equal'];
export const ELEMENT_DAY_BRANCHES={木:['寅','卯'],火:['巳','午'],土:['辰','戌','丑','未'],金:['申','酉'],水:['亥','子']};
export const GLOBAL_TIMING_RULES=[
 ['method-order','mh-058','先天之卦，定事应之期，则取之卦气','先定起卦方法；先天气期与后天数期分开，不凭盘形倒造原数。'],
 ['numerical-method','mh-058','后天则以卦数加时数，总之而分行卧坐立之迟速，以为事应之期。','需后天原卦数、时数及占者动静；不是任何起卦法都取经卦数相加。'],
 ['horizon','mh-122','应之期远，则以年，近则以月，又近则以日也。','时间单位按所问远近确定；不从地支名称自动决定单位或轮次。'],
 ['element-day-table','mh-143','本日所属卦气如寅卯木、巳午火、申酉金、亥子水、辰戌丑未土也。','五行日气表；和八卦时序表分别保存，不能互相替换。'],
 ['phase-pace','mh-116','如生体是用卦，则事即成。生体是互卦，则渐成。生体是变卦，则稍迟耳。','即、渐、稍迟是相对进程，不等于一、二、三天。'],
 ['obstruction-duration','mh-116','若乾克体，阻一日，兑克体，阻二日之类推之。','在吉事有生扶又有克体的前提下论阻滞时长；不是起卦后第几日必败。多卦不可自行相加。'],
 ['good-event','mh-116','看卦中有生体之卦，则事应于生体卦气之日','一般吉事取期依据；具体应何事，仍由相应门类的条文限定。'],
 ['adverse-event','mh-116','有克体之卦，则事败于克体卦气之日。','凶应也有取期；受阻、不成、破财等事件必须分别命名。'],
 ['motion-number','mh-039','坐则事应迟，当倍其成卦之数而定之也。立则半迟半速，止以成卦之数定之可也。','结合本段行取半；仍须明事理，不将数字候选当无条件期限。'],
 ['motion-exception','mh-039','如占牡丹及观梅之类，则二日花皆朝夕之故，岂特成数之久也。','问事朝夕急缓可限定应期；原数不能覆盖明确的当日或近日事理。'],
 ['method-reproduction','mh-031','以物为上卦，方位为下卦，合物卦之数与方卦之数加时数以取动爻。','原始输入必须复现原盘；不能为了凑天数增添未实际提供的取象。'],
 ['property-lifetime','mh-122','屋宅则以全卦之数刻其期。如屋宅之终应，盖屋宅有朽坏之期也。','屋宅年数所指为朽坏，不是开工日、入住日或日常事务解决日。'],
 ['marriage-scope','mh-122','然婚姻亦不过卜其吉凶，不必刻其期也。若吉凶之期，但以生体及比和之年月为吉期，克体之年月为不吉之期也。','吉凶年月与婚成日期分开；不能为每个婚盘强填结婚日。'],
 ['burial-scope','mh-122','坟墓亦有损坏，然占墓但占吉凶，不计成败也。','不将吉地或不利之象编成某日安葬成功、失败或后代发财。'],
 ['birth-date','mh-068','如欲决其日辰，则以用卦之气数参决之。所谓卦之气数者，即看何为用卦，于八卦时序之类次之。','生产日辰以用卦气数参时序，不套通用生体日期；产品仅作古籍研究展示。'],
 ['fame-date','mh-071','欲知名成之日，生体之卦气详之。','名成之期，不等同于面试日或离职日。'],
 ['fame-body-fallback','mh-071','若无克体之卦，则名易就，止看卦体时序之类，以定日期。','限定无克体条件；不得省略条件后普遍改取体卦时序。'],
 ['fame-office-risk','mh-071','其日期，看克体之卦气者，于八卦所属时序类中断之。','本段针对在任者的官职风险；不直接套到所有求职者。'],
 ['wealth-gain','mh-072','欲知得财之日，生体之卦气定之。','得财事件。'],
 ['wealth-loss','mh-072','欲知破财之日，克体卦气定之。','破财事件；无财可得不自动等于损失本金。'],
 ['wealth-control-gain','mh-072','又若卦中有体克用之卦，及生体之卦，则有财，此卦气即见财之日。','保留体克用与生体两类财应，不能只实现生体。'],
 ['wealth-drain-loss','mh-072','若卦中有克体之卦，及体生用之卦，即破财，此卦气破财之日。','保留克体与泄体两类耗财应。'],
 ['traveler-return','mh-122','又若问行人，以生体之日为归期，无生体比和之日，则归必迟。','归来应期；不归、归迟本身不等于某个确定的终止日期。'],
 ['health-periods','mh-078','若究和平之日，主卦决之。若详危厄之期，克体之卦定之。','主卦一词保留，结合后文逢生案例；不擅改成唯一生体公式，不输出临床日期。'],
 ['same-chart-not-same-story','mh-098','明日观梅得革，亦谓女子折花，可乎？','同盘不允许直接移植古案人物、结局、时辰及反馈。'],
 ['weather-relative','mh-063','离在艮上，暮雨朝晴，离互艮宫，暮晴朝雨。','天气有朝暮等专门时序，须天象背景；晴雨吉凶还取决于所求。'],
 ['current-signs','mh-144','刻应者，即三要之诀也。占卜之顷，随所闻所见吉凶之兆以为吉凶之应。','刻应指当下外应，不能把刻字解释为钟表分钟。']
].map(([id,sectionId,quote,application])=>({id,sectionId,quote,application}));

// The third field follows RELATION_KEYS. These are event names, not generated deadlines.
const rows=[
 ['domain-01','天时',['晴雨变化','风雷变化','晴雨变化','晴雨变化','晴雨变化'],'weather-special','先按三卦天象与四时、久晴久雨背景论朝暮变化；无固定通用天数。'],
 ['domain-02','人事',['事情可成','事情受阻或不成','耗失','事情进益','谋为顺遂'],'general','参总诀，分别记成事、阻事、耗失；章内未另立固定日期公式。'],
 ['domain-03','家宅',['家宅多吉','家宅不宁','家宅耗散','家宅进益','家宅安稳'],'general-property','日常家宅事务与屋宅寿限分开；屋宅案例另列，不套到所有家庭问题。'],
 ['domain-04','屋舍',['居住吉利','居住不利','资财衰退','门户兴隆','住居安稳'],'property','新建、居住吉凶、朽坏是不同应事；长久寿限另按原数与事理。'],
 ['domain-05','婚姻',['婚可成但迟','婚不可成','婚难成或有失','婚易成或有得','婚姻吉利'],'marriage','总诀以吉凶年月为主，不强刻每盘成婚日；具体古案数期保持个案条件。'],
 ['domain-06','生产',['原典子方受制','原典母方受制','原典利子','原典利母','原典生育顺快'],'birth-reference','专条以用卦气数参八卦时序；保留古籍研究，不输出真实分娩或安危日期。'],
 ['domain-07','饮食',['饮食有阻','饮食无成','饮食难就','饮食丰足','饮食丰足'],'general','须保留今日、今夕等问题限定；今日动静案例不能因总数十三改成十三日后赴宴。'],
 ['domain-08','求谋',['谋可成但迟','求谋不成','多谋少遂','不谋而成','求谋称意'],'general','体克用的迟没有固定天数；参总诀的生扶阶段、克体阻期。'],
 ['domain-09','求名',['名可成但迟','名不可成','名不可就或有丧','名易成或有得','功名称意'],'fame','名成用生体气；无克体才可参体卦时序；在任受责另取克体气。'],
 ['domain-10','求财',['得财','无财可得','财有耗损','财有进益','财利顺遂'],'wealth','得财与破财各有专条；不成、无财、破财三个事件不能互换。'],
 ['domain-11','交易',['成交有财','交易不成','交易难成或有损','成交有财','易于成交'],'general','本章判成败与得失，具体取期参总诀；不把交易不成自动写成被骗或破财。'],
 ['domain-12','出行',['所行得意','出行不利','出行破耗','出行有所得','出行顺快'],'general','所行吉凶、出发时点、归来时点分开，原条没有一见生体便指定出发日期的公式。'],
 ['domain-13','行人',['行人归迟','行人不归','行人未归','行人归来','归期较近'],'traveler','生体日为归期，无生体比和则迟；不归不能变造为某日确定失联。'],
 ['domain-14','谒见',['可相见','不能相见','难见或见而无益','相见有得','欢然相见'],'general','章内无另立定日公式；参总诀并区分相见与见后得益。'],
 ['domain-15','失物',['可寻迟得','不可寻','物难见','物易寻','物不失'],'general','方位是寻物处所，不是日期；物难见不能扩大成某天永久丢失。'],
 ['domain-16','疾病',['原典病易安','原典病受制','原典迁延难好','原典逢生','原典疾病易安'],'health-reference','区分和平与危厄的原文取期；保留主卦异义及矛盾案例，禁止生死、疗效、停药日期输出。'],
 ['domain-17','官讼',['自己一方占优','对方占优','因讼耗失','因讼有得','调和解争'],'general','判输赢、损耗与调和是不同事件；不能把卦气直接当法院开庭或宣判日期。'],
 ['domain-18','坟墓',['葬之吉','葬之凶','原典主运退','原典主兴隆','吉地'],'burial','依原文只论吉凶，不硬填成功失败之日；后嗣荫益保留为文献说法。']
];
export const DOMAIN_TIMING_SPECS=rows.map(([id,label,events,mode,note])=>({
 id,label,sectionId:'mh-'+String(63+Number(id.slice(-2))-1).padStart(3,'0'),mode,note,
 eventLabels:Object.fromEntries(RELATION_KEYS.map((k,i)=>[k,events[i]])),
 directRuleIds:{'domain-01':['weather-relative'],'domain-05':['marriage-scope'],'domain-06':['birth-date'],
 'domain-09':['fame-date','fame-body-fallback','fame-office-risk'],'domain-10':['wealth-gain','wealth-loss','wealth-control-gain','wealth-drain-loss'],
 'domain-13':['traveler-return'],'domain-16':['health-periods'],'domain-18':['burial-scope']}[id]||[],
 generalRuleIds:['method-order','horizon','good-event','adverse-event','phase-pace'],
 clinicalReferenceOnly:['domain-06','domain-16'].includes(id),
 noAutomaticCompletionDate:['domain-01','domain-05','domain-06','domain-12','domain-13','domain-16','domain-18'].includes(id)
}));

export const TRIGRAM_PERIOD_SPECS=[
 ['乾','秋、九十月之交、戌亥年月日时、一四九年月日时。',['戌','亥'],['year','month','day','hour']],
 ['坤','辰戌丑未月、未申年月日时、八五十月日。',['未','申'],['year','month','day','hour']],
 ['震','春三月、卯年月日时、四三八月日。',['卯'],['year','month','day','hour']],
 ['巽','春夏之交、三五八之时月日、辰巳月日时。',['辰','巳'],['month','day','hour']],
 ['坎','冬十一月、子年月日时、一六月日。',['子'],['year','month','day','hour']],
 ['离','夏五月、午火年月日时、三二七日。',['午'],['year','month','day','hour']],
 ['艮','冬春之月、十二月丑寅年月日时、七五十数月日、土年月日时。',['丑','寅'],['year','month','day','hour']],
 ['兑','秋八月、酉年月日时、二四九月日。',['酉'],['year','month','day','hour']]
].map(([trigram,quote,branches,scales])=>({trigram,sectionId:'mh-052',quote,branches,scales,
 numericTermsStatus:'原数照录；未定义尾数、轮次及年月日时解释，不自动转成固定间隔'}));

export const TIMING_TEXT_ISSUES=[
 {id:'TIMING_QIAN_KUN_VARIANT',sectionIds:['mh-058','mh-052'],status:'unresolved',
  description:'先天后天论原载“或坤为戌、亥之日时”，与八卦时序坤未申、乾戌亥不合。疑为乾字，但对校本同载此文，不能无纸本证据改作定论。该短句不用于自动映射。'},
 {id:'PROPERTY_TOTALS_NOT_UNIFIED',sectionIds:['mh-108','mh-109'],status:'unresolved',
  description:'按起卦加数例保留的输入复加，田29、王27、韩44；屋宅断寿限却载29、22、31。不可把22、31当统一求和公式的验算通过值。'},
 {id:'HEALTH_MAIN_TRIGRAM_TERM',sectionIds:['mh-078'],status:'unresolved',
  description:'和平之日的“主卦”未在本句消歧；且后列天地否各爻示例有结构矛盾。原文保留，不能自动替换为唯一体卦或生体卦日期算法。'},
 {id:'DELAY_IS_NOT_EVENT_DATE',sectionIds:['mh-116'],status:'scoped',
  description:'乾阻一日、兑阻二日表示在相应前提下的阻滞时长，不能改成第1日或第2日一定失败。'},
 {id:'CASE_MIXED_MUTUAL_RELATIONS',sectionIds:['mh-040','mh-041'],status:'scoped',
  description:'少年案互震生离、坎克离；牛案互坤比和、震克坤。原文互变俱生或俱克不能当成所有节点同向的结构事实。'},
 {id:'VOID_RULES_ARE_USER_EXTENSION',sectionIds:[],status:'source-separated',
  description:'旬空、真空、填冲合属于用户另给扩展；本次三卷未检出旬空/空亡专条。保留为独立规则层，不能冒称全是古籍原文。'},
 {id:'CALENDAR_OCCURRENCE_NOT_FORECAST_SELECTION',sectionIds:['mh-122'],status:'software-boundary',
  description:'下一次某支日距离起卦几天只是历法候选；原书没有无条件选择下一轮或只选最近两天的规定。'}
];
