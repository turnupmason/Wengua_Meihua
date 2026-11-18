# 复核记录一致性审查说明

你负责一个问项里连续几卦的复核记录一致性审查。工作目录 `D:\Wengua-Meihua\Wengua_Meihua`。不要运行构建，不要提交 git。

## 为什么要做

第二阶段逐卦复核时，同一条规矩前后几轮改过（例如先升档后撤回）。有的记录 `reason` 已经改了，`lineReading` 还留着旧说法。同一动爻的五个月令也可能读法不一：有的说爻辞「落在考试结果上」，有的又说「未言所为之事落空」。读者在 App 的计算说明里会看到这些依据，前后打架就是漏洞。

## 先读

1. `docs/READING_POLICY_V2.md` 全文（第二节两步判定、第八节 V2.1、第九节不采用的修订）。
2. `docs/review/WORKER_BRIEF_V2.md` 末尾「已裁定的边界」。
3. `docs/review/<问项目录>-line-consistency.json`：脚本粗筛结果。`direction` 是 lineReading 的升降说法与「体用初判 → 最终结论」方向对不上的条目，`crossMonth` 是同一动爻跨月令「落/不落」读法不一的条目。脚本只是提示，误报不少（例如「对已为吉者同向」）。

## 逐卦做什么

对分到的每一卦，读 `sources/editorial/<问项目录>/review-v2/hex-NNN.json` 全部 30 条，并对照 `node scripts/review/packet.mjs <问项目录> <卦序>` 的盘面：

1. **同一动爻跨月令**：爻辞象意落不落在所问结果上，是对爻辞本身的判断，五个月令必须同读。不同月令结论不同，只能是因为盘面强弱不同，导致升降档的条件满足与否不同，不能是对爻辞的读法不同。读法不一的，按多数且有古籍支持的读法统一。
2. **单条内部**：`reason`、`lineReading`、`newOutcome` 三者要说同一件事。最终没升档的，`lineReading` 不能写「升一档」；写了降档，结论就要真的降了，或写明哪个条件挡住了降档。
3. **计算说明**：同步看 `polish-v5/hex-NNN.json` 的 `calculationNotes`，要与修好的记录一致。篇名、行号核对：
   - 「变卦克体……变生体及比和……」出自【体用互变之诀】（795 行起）。
   - 「无生体之卦，有克体之卦，则事不谐」出自【占卦诀】（791 行起）。
   - 「克体卦气，则宜乘衰」出自【复明时令之应】（654 行起）。
   - 体或克体之卦为「相」时，不能引成「旺」，要写「有力（旺相）」。
   - 不引「内外并无生体」这类有异文争议的字句。

## 怎么改

- **只是记录文字前后不一、结论没错**：改 `review-v2` 的 `lineReading` 或 `reason` 文字，以及 `polish-v5` 的 `calculationNotes`。正文和结论码不动。
- **按统一读法结论应当变**：改作者源 `sources/editorial/<问项目录>/hex-NNN.json`：
  - 第 3 栏结论码。
  - 第 4–9 栏正文，接着现稿改，保持 V5 文风。
  - 第 10 栏。
  - 第 11 栏应期：判难的篇不带收尾吉应。
- **结论变了，同步改三份记录**：
  - `review-v2`：`newOutcome`、`changed`、`changeType`、`reason`，加 `"consistency":{"from":…,"to":…,"why":…}`。
  - `polish-v5`：`outcome`、`polished`、`hashAfter`、`calculationNotes`，`checks.outcomeUnchanged:false`，加 `outcomeChangedByPolicy:"consistency"`。
  - `blind-v2`：加 `consistencyNote`。
- **拿不准的**：不改结论，在 `review-v2` 那条加 `"consistencyNote":"待核：…"`。

最后对每卦运行 `node scripts/review/check-hex.mjs <问项目录> <卦序> --polish`，直到 `errors` 为空。临时文件放草稿目录下自己的子目录 `<问项目录>-audit-<起卦序>/`。

用中文回报：每卦改了哪些条，属于哪一类（文字统一、结论变动、待核），结论变动列出原 → 新及理由。
