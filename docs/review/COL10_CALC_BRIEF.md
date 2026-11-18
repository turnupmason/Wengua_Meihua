# 考试问项 49–64 卦：判断依据与计算说明（Opus 专做）

只改两样：第 10 栏判断依据（`hex-NNN.json` 每篇的 `d[9]`）和计算说明（`polish-v5/hex-NNN.json` 的 `calculationNotes`）。正文（d[3]–d[8]）、应期（d[10]）、`review-v2` 一律不动——正文和应期另由润色代理做。结论（d[2]）和判断一字不改。

## 先读

- `docs/READING_POLICY_V2.md`（定稿口径，尤其第十三节）
- 每卦：`node scripts/review/frames.mjs exam N`（看 col10、calc 两项）
- 每篇的依据：`sources/editorial/exam/review-v2/hex-NNN.json` 的 `reason / evidenceFor / evidenceAgainst / lineReading / final`，以及现有 `calculationNotes`
- 已完成的样子：`sources/editorial/exam/hex-048.json` 任一篇的 `d[9]`，`polish-v5/hex-048.json` 的 `calculationNotes`

## 一、第 10 栏判断依据

整篇重写成一段自然的中文判断依据，约 80–200 字，顺序：体用关系（谁生体、谁克体、谁受体所生所制）→ 本月令旺衰与引文 → 爻辞怎么处理 → 「定为能过」或「定为过不了」。结论必须与 d[2]（favourable=能过，difficult=过不了）和 review-v2 `final.to` 一致。

- 不得出现：`档 R1 R2… 有条件 存疑 待核 口径 原稿 改判 复核 盲断 属小事 是小事 体卦乘旺`，也不写「升判」「降判」「拆为」「按结局拆」这类内部流程词。写判断本身，不写判断是怎么改来的。
- 引文只用现有计算说明或 review-v2 证据里已经出现的原句，一字不改；要新引就去 `sources/original/meihua-volumes-1-3.txt`、`sources/original/yijing64.txt` 找到原文核对后照抄。不许凭记忆写古籍。
- 同一卦 30 篇不要写成一个模子：句子顺序、用词随盘面变，但事实不能变。

## 二、计算说明

1. 去掉套话框架（frames.mjs 的 FRAMES：「本是吉辞」「这句本是」「吉只落在」「吉只到」「可这一盘」「分保得住」「过不费事」「要磨磨在」「只是得磨」「费工夫的地方在」），也不写：「无咎只免大错 / 无咎非吉辞 / 无咎不是吉辞 / 悔亡只免悔 / 吉辞补不回 / 吉到不了 / 管不到 / 无吉凶断辞 / 不费事 / 不吃力」。要说的意思直接说：爻辞落在这一篇的哪件事上、为什么不改结论。
2. **爻辞条不重复**：同一爻的五个月令篇（i=0–4、5–9…），「爻辞：」那一条不能一字不差。爻辞原文和小象照旧引，后面的落点按本篇月令和本篇正文写（读这一篇的结尾 d[7] 和总断 d[8]，写爻辞应在卷面上的哪件事），并点出月令（春令 / 夏令 / 秋令 / 冬令 / 土令）。
3. 「判断：」「旺衰：」两条的事实与引文保持不动，只在含上面禁用说法时改那几个字。

## 三、怎么改

写一个 edits.json，用 `node scripts/review/agentfix.cjs N edits.json opusCol10` 写回：

```json
[{"i":0,"col":9,"set":"新的判断依据全文","why":"判断依据重写"},
 {"i":0,"col":"note:2","set":"爻辞：……","why":"爻辞落点按月令写"},
 {"i":5,"col":"note:2","from":"吉只落在比和的稳分上","to":"……","why":"去套话"}]
```

## 四、每卦交付门槛

- `node scripts/review/frames.mjs exam N`：`col10` 与 `calc` 都为空数组（其他项不归你管）。
- `node scripts/review/check-hex.mjs exam N --polish`：`errors` 为空。
- 不提交 git，不动其他卦，不动正文、应期、review-v2。
- 汇报用中文：每卦改了几篇判断依据、几条计算说明，新核对过的古籍引文列出原文出处行号。
