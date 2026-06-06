import AsyncStorage from '@react-native-async-storage/async-storage';

import { localYmdInTimeZone } from './devotionalUnlock';
import { supabase } from './supabase';

export type DevotionalStreakStatus = {
  streakCount: number;
  isActive: boolean;
  completedToday: boolean;
};

const CELEBRATION_KEY_PREFIX = '@sermon-recall/streak-celebration-shown:';

function parseStatus(raw: unknown): DevotionalStreakStatus {
  const o = raw as Record<string, unknown> | null;
  return {
    streakCount: typeof o?.streak_count === 'number' ? o.streak_count : 0,
    isActive: o?.is_active === true,
    completedToday: o?.completed_today === true,
  };
}

export async function fetchDevotionalStreakStatus(): Promise<DevotionalStreakStatus | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('get_devotional_streak_status');
  if (error) {
    console.warn('[streak]', error.message);
    return null;
  }
  return parseStatus(data);
}

export async function shouldShowStreakCelebration(
  status: DevotionalStreakStatus,
  timeZone = 'America/New_York',
): Promise<boolean> {
  if (!status.isActive || status.streakCount < 1) return false;
  const ymd = localYmdInTimeZone(new Date(), timeZone);
  const key = `${CELEBRATION_KEY_PREFIX}${ymd}`;
  const shown = await AsyncStorage.getItem(key);
  return shown !== '1';
}

export async function markStreakCelebrationShown(timeZone = 'America/New_York'): Promise<void> {
  const ymd = localYmdInTimeZone(new Date(), timeZone);
  await AsyncStorage.setItem(`${CELEBRATION_KEY_PREFIX}${ymd}`, '1');
}
