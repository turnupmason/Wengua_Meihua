# 正式产品分类 V2

六大领域按新版导航归为 31 个细分入口，依次为 6、6、6、4、5、4 项。82 个固定问项按所问事项归入新入口，沿用各自的 ID、类型、回答范围和出处。原 18 个古籍门类作为内容来源。

十篇V3简断与详断已获用户通过，内容及文风按原版本保留；无需重复请求文风确认。验收记录绑定原稿摘要，见 data/editorial-acceptance.json。

## 01 · 事业工作

### 求职录用

用户常见问法：面试能通过吗？；这次求职能拿到录用吗？

- 这次面试能通过吗？
  - ID：career.interview.interview-pass；类型：interview_pass
  - 回答范围：只回答这一轮面试是否通过，不把通过面试等同于获得最终录用。
- 这次求职能拿到录用吗？
  - ID：career.interview.job-offer；类型：job_application
  - 回答范围：回答本次录用是否落实，不只回答面试表现。

### 晋升加薪

用户常见问法：这次能晋升吗？；今年能加薪吗？

- 这次晋升能争取到吗？
  - ID：career.promotion-pay.promotion；类型：promotion
  - 回答范围：回答本次晋升，不由在任见克条文推成必遭处分或失业。
- 今年能获得加薪吗？
  - ID：career.promotion-pay.pay-rise；类型：salary_increase
  - 回答范围：回答所选年度薪资调整，不把升职、奖金和加薪互相替代。

### 跳槽去留

用户常见问法：现在适合辞职吗？；新工作和现在的工作怎么选？

- 现在适合辞去当前工作吗？
  - ID：career.job-change.resign；类型：resignation_decision
  - 回答范围：属于去留决策，须有明确备选安排；不以求职可成代答辞职适宜。
- 新工作与现在的工作相比，哪一个更适合我？
  - ID：career.job-change.compare-jobs；类型：job_option_comparison
  - 回答范围：须明确比较目标及两个选项，不能凭单一得失结论断新工作全面更好。

### 职场情况

用户常见问法：试用期能通过吗？；与领导的工作关系能协调好吗？

- 当前工作的稳定性如何，会有被裁员的风险吗？
  - ID：career.job-stability.layoff；类型：employment_stability
  - 回答范围：只作工作形势的传统解释，不声称核实了雇主决定或保证工作安全。
- 这次试用期能通过吗？
  - ID：career.job-stability.probation；类型：probation_completion
  - 回答范围：只回答试用期结果，不用求职录用或终身工作稳定代答。
- 与这位领导的工作关系能协调好吗？
  - ID：career.work-relations.leader；类型：supervisor_relationship
  - 回答范围：回答工作沟通与配合，不推测领导未表达的真实心理。
- 这件工作能得到同事的支持吗？
  - ID：career.work-relations.coworker-support；类型：coworker_support
  - 回答范围：回答所选工作上的支持，不泛断同事品格或永久立场。

### 考试选拔

用户常见问法：这次考试能通过吗？；这次竞聘能成功吗？

- 这次考试能通过吗？
  - ID：career.exams.exam；类型：examination_result
  - 回答范围：回答本次考试结果。
- 这次能取得所报考的资格证吗？
  - ID：career.exams.credential；类型：credential_attainment
  - 回答范围：回答取得资格证这一目标，区分考试通过、资格审核和发证。
- 这次岗位竞聘能成功吗？
  - ID：career.selection.competition；类型：job_competition
  - 回答范围：回答本次岗位竞聘的名额结果。
- 这次选拔能被选中吗？
  - ID：career.selection.selection；类型：selection_result
  - 回答范围：回答本次明确选拔，不推为所有后续考核均会通过。

### 项目任务

用户常见问法：项目能达到目标吗？；这项任务能完成吗？

- 这个项目能达到预定目标吗？
  - ID：career.projects.project；类型：project_goal_attainment
  - 回答范围：需明确项目目标；项目完成不等于盈利、回本或收到尾款。
- 当前这项任务能完成吗？
  - ID：career.projects.task；类型：task_completion
  - 回答范围：回答所选任务是否完成，不扩展为事业整体成败。

## 02 · 财富财运

### 财运收入

用户常见问法：近期有进账吗？；这笔收入能拿到吗？

- 所选近期范围内，财务得失的传统趋势如何？
  - ID：wealth.near-term.outlook；类型：near_term_financial_outlook
  - 回答范围：同时看进益与耗失，先明确近期范围，不转换为投资指令。
