# 断语全库复核、改判与润色 · 开发 prompt V1（2026-11-18）

> 用法：在新对话里说「请完整阅读并执行 docs/CLAUDE_READING_REVIEW_PROMPT_V1.md」。本文件与 CLAUDE.md 冲突时，以本文件为准；未提到的仍按 CLAUDE.md、V9 和 V5 执行。

## 你的身份与任务

你是一名精通《梅花易数》体用法的易学审稿人，同时负责文学润色。用户本人是易学师傅，也是这批断语的最终审定人。

任务分两件：
1. **专业复核与改判。** 逐篇对照古籍，重新审查已写定的全部断语。判得过严、依据不足、与古法相悖的，改判并重写正文。
2. **文学润色。** 改判后的稿子按 [V5 全文润色](READING_LITERARY_POLISH_V5.md) 逐篇润色。

V5 第二节「锁定既定吉凶结论」只约束润色那一步。这次复核本身就是要重新判，第一阶段允许改结论。但每次改判都必须有古籍依据和逐篇记录。

## 一、为什么要做（现状与已知问题）

以下数字取自 `data/authored-readings/*/hex-*.json` 的 `monthSlots`，详见 [复核单](review/READING_POLICY_REVIEW_20261118.md) 和 [网上卦例对照](marketing/ONLINE_CASES_20261118.md)。

### 1. 整体判得太严

每问 4,608 个盘（64 卦 × 6 动爻 × 12 月令）。只看本卦体用（用生体、体克用、比和为吉），约 60% 的盘是吉。本馆判「难」的比例：

| 问项 | 判难占比 | 体用吉却判难 |
|---|---|---|
| 面试 `career.interview.interview-pass` | 75% | 1,910 |
| 考试 `career.exams.exam` | 81% | 2,140 |
| 晋升加薪 `career.promotion-pay.promotion` | 86% | 2,318 |
| 试用期 `career.job-stability.probation` | 70% | 1,734 |
| 复合 `relationships.reconciliation.reconcile` | 51% | 1,342 |
| 新感情 `relationships.new-partner.opportunity` | 50% | 1,280 |
| 确定恋爱 `relationships.developing.relationship` | 44% | 1,110 |
| 表白 `relationships.confession.decision` | 40% | 984 |

另外两问也要一起看：
- 跳槽去留 `career.job-change.decision`：stay 874 / verify 516 / prepare 347 / switch 183。
- 工作稳定 `career.job-stability.layoff`：watch 791 / stable 512 / strained 617。

事业四问的结论只有「难」和「吉」两档，没有「有条件」。用户每五次大约四次看到「偏难」。

### 2. 判难来自三条口径

以考试为例，体用吉却判难的 2,140 个盘按原因分：

- **口径①：互卦或变卦有克体，压过本卦之吉。** 1,094 个盘。有《体用互变之诀》可依，问题在于不分克体之卦的气是强是弱，一律判难。
- **口径②：原体囚、死时，比和或体克用不算可成。** 560 个盘。现行稿件把《体用衰旺之诀》「宜盛不宜衰」用成了翻案条件。旺衰本该决定快慢、难易和程度，现在却直接把吉翻成难。
- **口径③：体有力、全盘无克体，仍因爻辞或「无直接生体」判难。** 486 个盘。现行口径把《占卦诀》「无生体而有克体」的门槛扩大成「凡无直接生体即从严」，又让凶辞单独推翻全盘体用。最可疑的一组是用生体、体旺相、全盘无克体却判难：面试 28、考试 44、晋升 86、试用期 4 个盘，集中在屯九五、屯上六、丰上六等卦爻。

### 3. 网上卦例对不上

原帖记了结果的 5 例，本馆 4 例相反、1 例部分相反。两例考试问项完全对应，都是被上面的口径判难的：
- 水风井九五、辰月（口径②），原帖结果：考过了。
- 水雷屯上六、子月（口径③），原帖结果：笔试第二。

网友自述样本少，只作线索，不作判据。

### 4. 正文满是计算腔

全部 22,730 条稿件的开局、过程、结局都含「土令死坎本用仍生囚巽」「体互兑金土相」这类计算语言，读者看不懂。CLAUDE.md 要求正文像正常说话，专业依据放在计算说明里。简断基本没有这个问题。

### 5. 没有真人审读记录

每条稿件的 `review.actor` 都是 `assistant-author`，`independentReview` 为 `pending`，`userAcceptedThisVersion: false`。研习页里「人工逐篇审核」这句话，目前没有记录支撑。

### 6. 其他

面试一问有 5,390 份正文，结论码除 `not-pass-this-round` 和 `pass-with-conditions` 外，还有二十多个只用一两次的 `pass-after-…`，口径不统一。

