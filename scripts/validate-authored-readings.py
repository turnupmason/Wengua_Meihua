from pathlib import Path
import json,sqlite3
root=Path(__file__).resolve().parents[1]
load=lambda p:json.loads((root/p).read_text())
index=load('data/authored-readings/interview-pass/index.json');progress=load('data/authored-readings/progress.json')
db=sqlite3.connect(':memory:')
for p in ['data/knowledge.sql','data/question-items.sql','data/product-categories.sql','data/authored-readings.sql']:db.executescript((root/p).read_text())
assert not db.execute('PRAGMA foreign_key_check').fetchall()
count=0
for f in index['files']:
 batch=load(f['path'])
 for row in batch['rows']:
  stored=db.execute('SELECT record_json FROM authored_product_manuscripts WHERE question_id=? AND hexagram_id=? AND moving_line=? AND month_order_id=? AND void_profile_key=?',(batch['questionId'],row['primaryId'],row['movingLine'],row['monthOrder'],row['voidProfileKey'])).fetchone()
  assert stored and json.loads(stored[0])==row
  assert row['review']['status']=='author-checked' and len(row['review']['checks'])==9
  assert all(c['status']=='pass' and c['evidence'] for c in row['review']['checks'].values())
  assert row['copy']['short']['decisionId']==row['copy']['long']['decisionId']==row['decision']['id']
  assert row['timingSlots'] and all(s['event'] and s['valence'] in ['吉','凶'] and s['sourceIds'] and s['branches'] for s in row['timingSlots'])
  count+=1
assert count==index['baseCaseCount']==progress['baseCasesWritten']==12
assert index['totalBaseCases']==1920 and progress['activeQuestionId']=='career.interview.interview-pass'
print('Authored interview gate: 12 exact profiles, complete short/long copies, sourced event/valence timing, 9 author checks and SQL joins passed; remaining contexts tracked separately.')
