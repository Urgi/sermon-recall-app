import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DeleteAccountPanel } from '../../../components/DeleteAccountPanel';
import { DevotionalReminderSettings } from '../../../components/DevotionalReminderSettings';
import { LeaveChurchPanel } from '../../../components/LeaveChurchPanel';
import { useAuth } from '../../../contexts/AuthContext';
import { useRecallionTheme } from '../../../contexts/ThemeContext';
import {
  APP_LANGUAGES,
  type AppLanguage,
  languageOptionLabel,
  normalizeAppLanguage,
} from '../../../lib/i18n/languages';
import type { RecallionColors, ThemePreference } from '../../../lib/recallionTheme';

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
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKeyboardHeight(e.endCoordinates.height),
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

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
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <Text style={styles.kicker}>Preferences</Text>
      <Text style={styles.title}>Settings</Text>

      <ScrollView
        ref={scrollRef}
        style={styles.flex}
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: Math.max(64, keyboardHeight + 48) },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
        contentInsetAdjustmentBehavior="automatic"
      >
        {profile?.church_id ? (
          <>
            <Text style={styles.sectionTitle}>Devotional reminders</Text>
            <DevotionalReminderSettings
              userId={profile.id}
              notifyHour={
                typeof profile.devotional_notify_hour === 'number'
                  ? profile.devotional_notify_hour
                  : null
              }
              notifyEnabled={
                typeof profile.devotional_notify_enabled === 'boolean'
                  ? profile.devotional_notify_enabled
                  : null
              }
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

        <DeleteAccountPanel scrollRef={scrollRef} />
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: RecallionColors, resolved: 'light' | 'dark') {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bgPage },
    flex: { flex: 1 },
    kicker: {
      marginTop: 8,
      paddingHorizontal: 20,
      fontSize: 12,
      letterSpacing: 1.4,
      textTransform: 'uppercase',
      color: colors.blue,
      fontWeight: '600',
    },
    title: {
      marginTop: 6,
      paddingHorizontal: 20,
      marginBottom: 8,
      fontSize: 32,
      fontWeight: '700',
      color: colors.navy,
      letterSpacing: -0.3,
    },
    scroll: { paddingHorizontal: 20 },
    sectionTitle: { marginTop: 8, fontSize: 18, fontWeight: '600', color: colors.navy },
    sectionAfterBlock: { marginTop: 28 },
    sectionHint: {
      marginTop: 6,
      marginBottom: 16,
      fontSize: 15,
      color: colors.muted,
      lineHeight: 22,
    },
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
      backgroundColor:
        resolved === 'light' ? 'rgba(14, 165, 233, 0.08)' : 'rgba(56, 189, 248, 0.1)',
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
