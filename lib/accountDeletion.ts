import type { Session } from '@supabase/supabase-js';

import {
  parseDeletionPreview,
  type AccountDeletionPreview,
} from './accountDeletionTypes';

export type { AccountDeletionPreview } from './accountDeletionTypes';
export { DELETE_CONFIRM_PHRASE, parseDeletionPreview } from './accountDeletionTypes';

const DEFAULT_SITE_URL = 'https://sermonrecall.com';

export function getSiteApiBase(): string {
  const url =
    process.env.EXPO_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    DEFAULT_SITE_URL;
  return url.replace(/\/$/, '');
}

export async function fetchDeletionPreview(
  accessToken: string,
): Promise<{ preview: AccountDeletionPreview | null; error: string | null }> {
  try {
    const res = await fetch(`${getSiteApiBase()}/api/account/deletion-preview`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const json = (await res.json()) as { preview?: unknown; error?: string };
    if (!res.ok) {
      return { preview: null, error: json.error ?? 'Could not load account details.' };
    }
    return { preview: parseDeletionPreview(json.preview), error: null };
  } catch {
    return { preview: null, error: 'Network error. Check your connection.' };
  }
}

export async function deleteAccountViaSiteApi(
  session: Session,
  confirmChurchDeletion: boolean,
): Promise<{ error: string | null }> {
  try {
    const res = await fetch(`${getSiteApiBase()}/api/account/delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ confirmChurchDeletion }),
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) {
      return { error: json.error ?? 'Could not delete account.' };
    }
    return { error: null };
  } catch {
    return { error: 'Network error. Try again.' };
  }
}
