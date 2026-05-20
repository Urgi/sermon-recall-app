import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';

type PushData = {
  kind?: string;
  sermonId?: string;
  dayNumber?: number;
  churchId?: string;
  broadcastId?: string;
};

function routeFromNotificationData(data: PushData | undefined): void {
  if (!data?.kind) return;

  if (data.kind === 'devotional_reminder' && data.sermonId) {
    if (typeof data.dayNumber === 'number') {
      router.push(`/sermon/${data.sermonId}`);
    } else {
      router.push(`/sermon/${data.sermonId}`);
    }
    return;
  }

  if (data.kind === 'new_devotionals' && data.sermonId) {
    router.push(`/sermon/${data.sermonId}`);
    return;
  }

  if (data.kind === 'pastor_broadcast') {
    if (typeof data.broadcastId === 'string' && data.broadcastId.length > 0) {
      router.push(`/announcement/${data.broadcastId}`);
    } else {
      router.push('/home');
    }
  }
}

/**
 * Registers notification tap handlers for deep linking into sermon/devotional flows.
 */
export function useNotificationRouting(): void {
  const handledInitial = useRef(false);

  useEffect(() => {
    const subResponse = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as PushData | undefined;
      routeFromNotificationData(data);
    });

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (handledInitial.current || !response) return;
      handledInitial.current = true;
      const data = response.notification.request.content.data as PushData | undefined;
      routeFromNotificationData(data);
    });

    return () => {
      subResponse.remove();
    };
  }, []);
}
