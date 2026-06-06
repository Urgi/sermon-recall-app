import { localYmdInTimeZone } from './devotionalUnlock';
import { supabase } from './supabase';

function parseYmd(ymd: string): number {
  const [y, m, d] = ymd.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function formatYmdFromUtcMs(ms: number): string {
  const dt = new Date(ms);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dt.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDaysYmd(ymd: string, days: number): string {
  return formatYmdFromUtcMs(parseYmd(ymd) + days * 86400000);
}

export function ymdWeekdaySundayZero(ymd: string, timeZone: string): number {
  const noon = new Date(`${ymd}T12:00:00`);
  const wd = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(noon);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[wd.slice(0, 3)] ?? 0;
}

export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

export type CalendarCell = {
  ymd: string;
  day: number;
  inMonth: boolean;
};

export function buildMonthGrid(
  year: number,
  monthIndex: number,
  timeZone: string,
): CalendarCell[] {
  const month = monthIndex + 1;
  const firstYmd = `${year}-${String(month).padStart(2, '0')}-01`;
  const leading = ymdWeekdaySundayZero(firstYmd, timeZone);
  const length = daysInMonth(year, monthIndex);

  const cells: CalendarCell[] = [];

  for (let i = leading - 1; i >= 0; i -= 1) {
    const ymd = addDaysYmd(firstYmd, -(i + 1));
    const day = Number(ymd.split('-')[2]);
    cells.push({ ymd, day, inMonth: false });
  }

  for (let d = 0; d < length; d += 1) {
    const ymd = addDaysYmd(firstYmd, d);
    cells.push({ ymd, day: d + 1, inMonth: true });
  }

  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1]?.ymd ?? firstYmd;
    const ymd = addDaysYmd(last, 1);
    const day = Number(ymd.split('-')[2]);
    cells.push({ ymd, day, inMonth: false });
  }

  return cells;
}

export function monthLabel(year: number, monthIndex: number): string {
  const d = new Date(Date.UTC(year, monthIndex, 1, 12));
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export function completedAtToYmd(iso: string, timeZone: string): string {
  return localYmdInTimeZone(new Date(iso), timeZone);
}

export async function fetchDevotionalCompletionDates(
  userId: string,
  timeZone: string,
): Promise<Set<string>> {
  if (!supabase) return new Set();

  const { data, error } = await supabase
    .from('user_progress')
    .select('completed_at')
    .eq('user_id', userId)
    .not('completed_at', 'is', null);

  if (error) {
    console.warn('[streak-calendar]', error.message);
    return new Set();
  }

  const dates = new Set<string>();
  for (const row of data ?? []) {
    const iso = row.completed_at as string | null;
    if (iso) dates.add(completedAtToYmd(iso, timeZone));
  }
  return dates;
}

export function ymdToMonthIndex(ymd: string): { year: number; monthIndex: number } {
  const [y, m] = ymd.split('-').map(Number);
  return { year: y, monthIndex: m - 1 };
}

export function shiftMonth(year: number, monthIndex: number, delta: number): {
  year: number;
  monthIndex: number;
} {
  const d = new Date(Date.UTC(year, monthIndex + delta, 1));
  return { year: d.getUTCFullYear(), monthIndex: d.getUTCMonth() };
}
