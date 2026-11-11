/**
 * Is a new cast about the same real-world matter as an earlier one? Wording is never compared.
 * The rule is explicit: the same fixed question (question_id) cast within the last seven days is
 * offered back first, and the visitor decides — same matter: open the original reading and add to
 * it (its eventId continues); a different matter: cast anew with a new eventId. Older records
 * written freely (no question_id) are never matched.
 */
import type { CastRecord } from './cast';

export const SAME_MATTER_DAYS = 7;

export function sameMatterCandidate(records: readonly CastRecord[], questionId: string | null | undefined, now = new Date()): CastRecord | null {
  if (!questionId) return null;
  const since = now.getTime() - SAME_MATTER_DAYS * 86_400_000;
  for (const r of records) {
    if (r.questionId !== questionId) continue;
    const at = new Date(r.createdAt).getTime();
    if (at >= since && at <= now.getTime() + 60_000) return r;
  }
  return null;
}
