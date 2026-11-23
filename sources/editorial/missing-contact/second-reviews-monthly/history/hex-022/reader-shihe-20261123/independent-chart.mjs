import fs from 'node:fs';
const bits=[1,0,1,0,0,1];
const tri={'111':['乾','金'],'110':['兑','金'],'101':['离','火'],'100':['震','木'],'011':['巽','木'],'010':['坎','水'],'001':['艮','土'],'000':['坤','土']};
const births={木:'火',火:'土',土:'金',金:'水',水:'木'},controls={木:'土',土:'水',水:'火',火:'金',金:'木'};
const qi={spring:{木:'旺',火:'相',土:'死',金:'囚',水:'休'},summer:{木:'休',火:'旺',土:'相',金:'死',水:'囚'},earth:{木:'囚',火:'休',土:'旺',金:'相',水:'死'},autumn:{木:'死',火:'囚',土:'休',金:'旺',水:'相'},winter:{木:'相',火:'死',土:'囚',金:'休',水:'旺'}};
const mutual=[...bits.slice(1,4),...bits.slice(2,5)];
const changedIds=[52,26,27,30,37,36];
const result=[];
for(let line=1;line<=6;line++){
 const changed=[...bits];changed[line-1]=1-changed[line-1];
 const isLower=line<=3;
 const tb=tri[bits.slice(isLower?3:0,isLower?6:3).join('')],tu=tri[bits.slice(isLower?0:3,isLower?3:6).join('')];
 const mb=tri[mutual.slice(isLower?3:0,isLower?6:3).join('')],mu=tri[mutual.slice(isLower?0:3,isLower?3:6).join('')],cu=tri[changed.slice(isLower?0:3,isLower?3:6).join('')];
 const nodes=[['body',...tb],['use',...tu],['body_mutual',...mb],['use_mutual',...mu],['changed_use',...cu]].map(([role,trigram,element])=>({role,trigram,element}));
 const relations=[];for(const a of nodes)for(const b of nodes)if(a.role!==b.role){const relation=a.element===b.element?'比和':births[a.element]===b.element?'生':births[b.element]===a.element?'受生':controls[a.element]===b.element?'克':'受克';relations.push({from:a.role,to:b.role,fromTrigram:a.trigram,toTrigram:b.trigram,relation});}
 const row={movingLine:line,bits,mutualBits:mutual,changedBits:changed,stageIds:[22,40,changedIds[line-1]],nodes,allDirectedRelations:relations,states:qi};result.push(row);
 console.log('LINE',line,'STAGES',row.stageIds.join(' / '),nodes.map(x=>x.role+':'+x.trigram+x.element).join(' | '));
 console.log(relations.map(r=>r.from+'('+r.fromTrigram+')'+r.relation+r.to+'('+r.toTrigram+')').join('；'));
}
fs.writeFileSync('sources/editorial/missing-contact/second-reviews-monthly/history/hex-022/reader-shihe-20261123/independent-charts.json',JSON.stringify({method:'独立二读前手排101001及互010100、六变；独立使用八卦位码和五行关系复算并封存，不调用仓库排盘或关系函数。',primaryBits:bits,mutualBits:mutual,charts:result},null,2)+'\n');
