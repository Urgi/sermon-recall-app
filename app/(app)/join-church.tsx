import { router, useLocalSearchParams } from 'expo-router';
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
import type { RecallionColors } from '../../lib/recallionTheme';

export default function JoinChurchScreen() {
  const { joinChurch, signOut, profile } = useAuth();
  const params = useLocalSearchParams<{ code?: string }>();
  const { colors } = useRecallionTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [code, setCode] = useState(() => {
    const raw = params.code;
    const value = Array.isArray(raw) ? raw[0] : raw;
    return value?.trim().toUpperCase() ?? '';
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (profile?.church_id) {
      router.replace('/home');
    }
  }, [profile?.church_id]);

  const dissolvedNotice = profile?.church_dissolved_notice?.trim();

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
        {dissolvedNotice ? (
          <View style={styles.noticeBox}>
            <Text style={styles.noticeTitle}>Your previous church</Text>
            <Text style={styles.noticeText}>{dissolvedNotice}</Text>
          </View>
        ) : (
          <Text style={styles.hint}>
            Enter the church code your pastor shared (e.g. GRACE001 for the demo seed).
          </Text>
        )}

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
    noticeBox: {
      padding: 14,
      borderRadius: c.radiusMd,
      borderWidth: 1,
      borderColor: 'rgba(251, 191, 36, 0.45)',
      backgroundColor: 'rgba(120, 53, 15, 0.2)',
      marginBottom: 4,
    },
    noticeTitle: { fontSize: 15, fontWeight: '600', color: '#fde68a' },
    noticeText: { marginTop: 8, fontSize: 14, color: '#fef3c7', lineHeight: 20 },
    input: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.borderInput,
      borderRadius: c.radiusMd,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 18,
      fontWeight: '600',
      letterSpacing: 1,
      color: c.navy,
      backgroundColor: c.bgCard,
    },
    error: { color: '#b91c1c', fontSize: 14 },
    button: {
      backgroundColor: c.ctaSolid,
      paddingVertical: 14,
      borderRadius: c.radiusMd,
      alignItems: 'center',
      marginTop: 8,
    },
    buttonPressed: { opacity: 0.9 },
    buttonLabel: { color: '#fff', fontSize: 17, fontWeight: '600' },
    outline: { marginTop: 12, paddingVertical: 12, alignItems: 'center' },
    outlineLabel: { color: c.muted, fontSize: 16 },
  });
}
