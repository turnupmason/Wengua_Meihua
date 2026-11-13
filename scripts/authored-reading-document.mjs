/** The per-hexagram Markdown layout consumed by the reading export. */
export const READING_DOCUMENT_DEMO_DATE = '2026-11-11';
export const READING_DOCUMENT_TIMING_CONTEXT = {castingMethod:'pre-heaven',periodMethod:'element-qi'};

export function readingDocumentHeader(primaryId, name) {
 return `# ${primaryId} · ${name}：六动爻与十二月令\n\n本页30份完整正文对应72个月令槽位。应期以${READING_DOCUMENT_DEMO_DATE}作日序演示，各组月令另行给定。\n\n`;
}

export function renderReadingDocumentEntry({row, reading, paragraphs, sourceTitles, calculation}) {
 return [
  `## ${reading.selectedMovingLine.label}动 · ${row.monthBranches.map(branch => branch + '月').join('、')}`,
  row.copy.title,
  row.facts.stages.map(stage => stage.name).join(' → '),
  '简断',
  row.copy.short.text,
  ...paragraphs,
  '古籍依据：' + sourceTitles + '。',
  '动爻完整原文：' + row.movingLineText,
  '<details>\n<summary>计算说明</summary>',
  `对照用月令：${row.monthBranches[0]}月；本组共用：${row.monthBranches.join('、')}。实际输入仍显示实际月令。`,
  reading.nodes.filter(node => node.role !== 'body_inherited').map(node => `${node.role}：${node.trigram}${node.element}，${node.strength.state}`).join('；') + '。',
  '应期用实际起卦日重算。表中月份用于对照正文。',
  ...calculation,
  '</details>',
 ].join('\n\n') + '\n\n';
}
