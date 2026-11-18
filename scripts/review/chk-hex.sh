#!/usr/bin/env bash
# 一卦四项检查：bash scripts/review/chk-hex.sh <问项目录> <卦序>
I=$1; N=$2
node scripts/review/frames.mjs $I $N | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);console.log("total",j.total,JSON.stringify({frames:j.frames,col10:j.col10,review:j.review,unread:j.unread.length,calc:j.calc,timing:j.timing,shape:j.shape}).slice(0,1500))})'
node scripts/review/text-packet.mjs $I $N | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);console.log("flag",j.flagged);j.boards.filter(b=>b.flags.length).forEach(b=>console.log(" ",b.index,b.flags.join("；")))})'
node scripts/review/check-hex.mjs $I $N --polish | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);console.log("err",j.errors.length);j.errors.slice(0,40).forEach(e=>console.log(" ",e))})'
node scripts/review/similarity.mjs $I $N | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);console.log("sim",j.pairsOver,JSON.stringify(j.sharedEight))})'
