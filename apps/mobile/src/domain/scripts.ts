/**
 * The author's 断语 database: written and reviewed by hand, imported from JSON or an Excel sheet
 * saved as CSV, and read here exactly as stored. Nothing is generated or rewritten at run time.
 *
 * A 断语 is found only by explicit fields:
 *   question_id + 本卦 (hexagram_id, King Wen 1–64) + 动爻 (moving_line, 1–6, bottom-up)
 *   + 时令 (season_variant_id, from the month branch of the actual casting time)
 *   + any fixed-option conditions the question defines.
 * A season-specific 断语 is used only in its season. A year-round one (`all`) is used only when the
 * author marked it so and said why (`season_note`). There is no other fallback: a missing match
 * is reported as missing, never filled from another question, line, season or a generic text.
 * Only `approved` records ever reach a visitor.
 */
import { seasonalStrength } from '@knowledge';
import { questionById, type CatalogQuestion } from './questionCatalog';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter' | 'earth';
export type SeasonVariant = Season | 'all';
export const SEASON_VARIANTS: readonly SeasonVariant[] = ['spring', 'summer', 'autumn', 'winter', 'earth', 'all'];
export const SEASON_LABEL: Record<SeasonVariant, { zh: string; en: string }> = {
  spring: { zh: '春令（寅卯月）', en: 'spring (寅卯 months)' },
  summer: { zh: '夏令（巳午月）', en: 'summer (巳午 months)' },
  autumn: { zh: '秋令（申酉月）', en: 'autumn (申酉 months)' },
  winter: { zh: '冬令（亥子月）', en: 'winter (亥子 months)' },
  earth: { zh: '四季土月（辰戌丑未月）', en: 'earth months (辰戌丑未)' },
  all: { zh: '全年通用', en: 'all year' },
};

export type ScriptStatus = 'draft' | 'reviewing' | 'approved';
export const SCRIPT_STATUSES: readonly ScriptStatus[] = ['draft', 'reviewing', 'approved'];

export type ClassicalSource =
  | { kind: 'line'; hexagram_id: number; line: number; quote?: string }
  | { kind: 'hexagram'; hexagram_id: number; quote?: string }
  | { kind: 'section'; title: string; quote?: string }
  | { kind: 'text'; text: string };

export interface ScriptRecord {
  script_id: string;
  question_id: string;
  hexagram_id: number;
  moving_line: number;
  season_variant_id: SeasonVariant;
  /** Required for `all`: why this 断语 holds in every season (the author's own words). */
  season_note?: string;
  /** Fixed-option facts this 断语 applies to, e.g. { lost_where: 'home' }. */
  conditions?: Record<string, string>;
  title: string;
  brief_text: string;
  opening_text: string;
  process_text: string;
  ending_text: string;
  conclusion_text: string;
  classical_sources: ClassicalSource[];
  status: ScriptStatus;
  version: string;
}

/** 时令 of a month branch, as the engine's 卦气旺衰 reads it. */
export function seasonOf(monthBranch: string | null | undefined): Season | null {
  if (!monthBranch) return null;
  try {
    return (seasonalStrength('木', { monthBranch: monthBranch as never }).season as Season | undefined) ?? null;
  } catch {
    return null;
  }
}

// ——— Import: rows from JSON or CSV → checked records ———

export interface ImportProblem {
  row: number;
  script_id?: string;
  field?: string;
  message: string;
}

const TEXT_FIELDS = ['title', 'brief_text', 'opening_text', 'process_text', 'ending_text', 'conclusion_text'] as const;
const str = (v: unknown) => (v === undefined || v === null ? '' : String(v)).trim();
const int = (v: unknown) => {
  const s = str(v);
  return /^\d+$/.test(s) ? Number(s) : NaN;
};

/**
 * classical_sources in a sheet cell, one per line:
 *   爻:55:3|原句   卦:55|原句   篇:求名占第九|原句   文:任意说明
 * (line:/hex:/section:/text: also accepted). In JSON, an array of ClassicalSource.
 */
