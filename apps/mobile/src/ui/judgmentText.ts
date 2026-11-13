/** What to say when a cast has no 断语 to show, by why (never a stand-in text). */
import type { Strings } from '../domain/i18n';
import type { MissingReason } from '../domain/judgment';

export function missingText(t: Strings, reason: MissingReason): { title: string; text: string } {
  switch (reason) {
    case 'pending-review':
      return { title: t.reviewPending, text: t.reviewPendingText };
    case 'requires-context':
      return { title: t.contextPending, text: t.contextPendingText };
    case 'unavailable':
      return { title: t.libraryUnavailable, text: t.libraryUnavailableText };
    default:
      return { title: t.scriptPending, text: t.scriptPendingText };
  }
}

/** 「开局：……」 → ['开局', '……']; a paragraph without a label keeps its text whole. */
export function labelled(paragraph: string): [string | null, string] {
  const m = /^(开局|过程|结局|总断|应期)：([\s\S]*)$/.exec(paragraph);
  return m ? [m[1], m[2]] : [null, paragraph];
}
