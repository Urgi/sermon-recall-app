import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useRecallionTheme } from '../contexts/ThemeContext';
import type { RecallionColors } from '../lib/recallionTheme';
import {
  bumpHour12,
  formatReminderClock,
  toggleAmpm,
  type ReminderClock,
} from '../lib/reminderTime';

type Props = {
  value: ReminderClock;
  onChange: (next: ReminderClock) => void;
  disabled?: boolean;
  /** Shown under the wheels (e.g. church timezone note). */
  caption?: string;
};

/** Dubbadhu-style chevron time wheels (hour + AM/PM). Minutes are always :00. */
export function ReminderTimePicker({ value, onChange, disabled, caption }: Props) {
  const { colors } = useRecallionTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.wrap}>
      <View style={styles.timeRow}>
        <View style={styles.column}>
          <Pressable
            style={({ pressed }) => [styles.chevronBtn, pressed && styles.pressed]}
            disabled={disabled}
            onPress={() => onChange({ ...value, hour12: bumpHour12(value.hour12, 1) })}
            accessibilityLabel="Increase hour"
          >
            <Ionicons name="chevron-up" size={28} color={colors.blue} />
          </Pressable>
          <View style={styles.valueBox}>
            <Text style={styles.value}>{value.hour12}</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.chevronBtn, pressed && styles.pressed]}
            disabled={disabled}
            onPress={() => onChange({ ...value, hour12: bumpHour12(value.hour12, -1) })}
            accessibilityLabel="Decrease hour"
          >
            <Ionicons name="chevron-down" size={28} color={colors.blue} />
          </Pressable>
        </View>

        <Text style={styles.colon}>:</Text>

        <View style={styles.column}>
          <View style={styles.chevronBtnPlaceholder} />
          <View style={styles.valueBox}>
            <Text style={styles.value}>00</Text>
          </View>
          <View style={styles.chevronBtnPlaceholder} />
        </View>

        <View style={[styles.column, styles.ampmColumn]}>
          <Pressable
            style={({ pressed }) => [styles.chevronBtn, pressed && styles.pressed]}
            disabled={disabled}
            onPress={() => onChange({ ...value, ampm: toggleAmpm(value.ampm) })}
            accessibilityLabel="Toggle AM PM"
          >
            <Ionicons name="chevron-up" size={28} color={colors.blue} />
          </Pressable>
          <View style={styles.valueBox}>
            <Text style={[styles.value, styles.ampmValue]}>{value.ampm}</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.chevronBtn, pressed && styles.pressed]}
            disabled={disabled}
            onPress={() => onChange({ ...value, ampm: toggleAmpm(value.ampm) })}
            accessibilityLabel="Toggle AM PM"
          >
            <Ionicons name="chevron-down" size={28} color={colors.blue} />
          </Pressable>
        </View>
      </View>

      <View style={styles.infoBox}>
        <Ionicons name="notifications-outline" size={22} color={colors.blue} />
        <Text style={styles.infoText}>
          Reminder at <Text style={styles.infoBold}>{formatReminderClock(value)}</Text>
          {caption ? ` · ${caption}` : ''}
        </Text>
      </View>
    </View>
  );
}

function createStyles(c: RecallionColors) {
  return StyleSheet.create({
    wrap: { marginTop: 4 },
    timeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    column: { alignItems: 'center' },
    ampmColumn: { marginLeft: 14 },
    chevronBtn: { padding: 8 },
    chevronBtnPlaceholder: { height: 44, width: 44 },
    pressed: { opacity: 0.7 },
    valueBox: {
      backgroundColor: c.accentSoft,
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 20,
      marginVertical: 4,
      minWidth: 64,
      alignItems: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.borderSubtle,
    },
    value: {
      fontSize: 32,
      fontWeight: '700',
      color: c.navy,
      fontVariant: ['tabular-nums'],
    },
    ampmValue: { fontSize: 20 },
    colon: {
      marginHorizontal: 6,
      fontSize: 32,
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
