import {loadLibrary,getVoidReleaseTargets} from '../src/index.js';
const $=s=>document.querySelector(s),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const lib=await loadLibrary();let reading;
$('#primary').innerHTML=lib.listHexagrams().map(h=>`<option value="${h.id}">${h.id} · ${esc(h.name)}</option>`).join('');$('#primary').value='49';
$('#domain').innerHTML=lib.listDomains().map(d=>`<option value="${d.id}">${esc(d.title)}</option>`).join('');$('#domain').value='domain-02';
$('#month').insertAdjacentHTML('beforeend',[...'子丑寅卯辰巳午未申酉戌亥'].map(b=>`<option>${b}</option>`).join(''));
function passage(p){return `<p class="classical">${esc(p.text)}</p><p>${esc(p.vernacular)}</p><h4>象传</h4><p class="classical">${esc(p.image)}</p><p>${esc(p.imageVernacular)}</p>`;}
function showDetail(stage,line=null){
 const panel=reading.stages[stage],h=panel.detail;
 $('#detail-title').textContent=h.name+(line?' · '+h.lines[line-1].label:' · 卦意');
 const record=line?lib.getLineReading(h.id,line):h.reading;
 $('#detail').innerHTML=passage(record)+(stage==='primary'&&line===reading.movingLine?'<p class="badge">本次动爻 · 与发光爻对应</p>':'')+`<a href="${esc(h.referenceUrl)}" target="_blank" rel="noopener noreferrer">核对古典参考本</a>`;
}
function update(){try{
 reading=lib.createReading({primaryId:Number($('#primary').value),movingLine:Number($('#moving').value),domainId:$('#domain').value,calendar:$('#month').value?{monthBranch:$('#month').value}:{},voidContext:$('#ganzhi').value?{ganzhi:$('#ganzhi').value}:{}});
 $('#error').textContent='';$('#roles').textContent=`体：自己 · 主（${reading.body.trigram}${reading.body.element}，${reading.body.side==='upper'?'上卦':'下卦'}）　用：事情 · 事（${reading.use.trigram}${reading.use.element}，${reading.use.side==='upper'?'上卦':'下卦'}）`;
 $('#panels').innerHTML=Object.values(reading.stages).map(s=>`<article data-stage="${s.stage}"><p class="phase">${s.caption}</p><button class="panel-detail">${s.stage==='primary'?'本卦':s.stage==='mutual'?'互卦':'变卦'} · ${esc(s.name)}</button>${lib.renderHexagramSVG(s.id,{movingLine:reading.movingLine,stage:s.stage,svgId:s.stage})}<p class="grade">${esc(s.baseGrade)}</p></article>`).join('');
 const edge=reading.edges.find(e=>e.targetRole==='use');$('#relation').textContent=`${edge.label} → ${edge.phrase}`;
 const rows=reading.nodes.map(n=>`<tr><td>${esc({body:'体',use:'用',body_mutual:'体互',use_mutual:'用互',body_inherited:'体·沿用',changed_use:'变用'}[n.role])}</td><td>${n.trigram}${n.element}</td><td>${esc(n.strength.label)}</td><td>${esc(n.void.label)}</td></tr>`).join('');
 const targets=$('#ganzhi').value?getVoidReleaseTargets($('#ganzhi').value).targets.map(t=>`${t.emptyBranch}空：填${t.fill}，冲${t.clash}`).join('；'):'旬空待提供';
 $('#context').innerHTML=`<table><thead><tr><th>位置</th><th>卦</th><th>时令</th><th>旬空</th></tr></thead><tbody>${rows}</tbody></table><p>${esc(targets)}</p><p>先辨起卦时真空／假空；真空不因后遇填冲自动恢复。合空默认关闭。</p>`+reading.edges.map(e=>`<p>${esc(e.targetRole)}：${esc(e.label)} · ${esc(e.qualitativeNote)}</p>`).join('');
 $('#domain-text').textContent=reading.domain.text;showDetail('primary',reading.movingLine);
 }catch(e){$('#error').textContent=e.message;}
}
$('#controls').addEventListener('submit',e=>{e.preventDefault();update();});
$('#panels').addEventListener('click',e=>{const article=e.target.closest('article');if(!article)return;const line=e.target.closest('[data-line-position]');if(line)showDetail(article.dataset.stage,Number(line.dataset.linePosition));else if(e.target.closest('.panel-detail'))showDetail(article.dataset.stage);});
$('#panels').addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)&&e.target.matches('[data-line-position]')){e.preventDefault();showDetail(e.target.closest('article').dataset.stage,Number(e.target.dataset.linePosition));}});
update();
