import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useI18n } from '../contexts/I18nContext';
import { useRecallionTheme } from '../contexts/ThemeContext';
import { pressedOpacity } from '../lib/motion';
import type { RecallionColors } from '../lib/recallionTheme';

type Props = {
  /** Label after the arrow, e.g. "Back" or a truncated sermon title. */
  backLabel?: string;
  /** Right-side meta, e.g. "Day 3 of 6". */
  trailing?: string | null;
  onBack?: () => void;
};

/** Compact stack header — back + optional day/progress label (no brand wordmark). */
export function SermonRecallScreenHeader({ backLabel, trailing, onBack }: Props) {
  const { colors } = useRecallionTheme();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const label = backLabel ?? t('common.back');

  function goBack() {
    if (onBack) onBack();
    else if (router.canGoBack()) router.back();
    else router.replace('/home');
  }

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={goBack}
        hitSlop={8}
        style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={backLabel ? `${t('common.back')}: ${backLabel}` : t('common.back')}
      >
        <Ionicons name="chevron-back" size={22} color={colors.blue} />
        <Text style={styles.backLabel} numberOfLines={1}>
          {label}
        </Text>
      </Pressable>
      {trailing ? (
        <Text style={styles.trailing} numberOfLines={1}>
          {trailing}
        </Text>
      ) : (
        <View style={styles.trailingSpacer} />
      )}
    </View>
  );
}

function createStyles(c: RecallionColors) {
  return StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingHorizontal: 12,
      paddingTop: 2,
      paddingBottom: 6,
    },
    backBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      flexShrink: 1,
      maxWidth: '68%',
      minHeight: 44,
      paddingRight: 8,
    },
    backLabel: {
      fontSize: 15,
      color: c.blue,
      fontWeight: '600',
      flexShrink: 1,
    },
    trailing: {
      fontSize: 13,
      fontWeight: '600',
      color: c.muted,
      flexShrink: 0,
    },
    trailingSpacer: { width: 8 },
    pressed: { opacity: pressedOpacity },
  });
}