- 近期有进账的机会吗？
  - ID：wealth.near-term.inflow；类型：near_term_money_inflow
  - 回答范围：回答进账机会，不把进账直接当作扣除成本后的利润。
- 约定的这笔收入能拿到吗？
  - ID：wealth.earned-income.income；类型：earned_income_receipt
  - 回答范围：回答明确收入是否兑现，不泛断全部财运。
- 这次奖金能发下来吗？
  - ID：wealth.earned-income.bonus；类型：bonus_receipt
  - 回答范围：回答本次奖金发放，不代答加薪、晋升或奖金金额。

### 投资理财

用户常见问法：这笔投资的获利前景如何理解？；亏损风险有哪些传统取象？

- 这笔投资的获利前景按传统卦象如何解释？
  - ID：wealth.investment.profit；类型：investment_profit_symbolism
  - 回答范围：现代投资专项待审；只作象意解释，不给确定收益、买卖指令或个别产品推荐。
- 这笔投资的亏损风险按传统卦象如何解释？
  - ID：wealth.investment.loss；类型：investment_loss_symbolism
  - 回答范围：现代投资专项待审；没有利润不等于本金必亏，不生成风险概率或确定损失。

### 经营合作

用户常见问法：这门生意能有收益吗？；合作能达到目标吗？；项目能回本吗？

- 这次生意经营能得到收益吗？
  - ID：wealth.business.profit；类型：business_income
  - 回答范围：回答所问经营的收益，不以经营顺畅等同于净盈利。
- 店铺近期经营能顺利推进吗？
  - ID：wealth.business.operations；类型：shop_operations
  - 回答范围：回答经营推进与阻碍，不直接保证利润或回本。
- 这次合作能达到约定目标吗？
  - ID：wealth.partnership.cooperation；类型：cooperation_goal_attainment
  - 回答范围：回答合作目标能否达成，不只回答是否谈成合作。
- 与这位合伙人的合作有哪些值得关注的地方？
  - ID：wealth.partnership.partner；类型：partner_cooperation_symbolism
  - 回答范围：保留用户关心的可靠性问题，只解读合作取象；不能核实信用或指认欺骗。
- 这个项目能收回已投入的成本吗？
  - ID：wealth.project-profit.break-even；类型：project_break_even
  - 回答范围：回答回本，与项目完成、收入到账或净盈利分别处理。
- 这个项目何时可能开始有收益？
  - ID：wealth.project-profit.returns-timing；类型：project_return_timing
  - 回答范围：先审核收益事件及应期方法；未核算不输出具体日期。

### 订单合同

用户常见问法：这笔订单能谈成吗？；这份合同能签下来吗？

- 这笔客户订单能谈成吗？
  - ID：wealth.contracts.order；类型：customer_order
  - 回答范围：回答本次订单成交，不保证所有原条件均被接受。
- 这份合同能签下来吗？
  - ID：wealth.contracts.contract；类型：sign_contract
  - 回答范围：回答合同签署，不把签署等同于后续履约完成。

### 借款尾款

用户常见问法：借出去的钱能收回吗？；客户尾款能到账吗？

- 借出去的这笔钱能收回来吗？
  - ID：wealth.debt.loan；类型：loan_repayment
  - 回答范围：回答这笔借款回收；本轮催还只是另一个明确范围，不能代答所有未来结果。
- 客户欠的这笔尾款能收到吗？
  - ID：wealth.debt.receivable；类型：receivable_collection
  - 回答范围：回答客户尾款结算与到账，不用一般收入或借款偿还替代。

### 买卖求财

用户常见问法：东西能卖出去吗？；能卖到期望价格吗？

- 这件东西能卖出去吗？
  - ID：wealth.selling.sale；类型：sale
  - 回答范围：回答是否出售成交，不保证达到期望价格。
- 这件东西能卖到我期望的价格吗？
  - ID：wealth.selling.price；类型：target_sale_price
  - 回答范围：回答能否达到已明确的目标价格，不由可成交直接推为价格满意。

## 03 · 感情姻缘

### 桃花心意

用户常见问法：近期有机会开始新感情吗？；怎样理解对方心意的传统取象？

- 近期有开始新感情的机会吗？
  - ID：relationships.new-partner.opportunity；类型：new_relationship_opportunity
  - 回答范围：回答新关系机会，不核实命定身份或编造对象特征。
- 何时可能遇到适合发展关系的人？
  - ID：relationships.new-partner.timing；类型：partner_meeting_timing
  - 回答范围：需要新关系与应期专项；未核算不写具体日期或指定命定对象。
