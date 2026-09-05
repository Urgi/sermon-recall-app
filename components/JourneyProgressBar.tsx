import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { useRecallionTheme } from '../contexts/ThemeContext';
import type { RecallionColors } from '../lib/recallionTheme';

type Props = {
  totalDays: number;
  /** Number of fully completed days (fills solid cyan from the start). */
  completedCount: number;
  /**
   * 1-based day that is currently in progress / focused.
   * Shown as an outlined active segment when not already completed.
   */
  currentDayNumber?: number | null;
  /** Thin segments (reading header) vs thicker dots (home / journey). */
  size?: 'thin' | 'default';
};

/**
 * Option A progress model:
 * completed = solid cyan · current = outlined active · future = muted
 */
export function JourneyProgressBar({
  totalDays,
  completedCount,
  currentDayNumber,
  size = 'default',
}: Props) {
  const { colors } = useRecallionTheme();
  const styles = useMemo(() => createStyles(colors, size), [colors, size]);
  const segments = Math.max(totalDays, 1);

  return (
    <View style={styles.row} accessibilityRole="progressbar">
      {Array.from({ length: segments }).map((_, i) => {
        const day = i + 1;
        const done = day <= completedCount;
        const current =
          !done && currentDayNumber != null && day === currentDayNumber;
        return (
          <View
            key={i}
            style={[
              styles.seg,
              done && styles.segDone,
              current && styles.segCurrent,
              !done && !current && styles.segFuture,
            ]}
          />
        );
      })}
    </View>
  );
}

function createStyles(c: RecallionColors, size: 'thin' | 'default') {
  const height = size === 'thin' ? 3 : 7;
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: size === 'thin' ? 4 : 6,
      flex: size === 'thin' ? 1 : undefined,
    },
    seg: {
      flex: 1,
      height,
      borderRadius: 999,
    },
    segDone: {
      backgroundColor: c.blue,
    },
    segCurrent: {
      backgroundColor: c.accentSoft,
      borderWidth: size === 'thin' ? 1 : 1.5,
      borderColor: c.blue,
    },
    segFuture: {
      backgroundColor: c.progressRest,
    },
  });
}
