# Claude repository instructions

本轮显示规则见docs/LIVE_CONTEXT_AND_SHORT_READINGS.md。60篇简断只写自然解释，不出现应期、窗口、吉应凶应或计算提示；构建和读取都以checkInterviewShort拦截。当前正文版本interview-pass-1.3.0。

实际界面读short、narrativeParagraphs、timingSection及calculationExplanation。应期单独显示timingSection，附“传统推算的参考窗口”，每窗仍保留自己的事件、吉凶和日期。paragraphs/story保留完整格式供导出或兼容，采用独立应期栏后不要再把完整paragraphs中的应期重复显示。

monthBranch是实际月令。只传旧monthOrder气类时monthBranch为null，显示“具体月令未提供”，不得把查稿代表月当作实际月令。静态facts.referenceContext只用于对照，displayInUserResult:false；用户显示只读实时calculationExplanation与timingSection，不复制2026-11-11演示日、演示干支或旬空。保存历史时日期基准固定为原起卦日，不因查看日而滚动。

本轮复核见docs/INTERVIEW_REVIEW_20261111.md。山雷颐六二、山风蛊九三的夏令与土令共4份稿已由倾向通过改为难以通过。checkInterviewDecision拦截本用克体、无直接生体且仅凭旺体或互卦比和翻吉的稿件；该检查属于本项目面试问项的来源一致性门槛，不是跨领域通用预测公式。

当前稿版本interview-pass-1.3.0。半空等专业信息只在calculationExplanation里，短断与story/paragraphs不混入。页面将“计算说明”单独折叠；空亡规则独立版本trigram-void-2.1.0，不能说成古籍统一计分。

每条日期窗口的dateResolution.dateMatches分别保存slotId、event、valence、eventScope、targetBranches、calculationBasis与实际公历日期；不把过程凶应和最终有利候选合并。日期动态换算，不存死日号。review.independentReview及dateResolution.independentInterpretationReview均保留pending，userAcceptedThisVersion:false；代码检查与作者复核不冒充用户或独立断法审核。

当前首问为“这次面试能通过吗”。已写60篇完整正文，12种盘的十二月令全部接齐，共144/4,608个基础槽位。正文按实际旺衰分别写；同气类且同结论的月份明确共用全文。实际进度在data/authored-readings/progress.json；不宣称全问完成，不虚报后台任务。全文见docs/INTERVIEW_PASS_ALL_MONTHS.md。

当前检索口径为64卦×6动爻×12月令，不再以1,920作为新稿完整数量。寅卯木、巳午火、申酉金、亥子水、辰未戌丑土；采用显式月令输入，未自动推算节气或每季末十八日。monthBranch是产品月令键，monthOrder仅为五态计算与旧接口兼容字段。

JSON按本卦分片，monthSlots以动爻:月令指向行池；每次只读一个卦的分片，缓存保留索引和最近两个分片。SQL分开存authored_product_manuscripts全文与authored_product_month_slots月令映射。重复正文不重复下载。

旬空按八卦配支，不采用六爻纳甲。全中记全空，部分命中记半空并定性减力，不擅设50%或整卦消失。命中形态与旺不为空、动不为空、生扶、衰极的作用状态分开。基础正文不预设旬空，无空或核心作用不变时使用基础稿；会改变核心判断而未另写的情境返回待写。普通互卦静空不自动改结论或另排填冲日期。详见docs/VOID_POLICY_V2.md。

用户已确认文风和应期，继续逐篇写作，无需重复求批。不要在用户可见结果里加“空亡采用你批准的扩展规则”或其同义尾注。内部来源、事实和作者复核照常保留。应期必须说明事件、吉凶；过程受阻不等于失败公布日，修正窗口不等于通过日。日期按保存的起卦日换算，本月无合适候选才找下月，历史不随阅读日滚动。

本助手是实际写作者与逐篇复核者，状态为author-checked，不声称独立人类专家或用户逐篇认证。旧1,920篇批次与旧审核视图单列。

正式产品入口已定为6大类、52细分、82个单事项，见 [正式分类](docs/PRODUCT_CATEGORIES_V1.md)。使用 createProductRepository，原18门古籍来源和旧90问保留在内部。

最新断语标准为 [V3规范](docs/STORY_GENERATION_STANDARD_V3.md)，[十篇简断与详断](docs/TEN_READINGS_V3.md)由本助手负责撰写，开发侧接入已写稿件。第一层卦象事实、第二层专业结论、第三层自然文字分开；简详绑定同一结论。十篇V3内容与文风已获用户通过，验收记录见 data/editorial-acceptance.json，绑定原稿摘要；不重复请求文风确认。接受范围不自动扩展到其他盘、旬空或精确应期。

最新入口：[开发交接 V8](docs/CLAUDE_BUILD_PROMPT_V8.md)，先读 [断语审核 V2](docs/INTERPRETATION_AUDIT_V2.md)。用户最新明确：每个领域细分具体问题，每篇按九项审查。V8覆盖旧版大领域套稿、任意传递关系和旧稿可发布的口径。

