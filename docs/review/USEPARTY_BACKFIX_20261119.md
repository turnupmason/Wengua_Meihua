# 用党多回改说明（2026-11-19，Opus）

工作目录 `D:\Wengua-Meihua\Wengua_Meihua`。不构建，不提交 git，只动分给你的篇。

## 为什么改

定稿口径原先只用体党，漏了《体用总诀》（mh-061，494 行）：

> 体党多而体势盛，用党多则体势衰。如卦体是金，而互变皆金，则是体之党多。如用卦是金，而互变皆金，则是用之党多。

用户 2026-11-19 定：补进口径，先用于跳槽，再回改已完成的问项。定义：用卦与体不比和，而用卦的五行在两互、变用三处中又见两处以上，为用党多，体势衰，不作「体有力」。

- **考试、面试、晋升、转正（各 12 篇）**：大有九三、观六三、颐上九。全盘无生无克、四处皆体克用，原按「体有力」判成。用党多则体势衰，按定稿第十三节表 R1b（「皆是衰卦，终不吉」）判不成。能过／能升／能转正 → 过不了／升不了／转不了。
- **职场情况（48 篇）**：
  - 有隐患 → 风险大 36 篇：原按「体旺相而克体之卦皆无气，属轻」降为有隐患；用党多时体不作有力，维持风险大。例：大畜九三巳月问「这份工作能干多久」，用卦乾金、用互兑金、变卦兑金，当天被辞退（`docs/marketing/cases/career.json` WS1）。
  - 稳 → 有隐患 12 篇：无生无克之盘用党多，三档初判由吉改为有条件。

每篇的来由写在 `polish-v5` 与 `review-v2` 的 `useParty` 字段里（职场篇另看 `stabilityRule` 之外的 `useParty`）。第 2 栏结论我已改好，**一字不动**。

## 要改的篇

- exam 14#10 3/spring-wood favourable→difficult
- exam 14#11 3/summer-fire favourable→difficult
- exam 14#12 3/autumn-metal favourable→difficult
- exam 14#14 3/seasonal-earth favourable→difficult
- exam 20#10 3/spring-wood favourable→difficult
- exam 20#11 3/summer-fire favourable→difficult
- exam 20#13 3/winter-water favourable→difficult
- exam 20#14 3/seasonal-earth favourable→difficult
- exam 27#25 6/spring-wood favourable→difficult
- exam 27#26 6/summer-fire favourable→difficult
- exam 27#28 6/winter-water favourable→difficult
- exam 27#29 6/seasonal-earth favourable→difficult
- interview-pass 14#10 3/spring-wood favourable→difficult
- interview-pass 14#11 3/summer-fire favourable→difficult
- interview-pass 14#12 3/autumn-metal favourable→difficult
- interview-pass 14#14 3/seasonal-earth favourable→difficult
- interview-pass 20#10 3/spring-wood favourable→difficult
- interview-pass 20#11 3/summer-fire favourable→difficult
- interview-pass 20#13 3/winter-water favourable→difficult
- interview-pass 20#14 3/seasonal-earth favourable→difficult
- interview-pass 27#25 6/spring-wood favourable→difficult
- interview-pass 27#26 6/summer-fire favourable→difficult
- interview-pass 27#28 6/winter-water favourable→difficult
- interview-pass 27#29 6/seasonal-earth favourable→difficult
- promotion-pay 14#10 3/spring-wood favourable→difficult
- promotion-pay 14#11 3/summer-fire favourable→difficult
- promotion-pay 14#12 3/autumn-metal favourable→difficult
- promotion-pay 14#14 3/seasonal-earth favourable→difficult
- promotion-pay 20#10 3/spring-wood favourable→difficult
- promotion-pay 20#11 3/summer-fire favourable→difficult
- promotion-pay 20#13 3/winter-water favourable→difficult
- promotion-pay 20#14 3/seasonal-earth favourable→difficult
- promotion-pay 27#25 6/spring-wood favourable→difficult
- promotion-pay 27#26 6/summer-fire favourable→difficult
- promotion-pay 27#28 6/winter-water favourable→difficult
- promotion-pay 27#29 6/seasonal-earth favourable→difficult
- workplace-probation 14#10 3/spring-wood favourable→difficult
- workplace-probation 14#11 3/summer-fire favourable→difficult
- workplace-probation 14#12 3/autumn-metal favourable→difficult
- workplace-probation 14#14 3/seasonal-earth favourable→difficult
- workplace-probation 20#10 3/spring-wood favourable→difficult
- workplace-probation 20#11 3/summer-fire favourable→difficult
- workplace-probation 20#13 3/winter-water favourable→difficult
- workplace-probation 20#14 3/seasonal-earth favourable→difficult
- workplace-probation 27#25 6/spring-wood favourable→difficult
- workplace-probation 27#26 6/summer-fire favourable→difficult
- workplace-probation 27#28 6/winter-water favourable→difficult
- workplace-probation 27#29 6/seasonal-earth favourable→difficult
- workplace-stability 4#27 6/autumn-metal watch→strained
- workplace-stability 4#28 6/winter-water watch→strained
- workplace-stability 7#27 6/autumn-metal watch→strained
- workplace-stability 7#28 6/winter-water watch→strained
- workplace-stability 8#2 1/autumn-metal watch→strained
- workplace-stability 8#3 1/winter-water watch→strained
- workplace-stability 8#7 2/autumn-metal watch→strained
- workplace-stability 8#8 2/winter-water watch→strained
- workplace-stability 8#12 3/autumn-metal watch→strained
- workplace-stability 8#13 3/winter-water watch→strained
- workplace-stability 9#10 3/spring-wood watch→strained
- workplace-stability 9#13 3/winter-water watch→strained
- workplace-stability 11#11 3/summer-fire watch→strained
- workplace-stability 11#14 3/seasonal-earth watch→strained
- workplace-stability 14#10 3/spring-wood stable→watch
- workplace-stability 14#11 3/summer-fire stable→watch
- workplace-stability 14#12 3/autumn-metal stable→watch
- workplace-stability 14#14 3/seasonal-earth stable→watch
- workplace-stability 20#10 3/spring-wood stable→watch
- workplace-stability 20#11 3/summer-fire stable→watch
- workplace-stability 20#13 3/winter-water stable→watch
- workplace-stability 20#14 3/seasonal-earth stable→watch
- workplace-stability 26#11 3/summer-fire watch→strained
- workplace-stability 26#14 3/seasonal-earth watch→strained
- workplace-stability 27#25 6/spring-wood stable→watch
- workplace-stability 27#26 6/summer-fire stable→watch
- workplace-stability 27#28 6/winter-water stable→watch
- workplace-stability 27#29 6/seasonal-earth stable→watch
- workplace-stability 28#20 5/spring-wood watch→strained
- workplace-stability 28#23 5/winter-water watch→strained
- workplace-stability 31#26 6/summer-fire watch→strained
- workplace-stability 31#29 6/seasonal-earth watch→strained
- workplace-stability 33#26 6/summer-fire watch→strained
- workplace-stability 33#29 6/seasonal-earth watch→strained
- workplace-stability 34#0 1/spring-wood watch→strained
- workplace-stability 34#3 1/winter-water watch→strained
- workplace-stability 34#5 2/spring-wood watch→strained
- workplace-stability 34#8 2/winter-water watch→strained
- workplace-stability 34#10 3/spring-wood watch→strained
- workplace-stability 34#13 3/winter-water watch→strained
- workplace-stability 35#10 3/spring-wood watch→strained
- workplace-stability 35#11 3/summer-fire watch→strained
- workplace-stability 44#15 4/spring-wood watch→strained
- workplace-stability 44#18 4/winter-water watch→strained
- workplace-stability 44#20 5/spring-wood watch→strained
- workplace-stability 44#23 5/winter-water watch→strained
- workplace-stability 44#25 6/spring-wood watch→strained
- workplace-stability 44#28 6/winter-water watch→strained

