import { requireSupabase } from './supabase';

/** IANA timezone from the device, e.g. "America/Los_Angeles". */
export function getDeviceTimeZone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone?.trim();
    if (tz) return tz;
  } catch {
    /* fall through */
  }
  return 'America/New_York';
}

/**
 * Upserts the signed-in user's device timezone when it changed.
 * Safe to call on launch / foreground; no-ops when unchanged.
 */
export async function syncUserDeviceTimeZone(userId: string): Promise<void> {
  const tz = getDeviceTimeZone();
  try {
    const supabase = requireSupabase();
    const { data } = await supabase
      .from('users')
      .select('timezone')
      .eq('id', userId)
      .maybeSingle();
    if ((data as { timezone?: string | null } | null)?.timezone === tz) return;
    const { error } = await supabase.from('users').update({ timezone: tz }).eq('id', userId);
    if (error) console.warn('[timezone] sync', error.message);
  } catch (e) {
    console.warn('[timezone] sync', e instanceof Error ? e.message : e);
  }
}
