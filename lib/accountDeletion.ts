import type { Session } from '@supabase/supabase-js';

import {
  parseDeletionPreview,
  type AccountDeletionPreview,
} from './accountDeletionTypes';
import { tr } from './i18n/ui';
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
    return { preview: null, email: null, error: tr('err.notConfigured') };
  }

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { preview: null, email: null, error: tr('err.signInAgain') };
    }

    const { data, error } = await supabase.rpc('get_account_deletion_preview');
    if (error) {
      return {
        preview: null,
        email: user.email ?? null,
        error: tr('err.accountLoad'),
      };
    }

    const preview = parseDeletionPreview(data);
    if (!preview) {
      return {
        preview: null,
        email: user.email ?? null,
        error: tr('err.accountLoad'),
      };
    }

    return { preview, email: user.email ?? null, error: null };
  } catch (e) {
    return {
      preview: null,
      email: null,
      error: tr('err.accountLoad'),
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
    return { error: tr('err.notConfigured') };
  }

  try {
    const { error: rpcError } = await supabase.rpc('delete_my_account', {
      p_confirm_church_deletion: confirmChurchDeletion,
    });

    if (rpcError) {
      const msg = rpcError.message ?? '';
      if (msg.includes('church_deletion_requires_confirmation')) {
        return { error: tr('err.deleteConfirmChurch') };
      }
      if (msg.includes('not_authenticated')) {
        return { error: tr('err.signInAgain') };
      }
      return { error: tr('err.deleteFailed') };
    }

    const { data, error: fnError } = await supabase.functions.invoke('delete-auth-user', {
      body: { confirmEmail: confirmEmail.trim() },
    });

    const payload = (data ?? null) as { error?: string; ok?: boolean } | null;
    if (payload && typeof payload.error === 'string' && payload.error.trim()) {
      return { error: tr('err.deleteFailed') };
    }

    if (fnError) {
      return { error: tr('err.deleteCleanup') };
    }

    return { error: null };
  } catch (e) {
    return { error: tr('err.deleteFailed') };
  }
}
