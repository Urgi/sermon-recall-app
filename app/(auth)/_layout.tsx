import { Stack } from 'expo-router';

/** Auth toasts are shown app-wide via GlobalAuthToast in the root layout. */
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
