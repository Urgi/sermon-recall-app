import { type AppLanguage } from './i18n/languages';
import { getActiveUiLanguage } from './i18n/ui';

/** French uses a 24-hour clock; English and Spanish keep AM/PM. */
export function uses24HourClock(language: AppLanguage = getActiveUiLanguage()): boolean {
  return language === 'fr';
}

/** 12-hour clock preference stored as `users.devotional_notify_hour` (0–23). */

export type ReminderClock = {
  hour12: number; // 1–12
  ampm: 'AM' | 'PM';
};

export const DEFAULT_REMINDER_CLOCK: ReminderClock = { hour12: 7, ampm: 'AM' };

export function hour24ToClock(hour24: number): ReminderClock {
  const h = ((Math.floor(hour24) % 24) + 24) % 24;
  const ampm: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return { hour12, ampm };
}

export function clockToHour24(clock: ReminderClock): number {
  const h = Math.min(12, Math.max(1, Math.floor(clock.hour12)));
  if (clock.ampm === 'AM') return h === 12 ? 0 : h;
  return h === 12 ? 12 : h + 12;
}

export function formatReminderClock(
  clock: ReminderClock,
  language: AppLanguage = getActiveUiLanguage(),
): string {
  if (uses24HourClock(language)) return `${clockToHour24(clock)}\u00a0h\u00a000`;
  return `${clock.hour12}:00 ${clock.ampm}`;
}

export function formatReminderHour24(hour24: number, language?: AppLanguage): string {
  return formatReminderClock(hour24ToClock(hour24), language);
}

/** Step the hour by one in 24-hour mode, wrapping 23 → 0, keeping the 12h+AM/PM model. */
export function bumpHour24(clock: ReminderClock, delta: 1 | -1): ReminderClock {
  return hour24ToClock((clockToHour24(clock) + delta + 24) % 24);
}

export function bumpHour12(hour12: number, delta: 1 | -1): number {
  const next = hour12 + delta;
  if (next > 12) return 1;
  if (next < 1) return 12;
  return next;
}

export function toggleAmpm(ampm: 'AM' | 'PM'): 'AM' | 'PM' {
  return ampm === 'AM' ? 'PM' : 'AM';
}
