import { Link, router } from 'expo-router';
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
import { PASSWORD_RESET_SENT_TOAST } from '../../lib/authToastMessages';
import { queuePendingToast } from '../../lib/pendingToast';
import type { RecallionColors } from '../../lib/recallionTheme';

export default function ForgotPasswordScreen() {
  const { resetPasswordForEmail } = useAuth();
  const { colors } = useRecallionTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit() {
    setError(null);
    if (!email.trim()) {
      setError('Enter your email address.');
      return;
    }
    setSubmitting(true);
    const { error: err } = await resetPasswordForEmail(email.trim());
    setSubmitting(false);
    if (err) {
      setError(err);
      return;
    }
    setSent(true);
    await queuePendingToast({ variant: 'success', message: PASSWORD_RESET_SENT_TOAST });
    router.replace('/login');
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Reset password</Text>
        <Text style={styles.hint}>
          We will email you a link to choose a new password if an account exists for this address.
        </Text>

        {sent ? (
          <Text style={styles.success}>Check your email for the reset link.</Text>
        ) : (
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
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {!sent ? (
          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            onPress={onSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonLabel}>Send reset link</Text>
            )}
          </Pressable>
        ) : null}

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
    hint: { fontSize: 15, color: c.muted, marginBottom: 8 },
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
    success: { color: '#86efac', fontSize: 14 },
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