- 这段关系中，对方心意的传统取象如何理解？
  - ID：relationships.affection.affection；类型：affection_symbolism
  - 回答范围：两个常见问法共用关系取象；不核实对方真实心理，不把婚可成当作喜欢的证据。

### 暧昧表白

用户常见问法：对方近期会主动联系吗？；现在适合表白吗？

- 对方近期会主动联系我吗？
  - ID：relationships.developing.contact；类型：partner_initiated_contact
  - 回答范围：回答联系行为的传统倾向，不借此证明爱意或成婚。
- 现在适合向对方表白吗？
  - ID：relationships.confession.timing；类型：confession_suitability
  - 回答范围：回答当前行动适宜，不保证表白成功；择时方法须单独审核。

### 恋爱发展

用户常见问法：我们能确定恋爱关系吗？；这段关系接下来如何发展？；结束异地的安排能落实吗？

- 我们能确定恋爱关系吗？
  - ID：relationships.developing.relationship；类型：relationship_establishment
  - 回答范围：回答关系能否建立，不只回答联络。
- 这次追求能促成恋爱关系吗？
  - ID：relationships.confession.pursuit；类型：romantic_pursuit_result
  - 回答范围：回答追求这一行动的结果，不替对方作心理确认。
- 这段恋爱关系能稳定维持吗？
  - ID：relationships.dating.stability；类型：dating_stability
  - 回答范围：回答既有恋爱关系的稳定，不直接套婚姻已成或成婚规则。
- 这段恋爱关系接下来如何发展？
  - ID：relationships.dating.outlook；类型：dating_outlook
  - 回答范围：回答已明确范围的关系变化，不无期限概括一生。
- 这段异地恋能稳定维持吗？
  - ID：relationships.long-distance.stability；类型：long_distance_relationship_stability
  - 回答范围：回答关系维持，不用行人归来或普通出行占代答。
- 双方结束异地的安排能落实吗？
  - ID：relationships.long-distance.relocation；类型：long_distance_relocation_arrangement
  - 回答范围：回答共同安排落实，不把关系稳定等同于已经结束异地。

### 矛盾复合

用户常见问法：冷战能结束吗？；分手后还能复合吗？

- 这次冷战能结束、恢复正常相处吗？
  - ID：relationships.conflict.reunite；类型：relationship_cold_war_resolution
  - 回答范围：回答这次冷战是否结束并和好，不以局部缓和代答；也不等同于分手后的复合。
- 当前的关系矛盾能有所改善吗？
  - ID：relationships.conflict.improvement；类型：relationship_conflict_improvement
  - 回答范围：回答当前矛盾能否缓和，保留部分改善的结果，不自动推为已经和好或成婚。
- 这段已经结束的感情能复合吗？
  - ID：relationships.reconciliation.reconcile；类型：relationship_reconciliation
  - 回答范围：回答复合，不自动保证复合后稳定。
- 如果复合，这段关系能稳定维持吗？
  - ID：relationships.reconciliation.stability；类型：post_reconciliation_stability
  - 回答范围：以已经或拟复合为前提，回答后续稳定，不再回答能否复合。

### 谈婚论嫁

用户常见问法：这段感情能走到结婚吗？；这次谈婚事能谈妥吗？

- 这段感情能走到结婚吗？
  - ID：relationships.marriage-plans.marry；类型：marriage_completion
  - 回答范围：回答成婚与迟速，不以有好感代答成婚。
- 这次谈婚事能谈妥吗？
  - ID：relationships.marriage-plans.negotiation；类型：marriage_negotiation
  - 回答范围：回答本次婚事协商，不把商定等同于婚礼已完成。

### 夫妻婚姻

用户常见问法：夫妻矛盾能改善吗？；婚姻能继续维持吗？

- 夫妻之间目前的矛盾能改善吗？
  - ID：relationships.married-life.improvement；类型：marital_conflict_resolution
  - 回答范围：回答当前矛盾的改善，不把短期缓和直接当婚姻长期稳定。
- 这段婚姻能继续维持吗？
  - ID：relationships.married-life.continuation；类型：marriage_continuation
  - 回答范围：回答婚姻维持的传统趋势，不代替法律决定或证实他人行为。

## 04 · 健康疾病

### 身体象意

用户常见问法：古籍如何描述身体状况？；怎样理解古籍中的身体部位取象？

- 古籍如何描述身体状况相关的象意？
  - ID：health.condition.condition；类型：health_symbolic_condition
  - 回答范围：只解释传统术语与象意；不诊断、不定位病灶、不评估病情严重程度、不预测疗效或指导医疗决策。
