import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import type { PendingToast } from '../lib/pendingToast';

const AUTO_DISMISS_MS = 9000;

type Props = {
  toast: PendingToast | null;
  onDismiss: () => void;
};

export function AuthToastBanner({ toast, onDismiss }: Props) {
  const translateY = useRef(new Animated.Value(-120)).current;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!toast) return;
    setVisible(true);
    translateY.setValue(-120);
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      damping: 18,
      stiffness: 180,
    }).start();
    const id = setTimeout(() => {
      onDismiss();
    }, AUTO_DISMISS_MS);
    return () => clearTimeout(id);
  }, [toast, onDismiss, translateY]);

  if (!toast || !visible) return null;

  const isError = toast.variant === 'error';

  return (
    <Animated.View
      style={[styles.wrap, { transform: [{ translateY }] }]}
      pointerEvents="box-none"
    >
      <View style={[styles.banner, isError ? styles.bannerError : styles.bannerSuccess]}>
        <Text style={[styles.message, isError ? styles.messageError : styles.messageSuccess]}>
          {toast.message}
        </Text>
        <Pressable
          onPress={onDismiss}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
        >
          <Text style={styles.dismiss}>×</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingTop: 56,
    paddingHorizontal: 16,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  bannerSuccess: {
    borderColor: 'rgba(52, 211, 153, 0.45)',
    backgroundColor: '#061210',
  },
  bannerError: {
    borderColor: 'rgba(248, 113, 113, 0.45)',
    backgroundColor: '#1a0a0a',
  },
  message: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  messageSuccess: {
    color: '#d1fae5',
  },
  messageError: {
    color: '#fecaca',
  },
  dismiss: {
    fontSize: 22,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.55)',
  },
});
