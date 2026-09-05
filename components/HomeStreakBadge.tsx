import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useRecallionTheme } from '../contexts/ThemeContext';
import type { DevotionalStreakStatus } from '../lib/devotionalStreak';
import type { RecallionColors } from '../lib/recallionTheme';

type Props = {
  status: DevotionalStreakStatus | null;
  loading?: boolean;
  onPress?: () => void;
};

export function HomeStreakBadge({ status, loading, onPress }: Props) {
  const { colors } = useRecallionTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (loading) {
    return (
      <View style={styles.wrap} accessibilityLabel="Loading streak">
        <View style={styles.iconShell}>
          <Ionicons name="book-outline" size={16} color={colors.muted} />
        </View>
        <Text style={styles.mutedText}>—</Text>
      </View>
    );
  }

  const count = status?.streakCount ?? 0;
  const active = status?.isActive === true && count > 0;
  const completedToday = status?.completedToday === true;

  const label = active
    ? completedToday
      ? `${count} day${count === 1 ? '' : 's'}`
      : `${count} day${count === 1 ? '' : 's'} · today`
    : 'Start streak';

  const content = (
    <>
      <View style={[styles.iconShell, active && styles.iconShellActive]}>
        <Ionicons name="book" size={16} color={active ? colors.blue : colors.muted} />
      </View>
      <Text style={[styles.count, active ? styles.countActive : styles.countIdle]}>{label}</Text>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.wrap,
          active ? styles.wrapActive : styles.wrapIdle,
          pressed && styles.wrapPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={active ? `${count} day streak, open calendar` : 'Start your streak, open calendar'}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View
      style={[styles.wrap, active ? styles.wrapActive : styles.wrapIdle]}
      accessibilityLabel={active ? `${count} day streak` : 'Start your streak today'}
    >
      {content}
    </View>
  );
}

function createStyles(c: RecallionColors) {
  return StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
      maxWidth: 148,
    },
    wrapPressed: { opacity: 0.85 },
    wrapActive: {
      backgroundColor: c.accentSoft,
      borderColor: c.blue,
    },
    wrapIdle: {
      backgroundColor: c.bgCard,
      borderColor: c.borderSubtle,
    },
    iconShell: {
      width: 26,
      height: 26,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.bgWash,
    },
    iconShellActive: {
      backgroundColor: c.bgCard,
    },
    count: {
      fontSize: 13,
      fontWeight: '700',
      flexShrink: 1,
    },
    countActive: {
      color: c.blue,
    },
    countIdle: {
      color: c.muted,
      fontWeight: '600',
    },
    mutedText: {
      fontSize: 13,
      fontWeight: '600',
      color: c.muted,
    },
  });
}