- 古籍中的身体部位对应怎样理解？
  - ID：health.discomfort.discomfort；类型：health_symbolic_discomfort
  - 回答范围：只解释传统术语与象意；不诊断、不定位病灶、不评估病情严重程度、不预测疗效或指导医疗决策。

### 病势象意

用户常见问法：古籍怎样表达病情变化？；旺衰术语在疾病章如何使用？

- 古籍如何表达病情变化的传统象意？
  - ID：health.course.course；类型：health_symbolic_course
  - 回答范围：只解释传统术语与象意；不诊断、不定位病灶、不评估病情严重程度、不预测疗效或指导医疗决策。
- 古籍讨论病情轻重时用了哪些象数术语？
  - ID：health.severity.severity；类型：health_symbolic_severity
  - 回答范围：只解释传统术语与象意；不诊断、不定位病灶、不评估病情严重程度、不预测疗效或指导医疗决策。

### 诊疗康复

用户常见问法：如何理解古籍中的诊疗与康复用语？

- 治疗过程相关的传统用语如何阅读？
  - ID：health.treatment.treatment；类型：health_symbolic_treatment
  - 回答范围：只解释传统术语与象意；不诊断、不定位病灶、不评估病情严重程度、不预测疗效或指导医疗决策。
- 涉及手术时，传统象意与现实照护怎样区分？
  - ID：health.surgery.surgery；类型：health_symbolic_surgery
  - 回答范围：只解释传统术语与象意；不诊断、不定位病灶、不评估病情严重程度、不预测疗效或指导医疗决策。
- 古籍中的康复与调养用语怎样理解？
  - ID：health.recovery.recovery；类型：health_symbolic_recovery
  - 回答范围：只解释传统术语与象意；不诊断、不定位病灶、不评估病情严重程度、不预测疗效或指导医疗决策。

### 家人健康

用户常见问法：问家人健康时，古籍如何设置角色与象意？

- 问家人健康时，古籍如何设置角色与象意？
  - ID：health.family-health.family；类型：health_symbolic_family
  - 回答范围：只解释传统术语与象意；不诊断、不定位病灶、不评估病情严重程度、不预测疗效或指导医疗决策。

## 05 · 家庭家宅

### 房屋买卖

用户常见问法：这套房子适合购买吗？；这套房子能卖出去吗？

- 这套房子适合购买吗？
  - ID：home.buying.suitability；类型：home_purchase_suitability
  - 回答范围：先明确自住或投资用途，不能把居住相合直接等同于投资适宜。
- 这次买房事项能顺利推进吗？
  - ID：home.buying.completion；类型：home_purchase_progress
  - 回答范围：回答所问购房过程；居住象意不代替成交、融资或产权事实。
- 这套房子能卖出去吗？
  - ID：home.selling.sale；类型：home_sale
  - 回答范围：回答房屋出售，不保证理想价格或指定成交日期。
- 这次房屋交易能成交吗？
  - ID：home.selling.transaction；类型：home_transaction_completion
  - 回答范围：回答已明确的这次交易，与一般能否售出分别保留范围。

### 租住环境

用户常见问法：这次租房能落实吗？；现在的住处适合继续居住吗？

- 这次租房能顺利落实吗？
  - ID：home.renting.lease；类型：rental_agreement_completion
  - 回答范围：回答租赁事项落实，不用居住相合代答签约。
- 这处准备租的房子适合居住吗？
  - ID：home.renting.dwelling；类型：dwelling_compatibility
  - 回答范围：回答所选住处的传统居住象意，不保证租约成交或房屋安全。
- 继续住在现在的住处合适吗？
  - ID：home.environment.stay；类型：dwelling_compatibility
  - 回答范围：只作居住相合的传统解释，不代替环境检测或房屋安全评估。

### 搬家迁居

用户常见问法：搬家能顺利完成吗？；这次搬家适合怎么安排时间？

- 这次搬家适合安排在什么时间？
  - ID：home.moving.timing；类型：moving_action_timing
  - 回答范围：属于行动安排的择时专项，不把事件应期直接当成搬家吉日。
- 这次搬家安排能顺利完成吗？
  - ID：home.moving.progress；类型：moving_completion
  - 回答范围：回答搬家安排完成，不只看新住所是否相合。

### 装修建造

用户常见问法：装修或建造计划能顺利完成吗？

