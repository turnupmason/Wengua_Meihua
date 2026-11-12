当前基础覆盖：1,920份全文、4,608个月令键、384种卦爻组合，见[完整目录](INTERVIEW_PASS_ALL_BASES.md)与[接入V9](CLAUDE_BUILD_PROMPT_V9.md)。原60份稿保留；新增稿为逐爻解释与明确判据的预编译成文，人工全文复核与独立审核范围另有标记。JSON按卦惰性加载，实际日期与月令仍从本次资料计算。

SQL注意：data/authored-readings.sql只保留结构；完整数据由npm run build:interview生成到dist/authored-readings.sql，再随npm run build:sqlite导入。以下关于60行、144键等为历史首组说明，不代表当前计数。

# 实时上下文、简断与应期显示

当前面试基础库有 384 种卦爻组合、4,608 个检索位置和 1,920 篇预写正文。现行稿件和修订见 [终校记录](INTERVIEW_FINAL_REVIEW_20261112.md)。

## 实际调用

```js
const result = await product.getContent({
  questionId: 'career.interview.interview-pass',
  primaryId: 5,
  movingLine: 2,
  monthBranch: '卯',
  castingDate: '2027-03-20',
  timingScale: 'day',
  timingContext: {castingMethod:'pre-heaven', periodMethod:'element-qi'}
});
```

寅月与卯月可指向同一份已写正文，但result.monthBranch与calculationExplanation.month.branch显示本次传入的卯。`castingDate` 用于本次日干支及符合取期条件的日期换算。

只传旧monthOrder气类而未提供monthBranch时，接口可按相同气类查稿，但monthBranch为null，说明显示“具体月令未提供”；查稿所用的代表位置不是实际月令。

月令来自起卦资料。未接通节气算法前由调用方明确提供，不把公历月份直接当月令。起卦日按当地保存的完整民用日期传入；历史记录继续使用原起卦日，查看日仅影响日期标签。

## 前台四块内容

| 字段 | 用途 |
| --- | --- |
| short | 60–120汉字的自然简断，回答走向与关键建议 |
| timingSection | 单独的应期参考栏，提供具体日期、事件和吉凶 |
| narrativeParagraphs | 开局、过程、结局、总断四段 |
| calculationExplanation | 默认折叠的计算说明，含真实月令、日干支及取期依据 |

简断不出现“应期留意……”“留意某窗口”“吉应、凶应”或要求去查看计算的提示。具体时间不在简断里兜圈子，直接在应期栏显示。

timingSection.title为“应期参考”，referenceNote为“以下为传统推算的参考窗口。”。每个windows条目保留独立slotId、event、valence、eventScope、calculationBasis、displayedDates与已填好日期的text；有利、不利或阶段性窗口分开显示。

paragraphs/story仍提供含应期的完整导出格式。使用独立日期栏时，详断读取narrativeParagraphs，避免把同一应期再显示一遍。日期之外的断语正文事先写定，不交给运行时语言模型生成。

## 对照资料与实时资料

静态 JSON 的 `facts.referenceContext` 记录演示资料，`displayInUserResult` 为 `false`。正式面试结果使用实际输入重算。若起卦方法或尺度不适合先天卦气取日，照常显示正文，在应期栏说明此盘未取日期。

以下均是调用方显式指定卯月、读取同一需九二春令正文的测试：

| 起卦日 | 实际显示月令 | 日干支 | 前两个参考日期 |
| --- | --- | --- | --- |
| 2027-03-20 | 卯月 | 戊戌 | 本月30、31号 |
| 2028-03-20 | 卯月 | 甲辰 | 本月24、25号 |

这核对的是上下文与历法换算，不表示参考日期保证现实结果。应期断法的独立复核状态继续保持pending。

## 持续检查

checkInterviewShort在构建和读取时检查简断与时间、计算提示是否混杂，原有汉字长度、完整结构、同结论绑定、月令旺衰和冲突校验继续生效。回归测试包括十二月令共享时的实际身份、2027 与 2028 年干支与日期重算、独立应期栏和无具体月令的旧接口。
