import { createClient } from '@supabase/supabase-js';

// Prefer EXPO_PUBLIC_* (Expo). Accept NEXT_PUBLIC_* if someone copied `site/.env` by mistake.
const url =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = url && anon ? createClient(url, anon) : null;

export function requireSupabase() {
  if (!supabase) {
    throw new Error(
      'Configure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in mobile/.env',
    );
  }
  return supabase;
}
