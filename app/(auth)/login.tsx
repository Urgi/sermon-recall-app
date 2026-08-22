import { Link, router, useLocalSearchParams } from 'expo-router';
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

  return (
    <KeyboardFormScreen backgroundColor={colors.bgPage}>
      <View style={styles.card}>
        <Image
          source={require('../../assets/logo.png')}
          style={styles.logo}
          accessibilityLabel="Sermon Recall"
        />
        <Text style={styles.title}>Sign in</Text>
        <Text style={styles.hint}>
          {step === 'email'
            ? 'We’ll email you a one-time code — no password needed.'
            : `Enter the code we sent to ${email.trim().toLowerCase()}.`}
        </Text>

        {showUseCodeHint ? (
          <View style={styles.linkErrorBox} accessibilityRole="alert">
            <Text style={styles.linkErrorTitle}>Use your email code</Text>
            <Text style={styles.linkErrorBody}>{USE_CODE_NOT_LINK_MESSAGE}</Text>
          </View>
        ) : null}

        {step === 'email' ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="Email"
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
              style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
              onPress={() => void onSendCode()}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonLabel}>Email me a code</Text>
              )}
            </Pressable>
          </>
        ) : (
          <>
            <TextInput
              ref={codeRef}
              style={[styles.input, styles.codeInput]}
              placeholder="Sign-in code"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="numbers-and-punctuation"
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              maxLength={8}
              value={code}
              onChangeText={(t) => setCode(t.replace(/\D/g, ''))}
              returnKeyType="go"
              submitBehavior="submit"
              onSubmitEditing={() => void onVerify()}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {notice ? <Text style={styles.notice}>{notice}</Text> : null}
            <Pressable
              style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
              onPress={() => void onVerify()}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonLabel}>Verify & sign in</Text>
              )}
            </Pressable>
            <Pressable onPress={() => void onResend()} disabled={resendPending || submitting}>
              <Text style={styles.secondaryLink}>
                {resendPending ? 'Sending…' : 'Resend code'}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setStep('email');
                setCode('');
                setError(null);
                setNotice(null);
              }}
            >
              <Text style={styles.secondaryLink}>Use a different email</Text>
            </Pressable>
          </>
        )}

        <Link href="/register" style={styles.link}>
          Create an account
        </Link>
      </View>
    </KeyboardFormScreen>
  );
}

function createStyles(c: RecallionColors) {
  return StyleSheet.create({
    card: { gap: 12 },
    logo: {
      width: 88,
      height: 88,
      borderRadius: 16,
      alignSelf: 'center',
      marginBottom: 4,
    },
    title: { fontSize: 26, fontWeight: '700', color: c.navy },
    hint: { fontSize: 15, color: c.muted, marginBottom: 8, lineHeight: 22 },
    linkErrorBox: {
      borderWidth: 1,
      borderColor: 'rgba(248, 113, 113, 0.65)',
      backgroundColor: '#4a1212',
      borderRadius: 12,
      padding: 14,
      gap: 6,
    },
    linkErrorTitle: { fontSize: 15, fontWeight: '700', color: '#fff1f2' },
    linkErrorBody: { fontSize: 14, lineHeight: 20, color: '#fecaca' },
    input: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.borderInput,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 16,
      color: c.navy,
      backgroundColor: c.bgCard,
    },
    codeInput: {
      fontSize: 18,
      letterSpacing: 4,
      fontVariant: ['tabular-nums'],
    },
    error: { color: '#fca5a5', fontSize: 14 },
    notice: { color: '#86efac', fontSize: 14 },
    button: {
      backgroundColor: c.ctaSolid,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 8,
    },
    buttonPressed: { opacity: 0.9 },
    buttonLabel: { color: '#fff', fontSize: 17, fontWeight: '600' },
    secondaryLink: {
      marginTop: 4,
      textAlign: 'center',
      fontSize: 15,
      color: c.blue,
      fontWeight: '600',
    },
    link: { marginTop: 16, textAlign: 'center', fontSize: 16, color: c.blue, fontWeight: '600' },
  });
}
