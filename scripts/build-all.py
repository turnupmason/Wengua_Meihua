"""One reproducible offline build for canonical data, detailed mappings, and SQLite import."""
from pathlib import Path
import os,subprocess,sys
root=Path(__file__).resolve().parent
for name in ['build-data.py','import-details.py','build-narratives.mjs','build-cases.mjs','build-timing-audit.mjs','build-day-calendar.mjs','build-receivable-batch.mjs','build-question-catalog.mjs','build-ten-readings-v3.mjs','build-interview-batch.mjs','build-promotion-pay.mjs','build-product-catalog.mjs','export-questions.py','export-product.py','export-authored-readings.py','export-sqlite.py']:
    runner='node' if name.endswith('.mjs') else sys.executable
    command=[runner,str(root/name)]
    env={**os.environ,'PYTHONUTF8':'1'}
    subprocess.run(command,check=True,cwd=root.parent,env=env)
    if name=='build-promotion-pay.mjs':
        subprocess.run([*command,'job-change'],check=True,cwd=root.parent,env=env)
        subprocess.run([*command,'workplace-stability'],check=True,cwd=root.parent,env=env)
        subprocess.run([*command,'workplace-probation'],check=True,cwd=root.parent,env=env)
