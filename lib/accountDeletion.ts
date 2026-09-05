import type { Session } from '@supabase/supabase-js';

import {
  parseDeletionPreview,
  type AccountDeletionPreview,
} from './accountDeletionTypes';
import { supabase } from './supabase';

export type { AccountDeletionPreview } from './accountDeletionTypes';
export {
  emailsMatchForDeletion,
  normalizeAccountEmail,
  parseDeletionPreview,
} from './accountDeletionTypes';

export async function fetchDeletionPreview(): Promise<{
  preview: AccountDeletionPreview | null;
  email: string | null;
  error: string | null;
}> {
  if (!supabase) {
    return { preview: null, email: null, error: 'App is not configured.' };
  }

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { preview: null, email: null, error: 'Sign in again to manage your account.' };
    }

    const { data, error } = await supabase.rpc('get_account_deletion_preview');
    if (error) {
      return {
        preview: null,
        email: user.email ?? null,
        error: error.message || 'Could not load account details.',
      };
    }

    const preview = parseDeletionPreview(data);
    if (!preview) {
      return {
        preview: null,
        email: user.email ?? null,
        error: 'Could not load account details.',
      };
    }

    return { preview, email: user.email ?? null, error: null };
  } catch (e) {
    return {
      preview: null,
      email: null,
      error: e instanceof Error ? e.message : 'Could not load account details.',
    };
  }
}

/**
 * 1) App data via Postgres RPC
 * 2) Auth user via Edge Function (service role stays on Supabase)
 */
export async function deleteAccount(
  _session: Session,
  confirmChurchDeletion: boolean,
  confirmEmail: string,
): Promise<{ error: string | null }> {
  if (!supabase) {
    return { error: 'App is not configured.' };
  }

  try {
    const { error: rpcError } = await supabase.rpc('delete_my_account', {
      p_confirm_church_deletion: confirmChurchDeletion,
    });

    if (rpcError) {
      const msg = rpcError.message ?? '';
      if (msg.includes('church_deletion_requires_confirmation')) {
        return { error: 'You must confirm that the church and member access will be removed.' };
      }
      if (msg.includes('not_authenticated')) {
        return { error: 'Sign in again to delete your account.' };
      }
      return { error: msg || 'Could not delete account data.' };
    }

    const { data, error: fnError } = await supabase.functions.invoke('delete-auth-user', {
      body: { confirmEmail: confirmEmail.trim() },
    });

    const payload = (data ?? null) as { error?: string; ok?: boolean } | null;
    if (payload && typeof payload.error === 'string' && payload.error.trim()) {
      return { error: payload.error };
    }

    if (fnError) {
      return {
        error:
          fnError.message ||
          'Account data was removed, but sign-in cleanup failed. Contact support.',
      };
    }

    return { error: null };
  } catch (e) {
    return {
      error:
        e instanceof Error
          ? e.message
          : 'Could not delete account. Check your connection and try again.',
    };
  }
}
