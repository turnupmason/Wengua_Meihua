/**
 * Imports the author's 断语 from JSON or from an Excel sheet saved as「CSV UTF-8」.
 *
 *   npm run scripts:import -- path/to/scripts.csv [more.json ...]   check, then write
 *   npm run scripts:import -- path/to/scripts.csv --check           check only
 *
 * Every row is checked (ids, hexagram 1–64, line 1–6, season, status, required texts, sources,
 * one approved 断语 per key). Any error stops the import and nothing is written. On success:
 *   content/scripts/scripts.json      all records, any status (the author's working copy)
 *   src/data/scripts.approved.json    approved only — the only 断语 the app ships
 * After importing new text, run `npm run font:subset` so the new characters are in the fonts.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';
import { parseCsv, validateScripts, createScriptRepository } from '../src/domain/scripts';
import { allQuestions, catalogProblems } from '../src/domain/questionCatalog';

const args = process.argv.slice(2).filter((a) => a !== '--');
const checkOnly = args.includes('--check');
const files = args.filter((a) => !a.startsWith('--'));
if (!files.length) {
  console.error('usage: npm run scripts:import -- <file.csv|file.json> [...] [--check]');
  process.exit(2);
}

const catalog = catalogProblems();
if (catalog.length) {
  console.error('Question catalog has problems:\n' + catalog.join('\n'));
  process.exit(1);
}

const rows: unknown[] = [];
for (const f of files) {
  const text = readFileSync(f, 'utf8');
  if (extname(f).toLowerCase() === '.csv') rows.push(...parseCsv(text));
  else {
    const j = JSON.parse(text.replace(/^﻿/, ''));
    rows.push(...(Array.isArray(j) ? j : j.records ?? []));
  }
}

const { records, errors } = validateScripts(rows);
if (errors.length) {
  console.error(`${errors.length} problem(s); nothing was written:`);
  for (const e of errors) console.error(`  row ${e.row}${e.script_id ? ` (${e.script_id})` : ''}${e.field ? ` [${e.field}]` : ''}: ${e.message}`);
  process.exit(1);
}

const count = (s: string) => records.filter((r) => r.status === s).length;
console.log(`${records.length} record(s): ${count('approved')} approved, ${count('reviewing')} reviewing, ${count('draft')} draft.`);
const repo = createScriptRepository(records);
for (const q of allQuestions()) {
  const a = repo.availability(q.question_id);
  if (a.state !== 'none') console.log(`  ${q.question_id}: ${a.state}, ${a.approved} approved, ${a.covered}/384 本卦×动爻 covered in every season`);
}
if (checkOnly) process.exit(0);

const here = resolve(dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const sorted = [...records].sort((a, b) => a.script_id.localeCompare(b.script_id));
const now = new Date().toISOString();
mkdirSync(resolve(here, 'content/scripts'), { recursive: true });
writeFileSync(resolve(here, 'content/scripts/scripts.json'), JSON.stringify({ format: 'wengua-scripts/1', generated_at: now, records: sorted }, null, 2) + '\n');
writeFileSync(resolve(here, 'src/data/scripts.approved.json'), JSON.stringify({ format: 'wengua-scripts/1', generated_at: now, records: sorted.filter((r) => r.status === 'approved') }, null, 2) + '\n');
console.log('Written. Run `npm run font:subset` if the 断语 add new characters.');
