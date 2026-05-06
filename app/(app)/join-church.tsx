import { router } from 'expo-router';
import { useEffect, useState } from 'react';
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

export default function JoinChurchScreen() {
  const { joinChurch, signOut, profile } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (profile?.church_id) {
      router.replace('/home');
    }
  }, [profile?.church_id]);

  async function onSubmit() {
    setError(null);
    setSubmitting(true);
    const { error: err } = await joinChurch(code);
    setSubmitting(false);
    if (err) {
      setError(err);
      return;
    }
    router.replace('/home');
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Join your church</Text>
        <Text style={styles.hint}>
          Enter the church code your pastor shared (e.g. GRACE001 for the demo seed).
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Church code"
          autoCapitalize="characters"
          autoCorrect={false}
          value={code}
          onChangeText={setCode}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={onSubmit}
          disabled={submitting || !code.trim()}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonLabel}>Continue</Text>
          )}
        </Pressable>

        <Pressable onPress={() => signOut()} style={styles.outline}>
          <Text style={styles.outlineLabel}>Sign out</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f8f6f3',
  },
  card: {
    gap: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0f172a',
  },
  hint: {
    fontSize: 15,
    color: '#64748b',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 1,
    backgroundColor: '#fff',
  },
  error: {
    color: '#b91c1c',
    fontSize: 14,
  },
  button: {
    backgroundColor: '#1d4ed8',
    paddingVertical: 14,
    borderRadius: 10,
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
  outline: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  outlineLabel: {
    color: '#64748b',
    fontSize: 16,
  },
});
