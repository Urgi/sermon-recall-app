import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { requireSupabase } from './supabase';

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
 * Safe to call repeatedly (e.g. on each app launch). No-ops on simulator / without permission.
 */
export async function registerExpoPushTokenForCurrentUser(userId: string): Promise<void> {
  if (!Device.isDevice) return;

  await ensureAndroidChannel();

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return;

  const projectId =
    (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas
      ?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId || typeof projectId !== 'string') {
    console.warn('[push] Missing EAS projectId in app config');
    return;
  }

  const tokenRes = await Notifications.getExpoPushTokenAsync({ projectId });
  const expoPushToken = tokenRes.data;
  if (!expoPushToken) return;

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
  }
}
