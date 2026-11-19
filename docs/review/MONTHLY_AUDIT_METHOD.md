# 逐月长稿：核查方法（面试以外各问项）

用户 2026-11-19 定：面试以外各问项一律照面试逐月长稿的写作手法与格式（每卦 72 篇、自然段长文）。核查方法照面试的 `docs/review/INTERVIEW_MONTHLY_AUDIT_METHOD.md`（分支 `origin/editorial/interview-preview-216-20261118`），工具按问项参数化：

- `scripts/review/monthly-lib.mjs`：问项配置（问法、档案、结论码、首句判词、专业说明判词）、独立排盘表、取期解释、阅读页排版；
- `scripts/review/check-monthly.mjs <问项>`：面试检查各项，另加结论判词与专业说明一致、内部用语、含糊口气、正文须引动爻爻辞原句；全库查重包括同问项其他已写卦；
- `scripts/build-monthly.mjs <问项> --hex`：阅读页 `docs/<问项>/monthly-preview/hex-NNN.md`；
- `scripts/update-monthly-index.mjs <问项> --hex --added`：目录、清单与机器记录。

写作说明见 `MONTHLY_REWRITE_BRIEF.md` 与各问项专项说明。专业说明：已定稿问项须与五气作者源第 9 栏一致，改须带订正记录；新补判问项（确定关系起）由月稿写定后回写五气源。

月稿的发布与应用切换分开：当前为预览，既有运行数据不因部分稿完成而换库；整库完成后再做集成验收。作者读回、独立排盘、古籍解释审计、独立全文复核和用户逐篇验收分别登记。
