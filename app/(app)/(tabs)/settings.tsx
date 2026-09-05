import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DeleteAccountPanel } from '../../../components/DeleteAccountPanel';
import { DevotionalReminderSettings } from '../../../components/DevotionalReminderSettings';
import { LeaveChurchPanel } from '../../../components/LeaveChurchPanel';
import { ScreenBackdrop } from '../../../components/ScreenBackdrop';
import { SettingsPanelModal } from '../../../components/SettingsPanelModal';
import { useAuth } from '../../../contexts/AuthContext';
import { useRecallionTheme } from '../../../contexts/ThemeContext';
import {
  APP_LANGUAGES,
  type AppLanguage,
  languageOptionLabel,
  normalizeAppLanguage,
} from '../../../lib/i18n/languages';
import { formatReminderHour24 } from '../../../lib/reminderTime';
import {
  cardShadowStyle,
  type RecallionColors,
  type ThemePreference,
} from '../../../lib/recallionTheme';
import { greetingFirstName } from '../../../lib/sermonHomeStatus';
import { supabase } from '../../../lib/supabase';

type IoniconName = ComponentProps<typeof Ionicons>['name'];
type Panel = 'notifications' | 'language' | 'display' | 'account' | null;

const APPEARANCE_OPTIONS: {
  value: ThemePreference;
  label: string;
  description: string;
}[] = [
  { value: 'dark', label: 'Dark', description: 'Deep slate for evening reading.' },
  { value: 'light', label: 'Bright', description: 'Soft daylight sky and paper cards.' },
  { value: 'system', label: 'System', description: 'Follow your device appearance.' },
];