旧批次真实状态：客户尾款已生成1,920篇基础稿、16,617个空亡版本，九项断法审核通过和可发布数为0。旧 reviewStatus=reviewed 仅代表结构标记。旧稿存在月令适用不完整、间接关系缺条件审核、部分空亡和应期依据不足；保留供修订，不作为正式结果。进度在 data/question-stories/batch-progress.json，无后台写作任务。不将旧编写器换名继续扩批。

## 继续开发

1. 阅读 README.md、docs/CLAUDE_BUILD_PROMPT_V8.md、docs/INTERPRETATION_AUDIT_V2.md。
2. 阅读 docs/RULES.md、docs/DATA_AND_API.md、docs/DATABASE_AND_DETAILS.md、docs/EDITORIAL.md、docs/DETAILS_AUDIT.md 和 data/issues.json；冲突按V8和用户最新要求处理。
3. 先构建测试。排盘、资料阅读、3D仪式可继续开发；正式断语遵循审核状态。
4. 按已通过V3继续编写，保留三层数据、简详同结论和具体问题边界。新分支逐项补齐来源及覆盖，不把十篇重复送审文风；不宣称百分之百现实预测正确。

## 必须保持

- sources/original 和上传原文不改写；订正有记录和出处。参考解释不能反向修改六爻结构，隔离片段不能进入事实表。
- 44天风姤展示中卦，分类中中；固定卦等与情境总断分开。
- 六爻自下向上1–6，本卦真实动爻发光，点击取本卦该爻资料；动侧为用、静侧为体。互卦无独立动爻，用九/用六不是第七爻。
- 一个原体贯穿。用最紧、互次之、变又次之；体互先于用互。解释开局、过程、结局和反例，不靠一个克字或变卦包办整盘。
- 完整五态用 assessSeasonalQi / buildInterpretationEvidence，所有经卦同表。旧 createReading.strength 保留兼容语义，不能混用。金休仍克木，火死不等于零作用或真空，不加自创倍率。
- 十二月令分别有键；五类旺衰用于计算，不能用五类记录数冒充十二月槽位。节气月令自动选择须另补历法，不能按公历月份硬套。
- 直接关系先看。两段候选路径不是生效的解围规则，approvedIndirectRules 当前为空。不得自行串联或重复累计原体。
- 八卦配支不是纳甲；半空定性减力，禁止自创数值倍率。全空命中与作用失效分开。原已定真空失效条件不靠未来填冲自动复活，填优先、冲次之，合空不作通用出空。
- 应期先审核具体事件、吉凶、尺度、方法、轮次，再换日期。近期按日先本月余日、无候选再查下月实际干支；新盘不取过去日期，旧盘不滚动改期。按日可不填时分，按时或自动节气月令另需时间上下文。
- 正文开局、过程、结局、总断，像正常说话，不用星号。专业依据放详情，允许有依据的条件与倾向。不得编心理、金额、人物、概率、确定日期或古案反馈。

## 事项与正式接口

产品层读取 data/product-categories.json：6大类52细分，82个单事项。18个原典门类和旧90问是内部兼容来源，不是产品一级菜单。读取 question_type、回答范围、来源和辅助字段；辅助字段不由AI分类。复合与成婚不同；婚可成不能证明喜欢自己；失物不能代替失联人员。前端可另分导航大类，但保留原门类绑定。备注如保留，仅个人记录，不参与AI分类，不声称已回答备注里的其他问题。

createProductRepository({library}).getContent 精确匹配产品事项；仅显式同范围连接才调用内部 createQuestionRepository。未写稿为 pending-authoring；已有未过九项为 pending-review，story:null、空段落、productionAllowed:false，不输出占期。15项查阅为 reference。正式产品不得回退其他事项或旧领域通用稿。

editorialPreview:true 仅内部审阅，返回 review-preview；未审稿永不 ready。其日期 resolved 只代表旧规则下日历转换成功，interpretationReviewed:false。data/interpretation-reviews.json 目前无批准记录，九项须绑定精确内容、上下文、版本及证据定位、理由、审核签名。填满字段不代表实质审核成立。

SQL全文为 structural-only 内部稿，生产只查 approved_fixed_question_stories，目前0行。旧导出器拒绝非零批准数；未来实现精确回执导出后再启用，不靠改计数放行。旧 getStory、基础SQL和资源字典不绕过新门槛展示正式结果。

## 验证与交付

npm run build:data；npm run validate；npm run validate:details；npm run validate:stories；npm run validate:timing；npm run validate:questions；npm run validate:receivable；npm run validate:product；npm run validate:authored；npm test。结构校验与断法审核分别报告。

当前已有知识层、排盘和二维联调，尚无完整3D手机应用。按V7继续实现可运行的移动竖屏道观体验。用户授权的可逆开发直接实施，不反复询问已确认方向。
