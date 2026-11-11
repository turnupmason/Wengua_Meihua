import {writeFile,mkdir,readFile} from 'node:fs/promises';
import {loadLibrary} from '../src/index.js';
import {questionTypeFor} from '../src/question-types.js';
const library=await loadLibrary();
// Editorial product questions, not additional quotations or independently surveyed rankings.
// [stable suffix, selectable question, exact answer focus, favourable event, adverse event]
const groups=[
 ['domain-01','天时·古籍查阅',[
  ['daily-weather','古籍怎样看一天的晴雨？','说明离、坎等卦与晴雨取象的原文，以及不分体用的专门口径。','晴雨取象说明','不作现实天气预报'],
  ['rain-clearing','古籍怎样看久雨转晴？','解释久雨逢艮取止的上下文，保留久雨这个前提。','久雨转晴原文','不指定现实停雨时刻'],
  ['sun-rain','古籍怎样看久晴转雨？','解释久晴与老阴等取象，不能把所有坤卦直接说成即将下雨。','久晴转雨原文','不指定现实降雨日期'],
  ['wind-thunder','古籍怎样看风雷？','说明震、巽与风雷及四时条件，不将秋冬与春夏混用。','风雷取象说明','不发布气象风险结论'],
  ['morning-evening','古籍怎样分朝暮晴雨？','解释离在艮上、离互艮宫的两条专门时序，不套一般生体日。','朝暮时序说明','不转换为现实逐小时预报']
 ]],
 ['domain-02','人事',[
  ['request-help','这次请人帮忙能得到帮助吗？','回答能否获得这一次帮助，写清帮助能否落实、何处受阻。','帮助落实','求助未成或受阻'],
  ['request-approval','这次向对方提出的请求能获准吗？','回答这一个请求是否获准，不扩大成对方始终支持或反对自己。','请求获准','请求受阻或未获准'],
  ['reach-agreement','这次沟通能达成共识吗？','回答能否就本次议题达成共识，不预测对方未说出口的想法。','共识达成','意见分歧或未达成共识'],
  ['ease-conflict','这次人际矛盾能缓和吗？','回答本次冲突能否缓和，区别暂时收住争执与彻底和解。','矛盾缓和','冲突反复或难解'],
  ['entrusted-task','这次托人办的事能办妥吗？','回答所托事项能否办妥，不将一句答应直接当作事情办完。','所托之事办妥','所托之事受阻或未成']
 ]],
 ['domain-03','家庭',[
  ['family-dispute','家里的这场争执能平息吗？','回答家庭争执能否平息，写出中途反复与最后能否安定。','争执平息','争执反复'],
  ['family-arrangement','这项家庭安排能落实吗？','回答这一项共同安排能否落定，不把其他家庭事情混进来。','家庭安排落实','安排悬置或难落实'],
  ['family-duties','家里的分工能商定并落实吗？','回答责任分担能否议定并执行，不替任何家人编写动机。','分工落实','分工不定或执行受阻'],
  ['family-spending','家里这段开销能稳定下来吗？','围绕家宅耗散与进益，回答眼前家庭开销能否稳定，不给金额预测。','家庭开销渐稳','家庭耗费延续'],
  ['family-stability','近期家中的事情能安定下来吗？','回答当前家中事务的安定与否，不借卦名断结构安全、盗窃或灾害。','家中事务安定','家事反复难安']
 ]],
 ['domain-04','房屋与居住',[
  ['rent-home','这处准备租的房子适合居住吗？','只论所选房屋的居住象意，不回答租约能否成交、房价或结构安全。','居住相合','居住不利或耗费'],
  ['buy-to-live','这处准备买来自住的房子适合居住吗？','回答自住安排的吉凶，不预测购房成交、升值或投资收益。','自住安排相合','自住安排不利或耗费'],
  ['renew-home','继续续租住在这里合适吗？','回答继续居住的象意，不冒充房东会同意续约的判断。','继续居住相合','继续居住不利或耗费'],
  ['move-home','搬到已经选好的新住处合适吗？','回答拟入住地点的居住吉凶，不将行程应期当作搬家成功日。','新居安排相合','新居安排不利或耗费'],
  ['stay-home','继续住在现在的住处合适吗？','回答现有居住安排是否相合，不自动转成买房或搬家的建议。','现有住居相合','现有住居不利或耗费']
 ]],
 ['domain-05','感情与婚姻',[
  ['start-relationship','我们能确定恋爱关系吗？','只回答关系能否正式建立；属于现代细分，需独立断法审核，不能输出婚事已成。','恋爱关系确定','关系未能确定'],
  ['reconcile','这段已经结束的感情能复合吗？','只回答是否复合；须独立审核，不能把婚可成直接替换成必复合，也不臆测对方内心。','关系复合','复合未成'],
  ['marry','这段感情能走到结婚吗？','回答能否成婚与迟速，按吉凶年月提示推进窗口，不指定必婚日。','婚事推进','婚事受阻'],
  ['marriage-negotiation','这次谈婚事能谈妥吗？','回答本次婚事协商能否谈妥，区别达成约定与已经举办婚礼。','婚事约定落实','婚事协商受阻'],
  ['married-life','这段婚姻能相处安稳吗？','回答婚姻相处的安定与耗失，不凭卦象指认出轨、欺骗或人格。','婚姻相处趋稳','婚姻相处受阻或耗失']
 ]],
 ['domain-06','生产·古籍查阅',[
  ['body-use','生产占的体和用怎样区分？','解释原典以体为母、用为生的术语，不作真实母婴安危判断。','原典体用说明','不输出母婴安危结论'],
  ['strength','生产占为什么强调旺衰？','解释体用俱宜乘旺的原意，不把旺衰等同于医学健康状态。','原典旺衰说明','不作临床风险分级'],
  ['relations','生产占的相生相克怎样理解？','整理原典生克语义，保留为历史阅读，不导出治疗或分娩方式建议。','原典生克说明','不提供临床决策'],
  ['use-qi','生产占为什么取用卦气数？','说明原文取用卦气数参八卦时序的路径，不套普通生体日期。','原典气数说明','不预测现实分娩日期'],
  ['timing','生产占的日辰原文怎样读？','展示取日辰条文和应期尺度边界，不输出胎儿性别或现实产期。','原典应期说明','不输出产期或胎儿性别']
 ]],
 ['domain-07','聚餐与宴饮',[
  ['gathering','这顿聚餐能约成吗？','回答本次聚餐能否约成，饮食体克用按有阻处理，不套求财得利。','聚餐约成','聚餐未成'],
  ['hosting','这次请客能办成吗？','回答这次由自己安排的请客能否办成及耗费，不捏造赴宴人物。','请客办成','请客受阻或未成'],
  ['invited-meal','受邀的这顿饭能吃成吗？','回答所问的受邀宴饮能否成席，不把今日饭局改为多日后的宴席。','受邀宴饮成席','受邀宴饮未成'],
  ['banquet','这场宴席能按计划办成吗？','回答已筹备宴席能否成席，保留所问范围，不预测食品卫生安全。','宴席办成','宴席受阻或未成'],
  ['hospitality','这次聚餐的招待是否丰足？','回答宴饮丰足或难就的象意，不预测具体菜品、金额或食品安全。','宴饮丰足','宴饮难就或不足']
 ]],
 ['domain-08','计划与办事',[
  ['start-plan','这个新计划能启动并做成吗？','回答新计划能否启动并成事，区分开始有进展与最终做成。','新计划成事','新计划受阻或未成'],
  ['advance-plan','正在做的这个计划能完成吗？','回答既有计划能否完成，结合中段生扶克制说明主要阻碍。','计划完成','计划停滞或未成'],
  ['restart-plan','已经停下的这件事能重新做起来吗？','回答停下事项能否重启并推进，不把一次恢复联系当作已做成。','事项重启并推进','重启受阻'],
  ['application','这次办事申请能获批吗？','回答这一项申请能否获批，不预测现实行政机关的确定决定日。','申请获批','申请受阻或未获批'],
  ['revised-plan','改用这个方案能把事情办成吗？','只判断当前选定方案，不同时替用户比较未提供的其他方案。','改用方案后成事','方案仍受阻或未成']
 ]],
 ['domain-09','工作与求名',[
  ['job-offer','这次求职能拿到录用吗？','回答能否获得本次职位，应期对应录用落实，不混为面试出发日。','职位录用落实','求职未成或受阻'],
  ['promotion','这次晋升能争取到吗？','回答本次晋升名分能否落实，不把在任受责条文套为必失业。','晋升落实','晋升受阻或未成'],
  ['transfer','这次申请转岗能成功吗？','回答申请的目标职位能否取得，不预测没有实际给定的职任方位。','目标岗位落实','转岗受阻或未成'],
  ['examination','这次考试能通过吗？','以求名功名作现代类推，回答考试所求能否取得，不预测分数或排名。','考试所求取得','考试所求未得'],
  ['qualification','这次资格申请能通过吗？','回答资格或评定名分能否取得，不将医疗资格等专业要求改写为卦象事实。','资格评定取得','资格申请受阻或未得']
 ]],
 ['domain-10','钱款与收益',[
  ['business-income','这次经营能得到收益吗？','围绕收益有无、付出与耗失写成完整故事，不与是否签约混为一件事。','经营收益取得','无收益或经营耗失'],
  ['receivable','客户欠的这笔尾款能收到吗？','回答已经应收的客户款能否收到，应期对应实际收款而非承诺付款。','客户尾款收到','尾款未收或催收受阻'],
  ['loan-return','借出去的这笔钱能收回来吗？','回答借出款能否收回，不凭受克直接指认借款人欺骗。','借出款收回','借出款未收回'],
  ['refund','申请的这笔退款能退回来吗？','回答款项能否退回，应期对应退款落实，不把申请提交当到账。','退款收到','退款受阻或未收到'],
  ['profit-share','约定的这笔分成能拿到吗？','回答已约定分成能否取得及可能的争议，不凭卦象编写金额比例。','约定分成取得','分成未得或分配争议']
 ]],
 ['domain-11','交易与合作',[
  ['sign-contract','这份合同能签下来吗？','回答合同能否达成并签订，不将未签成直接扩大为被骗或本金损失。','合同签订落实','签约受阻或未成'],
  ['purchase','这次购买能成交吗？','回答这一笔购买是否成交，不同时评价房屋居住吉凶或未来升值。','购买成交','购买未成'],
  ['sale','这件东西能卖出去吗？','回答已选标的能否出售成交，不预测未经输入的售价。','出售成交','出售未成'],
  ['customer-order','这笔客户订单能谈成吗？','回答客户订单是否达成，不把谈成订单当作后续尾款已经到账。','订单达成','订单未成'],
  ['business-partnership','这次合作项目能谈成吗？','回答合作是否达成，不编造合伙人动机，也不替代履约的独立判断。','合作达成','合作未成或谈判受阻']
 ]],
 ['domain-12','出行',[
  ['business-trip','这次出差是否顺利、有所得？','回答本人出差的总体得失，出行应事与出发日、归来日分别处理。','出差有得','出差受阻或耗费'],
  ['errand','为这件事跑一趟是否值得？','回答本人办事这一趟的得失，不把见面成功和全部事务办成混同。','此行办事有得','此行受阻或耗费'],
  ['travel','这次旅行安排是否顺利？','回答本人旅行安排的传统象意，不提供现实交通安全保证。','旅程安排顺遂','旅程安排受阻或耗费'],
  ['family-visit','这次回去探亲是否顺利？','回答本人探亲行程的得失，不替家人编写态度或健康情况。','探亲行程顺遂','探亲行程受阻或耗费'],
  ['return-trip','我这趟返程是否顺利？','只问本人返程，不套他人在外的行人归期条文来指定到达日。','本人返程顺遂','本人返程受阻或耗费']
 ]],
 ['domain-13','等人归来',[
  ['family-return','在外的家人近期能回来吗？','回答所问家人是否归来及迟速，不将临时改期等同永久不归。','家人归来','家人归迟或未归'],
  ['partner-return','在外的伴侣能按约回来吗？','回答伴侣实际归来，不由归迟推断感情变化或出轨。','伴侣归来','伴侣归迟或未归'],
  ['work-return','出差的人近期能回来吗？','回答对方出差后的归来，所取应期对应实际回程结束。','出差之人归来','出差之人归迟或未归'],
  ['long-absence','久未归来的人近期会回来吗？','回答所问范围内能否归来，不生成某日确定失联或遇险的结论。','久未归者归来','所问范围内仍未归'],
  ['promised-return','已经约定归期的人能回来吗？','回答约定中的归来能否落实，区分来信告知与人真正回来。','约定归来落实','归期延后或未落实']
 ]],
 ['domain-14','见面与拜访',[
  ['meet-leader','这次能见到领导并有所获吗？','分别回答能否见到与见后有无帮助，不把见面当作请求已经获批。','会面有得','难见或见而无益'],
  ['meet-client','这次能见到客户并谈得顺吗？','回答客户会面及交流得失，不越过交易条文保证合同成交。','客户会面有得','客户会面受阻或无益'],
  ['meet-friend','这次约朋友能见成吗？','回答约见能否落实及相见是否融洽，不扩写朋友的隐藏想法。','朋友相见','约见未成或不融洽'],
  ['meet-mentor','这次拜访前辈能得到帮助吗？','回答拜访能否成行与见后有无所得，礼数和准备写进过程。','拜访有得','难见或拜访无益'],
  ['meet-official','这次能见到办事负责人吗？','回答是否见到相关负责人及有无所得，不将见面日当作审批决定日。','负责人会面有得','会面受阻或无益']
 ]],
 ['domain-15','寻找失物',[
  ['keys','遗失的钥匙能找回来吗？','回答这串钥匙能否寻回，按变卦给查找线索，不冒充精确定位。','钥匙寻回','钥匙难寻或未寻回'],
  ['wallet','遗失的钱包能找回来吗？','回答钱包能否寻回，不由失物之象指认盗窃者或保证钱物完整。','钱包寻回','钱包难寻或未寻回'],
  ['documents','遗失的证件能找回来吗？','回答所问证件能否寻回，日期对应找到证件，不等同补办完成日。','证件寻回','证件难寻或未寻回'],
  ['phone','遗失的手机能找回来吗？','回答手机能否寻回，方位作查找线索，不充当设备定位或窃贼身份判断。','手机寻回','手机难寻或未寻回'],
  ['jewellery','遗失的首饰能找回来吗？','回答所问首饰能否寻回，不凭卦象给价值金额或断谁拿走。','首饰寻回','首饰难寻或未寻回']
 ]],
 ['domain-16','疾病·古籍查阅',[
  ['body-use','疾病占的体和用怎样区分？','解释原典的病人、病症与体用术语，不作现实诊断。','原典体用说明','不输出诊断'],
  ['strength','疾病章为什么强调体卦旺衰？','说明原典怎样区分受克而旺与受克而衰，不据此预测生死。','原典旺衰说明','不输出安危预测'],
  ['support-control','疾病章的逢生、受克怎样读？','解释象数关系在本章中的历史语义，不改写成疗效或停药建议。','原典生克说明','不提供治疗结论'],
  ['timing-terms','原文的和平之日、危厄之期是什么意思？','保留主卦一词的校核疑点，不伪定唯一公式或现实康复日期。','原典应期术语说明','不输出康复或危厄日期'],
  ['case-audit','疾病章的案例有哪些需要核对的地方？','区分原文叙述与结构复算，展示已标记问题，不把原断当现实证据。','原典案例校核说明','不移植历史病案结局']
 ]],
 ['domain-17','纠纷与争讼',[
  ['lawsuit','这场诉讼我方的形势如何？','回答原典意义上的我方得助、受制或耗失，不预测法院确定裁判和日期。','争讼形势有利','争讼形势受制或耗失'],
  ['settlement','这次纠纷能协商和解吗？','回答和解能否推进；比和主和与诉讼胜负分别表述，不混为同一结果。','纠纷和解','和解受阻'],
  ['arbitration','这次仲裁我方的形势如何？','以争讼作现代类推，回答双方相对形势，不提供法律胜率或裁决保证。','仲裁中我方得助','仲裁中我方受制或耗失'],
  ['mediation','这次调解能达成一致吗？','围绕主和之义判断调解，不把一方占优机械改为必达成协议。','调解达成一致','调解未达成一致'],
  ['dispute-end','这场争议能结束吗？','回答争议能否收束及所需耗费，不将暂时停争直接当作法律关系终结。','争议收束','争议延续或耗费']
 ]],
 ['domain-18','安葬选址',[
  ['cemetery-site','这处拟选的墓地按古籍如何论吉凶？','仅论拟选墓地的传统吉凶，不预测后人财富、寿命或现实地质安全。','选址传统吉象','选址传统不利之象'],
  ['burial-site','此次安葬拟定的地点按古籍是否合宜？','只论地点吉凶，不指定安葬成功日，也不将选址等同工程勘察。','安葬地点相合','安葬地点不利'],
  ['reburial-site','迁葬拟选的新地点按古籍是否合宜？','只看已选新地点的吉凶，迁葬程序与日期不由本条自动决定。','新选地点相合','新选地点不利'],
  ['family-site','为家人拟选的墓地按古籍是否合宜？','回答这一处墓地的传统吉凶，不由家人身份生成额外命运推断。','拟选墓地相合','拟选墓地不利'],
  ['joint-site','拟定的合葬地点按古籍是否合宜？','仅以已选地点作传统吉凶参照，不增设来源未给的合葬算法。','合葬地点相合','合葬地点不利']
 ]]
];
const referenceTexts={
 'domain-01-daily-weather':['天时章开头说“凡占天时，不分体用，全观诸卦，详推五行”。这里要合看本、互、变及四时，离取晴、坎取雨，另有乾、坤、震、巽、艮、兑的专门取象。它并不沿用人事中体为自己、用为事情的同一套总断。','这些内容供阅读古籍的象数方法；本资料包尚未建立完整现实晴雨预测规则。'],
 'domain-01-rain-clearing':['“久雨不晴，逢艮必止”以久雨为前提。艮取止，原文同时用土克水解释雨止的取象。读这一条时，要保留久雨、时令及诸卦同看的条件，不能见艮便断任何时候都放晴。'],
 'domain-01-sun-rain':['原文以坤为老阴、乾为老阳，配合久晴与久雨讨论变化。问久晴转雨，应先保留“久晴”的背景，再合看诸卦与四时。这里没有一个看到某卦便固定几天后下雨的通用天数。'],
 'domain-01-wind-thunder':['震取雷，巽取风。原文又分别讨论春夏雷轰、秋冬震多无制以及巽来相佐的情况。风雷取象带有四时与组合前提，不能把两卦的名称直接当作现实气象预警。'],
 'domain-01-morning-evening':['原文并列“离在艮上，暮雨朝晴”和“离互艮宫，暮晴朝雨”。两条结构不同，朝暮次序也不同，应照原句分别阅读。这里的朝暮是天时专门时序，不是一般人事占中生体日的替换写法。'],
 'domain-06-body-use':['生产章说“以体为母，用为生”。这说明本章采用的历史角色映射，不能把普通人事的角色说明原样套入。阅读时先认清本卦动爻所在一侧为用，再看原文怎样讨论体用关系；这些术语不构成真实母婴状况的判断。'],
 'domain-06-strength':['原文强调“体用俱宜乘旺，不宜乘衰”，说明本章论断很重视体用各自的时令状态。旺衰是书中象数条件，不是医学检查结果。现有规则也不把单一失令直接等同于衰极或真空。'],
 'domain-06-relations':['生产章对体克用、用克体、体生用、用生体分别赋予本章语义，不能与求财、饮食等门类互换。这里保留的是传统文本如何组织判断，不据这些生克关系选择分娩方式、药物或治疗。'],
 'domain-06-use-qi':['“如欲决其日辰，则以用卦之气数参决之”，后文又要求参八卦时序。它明确指向用卦气数，并未给出所有生产占统一取生体日的规则。气数与时序中的未定解释应保留，不擅自化成现实产期。'],
 'domain-06-timing':['本章取日辰须参用卦气数与八卦时序，日期单位和解释仍要符合原文前提。查表找到某个地支日，只证明该日的历法对应，不证明真实分娩发生在那一天。这里只作条文查阅，不输出产期或胎儿性别。'],
 'domain-16-body-use':['疾病章以体为病人、用为病症，并继续讨论体用生克。这里是原典的符号角色，不能从一个经卦反推出现实疾病名称。现有资料保留原句与解释，医学诊断不由这套角色映射产生。'],
 'domain-16-strength':['原文区分体旺受克与体衰受克，也要求查看生体之卦。阅读重点是同一生克关系仍须带入旺衰条件，不能删掉这些条件只留下吉凶字样。这些历史表述不用于现实生死、安危或疗效预测。'],
 'domain-16-support-control':['逢生、受克在本章中是五行关系及其时令条件。原文的古代医药、鬼神等解释作为历史资料保留，不据此给出现实病因、药性选择或停药决定。其他门类的得财、成婚等结果也不能混进本章。'],
 'domain-16-timing-terms':['原文写“若究和平之日，主卦决之。若详危厄之期，克体之卦定之”。其中“主卦”的指向在现有条文中仍有校核疑点，资料保留原字，没有擅改为唯一生体公式。这些术语不转成现实康复或危险日期。'],
 'domain-16-case-audit':['疾病章后段以乾上坤下的不同动爻举例。部分“俱生”“俱克”等概括与按爻位复算的结构存在核对问题，原文与问题记录应分别保留。不能为了写出确定结局，先改卦形再把病案原断移植给新读者。']
};
let existingIndex={files:[],writtenBaseStoryCount:0};
try{existingIndex=JSON.parse(await readFile(new URL('../data/question-stories/index.json',import.meta.url),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
const writtenCounts=new Map(existingIndex.files.map(f=>[f.questionId,f.baseStoryCount||0]));
const domains=groups.map(([domainId,label,rows])=>{
 const original=library.listDomains().find(d=>d.id===domainId);if(!original||rows.length!==5)throw new Error('Question domain coverage mismatch');
 return {id:domainId,label,sourceSectionId:original.sectionId,mode:original.mode==='reference-only'?'reference':'narrative',items:rows.map(([suffix,question,answerBrief,positiveEvent,adverseEvent],index)=>{
  const id=domainId+'-'+suffix,mode=original.mode==='reference-only'?'reference':'narrative';
  return {id,domainId,question_type:questionTypeFor({id,domainId,mode}),position:index+1,question,answerBrief,positiveEvent,adverseEvent,mode,
   interpretationReview:mode==='reference'?'historical-reference-only':'pending-nine-check-review',
   timingPolicy:mode==='reference'?'reference-only':domainId==='domain-05'?'quality-years-months':domainId==='domain-18'?'no-completion-date':domainId==='domain-12'?'journey-event-not-departure-date':'event-specific',
   sourceIds:[original.sectionId,...(domainId==='domain-05'||domainId==='domain-13'||domainId==='domain-18'?['mh-122']:[])],
   sourceApplication:mode==='reference'?'editorial-reference-explanation':'editorial-specific-question;not-a-new-classical-rule',
   ruleReview:domainId==='domain-05'&&['start-relationship','reconcile'].includes(suffix)||domainId==='domain-17'&&['settlement','mediation','dispute-end'].includes(suffix)?'specific-event-rules-required':'domain-rule-with-specific-event-review',
   contentStatus:mode==='reference'?'reference-written':writtenCounts.get(id)===1920?'base-written':'full-story-pending',
   ...(mode==='reference'?{referenceParagraphs:referenceTexts[id]}:{})};
 })};
});
const items=domains.flatMap(d=>d.items),ids=new Set(items.map(i=>i.id));
if(domains.length!==18||items.length!==90||ids.size!==90||items.some(i=>i.mode==='reference'&&!i.referenceParagraphs?.length))throw new Error('Question catalog incomplete');
const catalog={schemaVersion:'1.0.0',catalogVersion:'1.0.0',contentVersion:library.contentVersion,
 selectionPolicy:{input:'domain-and-fixed-question-only',freeText:false,aiClassification:false,questionsPerDomain:5,multiQuestion:false,unknownQuestion:'reject',missingStory:'pending-no-domain-fallback'},
 editorialBasis:'Curated common-use question choices; not measured demand rankings. Modern wording is an editorial application, not additional classical quotations.',
 count:items.length,domainCount:domains.length,narrativeCount:items.filter(i=>i.mode==='narrative').length,referenceCount:items.filter(i=>i.mode==='reference').length,domains};
await writeFile(new URL('../data/question-items.json',import.meta.url),JSON.stringify(catalog,null,2)+'\n');
await mkdir(new URL('../data/question-stories/',import.meta.url),{recursive:true});
const indexPath=new URL('../data/question-stories/index.json',import.meta.url);
try{await writeFile(indexPath,JSON.stringify({schemaVersion:'1.0.0',catalogVersion:catalog.catalogVersion,contentVersion:library.contentVersion,
 baseChartsPerQuestion:1920,narrativeQuestionCount:catalog.narrativeCount,referenceQuestionCount:catalog.referenceCount,
 minimumBaseStoryCount:catalog.narrativeCount*1920,writtenBaseStoryCount:0,files:[],scope:'item-specific-complete-stories;void-and-event-context-require-reviewed-coverage'},null,2)+'\n',{flag:'wx'});}catch(e){if(e.code!=='EEXIST')throw e;}
let doc='# 每个领域五个固定事项\n\n每项新增 question_type：按所问的结果选择占法，不按大领域套稿。同一类型的手机、钱包可以共享失物找回规则；不得扩展到失联人员，行人归期也不等于定位失联者。是否喜欢自己不以成婚规则代答。现代细分仍须单独审核适用性。\n\n正式占问只用领域与事项选择，无自由输入或AI分类。以下是编写的常见问法，不是用户搜索量统计。\n\n共18领域、90项：75项占问，15项古籍查阅。每项有固定ID、回答范围、正反应事与取期政策；完整正文覆盖单独计数。\n\n';
for(const domain of domains){doc+='## '+domain.label+'\n\n';for(const item of domain.items)doc+='- '+item.question+' `'+item.id+'`；`question_type: '+item.question_type+'`\n  '+item.answerBrief+'\n';doc+='\n';}
doc+='## 正文与调用状态\n\n原1,920篇是384盘×5月令的通用基础量。75个占问事项若各自完整覆盖，对应144,000个事项基础匹配槽位；经审核的同类型内容可显式共享引用，不等于必须写144,000篇不同文章；旬空与应事条件另行核对。15项古籍查阅已有专门说明，不乘盘数。目前事项基础全文完成'+existingIndex.writtenBaseStoryCount+'篇，具体批次与空亡全文数量以 `data/question-stories/index.json` 为准。不能把旧领域通用输出冒充事项成稿。\n\n使用 `createQuestionRepository` 按稳定ID调用。不存在的事项、领域不匹配及自由输入报错；尚缺稿件返回 `pending-authoring`，不回退为其他事项。完整稿必须同时匹配事项、盘、月令及起卦上下文。base-written仅指已生成，不代表已通过断法审核。\n';
doc+='\n已生成不等于已通过断法审核。现有客户尾款稿返回 pending-review；editorialPreview 仅供内部审阅，永不把未通过稿标为 ready。九项要求见 INTERPRETATION_AUDIT_V2.md。\n';
await writeFile(new URL('../docs/QUESTION_CHOICES.md',import.meta.url),doc);
console.log(`Question choices: ${domains.length} domains × 5 = ${items.length}; ${catalog.narrativeCount} narrative scopes, ${catalog.referenceCount} written references.`);