## 二、古籍与依据

**先读仓库里的全部原典，逐篇引用时给出定位：**

- `sources/original/meihua-volumes-1-3.txt`：《梅花易数》三卷原文。订正见 `sources/revised/`。
- `sources/original/yijing64.txt`：《周易》六十四卦经传。
- `data/meihua-sections.json`：已切分的梅花篇目，`mh-xxx` 编号，例如 mh-056 占卜总决、mh-061 体用总诀、mh-064 人事占、mh-071 求名占、mh-116 占卦诀、mh-117 体用互变之诀、mh-119 体用衰旺之诀、mh-122 占卜克应之诀、mh-143 日应、mh-058 先天后天论。
- `sources/references/`：梅花三卷与周易六十四卦的外部版本定位。
- `sources/commentary/01–64.json`：现代注解，`trustScope` 写明只作参考，不能当作规则或古法。
- `data/catalog.json`：卦名、评等（注明出自用户提供的吉凶表，不是《周易》分级）。

**可以上网核对的公开古籍：** 维基文库《周易正义》（王弼注、孔颖达疏）、《梅花易数》其他刻本，以及程颐《伊川易传》、朱熹《周易本义》等通行注本。引用时写明书名、篇目和可核的链接或卷次。没读到的书，不得说读过。

**判断时尤其要回到原书的这几处：**
- 《体用总诀》：体用生克为主，生体吉、克体凶、比和吉。
- 《体用互变之诀》：互、变的生克如何加减。
- 《体用衰旺之诀》：衰旺决定什么。
- 《占卦诀》：「无生有克」门槛的原文和适用范围。
- 《占卜总决》：「成卦之后先看《周易》爻辞」与体用的关系。
- `meihua-volumes-1-3.txt` 第 487 行：「凡占卜决断，固以体用为主，然有不拘体用者」。注意这一段的例子：少年有喜是用不生体、互变生之而吉；牛哀鸣是互变俱克而凶。原书讲的是爻辞与体用互相印证，并没有说一句凶辞可以单独推翻全盘体用。

## 三、第一阶段：先定新口径，交用户确认

在动任何稿件之前：

1. **写口径草案。** 把上面三条口径逐条对照原文，写出新口径草案，存为 `docs/READING_POLICY_V2.md`。每条要写：
   - 原文（带定位）；
   - 现行稿件的做法；
   - 建议的新做法，以及为什么这样读原文；
   - 受影响的盘数（用脚本按 `facts.nodes`、`facts.directRelations`、`decision.outcomeCode` 统计）。
2. **方向参考，以古籍为准。** 你读完原文后若有不同看法，写出来交用户定：
   - 体用生克定吉凶的方向。旺衰定程度、快慢和难易，一般不单独翻转方向。
   - 互、变克体要看克体之卦的气。旺相之克为实；休、囚、死之克减力，可判为「有条件」。
   - 爻辞与体用相合则加强，相悖则降一档并在详断讲清，不单独翻案。原文明说「不拘体用」的情形另列。
   - 事业四问是否加「有条件」一档。新增结论码前，先查清所有消费者：`src/`、`apps/mobile/src/`、构建脚本、校验脚本、SQL 导出，并在草案里写明改动面。
3. **出样稿。** 按草案改写 24 篇样稿：每问 3 篇，选自「最可疑一组」和上面的网上卦例盘。每篇附改判前后对照和依据。
4. **停下来交用户（师傅）确认。** 用户确认口径和样稿之前，不做全量改判。用户已确认的部分，之后不再重复求批。

## 四、第二阶段：逐篇复核改判

用户确认口径后，按问项逐篇进行。顺序：考试 → 面试 → 晋升加薪 → 试用期 → 工作稳定 → 跳槽去留 → 复合 → 确定恋爱 → 新感情 → 表白。每问内部先改「最可疑一组」，再改口径③、②、①涉及的盘，最后通读其余的盘。

**每一篇都要真正读完。** 读本卦、动爻完整爻辞和小象、体用、两互、变用、月令五态、现结论和正文，然后按新口径独立判断。不得用脚本批量替换结论或句子。脚本只用来统计、定位和校验。

**每篇的复核记录**写进作者源的回执或单独的复核文件，记明：
- 稿件键；
- 原结论与新结论；
- 是否改判，以及原因；
- 主要正反证据及其古籍定位；
- 爻辞取义；
- 应期是否跟着改，以及为什么。

**改判后重写正文：**
- 标题、简断、开局、过程、结局、总断都要跟新结论一致，简断与详断同一结论。
- 开局、过程、结局用平常话讲清事情怎么起头、哪里转折、结果偏向哪边。「旺坎」「体互」「土令」这类计算语言移到计算说明里，正文不出现。
- 应期按 V9 和 [应期审查](TIMING_AUDIT.md) 重新核对：事件、吉凶和取期依据要与新结论相符。日期从实际起卦日换算，每篇至多一个日级事件窗口（以该问项现行规定为准）。

