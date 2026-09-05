import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { KeyboardFormScreen } from '../../components/KeyboardFormScreen';

import { useAuth } from '../../contexts/AuthContext';
import { useRecallionTheme } from '../../contexts/ThemeContext';
import { USE_CODE_NOT_LINK_MESSAGE } from '../../lib/authToastMessages';
import type { RecallionColors } from '../../lib/recallionTheme';

function param(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

type Step = 'email' | 'code';

export default function LoginScreen() {
  const params = useLocalSearchParams<{
    confirmed?: string;
    error?: string;
    email?: string;
  }>();
  const linkError = param(params.error);
  const showUseCodeHint = linkError === 'use_code' || linkError === 'confirmation_failed';
  const { sendEmailOtp, verifyEmailOtp, session, loading, profileLoading } = useAuth();
  const { colors } = useRecallionTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [step, setStep] = useState<Step>('email');
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

  function backToEmail() {
    setStep('email');
    setCode('');
    setError(null);
    setNotice(null);
  }

  async function onSendCode() {
    setError(null);
    setNotice(null);
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError('Enter your email address.');
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
    setNotice('Code sent. Check your inbox and spam.');
    setTimeout(() => codeRef.current?.focus(), 50);
  }

  async function onVerify() {
    setError(null);
    setNotice(null);
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedCode = code.trim();
    if (trimmedCode.length < 6) {
      setError('Enter the 6+ digit code from your email.');
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
    setNotice(err ?? 'New code sent. Check inbox and spam.');
  }

  const emailReady = email.trim().length > 0;
  const codeReady = code.trim().length >= 6;

  return (
    <KeyboardFormScreen backgroundColor={colors.bgPage} centerContent={step === 'email'}>
      <View style={styles.card}>
        {step === 'code' ? (
          <Pressable
            onPress={backToEmail}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={({ pressed }) => [styles.backRow, pressed && styles.pressed]}
          >
            <Text style={styles.backLabel}>← Back</Text>
          </Pressable>
        ) : null}

        <Image
          source={require('../../assets/logo.png')}
          style={styles.logo}
          accessibilityLabel="Sermon Recall"
        />

        {step === 'email' ? (
          <>
            <Text style={styles.kicker}>Sign in</Text>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>
              We’ll email you a one-time code — no password needed.
            </Text>

            {showUseCodeHint ? (
              <View style={styles.linkErrorBox} accessibilityRole="alert">
                <Text style={styles.linkErrorTitle}>Use your email code</Text>
                <Text style={styles.linkErrorBody}>{USE_CODE_NOT_LINK_MESSAGE}</Text>
              </View>
            ) : null}

            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Email address"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              value={email}
              onChangeText={setEmail}
              returnKeyType="go"
              submitBehavior="submit"
              onSubmitEditing={() => void onSendCode()}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable
              style={({ pressed }) => [
                styles.button,
                (!emailReady || submitting) && styles.buttonDisabled,
                pressed && emailReady && !submitting && styles.buttonPressed,
              ]}
              onPress={() => void onSendCode()}
              disabled={!emailReady || submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text
                  style={[
                    styles.buttonLabel,
                    (!emailReady || submitting) && styles.buttonLabelDisabled,
                  ]}
                >
                  Email me a code
                </Text>
              )}
            </Pressable>

            <Pressable
              onPress={() => router.push('/register')}
              style={styles.signupRow}
              accessibilityRole="button"
              accessibilityLabel="Create account"
            >
              <Text style={styles.signupPrompt}>New to Sermon Recall? </Text>
              <Text style={styles.signupLink}>Create account</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.kicker}>Verification</Text>
            <Text style={styles.title}>Enter your code</Text>
            <Text style={styles.subtitle}>
              We sent a code to {email.trim().toLowerCase()}.
            </Text>

            <TextInput
              ref={codeRef}
              style={[styles.input, styles.codeInput]}
              placeholder="000000"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              maxLength={8}
              value={code}
              onChangeText={(t) => setCode(t.replace(/\D/g, ''))}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {notice ? <Text style={styles.notice}>{notice}</Text> : null}

            <Pressable
              style={({ pressed }) => [
                styles.button,
                (!codeReady || submitting) && styles.buttonDisabled,
                pressed && codeReady && !submitting && styles.buttonPressed,
              ]}
              onPress={() => void onVerify()}
              disabled={!codeReady || submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text
                  style={[
                    styles.buttonLabel,
                    (!codeReady || submitting) && styles.buttonLabelDisabled,
                  ]}
                >
                  Verify code
                </Text>
              )}
            </Pressable>

            <Pressable
              onPress={() => void onResend()}
              disabled={resendPending || submitting}
              style={styles.linkButton}
            >
              <Text style={styles.linkText}>
                {resendPending ? 'Sending…' : 'Resend code'}
              </Text>
            </Pressable>
          </>
        )}
      </View>
    </KeyboardFormScreen>
  );
}

