/** Default six-day journey themes when a devotional has no custom title. */
export const DEVOTIONAL_DAY_TOPICS: Record<number, string> = {
  1: 'Welcome to the Journey',
  2: "Elaboration — Going deeper into Sunday's message",
  3: 'Generation — Try to recall before you read',
  4: "Interleaving — Connecting to last week's theme",
  5: 'Reflection — Talk it through in your own words',
  6: 'Cumulative review — Sabbath eve summary',
};

/** Strip a leading "Day N — …" prefix when the DB title already includes the day number. */
function stripDayPrefix(dayNumber: number, title?: string | null): string | null {
  const trimmed = title?.trim();
  if (!trimmed) return null;
  const pattern = new RegExp(`^Day\\s*${dayNumber}\\s*[—–\\-:]\\s*`, 'i');
  const stripped = trimmed.replace(pattern, '').trim();
  return stripped || null;
}

export function devotionalTopic(dayNumber: number, dbTitle?: string | null): string {
  const stripped = stripDayPrefix(dayNumber, dbTitle);
  if (stripped) return stripped;
  const trimmed = dbTitle?.trim();
  if (trimmed) return trimmed;
  return DEVOTIONAL_DAY_TOPICS[dayNumber] ?? `Day ${dayNumber}`;
}

export function devotionalDayHeading(dayNumber: number, dbTitle?: string | null): string {
  return `Day ${dayNumber} — ${devotionalTopic(dayNumber, dbTitle)}`;
}
