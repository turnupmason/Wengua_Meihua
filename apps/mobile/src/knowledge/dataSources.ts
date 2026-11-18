/**
 * Maps repository-relative data paths (as used by src/index.js and src/details.js)
 * to bundled asset URLs. Files are emitted by Vite as local assets, so they load
 * offline from the app package; nothing is fetched from the network.
 */
const PREFIX = '../../../../';

const core = import.meta.glob(
  ['../../../../data/catalog.json', '../../../../data/meihua-sections.json', '../../../../data/domains.json'],
  { query: '?url', import: 'default', eager: true },
) as Record<string, string>;
const details = import.meta.glob(['../../../../data/details/[0-9][0-9].json', '../../../../data/details/index.json'], { query: '?url', import: 'default', eager: true }) as Record<string, string>;
// Long commentary is only loaded when a reader expands it.
const commentary = import.meta.glob('../../../../sources/commentary/*.json', { query: '?url', import: 'default', eager: true }) as Record<string, string>;
// The formal product catalog and the indexes of its written 断语. The 断语 themselves
// (authored-readings/*/hex-NNN.json, question-stories/*/NN.json) are not bundled (2026-11-18): each
// cast gets its one 断语 from the server (services/readings.ts, server/reading.ts), so the library
// cannot be copied out of the page or the app.
const product = import.meta.glob(
  [
    '../../../../data/product-categories.json',
    '../../../../data/authored-readings/*/index.json',
    '../../../../data/question-items.json',
    '../../../../data/interpretation-reviews.json',
    '../../../../data/question-stories/index.json',
    '../../../../data/question-stories/*/index.json',
  ],
  { query: '?url', import: 'default', eager: true },
) as Record<string, string>;

export const DATA_URLS: ReadonlyMap<string, string> = new Map(
  Object.entries({ ...core, ...details, ...commentary, ...product }).map(([k, v]) => [k.slice(PREFIX.length), v]),
);

export const CORE_PATHS = ['data/catalog.json', 'data/meihua-sections.json', 'data/domains.json'] as const;

export type ReadJSON = (path: string) => Promise<unknown>;

/** Reads a bundled JSON file by repository path. Unknown paths are refused instead of guessed. */
export const readBundledJSON: ReadJSON = async (path) => {
  const url = DATA_URLS.get(path);
  if (!url) throw new Error(`Data file is not bundled: ${path}`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Cannot load ${path}: HTTP ${response.status}`);
  return response.json();
};
