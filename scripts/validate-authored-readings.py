from pathlib import Path
import json,sqlite3
# 面试求职（career.interview.interview-pass）作者稿闸门。2026-11-18 起按考试定稿口径重写为 interview-pass-3.0.0，
# 作者源 sources/editorial/interview-pass，经 build-promotion-pay.mjs 构建；空亡旧版只留档，不进正文。
root=Path(__file__).resolve().parents[1]
load=lambda p:json.loads((root/p).read_text(encoding='utf-8'))
index=load('data/authored-readings/interview-pass/index.json')
db=sqlite3.connect(':memory:')
for p in ['data/knowledge.sql','data/question-items.sql','data/product-categories.sql','dist/authored-readings.sql']:db.executescript((root/p).read_text(encoding='utf-8'))
assert not db.execute('PRAGMA foreign_key_check').fetchall()
assert index['questionId']=='career.interview.interview-pass' and index['manuscriptVersion']=='interview-pass-3.0.0'
count=0;slots=0;per_chart={};texts=set();outcomes={'favourable':0,'difficult':0};dated=0
for f in index['files']:
 batch=load(f['path'])
 assert batch['primaryId']==f['primaryId'] and batch['manuscriptVersion']==index['manuscriptVersion'] and len(batch['rows'])==30
 for row in batch['rows']:
  stored=db.execute('SELECT record_json FROM authored_product_manuscripts WHERE question_id=? AND hexagram_id=? AND moving_line=? AND month_order_id=? AND void_profile_key=?',(batch['questionId'],row['primaryId'],row['movingLine'],row['monthOrder'],row['voidProfileKey'])).fetchone()
  assert stored and json.loads(stored[0])==row
  assert row['baseProse'] and row['voidProfileKey']=='base-no-void' and not row['voidTimingSlots']
  outcome=row['decision']['outcomeCode'];assert outcome in outcomes;outcomes[outcome]+=1
  assert row['copy']['short']['decisionId']==row['copy']['long']['decisionId']==row['decision']['id']
  assert row['authorship']['manualWholeArticleReview'] and row['authorship']['version']==index['manuscriptVersion']
  assert row['decision']['sourceEvidence']
  assert bool(row['timingSlots'])!=bool(row.get('timingOmission'))
  assert all(s['event'] and s['valence'] in ['吉','凶','耗'] and s['sourceIds'] and s['branches'] for s in row['timingSlots'])
  dated+=bool(row['timingSlots'])
  assert not any(w in row['copy']['short']['text'] for w in ['应期','窗口','吉应','凶应','计算说明','干支'])
  copy=json.dumps(row['copy'],ensure_ascii=False)
  assert not any(w in copy for w in ['考试','考场','卷面','试卷','阅卷','合格线','有条件','偏难'])
  assert row['review']['independentReview']['status']=='pending' and row['review']['independentReview']['timingInterpretation']=='pending'
  assert not row['review']['independentReview']['userAcceptedThisVersion']
  assert 3<=len(row['calculationNotes'])<=5
  texts.add(row['copy']['short']['text']);count+=1
 for key,i in batch['monthSlots'].items():
  line,branch=key.split(':');row=batch['rows'][i]
  assert row['movingLine']==int(line) and branch in row['monthBranches']
  per_chart.setdefault((batch['primaryId'],int(line)),set()).add(branch)
  stored=db.execute('SELECT month_order_id FROM authored_product_month_slots WHERE question_id=? AND hexagram_id=? AND moving_line=? AND month_branch=? AND void_profile_key=?',(batch['questionId'],batch['primaryId'],int(line),branch,row['voidProfileKey'])).fetchone()
  assert stored and stored[0]==row['monthOrder'];slots+=1
assert count==index['authoredVersionCount']==index['baseVersionCount']==1920
assert outcomes==index['outcomeCounts'] and dated==index['dated']
assert slots==index['baseCaseCount']==4608==db.execute('SELECT count(*) FROM authored_product_month_slots WHERE question_id=?',(index['questionId'],)).fetchone()[0]
assert len(texts)==1920 and len(per_chart)==384 and all(len(v)==12 for v in per_chart.values())
print(f"Authored gate (interview-pass-3.0.0): 1920 copies, {outcomes['favourable']} pass / {outcomes['difficult']} not pass, 4608 month slots, all 384 charts, {dated} dated, SQL records matched.")
