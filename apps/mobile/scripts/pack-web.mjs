// Packs the web site for Cloudflare (app.wengualabs.com): dist-web/ = the built app (dist/) plus,
// under dist-web/_data/, the files the server's 断语 lookup reads (server/reading.ts). The Worker
// (worker/index.ts) never serves _data/ to a browser; it only reads it. The iOS app is built from
// dist/ and carries none of these files.
//
// Run after `vite build`: `npm run build:web`.
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const app = resolve(here, '..');
const repo = resolve(app, '../..');
const dist = join(app, 'dist');
const out = join(app, 'dist-web');

if (!existsSync(join(dist, 'index.html'))) throw new Error('Build the app first (vite build): dist/index.html is missing.');
rmSync(out, { recursive: true, force: true });
cpSync(dist, out, { recursive: true });

// The same files the app used to bundle for the product lookup (src/knowledge/dataSources.ts).
const single = [
  'data/catalog.json',
  'data/meihua-sections.json',
  'data/domains.json',
  'data/product-categories.json',
  'data/question-items.json',
  'data/interpretation-reviews.json',
  'data/question-stories/index.json',
];
const perFolder = [
  ['data/authored-readings', (f) => f === 'index.json' || /^hex-\d{3}\.json$/.test(f)],
  ['data/question-stories', (f) => f === 'index.json' || /^\d{2}\.json$/.test(f)],
];

let files = 0;
let bytes = 0;
const copy = (rel) => {
  const from = join(repo, rel);
  const to = join(out, '_data', rel);
  mkdirSync(dirname(to), { recursive: true });
  cpSync(from, to);
  files += 1;
  bytes += statSync(from).size;
};
for (const rel of single) copy(rel);
for (const [folder, keep] of perFolder) {
  for (const sub of readdirSync(join(repo, folder), { withFileTypes: true })) {
    if (!sub.isDirectory()) continue;
    for (const f of readdirSync(join(repo, folder, sub.name))) if (keep(f)) copy(`${folder}/${sub.name}/${f}`);
  }
}
const total = readdirSync(out, { recursive: true }).length;
console.log(`dist-web: ${files} data files (${(bytes / 1048576).toFixed(0)} MB) under _data/, ${total} entries in all.`);
