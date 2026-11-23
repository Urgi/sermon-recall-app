import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useI18n } from '../contexts/I18nContext';
import { useRecallionTheme } from '../contexts/ThemeContext';
import { pressedOpacity } from '../lib/motion';
import type { RecallionColors } from '../lib/recallionTheme';
import {
  bumpHour12,
  bumpHour24,
  clockToHour24,
  formatReminderClock,
  toggleAmpm,
  uses24HourClock,
  type ReminderClock,
} from '../lib/reminderTime';

type Props = {
  value: ReminderClock;
  onChange: (next: ReminderClock) => void;
  disabled?: boolean;
  /** Shown under the wheels (e.g. church timezone note). */
  caption?: string;
  /** Wheels only — the parent already shows the chosen time. */
  compact?: boolean;
};

/** Dubbadhu-style chevron time wheels (hour + AM/PM). Minutes are always :00. */
export function ReminderTimePicker({ value, onChange, disabled, caption, compact }: Props) {
  const { colors } = useRecallionTheme();
  const { t, language } = useI18n();
  const is24 = uses24HourClock(language);
  const styles = useMemo(() => createStyles(colors, Boolean(compact)), [colors, compact]);
  const chevronColor = disabled ? colors.muted : colors.blue;
  const [atBefore, atAfter = ''] = t('notify.reminderAt').split('{time}');

  function chevron(direction: 'up' | 'down', label: string, onPress: () => void) {
    return (
      <Pressable
        style={({ pressed }) => [styles.chevronBtn, pressed && styles.pressed]}
        disabled={disabled}
        onPress={onPress}
        hitSlop={4}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Ionicons name={`chevron-${direction}`} size={compact ? 24 : 28} color={chevronColor} />
      </Pressable>
    );
  }

  return (
    <View style={styles.wrap}>
      <View
        style={styles.timeRow}
        accessible={false}
        accessibilityLabel={formatReminderClock(value)}
      >
        <View style={styles.column}>
          {chevron('up', t('notify.increaseHour'), () => onChange(is24 ? bumpHour24(value, 1) : { ...value, hour12: bumpHour12(value.hour12, 1) }))}
          <View style={styles.valueBox}>
            <Text style={styles.value}>{is24 ? clockToHour24(value) : value.hour12}</Text>
          </View>
          {chevron('down', t('notify.decreaseHour'), () => onChange(is24 ? bumpHour24(value, -1) : { ...value, hour12: bumpHour12(value.hour12, -1) }))}
        </View>

        <Text style={styles.colon}>:</Text>

        <View style={styles.column}>
          <View style={styles.chevronBtnPlaceholder} />
          <View style={styles.valueBox}>
            <Text style={styles.value}>00</Text>
          </View>
          <View style={styles.chevronBtnPlaceholder} />
        </View>

        {is24 ? null : (
          <View style={[styles.column, styles.ampmColumn]}>
            {chevron('up', t('notify.toggleAmPm'), () => onChange({ ...value, ampm: toggleAmpm(value.ampm) }))}
            <View style={styles.valueBox}>
              <Text style={[styles.value, styles.ampmValue]}>{value.ampm}</Text>
            </View>
            {chevron('down', t('notify.toggleAmPm'), () => onChange({ ...value, ampm: toggleAmpm(value.ampm) }))}
          </View>
        )}
      </View>

      {compact ? null : (
        <View style={styles.infoBox}>
          <Ionicons name="notifications-outline" size={20} color={colors.blue} />
          <Text style={styles.infoText}>
            {atBefore}
            <Text style={styles.infoBold}>{formatReminderClock(value)}</Text>
            {atAfter}
            {caption ? ` · ${caption}` : ''}
          </Text>
        </View>
      )}
    </View>
  );
}

function createStyles(c: RecallionColors, compact: boolean) {
  const valueSize = compact ? 26 : 32;
  return StyleSheet.create({
    wrap: { marginTop: 4 },
    timeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    column: { alignItems: 'center' },
    ampmColumn: { marginLeft: 14 },
    chevronBtn: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chevronBtnPlaceholder: { height: 44, width: 44 },
    pressed: { opacity: pressedOpacity },
    valueBox: {
      backgroundColor: c.accentSoft,
      borderRadius: 14,
      paddingVertical: compact ? 8 : 14,
      paddingHorizontal: 18,
      minWidth: 64,
      alignItems: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.borderSubtle,
    },
    value: {
      fontSize: valueSize,
      fontWeight: '700',
      color: c.navy,
      fontVariant: ['tabular-nums'],
    },
    ampmValue: { fontSize: compact ? 18 : 20, lineHeight: valueSize * 1.2 },
    colon: {
      marginHorizontal: 6,
      fontSize: valueSize,
      fontWeight: '700',
      color: c.navy,
      marginBottom: 4,
    },
    infoBox: {
      marginTop: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 14,
      borderRadius: 14,
      backgroundColor: c.accentSoft,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.borderSubtle,
    },
    infoText: { flex: 1, fontSize: 14, lineHeight: 20, color: c.navyMid },
    infoBold: { fontWeight: '700', color: c.navy },
  });
}