export function parseSources(v: unknown): { sources: ClassicalSource[]; errors: string[] } {
  const errors: string[] = [];
  if (Array.isArray(v)) {
    const sources: ClassicalSource[] = [];
    for (const s of v) {
      const o = s as Record<string, unknown>;
      if (o?.kind === 'line' && int(o.hexagram_id) >= 1 && int(o.hexagram_id) <= 64 && int(o.line) >= 1 && int(o.line) <= 7)
        sources.push({ kind: 'line', hexagram_id: int(o.hexagram_id), line: int(o.line), ...(str(o.quote) ? { quote: str(o.quote) } : {}) });
      else if (o?.kind === 'hexagram' && int(o.hexagram_id) >= 1 && int(o.hexagram_id) <= 64) sources.push({ kind: 'hexagram', hexagram_id: int(o.hexagram_id), ...(str(o.quote) ? { quote: str(o.quote) } : {}) });
      else if (o?.kind === 'section' && str(o.title)) sources.push({ kind: 'section', title: str(o.title), ...(str(o.quote) ? { quote: str(o.quote) } : {}) });
      else if (o?.kind === 'text' && str(o.text)) sources.push({ kind: 'text', text: str(o.text) });
      else errors.push(`bad source ${JSON.stringify(s)}`);
    }
    return { sources, errors };
  }
  const sources: ClassicalSource[] = [];
  for (const line of str(v).split(/\r?\n/).map((x) => x.trim()).filter(Boolean)) {
    const m = /^(爻|line|卦|hex|篇|section|文|text)\s*[:：]\s*(.*)$/i.exec(line);
    if (!m) {
      errors.push(`bad source "${line}"`);
      continue;
    }
    const kind = m[1].toLowerCase();
    const [head, ...rest] = m[2].split('|');
    const quote = rest.join('|').trim();
    const q = quote ? { quote } : {};
    if (kind === '爻' || kind === 'line') {
      const [h, l] = head.split(/[:：]/).map(int);
      if (h >= 1 && h <= 64 && l >= 1 && l <= 7) sources.push({ kind: 'line', hexagram_id: h, line: l, ...q });
      else errors.push(`bad line source "${line}"`);
    } else if (kind === '卦' || kind === 'hex') {
      const h = int(head);
      if (h >= 1 && h <= 64) sources.push({ kind: 'hexagram', hexagram_id: h, ...q });
      else errors.push(`bad hexagram source "${line}"`);
    } else if (kind === '篇' || kind === 'section') {
      if (head.trim()) sources.push({ kind: 'section', title: head.trim(), ...q });
      else errors.push(`bad section source "${line}"`);
    } else if (m[2].trim()) sources.push({ kind: 'text', text: m[2].trim() });
  }
  return { sources, errors };
}

/** conditions in a sheet cell: `lost_where=home; lost_when=today`. In JSON, an object. */
function parseConditions(v: unknown): Record<string, string> | null {
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    const out: Record<string, string> = {};
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) out[k.trim()] = str(x);
    return out;
  }
  const s = str(v);
  if (!s) return {};
  const out: Record<string, string> = {};
  for (const part of s.split(/[;；\n]/).map((x) => x.trim()).filter(Boolean)) {
    const [k, x] = part.split('=').map((y) => y?.trim());
    if (!k || !x) return null;
    out[k] = x;
  }
  return out;
}

