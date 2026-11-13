// Product navigation selected by the user. Question ids are stable within their domain;
// the navigation subcategory may change independently.
const q=(id,question,question_type,sourceDomainIds,options={})=>({id,question,question_type,sourceDomainIds,mode:'narrative',...options});
const s=(id,label,examples,questions)=>({id,label,exampleQuestions:examples.split('|'),questions});
const o=(scope,options={})=>({answerScope:scope,...options});
const lostContext={objectKind:{label:'物品类型',options:['keys','wallet','phone','documents','jewellery','other'],required:true}};
const jobPlan={label:'离职后的安排',options:['new-job-confirmed','other-plan-confirmed'],required:true};
// 2026-11-13 (product owner): 跳槽去留 asks nothing finer, like every other entry; the manuscripts speak of
// 「你最看重的那一项」 without depending on which. Kept optional for older records that carry them.
const jobPriority={label:'这次最看重什么',options:['income','stability','development','workload'],required:false};
const comparisonTerms={label:'两份工作的条件是否清楚',options:['both-known'],required:false};
const lostBindings={contextKey:'objectKind',values:{keys:'domain-15-keys',wallet:'domain-15-wallet',phone:'domain-15-phone',documents:'domain-15-documents',jewellery:'domain-15-jewellery'}};
const health=(id,leaf,question,paragraph)=>q(id,question,'health_symbolic_'+leaf,['domain-16'],{mode:'reference',
 answerScope:'只解释传统术语与象意；不诊断、不定位病灶、不评估病情严重程度、不预测疗效或指导医疗决策。',
 referenceParagraphs:[paragraph],
 practicalAdvice:['如有实际不适，请向医疗专业人员求助；治疗、手术和用药问题与医生确认。']});

