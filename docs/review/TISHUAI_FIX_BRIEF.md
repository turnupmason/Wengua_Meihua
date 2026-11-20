# 「体衰」引文误用订正说明（2026-11-20）

《衰旺论》（原书 687 行起）：「衰者，如春坤、艮，夏乾、兑，秋震、巽，冬离，四季之月坎是也。……若体衰而逢克，则其凶甚矣。体衰而有生体之卦，则衰稍解。」衰就是五态里的**死**。定稿 `docs/READING_POLICY_V2.md` 第十节：「体卦本身仍以囚、死为弱，休不算有力，也不算弱。原书论体只说『体卦气衰』，衰即死，不再外推。」

换人通读查出：不少篇在体**囚**或体**休**的月份引了「若体衰而逢克，则其凶甚矣」「体衰而有生体之卦，则衰稍解」，或直接说「体衰」。这是把衰外推到囚、休，与定稿不合。

## 工作单

`node scripts/review/tishuai-audit.cjs <问项> --hex <卦序> --list` 列出每一处（篇键或第 9 栏行号、体的五态）。体旺、体相被列出的，多是「体衰」二字用来讲别处，逐句看，确实不涉体的才保留。

## 怎么改

- 只改涉及的那一句（或半句），讲清本月体的实际状态：囚是「受月令所制、力弱」，休是「不在旺相、不算有力」，不引《衰旺论》这两句，也不说「体衰」。例：「《衰旺论》说『若体衰而逢克，则其凶甚矣』」→「体囚力弱，又逢有力之克，阻力落在最吃力的地方」；「《衰旺论》说『体衰而有生体之卦，则衰稍解』，你弱，却有人扶」→「体虽囚而力弱，有生体之卦扶之，事仍可办，只是吃力」。可改引确实适用的原句，如《体用衰旺之诀》「凡体卦宜乘旺」（体不旺相时都适用）、《衰旺论》「大抵体之卦宜旺，生体之卦气亦宜旺」。
- 逐句手改，不许脚本批量替换；改到的段落整段读回，确认接得上、无重复、无新的安慰许诺；正文仍须 ≥470 字（跳槽每卦中位 ≥500）。结论、取期一字不动。
- 第 9 栏（五气源 `sources/editorial/<问项>/hex-NNN.json` 下标 9）同样改，用 `node scripts/review/agentfix.cjs <问项> <卦序> edits.json opusWrite`（col 9，from/to），改后 `bash scripts/review/chk-hex.sh <问项> <卦序>`（跳槽须全 0；确定关系五气源有改前就存在的旧问题，只须不新增）。再用 `node scripts/review/monthly-judgment-sync.mjs <问项> --hex <卦序> --write` 把月稿专业说明照抄同步。
- 每卦改完：回执加一条 finding（id `F<卦序>-T01`，status `corrected-classical-application`，keys 列改过的篇，写明改了几处、改法），重算 `sourceSha256`；`node scripts/build-monthly.mjs <问项> --hex N`；跳槽跑 `bash scripts/review/monthly-gate.sh job-change N` 须 GATE PASSED，确定关系跑 `node scripts/review/check-monthly.mjs relationship-establishment --hex N --docs` 须 passed 并跑 style-monthly、consolation-scan。最后 `tishuai-audit` 该卦须为 0（体旺、体相保留的写进回报）。
- **确定关系运行数据是 1.0.0，绝不跑 `npm run build:relationship-establishment`。**
