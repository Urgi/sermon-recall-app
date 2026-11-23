import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { BrandMark } from '../../components/Brand';
import { FadeInView } from '../../components/FadeInView';
import { KeyboardFormScreen } from '../../components/KeyboardFormScreen';

import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/I18nContext';
import { useRecallionTheme } from '../../contexts/ThemeContext';
import { createAuthFormStyles } from '../../lib/authFormStyles';
import type { RecallionColors } from '../../lib/recallionTheme';

export default function JoinChurchScreen() {
  const { joinChurch, signOut, profile, profileLoading, session } = useAuth();
  const params = useLocalSearchParams<{ code?: string }>();
  const { colors } = useRecallionTheme();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const form = useMemo(() => createAuthFormStyles(colors), [colors]);
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

  const dissolvedNotice =
    typeof profile?.church_dissolved_notice === 'string'
      ? profile.church_dissolved_notice.trim()
      : '';

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

  const ready = code.trim().length > 0 && !submitting;

  if (session && profileLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.blue} />
      </View>
    );
  }

  return (
    <KeyboardFormScreen backgroundColor={colors.bgPage}>
      <FadeInView style={form.card}>
        <BrandMark height={64} style={styles.mark} />
        <Text style={form.title} accessibilityRole="header">
          {t('join.title')}
        </Text>
        {dissolvedNotice ? (
          <View style={styles.noticeBox} accessibilityRole="alert">
            <Text style={styles.noticeTitle}>{t('join.previousChurch')}</Text>
            <Text style={styles.noticeText}>{dissolvedNotice}</Text>
          </View>
        ) : (
          <Text style={form.subtitle}>{t('join.hint')}</Text>
        )}

        <TextInput
          style={[form.input, styles.codeInput]}
          placeholder={t('join.codePlaceholder')}
          placeholderTextColor={colors.muted}
          accessibilityLabel={t('join.codePlaceholder')}
          autoCapitalize="characters"
          autoCorrect={false}
          value={code}
          onChangeText={setCode}
          returnKeyType="go"
          submitBehavior="submit"
          onSubmitEditing={() => void onSubmit()}
        />

        {error ? (
          <Text style={form.error} accessibilityRole="alert">
            {error}
          </Text>
        ) : null}

        <Pressable
          style={({ pressed }) => [
            form.button,
            !ready && form.buttonDisabled,
            pressed && ready && form.pressed,
          ]}
          onPress={() => void onSubmit()}
          disabled={!ready}
          accessibilityRole="button"
          accessibilityState={{ disabled: !ready, busy: submitting }}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={[form.buttonLabel, !ready && form.buttonLabelDisabled]}>
              {t('join.continue')}
            </Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => signOut()}
          style={({ pressed }) => [form.linkButton, styles.signOut, pressed && form.pressed]}
          accessibilityRole="button"
        >
          <Text style={styles.signOutLabel}>{t('join.signOut')}</Text>
        </Pressable>
      </FadeInView>
    </KeyboardFormScreen>
  );
}

function createStyles(c: RecallionColors) {
  return StyleSheet.create({
    loading: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: c.bgPage,
    },
    noticeBox: {
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.warningBorder,
      backgroundColor: c.warningSoft,
      marginBottom: 24,
    },
    noticeTitle: { fontSize: 15, fontWeight: '700', color: c.warning },
    noticeText: { marginTop: 6, fontSize: 14, color: c.navyMid, lineHeight: 20 },
    codeInput: { fontSize: 18, fontWeight: '600', letterSpacing: 1.5 },
    mark: { marginBottom: 20 },
    signOut: { marginTop: 16 },
    signOutLabel: { color: c.muted, fontSize: 15, fontWeight: '600' },
  });
}
