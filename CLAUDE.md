# Claude repository instructions

最新批次：客户尾款 `domain-10-receivable` 已写入1,920篇基础全文，另有16,617个预写空亡情境版本，见 [第1批成稿与说明](docs/RECEIVABLE_BATCH_01.md)。384条动爻应用与64条求款说明另写，全文在构建时预生成；运行时只读取排定的段落及填日期，不调用模型。不是逐篇手写1,920次，审阅方法和限制在批次说明中公开。普通60日干支已穷举，未知自定义释放状态仍返回缺稿。进度保存在 `data/question-stories/batch-progress.json`，下一项为借款收回；没有后台写作任务。

正式占问只允许“选择领域 → 选择具体事项”，取消自由提问和AI分类。18领域各5项，共90项，见 [事项清单](docs/QUESTION_CHOICES.md)。`data/question-items.json`保存固定ID、问法、回答范围、应事和取期政策；用 `createQuestionRepository().getContent` 精确调用，不直接用旧 `getStory` 作为具体事项成稿。75项占问已完成1项基础批次，另有15项古籍查阅说明；缺稿返回 `pending-authoring`，禁止回退到领域通用稿或其他事项。75项若各覆盖1,920种盘与月令，至少144,000篇基础稿，实际覆盖需如实记录。

最新用户确认：最近十篇完整断语的口吻已经认可。先读 [已确认文风与未来日期](docs/APPROVED_STORY_STYLE.md)，1,920篇已具备重写授权；这次仅新增日期约束，基础故事尚未逐篇改写。新盘所有预测日期必须不早于起卦日，近期先筛本月剩余日期、没有合格候选再查下月；调用 `findUpcomingCivilDayMatches` / `formatUpcomingCivilDay`。正文要完整预写，日期自然融入事情发展。

本仓库是用户“问卦 / Wengua”手机应用的知识与排盘基础。继续开发前按顺序阅读：

1. `README.md`
2. `docs/CLAUDE_BUILD_PROMPT_V5.md`（最新完整产品任务）
3. `docs/RULES.md`、`docs/DATA_AND_API.md`、`docs/DATABASE_AND_DETAILS.md`
4. `docs/EDITORIAL.md`、`docs/DETAILS_AUDIT.md`、`data/issues.json`

先执行 `npm run build:questions` 生成完整故事SQL，再执行 `npm run validate`、`npm run validate:details`、`npm run validate:stories`、`npm run validate:questions`、`npm run validate:receivable`、`npm test`；需要观察文字和动爻联动时执行 `npm run demo`。

## 必须保持

- 最新用户等级订正：44 天风姤展示“中卦”，不是上上卦；中档别名分类见 `grade.canonicalGrade`。
- `sources/original` 的三份上传文件不改写。新订正添加记录并修改生成脚本。
- 六爻从下向上编号；本卦动爻发光，取本卦对应爻辞。动者为用、静者为体。
- 互卦不能凭空多出独立动爻，用九/用六不能当第七爻。
- 卦的固定基础等级与结合月令、空亡的情境解读分开，不能让模型改写基础等级。
- 真空判断使用起卦时证据，后续填冲不自动复活真空。应期优先填实、次选冲实。合空默认禁用，须显式开启且满足事件和假空条件。
- 用户新提供的规则优先于旧消息与当前实现；更新来源、规则、测试、文档，禁止只改 UI 文案。
- 无规则支持的数字能量、综合等级、成功率、确定日期不得杜撰。
- 古籍内部矛盾不直接导入结构算法。不要把民间吉凶诗当《周易》象传。

当前已具备资料包、排盘与二维联调演示；还没有完整 3D 应用。按完整 prompt 从可运行的移动竖屏道观体验继续落实。用户要求行动时直接实施，不停留在规划说明。

新增详解接口为 `createDetailsRepository`；数据库导入为 `data/knowledge.sql`。`sources/commentary` 只供显式参考阅读，`sources/review` 隔离稿不进入正式运行时或事实表。点击爻时用原卦ID及自下至上的1–6爻位，不将参考注解反向改写结构。

月令故事接口 `createNarrativeRepository` 已接通：1,920篇基础故事、18门类、空亡及应期；使用五类月令，不以12个月支为故事索引。古籍案例的原断与反馈分开，不把案例反馈写成新用户未来。详见 docs/STORIES_AND_TIMING.md。

最新故事输出组合版本1.1.0，必须读取 `getStory` 的 `verdict`、`movingLine`、`timingDecision` 和最终 `story`。不要直接展示旧版 `getBase().story`、`baseStory`、SQL基础段落或旧 `timing.text`。故事必须给具体结果，并解释本卦真实动爻怎么改变事情；正文不以“需要一起看”“可以观察”等套话代替结论。详见 docs/DIRECT_STORIES.md。直接下卦断不等于编造金额、人物、日期或声称现实必然应验。

应期专项已核到审核版本1.0.0、故事组合版本1.2.0，优先阅读 docs/TIMING_AUDIT.md。使用 `timingDecision.event`（应事和吉凶）与 `period`（方法、单位、支期、轮次）；`calendarOccurrences`不是确定应验日。按18门各自条文处理，不统一套最近支日或全部不成便不取期。先导入 knowledge.sql 再导入 timing-audit.sql。文风现已确认，按最新口吻逐篇重写，不把句式批量替换冒充完整成稿。

日期与全盘补充：已预存未来两年731天的公历—干支日表，按完整日期查表无需用户输入时分或城市；`getCivilDay`、`findCivilDayMatches`提供日期换算。`getStory().fullChart` / `buildFullChartRelations`提供六个可见经卦、15组五行关系及制克体者/连续生扶路径，始终以原体为主。行动候选日与事件应验日期必须分开，不能编造成功率。参见 [日期与全盘说明](docs/DAY_CALENDAR_AND_FULL_CHART.md)。1,920篇现已获文风确认，存量行仍待逐篇重写。
