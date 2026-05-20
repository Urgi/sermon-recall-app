import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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
import { mapAuthError } from '../../lib/auth/mapAuthError';
import { queuePendingToast } from '../../lib/pendingToast';
import type { RecallionColors } from '../../lib/recallionTheme';
import { requireSupabase } from '../../lib/supabase';

const MIN_PASSWORD_LENGTH = 8;

export default function ResetPasswordScreen() {
  const { signOut } = useAuth();
  const { colors } = useRecallionTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    const supabase = requireSupabase();
    void supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(Boolean(session));
      setCheckingSession(false);
    });
  }, []);

  async function onSubmit() {
    setError(null);
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Use at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
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

  if (checkingSession) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator size="large" color={colors.blue} />
      </View>
    );
  }

  if (!hasSession) {
    return (
      <View style={styles.screen}>
        <Text style={styles.title}>Link expired</Text>
        <Text style={styles.hint}>
          Request a new password reset link from the forgot password screen.
        </Text>
        <Pressable style={styles.button} onPress={() => router.replace('/forgot-password')}>
          <Text style={styles.buttonLabel}>Forgot password</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.title}>New password</Text>
        <Text style={styles.hint}>Use at least {MIN_PASSWORD_LENGTH} characters.</Text>

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
    center: { alignItems: 'center' },
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
    button: {
      backgroundColor: c.ctaSolid,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 8,
    },
    buttonPressed: { opacity: 0.9 },
    buttonLabel: { color: '#fff', fontSize: 17, fontWeight: '600' },
  });
}
