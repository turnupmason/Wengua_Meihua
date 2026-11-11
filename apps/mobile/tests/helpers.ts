import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadKnowledge, type Knowledge } from '../src/knowledge/knowledge';

// Vitest runs from apps/mobile.
export const appRoot = process.cwd();
export const repoRoot = resolve(appRoot, '../..');

/** Reads repository data from disk (tests only; the app reads bundled assets). */
export const readFromDisk = async (path: string) => JSON.parse(readFileSync(resolve(repoRoot, path), 'utf8'));

let cached: Promise<Knowledge> | null = null;
export function testKnowledge(): Promise<Knowledge> {
  cached ??= loadKnowledge({ readJSON: readFromDisk });
  return cached;
}

export function memoryStore() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    dump: () => m,
  };
}
