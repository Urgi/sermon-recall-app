import { Stack } from 'expo-router';

import { useRecallionTheme } from '../../contexts/ThemeContext';
import { duration } from '../../lib/motion';

/** Auth toasts are shown app-wide via GlobalAuthToast in the root layout. */
export default function AuthLayout() {
  const { colors } = useRecallionTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bgPage },
        animation: 'fade',
        animationDuration: duration.screen,
      }}
    />
  );
}
