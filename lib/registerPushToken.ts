import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { requireSupabase } from './supabase';

export type PushRegistrationResult =
  | { status: 'registered' }
  | { status: 'simulator' }
  | { status: 'denied' }
  | { status: 'missing_project_id' }
  | { status: 'error'; message: string };

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Default',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/**
 * Requests notification permission, resolves an Expo push token, and upserts `user_push_tokens`.
 * Safe to call repeatedly (e.g. on each app launch).
 */
export async function registerExpoPushTokenForCurrentUser(
  userId: string,
): Promise<PushRegistrationResult> {
  if (!Device.isDevice) return { status: 'simulator' };

  await ensureAndroidChannel();

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return { status: 'denied' };

  const projectId =
    (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas
      ?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId || typeof projectId !== 'string') {
    console.warn('[push] Missing EAS projectId in app config');
    return { status: 'missing_project_id' };
  }

  const tokenRes = await Notifications.getExpoPushTokenAsync({ projectId });
  const expoPushToken = tokenRes.data;
  if (!expoPushToken) return { status: 'error', message: 'No Expo push token returned.' };

  const supabase = requireSupabase();
  const { error } = await supabase.from('user_push_tokens').upsert(
    {
      user_id: userId,
      expo_push_token: expoPushToken,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );

  if (error) {
    console.warn('[push] upsert token', error.message);
    return { status: 'error', message: error.message };
  }

  return { status: 'registered' };
}

export function pushRegistrationHint(result: PushRegistrationResult): string | null {
  switch (result.status) {
    case 'denied':
      return 'Reminders are saved, but notifications are off for Sermon Recall. Enable them in your phone Settings → Notifications.';
    case 'simulator':
      return 'Push notifications only work on a physical device, not the simulator.';
    case 'missing_project_id':
      return 'This build is missing push configuration. Reinstall from TestFlight or the App Store.';
    case 'error':
      return `Could not register for push notifications: ${result.message}`;
    default:
      return null;
  }
}
