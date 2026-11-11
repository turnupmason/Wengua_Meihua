from pathlib import Path
import json,sqlite3
root=Path(__file__).resolve().parents[1]
load=lambda p:json.loads((root/p).read_text())
index=load('data/authored-readings/interview-pass/index.json');progress=load('data/authored-readings/progress.json')
db=sqlite3.connect(':memory:')
for p in ['data/knowledge.sql','data/question-items.sql','data/product-categories.sql','data/authored-readings.sql']:db.executescript((root/p).read_text())
assert not db.execute('PRAGMA foreign_key_check').fetchall()
count=0;slots=0;per_chart={};texts=set()
for f in index['files']:
 batch=load(f['path'])
 assert batch['primaryId']==f['primaryId']
 for row in batch['rows']:
  stored=db.execute('SELECT record_json FROM authored_product_manuscripts WHERE question_id=? AND hexagram_id=? AND moving_line=? AND month_order_id=? AND void_profile_key=?',(batch['questionId'],row['primaryId'],row['movingLine'],row['monthOrder'],row['voidProfileKey'])).fetchone()
  assert stored and json.loads(stored[0])==row
  assert row['review']['status']=='author-checked' and len(row['review']['checks'])==9
  assert all(c['status']=='pass' and c['evidence'] for c in row['review']['checks'].values())
  assert row['copy']['short']['decisionId']==row['copy']['long']['decisionId']==row['decision']['id']
  assert row['timingSlots'] and all(s['event'] and s['valence'] in ['吉','凶'] and s['sourceIds'] and s['branches'] for s in row['timingSlots'])
  assert row['copyChecks']['shortSeparation']['status']=='passed'
  assert not any(w in row['copy']['short']['text'] for w in ['应期','窗口','吉应','凶应','计算说明','干支'])
  assert not row['voidTimingSlots']
  assert row['ruleVersions']['void']=='trigram-void-2.1.0'
  assert row['review']['independentReview']['timingInterpretation']=='pending'
  assert not row['review']['independentReview']['userAcceptedThisVersion']
  assert all(s['calculationBasis']['independentInterpretationReview']=='pending' and s['eventScope'] for s in row['timingSlots'])
  assert '批准的扩展规则' not in json.dumps(row['copy'],ensure_ascii=False)
  texts.add(row['copy']['short']['text']);count+=1
 for key,i in batch['monthSlots'].items():
  line,branch=key.split(':');row=batch['rows'][i]
  assert row['movingLine']==int(line) and branch in row['monthBranches']
  per_chart.setdefault((batch['primaryId'],int(line)),set()).add(branch)
  stored=db.execute('SELECT month_order_id FROM authored_product_month_slots WHERE question_id=? AND hexagram_id=? AND moving_line=? AND month_branch=? AND void_profile_key=?',(batch['questionId'],batch['primaryId'],int(line),branch,row['voidProfileKey'])).fetchone()
  assert stored and stored[0]==row['monthOrder'];slots+=1
assert count==index['authoredVersionCount']==progress['uniqueAuthoredVersions']==60
assert slots==index['baseCaseCount']==progress['baseCasesWritten']==144
assert len(texts)==60 and len(per_chart)==12 and all(len(v)==12 for v in per_chart.values())
assert index['totalBaseCases']==progress['totalBaseCases']==4608 and progress['remainingBaseSlots']==4464
assert progress['activeQuestionId']=='career.interview.interview-pass'
print('Authored gate: 60 distinct complete copies, 144 month slots, all 12 months per chart, event/valence timing, 9 checks, SQL references and truthful progress passed.')
