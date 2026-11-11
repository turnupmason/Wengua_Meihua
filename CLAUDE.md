# Claude repository instructions

正式产品入口已定为6大类、52细分、81个单事项，见 [正式分类](docs/PRODUCT_CATEGORIES_V1.md)。使用 createProductRepository，原18门古籍来源和旧90问保留在内部。

最新断语标准为 [V3规范](docs/STORY_GENERATION_STANDARD_V3.md)，[十篇简断与详断](docs/TEN_READINGS_V3.md)由本助手负责撰写，开发侧接入已写稿件。第一层卦象事实、第二层专业结论、第三层自然文字分开；简详绑定同一结论。十篇V3内容与文风已获用户通过，验收记录见 data/editorial-acceptance.json，绑定原稿摘要；不重复请求文风确认。接受范围不自动扩展到其他盘、旬空或精确应期。

最新入口：[开发交接 V7](docs/CLAUDE_BUILD_PROMPT_V7.md)，先读 [断语审核 V2](docs/INTERPRETATION_AUDIT_V2.md)。用户最新明确：每个领域细分具体问题，每篇按九项审查。V7覆盖旧版大领域套稿、任意传递关系和旧稿可发布的口径。

旧批次真实状态：客户尾款已生成1,920篇基础稿、16,617个空亡版本，九项断法审核通过和可发布数为0。旧 reviewStatus=reviewed 仅代表结构标记。旧稿存在月令适用不完整、间接关系缺条件审核、部分空亡和应期依据不足；保留供修订，不作为正式结果。进度在 data/question-stories/batch-progress.json，无后台写作任务。不将旧编写器换名继续扩批。

## 继续开发

1. 阅读 README.md、docs/CLAUDE_BUILD_PROMPT_V7.md、docs/INTERPRETATION_AUDIT_V2.md。
2. 阅读 docs/RULES.md、docs/DATA_AND_API.md、docs/DATABASE_AND_DETAILS.md、docs/EDITORIAL.md、docs/DETAILS_AUDIT.md 和 data/issues.json；冲突按V7和用户最新要求处理。
3. 先构建测试。排盘、资料阅读、3D仪式可继续开发；正式断语遵循审核状态。
4. 按已通过V3继续编写，保留三层数据、简详同结论和具体问题边界。新分支逐项补齐来源及覆盖，不把十篇重复送审文风；不宣称百分之百现实预测正确。

## 必须保持

- sources/original 和上传原文不改写；订正有记录和出处。参考解释不能反向修改六爻结构，隔离片段不能进入事实表。
- 44天风姤展示中卦，分类中中；固定卦等与情境总断分开。
- 六爻自下向上1–6，本卦真实动爻发光，点击取本卦该爻资料；动侧为用、静侧为体。互卦无独立动爻，用九/用六不是第七爻。
- 一个原体贯穿。用最紧、互次之、变又次之；体互先于用互。解释开局、过程、结局和反例，不靠一个克字或变卦包办整盘。
- 完整五态用 assessSeasonalQi / buildInterpretationEvidence，所有经卦同表。旧 createReading.strength 保留兼容语义，不能混用。金休仍克木，火死不等于零作用或真空，不加自创倍率。
- 月令气类不是月支或公历月份。节气和四季土边界尚未定，演示明确选择气类；自动选择须另补历法与测试。
- 直接关系先看。两段候选路径不是生效的解围规则，approvedIndirectRules 当前为空。不得自行串联或重复累计原体。
- 旬空是用户扩展；后天方位配支不是纳甲。部分命中只标记，不判整卦空、不推半数力量。真空需起卦当时独立证据，后续填冲不自动复活；填优先、冲次之，合空默认不用作通用出空。
- 应期先审核具体事件、吉凶、尺度、方法、轮次，再换日期。近期按日先本月余日、无候选再查下月实际干支；新盘不取过去日期，旧盘不滚动改期。按日可不填时分，按时或自动节气月令另需时间上下文。
- 正文开局、过程、结局、总断，像正常说话，不用星号。专业依据放详情，允许有依据的条件与倾向。不得编心理、金额、人物、概率、确定日期或古案反馈。

## 事项与正式接口

产品层读取 data/product-categories.json：6大类52细分，81个单事项。18个原典门类和旧90问是内部兼容来源，不是产品一级菜单。读取 question_type、回答范围、来源和辅助字段；辅助字段不由AI分类。复合与成婚不同；婚可成不能证明喜欢自己；失物不能代替失联人员。前端可另分导航大类，但保留原门类绑定。备注如保留，仅个人记录，不参与AI分类，不声称已回答备注里的其他问题。

createProductRepository({library}).getContent 精确匹配产品事项；仅显式同范围连接才调用内部 createQuestionRepository。未写稿为 pending-authoring；已有未过九项为 pending-review，story:null、空段落、productionAllowed:false，不输出占期。15项查阅为 reference。正式产品不得回退其他事项或旧领域通用稿。

editorialPreview:true 仅内部审阅，返回 review-preview；未审稿永不 ready。其日期 resolved 只代表旧规则下日历转换成功，interpretationReviewed:false。data/interpretation-reviews.json 目前无批准记录，九项须绑定精确内容、上下文、版本及证据定位、理由、审核签名。填满字段不代表实质审核成立。

SQL全文为 structural-only 内部稿，生产只查 approved_fixed_question_stories，目前0行。旧导出器拒绝非零批准数；未来实现精确回执导出后再启用，不靠改计数放行。旧 getStory、基础SQL和资源字典不绕过新门槛展示正式结果。

## 验证与交付

npm run build:data；npm run validate；npm run validate:details；npm run validate:stories；npm run validate:timing；npm run validate:questions；npm run validate:receivable；npm run validate:product；npm test。结构校验与断法审核分别报告。

当前已有知识层、排盘和二维联调，尚无完整3D手机应用。按V7继续实现可运行的移动竖屏道观体验。用户授权的可逆开发直接实施，不反复询问已确认方向。
