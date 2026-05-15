import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { recallion } from '../lib/recallionTheme';
import { supabase } from '../lib/supabase';

const HOUR_OPTIONS: { label: string; hour: number }[] = [
  { label: '7:00 in the morning', hour: 7 },
  { label: '8:00 in the morning', hour: 8 },
  { label: '12:00 noon', hour: 12 },
  { label: '6:00 in the evening', hour: 18 },
];

type Props = {
  visible: boolean;
  userId: string;
  onComplete: () => void;
};

export function DevotionalNotifyPrompt({ visible, userId, onComplete }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function apply(
    patch: Record<string, boolean | number | null>,
  ): Promise<void> {
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
    onComplete();
  }

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>When should we remind you?</Text>
          <Text style={styles.sub}>
            One gentle push when your church has a devotional ready for the day you are on. Times
            use your church&apos;s time zone. You can switch to the default morning and midday
            reminders instead, or turn reminders off.
          </Text>

          {error ? <Text style={styles.err}>{error}</Text> : null}

          {HOUR_OPTIONS.map((o) => (
            <Pressable
              key={o.hour}
              style={({ pressed }) => [styles.choice, pressed && styles.choicePressed]}
              disabled={busy}
              onPress={() =>
                void apply({
                  devotional_notify_hour: o.hour,
                  devotional_notify_enabled: true,
                  devotional_notify_prompt_done: true,
                })
              }
            >
              <Text style={styles.choiceLabel}>{o.label}</Text>
            </Pressable>
          ))}

          <Pressable
            style={({ pressed }) => [styles.secondary, pressed && styles.choicePressed]}
            disabled={busy}
            onPress={() =>
              void apply({
                devotional_notify_prompt_done: true,
              })
            }
          >
            <Text style={styles.secondaryLabel}>Use default reminders (morning and midday)</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.secondary, pressed && styles.choicePressed]}
            disabled={busy}
            onPress={() =>
              void apply({
                devotional_notify_prompt_done: true,
                devotional_notify_enabled: false,
              })
            }
          >
            <Text style={styles.secondaryLabel}>No devotional reminders</Text>
          </Pressable>

          {busy ? <ActivityIndicator style={styles.spinner} color={recallion.blue} /> : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 7, 10, 0.72)',
    justifyContent: 'center',
    padding: 20,
  },
  sheet: {
    backgroundColor: recallion.bgCard,
    borderRadius: 16,
    padding: 20,
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: recallion.borderSubtle,
  },
  title: { fontSize: 20, fontWeight: '600', color: recallion.navy },
  sub: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: recallion.muted,
  },
  err: { marginTop: 10, color: '#fca5a5', fontSize: 14 },
  choice: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: recallion.ctaSolid,
  },
  choicePressed: { opacity: 0.9 },
  choiceLabel: { color: '#fff', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  secondary: {
    marginTop: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: recallion.borderInput,
    backgroundColor: recallion.bgWash,
  },
  secondaryLabel: { color: recallion.navyMid, fontSize: 15, fontWeight: '500', textAlign: 'center' },
  spinner: { marginTop: 16 },
});