**作者源与重建：**
- 作者源在 `sources/editorial/<问项目录>/hex-NNN.json`。面试另有 `sources/editorial/interview-rewrites/` 等。改动写回作者源，不直接改 `data/authored-readings/`。
- 每改完一卦（64 卦的分片）就保存断点，记录在该问项的进度文件里。
- 同气同结论共用全文的月令，改判后若条件不再等价，就拆开分别写。

## 五、第三阶段：全文润色

每个问项改判完成后，自动按 [V5](READING_LITERARY_POLISH_V5.md) 对该问项全部正文逐篇润色。这一步锁定新结论，只改文字。按 V5 第十四节保存原稿和修改记录，回执标 `POLISH_COMPLETED`。

润色时特别注意：
- **用户要求的文风：** 像真人说话。不用「不……，也不……」句式，不用三项并列的顿号堆叠和四字词堆叠，不自夸。
- **跨篇去重：** 同一句建议、同一种结尾不要在全库反复出现（V9「跨篇检查与语言要求」）。
- **内部口吻：** 正文不出现「判断口径」「反证」「取难」等审稿用语。

## 六、必须遵守

- `sources/original` 不改写。订正写进 `sources/revised` 并记出处。
- **格式锁定。** 未经用户明确要求，不改栏目名、字段名、字段类型、顺序、匹配键、文件路径和阅读文档结构（V9「正式断语的固定格式」）。新增结论码也算字段值改动，需在第一阶段经用户同意。
- 断语不用空亡（旬空）。历史空亡章节只供查阅。
- 不编人物、金额、心理、病症、确定日期、成功率，也不编古案反馈。不承诺必然应验。
- 健康、法律、钱财方面的提示，按美国用户写，紧急情况写 911，不写 110。
- **审核状态如实记录。**
  - AI 复核记为 AI。`independentReview` 保持 `pending`，`userAcceptedThisVersion` 只在用户逐篇或按批明确接受后才改为 true，并记下接受的范围与时间。
  - 不得写「师傅已审」，除非用户真的审过。
  - 用同一模型多次调用时，注明模型和调用方式。
- 网上卦例只作线索，不作判据，也不按结果倒推改判。
- 专业冲突解决不了的，标「待核」并记下分歧，继续做其余稿件。不要为了凑完成量硬判。
- **不要停在规划。** 第一阶段交用户确认是唯一的必停点。其余时间直接做，按问项汇报实际完成量。

## 七、每个问项完成后的重建与校验

在仓库根目录：

1. 重建该问项：`npm run build:interview`、`npm run build:exam`、`npm run build:promotion-pay`、`npm run build:workplace-probation`、`npm run build:workplace-stability`、`npm run build:job-change`、`npm run build:relationship-reconciliation`、`npm run build:relationship-establishment`、`npm run build:new-relationship-opportunity`、`npm run build:confession-decision`（按问项选一个）。
2. 运行 `npm run build:data`、`npm run validate`、`npm run validate:details`、`npm run validate:stories`、`npm run validate:timing`、`npm run validate:questions`、`npm run validate:product`、`npm run validate:authored`、`npm test`。
3. 运行 `npm run app:test` 与 `npm run app:build`。改了中文文字后，运行 `npm --prefix apps/mobile run font:subset`，字体单独提交。
4. 用 `apps/mobile/server/reading.ts` 的 `answerReading`，或知识层 `createProductRepository().getContent`，抽查改判过的盘，确认线上读到的是新稿。
5. 重新统计第一节的表格（判难占比、体用吉却判难、三条口径各自的盘数），写进汇报。

结构校验与断法审核分开汇报。

## 八、交付与汇报

每个问项完成时汇报：
- 复核篇数、改判篇数（吉 → 难、难 → 吉、改为有条件，各多少）、待核篇数及原因；
- 新旧分布对照表；
- 润色完成篇数；
- 校验结果；
- 需要用户定夺的问题清单。

更新 CLAUDE.md 中与本问项相关的说明和 `data/authored-readings/progress.json`，如实写状态。研习页（`apps/mobile/src/domain/i18n.ts` 的 `studyMottoText` 等）里关于审核的说法，按实际审核记录修改。

**提交规则：** 只在用户要求时提交或推送。提交时使用 `git -c user.name=Ziao_LIu -c user.email=wtmasonliu118@gmail.com`，提交信息末尾附 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`。推送前先 fetch 并 rebase。另有其他会话可能在改同一仓库，动手前看 `git status`。
