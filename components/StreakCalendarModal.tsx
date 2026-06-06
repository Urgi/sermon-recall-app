import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useRecallionTheme } from '../contexts/ThemeContext';
import type { DevotionalStreakStatus } from '../lib/devotionalStreak';
import { localYmdInTimeZone } from '../lib/devotionalUnlock';
import type { RecallionColors } from '../lib/recallionTheme';
import {
  buildMonthGrid,
  fetchDevotionalCompletionDates,
  monthLabel,
  shiftMonth,
  ymdToMonthIndex,
} from '../lib/streakCalendar';

type Props = {
  visible: boolean;
  userId: string;
  timeZone: string;
  streakStatus: DevotionalStreakStatus | null;
  onClose: () => void;
};

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function StreakCalendarModal({
  visible,
  userId,
  timeZone,
  streakStatus,
  onClose,
}: Props) {
  const { colors } = useRecallionTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const todayYmd = useMemo(() => localYmdInTimeZone(new Date(), timeZone), [timeZone]);

  const initialMonth = useMemo(() => ymdToMonthIndex(todayYmd), [todayYmd]);
  const [year, setYear] = useState(initialMonth.year);
  const [monthIndex, setMonthIndex] = useState(initialMonth.monthIndex);
  const [completedDates, setCompletedDates] = useState<Set<string>>(new Set());
  const [loadingDates, setLoadingDates] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const current = ymdToMonthIndex(todayYmd);
    setYear(current.year);
    setMonthIndex(current.monthIndex);
  }, [visible, todayYmd]);

  const loadDates = useCallback(async () => {
    if (!visible || !userId) return;
    setLoadingDates(true);
    const dates = await fetchDevotionalCompletionDates(userId, timeZone);
    setCompletedDates(dates);
    setLoadingDates(false);
  }, [visible, userId, timeZone]);

  useEffect(() => {
    void loadDates();
  }, [loadDates]);

  const cells = useMemo(
    () => buildMonthGrid(year, monthIndex, timeZone),
    [year, monthIndex, timeZone],
  );

  const count = streakStatus?.streakCount ?? 0;
  const active = streakStatus?.isActive === true && count > 0;

  function goMonth(delta: number) {
    const next = shiftMonth(year, monthIndex, delta);
    setYear(next.year);
    setMonthIndex(next.monthIndex);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.headerRow}>
            <View style={styles.titleBlock}>
              <Text style={styles.title}>Devotional streak</Text>
              <Text style={styles.subtitle}>
                {active
                  ? `${count} day${count === 1 ? '' : 's'} in a row`
                  : 'Complete a devotional to start your streak'}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Close calendar">
              <Ionicons name="close" size={24} color={colors.muted} />
            </Pressable>
          </View>

          <View style={styles.monthNav}>
            <Pressable
              onPress={() => goMonth(-1)}
              style={({ pressed }) => [styles.navBtn, pressed && styles.navBtnPressed]}
              accessibilityLabel="Previous month"
            >
              <Ionicons name="chevron-back" size={20} color={colors.navy} />
            </Pressable>
            <Text style={styles.monthLabel}>{monthLabel(year, monthIndex)}</Text>
            <Pressable
              onPress={() => goMonth(1)}
              style={({ pressed }) => [styles.navBtn, pressed && styles.navBtnPressed]}
              accessibilityLabel="Next month"
            >
              <Ionicons name="chevron-forward" size={20} color={colors.navy} />
            </Pressable>
          </View>

          <View style={styles.weekdayRow}>
            {WEEKDAYS.map((label, i) => (
              <Text key={`${label}-${i}`} style={styles.weekday}>
                {label}
              </Text>
            ))}
          </View>

          {loadingDates ? (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.blue} />
            </View>
          ) : (
            <View style={styles.grid}>
              {cells.map((cell) => {
                const completed = completedDates.has(cell.ymd);
                const isToday = cell.ymd === todayYmd;
                return (
                  <View key={cell.ymd} style={styles.cell}>
                    <View
                      style={[
                        styles.dayBubble,
                        isToday && styles.dayBubbleToday,
                        !cell.inMonth && styles.dayBubbleOutside,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          !cell.inMonth && styles.dayTextOutside,
                          isToday && styles.dayTextToday,
                        ]}
                      >
                        {cell.day}
                      </Text>
                    </View>
                    <View style={styles.dotSlot}>
                      {completed ? <View style={styles.dot} /> : null}
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          <View style={styles.legend}>
            <View style={styles.legendDot} />
            <Text style={styles.legendText}>Day you marked a devotional complete</Text>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(c: RecallionColors) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.55)',
      justifyContent: 'center',
      padding: 20,
    },
    sheet: {
      backgroundColor: c.bgCard,
      borderRadius: c.radiusCard,
      borderWidth: 1,
      borderColor: c.borderSubtle,
      padding: 20,
      maxWidth: 400,
      width: '100%',
      alignSelf: 'center',
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 16,
    },
    titleBlock: { flex: 1 },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: c.navy,
    },
    subtitle: {
      marginTop: 4,
      fontSize: 14,
      color: c.muted,
      lineHeight: 20,
    },
    monthNav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    navBtn: {
      padding: 8,
      borderRadius: 8,
    },
    navBtnPressed: { opacity: 0.7 },
    monthLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: c.navy,
    },
    weekdayRow: {
      flexDirection: 'row',
      marginBottom: 8,
    },
    weekday: {
      flex: 1,
      textAlign: 'center',
      fontSize: 12,
      fontWeight: '600',
      color: c.muted,
    },
    loading: {
      minHeight: 220,
      alignItems: 'center',
      justifyContent: 'center',
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    cell: {
      width: `${100 / 7}%`,
      alignItems: 'center',
      paddingVertical: 6,
    },
    dayBubble: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayBubbleToday: {
      borderWidth: 1,
      borderColor: c.blue,
    },
    dayBubbleOutside: {
      opacity: 0.45,
    },
    dayText: {
      fontSize: 14,
      fontWeight: '600',
      color: c.navy,
    },
    dayTextOutside: {
      color: c.muted,
    },
    dayTextToday: {
      color: c.blue,
    },
    dotSlot: {
      height: 8,
      marginTop: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 999,
      backgroundColor: c.blue,
    },
    legend: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 16,
      paddingTop: 14,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.borderSubtle,
    },
    legendDot: {
      width: 6,
      height: 6,
      borderRadius: 999,
      backgroundColor: c.blue,
    },
    legendText: {
      flex: 1,
      fontSize: 13,
      color: c.muted,
      lineHeight: 18,
    },
  });
}
