import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AuthBackButtonSlot } from '../../components/AuthBackButton';
import { FadeInView } from '../../components/FadeInView';
import { KeyboardFormScreen } from '../../components/KeyboardFormScreen';
import { ReminderTimePicker } from '../../components/ReminderTimePicker';

import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/I18nContext';
import { useRecallionTheme } from '../../contexts/ThemeContext';
import { createAuthFormStyles } from '../../lib/authFormStyles';
import {
  APP_LANGUAGES,
  type AppLanguage,
} from '../../lib/i18n/languages';
import type { RecallionColors } from '../../lib/recallionTheme';
import {
  clockToHour24,
  DEFAULT_REMINDER_CLOCK,
  formatReminderClock,
  type ReminderClock,
} from '../../lib/reminderTime';

export default function RegisterScreen() {
  const { colors } = useRecallionTheme();
  const form = useMemo(() => createAuthFormStyles(colors), [colors]);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { sendEmailOtp, session, loading, profileLoading } = useAuth();
  const { t, language, setLanguagePreview } = useI18n();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [preferredLanguage, setPreferredLanguage] =
    useState<AppLanguage>(language);
  const [reminderClock, setReminderClock] = useState<ReminderClock>(DEFAULT_REMINDER_CLOCK);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const emailRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!loading && session && !profileLoading) {
      router.replace('/');
    }
  }, [loading, session, profileLoading]);

  async function onSubmit() {
    setError(null);
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError(t('auth.enterEmail'));
      return;
    }
    setSubmitting(true);
    const { error: err } = await sendEmailOtp(trimmedEmail, {
      createUser: true,
      fullName: fullName.trim() || undefined,
      preferredLanguage,
      notifyHour: clockToHour24(reminderClock),
    });
    setSubmitting(false);
    if (err) {
      setError(err);
      return;
    }
    router.replace(`/verify-email?email=${encodeURIComponent(trimmedEmail)}`);
  }

  const ready = email.trim().length > 0 && !submitting;

  return (
    <KeyboardFormScreen backgroundColor={colors.bgPage} centerContent={false}>
      <View style={form.card}>
        <AuthBackButtonSlot />

        <Text style={form.title}>{t('auth.createAccount')}</Text>
        <Text style={form.subtitle}>{t('auth.signupHint')}</Text>

        <Text style={form.fieldLabel}>{t('auth.fullName')}</Text>
        <TextInput
          style={form.input}
          placeholder={t('auth.optional')}
          placeholderTextColor={colors.muted}
          autoComplete="name"
          textContentType="name"
          value={fullName}
          onChangeText={setFullName}
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => emailRef.current?.focus()}
        />
        <Text style={form.fieldLabel}>{t('auth.email')}</Text>
        <TextInput
          ref={emailRef}
          style={form.input}
          placeholder={t('auth.emailPlaceholder')}
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          value={email}
          onChangeText={setEmail}
          returnKeyType="go"
          submitBehavior="blurAndSubmit"
          onSubmitEditing={() => void onSubmit()}
        />

        <Text style={form.fieldLabel}>{t('auth.preferredLanguage')}</Text>
        <View style={styles.segment} accessibilityRole="radiogroup">
          {APP_LANGUAGES.map((opt) => {
            const selected = preferredLanguage === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => {
                  setPreferredLanguage(opt.value);
                  setLanguagePreview(opt.value);
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={opt.nativeLabel}
                style={({ pressed }) => [
                  styles.segmentItem,
                  selected && styles.segmentItemSelected,
                  pressed && form.pressed,
                ]}
              >
                <Text
                  style={[styles.segmentLabel, selected && styles.segmentLabelSelected]}
                  numberOfLines={1}
                >
                  {opt.nativeLabel}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={() => setReminderOpen((v) => !v)}
          accessibilityRole="button"
          accessibilityState={{ expanded: reminderOpen }}
          accessibilityHint={t('auth.reminderHint')}
          style={({ pressed }) => [styles.reminderRow, pressed && form.pressed]}
        >
          <Ionicons name="notifications-outline" size={20} color={colors.blue} />
          <View style={styles.reminderText}>
            <Text style={styles.reminderLabel}>{t('auth.dailyReminder')}</Text>
            <Text style={styles.reminderValue}>{formatReminderClock(reminderClock)}</Text>
          </View>
          <Text style={styles.reminderAction}>
            {reminderOpen ? t('common.done') : t('common.change')}
          </Text>
        </Pressable>
        {reminderOpen ? (
          <FadeInView style={styles.reminderPicker}>
            <ReminderTimePicker value={reminderClock} onChange={setReminderClock} compact />
          </FadeInView>
        ) : null}

        {error ? (
          <Text style={[form.error, styles.errorGap]} accessibilityRole="alert">
            {error}
          </Text>
        ) : null}
        <Pressable
          style={({ pressed }) => [
            form.button,
            styles.submit,
            !ready && form.buttonDisabled,
            pressed && ready && form.pressed,
          ]}
          onPress={() => void onSubmit()}
          disabled={!ready}
          accessibilityRole="button"
          accessibilityState={{ disabled: !ready, busy: submitting }}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={[form.buttonLabel, !ready && form.buttonLabelDisabled]}>
              {t('auth.emailMeCode')}
            </Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/login'))}
          style={form.footerRow}
          accessibilityRole="button"
          accessibilityLabel={t('auth.signIn')}
        >
          <Text style={form.footerPrompt}>{t('auth.haveAccount')}</Text>
          <Text style={form.footerLink}>{t('auth.signIn')}</Text>
        </Pressable>
      </View>
    </KeyboardFormScreen>
  );
}

function createStyles(c: RecallionColors) {
  return StyleSheet.create({
    segment: {
      flexDirection: 'row',
      padding: 4,
      gap: 4,
      borderRadius: 14,
      backgroundColor: c.bgWash,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.borderSubtle,
      marginBottom: 16,
    },
    segmentItem: {
      flex: 1,
      minHeight: 44,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 6,
    },
    segmentItemSelected: {
      backgroundColor: c.bgCard,
      borderWidth: 1,
      borderColor: c.blue,
    },
    segmentLabel: { fontSize: 15, fontWeight: '500', color: c.muted },
    segmentLabelSelected: { color: c.navy, fontWeight: '700' },
    reminderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      minHeight: 56,
      paddingHorizontal: 16,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.borderInput,
      backgroundColor: c.bgCard,
    },
    reminderText: { flex: 1 },
    reminderLabel: { fontSize: 13, fontWeight: '600', color: c.muted },
    reminderValue: { marginTop: 2, fontSize: 16, fontWeight: '700', color: c.navy },
    reminderAction: { fontSize: 15, fontWeight: '700', color: c.blue },
    reminderPicker: { marginTop: 8 },
    errorGap: { marginTop: 16, marginBottom: 0 },
    submit: { marginTop: 24 },
  });
}