const condKey = (c: Record<string, string> | undefined) =>
  Object.entries(c ?? {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');

/** Lookup key: one approved 断语 per question, hexagram, line, season and condition set. */
export const scriptKey = (r: Pick<ScriptRecord, 'question_id' | 'hexagram_id' | 'moving_line' | 'season_variant_id' | 'conditions'>) =>
  `${r.question_id}|${r.hexagram_id}|${r.moving_line}|${r.season_variant_id}|${condKey(r.conditions)}`;

/**
 * Checks imported rows (from JSON, or CSV via parseCsv). Every problem is reported with its row;
 * a file with any error should not be imported. Drafts may be incomplete; approved ones may not.
 */
export function validateScripts(rows: readonly unknown[], lookup: (id: string) => CatalogQuestion | null = questionById): { records: ScriptRecord[]; errors: ImportProblem[] } {
  const records: ScriptRecord[] = [];
  const errors: ImportProblem[] = [];
  const ids = new Set<string>();
  const approvedKeys = new Map<string, string>();
  rows.forEach((raw, i) => {
    const row = i + 1;
    const o = (raw ?? {}) as Record<string, unknown>;
    const script_id = str(o.script_id);
    const err = (field: string | undefined, message: string) => errors.push({ row, ...(script_id ? { script_id } : {}), ...(field ? { field } : {}), message });
    const before = errors.length;
    if (!/^[A-Za-z0-9._-]{3,80}$/.test(script_id)) err('script_id', 'script_id must be 3–80 letters, digits, . _ -');
    else if (ids.has(script_id)) err('script_id', 'duplicate script_id');
    ids.add(script_id);
    const question_id = str(o.question_id);
    const q = lookup(question_id);
    if (!q) err('question_id', `unknown question_id "${question_id}"`);
    else if (q.shares_scripts_of) err('question_id', `${question_id} shares the 断语 of ${q.shares_scripts_of}; write them there`);
    const hexagram_id = int(o.hexagram_id);
    if (!(hexagram_id >= 1 && hexagram_id <= 64)) err('hexagram_id', 'hexagram_id must be 1–64 (King Wen order)');
    const moving_line = int(o.moving_line);
    if (!(moving_line >= 1 && moving_line <= 6)) err('moving_line', 'moving_line must be 1–6, counted from the bottom');
    const season_variant_id = str(o.season_variant_id) as SeasonVariant;
    if (!SEASON_VARIANTS.includes(season_variant_id)) err('season_variant_id', `season_variant_id must be one of ${SEASON_VARIANTS.join(', ')}`);
    const season_note = str(o.season_note);
    if (season_variant_id === 'all' && !season_note) err('season_note', 'a year-round 断语 needs season_note: why it holds in every season');
    const status = str(o.status) as ScriptStatus;
    if (!SCRIPT_STATUSES.includes(status)) err('status', 'status must be draft, reviewing or approved');
    const version = str(o.version);
    if (!version) err('version', 'version is required');
    const conditions = parseConditions(o.conditions);
    if (!conditions) err('conditions', 'conditions must look like key=value; key=value');
    else if (q)
      for (const [k, v] of Object.entries(conditions)) {
        const def = q.conditions?.find((c) => c.condition_id === k);
        if (!def) err('conditions', `${question_id} has no condition "${k}"`);
        else if (!def.options.some((x) => x.option_id === v)) err('conditions', `condition ${k} has no option "${v}"`);
      }
    const { sources, errors: srcErr } = parseSources(o.classical_sources);
    for (const m of srcErr) err('classical_sources', m);
    const texts = Object.fromEntries(TEXT_FIELDS.map((f) => [f, str(o[f])])) as Record<(typeof TEXT_FIELDS)[number], string>;
    if (status === 'approved') {
      for (const f of TEXT_FIELDS) if (!texts[f]) err(f, `${f} is required for an approved 断语`);
      if (!sources.length) err('classical_sources', 'an approved 断语 cites at least one classical source');
    }
    if (errors.length > before) return;
    const rec: ScriptRecord = {
      script_id,
      question_id,
      hexagram_id,
      moving_line,
      season_variant_id,
      ...(season_note ? { season_note } : {}),
      ...(conditions && Object.keys(conditions).length ? { conditions } : {}),
      ...texts,
      classical_sources: sources,
      status,
      version,
    };
    if (status === 'approved') {
      const key = scriptKey(rec);
      const other = approvedKeys.get(key);
      if (other) {
        err(undefined, `two approved 断语 for the same question, hexagram, line, season and conditions (${other} and ${script_id}); keep one approved`);
        return;
      }
      approvedKeys.set(key, script_id);
    }
    records.push(rec);
  });
  return { records, errors };
}

/** Minimal CSV (RFC 4180): quoted fields, doubled quotes, line breaks inside quotes, BOM. */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const s = text.replace(/^﻿/, '');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === '"' && s[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  const [head, ...body] = rows.filter((r) => r.some((x) => x.trim()));
  if (!head) return [];
  const keys = head.map((h) => h.trim());
  return body.map((r) => Object.fromEntries(keys.map((k, i) => [k, r[i] ?? ''])));
}

// ——— Lookup ———

export interface ScriptQuery {
  questionId: string;
  hexagramId: number;
  movingLine: number;
  /** Month branch of the actual casting time (null when unknown: only year-round 断语 can apply). */
  monthBranch: string | null;
  conditions?: Record<string, string>;
}

export type ScriptLookup =
  | { state: 'ready'; script: ScriptRecord; season: Season | null; matchedBy: 'season' | 'all-year' }
  | { state: 'missing'; season: Season | null; reason: 'unknown-question' | 'no-script' };

export interface Availability {
  state: 'none' | 'partial' | 'complete';
  /** 本卦 × 动爻 combinations covered in every season (of 384). */
  covered: number;
  approved: number;
}

export function createScriptRepository(all: readonly ScriptRecord[]) {
  // Visitors only ever see approved 断语.
  const approved = all.filter((r) => r.status === 'approved');
  const byCast = new Map<string, ScriptRecord[]>();
  for (const r of approved) {
    const k = `${r.question_id}|${r.hexagram_id}|${r.moving_line}`;
    byCast.set(k, [...(byCast.get(k) ?? []), r]);
  }
  const ownerOf = (questionId: string) => {
    const q = questionById(questionId);
    return q ? q.shares_scripts_of ?? q.question_id : null;
  };
  return {
    find(q: ScriptQuery): ScriptLookup {
      const season = seasonOf(q.monthBranch);
      const owner = ownerOf(q.questionId);
      if (!owner) return { state: 'missing', season, reason: 'unknown-question' };
      const answers = q.conditions ?? {};
      const fits = (r: ScriptRecord) => Object.entries(r.conditions ?? {}).every(([k, v]) => answers[k] === v);
      const candidates = (byCast.get(`${owner}|${q.hexagramId}|${q.movingLine}`) ?? []).filter(fits);
      // The most specific condition set wins within a season; the season itself always comes first.
      const best = (list: ScriptRecord[]) => list.sort((a, b) => Object.keys(b.conditions ?? {}).length - Object.keys(a.conditions ?? {}).length)[0];
      const inSeason = season ? best(candidates.filter((r) => r.season_variant_id === season)) : undefined;
      if (inSeason) return { state: 'ready', script: inSeason, season, matchedBy: 'season' };
      const yearRound = best(candidates.filter((r) => r.season_variant_id === 'all'));
      if (yearRound) return { state: 'ready', script: yearRound, season, matchedBy: 'all-year' };
      return { state: 'missing', season, reason: 'no-script' };
    },
    /** How much of a question is written: complete only when all 384 本卦 × 动爻 hold in every season. */
    availability(questionId: string): Availability {
      const owner = ownerOf(questionId);
      const mine = owner ? approved.filter((r) => r.question_id === owner) : [];
      let covered = 0;
      for (let h = 1; h <= 64; h++)
        for (let l = 1; l <= 6; l++) {
          const list = (byCast.get(`${owner}|${h}|${l}`) ?? []).filter((r) => !r.conditions);
          const seasons = new Set(list.map((r) => r.season_variant_id));
          if (seasons.has('all') || (['spring', 'summer', 'autumn', 'winter', 'earth'] as const).every((s) => seasons.has(s))) covered++;
        }
      return { state: mine.length === 0 ? 'none' : covered === 384 ? 'complete' : 'partial', covered, approved: mine.length };
    },
    size: approved.length,
  };
}

export type ScriptRepository = ReturnType<typeof createScriptRepository>;
