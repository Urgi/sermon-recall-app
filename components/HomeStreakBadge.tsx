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
        <Ionicons name="flame-outline" size={15} color={colors.muted} />
        <Text style={styles.mutedText}>—</Text>
      </View>
    );
  }

  const count = status?.streakCount ?? 0;
  const active = status?.isActive === true && count > 0;
  const completedToday = status?.completedToday === true;

  const label = active
    ? completedToday
      ? `${count}-day streak`
      : `${count}-day streak · today`
    : 'Start streak';

  const a11y = active
    ? `${count}-day streak${completedToday ? '' : ', keep it going today'}`
    : 'Start your streak today';

  const content = (
    <>
      <Ionicons
        name={active ? 'flame' : 'flame-outline'}
        size={15}
        color={active ? colors.blue : colors.muted}
      />
      <Text style={[styles.count, active ? styles.countActive : styles.countIdle]} numberOfLines={1}>
        {label}
      </Text>
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
        accessibilityLabel={`${a11y}, open calendar`}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View
      style={[styles.wrap, active ? styles.wrapActive : styles.wrapIdle]}
      accessibilityLabel={a11y}
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
      paddingVertical: 7,
      borderRadius: 999,
      borderWidth: StyleSheet.hairlineWidth,
      maxWidth: 168,
    },
    wrapPressed: { opacity: 0.85 },
    wrapActive: {
      backgroundColor: c.accentSoft,
      borderColor: c.borderSubtle,
    },
    wrapIdle: {
      backgroundColor: c.bgCard,
      borderColor: c.borderSubtle,
    },
    count: {
      fontSize: 13,
      fontWeight: '700',
      flexShrink: 1,
    },
    countActive: {
      color: c.navy,
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
