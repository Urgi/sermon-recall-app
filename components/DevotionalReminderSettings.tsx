import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { ReminderTimePicker } from './ReminderTimePicker';
import { useRecallionTheme } from '../contexts/ThemeContext';
import type { RecallionColors } from '../lib/recallionTheme';
import {
  clockToHour24,
  DEFAULT_REMINDER_CLOCK,
  formatReminderHour24,
  hour24ToClock,
  type ReminderClock,
} from '../lib/reminderTime';
import {
  pushRegistrationHint,
  registerExpoPushTokenForCurrentUser,
} from '../lib/registerPushToken';
import { supabase } from '../lib/supabase';

type Props = {
  userId: string;
  notifyHour: number | null | undefined;
  notifyEnabled: boolean | null | undefined;
  onUpdated: () => void;
};

type Mode = 'custom' | 'defaults' | 'off';

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

  const savedMode: Mode =
    notifyEnabled === false
      ? 'off'
      : typeof notifyHour === 'number' && notifyHour >= 0 && notifyHour <= 23
        ? 'custom'
        : 'defaults';

  const [mode, setMode] = useState<Mode>(savedMode);
  const [clock, setClock] = useState<ReminderClock>(() =>
    savedMode === 'custom' && typeof notifyHour === 'number'
      ? hour24ToClock(notifyHour)
      : DEFAULT_REMINDER_CLOCK,
  );

  useEffect(() => {
    setMode(savedMode);
    if (savedMode === 'custom' && typeof notifyHour === 'number') {
      setClock(hour24ToClock(notifyHour));
    }
  }, [savedMode, notifyHour]);

  const dirty =
    mode !== savedMode ||
    (mode === 'custom' &&
      (savedMode !== 'custom' ||
        (typeof notifyHour === 'number' && clockToHour24(clock) !== notifyHour)));

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

  async function onSave() {
    if (mode === 'off') {
      await apply({
        devotional_notify_enabled: false,
        devotional_notify_prompt_done: true,
      });
      return;
    }
    if (mode === 'defaults') {
      await apply({
        devotional_notify_hour: null,
        devotional_notify_enabled: true,
        devotional_notify_prompt_done: true,
      });
      return;
    }
    await apply({
      devotional_notify_hour: clockToHour24(clock),
      devotional_notify_enabled: true,
      devotional_notify_prompt_done: true,
    });
  }

  return (
    <View>
      <Text style={styles.hint}>
        One gentle push when your church has a devotional ready for the day you are on. Times use
        your church&apos;s time zone.
      </Text>

      {error ? <Text style={styles.err}>{error}</Text> : null}

      <View style={styles.modeRow}>
        {(
          [
            { key: 'custom' as const, label: 'Custom time' },
            { key: 'defaults' as const, label: 'Defaults' },
            { key: 'off' as const, label: 'Off' },
          ] as const
        ).map((opt) => {
          const selected = mode === opt.key;
          return (
            <Pressable
              key={opt.key}
              style={({ pressed }) => [
                styles.modeChip,
                selected && styles.modeChipSelected,
                pressed && styles.pressed,
              ]}
              disabled={busy}
              onPress={() => setMode(opt.key)}
            >
              <Text style={[styles.modeChipLabel, selected && styles.modeChipLabelSelected]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {mode === 'custom' ? (
        <ReminderTimePicker
          value={clock}
          onChange={setClock}
          disabled={busy}
          caption="on the hour"
        />
      ) : null}

      {mode === 'defaults' ? (
        <Text style={styles.modeHint}>Morning and midday reminders (church time zone).</Text>
      ) : null}
      {mode === 'off' ? (
        <Text style={styles.modeHint}>You won’t get daily devotional push reminders.</Text>
      ) : null}

      {savedMode === 'custom' && typeof notifyHour === 'number' && !dirty ? (
        <Text style={styles.saved}>Saved · {formatReminderHour24(notifyHour)}</Text>
      ) : null}

      <Pressable
        style={({ pressed }) => [
          styles.saveBtn,
          (!dirty || busy) && styles.saveBtnDisabled,
          pressed && dirty && !busy && styles.pressed,
        ]}
        disabled={!dirty || busy}
        onPress={() => void onSave()}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={[styles.saveLabel, !dirty && styles.saveLabelDisabled]}>
            {dirty ? 'Save reminder' : 'Saved'}
          </Text>
        )}
      </Pressable>
    </View>
  );
}

function createStyles(c: RecallionColors) {
  return StyleSheet.create({
    hint: { fontSize: 15, lineHeight: 22, color: c.muted, marginBottom: 12 },
    err: { marginBottom: 10, color: '#b91c1c', fontSize: 14, fontWeight: '600' },
    modeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
    modeChip: {
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.borderInput,
      backgroundColor: c.bgCard,
    },
    modeChipSelected: {
      backgroundColor: c.ctaSolid,
      borderColor: c.ctaSolid,
    },
    modeChipLabel: { fontSize: 14, fontWeight: '600', color: c.navy },
    modeChipLabelSelected: { color: '#fff' },
    modeHint: { marginTop: 12, fontSize: 14, lineHeight: 20, color: c.muted },
    saved: { marginTop: 12, fontSize: 13, fontWeight: '600', color: c.blue },
    saveBtn: {
      marginTop: 16,
      backgroundColor: c.ctaSolid,
      borderRadius: 50,
      paddingVertical: 14,
      alignItems: 'center',
      minHeight: 50,
      justifyContent: 'center',
    },
    saveBtnDisabled: {
      backgroundColor: c.bgWash,
      borderWidth: 1,
      borderColor: c.borderInput,
    },
    saveLabel: { color: '#fff', fontSize: 16, fontWeight: '700' },
    saveLabelDisabled: { color: c.muted },
    pressed: { opacity: 0.9 },
  });
}
