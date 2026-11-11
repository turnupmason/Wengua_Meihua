// Portable Python launcher: uses python3 where available (Linux/macOS CI) and python on Windows,
// always in UTF-8 mode so builds are byte-identical across platforms.
import { spawnSync } from 'node:child_process';

const [script, ...args] = process.argv.slice(2);
const env = { ...process.env, PYTHONUTF8: '1' };
for (const cmd of ['python3', 'python', 'py']) {
  const probe = spawnSync(cmd, ['-c', 'import sys; assert sys.version_info >= (3, 10)'], { env, stdio: 'ignore' });
  if (probe.status !== 0) continue;
  const run = spawnSync(cmd, [script, ...args], { env, stdio: 'inherit' });
  process.exit(run.status ?? 1);
}
console.error('Python 3.10+ not found (tried python3, python, py).');
process.exit(1);
