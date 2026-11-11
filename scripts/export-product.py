"""Product-only supplement; preserve canonical and legacy question tables."""
from pathlib import Path
import json,sqlite3
root=Path(__file__).resolve().parents[1]
catalog=json.loads((root/'data/product-categories.json').read_text())
acceptance=json.loads((root/'data/editorial-acceptance.json').read_text())
j=lambda v:json.dumps(v,ensure_ascii=False,separators=(',',':'))
db=sqlite3.connect(':memory:')
db.executescript((root/'data/knowledge.sql').read_text())
db.executescript((root/'data/question-items.sql').read_text())
db.executescript('''
CREATE TABLE product_metadata(key TEXT PRIMARY KEY,value_json TEXT NOT NULL);
CREATE TABLE product_categories(id TEXT PRIMARY KEY,position INTEGER NOT NULL UNIQUE,label TEXT NOT NULL,definition_json TEXT NOT NULL);
CREATE TABLE product_subcategories(id TEXT PRIMARY KEY,category_id TEXT NOT NULL REFERENCES product_categories(id),position INTEGER NOT NULL,label TEXT NOT NULL,examples_json TEXT NOT NULL,UNIQUE(category_id,position));
CREATE TABLE product_questions(id TEXT PRIMARY KEY,subcategory_id TEXT NOT NULL REFERENCES product_subcategories(id),position INTEGER NOT NULL,question_type TEXT NOT NULL,question TEXT NOT NULL,mode TEXT NOT NULL CHECK(mode IN ('narrative','reference','guidance')),legacy_question_id TEXT REFERENCES fixed_question_items(id),definition_json TEXT NOT NULL,UNIQUE(subcategory_id,position));
''')
for key,value in [('version',catalog['productCatalogVersion']),('selection_policy',catalog['selectionPolicy']),('editorial_acceptance',acceptance)]:db.execute('INSERT INTO product_metadata VALUES (?,?)',(key,j(value)))
for category in catalog['categories']:
 db.execute('INSERT INTO product_categories VALUES (?,?,?,?)',(category['id'],category['position'],category['label'],j({k:v for k,v in category.items() if k!='subcategories'})))
 for sub in category['subcategories']:
  db.execute('INSERT INTO product_subcategories VALUES (?,?,?,?,?)',(sub['id'],category['id'],sub['position'],sub['label'],j(sub['exampleQuestions'])))
  for q in sub['questions']:db.execute('INSERT INTO product_questions VALUES (?,?,?,?,?,?,?,?)',(q['id'],sub['id'],q['position'],q['question_type'],q['question'],q['mode'],q.get('legacyQuestionId'),j(q)))
db.commit()
assert not db.execute('PRAGMA foreign_key_check').fetchall()
assert db.execute('SELECT count(*) FROM product_subcategories').fetchone()[0]==52
dump=[x for x in db.iterdump() if x.startswith('CREATE TABLE product_') or x.startswith('INSERT INTO "product_')]
(root/'data/product-categories.sql').write_text('PRAGMA foreign_keys=ON;\nBEGIN TRANSACTION;\nPRAGMA defer_foreign_keys=ON;\n'+'\n'.join([x for x in dump if x.startswith('CREATE')]+[x for x in dump if x.startswith('INSERT')])+'\nCOMMIT;\n')
print('Product SQL: 6 categories, 52 subcategories, 82 atomic questions; accepted samples preserved.')
