import AsyncStorage from '@react-native-async-storage/async-storage';

import { localYmdInTimeZone } from './devotionalUnlock';
import { supabase } from './supabase';

export type DevotionalStreakStatus = {
  streakCount: number;
  isActive: boolean;
  completedToday: boolean;
};

const CELEBRATION_KEY_PREFIX = '@sermon-recall/streak-celebration-shown:';

export async function fetchChurchTimeZone(churchId: string): Promise<string> {
  if (!supabase) return 'America/New_York';
  const { data, error } = await supabase
    .from('churches')
    .select('timezone')
    .eq('id', churchId)
    .maybeSingle();
  if (error) {
    console.warn('[streak] church timezone', error.message);
    return 'America/New_York';
  }
  return data?.timezone?.trim() || 'America/New_York';
}

function celebrationStorageKey(timeZone: string): string {
  const ymd = localYmdInTimeZone(new Date(), timeZone);
  return `${CELEBRATION_KEY_PREFIX}${ymd}`;
}

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
  const shown = await AsyncStorage.getItem(celebrationStorageKey(timeZone));
  return shown !== '1';
}

/** Mark today's celebration as shown and return whether this call won the once-per-day slot. */
export async function claimStreakCelebrationForToday(
  status: DevotionalStreakStatus,
  timeZone = 'America/New_York',
): Promise<boolean> {
  if (!status.isActive || status.streakCount < 1) return false;
  const key = celebrationStorageKey(timeZone);
  const shown = await AsyncStorage.getItem(key);
  if (shown === '1') return false;
  await AsyncStorage.setItem(key, '1');
  return true;
}

export async function markStreakCelebrationShown(timeZone = 'America/New_York'): Promise<void> {
  await AsyncStorage.setItem(celebrationStorageKey(timeZone), '1');
}
