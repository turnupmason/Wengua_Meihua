// Runs every tests/*.test.mjs explicitly so `npm test` also works where node --test lacks glob support.
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const dir = fileURLToPath(new URL('../tests/', import.meta.url));
const files = readdirSync(dir).filter((f) => f.endsWith('.test.mjs')).sort().map((f) => join(dir, f));
const run = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
process.exit(run.status ?? 1);
