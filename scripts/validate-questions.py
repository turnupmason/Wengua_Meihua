from pathlib import Path
import json,sqlite3
root=Path(__file__).resolve().parents[1]
load=lambda p:json.loads((root/p).read_text())
c=load('data/question-items.json');index=load('data/question-stories/index.json')
domains={d['id']:d for d in load('data/domains.json')}
assert c['count']==90 and c['domainCount']==18 and len(c['domains'])==18
assert c['selectionPolicy']['freeText'] is False and c['selectionPolicy']['aiClassification'] is False
items=[q for d in c['domains'] for q in d['items']]
assert len(items)==len({q['id'] for q in items})==90
assert sum(q['mode']=='narrative' for q in items)==75
assert sum(q['mode']=='reference' for q in items)==15
for d in c['domains']:
 assert len(d['items'])==5 and d['sourceSectionId']==domains[d['id']]['sectionId']
 for position,q in enumerate(d['items'],1):
  assert q['domainId']==d['id'] and q['position']==position and q['question'] and q['answerBrief']
  assert d['sourceSectionId'] in q['sourceIds']
  if q['mode']=='reference':assert q['referenceParagraphs'] and q['contentStatus']=='reference-written'
assert index['minimumBaseStoryCount']==75*1920==144000
assert index['catalogVersion']==c['catalogVersion']
db=sqlite3.connect(':memory:');db.executescript((root/'data/knowledge.sql').read_text());db.executescript((root/'data/question-items.sql').read_text())
assert db.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
assert not db.execute('PRAGMA foreign_key_check').fetchall()
for q in items:
 record=db.execute('SELECT definition_json FROM fixed_question_items WHERE id=?',(q['id'],)).fetchone()
 assert record and json.loads(record[0])==q
assert db.execute('SELECT count(*) FROM fixed_question_items').fetchone()[0]==90
assert db.execute('SELECT count(*) FROM monthly_narratives').fetchone()[0]==1920
assert db.execute('SELECT count(*) FROM fixed_question_stories').fetchone()[0]==sum(1 for e in index['files'] for r in load(e['path'])['rows'] if r['reviewStatus']=='reviewed')
print('Fixed-question gate: 18 × 5 = 90 exact JSON/SQL bindings, 15 written references; source foreign keys and legacy 1,920 rows intact.')