export const PRODUCT_TAXONOMY=[
 {id:'career',number:'01',label:'事业工作',subcategories:[
  s('interview','求职录用','面试能通过吗？|这次求职能拿到录用吗？',[
   q('interview.interview-pass','这次面试能通过吗？','interview_pass',['domain-09'],o('只回答这一轮面试是否通过，不把通过面试等同于获得最终录用。',{manuscriptIndexPath:'data/authored-readings/interview-pass/index.json'})),
   q('interview.job-offer','这次求职能拿到录用吗？','job_application',['domain-09'],o('回答本次录用是否落实，不只回答面试表现。',{legacyQuestionId:'domain-09-job-offer'}))]),
  s('promotion-pay','晋升加薪','这次能晋升并随岗加薪吗？',[
   q('promotion-pay.promotion','这次能晋升并随岗加薪吗？','promotion',['domain-09','domain-10'],o('回答本次晋升及随岗加薪。晋升落实时一并看随岗薪资幅度。',{manuscriptIndexPath:'data/authored-readings/promotion-pay/index.json'})),
   q('promotion-pay.pay-rise','今年能获得加薪吗？','salary_increase',['domain-09','domain-10'],o('回答所选年度薪资调整，不把升职、奖金和加薪互相替代。',{archived:true,contextFields:{targetYear:{label:'所问年份',type:'year',required:true}}}))]),
  s('job-change','跳槽去留','现职和这份新工作怎么选，现在适合辞职吗？',[
   q('job-change.decision','现职和这份新工作怎么选，现在适合辞职吗？','job_change_decision',['domain-08','domain-09'],o('按最看重的一项比较现职与这份新工作，并判断现在宜辞职、宜先准备，还是宜继续留任。',{requiresComparisonMethod:true,contextFields:{jobPriority,comparisonTerms},manuscriptIndexPath:'data/authored-readings/job-change/index.json'})),
   q('job-change.resign','现在适合辞去当前工作吗？','resignation_decision',['domain-08','domain-09'],o('以暂留现职为参照，判断现在执行已明确的离职安排是否合适。',{archived:true,requiresComparisonMethod:true,contextFields:{jobPlan},manuscriptIndexPath:'data/authored-readings/job-resign/index.json'})),
   q('job-change.compare-jobs','新工作与现在的工作相比，哪一个更适合我？','job_option_comparison',['domain-08','domain-09'],o('以已知的现职条件为参照，只就你最看重的一项比较这份具体新工作。',{archived:true,requiresComparisonMethod:true,contextFields:{jobPriority,comparisonTerms},manuscriptIndexPath:'data/authored-readings/job-compare/index.json'}))]),
  s('workplace','职场情况','试用期能通过吗？|与领导的工作关系能协调好吗？',[
   q('job-stability.layoff','当前工作的稳定性如何，会有被裁员的风险吗？','employment_stability',['domain-09'],o('只作工作形势的传统解释，不声称核实了雇主决定或保证工作安全。')),
   q('job-stability.probation','这次试用期能通过吗？','probation_completion',['domain-09'],o('只回答试用期结果，不用求职录用或终身工作稳定代答。')),
   q('work-relations.leader','与这位领导的工作关系能协调好吗？','supervisor_relationship',['domain-02'],o('回答工作沟通与配合，不推测领导未表达的真实心理。')),
   q('work-relations.coworker-support','这件工作能得到同事的支持吗？','coworker_support',['domain-02'],o('回答所选工作上的支持，不泛断同事品格或永久立场。'))]),
  s('exams','考试选拔','这次考试能通过吗？|这次竞聘能成功吗？',[
   q('exams.exam','这次考试能通过吗？','examination_result',['domain-09'],o('回答本次考试结果。',{legacyQuestionId:'domain-09-examination'})),
   q('exams.credential','这次能取得所报考的资格证吗？','credential_attainment',['domain-09'],o('回答取得资格证这一目标，区分考试通过、资格审核和发证。')),
   q('selection.competition','这次岗位竞聘能成功吗？','job_competition',['domain-09'],o('回答本次岗位竞聘的名额结果。')),
   q('selection.selection','这次选拔能被选中吗？','selection_result',['domain-09','domain-02'],o('回答本次明确选拔，不推为所有后续考核均会通过。'))]),
  s('projects','项目任务','项目能达到目标吗？|这项任务能完成吗？',[
   q('projects.project','这个项目能达到预定目标吗？','project_goal_attainment',['domain-08'],o('需明确项目目标；项目完成不等于盈利、回本或收到尾款。')),
   q('projects.task','当前这项任务能完成吗？','task_completion',['domain-08'],o('回答所选任务是否完成，不扩展为事业整体成败。'))])
 ]},
 {id:'wealth',number:'02',label:'财富财运',subcategories:[
  s('income','财运收入','近期有进账吗？|这笔收入能拿到吗？',[
   q('near-term.outlook','所选近期范围内，财务得失的传统趋势如何？','near_term_financial_outlook',['domain-10'],o('同时看进益与耗失，先明确近期范围，不转换为投资指令。')),
   q('near-term.inflow','近期有进账的机会吗？','near_term_money_inflow',['domain-10'],o('回答进账机会，不把进账直接当作扣除成本后的利润。')),
   q('earned-income.income','约定的这笔收入能拿到吗？','earned_income_receipt',['domain-10'],o('回答明确收入是否兑现，不泛断全部财运。')),
   q('earned-income.bonus','这次奖金能发下来吗？','bonus_receipt',['domain-10'],o('回答本次奖金发放，不代答加薪、晋升或奖金金额。'))]),
  s('investment','投资理财','这笔投资的获利前景如何理解？|亏损风险有哪些传统取象？',[
   q('investment.profit','这笔投资的获利前景按传统卦象如何解释？','investment_profit_symbolism',['domain-10'],o('现代投资专项待审；只作象意解释，不给确定收益、买卖指令或个别产品推荐。')),
   q('investment.loss','这笔投资的亏损风险按传统卦象如何解释？','investment_loss_symbolism',['domain-10'],o('现代投资专项待审；没有利润不等于本金必亏，不生成风险概率或确定损失。'))]),
  s('operations','经营合作','这门生意能有收益吗？|合作能达到目标吗？|项目能回本吗？',[
   q('business.profit','这次生意经营能得到收益吗？','business_income',['domain-10'],o('回答所问经营的收益，不以经营顺畅等同于净盈利。',{legacyQuestionId:'domain-10-business-income'})),
   q('business.operations','店铺近期经营能顺利推进吗？','shop_operations',['domain-08','domain-10'],o('回答经营推进与阻碍，不直接保证利润或回本。')),
   q('partnership.cooperation','这次合作能达到约定目标吗？','cooperation_goal_attainment',['domain-08','domain-11'],o('回答合作目标能否达成，不只回答是否谈成合作。')),
   q('partnership.partner','与这位合伙人的合作有哪些值得关注的地方？','partner_cooperation_symbolism',['domain-02','domain-11'],o('保留用户关心的可靠性问题，只解读合作取象；不能核实信用或指认欺骗。')),
   q('project-profit.break-even','这个项目能收回已投入的成本吗？','project_break_even',['domain-10'],o('回答回本，与项目完成、收入到账或净盈利分别处理。')),
   q('project-profit.returns-timing','这个项目何时可能开始有收益？','project_return_timing',['domain-10'],o('先审核收益事件及应期方法；未核算不输出具体日期。',{requiresTimingMethod:true}))]),
  s('contracts','订单合同','这笔订单能谈成吗？|这份合同能签下来吗？',[
   q('contracts.order','这笔客户订单能谈成吗？','customer_order',['domain-11'],o('回答本次订单成交，不保证所有原条件均被接受。',{legacyQuestionId:'domain-11-customer-order'})),
   q('contracts.contract','这份合同能签下来吗？','sign_contract',['domain-11'],o('回答合同签署，不把签署等同于后续履约完成。',{legacyQuestionId:'domain-11-sign-contract'}))]),
  s('debt','借款尾款','借出去的钱能收回吗？|客户尾款能到账吗？',[
   q('debt.loan','借出去的这笔钱能收回来吗？','loan_repayment',['domain-10'],o('回答这笔借款回收；本轮催还只是另一个明确范围，不能代答所有未来结果。',{legacyQuestionId:'domain-10-loan-return'})),
   q('debt.receivable','客户欠的这笔尾款能收到吗？','receivable_collection',['domain-10'],o('回答客户尾款结算与到账，不用一般收入或借款偿还替代。',{legacyQuestionId:'domain-10-receivable'}))]),
  s('selling','买卖求财','东西能卖出去吗？|能卖到期望价格吗？',[
   q('selling.sale','这件东西能卖出去吗？','sale',['domain-11'],o('回答是否出售成交，不保证达到期望价格。',{legacyQuestionId:'domain-11-sale'})),
   q('selling.price','这件东西能卖到我期望的价格吗？','target_sale_price',['domain-11','domain-10'],o('回答能否达到已明确的目标价格，不由可成交直接推为价格满意。'))])
 ]},
 {id:'relationships',number:'03',label:'感情姻缘',subcategories:[
  s('affection','桃花心意','近期有机会开始新感情吗？|怎样理解对方心意的传统取象？',[
   q('new-partner.opportunity','近期有开始新感情的机会吗？','new_relationship_opportunity',['domain-02','domain-05'],o('回答新关系机会，不核实命定身份或编造对象特征。')),
   q('new-partner.timing','何时可能遇到适合发展关系的人？','partner_meeting_timing',['domain-05','domain-02'],o('需要新关系与应期专项；未核算不写具体日期或指定命定对象。',{requiresTimingMethod:true})),
   q('affection.affection','这段关系中，对方心意的传统取象如何理解？','affection_symbolism',['domain-02','domain-05'],o('两个常见问法共用关系取象；不核实对方真实心理，不把婚可成当作喜欢的证据。',{aliases:['他/她喜欢我吗？','对我有没有好感？']}))]),
  s('confession','暧昧表白','对方近期会主动联系吗？|现在适合表白吗？',[
   q('developing.contact','对方近期会主动联系我吗？','partner_initiated_contact',['domain-02','domain-05'],o('回答联系行为的传统倾向，不借此证明爱意或成婚。')),
   q('confession.timing','现在适合向对方表白吗？','confession_suitability',['domain-02','domain-08'],o('回答当前行动适宜，不保证表白成功；择时方法须单独审核。'))]),
  s('dating','恋爱发展','我们能确定恋爱关系吗？|这段关系接下来如何发展？|结束异地的安排能落实吗？',[
   q('developing.relationship','我们能确定恋爱关系吗？','relationship_establishment',['domain-05'],o('回答关系能否建立，不只回答联络。',{legacyQuestionId:'domain-05-start-relationship'})),
   q('confession.pursuit','这次追求能促成恋爱关系吗？','romantic_pursuit_result',['domain-05','domain-08'],o('回答追求这一行动的结果，不替对方作心理确认。')),
   q('dating.stability','这段恋爱关系能稳定维持吗？','dating_stability',['domain-05'],o('回答既有恋爱关系的稳定，不直接套婚姻已成或成婚规则。')),
   q('dating.outlook','这段恋爱关系接下来如何发展？','dating_outlook',['domain-05'],o('回答已明确范围的关系变化，不无期限概括一生。')),
   q('long-distance.stability','这段异地恋能稳定维持吗？','long_distance_relationship_stability',['domain-05'],o('回答关系维持，不用行人归来或普通出行占代答。')),
   q('long-distance.relocation','双方结束异地的安排能落实吗？','long_distance_relocation_arrangement',['domain-08','domain-05'],o('回答共同安排落实，不把关系稳定等同于已经结束异地。'))]),
  s('reconciliation','矛盾复合','冷战能结束吗？|分手后还能复合吗？',[
   q('conflict.reunite','这次冷战能结束、恢复正常相处吗？','relationship_cold_war_resolution',['domain-02','domain-05'],o('回答这次冷战是否结束并和好，不以局部缓和代答；也不等同于分手后的复合。')),
   q('conflict.improvement','当前的关系矛盾能有所改善吗？','relationship_conflict_improvement',['domain-02','domain-05'],o('回答当前矛盾能否缓和，保留部分改善的结果，不自动推为已经和好或成婚。')),
   q('reconciliation.reconcile','这段已经结束的感情能复合吗？','relationship_reconciliation',['domain-05'],o('回答复合，不自动保证复合后稳定。',{legacyQuestionId:'domain-05-reconcile'})),
   q('reconciliation.stability','如果复合，这段关系能稳定维持吗？','post_reconciliation_stability',['domain-05'],o('以已经或拟复合为前提，回答后续稳定，不再回答能否复合。'))]),
  s('marriage-plans','谈婚论嫁','这段感情能走到结婚吗？|这次谈婚事能谈妥吗？',[
   q('marriage-plans.marry','这段感情能走到结婚吗？','marriage_completion',['domain-05'],o('回答成婚与迟速，不以有好感代答成婚。',{legacyQuestionId:'domain-05-marry'})),
   q('marriage-plans.negotiation','这次谈婚事能谈妥吗？','marriage_negotiation',['domain-05'],o('回答本次婚事协商，不把商定等同于婚礼已完成。',{legacyQuestionId:'domain-05-marriage-negotiation'}))]),
  s('married-life','夫妻婚姻','夫妻矛盾能改善吗？|婚姻能继续维持吗？',[
   q('married-life.improvement','夫妻之间目前的矛盾能改善吗？','marital_conflict_resolution',['domain-05','domain-02'],o('回答当前矛盾的改善，不把短期缓和直接当婚姻长期稳定。')),
   q('married-life.continuation','这段婚姻能继续维持吗？','marriage_continuation',['domain-05'],o('回答婚姻维持的传统趋势，不代替法律决定或证实他人行为。'))])
 ]},
 {id:'health',number:'04',label:'健康疾病',policy:'traditional-reference-only',subcategories:[
  s('condition','身体象意','古籍如何描述身体状况？|怎样理解古籍中的身体部位取象？',[
   health('condition.condition','condition','古籍如何描述身体状况相关的象意？','疾病章以体为病人、用为病症，是原典组织象数解释的角色用语。这里用于认识古籍，不从卦象判断一个人的真实身体状况。'),
   health('discomfort.discomfort','discomfort','古籍中的身体部位对应怎样理解？','八卦与身体部位的对应属于传统取象。它不能定位真实病灶；实际不适应依症状向医疗专业人员说明，由其决定检查与处理。')]),
  s('illness','病势象意','古籍怎样表达病情变化？|旺衰术语在疾病章如何使用？',[
   health('course.course','course','古籍如何表达病情变化的传统象意？','本、互、变在古籍中常分作起始、中间与末后之象。阅读这些结构不能预测真实病程、恶化或康复；实际变化应由医疗专业人员评估。'),
   health('severity.severity','severity','古籍讨论病情轻重时用了哪些象数术语？','古籍用旺衰、生克描述传统吉凶。这里解释这些词在文本中的用法，不据它们给真实患者划分轻症、重症或危险程度。')]),
  s('care','诊疗康复','如何理解古籍中的诊疗与康复用语？',[
   health('treatment.treatment','treatment','治疗过程相关的传统用语如何阅读？','疾病章中的生扶、受克是象数术语，不是疗效指标。这里不判断治疗是否有效，也不据卦象调整药物、治疗方案或就医安排。'),
   health('surgery.surgery','surgery','涉及手术时，传统象意与现实照护怎样区分？','古籍象意不能判断手术能否成功或决定是否手术。术前准备、用药、术后照护和需要复诊的情况，应向手术团队逐项确认。'),
   health('recovery.recovery','recovery','古籍中的康复与调养用语怎样理解？','古籍所说的和平、衰旺、逢生属于历史解释。这里不生成现实康复日期或恢复程度；调养与康复计划应按医疗专业人员建议执行。')]),
  s('family-health','家人健康','问家人健康时，古籍如何设置角色与象意？',[
   health('family-health.family','family','问家人健康时，古籍如何设置角色与象意？','这里说明替家人问事时的传统角色用语，不凭卦象判断家人的真实健康、疾病名称或安危。关心家人时，应沟通其实际症状并帮助安排适当医疗支持。')])
 ]},
 {id:'home',number:'05',label:'家庭家宅',subcategories:[
  s('buying','房屋买卖','这套房子适合购买吗？|这套房子能卖出去吗？',[
   q('buying.suitability','这套房子适合购买吗？','home_purchase_suitability',['domain-04','domain-11'],o('先明确自住或投资用途，不能把居住相合直接等同于投资适宜。',{contextFields:{purchasePurpose:{label:'购买用途',options:['self-use','investment'],required:true}}})),
   q('buying.completion','这次买房事项能顺利推进吗？','home_purchase_progress',['domain-11','domain-08'],o('回答所问购房过程；居住象意不代替成交、融资或产权事实。')),
   q('selling.sale','这套房子能卖出去吗？','home_sale',['domain-11'],o('回答房屋出售，不保证理想价格或指定成交日期。')),
   q('selling.transaction','这次房屋交易能成交吗？','home_transaction_completion',['domain-11'],o('回答已明确的这次交易，与一般能否售出分别保留范围。'))]),
  s('renting','租住环境','这次租房能落实吗？|现在的住处适合继续居住吗？',[
   q('renting.lease','这次租房能顺利落实吗？','rental_agreement_completion',['domain-11','domain-08'],o('回答租赁事项落实，不用居住相合代答签约。')),
   q('renting.dwelling','这处准备租的房子适合居住吗？','dwelling_compatibility',['domain-04'],o('回答所选住处的传统居住象意，不保证租约成交或房屋安全。',{legacyQuestionId:'domain-04-rent-home'})),
   q('environment.stay','继续住在现在的住处合适吗？','dwelling_compatibility',['domain-04'],o('只作居住相合的传统解释，不代替环境检测或房屋安全评估。',{legacyQuestionId:'domain-04-stay-home'}))]),
  s('moving','搬家迁居','搬家能顺利完成吗？|这次搬家适合怎么安排时间？',[
   q('moving.timing','这次搬家适合安排在什么时间？','moving_action_timing',['domain-08','domain-12'],o('属于行动安排的择时专项，不把事件应期直接当成搬家吉日。',{requiresTimingMethod:true})),
   q('moving.progress','这次搬家安排能顺利完成吗？','moving_completion',['domain-08','domain-12','domain-04'],o('回答搬家安排完成，不只看新住所是否相合。'))]),
  s('renovation','装修建造','装修或建造计划能顺利完成吗？',[
   q('renovation.completion','这次装修或建造计划能顺利完成吗？','renovation_completion',['domain-08'],o('回答计划完成与过程阻碍，不评估现实建筑结构安全。'))]),
  s('family-relations','家庭亲子','家庭争执能平息吗？|孩子的这项家庭事务能解决吗？',[
   q('family-relations.resolution','家里的这场争执能平息吗？','family_dispute',['domain-03'],o('回答本次家庭争执，不对家人心理和品格作事实认定。',{legacyQuestionId:'domain-03-family-dispute'})),
   q('elders.coordination','与父母或长辈商量的这件事能协调好吗？','elder_family_coordination',['domain-02','domain-03'],o('回答所选非医疗家庭事务的协调，健康问题使用健康查阅边界。')),
   q('children.resolution','孩子的这项家庭事务能顺利解决吗？','child_family_affair',['domain-03','domain-08'],o('须明确是一项非医疗家庭安排；考试、健康等另选对应问题，不一概按家宅断。'))])
 ]},
 {id:'search',number:'06',label:'寻人失物',subcategories:[
  s('lost-object','物品找回','这件物品还能找回来吗？|遗失的证件或文件还能找到吗？',[
   q('lost-object.recovery','丢失的这件物品还能找回来吗？','lost_object_recovery',['domain-15'],o('回答物品找回；按明确物品类型调用，不能用于人或宠物。',{contextFields:lostContext,legacyBindings:lostBindings,practicalAdvice:['先确认最后使用地点、经过场所和失物招领信息。']})),
   q('valuables.recovery','遗失的这件贵重物品能找回来吗？','lost_object_recovery',['domain-15'],o('物品找回规则可共享，实际保护措施按手机、钱包或首饰分别显示。',{contextFields:{objectKind:{label:'物品类型',options:['phone','wallet','jewellery'],required:true}},legacyBindings:lostBindings})),
   q('documents.recovery','遗失的证件或文件能找回来吗？','lost_object_recovery',['domain-15'],o('回答证件文件找回，同时保留挂失、补办及信息保护的现实操作。',{legacyQuestionId:'domain-15-documents',practicalAdvice:['核实遗失地点和招领信息；按证件或文件种类联系签发机构了解挂失、补办及信息保护步骤。']}))]),
  s('direction','方向原因','古籍有哪些方位取象？|怎样回查物品可能遗忘的地方？',[
   q('direction.symbolism','传统卦象有哪些可供补充查找的方位取象？','lost_object_direction_symbolism',['domain-15'],o('只介绍传统方位取象，不声称已定位、已知坐标或真实移动轨迹。',{mode:'reference',referenceKind:'lost-object-direction',referenceParagraphs:['失物章以变化的卦象参看传统方位和场所。方位取象仅供实际排查后的补充参考，不能证明物品所在地。'],practicalAdvice:['先核实实际行程、设备定位和场所回复，再参考传统取象。']})),
   q('last-location.review','可以怎样梳理物品可能遗忘的地方？','forgotten_item_search_guidance',['domain-15'],o('以实际使用记录和行程梳理为主，不从卦象指认盗窃或还原已发生的真实经过。',{mode:'guidance',guidanceParagraphs:['从最后一次确认物品还在的时间开始，按使用、收放、移动的顺序回想。核对消费、出行或设备记录，并联系经过场所的失物招领。'],practicalAdvice:['先整理可核实的使用记录与经过地点，再逐一联系场所。']}))]),
  s('pets','宠物走失','走失的宠物能找回来吗？',[
   q('pets.recovery','走失的宠物能找回来吗？','lost_pet_recovery',['domain-15','domain-02'],o('活体宠物专项需独立审核，不自动套失物全文，不以应期代替及时寻找。',{practicalAdvice:['及时寻找最后出现地点周边，联系附近收容所、兽医及走失登记平台；如有芯片，向登记机构更新失联与联系方式。']}))]),
  s('missing-contact','失联寻人','与失联者还能恢复联系吗？|可以怎样整理现实搜寻线索？',[
   q('missing-contact.contact','与这位失联者还能恢复联系吗？','missing_person_contact_restoration',['domain-02','domain-13'],o('恢复联系是独立事项；不套物品找回或行人归期，不判断人身安危、具体位置或保证联系日期。',{practicalAdvice:['先通过已知联系方式和可信共同联系人核实情况。涉及儿童、即时危险或异常失联时，尽快联系当地警方或紧急服务；不要等待卦象或应期。']})),
   q('person-leads.guidance','可以从哪些现实线索继续寻找或恢复联系？','missing_person_search_guidance',[],o('提供现实线索整理与求助步骤，不输出卦象定位或人身安危预测。',{mode:'guidance',guidanceParagraphs:['整理最后一次确认联系的时间、地点、出行安排和可信联系人，保存相关通信记录。通过可信渠道核实，避免传播未核实的线索。','涉及儿童、即时危险或异常失联时，及时联系当地警方或紧急服务。在美国有即时危险时拨打911，其他情形可联系当地警方咨询报失与寻找程序。'],practicalAdvice:['优先核实最后联系与行程信息，联系可信共同联系人和适当求助渠道；不要等待占断结果。']}))])
 ]}
];

export const OBJECT_PRACTICAL_ADVICE={
 phone:['先使用系统查找功能定位；按设备支持情况开启丢失模式或远程锁定，并保护相关账户。'],
 wallet:['先核查钱包中的卡片；如有银行卡，可联系发卡行临时锁卡并核查交易，再联系经过场所。'],
 jewellery:['核对最后佩戴或收放地点，联系经过场所的失物招领；保留可识别物品的照片或记录。'],
 keys:['核对最后使用地点及经过场所；如涉及门禁或住址信息，联系管理方了解后续处理。'],
 documents:['联系签发或管理机构了解挂失、补办及信息保护步骤，并核实失物招领。'],
 other:['核实最后使用和收放记录，联系实际经过场所及失物招领。']
};
