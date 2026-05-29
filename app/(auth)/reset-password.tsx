import { Link, router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '../../contexts/AuthContext';
import { useRecallionTheme } from '../../contexts/ThemeContext';
import { USE_RESET_CODE_NOT_LINK_MESSAGE } from '../../lib/authToastMessages';
import { mapAuthError } from '../../lib/auth/mapAuthError';
import { queuePendingToast } from '../../lib/pendingToast';
import type { RecallionColors } from '../../lib/recallionTheme';
import { requireSupabase } from '../../lib/supabase';

const MIN_PASSWORD_LENGTH = 8;

function param(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ email?: string | string[]; error?: string | string[] }>();
  const initialEmail = param(params.email) ?? '';
  const linkRejected = param(params.error) === 'use_code';
  const { resetPasswordForEmail, verifyRecoveryOtp, signOut } = useAuth();
  const { colors } = useRecallionTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resendPending, setResendPending] = useState(false);
  const [resendNotice, setResendNotice] = useState<string | null>(null);

  async function onResend() {
    if (!email.trim()) {
      setResendNotice('Enter your email above first.');
      return;
    }
    setResendPending(true);
    setResendNotice(null);
    const { error: err } = await resetPasswordForEmail(email.trim());
    setResendPending(false);
    setResendNotice(err ?? 'New reset code sent. Check inbox and spam.');
  }

  async function onSubmit() {
    setError(null);
    setResendNotice(null);
    const trimmedEmail = email.trim();
    const trimmedCode = code.trim();
    if (!trimmedEmail) {
      setError('Enter your email address.');
      return;
    }
    if (trimmedCode.length < 6) {
      setError('Enter the reset code from your email.');
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Use at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    const { error: verifyErr } = await verifyRecoveryOtp(trimmedEmail, trimmedCode);
    if (verifyErr) {
      setSubmitting(false);
      setError(verifyErr);
      return;
    }

    const supabase = requireSupabase();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (updateError) {
      setError(mapAuthError(updateError.message));
      return;
    }

    await queuePendingToast({
      variant: 'success',
      message: 'Password updated. Sign in with your new password.',
    });
    await signOut();
    router.replace('/login');
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.title}>New password</Text>
        <Text style={styles.hint}>
          Enter the reset code from your email, then choose a new password. Email links cannot reset
          your password — the code is required.
        </Text>

        {linkRejected ? (
          <View style={styles.noticeBox} accessibilityRole="alert">
            <Text style={styles.noticeBoxText}>{USE_RESET_CODE_NOT_LINK_MESSAGE}</Text>
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
          editable={!submitting}
        />
        <TextInput
          style={[styles.input, styles.codeInput]}
          placeholder="Reset code"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          maxLength={8}
          value={code}
          onChangeText={setCode}
          editable={!submitting}
        />
        <TextInput
          style={styles.input}
          placeholder="New password"
          placeholderTextColor={colors.muted}
          secureTextEntry
          autoComplete="new-password"
          value={password}
          onChangeText={setPassword}
          editable={!submitting}
        />
        <TextInput
          style={styles.input}
          placeholder="Confirm password"
          placeholderTextColor={colors.muted}
          secureTextEntry
          autoComplete="new-password"
          value={confirm}
          onChangeText={setConfirm}
          editable={!submitting}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {resendNotice ? <Text style={styles.notice}>{resendNotice}</Text> : null}

        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={onSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonLabel}>Update password</Text>
          )}
        </Pressable>

        <Pressable onPress={onResend} disabled={resendPending || submitting}>
          <Text style={styles.link}>{resendPending ? 'Sending…' : 'Resend reset code'}</Text>
        </Pressable>

        <Link href="/login" style={styles.link}>
          Back to sign in
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

function createStyles(c: RecallionColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      justifyContent: 'center',
      padding: 24,
      backgroundColor: c.bgPage,
    },
    card: { gap: 12 },
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
    codeInput: {
      fontSize: 18,
      letterSpacing: 4,
      fontVariant: ['tabular-nums'],
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
