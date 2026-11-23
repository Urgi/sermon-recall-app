import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useI18n } from '../contexts/I18nContext';
import { useRecallionTheme } from '../contexts/ThemeContext';
import type { DevotionalStreakStatus } from '../lib/devotionalStreak';
import { localYmdInTimeZone } from '../lib/devotionalUnlock';
import { pressedOpacity } from '../lib/motion';
import type { RecallionColors } from '../lib/recallionTheme';
import { useModalTransition } from '../lib/useModalTransition';
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

/** Day cell: 6pt padding × 2 + 32pt bubble + 2pt gap + 8pt dot slot. */
const CELL_HEIGHT = 54;

const FALLBACK_WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** Sunday-first narrow weekday initials in the app language. */
function weekdayInitials(language: string): string[] {
  try {
    // 2023-01-01 was a Sunday.
    return Array.from({ length: 7 }, (_, i) =>
      new Date(Date.UTC(2023, 0, 1 + i, 12)).toLocaleDateString(language, {
        weekday: 'narrow',
        timeZone: 'UTC',
      }),
    );
  } catch {
    return FALLBACK_WEEKDAYS;
  }
}

export function StreakCalendarModal({
  visible,
  userId,
  timeZone,
  streakStatus,
  onClose,
}: Props) {
  const { colors } = useRecallionTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { t, language } = useI18n();
  const weekdays = useMemo(() => weekdayInitials(language), [language]);
  const { mounted, backdropStyle, cardStyle } = useModalTransition(visible);
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
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, backdropStyle]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
          />
        </Animated.View>
        <Animated.View style={[styles.sheet, cardStyle]} accessibilityViewIsModal>
          <View style={styles.headerRow}>
            <View style={styles.titleBlock}>
              <Text style={styles.title} accessibilityRole="header">
                {t('streak.calendarTitle')}
              </Text>
              <Text style={styles.subtitle}>
                {active
                  ? count === 1
                    ? t('streak.inARowOne')
                    : t('streak.inARow', { count })
                  : t('streak.startHint')}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
              style={({ pressed }) => [styles.closeBtn, pressed && styles.navBtnPressed]}
            >
              <Ionicons name="close" size={22} color={colors.navyMid} />
            </Pressable>
          </View>

          <View style={styles.monthNav}>
            <Pressable
              onPress={() => goMonth(-1)}
              style={({ pressed }) => [styles.navBtn, pressed && styles.navBtnPressed]}
              accessibilityRole="button"
              accessibilityLabel={t('streak.prevMonth')}
            >
              <Ionicons name="chevron-back" size={20} color={colors.navy} />
            </Pressable>
            <Text style={styles.monthLabel} accessibilityLiveRegion="polite">
              {monthLabel(year, monthIndex)}
            </Text>
            <Pressable
              onPress={() => goMonth(1)}
              style={({ pressed }) => [styles.navBtn, pressed && styles.navBtnPressed]}
              accessibilityRole="button"
              accessibilityLabel={t('streak.nextMonth')}
            >
              <Ionicons name="chevron-forward" size={20} color={colors.navy} />
            </Pressable>
          </View>

          <View style={styles.weekdayRow}>
            {weekdays.map((label, i) => (
              <Text key={`${label}-${i}`} style={styles.weekday}>
                {label}
              </Text>
            ))}
          </View>

          {loadingDates ? (
            <View style={[styles.loading, { height: (cells.length / 7) * CELL_HEIGHT }]}>
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
            <Text style={styles.legendText}>{t('streak.legend')}</Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function createStyles(c: RecallionColors) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      justifyContent: 'center',
      padding: 20,
    },
    scrim: { backgroundColor: c.scrim },
    closeBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.bgWash,
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
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    navBtnPressed: { opacity: pressedOpacity },
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
      alignItems: 'center',
      justifyContent: 'center',
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    cell: {
      // Slightly under 1/7 so float rounding can't push the 7th cell onto the next row.
      width: '14.28%',
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
      backgroundColor: c.gold,
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
      backgroundColor: c.gold,
    },
    legendText: {
      flex: 1,
      fontSize: 13,
      color: c.muted,
      lineHeight: 18,
    },
  });
}
