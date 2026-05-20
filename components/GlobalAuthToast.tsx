import { useGlobalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { toastFromAuthParams } from '../lib/authToastMessages';
import { consumePendingToast, type PendingToast } from '../lib/pendingToast';
import { AuthToastBanner } from './AuthToastBanner';

function param(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

/**
 * Auth toasts on every route (login, register, auth/callback, etc.).
 * Bottom placement with safe-area — visible on iPhone 16 and other notched devices.
 */
export function GlobalAuthToast() {
  const searchParams = useGlobalSearchParams();
  const [toast, setToast] = useState<PendingToast | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const fromParams = toastFromAuthParams({
        email_sent: param(searchParams.email_sent),
        confirmed: param(searchParams.confirmed),
        error: param(searchParams.error),
      });
      if (cancelled) return;
      if (fromParams) {
        setToast(fromParams);
        return;
      }
      const stored = await consumePendingToast();
      if (cancelled) return;
      if (stored) setToast(stored);
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams.email_sent, searchParams.confirmed, searchParams.error]);

  return <AuthToastBanner toast={toast} onDismiss={() => setToast(null)} />;
}
