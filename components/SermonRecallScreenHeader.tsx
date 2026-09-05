import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useRecallionTheme } from '../contexts/ThemeContext';
import type { RecallionColors } from '../lib/recallionTheme';

type Props = {
  /** Label after the arrow, e.g. "Back" or a truncated sermon title. */
  backLabel?: string;
  /** Right-side meta, e.g. "Day 3 of 6". */
  trailing?: string | null;
  onBack?: () => void;
};

/** Compact stack header — back + optional day/progress label (no brand wordmark). */
export function SermonRecallScreenHeader({
  backLabel = 'Back',
  trailing,
  onBack,
}: Props) {
  const { colors } = useRecallionTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={onBack ?? (() => router.back())}
        hitSlop={12}
        style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={`Go back${backLabel !== 'Back' ? `: ${backLabel}` : ''}`}
      >
        <Text style={styles.backArrow}>←</Text>
        <Text style={styles.backLabel} numberOfLines={1}>
          {backLabel}
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
      paddingHorizontal: 16,
      paddingTop: 6,
      paddingBottom: 10,
    },
    backBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexShrink: 1,
      maxWidth: '62%',
      paddingVertical: 4,
    },
    backArrow: {
      fontSize: 17,
      color: c.blue,
      fontWeight: '600',
    },
    backLabel: {
      fontSize: 15,
      color: c.navyMid,
      fontWeight: '500',
      flexShrink: 1,
    },
    trailing: {
      fontSize: 13,
      fontWeight: '600',
      color: c.muted,
      flexShrink: 0,
    },
    trailingSpacer: { width: 8 },
    pressed: { opacity: 0.75 },
  });
}
