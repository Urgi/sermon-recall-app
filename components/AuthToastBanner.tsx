import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useI18n } from '../contexts/I18nContext';
import { duration, easing, useReducedMotion } from '../lib/motion';
import type { PendingToast } from '../lib/pendingToast';

const AUTO_DISMISS_SUCCESS_MS = 4500;
const AUTO_DISMISS_ERROR_MS = 9000;
const HIDDEN_OFFSET = 24;

type Props = {
  toast: PendingToast | null;
  onDismiss: () => void;
};

export function AuthToastBanner({ toast, onDismiss }: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(0)).current;
  /** Last toast shown — kept while the exit animation plays after `toast` clears. */
  const [shown, setShown] = useState<PendingToast | null>(toast);

  useEffect(() => {
    if (toast) {
      setShown(toast);
      progress.setValue(0);
      const enter = Animated.timing(progress, {
        toValue: 1,
        duration: duration.enter,
        easing: easing.enter,
        useNativeDriver: true,
      });
      enter.start();
      const dismissMs =
        toast.variant === 'error' ? AUTO_DISMISS_ERROR_MS : AUTO_DISMISS_SUCCESS_MS;
      const id = setTimeout(onDismiss, dismissMs);
      return () => {
        enter.stop();
        clearTimeout(id);
      };
    }
    const exit = Animated.timing(progress, {
      toValue: 0,
      duration: duration.base - 40,
      easing: easing.exit,
      useNativeDriver: true,
    });
    exit.start(({ finished }) => {
      if (finished) setShown(null);
    });
    return () => exit.stop();
  }, [toast, onDismiss, progress]);

  if (!shown) return null;

  const isError = shown.variant === 'error';
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [reduced ? 0 : HIDDEN_OFFSET, 0],
  });

  return (
    <Animated.View
      style={[
        styles.wrap,
        {
          bottom: Math.max(insets.bottom + 12, 28),
          opacity: progress,
          transform: [{ translateY }],
        },
      ]}
      pointerEvents="box-none"
    >
      <View
        style={[styles.banner, isError ? styles.bannerError : styles.bannerSuccess]}
        accessibilityRole="alert"
        accessibilityLiveRegion={isError ? 'assertive' : 'polite'}
      >
        <Ionicons
          name={isError ? 'alert-circle' : 'checkmark-circle'}
          size={20}
          color={isError ? '#fca5a5' : '#6ee7b7'}
          style={styles.icon}
        />
        <Text style={[styles.message, isError ? styles.messageError : styles.messageSuccess]}>
          {shown.message}
        </Text>
        <Pressable
          onPress={onDismiss}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('common.dismiss')}
          style={styles.dismissBtn}
        >
          <Ionicons name="close" size={18} color="rgba(255,255,255,0.7)" />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 100,
    paddingHorizontal: 16,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 10,
    minHeight: 52,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  bannerSuccess: {
    borderColor: 'rgba(52, 211, 153, 0.45)',
    backgroundColor: '#07140f',
  },
  bannerError: {
    borderColor: 'rgba(248, 113, 113, 0.6)',
    backgroundColor: '#2a0b0b',
  },
  icon: { flexShrink: 0 },
  message: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '500',
  },
  messageSuccess: { color: '#d1fae5' },
  messageError: { color: '#fff1f2' },
  dismissBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
