"""One reproducible offline build for canonical data, detailed mappings, and SQLite import."""
from pathlib import Path
import subprocess,sys
root=Path(__file__).resolve().parent
for name in ['build-data.py','import-details.py','build-narratives.mjs','build-cases.mjs','build-timing-audit.mjs','export-sqlite.py']:
    runner='node' if name.endswith('.mjs') else sys.executable
    subprocess.run([runner,str(root/name)],check=True,cwd=root.parent)
