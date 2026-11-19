失联寻人进行中：`search.missing-contact.contact` 只问恢复本人可确认的双向联系，采用明示人事／求谋现代类推，不套行人归期、失物或宠物。目前已逐篇写作并作者全文核读 390 篇，覆盖 78 / 384 种基础盘、936 / 4,608 个月令键；284 篇有动态阶段应期、106 篇保留具体不取期原因。181 篇（434 键）具体适用问题待核，独立专业与应期审核pending。不看空亡，不做额外AI全文精修。下一键 search.missing-contact.contact / 14 / 1 / spring-wood。全库未完成。见[作者目录](docs/missing-contact/README.md)、[专项政策](docs/MISSING_CONTACT_POLICY.md)及逐卦作者回执。

宠物走失001乾至064未济已逐盘写定并作者全文核读，共1,920篇不同正文、384种基础盘、4,608个月令键，基础写作无剩余。问项 search.pets.recovery，以寻找并安全接回之事作明示求谋类推，不套失物章，不看空亡，不做额外AI全文精修。本轮原89篇未取期已逐篇重查，34篇补动态阶段阻节、55篇保留具体原因；现1,865篇有动态应期规则。146条原断法分歧已逐条查完，12篇实质改判为有条件，68条现代适用冲突仍具体待核；正文补丁lost-pet-recovery-1.0.1，独立专业与应期解释审核pending。实际进度见 [宠物目录](docs/lost-pet-recovery/README.md)，依据及限制见 [专项政策](docs/LOST_PET_RECOVERY_POLICY.md)。原完成核查与待审事项见 [收尾记录](docs/lost-pet-recovery/FINAL_AUDIT_20261119.md)。本轮取期及146条断法分歧专项进度见 [专项复核](docs/lost-pet-recovery/RECHECK_20261119.md)。

`career.interview.interview-pass` 于 2026-11-18 按考试定稿口径补判重写为 `interview-pass-3.0.0`：1,920 篇只判能过 639、过不了 1,281，与考试同盘结论逐盘一致；作者源 `sources/editorial/interview-pass/`（含 polish-v5、review-v2），由 `build-promotion-pay.mjs interview-pass` 构建。口径、回测与逐条裁定见 [补判记录](docs/review/INTERVIEW_REJUDGE_20261118.md)，写法见 [写作说明](docs/review/INTERVIEW_WRITE_BRIEF.md)。空亡旧版（interview-pass-2.0.0、`interview-rewrites/`、`interview-void-*`）只留档，不进正文。问项只涉及本轮面试。

`career.job-change.decision` 同篇比较现职与新工作并回答现在是否宜辞。已逐篇写作并作者核读 1,920 篇，覆盖 384 种基础盘和 4,608 个月令键。应期从实际起卦日换算。见[正文目录](docs/job-change/README.md)及[取义与复核记录](docs/JOB_CHANGE_POLICY.md)。

`career.promotion-pay.promotion` 于 2026-11-18 补判重写为 `promotion-pay-3.0.0`：考试定稿口径加《求名占》在任专条（盘中有克体之卦一律升不了，用户定），另有屯九五、讼上九、泰上六、遯九三四条晋升专属降判；能升 353、升不了 1,567，能升的篇第 12 栏写随岗薪资说明。作者源与考试同格式，旧稿及 timing.json 留档于 `sources/editorial/promotion-pay/legacy-v1/`。口径、回测与裁定见 [晋升补判记录](docs/review/PROMOTION_REJUDGE_20261118.md)，结论规则在 `scripts/review/promotion-verdicts.cjs`。

`career.job-stability.probation` 于 2026-11-18 补判重写为 `workplace-probation-3.0.0`：考试定稿口径加《求名占》在任专条（盘中有克体之卦一律转不了，用户定，与晋升一致），另有讼上九一条转正专属降判；能转正 368、转不了 1,552。作者源与考试同格式，旧稿留档于 `sources/editorial/workplace-probation/legacy-v1/`。口径、回测、裁定与全稿复核见 [转正补判记录](docs/review/PROBATION_REJUDGE_20261118.md)，结论规则在 `scripts/review/probation-verdicts.cjs`，测试在 `tests/workplace-probation.test.mjs`。

