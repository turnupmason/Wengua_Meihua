// 代理用：node scripts/review/agentfix.cjs <问项目录> <hex> <edits.json> <tag>   例：agentfix.cjs interview-pass 12 e.json opusWrite
// edits: [{i, col, set} 或 {i, col, from, to}, why]
//   col: 3..9 = 题/简/开/过/结/总/判断依据(第10栏)；10 = 整个应期栏（数组或无期说明，只能 set）；11 = 随岗薪资说明（晋升，只能 set）；"t2:k"/"t3:k" = 第k个应期窗口的事件/提示；"omit" = 无期说明；"note:k" = 第k条计算说明
//   可加 {i, read:"通读备注"} 写 readThrough/readNote
// 自动同步 polished/hashAfter/changedFields；在记录上追加 <tag> 备注。不写 selfRead。
const fs=require("fs"),crypto=require("crypto");
const [item,h,ef,tag]=process.argv.slice(2);if(!tag)throw "need item hex edits tag";const id=String(h).padStart(3,"0");
const edits=JSON.parse(fs.readFileSync(ef,"utf8"));
const sp=`sources/editorial/${item}/hex-${id}.json`,pp=`sources/editorial/${item}/polish-v5/hex-${id}.json`;
const s=JSON.parse(fs.readFileSync(sp,"utf8"));const p=JSON.parse(fs.readFileSync(pp,"utf8"));const a=Array.isArray(p)?p:p.records;
const F=["title","short","opening","process","ending","summary"];
const rep=(t,e,where)=>{if(e.set!==undefined)return e.set;if(!String(t).includes(e.from))throw `找不到原文 #${e.i} ${where}: ${e.from}`;return t.replace(e.from,e.to);};
for(const e of edits){const d=s[e.i],r=a[e.i];
 if(e.read){r.readThrough="2026-11-18";r.readNote=e.read;continue;}
 if(typeof e.col==="number"){if(e.col<3||e.col>11)throw "col 3..11";if((e.col===10||e.col===11)&&e.set===undefined)throw "col 10/11 只能整栏 set";d[e.col]=rep(d[e.col],e,"col"+e.col);}
 else if(/^t[23]:\d+$/.test(e.col)){const [c,k]=e.col.split(":");if(!Array.isArray(d[10])||!d[10][+k])throw `#${e.i} 无应期窗口 ${k}`;const w=d[10][+k];const x=c==="t2"?2:3;w[x]=rep(w[x],e,e.col);}
 else if(e.col==="omit"){if(typeof d[10]!=="string")throw `#${e.i} 不是无期说明`;d[10]=rep(d[10],e,"omit");}
 else if(e.col==="line"){const rp=`sources/editorial/${item}/review-v2/hex-${id}.json`;const rv=JSON.parse(fs.readFileSync(rp,"utf8"));const R=Array.isArray(rv)?rv:rv.records;R[e.i].lineReading=rep(R[e.i].lineReading,e,"lineReading");fs.writeFileSync(rp,JSON.stringify(rv,null,1)+"\n");}
 else if(/^note:\d+$/.test(e.col)){const k=+e.col.slice(5);const n=r.calculationNotes;if(n[k]===undefined&&e.set===undefined)throw `#${e.i} 无第${k}条说明`;n[k]=rep(n[k],e,e.col);}
 else throw "bad col "+e.col;
 if(e.col===10)delete r.timingNeedsRework;if(e.col===11)delete r.payNeedsWriting;
 r[tag]=(r[tag]?r[tag]+"；":"")+(e.why||"改");
}
a.forEach((r,i)=>{const d=s[i];const pol={...r.polished};F.forEach((f,k)=>pol[f]=d[3+k]);
 if(JSON.stringify(pol)!==JSON.stringify(r.polished)){r.polished=pol;r.hashAfter=crypto.createHash("sha256").update(JSON.stringify(pol)).digest("hex");r.changedFields=F.filter(f=>r.original[f]!==pol[f]).concat((r.changedFields||[]).filter(f=>!F.includes(f)));}});
const W=(f,t)=>{for(let k=0;k<30;k++){try{fs.writeFileSync(f,t);return}catch(e){const u=Date.now()+300;while(Date.now()<u);}}throw "write fail "+f};W(sp,JSON.stringify(s,null,2)+"\n");W(pp,JSON.stringify(p,null,1)+"\n");
console.log("ok",edits.length);
