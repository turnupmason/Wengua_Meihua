"""One reproducible offline build for canonical data, detailed mappings, and SQLite import."""
from pathlib import Path
import subprocess,sys
root=Path(__file__).resolve().parent
for name in ['build-data.py','import-details.py','export-sqlite.py']:
    subprocess.run([sys.executable,str(root/name)],check=True,cwd=root.parent)
