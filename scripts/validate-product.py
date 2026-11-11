from pathlib import Path
import json,sqlite3
root=Path(__file__).resolve().parents[1]
load=lambda p:json.loads((root/p).read_text())
c=load('data/product-categories.json')
assert [x['label'] for x in c['categories']]==['事业工作','财富财运','感情姻缘','健康疾病','家庭家宅','寻人失物']
assert [len(x['subcategories']) for x in c['categories']]==[8,9,10,8,9,8]
questions=[q for category in c['categories'] for sub in category['subcategories'] for q in sub['questions']]
assert len(questions)==len({q['id'] for q in questions})==c['questionCount']==82
assert sum(len(x['subcategories']) for x in c['categories'])==52
assert all(q['mode']=='reference' for q in questions if q['categoryId']=='health')
db=sqlite3.connect(':memory:')
for path in ['data/knowledge.sql','data/question-items.sql','data/product-categories.sql']:db.executescript((root/path).read_text())
assert db.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
assert not db.execute('PRAGMA foreign_key_check').fetchall()
assert [db.execute('SELECT count(*) FROM '+t).fetchone()[0] for t in ['product_categories','product_subcategories','product_questions']]==[6,52,82]
for q in questions:
 row=db.execute('SELECT definition_json FROM product_questions WHERE id=?',(q['id'],)).fetchone()
 assert row and json.loads(row[0])==q
 for reference in q['sourceSections']:
  source=db.execute('SELECT title FROM domains WHERE id=?',(reference['domainId'],)).fetchone()
  assert source
accepted=load('data/editorial-acceptance.json');snapshot=load('sources/editorial/accepted-samples-v3.json');samples=load('data/ten-readings-v3.json')
assert accepted['scopeStillMatches'] is True and accepted['noRepeatedStyleApprovalRequired'] is True
assert accepted['samples']==snapshot['samples']
assert len(accepted['samples'])==10
for a in accepted['samples']:
 sample=next(s for s in samples['items'] if s['number']==a['number'])
 assert sample['artifactDigest']==a['artifactDigest'] and sample['decision']['id']==a['decisionId']
plan=load('data/product-authoring-plan.json')
assert plan['questionCount']==len(plan['items'])==82 and plan['acceptedSampleCount']==10
print('Product gate: 6 categories, 52 subcategories, 82 atomic questions, 8 health references, exact legacy links and 10 unchanged accepted samples; SQL foreign keys passed.')
