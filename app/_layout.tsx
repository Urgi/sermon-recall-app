import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';
import * as Notifications from 'expo-notifications';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { GlobalAuthToast } from '../components/GlobalAuthToast';
import { AuthProvider } from '../contexts/AuthContext';
import { ThemeProvider, useRecallionTheme } from '../contexts/ThemeContext';
import { useNotificationRouting } from '../lib/notificationRouting';

function RootStack() {
  const { colors } = useRecallionTheme();
  useNotificationRouting();

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    void NavigationBar.setBackgroundColorAsync('#000000');
    void NavigationBar.setButtonStyleAsync('light');
  }, []);

  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener(() => {
      // Foreground: handler in registerPushToken shows banner; routing on tap only.
    });
    return () => sub.remove();
  }, []);

  return (
    <>
      <StatusBar style={colors.statusBarStyle} />
      <GlobalAuthToast />
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
