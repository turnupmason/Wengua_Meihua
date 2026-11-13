# 古籍门类兼容问法（内部）

现行产品目录及问项归属见 PRODUCT_CATEGORIES_V1.md。以下18门90问仅保留作来源和内部兼容接口，不再作为产品一级菜单。

每项新增 question_type：按所问的结果选择占法，不按大领域套稿。同一类型的手机、钱包可以共享失物找回规则；不得扩展到失联人员，行人归期也不等于定位失联者。是否喜欢自己不以成婚规则代答。现代细分仍须单独审核适用性。

正式占问只用领域与事项选择，无自由输入或AI分类。以下是编写的常见问法，不是用户搜索量统计。

共18领域、90项：75项占问，15项古籍查阅。每项有固定ID、回答范围、正反应事与取期政策；完整正文覆盖单独计数。

## 天时·古籍查阅

- 古籍怎样看一天的晴雨？ `domain-01-daily-weather`；`question_type: reference_domain_01_daily_weather`
  说明离、坎等卦与晴雨取象的原文，以及不分体用的专门口径。
- 古籍怎样看久雨转晴？ `domain-01-rain-clearing`；`question_type: reference_domain_01_rain_clearing`
  解释久雨逢艮取止的上下文，保留久雨这个前提。
- 古籍怎样看久晴转雨？ `domain-01-sun-rain`；`question_type: reference_domain_01_sun_rain`
  解释久晴与老阴等取象，不能把所有坤卦直接说成即将下雨。
- 古籍怎样看风雷？ `domain-01-wind-thunder`；`question_type: reference_domain_01_wind_thunder`
  说明震、巽与风雷及四时条件，不将秋冬与春夏混用。
- 古籍怎样分朝暮晴雨？ `domain-01-morning-evening`；`question_type: reference_domain_01_morning_evening`
  解释离在艮上、离互艮宫的两条专门时序，不套一般生体日。

## 人事

- 这次请人帮忙能得到帮助吗？ `domain-02-request-help`；`question_type: request_help`
  回答能否获得这一次帮助，写清帮助能否落实、何处受阻。
- 这次向对方提出的请求能获准吗？ `domain-02-request-approval`；`question_type: request_approval`
  回答这一个请求是否获准，不扩大成对方始终支持或反对自己。
- 这次沟通能达成共识吗？ `domain-02-reach-agreement`；`question_type: reach_agreement`
  回答能否就本次议题达成共识，不预测对方未说出口的想法。
- 这次人际矛盾能缓和吗？ `domain-02-ease-conflict`；`question_type: ease_conflict`
  回答本次冲突能否缓和，区别暂时收住争执与彻底和解。
- 这次托人办的事能办妥吗？ `domain-02-entrusted-task`；`question_type: entrusted_task`
  回答所托事项能否办妥，不将一句答应直接当作事情办完。

## 家庭

- 家里的这场争执能平息吗？ `domain-03-family-dispute`；`question_type: family_dispute`
  回答家庭争执能否平息，写出中途反复与最后能否安定。
- 这项家庭安排能落实吗？ `domain-03-family-arrangement`；`question_type: family_arrangement`
  回答这一项共同安排能否落定，不把其他家庭事情混进来。
- 家里的分工能商定并落实吗？ `domain-03-family-duties`；`question_type: family_duties`
  回答责任分担能否议定并执行，不替任何家人编写动机。
- 家里这段开销能稳定下来吗？ `domain-03-family-spending`；`question_type: family_spending`
  围绕家宅耗散与进益，回答眼前家庭开销能否稳定，不给金额预测。
- 近期家中的事情能安定下来吗？ `domain-03-family-stability`；`question_type: family_stability`
  回答当前家中事务的安定与否，不借卦名断结构安全、盗窃或灾害。

## 房屋与居住

- 这处准备租的房子适合居住吗？ `domain-04-rent-home`；`question_type: dwelling_compatibility`
  只论所选房屋的居住象意，不回答租约能否成交、房价或结构安全。
- 这处准备买来自住的房子适合居住吗？ `domain-04-buy-to-live`；`question_type: dwelling_compatibility`
  回答自住安排的吉凶，不预测购房成交、升值或投资收益。
- 继续续租住在这里合适吗？ `domain-04-renew-home`；`question_type: dwelling_compatibility`
  回答继续居住的象意，不冒充房东会同意续约的判断。
- 搬到已经选好的新住处合适吗？ `domain-04-move-home`；`question_type: dwelling_compatibility`
  回答拟入住地点的居住吉凶，不将行程应期当作搬家成功日。
- 继续住在现在的住处合适吗？ `domain-04-stay-home`；`question_type: dwelling_compatibility`
  回答现有居住安排是否相合，不自动转成买房或搬家的建议。

## 感情与婚姻

