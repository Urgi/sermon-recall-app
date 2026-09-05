import type { SupabaseClient, User } from '@supabase/supabase-js';

export async function ensurePublicUserProfile(
  supabase: SupabaseClient,
  user: User,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: existing, error: selectError } = await supabase
    .from('users')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (selectError) return { ok: false, error: selectError.message };
  if (existing) return { ok: true };

  const fullName = user.user_metadata?.full_name;
  const preferredLanguage = user.user_metadata?.preferred_language;
  const rawHour = user.user_metadata?.devotional_notify_hour;
  const notifyHour =
    typeof rawHour === 'number' && rawHour >= 0 && rawHour <= 23
      ? rawHour
      : typeof rawHour === 'string' && /^\d+$/.test(rawHour)
        ? Number(rawHour)
        : null;
  const validHour =
    typeof notifyHour === 'number' && notifyHour >= 0 && notifyHour <= 23 ? notifyHour : null;
  const notifyEnabledMeta = user.user_metadata?.devotional_notify_enabled;
  const promptDoneMeta = user.user_metadata?.devotional_notify_prompt_done;

  const { error: insertError } = await supabase.from('users').insert({
    id: user.id,
    full_name: typeof fullName === 'string' && fullName.trim() ? fullName.trim() : null,
    preferred_language:
      typeof preferredLanguage === 'string' && ['en', 'es', 'fr'].includes(preferredLanguage)
        ? preferredLanguage
        : 'en',
    ...(validHour != null
      ? {
          devotional_notify_hour: validHour,
          devotional_notify_enabled: notifyEnabledMeta !== false,
          devotional_notify_prompt_done: promptDoneMeta !== false,
        }
      : {}),
  });

  if (insertError) return { ok: false, error: insertError.message };
  return { ok: true };
}
