from pathlib import Path
import json,sqlite3
root=Path(__file__).resolve().parents[1]
j=lambda v:json.dumps(v,ensure_ascii=False,separators=(',',':'))
index=json.loads((root/'data/authored-readings/interview-pass/index.json').read_text())
db=sqlite3.connect(':memory:')
for path in ['data/knowledge.sql','data/question-items.sql','data/product-categories.sql']:db.executescript((root/path).read_text())
db.executescript('''CREATE TABLE authored_product_manuscripts(question_id TEXT NOT NULL REFERENCES product_questions(id),hexagram_id INTEGER NOT NULL,moving_line INTEGER NOT NULL,month_order_id TEXT NOT NULL REFERENCES month_orders(id),void_profile_key TEXT NOT NULL,decision_id TEXT NOT NULL,record_json TEXT NOT NULL,review_version TEXT NOT NULL,review_status TEXT NOT NULL CHECK(review_status='author-checked'),artifact_digest TEXT NOT NULL,PRIMARY KEY(question_id,hexagram_id,moving_line,month_order_id,void_profile_key),FOREIGN KEY(hexagram_id,moving_line) REFERENCES lines(hexagram_id,position));''')
count=0
for entry in index['files']:
 batch=json.loads((root/entry['path']).read_text())
 for row in batch['rows']:
  db.execute('INSERT INTO authored_product_manuscripts VALUES (?,?,?,?,?,?,?,?,?,?)',(batch['questionId'],row['primaryId'],row['movingLine'],row['monthOrder'],row['voidProfileKey'],row['decision']['id'],j(row),row['review']['version'],row['review']['status'],row['artifactDigest']));count+=1
db.commit();assert not db.execute('PRAGMA foreign_key_check').fetchall()
dump=[s for s in db.iterdump() if s.startswith('CREATE TABLE authored_product_') or s.startswith('INSERT INTO "authored_product_')]
(root/'data/authored-readings.sql').write_text('PRAGMA foreign_keys=ON;\nBEGIN TRANSACTION;\nPRAGMA defer_foreign_keys=ON;\n'+'\n'.join(dump)+'\nCOMMIT;\n')
print(f'Authored product SQL: {count} exact interview chart/month/void profiles with shared short/long decisions and sourced timing.')
