// Builds small web fonts from Noto Serif SC (SIL Open Font License 1.1) containing only the
// characters this app displays. Regenerate with `npm run font:subset` after texts change.
import { readFileSync, writeFileSync, readdirSync, statSync, copyFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import subsetFont from 'subset-font';

const app = resolve(import.meta.dirname, '..');
const repo = resolve(app, '../..');
const src = join(app, 'node_modules/@expo-google-fonts/noto-serif-sc');
const out = join(app, 'public/fonts');

const chars = { heading: new Set(), body: new Set() };
const add = (set, s) => { for (const ch of s || '') if (ch.codePointAt(0) > 0x2e7f || /[\p{P}\p{S}]/u.test(ch)) set.add(ch); };
const ascii = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join('');

// Every CJK character written in the app source (UI strings, labels, plaque).
const walk = (dir) => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));
// …and the knowledge engine's own wording (synthesis, verdicts, weather readings).
for (const f of [...walk(join(app, 'src')), ...walk(join(repo, 'src'))]) {
  const text = readFileSync(f, 'utf8');
  add(chars.heading, text);
  add(chars.body, text);
}
const catalog = JSON.parse(readFileSync(join(repo, 'data/catalog.json'), 'utf8'));
for (const t of catalog.trigrams) add(chars.heading, t.id + t.element);
for (const h of catalog.hexagrams) {
  const names = [h.name, h.shortName, ...h.aliases, h.grade.rawGrade, h.grade.canonicalGrade, h.upperTrigram, h.lowerTrigram].join('');
  add(chars.heading, names);
  add(chars.body, names);
  const r = h.reading;
  add(chars.body, [r.text, r.vernacular, r.image, r.imageVernacular, h.grade.poem].join(''));
  for (const l of [...h.lines, ...h.specialLines]) add(chars.body, [l.label, l.text, l.vernacular, l.image, l.imageVernacular].join(''));
}
const domains = JSON.parse(readFileSync(join(repo, 'data/domains.json'), 'utf8'));
for (const d of domains) {
  add(chars.heading, d.title);
  add(chars.body, d.title + d.text + Object.values(d.relationPassages || {}).map((p) => p.quote).join(''));
}

// The formal product catalog (menus, reference texts) and its written 断语 (titles are headings).
const productText = readFileSync(join(repo, 'data/product-categories.json'), 'utf8');
add(chars.body, productText);
for (const c of JSON.parse(productText).categories)
  for (const s of c.subcategories) add(chars.heading, c.label + s.label + s.questions.map((q) => q.question).join(''));
const authored = join(repo, 'data/authored-readings');
for (const f of walk(authored).filter((x) => /hex-\d{3}\.json$/.test(x))) {
  const text = readFileSync(f, 'utf8');
  add(chars.body, text);
  for (const row of JSON.parse(text).rows ?? []) add(chars.heading, row.copy?.title);
}

for (const [name, weight, set] of [['heading', '600SemiBold', chars.heading], ['body', '400Regular', chars.body]]) {
  const ttf = readFileSync(join(src, weight, `NotoSerifSC_${weight}.ttf`));
  const text = [...set].join('') + ascii;
  const woff2 = await subsetFont(ttf, text, { targetFormat: 'woff2' });
  writeFileSync(join(out, `wengua-serif-${name}.woff2`), woff2);
  console.log(`${name}: ${set.size} CJK/punct glyphs, ${(woff2.length / 1024).toFixed(0)} KB`);
}
copyFileSync(join(src, 'LICENSE_FONT'), join(out, 'OFL.txt'));

// Brush script (Ma Shan Zheng, OFL 1.1) for plaques and titles: the heading characters.
const brushSrc = join(app, 'node_modules/@expo-google-fonts/ma-shan-zheng/400Regular/MaShanZheng_400Regular.ttf');
const brush = await subsetFont(readFileSync(brushSrc), [...chars.heading].join('') + ascii, { targetFormat: 'woff2' });
writeFileSync(join(out, 'wengua-brush.woff2'), brush);
copyFileSync(join(app, 'node_modules/@expo-google-fonts/ma-shan-zheng/LICENSE_FONT'), join(out, 'OFL-MaShanZheng.txt'));
console.log(`brush: ${chars.heading.size} glyphs, ${(brush.length / 1024).toFixed(0)} KB`);
