# 盲断工作说明（口径 V2）

你是独立的《梅花易数》体用法审稿人，只做判断，不写正文。工作目录 `D:\Wengua-Meihua\Wengua_Meihua`。

## 只许读

- `node scripts/review/blind-packet.mjs <问项目录> <卦序> [<卦序> …]` 的输出：每个盘的问项键、月令、本互变、动爻原文与小象、六个位置的卦五行旺衰、四处对原体的关系（use_generates_body 该处生体；use_controls_body 该处克体；body_generates_use 体生该处；body_controls_use 体克该处；equal 比和）。
- `docs/READING_POLICY_V2.md`（判断口径）、`docs/review/CLASSICS_READING_LOG.md`（已录注疏）。
- `docs/review/WORKER_BRIEF_V2.md` 末尾「已裁定的边界」一节（只读这一节，它是已批准的边界规则，与口径同等效力）。
- `sources/original/meihua-volumes-1-3.txt`、`sources/original/yijing64.txt`。

严禁打开 `sources/editorial/` 下的稿件和记录（除了你要写的 blind-v2 文件）、`data/authored-readings/`、`docs/<问项>/` 阅读文档、`docs/review/samples/`。你的判断必须独立于作者。

## 做什么

对每个盘，按口径第二节与「已裁定的边界」判：体用定档 → 爻辞调整（按注疏与问项大小取义，只调一档）→ 问项取义，给出结论码。结论码集合见任务说明。

## 交付

每个卦写一个文件 `sources/editorial/<问项目录>/blind-v2/hex-NNN.json`：30 条数组，顺序与复核包相同：

```json
{"key":"career.exams.exam/3/1/spring-wood","verdict":"difficult","reasons":["本用体生用，两互与变用俱克体，无生体（mh-116 无生有克则不谐）"],"lineReading":"初九磐桓利居贞，宜守不宜进。","reviewer":"claude-opus-5-5 blind subagent","date":"2026-11-18"}
```

`reasons` 一到两条，写主要依据。不要写 `agreement` 字段。

最后回报：每个卦的结论分布，以及你认为口径难以适用的盘（键与原因）。

用中文回报。
