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
  const { error: insertError } = await supabase.from('users').insert({
    id: user.id,
    full_name: typeof fullName === 'string' && fullName.trim() ? fullName.trim() : null,
  });

  if (insertError) return { ok: false, error: insertError.message };
  return { ok: true };
}
