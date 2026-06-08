import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useRecallionTheme } from '../contexts/ThemeContext';
import { DEVOTIONAL_REMINDER_HOUR_OPTIONS } from '../lib/devotionalReminderOptions';
import {
  pushRegistrationHint,
  registerExpoPushTokenForCurrentUser,
} from '../lib/registerPushToken';
import type { RecallionColors } from '../lib/recallionTheme';
import { supabase } from '../lib/supabase';

type Props = {
  userId: string;
  notifyHour: number | null | undefined;
  notifyEnabled: boolean | null | undefined;
  onUpdated: () => void;
};

export function DevotionalReminderSettings({
  userId,
  notifyHour,
  notifyEnabled,
  onUpdated,
}: Props) {
  const { colors } = useRecallionTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const usingCustomHour =
    notifyEnabled !== false &&
    typeof notifyHour === 'number' &&
    notifyHour >= 0 &&
    notifyHour <= 23;
  const usingDefaults = notifyEnabled !== false && !usingCustomHour;
  const remindersOff = notifyEnabled === false;

  async function apply(patch: Record<string, boolean | number | null>): Promise<void> {
    if (!supabase) {
      setError('App is not configured.');
      return;
    }
    setError(null);
    setBusy(true);
    const { error: upErr } = await supabase.from('users').update(patch).eq('id', userId);
    setBusy(false);
    if (upErr) {
      setError(upErr.message);
      return;
    }
    if (patch.devotional_notify_enabled !== false) {
      const push = await registerExpoPushTokenForCurrentUser(userId);
      const hint = pushRegistrationHint(push);
      if (hint) setError(hint);
    }
    onUpdated();
  }

  return (
    <View>
      <Text style={styles.hint}>
        One gentle push when your church has a devotional ready for the day you are on. Times use
        your church&apos;s time zone.
      </Text>

      {error ? <Text style={styles.err}>{error}</Text> : null}

      {DEVOTIONAL_REMINDER_HOUR_OPTIONS.map((o) => {
        const selected = usingCustomHour && notifyHour === o.hour;
        return (
          <Pressable
            key={o.hour}
            style={({ pressed }) => [
              styles.choice,
              selected && styles.choiceSelected,
              pressed && styles.pressed,
            ]}
            disabled={busy}
            onPress={() =>
              void apply({
                devotional_notify_hour: o.hour,
                devotional_notify_enabled: true,
                devotional_notify_prompt_done: true,
              })
            }
          >
            <Text style={[styles.choiceLabel, selected && styles.choiceLabelSelected]}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}

      <Pressable
        style={({ pressed }) => [
          styles.secondary,
          usingDefaults && styles.choiceSelected,
          pressed && styles.pressed,
        ]}
        disabled={busy}
        onPress={() =>
          void apply({
            devotional_notify_hour: null,
            devotional_notify_enabled: true,
            devotional_notify_prompt_done: true,
          })
        }
      >
        <Text style={styles.secondaryLabel}>Default reminders (morning and midday)</Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.secondary,
          remindersOff && styles.choiceSelected,
          pressed && styles.pressed,
        ]}
        disabled={busy}
        onPress={() =>
          void apply({
            devotional_notify_enabled: false,
            devotional_notify_prompt_done: true,
          })
        }
      >
        <Text style={styles.secondaryLabel}>No devotional reminders</Text>
      </Pressable>

      {busy ? <ActivityIndicator style={styles.spinner} color={colors.blue} /> : null}
    </View>
  );
}

function createStyles(c: RecallionColors) {
  return StyleSheet.create({
    hint: { fontSize: 15, lineHeight: 22, color: c.muted },
    err: { marginTop: 10, color: '#fca5a5', fontSize: 14 },
    choice: {
      marginTop: 10,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 10,
      backgroundColor: c.bgWash,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.borderInput,
    },
    choiceSelected: {
      backgroundColor: c.ctaSolid,
      borderColor: c.ctaSolid,
    },
    pressed: { opacity: 0.9 },
    choiceLabel: { color: c.navyMid, fontSize: 15, fontWeight: '500', textAlign: 'center' },
    choiceLabelSelected: { color: '#fff', fontWeight: '600' },
    secondary: {
      marginTop: 10,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 10,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.borderInput,
      backgroundColor: c.bgWash,
    },
    secondaryLabel: { color: c.navyMid, fontSize: 15, fontWeight: '500', textAlign: 'center' },
    spinner: { marginTop: 16 },
  });
}
