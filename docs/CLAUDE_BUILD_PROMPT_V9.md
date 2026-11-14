当前接入以 [终校记录](INTERVIEW_FINAL_REVIEW_20261112.md)、[实时接口](LIVE_CONTEXT_AND_SHORT_READINGS.md) 及本文件的 [正式断语固定格式](#正式断语的固定格式) 为准。面试通过按经典体用及月令查稿，原 60 篇和后来逐篇重写的 1,860 篇均有作者源。以下为历史开发交接。

基础库已补齐：问项“这次面试能通过吗”，64卦、384个普通动爻组合、十二月令各自有键，共4,608槽位，去重全文1,920份。全部阅读目录INTERVIEW_PASS_ALL_BASES.md；新判据、取期与写作方式见INTERVIEW_BASE_POLICY.md。

保留原60份逐篇稿，新增1,860份为384条专门动爻解读、明确判据与统一旺衰事实的离线预编译稿。每份已有完整自然简断、四段详断、来源、反证与取期声明，运行时只读全文、按真实日期换日号。manualWholeArticleReview:false与独立审核pending必须保持真实，不擅自改为真人专家审过或用户逐篇验收。基础完成不等于所有旬空组合或最终Offer问题已完成。

体卦始终沿用原体，体互先于用互。新的季节判据没有数字权重：弱克体与强生扶不能混同，无生体且本用克体不能翻吉；有充分主局与中段支持时，末后弱克仍需说明而不一概压倒整盘。动爻的分类来自逐条解读，不扫描一个吉凶字作总分；全部原文保留，数字不直接转成轮数、人数或真实等待天数。

数据入口仍createProductRepository，界面字段short、narrativeParagraphs、timingSection、calculationExplanation不变。64个hex-NNN.json各存30份正文、72个月令索引，勿整库预加载。旧五气类输入不冒称真实月令。新日期形式包括有生体的成就候选、克体的受阻候选、仅耗费时的阶段投入窗口，以及无克体前提下的体卦时序；不同事件不能混成一个最终通知日。

SQL构建已调整：data/authored-readings.sql只含表结构；先npm run build:interview生成dist/authored-readings.sql，再npm run build:sqlite生成完整数据库。完整npm run build:data也会完成。不要只导表结构就宣称已经导入1,920份正文。

当前显示规则：简断只讲事情，不出现应期或计算提示。应期由timingSection单独展示，显示referenceNote及每个windows条目的event、valence、text，日期已经按本次起卦日填好。详断使用narrativeParagraphs四段，计算说明继续折叠。paragraphs/story为保留应期的完整导出格式，勿与独立日期栏重复呈现。

实际月令显示输入的monthBranch，包括共用全文的卯月等；只有五类气时显示具体月令未提供，不能替换成代表月份。不得把JSON中的facts.referenceContext当作用户当下资料，displayInUserResult:false。2027、2028年等真实起卦的日干支、旬空、日期由程序重算；具体接入见LIVE_CONTEXT_AND_SHORT_READINGS.md。

本轮修订：interview-pass-2.0.0，详见INTERVIEW_REVIEW_20261111.md。颐六二与蛊九三的夏、土月共4份结论已修正。不得把体旺、互卦比和独立当作推翻用克体且无生体的通过依据。

简断与paragraphs只显示断语及应期；calculationExplanation由独立的“计算说明”折叠框展示。半空只在后者出现，规则版本trigram-void-2.1.0，来源层为补充规则。

每个日期窗口都有独立event、valence、eventScope、targetBranches、calculationBasis与displayedDates。水风井九五的过程受阻和有利候选仍分开。日期算法的技术对照不替代应期断法独立审核；independentInterpretationReview保持pending，不擅自标成用户验收。

当前首问基础库已有1,920份完整正文，覆盖384种盘的全部十二月令，共4,608/4,608个槽位；核心空亡另有变化而未写时保留待写。全文见INTERVIEW_PASS_ALL_MONTHS.md，实际统计见data/authored-readings/progress.json。

开发直接调用已写断语，不在客户端或服务器临时让AI补写。简断、详断、动爻、判断依据与应期共用同一decisionId；无未换算日期标记。

# 问卦 / 三清问道：软件开发任务 V9

仓库：https://github.com/turnupmason/Wengua_Meihua

用户已通过V3十篇简断与详断，要求保持这一口吻与解释方式。断语由本助手负责撰写；Claude负责软件搭建、数据接入与交互，不在运行时让模型自行决定吉凶或补写未覆盖的故事。验收记录精确绑定原稿，见 data/editorial-acceptance.json，不重复请求文风确认。

先读 CLAUDE.md、docs/PRODUCT_CATEGORIES_V1.md、docs/STORY_GENERATION_STANDARD_V3.md、docs/INTERPRETATION_AUDIT_V2.md，再检查实际代码与数据。V9覆盖旧版“18个产品领域、每领域固定5问”及更早的大领域套稿口径。

## 正式断语的固定格式

以 [面试逐卦阅读文档](interview-pass/hex-001.md#九二动--寅月卯月) 和现有正式读取接口为基准。本节是当前交付约定。所有领域复用同一个阅读文档渲染器 `scripts/authored-reading-document.mjs`。后续写作只填该事项的正文、依据和已核定的应期。未经用户明确要求，禁止自改栏目名、字段名、字段类型、标点、顺序、标题层级、折叠区、文件路径、匹配键或显示结构。涉及软件抓取的格式改动，须同步验证既有消费者。

晋升加薪的完整作者源、阅读目录和取期依据见 [晋升加薪断语](promotion-pay/README.md) 与 [晋升加薪占法](PROMOTION_PAY_POLICY.md)。后续逐篇复核时，对全库检查重复句和反复出现的通用起句，改稿须写回作者源，再重建正文、摘要、索引和阅读文档。新写事项按经典体用、动爻与实际月令交付，旬空章节供查阅历史规则。

每篇 Markdown 按以下固定顺序输出，栏目使用全角冒号，段落间空一行：

1. 二级标题 `## 九二动 · 寅月、卯月`，保留「动」和每个月的「月」。
2. 断语标题、本卦 → 互卦 → 变卦、独立一行「简断」、简断正文。
3. `开局：`、`过程：`、`结局：`、`应期：`、`总断：`。
4. `古籍依据：`、`动爻完整原文：`，然后用 `<details>` 和 `<summary>计算说明</summary>` 折叠计算依据。

已有日级依据时，「应期：以下为传统推算的参考窗口。」下一行显示「本月×号」或「下月×号」及对应事件和吉凶。地支、取期方法、日期换算和适用条件保存于计算说明和结构化字段。静态阅读文档统一以 2026-11-11 演示并在页首标明，供核对排版。Claude 或客户端接入时传本次实际当地起卦日 `castingDate`，读取 `timingSection.windows` 的 `displayedDates` 和 `text`，保存 `castingDate` 与公历日期。新盘从起卦日查起，先取本月，若本月没有合格日则匹配下月，每个事件至多显示最早的两个候选日。历史盘回看可传 `viewDate` 以显示准确月份，原候选过期仍按原日存档。日支每 12 天轮转，完整干支每 60 天轮转，按原声明匹配，已过应期不会自动顺延。禁止以只列地支、日期占位符或另一套排版交付已有取期的断语。确无可据取期时，沿用已定说明并记录原因。

取期先写明所应事件，再据实际进程定年、月、日、时，接着核原起卦法与适用的取期条文，最后判断何时的条件足以应事。先天卦气按所应节点与事项取支，受克本身不构成补缺或通关的依据。后天原数另核物卦数、方位卦数、时数及占者当时的动静；取半、取倍、取本数见《老人有忧色占》，仅在原数与事理适用时采用。完整动爻序号用于识别爻辞，后天端法加的是起卦时数。外应需现场如实记录并说明它如何与卦和事项相应。详见 [应期审查](TIMING_AUDIT.md)。

「这次考试能通过吗」使用 career.exams.exam，目录见 [考试断语](exam/README.md)，逐篇依据见 [考试断法](EXAM_POLICY.md)。应用直接读取所选问项的固定键和已有稿件字段。每篇最多一个日级事件窗口，按已声明的五行卦气或经卦时序和实际起卦日换算，日期取值与方法可在计算说明核对。资格证取得、岗位竞聘和其他选拔按目录各自的具体目标写作。

运行时沿用 `createProductRepository().getContent` 和字段 `short`、`narrativeParagraphs`、`timingSection`、`calculationExplanation`、`paragraphs`、`story`。日期窗口继续使用 `event`、`valence`、`text`、`displayedDates`、`eventScope`、`targetBranches`、`calculationBasis`。软件显示仍使用原组件，抓取时保持既有的 `questionId`、本卦、动爻、月令键和稿件字段。每次重建后按实际输出校验栏目、取期结果和索引，发现格式漂移先修正再交付。

## 正式产品分类

| 编号 | 领域 | 细分项 | 单事项入口 |
| --- | --- | --- | --- |
| 01 | 事业工作 | 6 | 16 |
| 02 | 财富财运 | 6 | 18 |
| 03 | 感情姻缘 | 6 | 19 |
| 04 | 健康疾病 | 4 | 8 |
| 05 | 家庭家宅 | 5 | 13 |
| 06 | 寻人失物 | 4 | 8 |

现行导航为六大领域和 31 个细分入口，目录保存 80 个现用问项和 3 个历史问项。名称、顺序和归属见 [正式产品分类 V2](PRODUCT_CATEGORIES_V1.md)。读取 subcategoryId 定位导航，固定问项继续使用原有 ID。

data/product-categories.json 为产品目录，sources/editorial/product-taxonomy.mjs 为编辑源。18个古籍门类及原90个固定问法仍作为内部来源和兼容接口保留，产品categoryId与古籍domainId分开。

同义问法可共用类型，各问项按目录指定的范围独立解读。面试通过、最终录用，卖出、理想价格，复合、复合后稳定，冷战和好、关系改善，项目完成、项目回本，订单成交、接受原条件分别处理。本次晋升和随岗加薪是同一问项，依任用结果一并解读，原年度加薪仅用于历史兼容。

选择路径：领域 → 细分类型 → 具体问题。只有需要进一步明确范围时，再选物品类型、所问年份、购买用途等辅助字段。备注可作为个人记录，但不参与AI分类或改变实际所问。

## 产品接口

使用 createProductRepository({library})：

```js
const product = createProductRepository({library});
const catalog = await product.getCatalog();
const result = await product.getContent({
  questionId: 'career.interview.interview-pass',
  primaryId: 48,
  movingLine: 5,
  monthBranch: '亥',
  castingDate: castLocalDate, // 本次起卦的当地 YYYY-MM-DD
  timingScale: 'day',
  timingContext: {castingMethod:'pre-heaven', periodMethod:'element-qi'}
});
```

listSubcategories(categoryId)、listQuestions(subcategoryId)、getQuestion(questionId)用于三级选择。context只接受目录列明的辅助字段，不接受任意问题文本。未知ID、跨类选择、错误类型和手动指定legacyQuestionId均拒绝。

显式legacyQuestionId或legacyBindings才能连接内部固定问法，并校验question_type与来源范围。缺少精确稿件返回pending-authoring，旧稿未完成专业复核返回pending-review，不返回其他事项或领域通用稿。

requires-context表示先补一个明确的辅助选项。reference为传统查阅，guidance为实际步骤说明，两者不生成预测结论，也不需要先排盘。reference/guidance页面隐藏卦象、吉凶、月令能量和临床风险式显示。

## 边界与实际帮助

健康8项保留用户的细分名称和常见问法，实际入口为传统术语与象意查阅。不诊断、不定位病灶、不评估病情轻重、不预测治疗或手术结果，不据此建议调整医疗方案。真实症状、治疗、手术、调养由医疗专业人员判断。

暗恋心意可以呈现传统关系取象，不核实对方内心；不能用婚可成证明喜欢。合伙可靠性不核实信用或指认欺骗。投资分支须专门审核，不生成收益保证、交易指令或个别产品推荐。

失物、宠物、人员失联分别设置question_type。恢复联系不是行人归期，寻找人不能套寻找物品。人员失联与寻人线索先给现实核实和适当求助步骤，不等待占断或应期。宠物先实际寻找、联系收容所和相关机构。

手机优先提示查找、丢失模式或远程锁定与账户保护；钱包优先核查卡片、必要时联系发卡行锁卡和核查交易。传统方位只作补充线索，不声称已定位或已知真实轨迹。

## 断语与数据

保留三层：程序计算的卦象事实；处理相反证据的专业结论；自然中文。完整读取动爻并保留吉凶条件。所有经卦同用旺相休囚死，不给有利方和不利方不同标准。一个原体贯穿，候选间接路径不自动生效。

简断60–120汉字；详断为开局、过程、结局、总断；两者绑定同一decisionId。内部审核语不进入正文，不编造已发生事件、真实心理、谈判轮次、金额、概率、古案反馈或未经独立核算的日期。④⑦冲突判例只在登记前提下采用，不扩张成通用公式。

「事业工作 → 跳槽去留」使用 `career.job-change.decision`。同篇简断、结局和总断应交代现职与已明确的新工作如何取舍，以及现在能否辞职。适合选择新岗位时，仍需分别核验入职与离岗的衔接，写清可办理还是宜缓。旧的两个分问只供历史记录读取。使用同一套栏目、字段和应期日历。

「跳槽去留」已有 1,920 篇逐篇作者核读正文，384 种基础盘及 4,608 个月令键均已覆盖。应期由本次起卦日算出，按参与节点的五行取支，每个事件最多显示两个候选日。接口提供事件与吉、凶、耗三类标记，耗指该阶段的投入。81 篇缺乏可核的日级依据，原因保存在计算说明。正文与核查记录见[跳槽去留目录](job-change/README.md)及[断法与出处](JOB_CHANGE_POLICY.md)。

十篇内容和口吻已通过，不代表已覆盖所有盘、旬空和应期条件。新分支、比较判断、投资、宠物、恢复联系、择时等方法仍按各自来源补齐，不因目录有按钮就声称断法已完成。

新稿数量为384种基础盘×12月令＝4,608个基础槽位/具体预测问项。互卦、变卦由本卦及动爻确定，不再额外相乘。相同完整文字可以去重存储，但十二月令索引分别保留；健康查阅与现实步骤不乘盘。

data/product-authoring-plan.json记录类型、来源、稿件覆盖及已通过样稿，不是后台写作任务。原1,920篇尾款旧批次仍需按V3修订；不得将旧批次的结构标记当完整专业批准。

## 手机体验

移动竖屏，第一视角进入道观，在高大的三清像前行礼、上三炷香，石桌逐渐显出本卦、互卦、变卦。仪式可跳过，可减少动态效果，设备性能不足时降级。

石桌显示卦名、固定等级、体用标记与方向清楚的生克箭头，文字简洁。点击后展开简断、详断、原文依据。固定卦等与情境总断分开；44天风姤展示中卦。动侧为用、静侧为体，真实动爻自下而上1–6，只在本卦发光并取该卦该爻文本；互卦无独立动爻，用九/用六不是第七爻。

健康查阅、现实寻人线索等信息入口直接进入相应说明，不用仪式或付费步骤延迟实际帮助。其余流程为选择问题、确认、仪式、显卦、阅读、保存。个人历史保存问题类型、辅助字段、完整起卦日期与原窗口，不随阅读日重写结果。

## 构建和数据库

npm run build:data生成所有资料。npm run build:product单独重建产品目录及SQL。data/product-categories.sql在knowledge.sql和question-items.sql之后导入；npm run build:sqlite自动合并到dist/wengua.sqlite。原上传文件、古籍事实和等级不改写。

运行全部现有validate、validate:product与npm test。先npm run demo，再用python3 scripts/check-product-ui.py可做可选浏览器联调，需要环境已有Playwright和Chromium。

交付区分分类已接通、参考说明已写、具体断语已生成、用户已通过样稿以及仍待覆盖的规则；不虚报后台执行、完整覆盖或百分之百现实预测准确。按已确认方向继续可逆开发，不重复请求已给出的文风和产品分类确认。

## 十二月令 JSON 读取

月令采用monthBranch，取寅、卯、辰、巳、午、未、申、酉、戌、亥、子、丑之一。月令由起卦数据提供；没有实现节气算法前保持显式选择，不把公历月数当月令。src/month-slots.js记录十二槽位与五态旺衰的映射：寅卯木，巳午火，申酉金，亥子水，辰未戌丑土。

先读data/authored-readings/interview-pass/index.json，再按primaryId只读hex-NNN.json。分片的monthSlots[`${movingLine}:${monthBranch}`]是rows中的整数索引。rows保存完整写定的简断与四段详断、全动爻原文、反例、判断和应期声明。一个相同全文只有一份，十二月各自有键。仓库接口已经完成查取、完整性核对与日期换算，优先调用接口；自行接移动端时保持相同校验。

缓存仅保留小索引和最近两个卦分片。SQL读取authored_product_month_slots按question_id、hexagram_id、moving_line、month_branch选行，再关联authored_product_manuscripts。未覆盖的盘或需要另写的核心空亡不近似匹配。

## 历史记录中的八卦配支与空亡

以下为历史规则，后续正式断语使用经典体用、动爻与月令。历史扩展详见 docs/VOID_POLICY_V2.md。乾戌亥、兑酉、离午、震卯、巽辰巳、坎子、艮丑寅、坤未申。全中为全空，双支中一支为半空，定性减力而非整卦取消。全空命中不直接替代旺相、发动、生扶及衰极失效条件。没有上盘或核心影响不变时可读基础稿；普通互卦静空不另写情节或独立应期。核心变化未写就返回pending-authoring。

用户结果里不要追加关于用户批准规则的尾注，来源保留内部。依据只展示适合用户阅读的古籍篇名。新稿没有为普通静空自动排填冲日期；需要核心出空应期的稿件必须另有明确事件、吉凶和可复算条件。
