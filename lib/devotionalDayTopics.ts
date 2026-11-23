import { tr, type UiKey } from './i18n/ui';

/** Default six-day journey themes (UI language) when a devotional has no custom title. */
export function defaultDayTopic(dayNumber: number): string | null {
  if (dayNumber < 1 || dayNumber > 6) return null;
  return tr(`topic.${dayNumber}` as UiKey);
}

/** Strip a leading "Day N — …" prefix when the DB title already includes the day number. */
function stripDayPrefix(dayNumber: number, title?: string | null): string | null {
  const trimmed = title?.trim();
  if (!trimmed) return null;
  const pattern = new RegExp(`^(?:Day|Día|Dia|Jour)\\s*${dayNumber}\\s*[—–\\-:]\\s*`, 'i');
  const stripped = trimmed.replace(pattern, '').trim();
  return stripped || null;
}

export function devotionalTopic(dayNumber: number, dbTitle?: string | null): string {
  const stripped = stripDayPrefix(dayNumber, dbTitle);
  if (stripped) return stripped;
  const trimmed = dbTitle?.trim();
  if (trimmed) return trimmed;
  return defaultDayTopic(dayNumber) ?? tr('home.dayFallback', { day: dayNumber });
}

export function devotionalDayHeading(dayNumber: number, dbTitle?: string | null): string {
  return tr('day.heading', { day: dayNumber, topic: devotionalTopic(dayNumber, dbTitle) });
}
