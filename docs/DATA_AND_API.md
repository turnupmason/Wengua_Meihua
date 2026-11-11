最新产品API：createProductRepository({library})。data/product-categories.json包含6大类52细分82单事项；用listSubcategories、listQuestions及getContent({questionId,context,...})接入。categoryId与古籍domainId分开。健康返回reference，现实线索返回guidance，缺辅助字段返回requires-context；其余精确连接继续遵守待写与审核状态。见 docs/CLAUDE_BUILD_PROMPT_V7.md。

当前规则以 [开发交接 V6](CLAUDE_BUILD_PROMPT_V6.md) 和 [断语审核 V2](INTERPRETATION_AUDIT_V2.md) 为准。以下旧接口或历史批次说明中的 reviewed、ready 不代表九项断法批准。现有尾款稿正式调用为 pending-review，内部预览为 review-preview；SQL全文为 structural-only，approved_fixed_question_stories 当前0行。

# 数据与 API

## 固定事项入口

正式占问采用领域与具体事项两级选择，每领域5项、共90项；不提供自由问句或AI分类。清单与回答范围见 [QUESTION_CHOICES.md](QUESTION_CHOICES.md)。

```js
import {loadLibrary,createQuestionRepository} from '../src/index.js';
const library=await loadLibrary();
const questions=createQuestionRepository({library});
const items=await questions.listQuestions('domain-10'); // 恰好五项
const result=await questions.getContent({
 questionId:'domain-10-receivable',primaryId:48,movingLine:5,
 monthOrder:'winter-water',castingDate:'2026-11-12',timingScale:'day',
 timingContext:{castingMethod:'pre-heaven',periodMethod:'element-qi'}
});
// status='ready'，日期不早于起卦日，正文中的日期标记已全部替换。
// 这是明确指定盘、日期和取期法的演示输入，不冒充同一时间算法复现的真实起卦。
```

领域从固定ID确定；传入不匹配的领域、未知ID或自由文本会报错。完整稿要求事项、盘、月令与起卦上下文精确一致；`authored-base`仍须经过日期校核，不能立即当作已渲染的最终故事。`reference`返回已经写好的古籍说明。实际完整稿覆盖记录在 `data/question-stories/index.json`。

第1批采用段落字典压缩：一篇文章的段落内容、顺序、总断及日期插入句都已在构建时决定，客户端只按保存的索引还原全文。`getVoidProfileKey`按五个独立角色的实际空亡状态精确选稿；相同图形不意味着可以忽略真空或静空。未给日干支时，`castingDate`可自动提供日基准；已给且不一致则报错。日期取法未记录时不偷偷假定先天法，返回 `authored-base`。

## 稳定的标识与编号

卦 ID 为文王卦序 1–64。`bitsBottomUp[0]` 是初爻，`bitsBottomUp[5]` 是上爻，阳=1、阴=0。下三位为下卦，上三位为上卦。64 个结构唯一，Unicode 卦符仅用于显示，不从卦符图片反推阴阳。

爻查询采用 **1–6**，不要把 JavaScript 的数组下标直接传入。`getLineReading(id, position)` 返回 `lines[position-1]`。`specialLines` 中的用九/用六 `position=null`。

## 数据文件

| 文件 | 内容 |
| --- | --- |
| `catalog.json` | schemaVersion、contentVersion、64 卦、8 经卦，完整卦爻文本 |
| `grades.json` | 用户诗象和等级；`rawGrade` 为最终展示值，`canonicalGrade` 为五档分类 |
| `meihua-sections.json` | 三卷全文分块，每个字符在原文索引中恰被覆盖一次 |
| `domains.json` | 18 领域全文、匹配体用关系的原文片段、源章节 |
| `rule-profile.json` | 规则依据、实现选择、用户覆盖及未自动推定的边界 |
| `source-manifest.json` | 原文件 UTF-8 字节数、SHA-256、网上参考页修订号 |
| `editorial-patches.json` | 修改前后、理由和证据 |
| `reference-differences.json` | 对照本不同而保留原字的字段；不等于仍有同数量错字 |
| `issues.json` | 无法仅凭文字替换解决的古籍内部矛盾 |

`SourceRef.startChar/endChar` 为**原始上传文本的 Unicode 码点偏移**，左闭右开；不是 UTF-8 字节或 JavaScript UTF-16 下标。JavaScript 请先 `[...source]` 再切片。`startLine/endLine` 从 1 起，末行含在内。订正后文本与原文的差异通过 patch 关联，不把新文本偏移冒充原文偏移。

## 构造与读取

