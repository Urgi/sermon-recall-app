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

import { AuthBackButtonSlot } from '../../components/AuthBackButton';
import { KeyboardFormScreen } from '../../components/KeyboardFormScreen';

import { useAuth } from '../../contexts/AuthContext';
import { useRecallionTheme } from '../../contexts/ThemeContext';
import { ensurePublicUserProfile } from '../../lib/auth/ensurePublicProfile';
import { CONFIRMED_TOAST, USE_CODE_NOT_LINK_MESSAGE } from '../../lib/authToastMessages';
import { queuePendingToast } from '../../lib/pendingToast';
import type { RecallionColors } from '../../lib/recallionTheme';
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
  const styles = useMemo(() => createStyles(colors), [colors]);
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
      setError('Enter your email address.');
      return;
    }
    if (trimmedCode.length < 6) {
      setError('Enter the code from your email.');
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
      setResendNotice('Enter your email above first.');
      return;
    }
    setResendPending(true);
    setResendNotice(null);
    const { error: err } = await sendEmailOtp(email.trim().toLowerCase(), { createUser: true });
    setResendPending(false);
    setResendNotice(err ?? 'New code sent. Check your inbox and spam.');
  }

  const codeReady = code.trim().length >= 6 && email.trim().length > 0;
  const showEmailField = !initialEmail;

  return (
    <KeyboardFormScreen backgroundColor={colors.bgPage} centerContent={false}>
      <View style={styles.card}>
        <AuthBackButtonSlot href="/register" label="Back" />

        <Image
          source={require('../../assets/logo.png')}
          style={styles.logo}
          accessibilityLabel="Sermon Recall"
        />

        <Text style={styles.kicker}>Verification</Text>
        <Text style={styles.title}>Enter your code</Text>
        <Text style={styles.subtitle}>
          {email.trim()
            ? `We sent a code to ${email.trim().toLowerCase()}.`
            : 'Enter the one-time code from your email.'}
        </Text>

        {linkRejected ? (
          <View style={styles.noticeBox} accessibilityRole="alert">
            <Text style={styles.noticeBoxText}>{USE_CODE_NOT_LINK_MESSAGE}</Text>
          </View>
        ) : null}

        {showEmailField ? (
          <>
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
              returnKeyType="next"
              submitBehavior="submit"
              blurOnSubmit={false}
              onSubmitEditing={() => codeRef.current?.focus()}
            />
          </>
        ) : null}

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
          autoFocus={!showEmailField}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {resendNotice ? <Text style={styles.notice}>{resendNotice}</Text> : null}

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
              style={[styles.buttonLabel, (!codeReady || submitting) && styles.buttonLabelDisabled]}
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
          <Text style={styles.linkText}>{resendPending ? 'Sending…' : 'Resend code'}</Text>
        </Pressable>
      </View>
    </KeyboardFormScreen>
  );
}

function createStyles(c: RecallionColors) {
  return StyleSheet.create({
    card: { gap: 0, alignSelf: 'stretch' },
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
    noticeBox: {
      borderWidth: 1,
      borderColor: 'rgba(248, 113, 113, 0.65)',
      backgroundColor: '#4a1212',
      borderRadius: 14,
      padding: 14,
      marginBottom: 20,
    },
    noticeBoxText: { fontSize: 14, lineHeight: 20, color: '#fecaca' },
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
  });
}
