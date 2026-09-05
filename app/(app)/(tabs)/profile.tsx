import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../../../contexts/AuthContext';
import { useRecallionTheme } from '../../../contexts/ThemeContext';
import {
  languageOptionLabel,
  normalizeAppLanguage,
} from '../../../lib/i18n/languages';
import type { RecallionColors } from '../../../lib/recallionTheme';
import { greetingFirstName } from '../../../lib/sermonHomeStatus';
import { supabase } from '../../../lib/supabase';

export default function ProfileScreen() {
  const { session, profile, signOut, refreshProfile } = useAuth();
  const { colors, preference, resolved } = useRecallionTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [churchName, setChurchName] = useState<string | null>(null);

  const displayName = greetingFirstName(profile?.full_name, session?.user?.email);
  const email = session?.user?.email ?? '';
  const language = normalizeAppLanguage(profile?.preferred_language);
  const roleLabel = formatRole(profile?.role);

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
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.kicker}>Profile</Text>
        <Text style={styles.title}>{displayName}</Text>
        {email ? <Text style={styles.email}>{email}</Text> : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Church</Text>
          {profile?.church_id ? (
            <>
              <Text style={styles.cardValue}>{churchName ?? 'Your church'}</Text>
              {roleLabel ? <Text style={styles.cardMeta}>{roleLabel}</Text> : null}
            </>
          ) : (
            <>
              <Text style={styles.cardMeta}>You are not linked to a church yet.</Text>
              <Pressable
                style={({ pressed }) => [styles.linkBtn, pressed && styles.pressed]}
                onPress={() => router.push('/join-church')}
              >
                <Text style={styles.linkBtnLabel}>Join a church</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.blue} />
              </Pressable>
            </>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Preferences</Text>
          <Row label="Language" value={languageOptionLabel(language)} styles={styles} />
          <Row
            label="Appearance"
            value={preference === 'system' ? `System (${resolved})` : preference === 'dark' ? 'Dark' : 'Bright'}
            styles={styles}
          />
          <Row
            label="Reminders"
            value={
              profile?.devotional_notify_enabled === false
                ? 'Off'
                : typeof profile?.devotional_notify_hour === 'number'
                  ? `On · ${formatHour(profile.devotional_notify_hour)}`
                  : 'On'
            }
            styles={styles}
          />
          <Pressable
            style={({ pressed }) => [styles.linkBtn, pressed && styles.pressed]}
            onPress={() => router.push('/settings')}
          >
            <Text style={styles.linkBtnLabel}>Open settings</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.blue} />
          </Pressable>
        </View>

        <Pressable
          style={({ pressed }) => [styles.signOutBtn, pressed && styles.pressed]}
          onPress={confirmSignOut}
        >
          <Text style={styles.signOutLabel}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function formatRole(role: string | undefined): string | null {
  if (!role) return null;
  if (role === 'pastor' || role === 'admin') return 'Pastor / admin';
  if (role === 'member') return 'Member';
  return role;
}

function formatHour(hour: number): string {
  const h = ((hour % 24) + 24) % 24;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const twelve = h % 12 === 0 ? 12 : h % 12;
  return `${twelve}:00 ${suffix}`;
}

function createStyles(c: RecallionColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bgPage },
    scroll: { paddingHorizontal: 20, paddingBottom: 32, paddingTop: 8 },
    kicker: {
      fontSize: 12,
      letterSpacing: 1.4,
      textTransform: 'uppercase',
      color: c.blue,
      fontWeight: '600',
      marginBottom: 8,
    },
    title: {
      fontSize: 32,
      fontWeight: '700',
      color: c.navy,
      letterSpacing: -0.3,
      lineHeight: 38,
    },
    email: { marginTop: 6, fontSize: 15, color: c.muted },
    card: {
      marginTop: 22,
      padding: 18,
      borderRadius: c.radiusCard,
      backgroundColor: c.bgCard,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.borderSubtle,
      gap: 10,
    },
    cardTitle: { fontSize: 13, fontWeight: '600', color: c.muted, textTransform: 'uppercase', letterSpacing: 0.6 },
    cardValue: { fontSize: 18, fontWeight: '600', color: c.navy },
    cardMeta: { fontSize: 15, color: c.muted, lineHeight: 21 },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
    },
    rowLabel: { fontSize: 15, color: c.muted },
    rowValue: { fontSize: 15, fontWeight: '600', color: c.navy, flexShrink: 1, textAlign: 'right' },
    linkBtn: {
      marginTop: 4,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 4,
    },
    linkBtnLabel: { fontSize: 16, fontWeight: '600', color: c.blue },
    signOutBtn: {
      marginTop: 28,
      borderRadius: 50,
      borderWidth: 1,
      borderColor: 'rgba(248, 113, 113, 0.45)',
      paddingVertical: 14,
      alignItems: 'center',
    },
    signOutLabel: { fontSize: 16, fontWeight: '600', color: '#f87171' },
    pressed: { opacity: 0.85 },
  });
}
