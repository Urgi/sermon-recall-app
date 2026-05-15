/**
 * Calendar-based unlock (church timezone) aligned with the six-day journey:
 * - On anchor day (sermon date): only Day 1 opens.
 * - Each following calendar day opens one more day (Days 1–N on day N of the window).
 * - After the six-day window (anchor + 6 calendar days), all days unlock for catch-up.
 * - Completed days always stay open for review.
 *
 * When `ctx` is omitted, falls back to legacy sequential unlock (earliest incomplete only).
 */

export type UnlockContext = {
  /** Sermon anchor date YYYY-MM-DD (sermon_date or created_at as local date in church TZ). */
  anchorYmd: string;
  /** Today's date YYYY-MM-DD in the same timezone as anchorYmd. */
  todayYmd: string;
};

/** Today's calendar date in IANA `timeZone` as YYYY-MM-DD. */
export function localYmdInTimeZone(now: Date, timeZone: string): string {
  const tz = timeZone?.trim() || 'America/New_York';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

function parseYmdUtc(ymd: string): number {
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) return NaN;
  return Date.UTC(y, m - 1, d);
}

/** Whole calendar days from `fromYmd` to `toYmd` (non-negative when to >= from). */
export function calendarDiffDays(toYmd: string, fromYmd: string): number {
  const a = parseYmdUtc(toYmd);
  const b = parseYmdUtc(fromYmd);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((a - b) / 86400000);
}

export function buildUnlockContext(params: {
  sermonDateYmd: string | null | undefined;
  sermonCreatedAtIso: string;
  churchTimeZone: string;
  now?: Date;
}): UnlockContext {
  const now = params.now ?? new Date();
  const tz = params.churchTimeZone?.trim() || 'America/New_York';
  const todayYmd = localYmdInTimeZone(now, tz);
  const trimmed = params.sermonDateYmd?.trim();
  const anchorYmd =
    trimmed && /^\d{4}-\d{2}-\d{2}$/.test(trimmed)
      ? trimmed
      : localYmdInTimeZone(new Date(params.sermonCreatedAtIso), tz);
  return { anchorYmd, todayYmd };
}

/**
 * Max day number (1–6) the calendar currently opens, inclusive.
 * diff 0 → day 1 only; diff 5 → days 1–6; diff >= 6 → full unlock handled separately.
 */
export function calendarMaxUnlockedDay(anchorYmd: string, todayYmd: string): number {
  const diff = calendarDiffDays(todayYmd, anchorYmd);
  if (diff < 0) return 1;
  if (diff >= 6) return 6;
  return Math.min(6, diff + 1);
}

export function accessibleDevotionalIds(
  devotionals: { id: string; day_number: number }[],
  completedIds: Set<string>,
  ctx?: UnlockContext | null,
): Set<string> {
  const sorted = [...devotionals].sort((a, b) => a.day_number - b.day_number);
  if (sorted.length === 0) return new Set<string>();

  if (!ctx) {
    const accessible = new Set<string>();
    for (const d of sorted) {
      if (completedIds.has(d.id)) {
        accessible.add(d.id);
        continue;
      }
      accessible.add(d.id);
      break;
    }
    return accessible;
  }

  const diff = calendarDiffDays(ctx.todayYmd, ctx.anchorYmd);
  if (diff >= 6) {
    return new Set(sorted.map((d) => d.id));
  }

  const maxDay = calendarMaxUnlockedDay(ctx.anchorYmd, ctx.todayYmd);
  const out = new Set<string>();
  for (const d of sorted) {
    if (completedIds.has(d.id)) out.add(d.id);
    if (d.day_number >= 1 && d.day_number <= maxDay) out.add(d.id);
  }
  return out;
}

/** First incomplete devotional among those currently unlocked (by day order). */
export function nextUnlockedIncompleteDevotional(
  devotionals: { id: string; day_number: number }[],
  completedIds: Set<string>,
  unlockedIds: Set<string>,
): { id: string; day_number: number } | undefined {
  const sorted = [...devotionals].sort((a, b) => a.day_number - b.day_number);
  return sorted.find((d) => !completedIds.has(d.id) && unlockedIds.has(d.id));
}