```js
const lib = await loadLibrary();
lib.getHexagram(44).grade.rawGrade;       // 中卦
lib.getHexagram(44).grade.canonicalGrade; // 中中卦（归档约定）
lib.getLineReading(3, 2);                 // 屯六二
lib.getChangedHexagram(49, 1);            // 咸
lib.getMutualHexagram(49);                // 姤
lib.findSections('体用');
lib.listDomains();
```

移动端离线注入：

```js
import { createLibrary } from './src/index.js';
import catalog from './data/catalog.json';
import sections from './data/meihua-sections.json';
import domains from './data/domains.json';
const lib = createLibrary({ catalog, sections, domains });
```

导入 JSON 的具体语法由所选打包器决定。所有查询对象经过深冻结，渲染前如需修改展示模型应复制，不直接改知识库。

## 起卦

`castByTimeParts({yearBranchNumber,lunarMonth,lunarDay,hourBranchNumber})`：年支与时支子1至亥12，农历月1–12、日1–30。年月日合数取上卦，加时合数取下卦与动爻。余0取8或6。只接受已经换算好的组成数，不把公历年如2026直接相加。

`castByTrigramNumbers({upperNumber,lowerNumber,movingTotal})`：明确接收上下卦数及取爻总数。它是数值底层方法，不擅自决定报数法是否加时。保存原始输入及采用的起卦法；闰月、换年、晚子时规则交给独立历法/规则适配层。

## `createReading`

输入：`primaryId`、`movingLine` 必填；`domainId` 默认人事；`calendar` 可传 `monthBranch` 或 `season`；`voidContext.ganzhi` 为明确给出的旬空依据干支，默认解释为日干支。

输出：

- `stages.primary/mutual/changed`：名称、基础等级、阴阳结构和完整详情。
- `body/use`：本卦体用位置和五行；体保持为全盘比较基准。
- `selectedMovingLine`：本卦相应爻辞、小象和两段白话。
- `nodes`：本卦、互卦、变卦上下经卦共六个节点，逐个给出月令和旬空状态。
- `edges`：体对用、体互、用互、变用的四项方向关系；变卦中沿用的体不重复计为额外力量。
- `domainPassage`：本卦关系在所选领域的古籍原句，不能直接冒充综合判定。
- `contextualAssessment.missing`：缺少时令或旬空资料时显式列出，不默认为没有影响。

`renderHexagramSVG` 返回 SVG 字符串，爻组带 `data-line-position`；样式见 `web/style.css`。3D 版使用同样的位置数据映射到 mesh，不必解析 SVG。每个爻渲染一个逻辑组，阴爻的两个半段共用同一 position。

默认互卦 `inner-lines`：下互=二三四，上互=三四五。传 `pure-use-changed` 时，仅乾坤先对其变卦取互；需同时提供动爻。这个差异必须进入历史记录。

## 空亡 API

`getXunVoid('甲子')` 返回旬首与空支；`getVoidReleaseTargets` 给每支的填、冲、合目标及默认优先级，不返回编造的公历日期。

`assessVoid(trigram, options)` 接收**起卦时**的 `strength / supported / severelyWeak / dayMonthAttacked`，以及后续节点 `filledBranches / releaseClashBranches / combineBranches`。全盘可通过 `voidContext.roleEvidence[role]` 覆盖某节点证据。角色名为 `body, use, body_mutual, use_mutual, body_inherited, changed_use`。

`supported=true` 表示有明确生扶依据，不是模型觉得“可能有人帮忙”。`severelyWeak=true` 不等于仅在源文中标“衰”；需适配层确认“衰极无气”。`dayMonthAttacked=true` 同样需输入具体证据。缺少这些信息时不自动认定真空。

`partialPolicy` 默认 `mark-only`：经卦对应两支而仅一支空时标部分命中，不直接判整个经卦失效。`any-hit`、`all-hit` 为可选操作约定。此处采用后天方位地支映射，**没有给梅花六爻偷装六爻纳甲**。

合空同时要求 `allowCombine=true`、`eventType=marriage/cooperation`、起卦证据属于动/旺/得扶假空。纯静空仅遇合不会出空；真空不会被后续节点自动复活。

## 接入 AI

模型只接收当前 reading、所选领域原文和相关源章节，负责白话表达。排卦、动爻、基础等级、月令状态、空支由代码产出。模型不得覆盖这些字段；模型输出采用独立结构并保存引用的规则 ID。没有网络或模型服务时仍能完成仪式和基础资料查询。

## 新增长篇详解

详解接口、SQLite导入、正式资料与参考阅读分层见 [DATABASE_AND_DETAILS.md](DATABASE_AND_DETAILS.md)。本轮DOCX审校范围见 [DETAILS_AUDIT.md](DETAILS_AUDIT.md)。