- 我们能确定恋爱关系吗？ `domain-05-start-relationship`；`question_type: relationship_establishment`
  只回答关系能否正式建立；属于现代细分，需独立断法审核，不能输出婚事已成。
- 这段已经结束的感情能复合吗？ `domain-05-reconcile`；`question_type: relationship_reconciliation`
  只回答是否复合；须独立审核，不能把婚可成直接替换成必复合，也不臆测对方内心。
- 这段感情能走到结婚吗？ `domain-05-marry`；`question_type: marriage_completion`
  回答能否成婚与迟速，按吉凶年月提示推进窗口，不指定必婚日。
- 这次谈婚事能谈妥吗？ `domain-05-marriage-negotiation`；`question_type: marriage_negotiation`
  回答本次婚事协商能否谈妥，区别达成约定与已经举办婚礼。
- 这段婚姻能相处安稳吗？ `domain-05-married-life`；`question_type: marriage_stability`
  回答婚姻相处的安定与耗失，不凭卦象指认出轨、欺骗或人格。

## 生产·古籍查阅

- 生产占的体和用怎样区分？ `domain-06-body-use`；`question_type: reference_domain_06_body_use`
  解释原典以体为母、用为生的术语，不作真实母婴安危判断。
- 生产占为什么强调旺衰？ `domain-06-strength`；`question_type: reference_domain_06_strength`
  解释体用俱宜乘旺的原意，不把旺衰等同于医学健康状态。
- 生产占的相生相克怎样理解？ `domain-06-relations`；`question_type: reference_domain_06_relations`
  整理原典生克语义，保留为历史阅读，不导出治疗或分娩方式建议。
- 生产占为什么取用卦气数？ `domain-06-use-qi`；`question_type: reference_domain_06_use_qi`
  说明原文取用卦气数参八卦时序的路径，不套普通生体日期。
- 生产占的日辰原文怎样读？ `domain-06-timing`；`question_type: reference_domain_06_timing`
  展示取日辰条文和应期尺度边界，不输出胎儿性别或现实产期。

## 聚餐与宴饮

- 这顿聚餐能约成吗？ `domain-07-gathering`；`question_type: gathering`
  回答本次聚餐能否约成，饮食体克用按有阻处理，不套求财得利。
- 这次请客能办成吗？ `domain-07-hosting`；`question_type: hosting`
  回答这次由自己安排的请客能否办成及耗费，不捏造赴宴人物。
- 受邀的这顿饭能吃成吗？ `domain-07-invited-meal`；`question_type: invited_meal`
  回答所问的受邀宴饮能否成席，不把今日饭局改为多日后的宴席。
- 这场宴席能按计划办成吗？ `domain-07-banquet`；`question_type: banquet`
  回答已筹备宴席能否成席，保留所问范围，不预测食品卫生安全。
- 这次聚餐的招待是否丰足？ `domain-07-hospitality`；`question_type: hospitality`
  回答宴饮丰足或难就的象意，不预测具体菜品、金额或食品安全。

## 计划与办事

- 这个新计划能启动并做成吗？ `domain-08-start-plan`；`question_type: start_plan`
  回答新计划能否启动并成事，区分开始有进展与最终做成。
- 正在做的这个计划能完成吗？ `domain-08-advance-plan`；`question_type: advance_plan`
  回答既有计划能否完成，结合中段生扶克制说明主要阻碍。
- 已经停下的这件事能重新做起来吗？ `domain-08-restart-plan`；`question_type: restart_plan`
  回答停下事项能否重启并推进，不把一次恢复联系当作已做成。
- 这次办事申请能获批吗？ `domain-08-application`；`question_type: application`
  回答这一项申请能否获批，不预测现实行政机关的确定决定日。
- 改用这个方案能把事情办成吗？ `domain-08-revised-plan`；`question_type: revised_plan`
  只判断当前选定方案，不同时替用户比较未提供的其他方案。

## 工作与求名

- 这次求职能拿到录用吗？ `domain-09-job-offer`；`question_type: job_application`
  回答能否获得本次职位，应期对应录用落实，不混为面试出发日。
- 这次晋升能争取到吗？ `domain-09-promotion`；`question_type: promotion`
  回答本次晋升名分能否落实，不把在任受责条文套为必失业。
- 这次申请转岗能成功吗？ `domain-09-transfer`；`question_type: job_transfer`
  回答申请的目标职位能否取得，不预测没有实际给定的职任方位。
- 这次考试能通过吗？ `domain-09-examination`；`question_type: examination_result`
  以求名功名作现代类推，回答考试所求能否取得，不预测分数或排名。
- 这次资格申请能通过吗？ `domain-09-qualification`；`question_type: qualification_result`
  回答资格或评定名分能否取得，不将医疗资格等专业要求改写为卦象事实。

## 钱款与收益

