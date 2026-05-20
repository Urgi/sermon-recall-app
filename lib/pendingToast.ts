import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'sermon_recall_pending_toast';

export type PendingToast = {
  message: string;
  variant: 'success' | 'error';
};

export async function queuePendingToast(toast: PendingToast): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(toast));
}

export async function consumePendingToast(): Promise<PendingToast | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  await AsyncStorage.removeItem(STORAGE_KEY);
  try {
    const parsed = JSON.parse(raw) as PendingToast;
    if (typeof parsed.message !== 'string') return null;
    return {
      message: parsed.message,
      variant: parsed.variant === 'error' ? 'error' : 'success',
    };
  } catch {
    return null;
  }
}
