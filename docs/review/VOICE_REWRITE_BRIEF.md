# 确定关系逐月长稿口吻重写说明（2026-11-19，用户批准铺开）

用户看过第 13 卦同人的试写后说「对，铺开重写」。本说明供每位口吻重写写手照办；协调者按卦分派，每位 Opus 写手 2 卦。

## 一、目标

把「确定关系」（`relationship-establishment`）各卦逐月长稿 72 篇的**标题、简断、正文**，按用户亲写的面试逐月长稿（`origin/main` 的 `sources/editorial/interview-pass/monthly/`）的口吻重写。结论 `outcome`、专业说明 `judgment`、取期 `timing` 一字不动。

## 二、先读（必须）

1. `docs/review/MONTHLY_VOICE_GUIDE.md`：口吻要点与量化门槛。
2. 用户亲写的面试稿：`git show origin/main:sources/editorial/interview-pass/monthly/hex-NNN.json`，读 hex-003、hex-017、hex-030、hex-052、hex-058 各至少 4 篇（能过与过不了都有），细看开头的变化、句子的连贯、建议怎样带理由并连回本盘、注疏怎样讲取舍、结尾怎样收。只学口吻，不抄句子。
3. 已按新口吻改好的样稿：`sources/editorial/relationship-establishment/monthly/hex-013.json`（同人）。注意它的毛病：「宜」用得太密（每千句 262），不要学这一点。
4. `docs/review/MONTHLY_REWRITE_BRIEF.md`、`docs/review/ESTABLISHMENT_MONTHLY_BRIEF.md`：问项边界。
5. 自己负责两卦的现有作者源与回执全文。

## 三、写法

- **依据一点不删**：体用、各卦旺衰与生克轻重、一层间接作用、爻辞小象与注疏原句（「」内照录，不改字）、变卦卦辞、卦象主断的说明、相处分寸，都保留，用新口吻重新组织。只删口头禅、重复、安慰许诺。
- **不许变薄**：每篇新正文的汉字数不少于改前（用 node 对比），且在 470–650 之间；下列 23 篇在安慰句清理时被改薄过，要补回到不少于 origin/main 上已发布版本（清理前）的字数（`git show origin/main:sources/editorial/relationship-establishment/monthly/hex-NNN.json` 对比）：4/1/丑、7/1/子、11/3/卯、11/3/子、12/6/卯、12/6/申、12/6/子、15/2/午、15/6/亥、16/4/丑、21/3/巳、23/2/丑、23/6/辰、23/6/未、23/6/申、23/6/戌、23/6/亥、23/6/子、23/6/丑、28/1/亥、33/1/亥、35/2/戌、39/3/酉。补的只能是有据的内容。
- **开头**：首句明说结论（判词照专项说明），紧接本篇的要害；不以「某月」起头，月令放到后面讲。72 篇开头要有变化，全卦正文以月份开头不超过 7 篇，简断不超过 5 篇。
- **句子**：完整、平实、偏书面，平均三十字上下（31–34；一句不塞三层以上意思，超过 34 读着发沉，检查会拦）；不用十字以内的口号短句、对仗警句、「不追；不催；」式分号排比；不用「就好」「就够了」「这个月」（讲本月用「卯月」「本月」「此月」）。**不许用脚本批量断句、合句或替换用语**，每一处都人工写定（2026-11-19 有写手用脚本统一替换末段收尾，改坏一处）。
- **建议**：带做法或理由，连回本盘。「宜」是常用词但不要篇篇句句都是，全卦「宜」每千句控制在 100–180（用户稿中位 137），交替用「可」「不必」「应」「较合……」「……为好」等说法。
- **标题**：照面试稿，一句十字上下的完整意思，全库不重复。
- **简断**：75–120 汉字，首句明说结论，不以月份起头。
- 其余照旧：不编人物、心理、经过（不写「你总多想一层」「聊天时你总多接一句」这类替人设想的情形）；不写对方的感受（「两边都提不起劲」「对方心里……」，style-monthly --list 会列出疑似句，逐条看）；不写给作者的话（「这一面要如实写下／记下」；「这一面要如实看见」是对读者讲，可留）；不替对方断心意；不用他／她指对方；不写给作者看的话；不安慰、不许诺、不预告换季（「差一线不必着急」「不必灰心」也算安慰，扫描会拦）；同气月份文章分写；全库不许 24 字以上长句重复。

## 四、流程与关口

每改完一爻 12 篇：把这 12 篇的标题、简断、正文完整输出读一遍，再跑
```bash
node scripts/review/check-monthly.mjs relationship-establishment --hex N --draft
node scripts/review/style-monthly.mjs relationship-establishment --hex N
node scripts/review/consolation-scan.mjs relationship-establishment --hex N
```
全卦完成后，四道关全过：
1. `node scripts/review/check-monthly.mjs relationship-establishment --hex N` → passed；
2. `style-monthly --hex N` → passed，且全卦正文以月份开头 ≤ 7 篇、「宜」每千句 100–180；
3. `consolation-scan --hex N` → 0（豁免写进 `sources/editorial/relationship-establishment/consolation-allow/v<卦序>.json`）；
4. `node scripts/review/commentary-audit.mjs relationship-establishment --monthly --out <临时目录>/cite.json` → 本卦无未核实引文。
另用 node 对比改前改后每篇正文字数，确认没有变薄。

回执 `reviews-monthly/hex-NNN.json`：加 findings `{id:"E0NN-V01", status:"corrected-unsupported-scenes", keys:["NN/*/*"], finding:"按用户亲写面试稿口吻重写标题、简断、正文 72 篇，结论、专业说明、取期与引文不动；改前→改后口吻指标：……；字数：……"}`，更新 `reviewedAt`、`sourceSha256`（定稿后算），`batchReadback` 照实写读回（每篇改后都要完整输出读过才能写已读）。然后 `node scripts/build-monthly.mjs relationship-establishment --hex N`。

不提交 git，只动自己两卦的 monthly、reviews-monthly、阅读页和自己的豁免文件。别的写手同时在改别的卦，查重撞了改自己这边。

## 五、回报（中文，简短）

每卦：口吻指标改前→改后（月份开头、句均、短句、宜、简断均）、四道关结果、字数改前→改后范围、有无变薄的篇，以及读回情况。
