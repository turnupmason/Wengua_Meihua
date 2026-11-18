# 口径 V2.1 补判工作说明（间接生克）

你负责一个本卦里被 V2.1「间接生克」影响到的几篇。工作目录 `D:\Wengua-Meihua\Wengua_Meihua`。不要运行构建，不要提交 git。

这些稿件已按口径 V2 复核并润色过。V2.1 加了一层间接生克，这几篇要按新口径重新判一次，判定变了就改写正文。没变的也要在记录里写明「按 V2.1 复判，结论不变」及理由。

## 先读

1. `docs/READING_POLICY_V2.md` 全文，特别是第二节两步判定和第八节「V2.1 补充：间接生克」。
2. `docs/review/WORKER_BRIEF_V2.md` 末尾「已裁定的边界」各条（第 33 条即 V2.1，第 34 条旺相同为有力）。
3. `docs/review/POLISH_BRIEF_V2.md`：文风、计算说明、锁定栏目的写法。
4. `docs/review/exam-v21-delta.json` 里本卦的条目：`index` 是稿件在 `sources/editorial/exam/hex-NNN.json` 数组里的下标（从 0 起），`notes` 是脚本算出的间接作用，`reason` 是 `tier`（体用初判变了）、`line-step-eligibility`（初判没变，但爻辞能否升降档的条件可能变了）或 `reasoning-only`（结论按理不变，但某处卦的有力与否因间接生克翻了档：克体之卦由无力变有力、由有力变气弱，或生体之卦由有力变气弱）。`reasoning-only` 的篇要逐篇对正文：凡是阻力或帮助的轻重、快慢描写与新强弱相反的（两个方向都算，阻力由重变轻也要改），照新理由改写，并在计算说明「旺衰：」行写出这层间接作用；与新理由不冲突的，正文不动，只在 review-v2 加 `v21` 说明并补计算说明。若复判发现结论其实要变，按「结论变了的篇」处理。
5. 本卦的 `review-v2/`、`polish-v5/`、`blind-v2/` 三份记录里对应的那几条。
6. 用 `node scripts/review/packet.mjs exam <卦序>` 看盘面（各处卦、五行、旺衰、对体关系、爻辞）。

## 怎么判

1. 第一步体用定档：先按第八节调整强弱（只看本用、两互、变用四处之间一层：克体之卦被他处生而无克则按有力论，被他处克而无生则按气弱论；生体之卦被他处克而无生则按气弱论；生克并见相抵），再代入第二节各条。脚本的 `notes` 只是提示，你要自己核对盘面，脚本算错了就照盘面判，并在记录里说明。
2. 第二步爻辞调档：条件里的「旺相」「囚死」也用调整后的强弱判断（例如变用克体被他处所生，按有力论，吉辞就不能把它升为吉）。其余照第二节和已裁定边界。
3. 定不下来的，保留原结论，记录里写 `"status":"待核"` 并说明分歧点。

## 改什么

结论变了的篇：

- 作者源 `sources/editorial/exam/hex-NNN.json`：第 3 栏结论码；第 4–9 栏正文按新结论重写（V5 文风，接着 polish 过的文字改，保留原稿里仍然成立的具体描写）；第 10 栏复核依据按新判断改写；第 11 栏应期：判难的篇不带收尾的吉应（变用吉应），按 WORKER_BRIEF 已裁定边界处理，能保留的保留。
- `review-v2/hex-NNN.json` 对应条：`newOutcome`、`changed`、`changeType`（相对于 `oldOutcome`，`oldOutcome` 不动）、`reason`（开头写「V2.1：」）、`evidenceFor`、`evidenceAgainst`、`lineReading`、`timing`，加字段 `"v21":{"from":"<V2 时的结论>","to":"<新结论>","indirect":["…"]}`。
- `polish-v5/hex-NNN.json` 对应条：`outcome`、`polished`、`hashAfter`（sha256 of JSON.stringify(polished)）、`changedFields`（相对于 original）、`reasons`（补一句 V2.1 改写）、`checks.outcomeUnchanged` 改为 false 并加 `"outcomeChangedByPolicy":"V2.1"`、`calculationNotes`（「定档：」行写出间接作用，例如「互卦巽木生离火，克体之卦得生而盛，《体用》「此卦克体……」」；措辞照 POLISH_BRIEF 的计算说明一节，禁用词同样适用）。`original` 不动。
- `blind-v2/hex-NNN.json` 对应条：加 `"v21Note":"…"`，说明盲断结论与 V2.1 新结论的关系（相同、或差异的理由）。

结论没变、但理由变了的篇（例如克体之卦由轻变重）：正文里凡是与新理由相反的描写（「阻力不算重」「末段的克轻」之类），照新理由改写第 4–9 栏，第 10 栏同步改；同时更新 `polish-v5` 的 `polished`、`hashAfter`、`changedFields`、`calculationNotes`（`checks.outcomeUnchanged` 仍为 true），`review-v2` 的 `evidenceFor`/`evidenceAgainst` 里与新理由相反的说法一并改正。

结论没变、理由也不变的篇：只在 `review-v2` 对应条加 `"v21":{"from":X,"to":X,"indirect":[…],"note":"结论不变的理由"}`；若计算说明需要补一句间接作用，同步改 `polish-v5` 的 `calculationNotes`，正文不动。

## 校验与回报

运行 `node scripts/review/check-hex.mjs exam <卦序> --polish` 直到 `errors` 为空。临时文件放草稿目录下自己的子目录 `exam-<卦序>-v21/`。

用中文简短回报：每篇原结论 → 新结论及一句理由，待核的篇及分歧点。

补充（应期措辞）：第 11 栏应期的事件文字或依据措辞若与新强弱相反（「轻阻」「要求严格」之类），可以只改措辞，事件种类、取日、吉凶不动；review-v2 的 timing 记 changed:true 并写明「只改措辞」，polish-v5 加 timingBasisReworded:"V2.1"。判难的篇若应期仍用收尾吉应，按已裁定边界改成过程事件。

补充（全卦顺查）：顺带查本卦全部 30 篇里判难的篇，应期若取变用（changed_use）的吉应（support、equal、name-support、name-body），按已裁定边界第 9 条改为过程事件（多为克体之处的过程凶应，或本用、两互的过程吉应），事件文字与吉凶对得上；记录同上（timing.changed:true，timingChangedByPolicy:"boundary-9"）。
