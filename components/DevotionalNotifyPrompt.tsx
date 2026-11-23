import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ReminderTimePicker } from './ReminderTimePicker';
import { useI18n } from '../contexts/I18nContext';
import { useRecallionTheme } from '../contexts/ThemeContext';
import { pressedOpacity } from '../lib/motion';
import type { RecallionColors } from '../lib/recallionTheme';
import { useModalTransition } from '../lib/useModalTransition';
import {
  clockToHour24,
  DEFAULT_REMINDER_CLOCK,
  type ReminderClock,
} from '../lib/reminderTime';
import { getDeviceTimeZone } from '../lib/deviceTimezone';
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
  const { t } = useI18n();
  const { mounted, backdropStyle, cardStyle } = useModalTransition(visible);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clock, setClock] = useState<ReminderClock>(DEFAULT_REMINDER_CLOCK);

  async function apply(patch: Record<string, boolean | number | string | null>): Promise<void> {
    if (!supabase) {
      setError(t('err.notConfigured'));
      return;
    }
    setError(null);
    setBusy(true);
    const { error: upErr } = await supabase
      .from('users')
      .update({ ...patch, timezone: getDeviceTimeZone() })
      .eq('id', userId);
    setBusy(false);
    if (upErr) {
      setError(t('err.saveFailed'));
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
    <Modal
      visible={mounted}
      animationType="none"
      transparent
      statusBarTranslucent
      onRequestClose={() => undefined}
    >
      <View style={styles.backdrop}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, backdropStyle]} />
        <Animated.View style={[styles.sheet, cardStyle]} accessibilityViewIsModal>
          <Text style={styles.title} accessibilityRole="header">
            {t('auth.dailyReminder')}
          </Text>
          <Text style={styles.sub}>{t('notify.promptBody')}</Text>

          <ReminderTimePicker value={clock} onChange={setClock} disabled={busy} />

          {error ? (
            <Text style={styles.err} accessibilityRole="alert">
              {error}
            </Text>
          ) : null}

          <Pressable
            style={({ pressed }) => [styles.primary, pressed && !busy && styles.pressed]}
            disabled={busy}
            accessibilityRole="button"
            accessibilityState={{ busy }}
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
              <Text style={styles.primaryLabel}>{t('notify.save')}</Text>
            )}
          </Pressable>

          <View style={styles.secondaryRow}>
            <Pressable
              style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
              disabled={busy}
              accessibilityRole="button"
              onPress={() =>
                void apply({
                  devotional_notify_hour: null,
                  devotional_notify_enabled: true,
                  devotional_notify_prompt_done: true,
                })
              }
            >
              <Text style={styles.secondaryLabel}>{t('notify.useDefaults')}</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
              disabled={busy}
              accessibilityRole="button"
              onPress={() =>
                void apply({
                  devotional_notify_prompt_done: true,
                  devotional_notify_enabled: false,
                })
              }
            >
              <Text style={[styles.secondaryLabel, styles.secondaryMuted]}>
                {t('notify.none')}
              </Text>
            </Pressable>
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
    sheet: {
      backgroundColor: c.bgCard,
      borderRadius: c.radiusCard,
      padding: 22,
      maxWidth: 400,
      alignSelf: 'center',
      width: '100%',
      borderWidth: 1,
      borderColor: c.borderSubtle,
    },
    title: { fontSize: 22, fontWeight: '700', color: c.navy, letterSpacing: -0.2 },
    sub: {
      marginTop: 8,
      marginBottom: 8,
      fontSize: 15,
      lineHeight: 22,
      color: c.muted,
    },
    err: { marginTop: 12, color: c.danger, fontSize: 14, fontWeight: '600', lineHeight: 20 },
    primary: {
      marginTop: 20,
      paddingVertical: 14,
      borderRadius: 50,
      backgroundColor: c.ctaSolid,
      alignItems: 'center',
      minHeight: 52,
      justifyContent: 'center',
    },
    primaryLabel: { color: '#fff', fontSize: 16, fontWeight: '700' },
    secondaryRow: {
      marginTop: 8,
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    secondary: {
      minHeight: 44,
      paddingHorizontal: 4,
      justifyContent: 'center',
    },
    secondaryLabel: { color: c.blue, fontSize: 14, fontWeight: '600' },
    secondaryMuted: { color: c.muted },
    pressed: { opacity: pressedOpacity },
  });
}
