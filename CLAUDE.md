# Claude repository instructions

本仓库是用户“问卦 / Wengua”手机应用的知识与排盘基础。继续开发前按顺序阅读：

1. `README.md`
2. `docs/CLAUDE_BUILD_PROMPT_V2.md`（最新完整产品任务）
3. `docs/RULES.md`、`docs/DATA_AND_API.md`、`docs/DATABASE_AND_DETAILS.md`
4. `docs/EDITORIAL.md`、`docs/DETAILS_AUDIT.md`、`data/issues.json`

先执行 `npm run validate`、`npm run validate:details`、`npm test`；需要观察文字和动爻联动时执行 `npm run demo`。

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

手机应用在 `apps/mobile`（说明见其 README）：三维道观、仪式状态机、石桌刻卦、详情面板、历法适配、本地历史、二维降级、Capacitor 原生壳。改动应用后运行 `npm run app:test` 与 `npm run app:build`。应用通过 `@knowledge` 别名直接导入 `src/index.js`，不得在 UI 里复制排盘算法。用户要求行动时直接实施，不停留在规划说明。

Windows 注意：仓库用 `.gitattributes` 固定 LF，原文件哈希才能通过；Python 脚本经 `scripts/run-python.mjs` 以 UTF-8 模式运行。

新增详解接口为 `createDetailsRepository`；数据库导入为 `data/knowledge.sql`。`sources/commentary` 只供显式参考阅读，`sources/review` 隔离稿不进入正式运行时或事实表。点击爻时用原卦ID及自下至上的1–6爻位，不将参考注解反向改写结构。
