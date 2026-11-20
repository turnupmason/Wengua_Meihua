# 跨卦相似订正说明（2026-11-20）

## 起因

跳槽第 64 卦未济换人通读时查出：未济每篇去掉引文后，平均有 51% 的文字与既济同爻同月那篇共用，盘面段、首句、收尾基本是同一套话换几个字。随后全库扫描（`scripts/review/cross-sim.cjs`：每篇简断＋正文去掉「」引文，切 8 字片段，与别卦单篇共用的比例取最高者）：

| 问项 | 超 8% 的篇 | 最高 |
|---|---|---|
| 用户亲写面试稿 | 0 | 3.9% |
| 跳槽 | 269 | 25.1% |
| 确定关系 | 307 | 39.0% |

超标的多在成对卦（需／讼、师／比、泰／否、夬／姤、既济／未济等）：两卦体用、五行相近，写手拿前一卦的句子换字。读者只要连问两卦就会读到同一段话。门槛照面试稿定为 8%，已加进 `monthly-gate.sh`。

## 改什么

每对超标篇只改一侧，改写清单由协调者给出（篇键与它相似的那几篇）。改法：

- 先读清单里的篇，**也读它相似的那几篇**，看清共用的是哪几段（多是盘面段的旺衰生克讲法、首句、收尾做法）。
- 共用的段落按**本卦本爻本月**重写，不是换同义词：本卦的卦名卦象、本爻爻辞与小象、本卦的注疏（王注、孔疏、程传、本义）里挑与本月盘面最贴的部分来讲；盘面照 `node scripts/review/packet.mjs <问项> <卦序>` 的五态和生克讲，讲法换角度（先讲哪一处、轻重怎么比、落到哪件实事上），不照搬对卦的句子。
- 标题、简断若也与对卦雷同，一并改；标题全库不重复。
- 结论、专业说明 `judgment`、取期 `timing` 一字不动。

写作标准不变：跳槽照 `docs/review/JOBCHANGE_MONTHLY_BRIEF.md`，确定关系照 `docs/review/ESTABLISHMENT_MONTHLY_BRIEF.md`，口吻照 `docs/review/VOICE_REWRITE_BRIEF.md`。重写的段落同样不许：安慰许诺、断人断心意、编造经过写成读者实况、规则名目与写给审稿的话、体囚体休说「衰」、同气两月比轻重、连环推演间接作用。正文每篇仍 ≥470 字（跳槽每卦中位 ≥500）。逐句手改，不许脚本批量替换；改完整篇读回。

## 收尾

每卦改完：
- `node scripts/review/cross-sim.cjs <问项> --hex <卦序> --list` 须 0（改了这一侧，对侧也会随之降下来）；
- 跳槽：`bash scripts/review/monthly-gate.sh job-change <卦序>` 最后一行 GATE PASSED；
- 确定关系：`node scripts/review/check-monthly.mjs relationship-establishment --hex <卦序> --docs` passed、`style-monthly` passed、`consolation-scan` 0、`tishuai-audit` 0、`intra-repeat.cjs relationship-establishment 8 --hex <卦序>` 不比改前多；**绝不跑 `npm run build:relationship-establishment`**；
- 回执 `reviews-monthly/hex-NNN.json` 加一条 finding（id `X<卦序>-R01`，status `fixed-documentation-conflict`，keys 列改过的篇，写明与哪几篇雷同、改了哪几段），重算 `sourceSha256`、更新 `reviewedAt`；`node scripts/build-monthly.mjs <问项> --hex <卦序>`。

不提交 git，只动分给你的卦。
