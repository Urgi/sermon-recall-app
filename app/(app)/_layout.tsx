import { Stack } from 'expo-router';

import { useRecallionTheme } from '../../contexts/ThemeContext';

export default function AppLayout() {
  const { colors } = useRecallionTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bgPage },
        animation: 'fade',
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="sermon/[id]" />
      <Stack.Screen name="devotional/[id]" />
      <Stack.Screen name="announcement/[id]" />
      <Stack.Screen name="join-church" />
    </Stack>
  );
}
