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
import {
  APP_LANGUAGES,
  DEFAULT_APP_LANGUAGE,
  type AppLanguage,
  languageOptionLabel,
} from '../../lib/i18n/languages';
import type { RecallionColors } from '../../lib/recallionTheme';

export default function RegisterScreen() {
  const { colors } = useRecallionTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { sendEmailOtp, session, loading, profileLoading } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [preferredLanguage, setPreferredLanguage] =
    useState<AppLanguage>(DEFAULT_APP_LANGUAGE);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const emailRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!loading && session && !profileLoading) {
      router.replace('/');
    }
  }, [loading, session, profileLoading]);

  async function onSubmit() {
    setError(null);
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError('Enter your email address.');
      return;
    }
    setSubmitting(true);
    const { error: err } = await sendEmailOtp(trimmedEmail, {
      createUser: true,
      fullName: fullName.trim() || undefined,
      preferredLanguage,
    });
    setSubmitting(false);
    if (err) {
      setError(err);
      return;
    }
    router.replace(`/verify-email?email=${encodeURIComponent(trimmedEmail)}`);
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
        <Text style={styles.hint}>We’ll email a one-time code to finish signing up.</Text>

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
          returnKeyType="go"
          submitBehavior="submit"
          onSubmitEditing={() => void onSubmit()}
        />

        <Text style={styles.fieldLabel}>Preferred language</Text>
        <Text style={styles.fieldHint}>English, Spanish, or French — change later in Settings.</Text>
        <View style={styles.languageRow}>
          {APP_LANGUAGES.map((opt) => {
            const selected = preferredLanguage === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => setPreferredLanguage(opt.value)}
                style={({ pressed }) => [
                  styles.languageChip,
                  selected && styles.languageChipSelected,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text
                  style={[styles.languageChipLabel, selected && styles.languageChipLabelSelected]}
                >
                  {languageOptionLabel(opt.value)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={() => void onSubmit()}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonLabel}>Email me a code</Text>
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
    card: { gap: 12 },
    logo: {
      width: 88,
      height: 88,
      borderRadius: 16,
      alignSelf: 'center',
      marginBottom: 4,
    },
    title: { fontSize: 26, fontWeight: '700', color: c.navy, marginBottom: 4 },
    hint: { fontSize: 15, color: c.muted, marginBottom: 8, lineHeight: 22 },
    fieldLabel: { marginTop: 4, fontSize: 14, fontWeight: '600', color: c.navy },
    fieldHint: { marginTop: 2, marginBottom: 8, fontSize: 13, color: c.muted, lineHeight: 18 },
    languageRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    languageChip: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.borderInput,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: c.bgCard,
    },
    languageChipSelected: {
      borderColor: c.blue,
      backgroundColor: 'rgba(14, 165, 233, 0.12)',
    },
    languageChipLabel: { fontSize: 14, fontWeight: '500', color: c.navy },
    languageChipLabelSelected: { color: c.blue, fontWeight: '600' },
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
    link: { marginTop: 16, textAlign: 'center', fontSize: 16, color: c.blue, fontWeight: '600' },
  });
}
