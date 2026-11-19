# 逐月长稿写作说明（面试以外各问项通用，Opus）

用户 2026-11-19 定：面试由用户自己完成；**其余所有问项一律照面试逐月长稿的写作手法与格式**——每卦 72 篇（六爻 × 十二月），自然段长文。之前按「开局／过程／结局／总断」四栏写的短稿都不算过关。

工作目录 `D:\Wengua-Meihua\Wengua_Meihua`。不构建 SQL，不提交 git，只动分给你的问项和卦。

## 一、先读（必须）

范本在 git 分支 `origin/editorial/interview-preview-216-20261118`，用 `git show` 读：

```bash
git show origin/editorial/interview-preview-216-20261118:docs/review/INTERVIEW_MONTHLY_REWRITE_20261118.md
git show origin/editorial/interview-preview-216-20261118:docs/review/INTERVIEW_MONTHLY_AUDIT_METHOD.md
git show origin/editorial/interview-preview-216-20261118:docs/interview-pass/monthly-preview/hex-003.md
git show origin/editorial/interview-preview-216-20261118:sources/editorial/interview-pass/monthly/hex-003.json
git show origin/editorial/interview-preview-216-20261118:sources/editorial/interview-pass/reviews-monthly/hex-003.json
```

前两份是规范与核查方法，**照办**（把「面试」换成你的问项）。再从 hex-001、hex-003、hex-017、hex-052 里各读至少 6 篇范文（能过与过不了都要有），体会写法与厚度。只学写法，不抄句子。

另读你的问项专项说明（例如确定关系读 `docs/review/ESTABLISHMENT_MONTHLY_BRIEF.md`）和该问项的补判记录（`docs/review/*_REJUDGE_*.md`）。

## 二、写法（照面试规范）

- **正文**约 450–650 汉字（检查下限 400、上限 700），按解释所需增减，不靠重复结论或通用建议凑字。
- **自然段**，通常五段，至少三段；不分开局、过程、结局、总断。
  - **首段首句**明说本篇结论（各问项判词见专项说明），首段讲清这一结论的要点；
  - 其后按本篇需要安排：体的处境与月令旺衰、本用与两互的生克（帮在哪、阻在哪、有多重）；动爻爻辞与小象（照录原句，再讲它说的是什么、落在所问的哪一面，可参王注孔疏）；变卦与末段走向；对应的准备与分寸；
  - 有利条件如实写，不为凑成失败故事把旺写弱、把有生写无生，也不把吉辞缩成小事；不利的也如实写，不为凑成功把克写没。
- **术语**：白话为主，保留确实帮助理解的体用、生克、旺衰、比和、互变、动爻等，并顺手说明它在本问里是什么意思（例：「以乾金为体，寅月金囚，发挥的根基偏弱」「巽木受乾金所克，是体克用，表示仍须靠自身主动处理」）。内部审稿用语（口径、定档、有条件、R 代号、复核、原稿、改判、存疑、待核）不进正文。
- **不编**：不编对方原话、心理、人数、名次、次数、金额、日期、具体经过与场景细节；爻辞意象不直接变成现代事实；建议不反过来充当预测的证据。
- **同气月份**（寅卯、巳午、申酉、亥子、辰未戌丑）：判断（outcome、judgment）与取期结构完全相同，文章逐月分别写，不添加没有依据的月支冲合或轻重差异。
- **简断**另写 60–120 汉字，首句明说结论，供列表与摘要用；全文独立成篇，不与简断重复同一段。
- **标题**一句短语（约 6–14 字），点出本篇的要点，全库不重复。
- **查重**：全库（同一问项全部已写卦）不许整篇、整段相同，剔除「」引文后 24 汉字以上的整句不许重复。古籍原句可照引；常用短术语不必为避重改名。
- **不含糊**：有望、偏难、多半、大概率、或许、未必、恐怕、把握不大、可能性、说不准、难说、看运气等，不进简断与首句。

## 三、作者源

`sources/editorial/<问项>/monthly/hex-NNN.json`：

```json
{"schemaVersion":"1.0.0","primaryId":N,"baselineCommit":"<git rev-parse HEAD>","articles":[ … 72 篇 … ]}
```

按动爻 1–6、月支寅卯辰巳午未申酉戌亥子丑排序。每篇字段：