function createStyles(c: RecallionColors) {
  return StyleSheet.create({
    card: { gap: 0, alignSelf: 'stretch' },
    backRow: {
      alignSelf: 'flex-start',
      marginBottom: 12,
      paddingVertical: 4,
      marginLeft: -4,
    },
    backLabel: { fontSize: 16, fontWeight: '600', color: c.blue },
    pressed: { opacity: 0.7 },
    logo: {
      width: 72,
      height: 72,
      borderRadius: 16,
      alignSelf: 'flex-start',
      marginBottom: 20,
    },
    kicker: {
      fontSize: 12,
      letterSpacing: 1.6,
      textTransform: 'uppercase',
      color: c.blue,
      fontWeight: '600',
      marginBottom: 10,
    },
    title: {
      fontSize: 32,
      fontWeight: '700',
      color: c.navy,
      marginBottom: 10,
      lineHeight: 38,
    },
    subtitle: {
      fontSize: 16,
      color: c.muted,
      marginBottom: 28,
      lineHeight: 24,
    },
    fieldLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: c.navy,
      marginBottom: 8,
    },
    linkErrorBox: {
      borderWidth: 1,
      borderColor: 'rgba(248, 113, 113, 0.65)',
      backgroundColor: '#4a1212',
      borderRadius: 14,
      padding: 14,
      gap: 6,
      marginBottom: 20,
    },
    linkErrorTitle: { fontSize: 15, fontWeight: '700', color: '#fff1f2' },
    linkErrorBody: { fontSize: 14, lineHeight: 20, color: '#fecaca' },
    input: {
      borderWidth: 1,
      borderColor: c.borderInput,
      borderRadius: 14,
      paddingHorizontal: 16,
      minHeight: 56,
      fontSize: 16,
      color: c.navy,
      backgroundColor: c.bgCard,
      marginBottom: 16,
    },
    codeInput: {
      fontSize: 28,
      fontWeight: '600',
      letterSpacing: 8,
      textAlign: 'center',
      fontVariant: ['tabular-nums'],
      paddingVertical: 18,
    },
    error: { color: '#fca5a5', fontSize: 14, marginBottom: 12, marginTop: -8 },
    notice: { color: '#86efac', fontSize: 14, marginBottom: 12, marginTop: -8 },
    button: {
      backgroundColor: c.ctaSolid,
      paddingVertical: 16,
      borderRadius: 50,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 54,
    },
    buttonDisabled: {
      backgroundColor: c.bgCard,
      borderWidth: 1,
      borderColor: c.borderInput,
    },
    buttonPressed: { opacity: 0.9 },
    buttonLabel: { color: '#fff', fontSize: 16, fontWeight: '600' },
    buttonLabelDisabled: { color: c.muted },
    linkButton: {
      marginTop: 8,
      paddingVertical: 12,
      alignItems: 'center',
    },
    linkText: {
      color: c.blue,
      fontSize: 15,
      fontWeight: '500',
      textAlign: 'center',
    },
    signupRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 28,
      paddingVertical: 8,
      flexWrap: 'wrap',
    },
    signupPrompt: { color: c.muted, fontSize: 15 },
    signupLink: { color: c.navy, fontSize: 15, fontWeight: '600' },
  });
}
