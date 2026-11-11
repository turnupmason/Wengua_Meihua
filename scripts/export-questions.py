"""Export authored fixed choices as a separate SQL supplement; canonical source tables stay unchanged."""
from pathlib import Path
import json,sqlite3
root=Path(__file__).resolve().parents[1]
catalog=json.loads((root/'data/question-items.json').read_text())
index=json.loads((root/'data/question-stories/index.json').read_text())
db=sqlite3.connect(':memory:')
db.executescript((root/'data/knowledge.sql').read_text())
db.executescript('''
CREATE TABLE fixed_question_metadata(key TEXT PRIMARY KEY,value TEXT NOT NULL);
CREATE TABLE fixed_question_items(id TEXT PRIMARY KEY,domain_id TEXT NOT NULL REFERENCES domains(id),position INTEGER NOT NULL CHECK(position BETWEEN 1 AND 5),question TEXT NOT NULL,mode TEXT NOT NULL CHECK(mode IN ('narrative','reference')),content_status TEXT NOT NULL CHECK(content_status IN ('reference-written','full-story-pending')),definition_json TEXT NOT NULL,UNIQUE(domain_id,position));
CREATE TABLE fixed_question_stories(question_id TEXT NOT NULL REFERENCES fixed_question_items(id),hexagram_id INTEGER NOT NULL,moving_line INTEGER NOT NULL,month_order_id TEXT NOT NULL REFERENCES month_orders(id),context_key TEXT NOT NULL,paragraphs_json TEXT NOT NULL,source_ids_json TEXT NOT NULL,review_status TEXT NOT NULL CHECK(review_status='reviewed'),PRIMARY KEY(question_id,hexagram_id,moving_line,month_order_id,context_key),FOREIGN KEY(hexagram_id,moving_line) REFERENCES lines(hexagram_id,position));
''')
j=lambda x:json.dumps(x,ensure_ascii=False,separators=(',',':'))
db.executemany('INSERT INTO fixed_question_metadata VALUES (?,?)',[
 ('catalog_version',catalog['catalogVersion']),('selection_policy',j(catalog['selectionPolicy'])),('story_index',j(index))])
for domain in catalog['domains']:
 for item in domain['items']:
  db.execute('INSERT INTO fixed_question_items VALUES (?,?,?,?,?,?,?)',(item['id'],item['domainId'],item['position'],item['question'],item['mode'],item['contentStatus'],j(item)))
for entry in index['files']:
 expected='data/question-stories/'+entry['questionId']+'.json'
 assert entry['path']==expected
 file=json.loads((root/expected).read_text());assert file['questionId']==entry['questionId']
 for row in file['rows']:
  if row['reviewStatus']!='reviewed':continue
  db.execute('INSERT INTO fixed_question_stories VALUES (?,?,?,?,?,?,?,?)',(file['questionId'],row['primaryId'],row['movingLine'],row['monthOrder'],row['contextKey'],j(row['paragraphs']),j(row['sourceIds']),'reviewed'))
db.commit()
assert not db.execute('PRAGMA foreign_key_check').fetchall()
dump=[line for line in db.iterdump() if line.startswith('CREATE TABLE fixed_question_') or line.startswith('INSERT INTO "fixed_question_')]
creates=[line for line in dump if line.startswith('CREATE TABLE')]
inserts=[line for line in dump if line.startswith('INSERT')]
sql='PRAGMA foreign_keys=ON;\nBEGIN TRANSACTION;\nPRAGMA defer_foreign_keys=ON;\n'+'\n'.join(creates+inserts)+'\nCOMMIT;\n'
(root/'data/question-items.sql').write_text(sql)
print('Fixed-question SQL: 90 selected items; completed item stories exported separately from legacy bases.')