## 怎么改

每篇按新结论整篇重写，写法照各问项原写作说明：
- 考试：`TEXT_FINAL_BRIEF.md`、`READ_THROUGH_BRIEF.md`；
- 面试：`INTERVIEW_WRITE_BRIEF.md`；
- 晋升：`PROMOTION_WRITE_BRIEF.md`；
- 转正：`PROBATION_WRITE_BRIEF.md`；
- 职场：`STABILITY_WRITE_BRIEF.md`。

同爻其他月令已是过不了的篇（例如考试大有九三冬令、观六三秋令、颐上九秋令），是这一爻弱盘的现成写法，只看写法，不照搬句子。

各栏：
1. **第 3–8 栏正文**：按新结论重写。过不了的篇按 `docs/review/` 里委婉判词的要求写（离合格线还差一截之类，不含糊、不生硬）；风险大的篇照职场说明，不吓人。
2. **第 9 栏判断依据**：事实、引文照旧；结论句改成新结论，写明由来：引《体用》「用党多则体势衰」，写清用党在哪几处（如「用乾金，用互兑金、变兑金」）。
3. **第 10 栏应期**：
   - 考试、面试、晋升、转正这 12 盘原是结果日（name-body），过不了的篇不许用。全盘四处皆体克用，没有扶助、受制、耗费、比和可取，**整栏改成无期说明**（字符串，30–60 字，不用「日级、节点、生体、克体、依据不足」）。参照同爻已是过不了的月令。
   - 职场篇的应期种类、位置、依据不动，只按新结论改事件和提示。
4. **晋升第 12 栏**（随岗薪资说明）：升不了的篇不写，用 `{"i":n,"col":11,"set":""}` 清空。
5. **计算说明**：「判断」行写新结论与用党多的理由；「旺衰」行措辞配合新结论（「体有力」改为「体虽旺相而用党多，势衰」之类）；「爻辞」行按新结论调整落点。
6. **爻辞读法**（review-v2 `lineReading`）：若写着「能过」「稳」「属轻」之类与新结论相反的话，用 `"col":"line"` 改掉；只改落点，原文、小象、注疏原句保留。
7. **通读记录**：每篇 `{"i":n,"read":"……"}`。

写回：`node scripts/review/agentfix.cjs <问项> <卦序> edits.json useParty`。

## 交付门槛

每个改过的卦：`bash scripts/review/chk-hex.sh <问项> <卦序>` 四项全为 0（total、flag、err、sim []）。同时在改别的问项的代理与你不撞同一文件；8 字片段撞了改你这边。

## 回报（中文，简短）

改写篇数、各卦检查结果、你认为结论可能有误的盘（只报不改）。