export default function SettingsScreen() {
  const { session, profile, refreshProfile, updatePreferredLanguage, signOut } = useAuth();
  const { colors, preference, resolved, setPreference } = useRecallionTheme();
  const styles = useMemo(() => createStyles(colors, resolved), [colors, resolved]);
  const [panel, setPanel] = useState<Panel>(null);
  const [languagePending, setLanguagePending] = useState(false);
  const [languageError, setLanguageError] = useState<string | null>(null);
  const [churchName, setChurchName] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const displayName = greetingFirstName(profile?.full_name, session?.user?.email);
  const email = session?.user?.email ?? '';
  const roleLabel = formatRole(profile?.role);
  const selectedLanguage = normalizeAppLanguage(profile?.preferred_language);

  const reminderSubtitle = !profile?.church_id
    ? 'Join a church to enable reminders'
    : profile.devotional_notify_enabled === false
      ? 'Off'
      : typeof profile.devotional_notify_hour === 'number'
        ? formatReminderHour24(profile.devotional_notify_hour)
        : 'Defaults · morning & midday';

  const appearanceSubtitle =
    preference === 'system'
      ? `System (${resolved})`
      : preference === 'dark'
        ? 'Dark'
        : 'Bright';

  const loadChurch = useCallback(async () => {
    if (!supabase || !profile?.church_id) {
      setChurchName(null);
      return;
    }
    const { data } = await supabase
      .from('churches')
      .select('name')
      .eq('id', profile.church_id)
      .maybeSingle();
    setChurchName(typeof data?.name === 'string' ? data.name : null);
  }, [profile?.church_id]);

  useEffect(() => {
    void loadChurch();
    void refreshProfile();
  }, [loadChurch, refreshProfile]);

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

  async function onSelectLanguage(value: AppLanguage) {
    if (value === selectedLanguage || languagePending) return;
    setLanguageError(null);
    setLanguagePending(true);
    const { error } = await updatePreferredLanguage(value);
    setLanguagePending(false);
    if (error) setLanguageError(error);
  }

  function confirmSignOut() {
    Alert.alert('Sign out?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await signOut();
            router.replace('/login');
          })();
        },
      },
    ]);
  }

  return (
    <ScreenBackdrop>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <Text style={styles.kicker}>Account</Text>
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
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.profileCard}>
            <Text style={styles.profileName}>{displayName}</Text>
            {email ? <Text style={styles.profileEmail}>{email}</Text> : null}
            {profile?.church_id ? (
              <>
                <Text style={styles.profileChurch}>{churchName ?? 'Your church'}</Text>
                {roleLabel ? <Text style={styles.profileRole}>{roleLabel}</Text> : null}
              </>
            ) : (
              <Pressable
                style={({ pressed }) => [styles.joinLink, pressed && styles.pressed]}
                onPress={() => router.push('/join-church')}
              >
                <Text style={styles.joinLinkLabel}>Join a church</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.blue} />
              </Pressable>
            )}
          </View>

          <View style={styles.menuCard}>
            <SettingsRow
              icon="notifications-outline"
              label="Notifications"
              subtitle={reminderSubtitle}
              onPress={() => setPanel('notifications')}
              styles={styles}
              colors={colors}
            />
            <SettingsRow
              icon="globe-outline"
              label="Language"
              subtitle={languageOptionLabel(selectedLanguage)}
              onPress={() => setPanel('language')}
              styles={styles}
              colors={colors}
            />
            <SettingsRow
              icon="color-palette-outline"
              label="Display"
              subtitle={appearanceSubtitle}
              onPress={() => setPanel('display')}
              styles={styles}
              colors={colors}
            />
            <SettingsRow
              icon="person-circle-outline"
              label="Manage account"
              subtitle="Leave church or delete account"
              last
              onPress={() => setPanel('account')}
              styles={styles}
              colors={colors}
            />
          </View>

          <Pressable
            style={({ pressed }) => [styles.signOutBtn, pressed && styles.pressed]}
            onPress={confirmSignOut}
          >
            <Text style={styles.signOutLabel}>Sign out</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>

      <SettingsPanelModal
        visible={panel === 'notifications'}
        title="Notifications"
        subtitle={
          profile?.church_id
            ? 'Choose when you’d like a gentle push for today’s reading.'
            : 'Join a church to set a daily reminder time.'
        }
        onClose={() => setPanel(null)}
      >
        {profile?.church_id ? (
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
        ) : (
          <Pressable
            style={({ pressed }) => [styles.modalCta, pressed && styles.pressed]}
            onPress={() => {
              setPanel(null);
              router.push('/join-church');
            }}
          >
            <Text style={styles.modalCtaLabel}>Join a church</Text>
          </Pressable>
        )}
      </SettingsPanelModal>

      <SettingsPanelModal
        visible={panel === 'language'}
        title="Language"
        subtitle="Prefer English, Spanish, or French. Church content language is set by your pastor."
        onClose={() => setPanel(null)}
      >
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
              <Text style={styles.optionLabel}>{languageOptionLabel(opt.value)}</Text>
            </Pressable>
          );
        })}
        {languageError ? <Text style={styles.error}>{languageError}</Text> : null}
      </SettingsPanelModal>

      <SettingsPanelModal
        visible={panel === 'display'}
        title="Display"
        subtitle={`Currently using ${resolved} mode on this device.`}
        onClose={() => setPanel(null)}
      >
        {APPEARANCE_OPTIONS.map((opt) => {
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
      </SettingsPanelModal>

      <SettingsPanelModal
        visible={panel === 'account'}
        title="Manage account"
        subtitle="Leave your church or permanently delete your Sermon Recall account."
        onClose={() => setPanel(null)}
      >
        <LeaveChurchPanel />
        <DeleteAccountPanel scrollRef={scrollRef} />
      </SettingsPanelModal>
    </ScreenBackdrop>
  );
}

function formatRole(role: string | undefined): string | null {
  if (!role) return null;
  if (role === 'pastor' || role === 'admin') return 'Pastor / admin';
  if (role === 'member') return 'Member';
  return role;
}

function SettingsRow({
  icon,
  label,
  subtitle,
  last,
  onPress,
  styles,
  colors,
}: {
  icon: IoniconName;
  label: string;
  subtitle?: string;
  last?: boolean;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
  colors: RecallionColors;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, !last && styles.rowBorder, pressed && styles.pressed]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={22} color={colors.navy} style={styles.rowIcon} />
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.muted} />
    </Pressable>
  );
}

