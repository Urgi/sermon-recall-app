import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useI18n } from '../contexts/I18nContext';
import { useRecallionTheme } from '../contexts/ThemeContext';
import type { DevotionalStreakStatus } from '../lib/devotionalStreak';
import { pressedOpacity } from '../lib/motion';
import type { RecallionColors } from '../lib/recallionTheme';

type Props = {
  status: DevotionalStreakStatus | null;
  loading?: boolean;
  onPress?: () => void;
};

export function HomeStreakBadge({ status, loading, onPress }: Props) {
  const { colors } = useRecallionTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { t } = useI18n();

  if (loading) {
    return (
      <View style={[styles.wrap, styles.wrapIdle]} accessibilityLabel={t('streak.loading')}>
        <Ionicons name="flame-outline" size={15} color={colors.muted} />
        <Text style={styles.mutedText}>—</Text>
      </View>
    );
  }

  const count = status?.streakCount ?? 0;
  const active = status?.isActive === true && count > 0;
  const completedToday = status?.completedToday === true;

  // Filled flame = done today; outline = streak alive but today's reading still open.
  const label = active ? t('streak.count', { count }) : t('streak.start');

  const a11y = active
    ? completedToday
      ? t('streak.count', { count })
      : t('streak.a11yKeepGoing', { count })
    : t('streak.a11yStart');

  const content = (
    <>
      <Ionicons
        name={active && completedToday ? 'flame' : 'flame-outline'}
        size={15}
        color={active ? colors.gold : colors.muted}
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
        accessibilityLabel={a11y}
        accessibilityHint={t('streak.a11yOpenCalendar')}
        hitSlop={6}
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
      paddingVertical: 8,
      minHeight: 34,
      borderRadius: 999,
      borderWidth: StyleSheet.hairlineWidth,
      maxWidth: 230,
    },
    wrapPressed: { opacity: pressedOpacity },
    wrapActive: {
      backgroundColor: c.goldSoft,
      borderColor: c.goldBorder,
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
