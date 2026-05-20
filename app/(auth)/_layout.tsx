import { Stack } from 'expo-router';
import { View } from 'react-native';

import { AuthToastBanner } from '../../components/AuthToastBanner';
import { useAuthScreenToast } from '../../hooks/useAuthScreenToast';

function AuthStackWithToast() {
  const { toast, dismissToast } = useAuthScreenToast();

  return (
    <View style={{ flex: 1 }}>
      <AuthToastBanner toast={toast} onDismiss={dismissToast} />
      <Stack screenOptions={{ headerShown: false }} />
    </View>
  );
}

export default function AuthLayout() {
  return <AuthStackWithToast />;
}
