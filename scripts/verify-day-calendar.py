"""Optional independent verification; install lunar_python==1.4.9 and sxtwl==2.0.7 first."""
from pathlib import Path
import json,hashlib
from lunar_python import Solar
import sxtwl
root=Path(__file__).resolve().parents[1]
path=root/'data/day-calendar.json';data=json.loads(path.read_text())
stems='甲乙丙丁戊己庚辛壬癸';branches='子丑寅卯辰巳午未申酉戌亥'
for row in data['rows']:
    y,m,d=map(int,row['date'].split('-'))
    a=Solar.fromYmd(y,m,d).getLunar().getDayInGanZhi()
    g=sxtwl.fromSolar(y,m,d).getDayGZ();b=stems[g.tg]+branches[g.dz]
    assert row['dayGanzhi']==a==b,row
receipt={'checkedDate':'2026-11-10','scope':'civil date label to day ganzhi; no timestamp-to-local-date conversion',
 'startDate':data['startDate'],'endDateExclusive':data['endDateExclusive'],'rowsChecked':len(data['rows']),'mismatches':0,
 'cacheSha256':hashlib.sha256(path.read_bytes()).hexdigest(),
 'providers':[{'package':'lunar_python','version':'1.4.9','url':'https://github.com/6tail/lunar-python'},
              {'package':'sxtwl','version':'2.0.7','url':'https://github.com/yuangu/sxtwl_cpp'}]}
(root/'sources/audit/day-calendar-verification-20261110.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n')
print(f"Verified {len(data['rows'])} civil-day mappings with two independent calendar libraries.")