- 这次经营能得到收益吗？ `domain-10-business-income`；`question_type: business_income`
  围绕收益有无、付出与耗失写成完整故事，不与是否签约混为一件事。
- 客户欠的这笔尾款能收到吗？ `domain-10-receivable`；`question_type: receivable_collection`
  回答已经应收的客户款能否收到，应期对应实际收款而非承诺付款。
- 借出去的这笔钱能收回来吗？ `domain-10-loan-return`；`question_type: loan_repayment`
  回答借出款能否收回，不凭受克直接指认借款人欺骗。
- 申请的这笔退款能退回来吗？ `domain-10-refund`；`question_type: refund_receipt`
  回答款项能否退回，应期对应退款落实，不把申请提交当到账。
- 约定的这笔分成能拿到吗？ `domain-10-profit-share`；`question_type: profit_distribution`
  回答已约定分成能否取得及可能的争议，不凭卦象编写金额比例。

## 交易与合作

- 这份合同能签下来吗？ `domain-11-sign-contract`；`question_type: sign_contract`
  回答合同能否达成并签订，不将未签成直接扩大为被骗或本金损失。
- 这次购买能成交吗？ `domain-11-purchase`；`question_type: purchase`
  回答这一笔购买是否成交，不同时评价房屋居住吉凶或未来升值。
- 这件东西能卖出去吗？ `domain-11-sale`；`question_type: sale`
  回答已选标的能否出售成交，不预测未经输入的售价。
- 这笔客户订单能谈成吗？ `domain-11-customer-order`；`question_type: customer_order`
  回答客户订单是否达成，不把谈成订单当作后续尾款已经到账。
- 这次合作项目能谈成吗？ `domain-11-business-partnership`；`question_type: business_partnership`
  回答合作是否达成，不编造合伙人动机，也不替代履约的独立判断。

## 出行

- 这次出差是否顺利、有所得？ `domain-12-business-trip`；`question_type: own_journey_completion`
  回答本人出差的总体得失，出行应事与出发日、归来日分别处理。
- 为这件事跑一趟是否值得？ `domain-12-errand`；`question_type: own_journey_completion`
  回答本人办事这一趟的得失，不把见面成功和全部事务办成混同。
- 这次旅行安排是否顺利？ `domain-12-travel`；`question_type: own_journey_completion`
  回答本人旅行安排的传统象意，不提供现实交通安全保证。
- 这次回去探亲是否顺利？ `domain-12-family-visit`；`question_type: own_journey_completion`
  回答本人探亲行程的得失，不替家人编写态度或健康情况。
- 我这趟返程是否顺利？ `domain-12-return-trip`；`question_type: own_journey_completion`
  只问本人返程，不套他人在外的行人归期条文来指定到达日。

## 等人归来

- 在外的家人近期能回来吗？ `domain-13-family-return`；`question_type: traveller_return`
  回答所问家人是否归来及迟速，不将临时改期等同永久不归。
- 在外的伴侣能按约回来吗？ `domain-13-partner-return`；`question_type: traveller_return`
  回答伴侣实际归来，不由归迟推断感情变化或出轨。
- 出差的人近期能回来吗？ `domain-13-work-return`；`question_type: traveller_return`
  回答对方出差后的归来，所取应期对应实际回程结束。
- 久未归来的人近期会回来吗？ `domain-13-long-absence`；`question_type: traveller_return`
  回答所问范围内能否归来，不生成某日确定失联或遇险的结论。
- 已经约定归期的人能回来吗？ `domain-13-promised-return`；`question_type: traveller_return`
  回答约定中的归来能否落实，区分来信告知与人真正回来。

## 见面与拜访

- 这次能见到领导并有所获吗？ `domain-14-meet-leader`；`question_type: meet_leader`
  分别回答能否见到与见后有无帮助，不把见面当作请求已经获批。
- 这次能见到客户并谈得顺吗？ `domain-14-meet-client`；`question_type: meet_client`
  回答客户会面及交流得失，不越过交易条文保证合同成交。
- 这次约朋友能见成吗？ `domain-14-meet-friend`；`question_type: meet_friend`
  回答约见能否落实及相见是否融洽，不扩写朋友的隐藏想法。
- 这次拜访前辈能得到帮助吗？ `domain-14-meet-mentor`；`question_type: meet_mentor`
  回答拜访能否成行与见后有无所得，礼数和准备写进过程。
- 这次能见到办事负责人吗？ `domain-14-meet-official`；`question_type: meet_official`
  回答是否见到相关负责人及有无所得，不将见面日当作审批决定日。

## 寻找失物

- 遗失的钥匙能找回来吗？ `domain-15-keys`；`question_type: lost_object_recovery`
  回答这串钥匙能否寻回，按变卦给查找线索，不冒充精确定位。
