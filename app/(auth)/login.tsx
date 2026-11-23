import { router, useLocalSearchParams } from 'expo-router';
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
import { BrandWordmark } from '../../components/Brand';
import { FadeInView } from '../../components/FadeInView';
import { KeyboardFormScreen } from '../../components/KeyboardFormScreen';

import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/I18nContext';
import { useRecallionTheme } from '../../contexts/ThemeContext';
import { createAuthFormStyles } from '../../lib/authFormStyles';

function param(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

/** welcome → (create account | email → code). One primary action per step. */
type Step = 'welcome' | 'email' | 'code';

export default function LoginScreen() {
  const params = useLocalSearchParams<{
    confirmed?: string;
    error?: string;
    email?: string;
  }>();
  const linkError = param(params.error);
  const showUseCodeHint = linkError === 'use_code' || linkError === 'confirmation_failed';
  const { sendEmailOtp, verifyEmailOtp, session, loading, profileLoading } = useAuth();
  const { t } = useI18n();
  const { colors } = useRecallionTheme();
  const form = useMemo(() => createAuthFormStyles(colors), [colors]);
  const [step, setStep] = useState<Step>(() =>
    param(params.email) || showUseCodeHint ? 'email' : 'welcome',
  );
  const [email, setEmail] = useState(param(params.email) ?? '');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resendPending, setResendPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const codeRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!loading && session && !profileLoading) {
      const delayMs = params.confirmed === '1' ? 3200 : 0;
      const id = setTimeout(() => router.replace('/'), delayMs);
      return () => clearTimeout(id);
    }
  }, [loading, session, profileLoading, params.confirmed]);

  function goTo(next: Step) {
    setStep(next);
    setError(null);
    setNotice(null);
    if (next !== 'code') setCode('');
  }

  async function onSendCode() {
    setError(null);
    setNotice(null);
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError(t('auth.enterEmail'));
      return;
    }
    setSubmitting(true);
    const { error: err } = await sendEmailOtp(trimmed, { createUser: false });
    setSubmitting(false);
    if (err) {
      setError(err);
      return;
    }
    setStep('code');
    setNotice(t('auth.codeSent'));
  }

  async function onVerify() {
    setError(null);
    setNotice(null);
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedCode = code.trim();
    if (trimmedCode.length < 6) {
      setError(t('auth.enterCode'));
      return;
    }
    setSubmitting(true);
    const { error: err } = await verifyEmailOtp(trimmedEmail, trimmedCode);
    setSubmitting(false);
    if (err) {
      setError(err);
      return;
    }
    router.replace('/');
  }

  async function onResend() {
    setResendPending(true);
    setError(null);
    const { error: err } = await sendEmailOtp(email.trim().toLowerCase(), { createUser: false });
    setResendPending(false);
    setNotice(err ?? t('auth.newCodeSent'));
  }

  const emailReady = email.trim().length > 0 && !submitting;
  const codeReady = code.trim().length >= 6 && !submitting;

  return (
    <KeyboardFormScreen backgroundColor={colors.bgPage} centerContent={step !== 'code'}>
      <FadeInView key={step} style={form.card}>
        {step === 'welcome' ? (
          <>
            <BrandWordmark height={44} style={styles.logoWelcome} />
            <Text style={form.title} accessibilityRole="header">
              {t('auth.welcome')}
            </Text>
            <Text style={form.subtitle}>{t('auth.welcomeHint')}</Text>

            <Pressable
              onPress={() => router.push('/register')}
              style={({ pressed }) => [form.button, pressed && form.pressed]}
              accessibilityRole="button"
            >
              <Text style={form.buttonLabel}>{t('auth.createAccount')}</Text>
            </Pressable>

            <Pressable
              onPress={() => goTo('email')}
              style={({ pressed }) => [form.secondaryButton, styles.gap, pressed && form.pressed]}
              accessibilityRole="button"
              accessibilityHint={t('auth.loginHint')}
            >
              <Text style={form.secondaryButtonLabel}>{t('auth.signIn')}</Text>
            </Pressable>
          </>
        ) : step === 'email' ? (
          <>
            <AuthBackButtonSlot label={t('common.back')} onPress={() => goTo('welcome')} />
            <Text style={form.title} accessibilityRole="header">
              {t('auth.signIn')}
            </Text>
            <Text style={form.subtitle}>{t('auth.loginHint')}</Text>

            {showUseCodeHint ? (
              <View style={form.alertBox} accessibilityRole="alert">
                <Text style={form.alertTitle}>{t('auth.useEmailCode')}</Text>
                <Text style={form.alertBody}>{t('auth.useCodeNotLink')}</Text>
              </View>
            ) : null}

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
              autoFocus={!param(params.email)}
              returnKeyType="go"
              submitBehavior="submit"
              onSubmitEditing={() => void onSendCode()}
            />
            {error ? (
              <Text style={form.error} accessibilityRole="alert">
                {error}
              </Text>
            ) : null}
            <Pressable
              style={({ pressed }) => [
                form.button,
                !emailReady && form.buttonDisabled,
                pressed && emailReady && form.pressed,
              ]}
              onPress={() => void onSendCode()}
              disabled={!emailReady}
              accessibilityRole="button"
              accessibilityState={{ disabled: !emailReady, busy: submitting }}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={[form.buttonLabel, !emailReady && form.buttonLabelDisabled]}>
                  {t('auth.emailMeCode')}
                </Text>
              )}
            </Pressable>

            <Pressable
              onPress={() => router.push('/register')}
              style={form.footerRow}
              accessibilityRole="button"
              accessibilityLabel={t('auth.createAccountLink')}
            >
              <Text style={form.footerPrompt}>{t('auth.newToApp')}</Text>
              <Text style={form.footerLink}>{t('auth.createAccountLink')}</Text>
            </Pressable>
          </>
        ) : (
          <>
            <AuthBackButtonSlot label={t('common.back')} onPress={() => goTo('email')} />
            <Text style={form.kicker}>{t('auth.verification')}</Text>
            <Text style={form.title} accessibilityRole="header">
              {t('auth.enterYourCode')}
            </Text>
            <Text style={form.subtitle}>
              {t('auth.codeSentTo', { email: email.trim().toLowerCase() })}
            </Text>

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
              autoFocus
              maxLength={8}
              value={code}
              onChangeText={(v) => setCode(v.replace(/\D/g, ''))}
            />
            {error ? (
              <Text style={form.error} accessibilityRole="alert">
                {error}
              </Text>
            ) : notice ? (
              <Text style={form.notice} accessibilityLiveRegion="polite">
                {notice}
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
          </>
        )}
      </FadeInView>
    </KeyboardFormScreen>
  );
}

const styles = StyleSheet.create({
  logoWelcome: { marginBottom: 32 },
  gap: { marginTop: 12 },
});
