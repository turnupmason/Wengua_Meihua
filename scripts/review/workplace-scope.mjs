// Only the monthly stability forecast is public copy. Correction records retain the source witness.
const industryDetails = /合同|库存|仓储|仓库|盘货|盘点|供应商|发票|报销|核销|工单|订单|货款|投标|结案|交接单|验货|报表|盖章|工位|值班表|排班|图纸|报关|服务器|生产线|设备检修|审批单|台账|进货|材料清单/u;
const inventedEvent = /原来一处小问题已经处理好|昨天.{0,14}(?:通知|宣布)|(?:主管|老板|公司)已经(?:宣布|通知你|决定辞退)|突然被调|已经领到年终奖/u;
const unquote = text => text.replace(/[「『“][^」』”]*[」』”]/gu, '');
function* phrases(text) {
 for (const sentence of unquote(text).split(/[。！？]/u)) {
  const chars = sentence.replace(/[^\p{Letter}\p{Number}]/gu, '');
  for (let start = 0; start + 10 <= chars.length; start++) yield chars.slice(start, start + 10);
 }
}
export function workplaceScopeIssues(article, baseline) {
 const issues = [];
 const editorial = [['title',article.title], ['short',article.short], ...article.paragraphs.map((p,i)=>['paragraph '+(i+1),p])];
 const timing = typeof article.timing === 'string' ? [article.timing] : article.timing.flatMap(slot=>slot.slice(2,5));
 const fields = [...editorial, ['judgment',article.judgment], ...timing.map((t,i)=>['timing '+(i+1),t])];
 for (const [field,text] of fields) {
  // 孔疏释小畜九五的「志意合同」说的是心意相合。
  const hit = text.replaceAll('志意合同','志意相合').match(industryDetails) ?? unquote(text).match(inventedEvent);
  if (hit) issues.push({check:'workplace-situation',detail:field+' · '+hit[0]});
 }
 if (typeof article.timing === 'string' && article.timing.trim().length < 6)
  issues.push({check:'workplace-timing-fragment',detail:article.timing});
 const originalTiming = typeof baseline[10] === 'string' ? [baseline[10]] : baseline[10].flatMap(slot=>slot.slice(2,4));
 const oldPhrases = new Set([...baseline.slice(3,9), ...originalTiming].filter(t=>typeof t==='string').flatMap(t=>[...phrases(t)]));
 for (const [field,text] of editorial) {
  for (const phrase of phrases(text)) if (oldPhrases.has(phrase)) {
   issues.push({check:'workplace-five-season-prose',detail:field+' · '+phrase});
   break;
  }
 }
 return issues;
}