- 遗失的钱包能找回来吗？ `domain-15-wallet`；`question_type: lost_object_recovery`
  回答钱包能否寻回，不由失物之象指认盗窃者或保证钱物完整。
- 遗失的证件能找回来吗？ `domain-15-documents`；`question_type: lost_object_recovery`
  回答所问证件能否寻回，日期对应找到证件，不等同补办完成日。
- 遗失的手机能找回来吗？ `domain-15-phone`；`question_type: lost_object_recovery`
  回答手机能否寻回，方位作查找线索，不充当设备定位或窃贼身份判断。
- 遗失的首饰能找回来吗？ `domain-15-jewellery`；`question_type: lost_object_recovery`
  回答所问首饰能否寻回，不凭卦象给价值金额或断谁拿走。

## 疾病·古籍查阅

- 疾病占的体和用怎样区分？ `domain-16-body-use`；`question_type: reference_domain_16_body_use`
  解释原典的病人、病症与体用术语，不作现实诊断。
- 疾病章为什么强调体卦旺衰？ `domain-16-strength`；`question_type: reference_domain_16_strength`
  说明原典怎样区分受克而旺与受克而衰，不据此预测生死。
- 疾病章的逢生、受克怎样读？ `domain-16-support-control`；`question_type: reference_domain_16_support_control`
  解释象数关系在本章中的历史语义，不改写成疗效或停药建议。
- 原文的和平之日、危厄之期是什么意思？ `domain-16-timing-terms`；`question_type: reference_domain_16_timing_terms`
  保留主卦一词的校核疑点，不伪定唯一公式或现实康复日期。
- 疾病章的案例有哪些需要核对的地方？ `domain-16-case-audit`；`question_type: reference_domain_16_case_audit`
  区分原文叙述与结构复算，展示已标记问题，不把原断当现实证据。

## 纠纷与争讼

- 这场诉讼我方的形势如何？ `domain-17-lawsuit`；`question_type: lawsuit`
  回答原典意义上的我方得助、受制或耗失，不预测法院确定裁判和日期。
- 这次纠纷能协商和解吗？ `domain-17-settlement`；`question_type: settlement`
  回答和解能否推进；比和主和与诉讼胜负分别表述，不混为同一结果。
- 这次仲裁我方的形势如何？ `domain-17-arbitration`；`question_type: arbitration`
  以争讼作现代类推，回答双方相对形势，不提供法律胜率或裁决保证。
- 这次调解能达成一致吗？ `domain-17-mediation`；`question_type: mediation`
  围绕主和之义判断调解，不把一方占优机械改为必达成协议。
- 这场争议能结束吗？ `domain-17-dispute-end`；`question_type: dispute_end`
  回答争议能否收束及所需耗费，不将暂时停争直接当作法律关系终结。

## 安葬选址

- 这处拟选的墓地按古籍如何论吉凶？ `domain-18-cemetery-site`；`question_type: burial_site_compatibility`
  仅论拟选墓地的传统吉凶，不预测后人财富、寿命或现实地质安全。
- 此次安葬拟定的地点按古籍是否合宜？ `domain-18-burial-site`；`question_type: burial_site_compatibility`
  只论地点吉凶，不指定安葬成功日，也不将选址等同工程勘察。
- 迁葬拟选的新地点按古籍是否合宜？ `domain-18-reburial-site`；`question_type: burial_site_compatibility`
  只看已选新地点的吉凶，迁葬程序与日期不由本条自动决定。
- 为家人拟选的墓地按古籍是否合宜？ `domain-18-family-site`；`question_type: burial_site_compatibility`
  回答这一处墓地的传统吉凶，不由家人身份生成额外命运推断。
- 拟定的合葬地点按古籍是否合宜？ `domain-18-joint-site`；`question_type: burial_site_compatibility`
  仅以已选地点作传统吉凶参照，不增设来源未给的合葬算法。

## 正文与调用状态

原1,920篇是384盘×5月令的通用基础量。75个占问事项若各自完整覆盖，对应144,000个事项基础匹配槽位；经审核的同类型内容可显式共享引用，不等于必须写144,000篇不同文章；旬空与应事条件另行核对。15项古籍查阅已有专门说明，不乘盘数。目前事项基础全文完成1920篇，具体批次与空亡全文数量以 `data/question-stories/index.json` 为准。不能把旧领域通用输出冒充事项成稿。

使用 `createQuestionRepository` 按稳定ID调用。不存在的事项、领域不匹配及自由输入报错；尚缺稿件返回 `pending-authoring`，不回退为其他事项。完整稿必须同时匹配事项、盘、月令及起卦上下文。base-written仅指已生成，不代表已通过断法审核。

已生成不等于已通过断法审核。现有客户尾款稿返回 pending-review；editorialPreview 仅供内部审阅，永不把未通过稿标为 ready。九项要求见 INTERPRETATION_AUDIT_V2.md。
