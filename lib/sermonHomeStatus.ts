import {
  accessibleDevotionalIds,
  buildUnlockContext,
  nextUnlockedIncompleteDevotional,
} from './devotionalUnlock';

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
  if (summary.totalDays === 0) return { label: 'Coming soon', tone: 'muted' };
  if (summary.allDone) return { label: 'Completed', tone: 'muted' };
  if (summary.nextDevotional) {
    return {
      label: `Day ${summary.nextDevotional.day_number} ready`,
      tone: 'action',
    };
  }
  return { label: 'Opens on the calendar', tone: 'muted' };
}

export function pastSermonProgressLabel(summary: SermonHomeSummary): string {
  if (summary.totalDays === 0) return 'Coming soon';
  if (summary.allDone) return 'Completed';
  return `${summary.completedCount} of ${summary.totalDays} complete`;
}

export function devotionalDisplayTitle(next?: NextDevotionalHome | null): string | null {
  if (!next) return null;
  const trimmed = next.title?.trim();
  if (trimmed && !isPlaceholderTitle(trimmed)) return trimmed;
  return `Day ${next.day_number}`;
}

/** Avoid showing seed/junk titles like literal "title" in the UI. */
export function displaySermonTitle(raw: string | null | undefined): string {
  const trimmed = raw?.trim();
  if (!trimmed || isPlaceholderTitle(trimmed)) return 'Untitled sermon';
  return trimmed;
}

function isPlaceholderTitle(title: string): boolean {
  const n = title.trim().toLowerCase();
  return n === 'title' || n === 'untitled' || n === 'n/a' || n === 'null' || n === 'undefined';
}

export function timeOfDayGreeting(now = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function greetingFirstName(
  fullName: string | null | undefined,
  email: string | null | undefined,
): string {
  const trimmed = fullName?.trim();
  if (trimmed) {
    const first = trimmed.split(/\s+/)[0];
    if (first) return first;
  }
  const local = email?.split('@')[0]?.trim();
  return local || 'there';
}

export function formatSermonDate(iso: string | null): string | null {
  if (!iso) return null;
  try {
    const d = new Date(`${iso}T12:00:00`);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
}
