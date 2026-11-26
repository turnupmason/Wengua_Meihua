// Narrow machine check; lexical indicators are not a substitute for actually reading each article.
const HEART=/心意|心思|好感|喜欢|情意|心里|动心|在意|亲近|靠近|真实感受|真正感受|感情|爱意|有意|相处/u;
const OUTREACH=/主动|自行|自发|自主|先联|先起|先收到对方来话|谁开口|自己(?:来|找|发|提|联系|联络|约|开口|问|打|回)|谁(?:会|愿|能)?先|哪一方(?:会)?先|哪边(?:会)?先|先(?:来|找|联系|联络|发|问|约|开口|打|起(?:联系|联络|话题))|发起|续起话题/u;
const CONFESS=/表白|告白|表意|挑明|说明心意|表达|说(?:出|清|明|自己的|一部分|喜欢|心意)|说破|开口|摊牌/u;
const patterns={
 'definite-heart':/对方(?:已经|一定|肯定|其实|就是|确实|必然|毫无疑问|早已)(?:很|也|早就|真的|非常|一直)?(?:喜欢|爱上|在意|心里有|对你有好感|有意|动心)/gu,
 'definite-outreach':/对方(?:一定|肯定|必然|必定|势必|准会)(?:会|要)?[^。！？；，]{0,16}(?:主动(?:联系|找你|约你|发消息)|来找你|给你发消息|找你联系|来信|来讯|来联络|发来消息|主动联络)/gu,
 'definite-consent':/对方(?:已经|一定|肯定|必然|必定|势必)(?:会|也|是)?(?:答应|接受|同意|愿意交往|愿意和你|想和你在一起)/gu,
 'guaranteed-result':/表白(?:一定|肯定|必定|必然)(?:会|能)?(?:成功|得到回应|被接受)|(?:一定|肯定|必定)(?:会|能)?(?:确定关系|在一起|接受表白)/gu,
};
const precondition=/(?:不能|不可|不应|不宜|未必|并非|不足以|无从|不等于|不要|别|莫|不能够|不是|没有|证明|判断|认定|断定|以为|误认|当作|解释为|看成|猜|推定|保证|等于|假定|假设|是否|若|如果|即使|假如|倘若)[^。！？；，]{0,12}$/u;
export function confessionScopeIssues(article) {
 const errors=[],warnings=[],body=Array.isArray(article.paragraphs)?article.paragraphs.join('\n'):'';
 const visibleTiming=typeof article.timing==='string'?article.timing:Array.isArray(article.timing)?article.timing.flatMap(s=>[s[2],s[3]]).join('\n'):'';
 const visible=[article.title,article.short,body,visibleTiming].join('\n');
 for(const [name,re] of [['heart',HEART],['outreach',OUTREACH],['confession',CONFESS]]){
  if(!re.test(body+'\n'+article.short))errors.push({check:'confession-three-questions',detail:'正文与简断缺少明确的'+name+'相关文字；独立读审须确认三问齐全'});
  else if(!re.test(article.short))warnings.push({check:'confession-short-scope',detail:'简断可能未明示'+name+'，请独立读审'});
 }
 for(const [name,re] of Object.entries(patterns))for(const match of visible.matchAll(re)){
  // Negated, quoted as a question, or hypothetical wording is not a positive claim.
  const before=visible.slice(Math.max(0,match.index-24),match.index);
  if(precondition.test(before))continue;
  const after=visible.slice(match.index+match[0].length,match.index+match[0].length+14);
  if(/^(?:吗|么|？|并非|尚未|还须|才知道|仍待|你的假定)/u.test(after))continue;
  warnings.push({check:'confession-'+name,detail:visible.slice(Math.max(0,match.index-14),match.index+match[0].length+12)});
 }
 return {errors,warnings};
}