面试旧版（v2）原 60 篇及 1,860 篇重写稿的作者源留档于 `sources/editorial/interview-rewrites/`，`progress.json` 记的是旧版进度。独立专业审核仍为 pending。客户端读取预写字段。

每卦JSON含30份正文及72个月令键，最多缓存两个卦分片。data/authored-readings.sql现在是表结构，完整SQL经npm run build:interview写到dist/authored-readings.sql，npm run build:sqlite合并为dist/wengua.sqlite；不把大SQL与JSON全文重复提交。运行校验前先构建。

新判据及写作边界见docs/INTERVIEW_BASE_POLICY.md，最新开发入口为docs/CLAUDE_BUILD_PROMPT_V9.md。原先60篇/144槽位是历史首组数量，不能再用作当前完整覆盖统计。

# Claude repository instructions

2026-11-18 用户更新断语交付要求。当前物品找回及后续事项按既定标准逐篇写作、作者全文核读、核验古籍与卦理、检查重复和固定格式，再重建校验并交付。额外的 V5.0 单 AI 全文精修由用户明确指定时执行。既有精修成果及真实回执保留，未执行的额外精修标记为无需执行，作者核读、独立专业审核和用户验收继续分别记录。

正式断语的文档、结构化字段和应用显示遵循 [开发 prompt 的固定格式](docs/CLAUDE_BUILD_PROMPT_V9.md#正式断语的固定格式)。逐卦阅读文档以面试为基准，复用统一渲染器，严格保留栏目名、顺序、折叠结构与匹配键。已有日级取期须输出换算后的日期、事件和吉凶。未经用户明确要求禁止自行改动抓取格式。

本轮显示规则见docs/LIVE_CONTEXT_AND_SHORT_READINGS.md。60篇简断只写自然解释，不出现应期、窗口、吉应凶应或计算提示；构建和读取都以checkInterviewShort拦截。当前正文版本interview-pass-2.0.0。

实际界面读short、narrativeParagraphs、timingSection及calculationExplanation。应期单独显示timingSection，附“传统推算的参考窗口”，每窗仍保留自己的事件、吉凶和日期。paragraphs/story保留完整格式供导出或兼容，采用独立应期栏后不要再把完整paragraphs中的应期重复显示。

monthBranch是实际月令。只传旧monthOrder气类时monthBranch为null，显示“具体月令未提供”，不得把查稿代表月当作实际月令。静态facts.referenceContext只用于对照，displayInUserResult:false；用户显示只读实时calculationExplanation与timingSection，不复制2026-11-11演示日、演示干支或旬空。保存历史时日期基准固定为原起卦日，不因查看日而滚动。

本轮复核见docs/INTERVIEW_REVIEW_20261111.md。山雷颐六二、山风蛊九三的夏令与土令共4份稿已由倾向通过改为难以通过。checkInterviewDecision拦截本用克体、无直接生体且仅凭旺体或互卦比和翻吉的稿件；该检查属于本项目面试问项的来源一致性门槛，不是跨领域通用预测公式。

稿件库版本为 `interview-pass-2.0.0`，终校修订为 `interview-pass-final-review-20261112`。页面将“计算说明”单独折叠。

每条日期窗口的dateResolution.dateMatches分别保存slotId、event、valence、eventScope、targetBranches、calculationBasis与实际公历日期；不把过程凶应和最终有利候选合并。日期动态换算，不存死日号。review.independentReview及dateResolution.independentInterpretationReview均保留pending，userAcceptedThisVersion:false；代码检查与作者复核不冒充用户或独立断法审核。

当前首问为“这次面试能通过吗”。基础库已存1,920份完整正文，384种盘的十二月令全部接齐，共4,608/4,608个基础槽位。正文按实际旺衰分别写；同气类且同结论的月份明确共用全文。实际进度在data/authored-readings/progress.json；不宣称全问完成，不虚报后台任务。全文见docs/INTERVIEW_PASS_ALL_MONTHS.md。

当前检索口径为64卦×6动爻×12月令，不再以1,920作为新稿完整数量。寅卯木、巳午火、申酉金、亥子水、辰未戌丑土；采用显式月令输入，未自动推算节气或每季末十八日。monthBranch是产品月令键，monthOrder仅为五态计算与旧接口兼容字段。

JSON按本卦分片，monthSlots以动爻:月令指向行池；每次只读一个卦的分片，缓存保留索引和最近两个分片。SQL分开存authored_product_manuscripts全文与authored_product_month_slots月令映射。重复正文不重复下载。

当前和后续问项按经典体用法推进，旬空补充规则及专稿归档。面试通过按本卦、真实动爻、月令查正文，起卦日用于符合条件的应期换算。

用户已确认文风和应期，继续逐篇写作，无需重复求批。内部来源、事实和作者复核照常保留。应期必须说明事件、吉凶；过程受阻不等于失败公布日，修正窗口不等于通过日。日期按保存的起卦日换算，本月无合适候选才找下月，历史不随阅读日滚动。

既有作者逐篇核读记录保留为 author-checked。专业审核、文学润色、独立真人专业审核和用户逐篇验收按实际工作记录。文学润色通过全文对照后记为 `POLISH_COMPLETED`，专业批准状态沿用独立记录。旧 1,920 篇批次与旧审核视图另行留档。

正式产品导航为六大领域、30 个细分入口，目录保存 72 个现用问项和 11 个历史问项，见 [正式分类 V2](docs/PRODUCT_CATEGORIES_V1.md)。使用 createProductRepository，古籍门类和兼容问法在内部使用。

最新断语标准为 [V3规范](docs/STORY_GENERATION_STANDARD_V3.md)，[十篇简断与详断](docs/TEN_READINGS_V3.md)由本助手负责撰写，开发侧接入已写稿件。第一层卦象事实、第二层专业结论、第三层自然文字分开；简详绑定同一结论。十篇V3内容与文风已获用户通过，验收记录见 data/editorial-acceptance.json，绑定原稿摘要；不重复请求文风确认。接受范围不自动扩展到其他盘、旬空或精确应期。

最新入口：[开发交接 V9](docs/CLAUDE_BUILD_PROMPT_V9.md)，先读 [断语审核 V2](docs/INTERPRETATION_AUDIT_V2.md)。用户最新明确：每个领域细分具体问题，每篇按九项审查。V8覆盖旧版大领域套稿、任意传递关系和旧稿可发布的口径。

旧批次真实状态：客户尾款已生成1,920篇基础稿、16,617个空亡版本，九项断法审核通过和可发布数为0。旧 reviewStatus=reviewed 仅代表结构标记。旧稿存在月令适用不完整、间接关系缺条件审核、部分空亡和应期依据不足；保留供修订，不作为正式结果。进度在 data/question-stories/batch-progress.json，无后台写作任务。不将旧编写器换名继续扩批。

## 继续开发

1. 阅读 README.md、docs/CLAUDE_BUILD_PROMPT_V9.md、docs/INTERPRETATION_AUDIT_V2.md。
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

手机应用在 `apps/mobile`（说明见其 README）：三维道观、仪式状态机、石桌刻卦、详情面板、历法适配、本地历史、二维降级、Capacitor 原生壳。改动应用后运行 `npm run app:test` 与 `npm run app:build`。应用通过 `@knowledge` 别名直接导入 `src/index.js`，不得在 UI 里复制排盘算法。用户要求行动时直接实施，不停留在规划说明。

Windows 注意：仓库用 `.gitattributes` 固定 LF，原文件哈希才能通过；Python 脚本经 `scripts/run-python.mjs` 以 UTF-8 模式运行。

## 事项与正式接口

产品层读取 data/product-categories.json，按六大领域和 30 个细分入口导航。跳槽去留合写为 `career.job-change.decision`，同篇回答岗位取舍和辞职时机。原年度加薪及两条跳槽分问供旧记录按原 ID 读取。问项 ID 保持稳定，当前所属入口读取 subcategoryId。18个原典门类和旧90问是内部兼容来源，不是产品一级菜单。读取 question_type、回答范围、来源和辅助字段；辅助字段不由AI分类。复合与成婚不同；婚可成不能证明喜欢自己；失物不能代替失联人员。前端可另分导航大类，但保留原门类绑定。备注如保留，仅个人记录，不参与AI分类，不声称已回答备注里的其他问题。

createProductRepository({library}).getContent 精确匹配产品事项；仅显式同范围连接才调用内部 createQuestionRepository。未写稿为 pending-authoring；已有未过九项为 pending-review，story:null、空段落、productionAllowed:false，不输出占期。15项查阅为 reference。正式产品不得回退其他事项或旧领域通用稿。

editorialPreview:true 仅内部审阅，返回 review-preview；未审稿永不 ready。其日期 resolved 只代表旧规则下日历转换成功，interpretationReviewed:false。data/interpretation-reviews.json 目前无批准记录，九项须绑定精确内容、上下文、版本及证据定位、理由、审核签名。填满字段不代表实质审核成立。

SQL全文为 structural-only 内部稿，生产只查 approved_fixed_question_stories，目前0行。旧导出器拒绝非零批准数；未来实现精确回执导出后再启用，不靠改计数放行。旧 getStory、基础SQL和资源字典不绕过新门槛展示正式结果。

## 验证与交付

npm run build:data；npm run validate；npm run validate:details；npm run validate:stories；npm run validate:timing；npm run validate:questions；npm run validate:receivable；npm run validate:product；npm run validate:authored；npm test。结构校验与断法审核分别报告。

当前已有知识层、排盘和二维联调；3D手机应用在 apps/mobile，继续完善可运行的移动竖屏道观体验。用户授权的可逆开发直接实施，不反复询问已确认方向。

## 全领域核查与古籍引文（2026-11-18）

全领域诊断与逐领域顺序见 [ALL_DOMAINS_AUDIT_20261118](docs/review/ALL_DOMAINS_AUDIT_20261118.md)：一个领域做完（定类型 → 原书专章定口径 → 原书与网上卦例回测 → 补判 → 重写 → 核查 → 构建）再开下一个。核查脚本：`scripts/review/cite-audit-all.mjs`（经传引文）、`commentary-audit.mjs`（王注孔疏、本义、程传逐字，原文在 `sources/reference/`，取自维基文库）、`fact-audit-all.mjs`（旺衰与生克说法对排盘）、`policy-gap-all.cjs`（结论与定稿初判）。考试、面试两项四项核查均为 0。

## 考试问项定稿（2026-11-18）

`career.exams.exam` 已按 [断语判断口径 V2 定稿](docs/READING_POLICY_V2.md) 逐篇补判，1,920 篇只判能过或不能过：能过 639 篇，不能过 1,281 篇。定稿内容：
- 一层间接生克，以《体用》「彼灭其吉」「稍解其穷」为据，写入 `decision.indirectEffectsApplied`；
- 休为无气；
- 本用泄体或克体；
- 无生无克时以卦象主断；
- 有条件按结局拆为成或不成；
- 爻辞翻转统一闸门。

用户授权 AI 代审（`independentReview.status:'ai-delegated-approved'`，`reviewerIsHuman:false`），复核、盲断、润色三份记录分别在 `sources/editorial/exam/review-v2|blind-v2|polish-v5/`。规则实现在 `scripts/review/policy-final.cjs`，逐卦清单用 `scripts/review/final-packet.mjs`，回测用 `scripts/review/classical-backtest.cjs` 与 `scripts/review/backtest-all.mjs`。本节只适用于考试问项，其他问项复核前，要先按本类条文和结论类型（能否类、选择类、状况类）另定细则。

文字终修（2026-11-18）：1,920 篇正文按 [docs/review/TEXT_FINAL_BRIEF.md](docs/review/TEXT_FINAL_BRIEF.md) 逐篇重写，结论、判断依据、应期种类与取日不动。每篇只写一个胜负手，按本月令旺衰写轻重；生扶只写卷面上的东西，不写人、不断人。polish-v5 记录标 `textFinal`。交付门槛：`check-hex --polish` 与 `text-packet` 逐卦为 0，`similarity.mjs exam` 全库三字组超限与 8 字共用片段为 0，`repeat-scan.mjs exam 12` 无高频套话、起句、收句。
