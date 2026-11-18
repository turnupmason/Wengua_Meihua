# 考试问项 · 应期文字、篇章结构与口气（补一轮）

正文已逐篇通读定稿。本轮只做三件事：
1. 按 [READ_THROUGH_BRIEF.md](READ_THROUGH_BRIEF.md) 第「八、应期文字」节，逐条重写本卦 30 篇第 11 栏的事件和提示，以及无期说明；
2. 按同一文件第「九、篇章结构不成套」节，把超出上限的简断、总断、开局改到上限以内；
3. 按同一文件第「十、过不了的篇，话说得委婉些」节，改掉过不了各篇标题、简断、总断、无期说明里的生硬判词（frames 的 shape 里 `blunt` 项）；
4. 清理 review-v2 记录 `v21` 字段里的旧说法（判断不动）。

判断依据（第 10 栏）、计算说明、结论不动。第九、十节涉及的标题、简断、总断、开局以外，正文不动。

## 怎么做
- 先读本篇正文，找出这一篇的胜负手和本月轻重，再写应期：事件要和正文说的那件事对上，提示要让读者那几天知道该做什么、看什么。
- 种类（kind）、位置（role）、取日、吉凶不动；reason 只清旧说法。
- 同卦 30 条的事件、提示各不相同，同一爻五个月令也要写出轻重差别。合格结果类（name-support、name-body）也要逐篇不同。
- 第九节：`frames.mjs` 的 `shape` 列出超限的篇号，读后挑最像套路的改，整句重写，不要只调词序。简断仍要在前两句里让人看清结论；过不了的仍要写清卡在哪、保住什么，只是位置换开。

## 写回
- 作者源 `sources/editorial/exam/hex-NNN.json`：两个空格缩进写回。
- polish-v5 对应记录（一个空格缩进）：
  - 加 `"timingRead":"2026-11-18"`；
  - 改了正文的篇，同步 `polished`、`hashAfter`（`JSON.stringify(polished)` 的 sha256）、`changedFields`（相对 `original`）；
  - `reasons` 末尾加一句「应期与结构（2026-11-18）：……」。
- review-v2：一个空格缩进写回。

## 校验（全部为 0 才回报）
- `node scripts/review/frames.mjs exam <卦序>`：total 为 0（含 timing、shape、review）。
- `node scripts/review/check-hex.mjs exam <卦序> --polish`：errors 为 0。
- `node scripts/review/text-packet.mjs exam <卦序>`：flagged 为 0。
- `node scripts/review/similarity.mjs exam <卦序>`：pairsOver 为 0，sharedEight 为 0。

全库四字开头上限由别的卦共同占用，撞上的改自己这边。临时文件放在草稿目录下的 `timing-<卦序>/`。

## 回报（中文，简短）
应期改了多少条、结构改了哪几篇；各举两三条改前改后的例子；四个校验的结果。
