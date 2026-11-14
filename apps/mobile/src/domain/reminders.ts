/**
 * 应期提醒 on the phone: a local notification on the evening a window ends (nothing leaves the
 * device). Only in the native app and only once the visitor turns it on; the browser build relies on
 * the 回访 card in the hall instead.
 *
 * The text names no question (it can show on a locked screen): only that a 应期 has come, and when.
 */
import { Capacitor } from '@capacitor/core';
import type { CastRecord } from './cast';
import { upcomingReminders, type Followups, type TimingRef } from './followup';

/** iOS keeps at most 64 pending notifications per app; stay well under. */
const MAX_PENDING = 50;

export const canRemind = () => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

const plugin = async () => (await import('@capacitor/local-notifications')).LocalNotifications;

/** A stable id per window (so the same reminder is replaced, never doubled). */
export function reminderId(castId: string, index: number): number {
  let h = 2166136261;
  for (const ch of `${castId}#${index}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return (h >>> 1) || 1;
}

/** Asks the system for permission (shows its dialog the first time). */
export async function askReminderPermission(): Promise<boolean> {
  if (!canRemind()) return false;
  try {
    const n = await plugin();
    const now = await n.checkPermissions();
    if (now.display === 'granted') return true;
    return (await n.requestPermissions()).display === 'granted';
  } catch {
    return false;
  }
}

/**
 * Makes the phone's pending reminders match the records: every unanswered window still to come,
 * nothing else. Safe to call often (after a cast, an answer, a deletion, at start).
 */
export async function syncReminders(records: readonly CastRecord[], followups: Followups, enabled: boolean, text: (w: TimingRef) => { title: string; body: string }) {
  if (!canRemind()) return;
  try {
    const n = await plugin();
    const pending = (await n.getPending()).notifications;
    if (pending.length) await n.cancel({ notifications: pending.map((p) => ({ id: p.id })) });
    if (!enabled || (await n.checkPermissions()).display !== 'granted') return;
    const list = upcomingReminders(records, followups, new Date()).slice(0, MAX_PENDING);
    if (!list.length) return;
    await n.schedule({
      notifications: list.map((w) => ({ id: reminderId(w.castId, w.index), ...text(w), schedule: { at: w.at }, extra: { castId: w.castId } })),
    });
  } catch {
    /* Reminders are a convenience; the hall's 回访 card still asks. */
  }
}

/** Tapping a reminder opens that record. */
export function onReminderTap(open: (castId: string) => void): () => void {
  if (!canRemind()) return () => {};
  let remove = () => {};
  let gone = false;
  void plugin()
    .then((n) => n.addListener('localNotificationActionPerformed', (e) => {
      const id = (e.notification.extra as { castId?: unknown } | undefined)?.castId;
      if (typeof id === 'string') open(id);
    }))
    .then((h) => {
      remove = () => void h.remove();
      if (gone) remove();
    })
    .catch(() => {});
  return () => {
    gone = true;
    remove();
  };
}
