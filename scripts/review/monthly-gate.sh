#!/usr/bin/env bash
# 逐月长稿一次过关（2026-11-20 定稿，之后不再中途加规则）：把全部关口合成一条命令，写手交稿前自己跑，协调者验收照跑。
# 用法：bash scripts/review/monthly-gate.sh <问项目录> <卦序>
set -u; item=$1; h=$2; fail=0
run(){ echo "== $1"; shift; "$@" || fail=1; }
run 结构与查重 node scripts/review/check-monthly.mjs "$item" --hex "$h"
run 口吻厚度套话 node scripts/review/style-monthly.mjs "$item" --hex "$h" --list
run 安慰许诺 node scripts/review/consolation-scan.mjs "$item" --hex "$h" --list
if [ "$item" = exam ]; then
  run 考试题情 node scripts/review/exam-scenario-scan.mjs --hex "$h" --list
fi
echo "== 篇内重复（8 字，须 0）"; r=$(node scripts/review/intra-repeat.cjs "$item" 8 --hex "$h" --list); echo "$r"; echo "$r" | tail -1 | grep -q '"articlesWithRepeat":0' || fail=1
echo "== 跨卦相似（与别卦单篇共用 8 字片段超 8% 的篇，须 0；2026-11-20 未济照抄既济后补）"; node scripts/review/cross-sim.cjs "$item" --hex "$h" --list || fail=1
echo "== 高频短语（见于 18 篇以上，除必要指称外须无）"; node scripts/review/phrase-scan.cjs "sources/editorial/$item/monthly" 18 | grep "hex-$(printf %03d "$h")" || echo 无
echo "== 引文"; tmp=$(mktemp); tmp=$(cygpath -m "$tmp" 2>/dev/null || echo "$tmp"); node scripts/review/commentary-audit.mjs "$item" --monthly --out "$tmp" >/dev/null 2>&1; node -e "const r=require('$tmp');const a=Array.isArray(r)?r:(r.findings||[]);const k=a.filter(x=>JSON.stringify(x).includes('\"hex\":$h,')||JSON.stringify(x).includes('/$h/')||JSON.stringify(x).includes('hex-$(printf %03d "$h")'));console.log('本卦未核实',k.length);process.exit(k.length?1:0)" || fail=1
[ $fail = 0 ] && echo "GATE PASSED $item $h" || { echo "GATE FAILED $item $h"; exit 1; }
