import { Link, router } from 'expo-router';
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
import { queuePendingToast } from '../../lib/pendingToast';
import type { RecallionColors } from '../../lib/recallionTheme';

export default function RegisterScreen() {
  const { colors } = useRecallionTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { signUp, session, loading } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!loading && session) {
      router.replace('/');
    }
  }, [loading, session]);

  async function onSubmit() {
    setError(null);
    if (password.length < 8) {
      setError('Use at least 8 characters for the password.');
      return;
    }
    setSubmitting(true);
    const { error: err, needsEmailConfirmation } = await signUp(
      email.trim(),
      password,
      fullName.trim() || undefined,
    );
    setSubmitting(false);
    if (err) {
      setError(err);
      return;
    }
    if (needsEmailConfirmation) {
      router.replace(`/verify-email?email=${encodeURIComponent(email.trim())}`);
      return;
    }
    await queuePendingToast({
      variant: 'success',
      message: 'Account created. Taking you into the app…',
    });
    router.replace('/');
  }

  return (
    <KeyboardFormScreen backgroundColor={colors.bgPage}>
      <View style={styles.card}>
        <Image
          source={require('../../assets/logo.png')}
          style={styles.logo}
          accessibilityLabel="Sermon Recall"
        />
        <Text style={styles.title}>Create account</Text>

        <TextInput
          style={styles.input}
          placeholder="Full name (optional)"
          placeholderTextColor={colors.muted}
          autoComplete="name"
          value={fullName}
          onChangeText={setFullName}
          returnKeyType="next"
          submitBehavior="submit"
          blurOnSubmit={false}
          onSubmitEditing={() => emailRef.current?.focus()}
        />
        <TextInput
          ref={emailRef}
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
          onSubmitEditing={() => passwordRef.current?.focus()}
        />
        <TextInput
          ref={passwordRef}
          style={styles.input}
          placeholder="Password (8+ characters)"
          placeholderTextColor={colors.muted}
          secureTextEntry
          autoComplete="new-password"
          value={password}
          onChangeText={setPassword}
          returnKeyType="done"
          submitBehavior="submit"
          onSubmitEditing={() => void onSubmit()}
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
            <Text style={styles.buttonLabel}>Sign up</Text>
          )}
        </Pressable>

        <Link href="/login" style={styles.link}>
          Already have an account? Sign in
        </Link>
      </View>
    </KeyboardFormScreen>
  );
}

function createStyles(c: RecallionColors) {
  return StyleSheet.create({
  card: {
    gap: 12,
  },
  logo: {
    width: 88,
    height: 88,
    borderRadius: 16,
    alignSelf: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: c.navy,
    marginBottom: 8,
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
  error: {
    color: '#fca5a5',
    fontSize: 14,
  },
  button: {
    backgroundColor: c.ctaSolid,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonLabel: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  link: {
    marginTop: 16,
    textAlign: 'center',
    fontSize: 16,
    color: c.blue,
    fontWeight: '600',
  },
});
}