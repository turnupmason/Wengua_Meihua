"""Small catalog SQL plus reproducible full-story SQL artifact. Canonical ancient data stays unchanged."""
from pathlib import Path
import json,sqlite3
root=Path(__file__).resolve().parents[1]
load=lambda p:json.loads((root/p).read_text())
j=lambda x:json.dumps(x,ensure_ascii=False,separators=(',',':'))
catalog=load('data/question-items.json');index=load('data/question-stories/index.json')
db=sqlite3.connect(':memory:');db.executescript((root/'data/knowledge.sql').read_text())
schema='''
CREATE TABLE fixed_question_metadata(key TEXT PRIMARY KEY,value TEXT NOT NULL);
CREATE TABLE fixed_question_items(id TEXT PRIMARY KEY,domain_id TEXT NOT NULL REFERENCES domains(id),position INTEGER NOT NULL CHECK(position BETWEEN 1 AND 5),question TEXT NOT NULL,mode TEXT NOT NULL CHECK(mode IN ('narrative','reference')),content_status TEXT NOT NULL CHECK(content_status IN ('reference-written','full-story-pending','base-written')),definition_json TEXT NOT NULL,UNIQUE(domain_id,position));
CREATE TABLE fixed_question_stories(question_id TEXT NOT NULL REFERENCES fixed_question_items(id),hexagram_id INTEGER NOT NULL,moving_line INTEGER NOT NULL,month_order_id TEXT NOT NULL REFERENCES month_orders(id),context_key TEXT NOT NULL,paragraphs_json TEXT NOT NULL,source_ids_json TEXT NOT NULL,review_status TEXT NOT NULL CHECK(review_status IN ('structural-only','interpretation-approved')),PRIMARY KEY(question_id,hexagram_id,moving_line,month_order_id,context_key),FOREIGN KEY(hexagram_id,moving_line) REFERENCES lines(hexagram_id,position));
CREATE TABLE fixed_question_story_resources(question_id TEXT NOT NULL REFERENCES fixed_question_items(id),hexagram_id INTEGER NOT NULL REFERENCES hexagrams(id),kind TEXT NOT NULL CHECK(kind IN ('text','verdict','timing')),resource_id INTEGER NOT NULL,value_json TEXT NOT NULL,PRIMARY KEY(question_id,hexagram_id,kind,resource_id));
CREATE TABLE fixed_question_story_profiles(question_id TEXT NOT NULL REFERENCES fixed_question_items(id),hexagram_id INTEGER NOT NULL,moving_line INTEGER NOT NULL,month_order_id TEXT NOT NULL REFERENCES month_orders(id),profile_key TEXT NOT NULL,paragraph_ids_json TEXT NOT NULL,verdict_id INTEGER NOT NULL,timing_id INTEGER NOT NULL,context_json TEXT NOT NULL,PRIMARY KEY(question_id,hexagram_id,moving_line,month_order_id,profile_key),FOREIGN KEY(hexagram_id,moving_line) REFERENCES lines(hexagram_id,position));
'''
db.executescript(schema)
review=load('data/interpretation-reviews.json')
assert review['approvedBaseStoryCount']==review['approvedProfileStoryCount']==0, 'Legacy SQL export cannot certify interpretive approval'
db.executemany('INSERT INTO fixed_question_metadata VALUES (?,?)',[
 ('catalog_version',catalog['catalogVersion']),('selection_policy',j(catalog['selectionPolicy'])),('story_index',j(index)),('interpretation_review',j(review))])
for domain in catalog['domains']:
 for item in domain['items']:
  db.execute('INSERT INTO fixed_question_items VALUES (?,?,?,?,?,?,?)',(item['id'],item['domainId'],item['position'],item['question'],item['mode'],item['contentStatus'],j(item)))
db.commit()
dump=[line for line in db.iterdump() if line.startswith('CREATE TABLE fixed_question_') or line.startswith('INSERT INTO "fixed_question_')]
sql='PRAGMA foreign_keys=ON;\nBEGIN TRANSACTION;\nPRAGMA defer_foreign_keys=ON;\n'+'\n'.join([x for x in dump if x.startswith('CREATE')]+[x for x in dump if x.startswith('INSERT')])+"\nCREATE VIEW approved_fixed_question_stories AS SELECT * FROM fixed_question_stories WHERE review_status='interpretation-approved';\nCOMMIT;\n"
(root/'data/question-items.sql').write_text(sql)
def insert(table,values):
 db.execute('INSERT INTO '+table+' VALUES ('+','.join('?' for _ in values)+')',values)
 parts=[]
 for value in values:
  parts.append(str(value) if isinstance(value,int) else "'"+value.replace("'","''")+"'")
 return 'INSERT INTO '+table+' VALUES ('+','.join(parts)+');'
statements=[];base_count=0;profile_count=0
for entry in index['files']:
 qid=entry['questionId']
 if entry.get('kind')=='sharded-complete-manuscripts':
  assert entry['path']==f'data/question-stories/{qid}/index.json'
  manifest=load(entry['path']);assert manifest['questionId']==qid
  for shard in manifest['files']:
   file=load(shard['path']);assert file['questionId']==qid and file['hexagramId']==shard['hexagramId']
   for kind,pool in [('text',file['textPool']),('verdict',file['verdictPool']),('timing',file['timingPool'])]:
    for rid,value in enumerate(pool):statements.append(insert('fixed_question_story_resources',(qid,file['hexagramId'],kind,rid,j(value))))
   for row in file['rows']:
    assert row['reviewStatus']=='reviewed'
    base=row['base'];paragraphs=[file['textPool'][i] for i in base['paragraphIds']]
    statements.append(insert('fixed_question_stories',(qid,row['primaryId'],row['movingLine'],row['monthOrder'],'month-base-unresolved',j(paragraphs),j(file['sourceIds']),'structural-only')));base_count+=1
    for variant in row['variants']:
     statements.append(insert('fixed_question_story_profiles',(qid,row['primaryId'],row['movingLine'],row['monthOrder'],variant['profileKey'],j(variant['paragraphIds']),variant['verdictId'],variant['timingId'],j(variant['representativeContext']))));profile_count+=1
 else:
  assert entry['path']==f'data/question-stories/{qid}.json'
  file=load(entry['path']);assert file['questionId']==qid
  for row in file['rows']:
   if row['reviewStatus']!='reviewed':continue
   statements.append(insert('fixed_question_stories',(qid,row['primaryId'],row['movingLine'],row['monthOrder'],row['contextKey'],j(row['paragraphs']),j(row['sourceIds']),'structural-only')));base_count+=1
assert base_count==index['writtenBaseStoryCount']
assert profile_count==index.get('writtenProfileStoryCount',0)
db.commit();assert not db.execute('PRAGMA foreign_key_check').fetchall()
(root/'dist').mkdir(exist_ok=True)
(root/'dist/question-stories.sql').write_text('PRAGMA foreign_keys=ON;\nBEGIN TRANSACTION;\n'+'\n'.join(statements)+'\nCOMMIT;\n')
print(f'Fixed-question SQL: 90 choices; {base_count} structural-only bases and {profile_count} draft void-profile manuscripts in dist/question-stories.sql.')
