import { router } from 'expo-router';
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
    <KeyboardFormScreen backgroundColor={colors.bgPage} centerContent={false}>
      <View style={styles.card}>
        <Image
          source={require('../../assets/logo.png')}
          style={styles.logo}
          accessibilityLabel="Sermon Recall"
        />
        <Text style={styles.kicker}>Get started</Text>
        <Text style={styles.title}>Create account</Text>
        <Text style={styles.hint}>We’ll email a one-time code to finish signing up.</Text>

        <Text style={styles.fieldLabel}>Full name</Text>
        <TextInput
          style={styles.input}
          placeholder="Optional"
          placeholderTextColor={colors.muted}
          autoComplete="name"
          value={fullName}
          onChangeText={setFullName}
          returnKeyType="next"
          submitBehavior="submit"
          blurOnSubmit={false}
          onSubmitEditing={() => emailRef.current?.focus()}
        />
        <Text style={styles.fieldLabel}>Email</Text>
        <TextInput
          ref={emailRef}
          style={styles.input}
          placeholder="Email address"
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
          style={({ pressed }) => [
            styles.button,
            (!email.trim() || submitting) && styles.buttonDisabled,
            pressed && email.trim() && !submitting && styles.buttonPressed,
          ]}
          onPress={() => void onSubmit()}
          disabled={!email.trim() || submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text
              style={[
                styles.buttonLabel,
                (!email.trim() || submitting) && styles.buttonLabelDisabled,
              ]}
            >
              Email me a code
            </Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => router.push('/login')}
          style={styles.signupRow}
          accessibilityRole="button"
          accessibilityLabel="Sign in"
        >
          <Text style={styles.signupPrompt}>Already have an account? </Text>
          <Text style={styles.signupLink}>Sign in</Text>
        </Pressable>
      </View>
    </KeyboardFormScreen>
  );
}

function createStyles(c: RecallionColors) {
  return StyleSheet.create({
    card: { gap: 0, alignSelf: 'stretch' },
    logo: {
      width: 72,
      height: 72,
      borderRadius: 16,
      alignSelf: 'flex-start',
      marginBottom: 20,
    },
    kicker: {
      fontSize: 12,
      letterSpacing: 1.6,
      textTransform: 'uppercase',
      color: c.blue,
      fontWeight: '600',
      marginBottom: 10,
    },
    title: {
      fontSize: 32,
      fontWeight: '700',
      color: c.navy,
      marginBottom: 10,
      lineHeight: 38,
    },
    hint: { fontSize: 16, color: c.muted, marginBottom: 28, lineHeight: 24 },
    fieldLabel: { fontSize: 13, fontWeight: '600', color: c.navy, marginBottom: 8 },
    fieldHint: { marginBottom: 10, fontSize: 13, color: c.muted, lineHeight: 18 },
    languageRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    languageChip: {
      borderWidth: 1,
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
      borderWidth: 1,
      borderColor: c.borderInput,
      borderRadius: 14,
      paddingHorizontal: 16,
      minHeight: 56,
      fontSize: 16,
      color: c.navy,
      backgroundColor: c.bgCard,
      marginBottom: 16,
    },
    error: { color: '#fca5a5', fontSize: 14, marginBottom: 12 },
    button: {
      backgroundColor: c.ctaSolid,
      paddingVertical: 16,
      borderRadius: 50,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 54,
    },
    buttonDisabled: {
      backgroundColor: c.bgCard,
      borderWidth: 1,
      borderColor: c.borderInput,
    },
    buttonPressed: { opacity: 0.9 },
    buttonLabel: { color: '#fff', fontSize: 16, fontWeight: '600' },
    buttonLabelDisabled: { color: c.muted },
    signupRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 28,
      paddingVertical: 8,
      flexWrap: 'wrap',
    },
    signupPrompt: { color: c.muted, fontSize: 15 },
    signupLink: { color: c.navy, fontSize: 15, fontWeight: '600' },
  });
}
