import { supabase } from './supabase';

/** Records a devotional open for pastor analytics (no-op if Supabase missing). */
export async function touchDevotionalOpen(devotionalId: string): Promise<void> {
  if (!supabase || !devotionalId) return;
  const { error } = await supabase.rpc('touch_devotional_open', {
    p_devotional_id: devotionalId,
  });
  if (error) {
    console.warn('[touchDevotionalOpen]', error.message);
  }
}
