import {loadLibrary,getVoidReleaseTargets,createDetailsRepository,createNarrativeRepository,MONTH_ORDERS} from '../src/index.js';
const $=s=>document.querySelector(s),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const lib=await loadLibrary(),details=createDetailsRepository({library:lib}),narratives=createNarrativeRepository({library:lib});let reading,detailRequest=0,storyRequest=0;
$('#primary').innerHTML=lib.listHexagrams().map(h=>`<option value="${h.id}">${h.id} · ${esc(h.name)}</option>`).join('');$('#primary').value='49';
$('#domain').innerHTML=lib.listDomains().map(d=>`<option value="${d.id}">${esc(d.title)}</option>`).join('');$('#domain').value='domain-02';
$('#month').insertAdjacentHTML('beforeend',MONTH_ORDERS.map(o=>`<option value="${o.id}">${o.label}</option>`).join(''));
async function showStory(current){
 const ticket=++storyRequest,order=$('#month').value;
 if(!order){$('#story').textContent='选择月令后，可阅读本次事情的故事与应期。';$('#case-links').textContent='';return;}
 $('#story').textContent='正在读取故事…';
 try{
  const story=await narratives.getStory({primaryId:current.primaryId,movingLine:current.movingLine,monthOrder:order,domainId:current.domain.id,voidContext:$('#ganzhi').value?{ganzhi:$('#ganzhi').value}:{},timingScale:$('#timing-scale').value||null});
  if(ticket!==storyRequest)return;
  $('#story').innerHTML=story.paragraphs.map(p=>`<p>${esc(p)}</p>`).join('');
  const cases=await narratives.getClassicalCases({primaryId:current.primaryId,movingLine:current.movingLine});if(ticket!==storyRequest)return;
  $('#case-links').innerHTML=cases.length?cases.map(c=>`<details><summary>古籍案例 · ${esc(c.title)}</summary><p>原断：${esc(c.prediction.text)}</p><p>书中反馈：${c.feedback?esc(c.feedback.text):'本节未另述事后反馈。'}</p>${c.auditNotes.map(n=>`<p>${esc(n)}</p>`).join('')}<details><summary>核对本节原文</summary><p class="prose">${esc(c.sourceText)}</p></details></details>`).join(''):'<p>本次完整盘位暂无已拆解的同盘案例，不用近似盘的反馈代替。</p>';
 }catch(e){if(ticket===storyRequest)$('#story').textContent='故事暂不可用：'+e.message;}
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
 reading=lib.createReading({primaryId:Number($('#primary').value),movingLine:Number($('#moving').value),domainId:$('#domain').value,calendar:$('#month').value?{season:MONTH_ORDERS.find(o=>o.id===$('#month').value).season}:{},voidContext:$('#ganzhi').value?{ganzhi:$('#ganzhi').value}:{}});
 $('#error').textContent='';$('#roles').textContent=`体：自己 · 主（${reading.body.trigram}${reading.body.element}，${reading.body.side==='upper'?'上卦':'下卦'}）　用：事情 · 事（${reading.use.trigram}${reading.use.element}，${reading.use.side==='upper'?'上卦':'下卦'}）`;
 $('#panels').innerHTML=Object.values(reading.stages).map(s=>`<article data-stage="${s.stage}"><p class="phase">${s.caption}</p><button class="panel-detail">${s.stage==='primary'?'本卦':s.stage==='mutual'?'互卦':'变卦'} · ${esc(s.name)}</button>${lib.renderHexagramSVG(s.id,{movingLine:reading.movingLine,stage:s.stage,svgId:s.stage})}<p class="grade">${esc(s.baseGrade)}</p></article>`).join('');
 const edge=reading.edges.find(e=>e.targetRole==='use');$('#relation').textContent=`${edge.label} → ${edge.phrase}`;
 const rows=reading.nodes.map(n=>`<tr><td>${esc({body:'体',use:'用',body_mutual:'体互',use_mutual:'用互',body_inherited:'体·沿用',changed_use:'变用'}[n.role])}</td><td>${n.trigram}${n.element}</td><td>${esc(n.strength.label)}</td><td>${esc(n.void.label)}</td></tr>`).join('');
 const targets=$('#ganzhi').value?getVoidReleaseTargets($('#ganzhi').value).targets.map(t=>`${t.emptyBranch}空：填${t.fill}，冲${t.clash}`).join('；'):'旬空待提供';
 $('#context').innerHTML=`<table><thead><tr><th>位置</th><th>卦</th><th>时令</th><th>旬空</th></tr></thead><tbody>${rows}</tbody></table><p>${esc(targets)}</p><p>先辨起卦时真空／假空；真空不因后遇填冲自动恢复。合空默认关闭。</p>`+reading.edges.map(e=>`<p>${esc(e.targetRole)}：${esc(e.label)} · ${esc(e.qualitativeNote)}</p>`).join('');
 $('#domain-text').textContent=reading.domain.text;showDetail('primary',reading.movingLine);showStory(reading);
 }catch(e){$('#error').textContent=e.message;}
}
$('#controls').addEventListener('submit',e=>{e.preventDefault();update();});
$('#panels').addEventListener('click',e=>{const article=e.target.closest('article');if(!article)return;const line=e.target.closest('[data-line-position]');if(line)showDetail(article.dataset.stage,Number(line.dataset.linePosition));else if(e.target.closest('.panel-detail'))showDetail(article.dataset.stage);});
$('#panels').addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)&&e.target.matches('[data-line-position]')){e.preventDefault();showDetail(e.target.closest('article').dataset.stage,Number(e.target.dataset.linePosition));}});
update();
