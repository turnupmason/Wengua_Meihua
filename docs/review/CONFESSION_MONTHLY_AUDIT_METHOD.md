# 暧昧表白逐月长稿：撰写、规则审计与分批交付

范围为已有喜欢对象而未正式确立关系的情形（`relationships.confession.decision`）。本次只建立逐月长稿预览，不将它直接写入实际应用的旧五气内容。旧库已有 64 卦 × 30 五气稿 = 1,920 篇，覆盖 4,608 月令键；其结论码分别为 favourable 227、conditional 913、difficult 780，取期 1,002 条（equal 384、support 359、control 259），明示欠缺条件的无期稿 918 篇。独立二读尚不得以旧作者核读代替。

## 撰写与审读边界

- 本问项同篇回答三个不同问题：对方心意的传统取象、近期对方自行发起联系的倾向、眼下是否适合表达好感。相互应答不是自行发起；一次接触不是心意证明；适度表达不等于提出立刻确立关系，实际关系须双方明确而自愿同意。不把古代婚占角色、男女礼制或爻中人物照字面套给现实当事人。
- 按《梅花易数·人事占》（mh-064）及《婚姻占》（mh-067）说明原体、本用及进退方向；结合完整动爻与王弼、孔颖达原注疏（必要时分辨程朱和其他本子）、体用互变与五态，分别说明前、中、末。生体可支持较主动的方向，但须有节点、时段与旺衰的依据，不当行为保证；比和不能分配发起方；克用说明问事方处理条件，体生用说明付出。无已核间接规则，不改变原体或月令五态。同气诸月判据相同，语句分别写定。
- 正文每篇 500–650 汉字，简断 60–120 汉字；不强制固定首句或禁尽自然月令起句。以具体爻理、相处片段的条件、实际对话分寸展开，避免自动扩写、模板或揣测真实人物心理。正文需实引实际动爻爻辞，引用以原典核查，不靠机器匹配代签古籍解释审阅。
- 不改旧结论码。`judgment` 和 `timing` 精确继承五气源第 9、10 下标；若古籍解释或现实边界需要订正，须分别附 `judgmentCorrection` 或 `timingCorrection`，绑定原值、新值、具体理由、本库证据路径与适用范围，注明 `impact.outcomeChanged=false`、`impact.timingSignatureChanged=false`。同气的专业判据及取期仍一致。不得藉润色新增期窗、换节点、许诺对方先联系或答应表白。取期只看实际已具备条件的阶段事件，按起卦日的合格日支换算；往来、联系发起和表达后的回应分别看待。
- 专业判据附件不是正文或简断：若原五气判据本身不足20汉字，但并非空值且与原第9下标逐字相等，按原值留存，并单列 `inheritedShortJudgments` 审计项（首例大畜初九冬水原判18汉字）；不视为缺失，不为过门槛添废话。新增或改写判据仍须达到原长度检查与证据要求；正文及简断的长度门槛完全不变。

## 机器检查与分批流程

1. 编写 `sources/editorial/confession-decision/monthly/hex-NNN.json`，结构与确定关系月稿一致。按初爻至上爻、寅卯辰巳午未申酉戌亥子丑顺序，每完成一动爻 12 篇即机查：`node scripts/review/check-monthly.mjs confession-decision --hex 1 --draft --json /tmp/confession-checks.json`。草稿可不足一爻，正式发布必须整爻且为连续顺序。
2. 机器独立以文王卦序八经卦位运算，比对原体、动爻、本互变、六节点五行五态及四条直接作用，检查旧判和取期、档案身份、正文字数、原爻引文、跨卦全文和整段以及剔除明示引文后的 24 汉字以上长句重合。另检三问相关语义词及明显把对方心意、行为、同意说死的高风险措辞，后者为人工审读提示；不能以该词汇筛查替代独立全文审核。
3. 作者逐篇读回，另由未参与写作的阅读人独立全文读审。两份回执分别在 `reviews-monthly` 和 `second-reviews-monthly` 同名 JSON，`status` 对应 `author-readback-complete` / `second-read-complete`，`questionId`、`primaryId`、`sourceSha256`、`editor`、`wholeArticlesRead`、`lineReviews`、`articleReviews` 均须与实际当前源及已完爻数相符；逐篇用 Node `sha256(JSON.stringify(article))` 绑定 `key` 与具体 `finding`。发生退修后只重读实际受改对象，未改的同哈希全文记录可继承，不能把机器扫描声称为阅读全文。作者及二读者标识不同；AI 不冒称真人、用户验收或预测效度验证。
4. 正式构建 `node scripts/build-monthly.mjs confession-decision --hex 1`，由已审源原样渲染，正式检查再加 `--docs` 对照精确渲染。`node scripts/update-monthly-index.mjs confession-decision --hex 1,2 --added 1,2` 以本次实际新加入篇数与之前清单差值计数，完整目标 4,608，不将未写完卦计成 72 篇；已发布卦可能仅 12/24/36/48/60/72 篇。持续加批时 `--hex` 为全部累计发布卦，`--added` 为实际新增篇数的卦。
5. 对已完成全部/部分月稿运行 `python3 scripts/review/check-missing-person-style.py --repo-root . --item confession-decision --output /tmp/confession-style.json`。它记录全部源 SHA，去明示引文、标点后统计首句、首段跨标点首12字及月支归一化、整爻十二月全部月令直起、连续开头、精确长句/分句重合及三字组 Jaccard 全对查。报告候选组供人逐篇改写；正常月令、术语与简短经典引介不自动当成错误。改稿再读、重新绑定 SHA 后复扫。

古籍出处与原有三问及动态取期政策见 [暧昧表白：断法与古籍出处](../CONFESSION_DECISION_POLICY.md)；通用逐月方法见 [MONTHLY_AUDIT_METHOD](MONTHLY_AUDIT_METHOD.md)。

完整卦的实际古籍、六爻应用及逐卦规则审计，陆续收入[逐卦古籍与规则审计目录](confession-decision/README.md)。每条以当批正式月稿源指纹及逐篇双读回执绑定，工作稿早期指纹保留为过程留痕；未完整的卦不提前写入该目录。
