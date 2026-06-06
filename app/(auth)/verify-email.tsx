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
  const { verifySignupOtp, resendSignupConfirmation, session, loading } = useAuth();
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
    if (!loading && session) {
      router.replace('/?confirmed=1');
    }
  }, [loading, session]);

  async function onVerify() {
    setError(null);
    setResendNotice(null);
    const trimmedEmail = email.trim();
    const trimmedCode = code.trim();
    if (!trimmedEmail) {
      setError('Enter the email you registered with.');
      return;
    }
    if (trimmedCode.length < 6) {
      setError('Enter the confirmation code from your email.');
      return;
    }
    setSubmitting(true);
    const supabase = requireSupabase();
    const { error: err } = await verifySignupOtp(trimmedEmail, trimmedCode);
    if (err) {
      setSubmitting(false);
      setError(err);
      return;
    }
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) {
      await ensurePublicUserProfile(supabase, session.user);
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
    const { error: err } = await resendSignupConfirmation(email.trim());
    setResendPending(false);
    setResendNotice(err ?? 'New code sent. Check your inbox and spam.');
  }

  return (
    <KeyboardFormScreen backgroundColor={colors.bgPage}>
      <View style={styles.card}>
        <Image
          source={require('../../assets/logo.png')}
          style={styles.logo}
          accessibilityLabel="Sermon Recall"
        />
        <Text style={styles.title}>Confirm your email</Text>
        <Text style={styles.hint}>
          Enter the confirmation code from your email. Links in that email cannot confirm your
          account — the code is required.
        </Text>

        {linkRejected ? (
          <View style={styles.noticeBox} accessibilityRole="alert">
            <Text style={styles.noticeBoxText}>{USE_CODE_NOT_LINK_MESSAGE}</Text>
          </View>
        ) : null}

        <TextInput
          style={styles.input}
          placeholder="Email"
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
        <TextInput
          ref={codeRef}
          style={styles.input}
          placeholder="Confirmation code"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          maxLength={8}
          value={code}
          onChangeText={setCode}
          returnKeyType="done"
          submitBehavior="submit"
          onSubmitEditing={() => void onVerify()}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {resendNotice ? <Text style={styles.notice}>{resendNotice}</Text> : null}

        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={onVerify}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonLabel}>Confirm email</Text>
          )}
        </Pressable>

        <Pressable onPress={onResend} disabled={resendPending || submitting}>
          <Text style={styles.link}>
            {resendPending ? 'Sending…' : 'Resend confirmation code'}
          </Text>
        </Pressable>

        <Link href="/login" style={styles.link}>
          Back to sign in
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
    error: { color: '#fca5a5', fontSize: 14 },
    notice: { color: '#86efac', fontSize: 14 },
    noticeBox: {
      borderWidth: 1,
      borderColor: 'rgba(248, 113, 113, 0.65)',
      backgroundColor: '#4a1212',
      borderRadius: 12,
      padding: 14,
    },
    noticeBoxText: {
      fontSize: 14,
      lineHeight: 20,
      color: '#fecaca',
    },
    button: {
      backgroundColor: c.ctaSolid,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 8,
    },
    buttonPressed: { opacity: 0.9 },
    buttonLabel: { color: '#fff', fontSize: 17, fontWeight: '600' },
    link: { marginTop: 8, textAlign: 'center', fontSize: 16, color: c.blue, fontWeight: '600' },
  });
}
