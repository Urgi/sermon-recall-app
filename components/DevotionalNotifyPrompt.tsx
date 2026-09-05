import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ReminderTimePicker } from './ReminderTimePicker';
import { useRecallionTheme } from '../contexts/ThemeContext';
import type { RecallionColors } from '../lib/recallionTheme';
import {
  clockToHour24,
  DEFAULT_REMINDER_CLOCK,
  type ReminderClock,
} from '../lib/reminderTime';
import {
  pushRegistrationHint,
  registerExpoPushTokenForCurrentUser,
} from '../lib/registerPushToken';
import { supabase } from '../lib/supabase';

type Props = {
  visible: boolean;
  userId: string;
  onComplete: () => void;
};

export function DevotionalNotifyPrompt({ visible, userId, onComplete }: Props) {
  const { colors } = useRecallionTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clock, setClock] = useState<ReminderClock>(DEFAULT_REMINDER_CLOCK);

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
    onComplete();
  }

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Daily reminder</Text>
          <Text style={styles.sub}>
            Choose when you&apos;d like a reminder when your next day is ready. You can change this
            later in Settings. Times use your church&apos;s time zone.
          </Text>

          {error ? <Text style={styles.err}>{error}</Text> : null}

          <ReminderTimePicker value={clock} onChange={setClock} disabled={busy} />

          <Pressable
            style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
            disabled={busy}
            onPress={() =>
              void apply({
                devotional_notify_hour: clockToHour24(clock),
                devotional_notify_enabled: true,
                devotional_notify_prompt_done: true,
              })
            }
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryLabel}>Save reminder</Text>
            )}
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
            disabled={busy}
            onPress={() =>
              void apply({
                devotional_notify_hour: null,
                devotional_notify_enabled: true,
                devotional_notify_prompt_done: true,
              })
            }
          >
            <Text style={styles.secondaryLabel}>Use default (morning & midday)</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
            disabled={busy}
            onPress={() =>
              void apply({
                devotional_notify_prompt_done: true,
                devotional_notify_enabled: false,
              })
            }
          >
            <Text style={styles.secondaryLabel}>No reminders</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(c: RecallionColors) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(5, 7, 10, 0.72)',
      justifyContent: 'center',
      padding: 20,
    },
    sheet: {
      backgroundColor: c.bgCard,
      borderRadius: 20,
      padding: 22,
      maxWidth: 400,
      alignSelf: 'center',
      width: '100%',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.borderSubtle,
    },
    title: { fontSize: 22, fontWeight: '700', color: c.navy },
    sub: {
      marginTop: 10,
      marginBottom: 8,
      fontSize: 15,
      lineHeight: 22,
      color: c.muted,
    },
    err: { marginTop: 10, color: '#b91c1c', fontSize: 14, fontWeight: '600' },
    primary: {
      marginTop: 18,
      paddingVertical: 14,
      borderRadius: 50,
      backgroundColor: c.ctaSolid,
      alignItems: 'center',
      minHeight: 50,
      justifyContent: 'center',
    },
    primaryLabel: { color: '#fff', fontSize: 16, fontWeight: '700' },
    secondary: {
      marginTop: 10,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 50,
      borderWidth: 1,
      borderColor: c.borderInput,
      backgroundColor: c.bgWash,
    },
    secondaryLabel: { color: c.navyMid, fontSize: 15, fontWeight: '600', textAlign: 'center' },
    pressed: { opacity: 0.9 },
  });
}
