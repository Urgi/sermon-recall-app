import { Stack } from 'expo-router';

import { useRecallionTheme } from '../../contexts/ThemeContext';
import { duration } from '../../lib/motion';

export default function AppLayout() {
  const { colors } = useRecallionTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bgPage },
        animation: 'fade',
        animationDuration: duration.screen,
      }}
    >
      <Stack.Screen name="(tabs)" />
      {/* Drill-down screens use the native push so swipe-back works. */}
      <Stack.Screen name="sermon/[id]" options={{ animation: 'default' }} />
      <Stack.Screen name="devotional/[id]" options={{ animation: 'default' }} />
      <Stack.Screen name="announcement/[id]" options={{ animation: 'default' }} />
      <Stack.Screen name="join-church" />
    </Stack>
  );
}
