/** Turns the home form into casting inputs, and says what is missing before entering. */
import type { MethodInputs } from '../domain/methods';
import { questionById } from '../domain/questionCatalog';
import type { CastRequest } from '../domain/cast';
import type { CalendarPolicy } from '../domain/calendar';
import type { EntryForm } from './HomeOverlay';

const num = (v: string) => (v.trim() === '' ? undefined : Number(v));

export function entryInputs(f: EntryForm): MethodInputs {
  switch (f.method) {
    case 'classical-time':
      return f.surname ? { surnameStrokes: num(f.surname) } : {};
    case 'object-count':
    case 'sound-count':
      return { count: num(f.count) };
    case 'text':
      // 字占 needs words the asker wrote; questions are chosen, not written, so it is not offered.
      return {};
    case 'chi-cun':
    case 'zhang-chi':
      return { major: num(f.major), minor: num(f.minor) };
    case 'object-direction':
      return { objectTrigram: f.objectTrigram || undefined, directionTrigram: f.directionTrigram || undefined };
  }
}

const pos = (v: string) => /^\d+$/.test(v) && Number(v) >= 1;

/** null when the form can be cast; otherwise what is missing. */
export function entryProblem(f: EntryForm): 'question' | 'conditions' | 'numbers' | 'method' | 'time' | null {
  const q = questionById(f.questionId);
  if (!q || !q.enabled) return 'question';
  if (q.conditions?.some((c) => !c.options.some((o) => o.option_id === f.conditions[c.condition_id]))) return 'conditions';
  if (f.customTime && (!f.customAt || Number.isNaN(new Date(f.customAt).getTime()))) return 'time';
  switch (f.method) {
    case 'classical-time':
      return f.surname === '' || pos(f.surname) ? null : 'numbers';
    case 'object-count':
    case 'sound-count':
      return pos(f.count) ? null : 'numbers';
    case 'text':
      return 'method';
    case 'chi-cun':
    case 'zhang-chi':
      return pos(f.major) && pos(f.minor) ? null : 'numbers';
    case 'object-direction':
      return f.objectTrigram && f.directionTrigram ? null : 'numbers';
  }
}

/**
 * The one cast request for a form. The full ritual and 简洁问事 both cast through this (pace is
 * not an input), so they reach the same 排盘 and the same 断语 lookup.
 */
export function castRequest(f: EntryForm, o: { lang: 'zh' | 'en'; timeZone: string; calendarPolicy: Partial<CalendarPolicy>; now?: Date }): CastRequest {
  const q = questionById(f.questionId);
  const custom = f.customTime && f.customAt ? new Date(f.customAt) : null;
  return {
    method: f.method,
    questionId: f.questionId ?? undefined,
    // The wording as shown when it was chosen (kept with the record).
    question: q ? q.question_text[o.lang] : '',
    conditions: f.conditions,
    inputs: entryInputs(f),
    instant: custom ?? o.now ?? new Date(),
    customInstant: !!custom,
    timeZone: o.timeZone,
    calendarPolicy: o.calendarPolicy,
  };
}
