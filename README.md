# 问卦 · 梅花易数 Wengua Meihua

为第一视角道观占卦手机应用准备的**古籍知识库、确定性排盘模块和 Claude 开发交接包**。本仓库已可读取卦象、点亮本卦动爻、查询对应爻辞与白话；完整 3D 道观应用按下方 prompt 继续开发。

**给 Claude 的入口：[CLAUDE.md](CLAUDE.md) → [新版完整开发 prompt](docs/CLAUDE_BUILD_PROMPT_V5.md)。**

最新事项入口：[每领域五项，共90项](docs/QUESTION_CHOICES.md)。正式占问只选择领域与事项，不提供自由提问或AI识别。已接通固定ID路由、JSON/SQL和联调页；75项占问完整稿尚未写齐，15项古籍查阅已有说明，缺稿不回退为别的事项。

已加入新上传的《周易六十四卦详解》：8,770段、315,194字，128条本轮编辑记录，64段串贴/错误片段隔离；正式详解与384条变卦映射已接通。见[本轮审校报告](docs/DETAILS_AUDIT.md)和[数据库及接口](docs/DATABASE_AND_DETAILS.md)。长篇注解作为显式参考阅读，未认证的正文不写入正式数据库事实表。

## 已接通的资料

| 内容 | 数量 / 说明 |
| --- | --- |
| 六十四卦 | 64 个唯一上下卦结构，含用户等级、卦辞、大象及白话 |
| 普通爻 | 384 条，初爻在最下方，精确对应爻辞、小象、白话 |
| 特殊文本 | 乾用九、坤用六单独存放，不是第七爻 |
| 白话段落 | 900 段已填齐；原有译文保留，明确错漏有修改记录 |
| 《梅花易数》 | 卷一至三全文索引，132 节，18 个占事领域 |
| 校对依据 | 67 个固定修订号的网上古典参考页，另有交叉校对链接 |
| 空亡 | 六旬表、填实/冲实、默认关闭的限定合空、真空优先逻辑 |

**最新等级订正：天风姤显示“中卦”**。五档分类仍为上上、中上、中中、中下、下下；“中卦”作为中档显示别名。原始上传表的“上卦”以及后来已被覆盖的“上上卦”要求都有来源记录。

## 本地使用

需要 Node.js 22+；只有重建资料需要 Python 3.12+。无需 API key，无第三方运行依赖。

```bash
npm run validate
npm run validate:details
npm run validate:stories
npm run validate:questions
npm test
npm run example
npm run demo
```

最后一条命令打开 `http://127.0.0.1:4173`，可选择 64 卦与六个动爻，查看三卦、发光动爻、详细原文和白话。支持点击卦名、点击每条爻和键盘操作。演示采用 SVG，不等于完整 3D 产品。

```js
import { loadLibrary, getVoidReleaseTargets } from './src/index.js';
const lib = await loadLibrary();
const reading = lib.createReading({
  primaryId: 49,
  movingLine: 1,
  domainId: 'domain-02',
  calendar: { monthBranch: '丑' },
  voidContext: { ganzhi: '甲子' }
});
console.log(reading.stages.primary.name); // 泽火革
console.log(reading.stages.mutual.name);  // 天风姤
console.log(reading.stages.changed.name); // 泽山咸
console.log(reading.selectedMovingLine);  // 革初九，不是变卦/互卦的同序爻
console.log(getVoidReleaseTargets('甲子'));
const svg = lib.renderHexagramSVG(49, { movingLine: 1, svgId: 'primary' });
```

浏览器可直接 ESM 导入；React Native 等需要通过 `createLibrary({catalog, sections, domains})` 注入 JSON，避免在移动端打包 `node:fs`。说明见 [数据与 API](docs/DATA_AND_API.md)。

## 文件入口

- [完整 Claude 开发 prompt](docs/CLAUDE_BUILD_PROMPT.md)：产品视觉、三卦石桌、交互、工程阶段、验收标准。
- [规则与优先级](docs/RULES.md)：体用、月令、全盘生克、空亡及后续修正。
- [校对报告与来源](docs/EDITORIAL.md)：修正、异文、古籍内部矛盾和使用范围。
- [数据主表](data/catalog.json)、[领域条目](data/domains.json)、[全文章节](data/meihua-sections.json)。
- [修改记录](data/editorial-patches.json)、[保留异文](data/reference-differences.json)、[问题清单](data/issues.json)。
- [源文件及哈希](data/source-manifest.json)、[机器统计](data/import-report.json)、[规则配置说明](data/rule-profile.json)。

可重复导入的数据库文件为 [data/knowledge.sql](data/knowledge.sql)。执行 `npm run build:data` 同时生成本地 `dist/wengua.sqlite`，无需外部数据库账号。

## 验证与维护

`npm test` 穷举 384 种单动爻变卦，核对动爻文字、体用、互卦、384 种发光位置；另外验证 60 个干支、六旬时间表、五行方向及空亡优先级。`npm run validate` 检查原文件哈希、900 段白话、132 节源文完整覆盖和来源链接。

修改校对规则后运行 `npm run build:data`。该操作只读取已保存的资料快照，不访问网络。不要直接修改生成的 JSON 后忘记维护生成脚本。

内容有逐条来源与版本记录，但不宣称所有传世异文已定于一尊。传统符号解释不等于现实结果保证；当前模块提供可核对的排盘与定性依据，不伪造“能量分数”或概率。

## 授权

原创程序代码适用 [MIT](LICENSE)。上传的现代白话与用户资料保留原权利状态；网上参考页保留来源、固定修订号和相应署名信息，详见 [内容来源和授权范围](SOURCES.md)。

## 预写故事与应期

已加入1,920篇月令基础故事（384种单动爻盘×春木/夏火/秋金/冬水/季月土）、18门类专用句、空亡与应期候选，以及10个古籍案例/11张复算盘。故事按目前→经过→结果展开，无需每次调用AI。用 `npm run example:story` 查看完整输出，接入见 [故事与应期说明](docs/STORIES_AND_TIMING.md)。

最终故事组合版本1.1.0已改为直接总断，接入真实动爻原文、爻意、经卦及生克变化，并输出本次采用的少量应期。产品使用 `getStory().story`；不直接展示旧基础文字。见 [断语口径](docs/DIRECT_STORIES.md)、[十篇程序试读](docs/TEN_STORY_PREVIEWS.md) 和 [最新Claude prompt](docs/CLAUDE_BUILD_PROMPT_V5.md)。

应期专项现已覆盖18门、27条核过原文及8经卦时序，另有独立SQL补充包。原文、应事、吉凶和日期轮次分别保存；下一次支日不自动当应验日。详见 [十八门应期校核](docs/TIMING_AUDIT.md)。旧样稿确定天数已撤回，最近十篇口吻已获用户确认，1,920篇基础正文仍待按该标准逐篇重写。

日期与全盘补充：已预存未来两年731天的公历—干支日表，按完整日期查表无需用户输入时分或城市；`getCivilDay`、`findCivilDayMatches`提供日期换算。`getStory().fullChart` / `buildFullChartRelations`提供六个可见经卦、15组五行关系及制克体者/连续生扶路径，始终以原体为主。行动候选日与事件应验日期必须分开，不能编造成功率。参见 [日期与全盘说明](docs/DAY_CALENDAR_AND_FULL_CHART.md)。新增 `findUpcomingCivilDayMatches` / `formatUpcomingCivilDay`，排除起卦日前的日期，先查本月剩余日期、无合格候选再查下月，历史不滚动改期；见 [已确认文风与日期约束](docs/APPROVED_STORY_STYLE.md)。
