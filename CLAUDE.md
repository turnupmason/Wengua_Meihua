# Claude repository instructions

本仓库是用户“问卦 / Wengua”手机应用的知识与排盘基础。继续开发前按顺序阅读：

1. `README.md`
2. `docs/CLAUDE_BUILD_PROMPT_V5.md`（最新完整产品任务）
3. `docs/RULES.md`、`docs/DATA_AND_API.md`、`docs/DATABASE_AND_DETAILS.md`
4. `docs/EDITORIAL.md`、`docs/DETAILS_AUDIT.md`、`data/issues.json`

先执行 `npm run validate`、`npm run validate:details`、`npm run validate:stories`、`npm test`；需要观察文字和动爻联动时执行 `npm run demo`。

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

应期专项已核到审核版本1.0.0、故事组合版本1.2.0，优先阅读 docs/TIMING_AUDIT.md。使用 `timingDecision.event`（应事和吉凶）与 `period`（方法、单位、支期、轮次）；`calendarOccurrences`不是确定应验日。按18门各自条文处理，不统一套最近支日或全部不成便不取期。先导入 knowledge.sql 再导入 timing-audit.sql。用户尚未说样稿合格，禁止批量改写1,920篇。

日期与全盘补充：已预存未来两年731天的公历—干支日表，按完整日期查表无需用户输入时分或城市；`getCivilDay`、`findCivilDayMatches`提供日期换算。`getStory().fullChart` / `buildFullChartRelations`提供六个可见经卦、15组五行关系及制克体者/连续生扶路径，始终以原体为主。行动候选日与事件应验日期必须分开，不能编造成功率。参见 [日期与全盘说明](docs/DAY_CALENDAR_AND_FULL_CHART.md)。1,920篇仍等待用户确认后改写。
