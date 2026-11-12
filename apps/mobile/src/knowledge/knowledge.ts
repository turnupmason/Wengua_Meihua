import { createLibrary, createDetailsRepository, createProductRepository } from '@knowledge';
import type { Library, DetailsRepository, ProductRepository } from '@knowledge';
import { CORE_PATHS, readBundledJSON, type ReadJSON } from './dataSources';
import { ensureDigest } from './digest';

export type { Library, DetailsRepository, ProductRepository };
export type {
  Reading, Stage, Hexagram, LineReading, DetailedLine, DetailedHexagram, ReferenceCommentary, Domain, Branch,
  RelationType, DisplayGrade, Grade,
} from '@knowledge';
export { getVoidReleaseTargets, getXunVoid } from '@knowledge';

export interface Knowledge {
  library: Library;
  details: DetailsRepository;
  /** The formal product catalog and its written 断语 (read one hexagram's file at a time). */
  product: ProductRepository;
  contentVersion: string;
}

/**
 * Loads the canonical library and the details repository from bundled data.
 * `readJSON` is injectable so tests and native shells can supply their own reader.
 */
export async function loadKnowledge(
  { readJSON = readBundledJSON, onProgress }: { readJSON?: ReadJSON; onProgress?: (done: number, total: number) => void } = {},
): Promise<Knowledge> {
  let done = 0;
  onProgress?.(0, CORE_PATHS.length);
  const [catalog, sections, domains] = await Promise.all(
    CORE_PATHS.map(async (p) => {
      const value = await readJSON(p);
      onProgress?.(++done, CORE_PATHS.length);
      return value;
    }),
  );
  const library = createLibrary({ catalog, sections, domains });
  const details = createDetailsRepository({ library, readJSON });
  ensureDigest();
  const product = createProductRepository({ library, readJSON });
  return { library, details, product, contentVersion: library.contentVersion };
}

let shared: Promise<Knowledge> | null = null;
/** One shared load per app session; a failed load is not cached so the user can retry. */
export function getKnowledge(onProgress?: (done: number, total: number) => void): Promise<Knowledge> {
  if (!shared) {
    shared = loadKnowledge({ onProgress }).catch((e) => {
      shared = null;
      throw e;
    });
  }
  return shared;
}
