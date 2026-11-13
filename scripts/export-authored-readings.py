from pathlib import Path
import json,sqlite3
root=Path(__file__).resolve().parents[1]
j=lambda v:json.dumps(v,ensure_ascii=False,separators=(',',':'))
indexes=sorted((root/'data/authored-readings').glob('*/index.json'))
assert indexes
db=sqlite3.connect(':memory:')
for path in ['data/knowledge.sql','data/question-items.sql','data/product-categories.sql']:db.executescript((root/path).read_text())
db.executescript('''CREATE TABLE authored_product_manuscripts(question_id TEXT NOT NULL REFERENCES product_questions(id),hexagram_id INTEGER NOT NULL,moving_line INTEGER NOT NULL,month_order_id TEXT NOT NULL REFERENCES month_orders(id),void_profile_key TEXT NOT NULL,decision_id TEXT NOT NULL,record_json TEXT NOT NULL,review_version TEXT NOT NULL,review_status TEXT NOT NULL CHECK(review_status='author-checked'),artifact_digest TEXT NOT NULL,PRIMARY KEY(question_id,hexagram_id,moving_line,month_order_id,void_profile_key),FOREIGN KEY(hexagram_id,moving_line) REFERENCES lines(hexagram_id,position));
CREATE TABLE authored_product_month_slots(question_id TEXT NOT NULL,hexagram_id INTEGER NOT NULL,moving_line INTEGER NOT NULL,month_branch TEXT NOT NULL CHECK(length(month_branch)=1 AND instr('寅卯辰巳午未申酉戌亥子丑',month_branch)>0),month_order_id TEXT NOT NULL,void_profile_key TEXT NOT NULL,PRIMARY KEY(question_id,hexagram_id,moving_line,month_branch,void_profile_key),FOREIGN KEY(question_id,hexagram_id,moving_line,month_order_id,void_profile_key) REFERENCES authored_product_manuscripts(question_id,hexagram_id,moving_line,month_order_id,void_profile_key));''')
count=0;slots=0;scenario_slots=0
for index_path in indexes:
 index=json.loads(index_path.read_text())
 before_count,before_slots=count,slots
 for entry in index['files']:
  batch=json.loads((root/entry['path']).read_text())
  for row in batch['rows']:
   db.execute('INSERT INTO authored_product_manuscripts VALUES (?,?,?,?,?,?,?,?,?,?)',(batch['questionId'],row['primaryId'],row['movingLine'],row['monthOrder'],row['voidProfileKey'],row['decision']['id'],j(row),row['review']['version'],row['review']['status'],row['artifactDigest']));count+=1
   if not row['baseProse']:
    for branch in row['monthBranches']:
     db.execute('INSERT INTO authored_product_month_slots VALUES (?,?,?,?,?,?)',(batch['questionId'],row['primaryId'],row['movingLine'],branch,row['monthOrder'],row['voidProfileKey']));scenario_slots+=1
  for key,i in batch['monthSlots'].items():
   line,branch=key.split(':');row=batch['rows'][i]
   db.execute('INSERT INTO authored_product_month_slots VALUES (?,?,?,?,?,?)',(batch['questionId'],batch['primaryId'],int(line),branch,row['monthOrder'],row['voidProfileKey']));slots+=1
 assert count-before_count==index['authoredVersionCount'] and slots-before_slots==index['baseCaseCount']
db.commit();assert not db.execute('PRAGMA foreign_key_check').fetchall()
dump=[s for s in db.iterdump() if s.startswith('CREATE TABLE authored_product_') or s.startswith('INSERT INTO "authored_product_')]
schema=[s for s in dump if s.startswith('CREATE TABLE')]
(root/'data/authored-readings.sql').write_text('-- Schema only. Full data is generated from JSON into dist/authored-readings.sql by npm run build:interview.\nPRAGMA foreign_keys=ON;\n'+'\n'.join(schema)+'\n')
(root/'dist').mkdir(exist_ok=True)
(root/'dist/authored-readings.sql').write_text('PRAGMA foreign_keys=ON;\nBEGIN TRANSACTION;\nPRAGMA defer_foreign_keys=ON;\n'+'\n'.join(dump)+'\nCOMMIT;\n')
print(f'Authored SQL: {count} complete written versions, {slots} base month slots and {scenario_slots} exact context month links.')
