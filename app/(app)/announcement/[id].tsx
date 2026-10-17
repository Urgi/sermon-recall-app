import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FadeInView } from '../../../components/FadeInView';
import { ScreenBackdrop } from '../../../components/ScreenBackdrop';
import { SermonRecallScreenHeader } from '../../../components/SermonRecallScreenHeader';
import { useI18n } from '../../../contexts/I18nContext';

import { useRecallionTheme } from '../../../contexts/ThemeContext';
import { typeScale } from '../../../lib/designTokens';
import type { UiKey } from '../../../lib/i18n/ui';
import { pressedOpacity } from '../../../lib/motion';
import type { RecallionColors } from '../../../lib/recallionTheme';
import { supabase } from '../../../lib/supabase';

type BroadcastRow = {
  id: string;
  title: string;
  body: string;
  church_id: string;
  created_at: string;
  already_opened: boolean;
};

export default function AnnouncementScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const broadcastId = Array.isArray(id) ? id[0] : id;
  const { colors } = useRecallionTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [loading, setLoading] = useState(true);
  const { t } = useI18n();
  const [error, setError] = useState<UiKey | null>(null);
  const [message, setMessage] = useState<BroadcastRow | null>(null);

  useEffect(() => {
    if (!broadcastId) {
      setError('announcement.notFound');
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      const client = supabase;
      if (!client) return;
      setLoading(true);
      setError(null);

      const { data, error: fetchErr } = await client.rpc('get_broadcast_message_for_recipient', {
        p_broadcast_id: broadcastId,
      });

      if (cancelled) return;

      if (fetchErr) {
        setError(
          fetchErr.message.includes('not_a_recipient')
            ? 'announcement.notRecipient'
            : 'announcement.loadError',
        );
        setLoading(false);
        return;
      }

      const row = (data as BroadcastRow[] | null)?.[0];
      if (!row) {
        setError('announcement.notFound');
        setLoading(false);
        return;
      }

      setMessage(row);

      if (!row.already_opened) {
        await client.rpc('mark_broadcast_opened', { p_broadcast_id: broadcastId });
      }

      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [broadcastId]);

  return (
    <ScreenBackdrop>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <SermonRecallScreenHeader />
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.blue} size="large" />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Ionicons name="mail-unread-outline" size={32} color={colors.muted} />
            <Text style={styles.error}>{t(error)}</Text>
          </View>
        ) : message ? (
          <>
            <ScrollView contentContainerStyle={styles.content}>
              <FadeInView>
                <Text style={styles.label}>{t('announcement.from')}</Text>
                <Text style={styles.title} accessibilityRole="header">
                  {message.title}
                </Text>
                <Text style={styles.date}>{formatSentDate(message.created_at)}</Text>
                <Text style={styles.body} selectable>
                  {message.body}
                </Text>
              </FadeInView>
            </ScrollView>
            <View style={styles.footer}>
              <Pressable
                onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))}
                style={({ pressed }) => [styles.button, pressed && styles.pressed]}
                accessibilityRole="button"
              >
                <Text style={styles.buttonLabel}>{t('common.done')}</Text>
              </Pressable>
            </View>
          </>
        ) : null}
      </SafeAreaView>
    </ScreenBackdrop>
  );
}

function formatSentDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

function createStyles(c: RecallionColors) {
  return StyleSheet.create({
    safe: { flex: 1 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
    content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32 },
    label: { ...typeScale.kicker, color: c.blue, marginBottom: 10 },
    title: { ...typeScale.dayTitle, color: c.navy },
    date: { ...typeScale.meta, marginTop: 6, color: c.muted },
    body: { ...typeScale.bodyCompact, marginTop: 20, color: c.navyMid },
    error: { fontSize: 16, lineHeight: 22, color: c.navyMid, textAlign: 'center' },
    footer: { paddingHorizontal: 20, paddingTop: 12 },
    button: {
      backgroundColor: c.ctaSolid,
      minHeight: 52,
      borderRadius: 50,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonLabel: { color: '#fff', fontSize: 16, fontWeight: '700' },
    pressed: { opacity: pressedOpacity },
  });
}