- `movingLine`、`monthBranch`、`outcome`：身份与现行结论，`outcome` 必须等于五气作者源 `sources/editorial/<问项>/hex-NNN.json` 同爻同气那一行的第 2 栏，**一字不动**。
- `title`、`short`、`paragraphs`：逐篇写定的标题、摘要、完整正文自然段（字符串数组）。
- `judgment`：专业说明。
  - 已定稿问项（考试、晋升、转正、职场、跳槽）：照抄五气源同气那一行的第 9 栏；确有事实或引文错误要改，按面试核查方法第「专业说明的证据订正」节加 `judgmentCorrection`（old、new、reason、sourceEvidence、impact），不得暗改。
  - 新补判问项（确定关系等，专项说明会写明）：五气源第 9 栏尚未写定，由你按该问项补判记录写这一气的专业说明，写明「定为……」与由来；同气两三个月完全相同。写完我会回写五气源。
- `timing`：取期规格，照抄五气源同气那一行的第 10 栏结构（数组或无期说明字符串）。数组每项 `[种类, 位置, 事件, 提示, 依据]`：种类、位置、方法不许改；事件、提示、依据里的无据情节可清理、可重写（规则见 `docs/review/READ_THROUGH_BRIEF.md` 第八节；提示不以「若、如、近期、要是」起句；无期说明 30–60 字，不用「日级、节点、生体、克体、依据不足」）。同气月份完全相同。

写入方法：自己在草稿子目录放一个 node 脚本，按爻追加文章后 `JSON.stringify(obj, null, 1)` 写入作者源。**每次只写一个爻的 12 篇**，写完马上跑检查，再写下一爻，避免单次输出过长被打断。正文只写日常场面，不用灾祸、刑狱、伤病一类比喻。

## 四、核读回执

`sources/editorial/<问项>/reviews-monthly/hex-NNN.json`，字段照面试回执：

- `primaryId`、`baselineCommit`、`editor`、`reviewedAt`（ISO 时间）、`wholeArticlesRead`（实际读回的篇数，72 篇全部读回才写 72）、`sourceSha256`（定稿后作者源文件内容的 SHA-256，用 `node -e "console.log(require('crypto').createHash('sha256').update(require('fs').readFileSync(PATH,'utf8')).digest('hex'))"` 算）、`reviewerIsHuman:false`、`userIndividuallyAccepted:false`、`status:"partially-reviewed"`；
- `authorshipScope`：写了什么、怎么读回、不冒称什么；
- `sourceEvidence`：实际读过的文件与范围（五气作者源、review-v2、polish-v5、data 排盘、`sources/reference/zhouyi-zhengyi-hans/` 对应卦的王注孔疏等）；
- `lineReviews`：六条，每条 `{movingLine, text（爻辞）, image（小象）, reading（本问项的读法、取舍与边界）, status, openFindingIds}`；
- `findings`：发现的问题与处理，每条 `{id, status, keys, finding}`，status 用 `open-priority`（结论与古籍吉凶有张力、待裁定）、`corrected-classical-application`、`interpreted-with-limits`、`fixed-documentation-conflict`、`corrected-unsupported-scenes` 等；
- `batchReadback`：六条，每爻一条 `{movingLine, wholeArticlesRead:12, months, scope, status:"author-readback-complete"}`；
- `checks`：检查结果摘要；`independentReview:{status:"pending",reviewerIsHuman:false,scope:"…"}`；`realWorldPredictionAccuracy:"not-validated"`。

未读的不登记已读；脚本跑过不等于读过。

## 五、检查与交付

```bash
node scripts/review/check-monthly.mjs <问项> --hex N --draft   # 写作中（一爻写完就跑）
node scripts/review/check-monthly.mjs <问项> --hex N           # 72 篇与回执齐后，必须 status passed
node scripts/build-monthly.mjs <问项> --hex N                   # 生成阅读页 docs/<问项>/monthly-preview/hex-NNN.md
```

检查项：十二月键顺序与完整、结论与五气源一致、专业说明写明本篇结论、取期结构不变、同气一致、正文与简断字数、段数、首句与简断首句的判词、内部用语、含糊口气、正文引动爻爻辞原句、独立排盘比较、动态日期、全库整篇／整段／长句查重、回执哈希与 72 篇读回。别的代理同时在写别的卦，查重撞了改你这边。

## 六、回报（中文，简短）

每卦：72 篇是否写完、检查结果（status、正文字数范围）、回执是否齐；你认为结论或爻辞读法可能有误的盘（卦、爻、月令、理由、古籍出处），只报不改结论，并写进回执 findings（open-priority）。
