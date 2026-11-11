# 问卦 · 梅花易数 Wengua Meihua

为第一视角道观占卦手机应用准备的**古籍知识库、确定性排盘模块**，以及基于它的**手机应用** [`apps/mobile`](apps/mobile/README.md)（React + Three.js + Capacitor）：入观、三炷香、叩首、石桌刻卦显出本卦/互卦/变卦，点爻查看经文与依据，离线可用。

```bash
npm run app:install
npm run app:dev     # http://127.0.0.1:5173（浏览器竖屏手机模式）
npm run app:test
```

**给 Claude 的入口：[CLAUDE.md](CLAUDE.md) → [新版完整开发 prompt](docs/CLAUDE_BUILD_PROMPT_V2.md)。

已加入新上传的《周易六十四卦详解》：8,770段、315,194字，128条本轮编辑记录，64段串贴/错误片段隔离；正式详解与384条变卦映射已接通。见[本轮审校报告](docs/DETAILS_AUDIT.md)和[数据库及接口](docs/DATABASE_AND_DETAILS.md)。长篇注解作为显式参考阅读，未认证的正文不写入正式数据库事实表。**

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
