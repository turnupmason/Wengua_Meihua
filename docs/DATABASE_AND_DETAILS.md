# 详解、动爻与数据库接入

## JavaScript / TypeScript

```js
import { loadLibrary, createDetailsRepository } from './src/index.js';
const library = await loadLibrary();
const details = createDetailsRepository({ library });
const reading = library.createReading({ primaryId: 55, movingLine: 1 });
const panels = await details.getReadingDetails(reading);

panels.primary.name;                  // 雷火丰
panels.selectedMovingLine.label;      // 初九
panels.selectedMovingLine.text;       // 遇其配主，虽旬无咎，往有尚。
panels.selectedMovingLine.changedHexagram.id; // 62

// 点击原卦第五爻，只改变详情选中态，不重新起卦。
const line = await details.getLine(55, 5);
// 只有用户展开延伸阅读，才读取整理注解；这不是经文/规则事实接口。
const reference = await details.getReferenceCommentary(55, { position: 1 });
```

`getHexagram(id)` 加载单卦详情。`getLine(id, 1..6)` 返回对应经文、白话、小象、爻位事实、正确变卦与另署来源的新编说明。`getReadingDetails(reading)` 返回三阶段详情，而 `selectedMovingLine` 始终来自本卦真实动爻。

底层详情按卦懒加载并合并并发请求；失败请求不永久缓存，允许重试。内容版本不匹配、爻名错位、变卦不一致、读盘阶段被篡改都会报错，不悄悄显示近似资料。UI 还需使用请求序号防止连续点击时旧请求覆盖新选择；联调页已实现。

原生应用可注入 `readJSON(path)`，把 JSON 加载映射到应用打包资源；不要在客户端运行 Python 导入脚本，也不要把 `node:fs` 打进原生包。

## SQLite

```bash
npm run build:data
```

得到：

- `data/knowledge.sql`：可审阅、可重复构建的事务导入文本，提交到 GitHub。
- `dist/wengua.sqlite`：可直接读取的本地 SQLite 文件，构建时生成。

也可以使用 SQLite CLI：

```bash
sqlite3 wengua.sqlite < data/knowledge.sql
```

这条命令用于新的空库；不要未经迁移方案直接导入已有业务数据库。

移动端本地 SQLite、D1 或服务器 SQLite 适配可复用此结构。若采用 PostgreSQL/Supabase，应明确迁移约束与 JSON 字段，不把本文件不经改写当 PostgreSQL SQL 执行。

按动爻查询：

```sql
SELECT label, text, vernacular, image, image_vernacular,
       changed_hexagram_id, changed_hexagram_name,
       structure_json, editorial_notes_json
FROM moving_line_details
WHERE hexagram_id = 55 AND position = 1;
```

参数化绑定 `hexagram_id` 和 `position`；不要用问题文本拼接SQL。

## 表与边界

| 表 / 视图 | 内容 |
| --- | --- |
| `hexagrams` | 64卦结构、最终显示等级、五档分类、卦辞与大象 |
| `lines` | 384普通爻及对应文字 |
| `special_lines` | 用九、用六两条，不占普通爻位 |
| `line_details` | 384条爻位、单爻变卦、另署新编说明 |
| `moving_line_details` | 已接通普通爻与其正确变卦的视图 |
| `domains` | 18领域的历史参考条文 |
| `rule_profiles` | 用户与原典规则的配置和来源性质 |
| `source_documents` | 6份原文本/用户规则与1份新DOCX的哈希 |
| `reference_commentary_links` | 64条参考注解路径，不含未核实正文 |
| `metadata` | 结构版本、内容版本、从下至上编号与解释范围 |

`source_documents`记录的是文件来源，不将来源中的每句话认证为现实事实。所有规则仍由 `src/index.js` 计算；SQL 视图不替代历法、体用、月令和空亡函数。

入库在一个事务中完成，包含主键、外键、卦号范围、爻位范围、五档分类与用九/用六限制。脚本独立运行完整性检查、外键检查以及384条连接的逐条对照。`data/details/variants.json`、隔离段和署名未确认的长篇解释均不混进事实表。
