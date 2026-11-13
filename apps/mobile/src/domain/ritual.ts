/**
 * Ritual state machine. Every transition is idempotent: repeated or late events are ignored,
 * and a cast id, once attached, is never replaced (so skip / replay / resume cannot recast).
 *
 * idle → entering → revealing → reading
 * The cast is frozen when the visitor enters (BEGIN); they walk up the hall to the stone table,
 * the 三清 bestow the hexagrams, and the table is carved.
 */
import { revealPlan } from '../scene/carving';

export type RitualPhase = 'idle' | 'entering' | 'revealing' | 'reading';

export const PHASE_ORDER: readonly RitualPhase[] = ['idle', 'entering', 'revealing', 'reading'];

export interface RitualState {
  phase: RitualPhase;
  castId: string | null;
  skipped: boolean;
}

export type RitualEvent =
  | { type: 'BEGIN'; castId: string }
  | { type: 'PHASE_DONE'; phase: RitualPhase }
  | { type: 'SKIP'; castId: string }
  /** `phase` is whatever was saved, possibly by an older version with more steps. */
  | { type: 'RESUME'; castId: string; phase: string }
  | { type: 'RESET' };

export const INITIAL_RITUAL: RitualState = Object.freeze({ phase: 'idle', castId: null, skipped: false });

const AUTO_NEXT: Partial<Record<RitualPhase, RitualPhase>> = {
  entering: 'revealing',
  revealing: 'reading',
};

export function ritualReducer(state: RitualState, event: RitualEvent): RitualState {
  switch (event.type) {
    case 'BEGIN':
      if (state.phase !== 'idle') return state;
      return { ...state, phase: 'entering', castId: state.castId ?? event.castId };
    case 'PHASE_DONE': {
      if (event.phase !== state.phase) return state;
      const next = AUTO_NEXT[state.phase];
      if (!next || !state.castId) return state;
      return { ...state, phase: next };
    }
    case 'SKIP':
      if (state.phase === 'idle' || state.phase === 'reading') return state;
      return { ...state, phase: 'reading', castId: state.castId ?? event.castId, skipped: true };
    case 'RESUME': {
      if (state.castId && state.castId !== event.castId) return state;
      // A phase saved by an older version (the incense steps) resumes at the bestowal.
      const p = event.phase;
      const phase: RitualPhase = p === 'idle' || p === 'reading' ? 'reading' : p === 'entering' || p === 'revealing' ? p : 'revealing';
      return { phase, castId: event.castId, skipped: state.skipped };
    }
    case 'RESET':
      return INITIAL_RITUAL;
    default:
      return state;
  }
}

/** Phase durations in seconds. Reading and idle are open-ended. */
export const DURATIONS: Record<'normal' | 'reduced', Partial<Record<RitualPhase, number>>> = {
  normal: { entering: 3.6, revealing: revealPlan(false).total },
  reduced: { entering: 1.2, revealing: revealPlan(true).total },
};

export function phaseDuration(phase: RitualPhase, reducedMotion: boolean): number {
  return DURATIONS[reducedMotion ? 'reduced' : 'normal'][phase] ?? Infinity;
}

export function isRitualPhase(phase: RitualPhase): boolean {
  return phase !== 'idle' && phase !== 'reading';
}
