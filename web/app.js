import {loadLibrary,getCivilDay,getVoidReleaseTargets,createDetailsRepository,createNarrativeRepository,createProductRepository,buildInterpretationEvidence,MONTH_SLOTS} from '../src/index.js';
import {createContextualReading} from '../src/interview-manuscripts.js';
const $=s=>document.querySelector(s),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const lib=await loadLibrary(),details=createDetailsRepository({library:lib}),narratives=createNarrativeRepository({library:lib}),questions=createProductRepository({library:lib});let reading,detailRequest=0,storyRequest=0;
const questionCatalog=await questions.getCatalog();
const now=new Date(),localDate=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
$('#casting-date').value=localDate;$('#ganzhi').value=getCivilDay(localDate).dayGanzhi;
$('#primary').innerHTML=lib.listHexagrams().map(h=>`<option value="${h.id}">${h.id} · ${esc(h.name)}</option>`).join('');$('#primary').value='49';
$('#domain').innerHTML=questionCatalog.categories.map(c=>`<option value="${c.id}">${c.number} · ${esc(c.label)}</option>`).join('');
function selectedQuestion(){return questionCatalog.categories.flatMap(c=>c.subcategories).flatMap(s=>s.questions).find(q=>q.id===$('#question-item').value);}
const contextLabels={keys:'钥匙',wallet:'钱包',phone:'手机',documents:'证件或文件',jewellery:'首饰',other:'其他物品','self-use':'自住',investment:'投资'};
function refreshContext(){
 const q=selectedQuestion();
 $('#context-fields').innerHTML=Object.entries(q.contextFields).map(([key,f])=>`<label>${esc(f.label)}${f.type==='year'?`<input data-product-context="${key}" type="number" min="1900" max="2200" value="${Number($('#casting-date').value.slice(0,4))||now.getFullYear()}" required>`:`<select data-product-context="${key}" required><option value="">请选择</option>${f.options.map(v=>`<option value="${esc(v)}">${esc(contextLabels[v]||v)}</option>`).join('')}</select>`}</label>`).join('');
 const info=q.mode!=='narrative';document.querySelectorAll('[data-chart-control],.stone,.detail,#context-panel,#source-panel').forEach(el=>el.hidden=info);
 $('#view-button').textContent=info?'查看说明':'查看卦象';$('#story-label').textContent=q.mode==='reference'?'查看传统象意说明':q.mode==='guidance'?'查看现实查找建议':'展开本次解读';
 $('#question-note').textContent=q.categoryId==='health'?'健康类提供古籍术语与传统象意查阅。':'选择一个具体问题，一次只问一件事。';
 if(info)$('#story-panel').open=true;
}
function refreshQuestions(){
 const sub=questionCatalog.categories.flatMap(c=>c.subcategories).find(s=>s.id===$('#subcategory').value);
 $('#question-item').innerHTML=sub.questions.map(q=>`<option value="${q.id}">${esc(q.question)}</option>`).join('');refreshContext();
}
function refreshSubcategories(){
 const c=questionCatalog.categories.find(c=>c.id===$('#domain').value);
 $('#subcategory').innerHTML=c.subcategories.map(s=>`<option value="${s.id}">${esc(s.label)}</option>`).join('');refreshQuestions();
}
refreshSubcategories();
$('#month').insertAdjacentHTML('beforeend',MONTH_SLOTS.map(o=>`<option value="${o.branch}">${o.label}</option>`).join(''));
async function showStory(current){
 const ticket=++storyRequest,order=current.selectedMonthOrder;$('#story').textContent='正在读取…';$('#case-links').textContent='';
 try{
  const selected=await questions.getQuestion(current.questionId);if(ticket!==storyRequest)return;
  const advice=[...selected.practicalAdvice,...(current.productContext.objectKind?questionCatalog.objectPracticalAdvice[current.productContext.objectKind]||[]:[])];
  const adviceHTML=[...new Set(advice)].map(p=>`<p>${esc(p)}</p>`).join('');
  if(!order&&selected.mode==='narrative'){$('#story').innerHTML=adviceHTML+'<p>选择月令后，可查看本次事项。</p>';return;}
  const content=await questions.getContent({questionId:current.questionId,categoryId:selected.categoryId,subcategoryId:selected.subcategoryId,context:current.productContext,primaryId:current.primaryId,movingLine:current.movingLine,monthOrder:order||undefined,monthBranch:current.selectedMonthBranch||undefined,voidContext:current.selectedVoidContext,castingDate:current.castingDate,timingScale:'day',timingContext:current.timingContext});
  if(ticket!==storyRequest)return;
  let body;
  if(content.status==='ready'&&content.short){
   const explanation=content.calculationExplanation?`<details class="calculation-explanation"><summary>计算说明</summary>${content.calculationExplanation.paragraphs.map(p=>`<p>${esc(p)}</p>`).join('')}</details>`:'';
   const timing=content.timingSection?`<section class="timing-section" aria-label="应期参考"><h4>${esc(content.timingSection.title)}</h4><p class="reference-note">${esc(content.timingSection.referenceNote)}</p>${content.timingSection.windows.map(w=>`<article class="timing-window" data-event-id="${esc(w.slotId)}"><p><span class="badge">${esc(w.valence)}应</span> ${esc(w.event)}</p><p>${esc(w.text)}</p></article>`).join('')}</section>`:'';
   body=`<h3>${esc(content.title)}</h3><p class="short-reading">${esc(content.short)}</p>${timing}<details class="long-reading"><summary>详断</summary>${(content.narrativeParagraphs||content.paragraphs).map(p=>`<p>${esc(p)}</p>`).join('')}</details>${explanation}`;
  }
  else if(['reference','guidance','ready'].includes(content.status))body=content.paragraphs.map(p=>`<p>${esc(p)}</p>`).join('');
  else if(content.status==='requires-context')body='<p>请先补充'+content.missingContext.map(k=>esc(selected.contextFields[k]?.label||{castingDate:'起卦日期',monthOrder:'月令',monthBranch:'月令',timingScale:'按日取期尺度',timingMethod:'本次取期依据'}[k]||k)).join('、')+'。</p>';
  else if(content.status==='pending-review')body='<p>这项解读还在核对。你可以先查看卦象、动爻和古籍原文。</p>';
  else if(content.status==='pending-authoring')body='<p>这项解读正在整理，你可以先查看本次卦象和古籍原文。</p>';
  else body='<p>这项解读的日期尚未核定，先查看卦象与原文。</p>';
  $('#story').innerHTML=[...new Set(content.practicalAdvice)].map(p=>`<p>${esc(p)}</p>`).join('')+body;
  if(selected.mode!=='narrative')return;
  const cases=await narratives.getClassicalCases({primaryId:current.primaryId,movingLine:current.movingLine});if(ticket!==storyRequest)return;
  $('#case-links').innerHTML=cases.length?cases.map(c=>`<details><summary>古籍原例 · ${esc(c.title)}</summary><p>原断：${esc(c.prediction.text)}</p><p>书中反馈：${c.feedback?esc(c.feedback.text):'本节未另述事后反馈。'}</p>${c.auditNotes.map(n=>`<p>${esc(n)}</p>`).join('')}<details><summary>核对本节原文</summary><p class="prose">${esc(c.sourceText)}</p></details></details>`).join(''):'';
 }catch(e){if(ticket===storyRequest)$('#story').textContent='暂不可用：'+e.message;}
}
function passage(p){return `<p class="classical">${esc(p.text)}</p><p>${esc(p.vernacular)}</p><h4>象传</h4><p class="classical">${esc(p.image)}</p><p>${esc(p.imageVernacular)}</p>`;}
async function showDetail(stage,line=null){
 const request=++detailRequest;
 const panel=reading.stages[stage],h=panel.detail;
 $('#detail-title').textContent=h.name+(line?' · '+h.lines[line-1].label:' · 卦意');
 const record=line?lib.getLineReading(h.id,line):h.reading;
 $('#detail').innerHTML=passage(record)+(stage==='primary'&&line===reading.movingLine?'<p class="badge">本次动爻 · 与发光爻对应</p>':'')+`<a href="${esc(h.referenceUrl)}" target="_blank" rel="noopener noreferrer">核对古典参考本</a><div id="extended-detail">载入详解…</div>`;
 try{
  const d=line?await details.getLine(h.id,line):await details.getHexagram(h.id);
  if(request!==detailRequest)return;
  const structural=line?`<h4>爻位与变化</h4><p>${esc(d.label)} · ${d.structure.polarity==='yang'?'阳爻':'阴爻'} · ${d.structure.correctPosition?'得位':'失位'}${d.structure.central?' · 居中':''}<br>本爻变化 → ${esc(d.changedHexagram.name)}</p>`:'';
  const notes=line?d.editorialNotes.map(n=>`<h4>经义整理</h4><p>${esc(n.text)}</p>`).join(''):'';
  $('#extended-detail').innerHTML=structural+notes+`<button data-commentary-id="${h.id}" data-commentary-line="${line||0}">阅读整理注解</button><div id="source-commentary"></div>`;
 }catch{if(request===detailRequest)$('#extended-detail').textContent='详解暂不可用，以上经文仍可阅读。';}
}
$('#detail').addEventListener('click',async e=>{
 const button=e.target.closest('[data-commentary-id]');if(!button)return;const request=detailRequest;
 button.disabled=true;
 try{const d=await details.getReferenceCommentary(Number(button.dataset.commentaryId),{position:Number(button.dataset.commentaryLine)||null});if(request!==detailRequest)return;
  $('#source-commentary').innerHTML='<p class="reference-note">传统注解供参考；作者署名沿用整理稿。新编经义另行标示。</p>'+d.groups.flatMap(g=>g.sections).map(s=>`<h4>${esc(s.title)}</h4>${s.paragraphs.map(p=>`<p>${esc(p.text)}</p>`).join('')}`).join('');
 }catch{if(request===detailRequest)$('#source-commentary').textContent='整理注解暂不可用。';}
 finally{if(request===detailRequest)button.disabled=false;}
});
function update(){try{
 const selected=selectedQuestion();if(!selected)throw new Error('请选择具体问题。');
 const productContext=Object.freeze(Object.fromEntries([...document.querySelectorAll('[data-product-context]')].filter(el=>el.value!=='').map(el=>[el.dataset.productContext,el.type==='number'?Number(el.value):el.value])));
 const sourceDomainId=selected.chartSourceDomainId;
 if(selected.mode!=='narrative'){
  reading=null;detailRequest++;$('#error').textContent='';
  showStory({questionId:selected.id,productContext,selectedMonthOrder:null});return;
 }
 const selectedMonthBranch=$('#month').value,selectedMonthOrder=MONTH_SLOTS.find(m=>m.branch===selectedMonthBranch)?.qi||'',selectedVoidContext=Object.freeze($('#ganzhi').value?{ganzhi:$('#ganzhi').value}:{});
 const castingDate=$('#casting-date').value,timingContext=Object.freeze({castingMethod:$('#timing-method').value==='pre-heaven-demo'?'pre-heaven':'manual',periodMethod:'element-qi'});
 const chart=selectedMonthOrder?createContextualReading({library:lib,question:selected,primaryId:Number($('#primary').value),movingLine:Number($('#moving').value),monthOrder:selectedMonthOrder,monthBranch:selectedMonthBranch,castingDate,voidContext:selectedVoidContext}):lib.createReading({primaryId:Number($('#primary').value),movingLine:Number($('#moving').value),domainId:sourceDomainId,question:selected.question,calendar:{},voidContext:selectedVoidContext});
 reading=Object.freeze({...chart,questionId:selected.id,productContext,selectedMonthOrder,selectedMonthBranch,selectedVoidContext,castingDate,timingContext});
 $('#error').textContent='';$('#roles').textContent=`体：自己 · 主（${reading.body.trigram}${reading.body.element}，${reading.body.side==='upper'?'上卦':'下卦'}）　用：事情 · 事（${reading.use.trigram}${reading.use.element}，${reading.use.side==='upper'?'上卦':'下卦'}）`;
 $('#panels').innerHTML=Object.values(reading.stages).map(s=>`<article data-stage="${s.stage}"><p class="phase">${s.caption}</p><button class="panel-detail">${s.stage==='primary'?'本卦':s.stage==='mutual'?'互卦':'变卦'} · ${esc(s.name)}</button>${lib.renderHexagramSVG(s.id,{movingLine:reading.movingLine,stage:s.stage,svgId:s.stage})}<p class="grade">${esc(s.baseGrade)}</p></article>`).join('');
 const edge=reading.edges.find(e=>e.targetRole==='use');$('#relation').textContent=`体用关系：${edge.label}`;
 const evidence=selectedMonthOrder?buildInterpretationEvidence(reading,{monthOrder:selectedMonthOrder}):null;
 const rows=reading.nodes.map(n=>`<tr><td>${esc({body:'体',use:'用',body_mutual:'体互',use_mutual:'用互',body_inherited:'体·沿用',changed_use:'变用'}[n.role])}</td><td>${n.trigram}${n.element}</td><td>${esc(evidence?evidence.nodes.find(x=>x.role===n.role).strength.state:'月令未选')}</td><td>${esc(n.void.hitKind==='partial'?'半空：'+(n.void.matchedBranches||[]).join('、')+'（减力，仍有作用）':n.void.label)}</td></tr>`).join('');
 const targets=$('#ganzhi').value?getVoidReleaseTargets($('#ganzhi').value).targets.map(t=>`${t.emptyBranch}空：填${t.fill}，冲${t.clash}`).join('；'):'旬空待提供';
 $('#context').innerHTML=`<table><thead><tr><th>位置</th><th>卦</th><th>时令</th><th>旬空</th></tr></thead><tbody>${rows}</tbody></table><p>${esc(targets)}</p><p>全空与半空按八卦配支记录。填冲支只作对应关系，不代表已核定应验日期。</p>`+reading.edges.map(e=>`<p>${esc(e.targetRole)}：${esc(e.label)} · 直接关系</p>`).join('');
 $('#domain-text').textContent=reading.domain.text;showDetail('primary',reading.movingLine);showStory(reading);
 }catch(e){$('#error').textContent=e.message;}
}
$('#controls').addEventListener('submit',e=>{e.preventDefault();update();});
$('#domain').addEventListener('change',()=>{refreshSubcategories();update();});
$('#subcategory').addEventListener('change',()=>{refreshQuestions();update();});
$('#question-item').addEventListener('change',()=>{refreshContext();update();});
$('#context-fields').addEventListener('change',update);
$('#casting-date').addEventListener('change',()=>{if($('#casting-date').value)$('#ganzhi').value=getCivilDay($('#casting-date').value).dayGanzhi;update();});
$('#panels').addEventListener('click',e=>{const article=e.target.closest('article');if(!article)return;const line=e.target.closest('[data-line-position]');if(line)showDetail(article.dataset.stage,Number(line.dataset.linePosition));else if(e.target.closest('.panel-detail'))showDetail(article.dataset.stage);});
$('#panels').addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)&&e.target.matches('[data-line-position]')){e.preventDefault();showDetail(e.target.closest('article').dataset.stage,Number(e.target.dataset.linePosition));}});
update();
