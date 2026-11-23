import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useI18n } from '../contexts/I18nContext';
import { useRecallionTheme } from '../contexts/ThemeContext';
import type { RecallionColors } from '../lib/recallionTheme';

type Props = {
  totalDays: number;
  /** 1-based day numbers that are complete. */
  completedDays: Set<number>;
  /** 1-based day the reader is on now (cyan ring), if any. */
  currentDay?: number | null;
};

/**
 * Week-ring style journey row: one numbered circle per day.
 * done = gold check · today = cyan ring · upcoming = quiet number.
 */
export function DayStepper({ totalDays, completedDays, currentDay }: Props) {
  const { colors } = useRecallionTheme();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const days = Array.from({ length: Math.max(totalDays, 1) }, (_, i) => i + 1);

  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t('home.ofComplete', { done: completedDays.size, total: totalDays })}
    >
      {days.map((day, i) => {
        const done = completedDays.has(day);
        const current = !done && day === currentDay;
        return (
          <View key={day} style={[styles.cell, i === 0 && styles.cellFirst]}>
            {i > 0 ? (
              <View style={[styles.link, completedDays.has(day - 1) && done && styles.linkDone]} />
            ) : null}
            <View style={[styles.dot, done && styles.dotDone, current && styles.dotCurrent]}>
              {done ? (
                <Ionicons name="checkmark" size={15} color={colors.onGold} />
              ) : (
                <Text
                  style={[styles.num, current && styles.numCurrent]}
                  maxFontSizeMultiplier={1.2}
                >
                  {day}
                </Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const DOT = 32;

function createStyles(c: RecallionColors) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center' },
    cell: { flex: 1, flexDirection: 'row', alignItems: 'center' },
    cellFirst: { flex: 0 },
    link: {
      flex: 1,
      height: 2,
      marginHorizontal: 4,
      borderRadius: 1,
      backgroundColor: c.progressRest,
    },
    linkDone: { backgroundColor: c.gold },
    dot: {
      width: DOT,
      height: DOT,
      borderRadius: DOT / 2,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.bgWash,
    },
    dotDone: { backgroundColor: c.gold },
    dotCurrent: {
      backgroundColor: c.accentSoft,
      borderWidth: 2,
      borderColor: c.blue,
    },
    num: { fontSize: 13, fontWeight: '700', color: c.muted, fontVariant: ['tabular-nums'] },
    numCurrent: { color: c.blue },
  });
}
