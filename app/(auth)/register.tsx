import { Link, router } from 'expo-router';
import { useEffect, useState } from 'react';
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
import { recallion } from '../../lib/recallionTheme';

export default function RegisterScreen() {
  const { signUp, session, loading } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && session) {
      router.replace('/');
    }
  }, [loading, session]);

  async function onSubmit() {
    setError(null);
    setInfo(null);
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
      setInfo('Check your email to confirm your account, then sign in.');
      return;
    }
    router.replace('/');
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
        <Text style={styles.title}>Create account</Text>

        <TextInput
          style={styles.input}
          placeholder="Full name (optional)"
          placeholderTextColor={recallion.muted}
          autoComplete="name"
          value={fullName}
          onChangeText={setFullName}
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={recallion.muted}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password (8+ characters)"
          placeholderTextColor={recallion.muted}
          secureTextEntry
          autoComplete="new-password"
          value={password}
          onChangeText={setPassword}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {info ? <Text style={styles.info}>{info}</Text> : null}

        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={onSubmit}
          disabled={submitting || Boolean(info)}
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: recallion.bgPage,
  },
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
    color: recallion.navy,
    marginBottom: 8,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: recallion.borderInput,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: recallion.navy,
    backgroundColor: recallion.bgCard,
  },
  error: {
    color: '#fca5a5',
    fontSize: 14,
  },
  info: {
    color: '#86efac',
    fontSize: 14,
  },
  button: {
    backgroundColor: recallion.ctaSolid,
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
    color: recallion.blue,
    fontWeight: '600',
  },
});
