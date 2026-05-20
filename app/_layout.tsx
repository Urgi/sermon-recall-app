import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '../contexts/AuthContext';
import { ThemeProvider, useRecallionTheme } from '../contexts/ThemeContext';
import { useNotificationRouting } from '../lib/notificationRouting';

type PushData = {
  kind?: string;
  sermonId?: string;
};

function RootStack() {
  const { colors } = useRecallionTheme();
  useNotificationRouting();

  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener(() => {
      // Foreground: handler in registerPushToken shows banner; routing on tap only.
    });
    return () => sub.remove();
  }, []);

  return (
    <>
      <StatusBar style={colors.statusBarStyle} />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <RootStack />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
