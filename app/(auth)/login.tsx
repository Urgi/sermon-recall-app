import { Link, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
import { getAdminPortalUrl, PASTOR_CONFIRM_IN_BROWSER_MESSAGE } from '../../lib/auth/adminPortalUrl';
import type { RecallionColors } from '../../lib/recallionTheme';

function param(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default function LoginScreen() {
  const params = useLocalSearchParams<{
    confirmed?: string;
    error?: string;
  }>();
  const linkError = param(params.error);
  const showPastorBrowserHint =
    linkError === 'wrong_client' ||
    linkError === 'confirmation_failed' ||
    linkError === 'missing_auth_code';
  const { signIn, resendSignupConfirmation, session, loading } = useAuth();
  const { colors } = useRecallionTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [resendPending, setResendPending] = useState(false);
  const [resendNotice, setResendNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && session) {
      const delayMs = params.confirmed === '1' ? 3200 : 0;
      const id = setTimeout(() => router.replace('/'), delayMs);
      return () => clearTimeout(id);
    }
  }, [loading, session, params.confirmed]);

  async function onSubmit() {
    setError(null);
    setResendNotice(null);
    setShowResend(false);
    setSubmitting(true);
    const { error: err } = await signIn(email.trim(), password);
    setSubmitting(false);
    if (err) {
      setError(err);
      if (err.toLowerCase().includes('confirm')) {
        setShowResend(true);
      }
      return;
    }
    router.replace('/');
  }

  async function onResend() {
    if (!email.trim()) {
      setResendNotice('Enter your email above first.');
      return;
    }
    setResendPending(true);
    const { error: err } = await resendSignupConfirmation(email.trim());
    setResendPending(false);
    setResendNotice(err ?? 'Confirmation email sent. Check inbox and spam.');
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <Image
          source={require('../../assets/logo.png')}
          style={styles.logo}
          accessibilityLabel="Sermon Recall"
        />
        <Text style={styles.title}>Sign in</Text>
        <Text style={styles.hint}>Use the email you registered with.</Text>

        {showPastorBrowserHint ? (
          <View style={styles.linkErrorBox} accessibilityRole="alert">
            <Text style={styles.linkErrorTitle}>Confirm in your browser</Text>
            <Text style={styles.linkErrorBody}>
              {PASTOR_CONFIRM_IN_BROWSER_MESSAGE}
            </Text>
            <Text style={styles.linkErrorUrl}>{getAdminPortalUrl()}</Text>
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
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.muted}
          secureTextEntry
          autoComplete="password"
          value={password}
          onChangeText={setPassword}
        />

        <Link href="/forgot-password" style={styles.forgotLink}>
          Forgot password?
        </Link>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {showResend ? (
          <Pressable onPress={onResend} disabled={resendPending || submitting}>
            <Text style={styles.forgotLink}>
              {resendPending ? 'Sending…' : 'Resend confirmation email'}
            </Text>
          </Pressable>
        ) : null}
        {resendNotice ? <Text style={styles.notice}>{resendNotice}</Text> : null}

        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={onSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonLabel}>Continue</Text>
          )}
        </Pressable>

        <Link href="/register" style={styles.link}>
          Create an account
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
    logo: {
      width: 88,
      height: 88,
      borderRadius: 16,
      alignSelf: 'center',
      marginBottom: 4,
    },
    title: { fontSize: 26, fontWeight: '700', color: c.navy },
    hint: { fontSize: 15, color: c.muted, marginBottom: 8 },
    linkErrorBox: {
      borderWidth: 1,
      borderColor: 'rgba(248, 113, 113, 0.65)',
      backgroundColor: '#4a1212',
      borderRadius: 12,
      padding: 14,
      gap: 6,
    },
    linkErrorTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: '#fff1f2',
    },
    linkErrorBody: {
      fontSize: 14,
      lineHeight: 20,
      color: '#fecaca',
    },
    linkErrorUrl: {
      fontSize: 14,
      fontWeight: '600',
      color: '#7dd3fc',
    },
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
    forgotLink: { fontSize: 15, color: c.blue, fontWeight: '600', alignSelf: 'flex-start' },
    button: {
      backgroundColor: c.ctaSolid,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 8,
    },
    buttonPressed: { opacity: 0.9 },
    buttonLabel: { color: '#fff', fontSize: 17, fontWeight: '600' },
    link: { marginTop: 16, textAlign: 'center', fontSize: 16, color: c.blue, fontWeight: '600' },
  });
}
