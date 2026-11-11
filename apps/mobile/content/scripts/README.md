# 断语库（作者人工撰写 · 审定后上线）

软件运行时只做两件事：准确排盘，再按固定字段查对断语。它不调用 AI，也不生成或改写断语。

## 查对规则

每条断语按以下字段查对，缺一不可：

- `question_id`
- 本卦 `hexagram_id`：文王卦序 1–64
- 动爻 `moving_line`：自下而上 1–6
- 时令 `season_variant_id`
- 问题若定义了固定选项，再加 `conditions`

时令按**实际起卦时间**的月建来定：

| 时令 | 月份 | `season_variant_id` |
|---|---|---|
| 春令 | 寅卯月 | `spring` |
| 夏令 | 巳午月 | `summer` |
| 秋令 | 申酉月 | `autumn` |
| 冬令 | 亥子月 | `winter` |
| 四季土月 | 辰戌丑未月 | `earth` |

- `all`（全年通用）只在作者明确标注时使用，并且必须在 `season_note` 写明理由。
- 同一时令内，先用当季那条，没有时才用 `all`。没有就是“整理中”，**不会**拿其他问题、其他爻或其他时令的断语代替。
- 用户端只读取 `status = approved` 的断语；`draft`（草稿）与 `reviewing`（待审核）不会打包进应用。

## 字段

| 字段 | 说明 |
|---|---|
| `script_id` | 永久编号，3–80 位字母、数字、`.` `_` `-` |
| `question_id` | 见 `src/data/question-catalog.json`，例如 `career.job_interview.pass` |
| `hexagram_id` / `moving_line` | 本卦（1–64）/ 动爻（1–6） |
| `season_variant_id` / `season_note` | 时令；选 `all` 时 `season_note` 必填 |
| `conditions` | 可空；格式 `键=值; 键=值`，只能使用问题里定义的固定选项 |
| `title` `brief_text` | 标题、简断 |
| `opening_text` `process_text` `ending_text` `conclusion_text` | 开局、过程、结局、总断 |
| `classical_sources` | 古籍依据，每行一条，写法见下 |
| `status` | `draft` / `reviewing` / `approved` |
| `version` | 版本号，例如 `1`、`2` |

`classical_sources` 每行一条，`|` 后面可接引用原句：

- `爻:55:3|原句`：某卦某爻，`用九`/`用六` 写作第 7 爻
- `卦:55|原句`：某卦
- `篇:求名占第九|原句`：《梅花易数》中的篇名
- `文:说明文字`：其他说明

批准（`approved`）的断语，标题、简断、开局、过程、结局、总断必须写全，并至少引一条古籍。草稿可以不写全。同一问题、同一卦、同一动爻、同一时令、同一组条件，只能有一条 `approved`。

## 导入

用 Excel 编辑时，“另存为 → CSV UTF-8”（模板见 `template.csv`），也可以直接写 JSON。

先只检查、不写入：

```bash
npm run scripts:import -- 路径/断语.csv --check
```

检查通过后正式导入：

```bash
npm run scripts:import -- 路径/断语.csv
```

导入规则：

- 任一行有错，都会列出行号、字段和原因，并且不写入任何文件。
- 导入成功后：
  - `content/scripts/scripts.json` 保存全部断语（任何状态），是作者的工作副本；
  - `src/data/scripts.approved.json` 只存已批准的断语，这是应用唯一会打包的断语。

新断语里如有新字，请运行 `npm run font:subset`。

## 就绪状态

就绪状态按每个问题分别计算，“整理中”的标注由此而来：

- **整理中**：该问题还没有任何已批准的断语。
- **部分整理中**：已有部分断语。
- **全部完成**：384 种本卦 × 动爻组合在每个时令都有断语（每种组合有 `all`，或春、夏、秋、冬、土月五季齐全）。

如果所得之卦没有已批准的断语，这一卦**不计入**当日问卦次数。