function createStyles(colors: RecallionColors, resolved: 'light' | 'dark') {
  const elevation = cardShadowStyle(colors);
  const isLight = resolved === 'light';
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bgPage },
    flex: { flex: 1, backgroundColor: colors.bgPage },
    kicker: {
      marginTop: 8,
      paddingHorizontal: 20,
      fontSize: 12,
      letterSpacing: 1.4,
      textTransform: 'uppercase',
      color: colors.blue,
      fontWeight: '700',
    },
    title: {
      marginTop: 6,
      paddingHorizontal: 20,
      marginBottom: 8,
      fontSize: 34,
      fontWeight: '700',
      color: colors.navy,
      letterSpacing: -0.4,
    },
    scroll: { paddingHorizontal: 20 },
    profileCard: {
      marginTop: 8,
      marginBottom: 16,
      padding: 18,
      borderRadius: colors.radiusCard,
      backgroundColor: colors.bgCard,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderSubtle,
      ...elevation,
    },
    profileName: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.navy,
      letterSpacing: -0.3,
    },
    profileEmail: { marginTop: 4, fontSize: 15, color: colors.muted },
    profileChurch: { marginTop: 10, fontSize: 15, fontWeight: '600', color: colors.blue },
    profileRole: { marginTop: 4, fontSize: 13, color: colors.muted },
    joinLink: {
      marginTop: 12,
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 4,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 12,
      backgroundColor: colors.accentSoft,
    },
    joinLinkLabel: { fontSize: 14, fontWeight: '700', color: colors.blue },
    menuCard: {
      borderRadius: 14,
      backgroundColor: colors.bgCard,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderSubtle,
      overflow: 'hidden',
      ...elevation,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    rowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderSubtle,
    },
    rowIcon: { marginRight: 12, width: 24, textAlign: 'center' },
    rowText: { flex: 1, paddingRight: 8 },
    rowLabel: { fontSize: 16, fontWeight: '600', color: colors.navy },
    rowSubtitle: { marginTop: 2, fontSize: 12, color: colors.muted },
    option: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      marginBottom: 10,
      padding: 16,
      borderRadius: colors.radiusMd,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderSubtle,
      backgroundColor: colors.bgWash,
    },
    optionSelected: {
      borderColor: colors.blue,
      backgroundColor: colors.accentSoft,
      borderWidth: 1.5,
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
    optionLabel: { fontSize: 16, fontWeight: '700', color: colors.navy },
    optionDesc: { marginTop: 4, fontSize: 14, color: colors.muted, lineHeight: 20 },
    error: {
      marginTop: 4,
      fontSize: 14,
      color: resolved === 'light' ? '#b91c1c' : '#fca5a5',
    },
    modalCta: {
      marginTop: 8,
      backgroundColor: colors.ctaSolid,
      borderRadius: 50,
      paddingVertical: 14,
      alignItems: 'center',
    },
    modalCtaLabel: { color: '#fff', fontSize: 16, fontWeight: '700' },
    signOutBtn: {
      marginTop: 28,
      borderRadius: 50,
      borderWidth: 1.5,
      borderColor: isLight ? 'rgba(185, 28, 28, 0.28)' : 'rgba(248, 113, 113, 0.45)',
      backgroundColor: isLight ? 'rgba(254, 226, 226, 0.65)' : 'transparent',
      paddingVertical: 14,
      alignItems: 'center',
    },
    signOutLabel: {
      fontSize: 16,
      fontWeight: '700',
      color: isLight ? '#b91c1c' : '#f87171',
    },
    pressed: { opacity: 0.85 },
  });
}
