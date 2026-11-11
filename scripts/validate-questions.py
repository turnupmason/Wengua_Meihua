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
story_sql=root/'dist/question-stories.sql'
assert story_sql.exists(),'Run npm run build:questions before validating the complete story database'
db.executescript(story_sql.read_text())
assert db.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
assert not db.execute('PRAGMA foreign_key_check').fetchall()
for q in items:
 record=db.execute('SELECT definition_json FROM fixed_question_items WHERE id=?',(q['id'],)).fetchone()
 assert record and json.loads(record[0])==q
assert db.execute('SELECT count(*) FROM fixed_question_items').fetchone()[0]==90
assert db.execute('SELECT count(*) FROM monthly_narratives').fetchone()[0]==1920
assert db.execute('SELECT count(*) FROM fixed_question_stories').fetchone()[0]==index['writtenBaseStoryCount']
assert db.execute('SELECT count(*) FROM fixed_question_story_profiles').fetchone()[0]==index.get('writtenProfileStoryCount',0)
for entry in index['files']:
 if entry.get('kind')!='sharded-complete-manuscripts':continue
 manifest=load(entry['path'])
 for shard in manifest['files']:
  f=load(shard['path'])
  for row in f['rows']:
   record=db.execute('SELECT paragraphs_json FROM fixed_question_stories WHERE question_id=? AND hexagram_id=? AND moving_line=? AND month_order_id=?',(entry['questionId'],row['primaryId'],row['movingLine'],row['monthOrder'])).fetchone()
   assert record and json.loads(record[0])==[f['textPool'][i] for i in row['base']['paragraphIds']]
  for kind,pool in [('text',f['textPool']),('timing',f['timingPool']),('verdict',f['verdictPool'])]:
   for rid,value in enumerate(pool):
    record=db.execute('SELECT value_json FROM fixed_question_story_resources WHERE question_id=? AND hexagram_id=? AND kind=? AND resource_id=?',(entry['questionId'],f['hexagramId'],kind,rid)).fetchone()
    assert record and json.loads(record[0])==value
print(f"Fixed-question gate: 90 exact choices, {index['writtenBaseStoryCount']} full bases, {index.get('writtenProfileStoryCount',0)} void profiles; SQL/JSON text, resource and foreign-key checks passed.")