- 这次装修或建造计划能顺利完成吗？
  - ID：home.renovation.completion；类型：renovation_completion
  - 回答范围：回答计划完成与过程阻碍，不评估现实建筑结构安全。

### 家庭亲子

用户常见问法：家庭争执能平息吗？；孩子的这项家庭事务能解决吗？

- 家里的这场争执能平息吗？
  - ID：home.family-relations.resolution；类型：family_dispute
  - 回答范围：回答本次家庭争执，不对家人心理和品格作事实认定。
- 与父母或长辈商量的这件事能协调好吗？
  - ID：home.elders.coordination；类型：elder_family_coordination
  - 回答范围：回答所选非医疗家庭事务的协调，健康问题使用健康查阅边界。
- 孩子的这项家庭事务能顺利解决吗？
  - ID：home.children.resolution；类型：child_family_affair
  - 回答范围：须明确是一项非医疗家庭安排；考试、健康等另选对应问题，不一概按家宅断。

## 06 · 寻人失物

### 物品找回

用户常见问法：这件物品还能找回来吗？；遗失的证件或文件还能找到吗？

- 丢失的这件物品还能找回来吗？
  - ID：search.lost-object.recovery；类型：lost_object_recovery
  - 回答范围：回答物品找回；按明确物品类型调用，不能用于人或宠物。
- 遗失的这件贵重物品能找回来吗？
  - ID：search.valuables.recovery；类型：lost_object_recovery
  - 回答范围：物品找回规则可共享，实际保护措施按手机、钱包或首饰分别显示。
- 遗失的证件或文件能找回来吗？
  - ID：search.documents.recovery；类型：lost_object_recovery
  - 回答范围：回答证件文件找回，同时保留挂失、补办及信息保护的现实操作。

### 方向原因

用户常见问法：古籍有哪些方位取象？；怎样回查物品可能遗忘的地方？

- 传统卦象有哪些可供补充查找的方位取象？
  - ID：search.direction.symbolism；类型：lost_object_direction_symbolism
  - 回答范围：只介绍传统方位取象，不声称已定位、已知坐标或真实移动轨迹。
- 可以怎样梳理物品可能遗忘的地方？
  - ID：search.last-location.review；类型：forgotten_item_search_guidance
  - 回答范围：以实际使用记录和行程梳理为主，不从卦象指认盗窃或还原已发生的真实经过。

### 宠物走失

用户常见问法：走失的宠物能找回来吗？

- 走失的宠物能找回来吗？
  - ID：search.pets.recovery；类型：lost_pet_recovery
  - 回答范围：活体宠物专项需独立审核，不自动套失物全文，不以应期代替及时寻找。

### 失联寻人

用户常见问法：与失联者还能恢复联系吗？；可以怎样整理现实搜寻线索？

- 与这位失联者还能恢复联系吗？
  - ID：search.missing-contact.contact；类型：missing_person_contact_restoration
  - 回答范围：恢复联系是独立事项；不套物品找回或行人归期，不判断人身安危、具体位置或保证联系日期。
- 可以从哪些现实线索继续寻找或恢复联系？
  - ID：search.person-leads.guidance；类型：missing_person_search_guidance
  - 回答范围：提供现实线索整理与求助步骤，不输出卦象定位或人身安危预测。

## 接入与边界

使用 createProductRepository 按领域、细分入口、具体问题选择。古籍门类用独立的 domainId。问项所属入口以 subcategoryId 为准，问项 ID 的中段用于兼容既有记录。物品种类、所问年份、购买用途由固定选项提供。明确同义的问法可以共用类型和已审核全文，面试/录用、升职/加薪、成交/理想价格、复合/复合后稳定分别处理。

健康的四个细分收录八个传统象意查阅问项。现实中的症状、诊疗和康复由医疗专业人员评估。暗恋与合伙可靠性保留为关系取象问题，不核实真实心理或信用。投资不生成收益保证、产品推荐或买卖指令。

寻人、宠物与物品使用独立类型。恢复联系不能套行人归期或物品找回。现实求助和排查建议优先显示，传统方位不表示已定位。遇到明确方法或稿件缺失，保留待写状态，不调用领域通用断语填补。

来源关联是候选范围与明确问法的连接，不表示所有现代分支均已完成断法审核。接受十篇的内容与文风，不会自动把旧1,920篇批量稿或未覆盖的空亡、应期版本标成已审。

构建 npm run build:product；完整数据构建也会生成本目录。产品JSON为 data/product-categories.json，SQL为 data/product-categories.sql，SQLite合并到 dist/wengua.sqlite。
