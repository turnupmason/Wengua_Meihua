import type { Quality } from './settings';

export interface QualityTier {
  tier: Exclude<Quality, 'auto' | '2d'>;
  maxDpr: number;
  shadows: boolean;
  smokeParticles: number;
  dustParticles: number;
  antialias: boolean;
}

const TIERS: Record<QualityTier['tier'], QualityTier> = {
  high: { tier: 'high', maxDpr: 3, shadows: true, smokeParticles: 140, dustParticles: 240, antialias: true },
  medium: { tier: 'medium', maxDpr: 1.5, shadows: false, smokeParticles: 60, dustParticles: 90, antialias: true },
  low: { tier: 'low', maxDpr: 1, shadows: false, smokeParticles: 30, dustParticles: 0, antialias: false },
};

let webglCache: boolean | null = null;
export function hasWebGL(): boolean {
  if (webglCache !== null) return webglCache;
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl2') || canvas.getContext('webgl')) as WebGLRenderingContext | null;
    webglCache = !!gl;
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    webglCache = false;
  }
  return webglCache;
}

/** Returns null when the 2D fallback should be used. */
export function pickTier(setting: Quality): QualityTier | null {
  if (setting === '2d' || !hasWebGL()) return null;
  if (setting !== 'auto') return TIERS[setting];
  const nav = globalThis.navigator as Navigator & { deviceMemory?: number };
  const cores = nav?.hardwareConcurrency ?? 4;
  const memory = nav?.deviceMemory ?? 4;
  // Recent phones (iPhone 15–18 and peers) take the highest tier; only clearly weak devices step down.
  if (cores <= 2 || memory <= 1) return TIERS.low;
  if (cores <= 4 && memory <= 2) return TIERS.medium;
  return TIERS.high;
}
