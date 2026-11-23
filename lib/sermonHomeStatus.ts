import {
  accessibleDevotionalIds,
  buildUnlockContext,
  nextUnlockedIncompleteDevotional,
} from './devotionalUnlock';
import { tr, uiLocale } from './i18n/ui';

export type SermonHomeRow = {
  id: string;
  title: string;
  sermon_date: string | null;
  created_at: string;
  churches: { name: string; timezone: string } | { name: string; timezone: string }[] | null;
};

export type DevotionalHomeRow = {
  id: string;
  day_number: number;
  sermon_id: string;
  title: string | null;
};

export type NextDevotionalHome = {
  id: string;
  day_number: number;
  title: string | null;
};

export type SermonHomeSummary = {
  sermon: SermonHomeRow;
  devotionals: DevotionalHomeRow[];
  completedIds: Set<string>;
  totalDays: number;
  completedCount: number;
  nextDevotional?: NextDevotionalHome;
  nextIncomplete?: NextDevotionalHome;
  allDone: boolean;
};

export function churchDisplayName(churches: SermonHomeRow['churches']): string | null {
  if (Array.isArray(churches)) return churches[0]?.name?.trim() || null;
  return churches?.name?.trim() || null;
}

function churchTimeZone(churches: SermonHomeRow['churches']): string {
  if (Array.isArray(churches)) return churches[0]?.timezone ?? 'America/New_York';
  return churches?.timezone ?? 'America/New_York';
}

function toNextDevotional(d: DevotionalHomeRow): NextDevotionalHome {
  return { id: d.id, day_number: d.day_number, title: d.title };
}

export function summarizeSermonForHome(
  sermon: SermonHomeRow,
  devotionals: DevotionalHomeRow[],
  completedIds: Set<string>,
): SermonHomeSummary {
  const sorted = [...devotionals].sort((a, b) => a.day_number - b.day_number);
  const totalDays = sorted.length;
  const completedCount = sorted.filter((d) => completedIds.has(d.id)).length;
  const allDone = totalDays > 0 && completedCount === totalDays;

  const unlockCtx = buildUnlockContext({
    sermonDateYmd: sermon.sermon_date,
    sermonCreatedAtIso: sermon.created_at,
    churchTimeZone: churchTimeZone(sermon.churches),
  });

  const unlockedIds =
    totalDays > 0 ? accessibleDevotionalIds(sorted, completedIds, unlockCtx) : new Set<string>();

  const nextUnlockedBasic = nextUnlockedIncompleteDevotional(sorted, completedIds, unlockedIds);
  const nextUnlockedRow = nextUnlockedBasic
    ? sorted.find((d) => d.id === nextUnlockedBasic.id)
    : undefined;
  const nextIncompleteRow = sorted.find((d) => !completedIds.has(d.id));

  return {
    sermon,
    devotionals: sorted,
    completedIds,
    totalDays,
    completedCount,
    nextDevotional: nextUnlockedRow ? toNextDevotional(nextUnlockedRow) : undefined,
    nextIncomplete: nextIncompleteRow ? toNextDevotional(nextIncompleteRow) : undefined,
    allDone,
  };
}

/** Hero is always the newest published sermon; older ones are past. */
export function pickHeroAndPastSummaries(summaries: SermonHomeSummary[]): {
  hero: SermonHomeSummary | null;
  past: SermonHomeSummary[];
} {
  if (summaries.length === 0) return { hero: null, past: [] };
  return {
    hero: summaries[0] ?? null,
    past: summaries.slice(1),
  };
}

export function heroStatusLabel(summary: SermonHomeSummary): {
  label: string;
  tone: 'action' | 'muted';
} {
  if (summary.totalDays === 0) return { label: tr('home.comingSoon'), tone: 'muted' };
  if (summary.allDone) return { label: tr('home.completed'), tone: 'muted' };
  if (summary.nextDevotional) {
    return {
      label: tr('home.dayReady', { day: summary.nextDevotional.day_number }),
      tone: 'action',
    };
  }
  return { label: tr('home.opensOnCalendar'), tone: 'muted' };
}

export function pastSermonProgressLabel(summary: SermonHomeSummary): string {
  if (summary.totalDays === 0) return tr('home.comingSoon');
  if (summary.allDone) return tr('home.completed');
  return tr('home.ofComplete', { done: summary.completedCount, total: summary.totalDays });
}

export function devotionalDisplayTitle(next?: NextDevotionalHome | null): string | null {
  if (!next) return null;
  const trimmed = next.title?.trim();
  if (trimmed && !isPlaceholderTitle(trimmed)) return trimmed;
  return tr('home.dayFallback', { day: next.day_number });
}

/** Short date for graceful title fallbacks, e.g. "Sep 1". */
export function formatSermonDateShort(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    const d = new Date(`${iso}T12:00:00`);
    return d.toLocaleDateString(uiLocale(), { month: 'short', day: 'numeric' });
  } catch {
    return null;
  }
}

/**
 * Avoid showing seed/junk titles like literal "title" in the UI.
 * Prefer a date-based fallback over "Untitled sermon".
 */
export function displaySermonTitle(
  raw: string | null | undefined,
  sermonDate?: string | null,
): string {
  const trimmed = raw?.trim();
  if (trimmed && !isPlaceholderTitle(trimmed)) return trimmed;
  const short = formatSermonDateShort(sermonDate);
  if (short) {
    try {
      const d = new Date(`${sermonDate}T12:00:00`);
      const weekday = d.toLocaleDateString(uiLocale(), { weekday: 'long' });
      return tr('sermon.titleWithDate', { weekday, date: short });
    } catch {
      return tr('sermon.titleDateOnly', { date: short });
    }
  }
  return tr('sermon.titleFallback');
}

function isPlaceholderTitle(title: string): boolean {
  const n = title.trim().toLowerCase();
  return n === 'title' || n === 'untitled' || n === 'n/a' || n === 'null' || n === 'undefined';
}

export function timeOfDayGreeting(now = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return tr('home.goodMorning');
  if (hour < 17) return tr('home.goodAfternoon');
  return tr('home.goodEvening');
}

export function greetingFirstName(
  fullName: string | null | undefined,
  email: string | null | undefined,
  fallback = tr('home.there'),
): string {
  const trimmed = fullName?.trim();
  if (trimmed) {
    const first = trimmed.split(/\s+/)[0];
    if (first) return first;
  }
  const local = email?.split('@')[0]?.trim();
  return local || fallback;
}

export function formatSermonDate(iso: string | null): string | null {
  if (!iso) return null;
  try {
    const d = new Date(`${iso}T12:00:00`);
    return d.toLocaleDateString(uiLocale(), { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
}
