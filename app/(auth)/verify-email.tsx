import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AuthBackButtonSlot } from '../../components/AuthBackButton';
import { FadeInView } from '../../components/FadeInView';
import { KeyboardFormScreen } from '../../components/KeyboardFormScreen';

import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/I18nContext';
import { useRecallionTheme } from '../../contexts/ThemeContext';
import { ensurePublicUserProfile } from '../../lib/auth/ensurePublicProfile';
import { createAuthFormStyles } from '../../lib/authFormStyles';
import { CONFIRMED_TOAST } from '../../lib/authToastMessages';
import { queuePendingToast } from '../../lib/pendingToast';
import { requireSupabase } from '../../lib/supabase';

function param(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default function VerifyEmailScreen() {
  const params = useLocalSearchParams<{ email?: string | string[]; error?: string | string[] }>();
  const initialEmail = param(params.email) ?? '';
  const linkRejected = param(params.error) === 'use_code';
  const { verifyEmailOtp, sendEmailOtp, session, loading, profileLoading } = useAuth();
  const { colors } = useRecallionTheme();
  const { t } = useI18n();
  const form = useMemo(() => createAuthFormStyles(colors), [colors]);
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resendPending, setResendPending] = useState(false);
  const [resendNotice, setResendNotice] = useState<string | null>(null);
  const codeRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!loading && session && !profileLoading) {
      router.replace('/?confirmed=1');
    }
  }, [loading, session, profileLoading]);

  async function onVerify() {
    setError(null);
    setResendNotice(null);
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedCode = code.trim();
    if (!trimmedEmail) {
      setError(t('auth.enterEmail'));
      return;
    }
    if (trimmedCode.length < 6) {
      setError(t('auth.enterCode'));
      return;
    }
    setSubmitting(true);
    const supabase = requireSupabase();
    const { error: err } = await verifyEmailOtp(trimmedEmail, trimmedCode);
    if (err) {
      setSubmitting(false);
      setError(err);
      return;
    }
    const {
      data: { session: nextSession },
    } = await supabase.auth.getSession();
    if (nextSession?.user) {
      await ensurePublicUserProfile(supabase, nextSession.user);
    }
    setSubmitting(false);
    await queuePendingToast({ variant: 'success', message: CONFIRMED_TOAST });
    router.replace('/?confirmed=1');
  }

  async function onResend() {
    if (!email.trim()) {
      setResendNotice(t('auth.enterEmailFirst'));
      return;
    }
    setResendPending(true);
    setResendNotice(null);
    const { error: err } = await sendEmailOtp(email.trim().toLowerCase(), { createUser: true });
    setResendPending(false);
    setResendNotice(err ?? t('auth.newCodeSent'));
  }

  const codeReady = code.trim().length >= 6 && email.trim().length > 0 && !submitting;
  const showEmailField = !initialEmail;

  return (
    <KeyboardFormScreen backgroundColor={colors.bgPage} centerContent={false}>
      <FadeInView style={form.card}>
        <AuthBackButtonSlot href="/register" label={t('common.back')} />

        <Text style={form.kicker}>{t('auth.verification')}</Text>
        <Text style={form.title} accessibilityRole="header">
          {t('auth.enterYourCode')}
        </Text>
        <Text style={form.subtitle}>
          {email.trim()
            ? t('auth.codeSentTo', { email: email.trim().toLowerCase() })
            : t('auth.enterCodeHint')}
        </Text>

        {linkRejected ? (
          <View style={form.alertBox} accessibilityRole="alert">
            <Text style={form.alertTitle}>{t('auth.useEmailCode')}</Text>
            <Text style={form.alertBody}>{t('auth.useCodeNotLink')}</Text>
          </View>
        ) : null}

        {showEmailField ? (
          <>
            <Text style={form.fieldLabel}>{t('auth.email')}</Text>
            <TextInput
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
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => codeRef.current?.focus()}
            />
          </>
        ) : null}

        <TextInput
          ref={codeRef}
          style={[form.input, form.codeInput]}
          placeholder="000000"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          accessibilityLabel={t('auth.codeLabel')}
          maxLength={8}
          value={code}
          onChangeText={(v) => setCode(v.replace(/\D/g, ''))}
          autoFocus={!showEmailField}
        />

        {error ? (
          <Text style={form.error} accessibilityRole="alert">
            {error}
          </Text>
        ) : resendNotice ? (
          <Text style={form.notice} accessibilityLiveRegion="polite">
            {resendNotice}
          </Text>
        ) : null}

        <Pressable
          style={({ pressed }) => [
            form.button,
            !codeReady && form.buttonDisabled,
            pressed && codeReady && form.pressed,
          ]}
          onPress={() => void onVerify()}
          disabled={!codeReady}
          accessibilityRole="button"
          accessibilityState={{ disabled: !codeReady, busy: submitting }}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={[form.buttonLabel, !codeReady && form.buttonLabelDisabled]}>
              {t('auth.verifyCode')}
            </Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => void onResend()}
          disabled={resendPending || submitting}
          style={form.linkButton}
          accessibilityRole="button"
        >
          <Text style={[form.linkText, resendPending && form.linkTextDisabled]}>
            {resendPending ? t('auth.sending') : t('auth.resendCode')}
          </Text>
        </Pressable>
      </FadeInView>
    </KeyboardFormScreen>
  );
}
