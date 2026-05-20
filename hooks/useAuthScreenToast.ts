import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { toastFromAuthParams } from '../lib/authToastMessages';
import { consumePendingToast, type PendingToast } from '../lib/pendingToast';

export function useAuthScreenToast() {
  const params = useLocalSearchParams();
  const [toast, setToast] = useState<PendingToast | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const stored = await consumePendingToast();
      if (cancelled) return;
      if (stored) {
        setToast(stored);
        return;
      }
      const fromParams = toastFromAuthParams(params);
      if (fromParams) setToast(fromParams);
    })();
    return () => {
      cancelled = true;
    };
  }, [params.confirmed, params.email_sent, params.error, params]);

  const dismissToast = useCallback(() => setToast(null), []);

  return { toast, dismissToast };
}
