import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DeleteAccountPanel } from '../../components/DeleteAccountPanel';
import { AppMenu } from '../../components/AppMenu';
import { DevotionalReminderSettings } from '../../components/DevotionalReminderSettings';
import { LeaveChurchPanel } from '../../components/LeaveChurchPanel';
import { useAuth } from '../../contexts/AuthContext';
import { useRecallionTheme } from '../../contexts/ThemeContext';
import {
  APP_LANGUAGES,
  type AppLanguage,
  languageOptionLabel,
  normalizeAppLanguage,
} from '../../lib/i18n/languages';
import type { RecallionColors, ThemePreference } from '../../lib/recallionTheme';

const OPTIONS: { value: ThemePreference; label: string; description: string }[] = [
  { value: 'dark', label: 'Dark', description: 'Deep slate background (default).' },
  { value: 'light', label: 'Bright', description: 'Light background for daytime reading.' },
  { value: 'system', label: 'System', description: 'Follow your device appearance.' },
];

export default function SettingsScreen() {
  const { profile, refreshProfile, updatePreferredLanguage } = useAuth();
  const { colors, preference, resolved, setPreference } = useRecallionTheme();
  const styles = useMemo(() => createStyles(colors, resolved), [colors, resolved]);
  const [languagePending, setLanguagePending] = useState(false);
  const [languageError, setLanguageError] = useState<string | null>(null);

  const selectedLanguage = normalizeAppLanguage(profile?.preferred_language);

  async function onSelectLanguage(value: AppLanguage) {
    if (value === selectedLanguage || languagePending) return;
    setLanguageError(null);
    setLanguagePending(true);
    const { error } = await updatePreferredLanguage(value);
    setLanguagePending(false);
    if (error) setLanguageError(error);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
        >
          <Text style={styles.backLabel}>← Back</Text>
        </Pressable>
        <AppMenu />
      </View>
      <Text style={styles.title}>Settings</Text>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        {profile?.church_id ? (
          <>
            <Text style={styles.sectionTitle}>Devotional reminders</Text>
            <DevotionalReminderSettings
              userId={profile.id}
              notifyHour={profile.devotional_notify_hour}
              notifyEnabled={profile.devotional_notify_enabled}
              onUpdated={() => void refreshProfile()}
            />
          </>
        ) : null}

        <Text style={[styles.sectionTitle, profile?.church_id ? styles.sectionAfterBlock : null]}>
          Language
        </Text>
        <Text style={styles.sectionHint}>
          Prefer English, Spanish, or French. Church content language is set by your pastor.
        </Text>
        {APP_LANGUAGES.map((opt) => {
          const selected = selectedLanguage === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => void onSelectLanguage(opt.value)}
              disabled={languagePending}
              style={({ pressed }) => [
                styles.option,
                selected && styles.optionSelected,
                pressed && styles.pressed,
              ]}
            >
              <View style={[styles.radio, selected && styles.radioSelected]} />
              <View style={styles.optionText}>
                <Text style={styles.optionLabel}>{languageOptionLabel(opt.value)}</Text>
              </View>
            </Pressable>
          );
        })}
        {languageError ? <Text style={styles.error}>{languageError}</Text> : null}

        <Text style={[styles.sectionTitle, styles.sectionAfterBlock]}>Appearance</Text>
        <Text style={styles.sectionHint}>Currently using {resolved} mode on this device.</Text>
        {OPTIONS.map((opt) => {
          const selected = preference === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => setPreference(opt.value)}
              style={({ pressed }) => [
                styles.option,
                selected && styles.optionSelected,
                pressed && styles.pressed,
              ]}
            >
              <View style={[styles.radio, selected && styles.radioSelected]} />
              <View style={styles.optionText}>
                <Text style={styles.optionLabel}>{opt.label}</Text>
                <Text style={styles.optionDesc}>{opt.description}</Text>
              </View>
            </Pressable>
          );
        })}

        <LeaveChurchPanel />

        <DeleteAccountPanel />
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: RecallionColors, resolved: 'light' | 'dark') {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bgPage },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingBottom: 4,
    },
    backBtn: { paddingVertical: 8 },
    backLabel: { fontSize: 16, color: colors.blue, fontWeight: '500' },
    title: { marginTop: 4, paddingHorizontal: 20, fontSize: 28, fontWeight: '700', color: colors.navy },
    scroll: { paddingHorizontal: 20, paddingBottom: 32 },
    sectionTitle: { marginTop: 8, fontSize: 18, fontWeight: '600', color: colors.navy },
    sectionAfterBlock: { marginTop: 28 },
    sectionHint: { marginTop: 6, marginBottom: 16, fontSize: 15, color: colors.muted, lineHeight: 22 },
    option: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      marginBottom: 10,
      padding: 16,
      borderRadius: colors.radiusMd,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderSubtle,
      backgroundColor: colors.bgCard,
    },
    optionSelected: {
      borderColor: colors.blue,
      backgroundColor: resolved === 'light' ? 'rgba(14, 165, 233, 0.08)' : 'rgba(56, 189, 248, 0.1)',
    },
    radio: {
      marginTop: 3,
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 2,
      borderColor: colors.muted,
    },
    radioSelected: { borderColor: colors.blue, backgroundColor: colors.blue },
    optionText: { flex: 1 },
    optionLabel: { fontSize: 16, fontWeight: '600', color: colors.navy },
    optionDesc: { marginTop: 4, fontSize: 14, color: colors.muted, lineHeight: 20 },
    error: { marginBottom: 12, fontSize: 14, color: '#fca5a5' },
    pressed: { opacity: 0.85 },
  });
}
