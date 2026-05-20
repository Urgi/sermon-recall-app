import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useRecallionTheme } from '../../../contexts/ThemeContext';
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
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<BroadcastRow | null>(null);

  useEffect(() => {
    if (!broadcastId) {
      setError('Invalid message.');
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const { data, error: fetchErr } = await supabase.rpc('get_broadcast_message_for_recipient', {
        p_broadcast_id: broadcastId,
      });

      if (cancelled) return;

      if (fetchErr) {
        setError(
          fetchErr.message.includes('not_a_recipient')
            ? 'This message was not sent to your account.'
            : 'Could not load message.',
        );
        setLoading(false);
        return;
      }

      const row = (data as BroadcastRow[] | null)?.[0];
      if (!row) {
        setError('Message not found.');
        setLoading(false);
        return;
      }

      setMessage(row);

      if (!row.already_opened) {
        await supabase.rpc('mark_broadcast_opened', { p_broadcast_id: broadcastId });
      }

      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [broadcastId]);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator color={colors.ctaSolid} size="large" />
        ) : error ? (
          <>
            <Text style={styles.error}>{error}</Text>
            <Pressable onPress={() => router.back()} style={styles.button}>
              <Text style={styles.buttonLabel}>Go back</Text>
            </Pressable>
          </>
        ) : message ? (
          <>
            <Text style={styles.label}>From your church</Text>
            <Text style={styles.title}>{message.title}</Text>
            <Text style={styles.body}>{message.body}</Text>
            <Pressable onPress={() => router.replace('/home')} style={styles.button}>
              <Text style={styles.buttonLabel}>Done</Text>
            </Pressable>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function createStyles(c: RecallionColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bgPage },
    content: {
      flexGrow: 1,
      padding: 24,
      justifyContent: 'center',
      gap: 16,
    },
    label: { fontSize: 13, fontWeight: '600', color: c.muted, textTransform: 'uppercase' },
    title: { fontSize: 24, fontWeight: '700', color: c.navy },
    body: { fontSize: 16, lineHeight: 24, color: c.navy },
    error: { fontSize: 15, color: '#b91c1c', lineHeight: 22 },
    button: {
      marginTop: 8,
      backgroundColor: c.ctaSolid,
      paddingVertical: 14,
      borderRadius: c.radiusMd,
      alignItems: 'center',
    },
    buttonLabel: { color: '#fff', fontSize: 17, fontWeight: '600' },
  });
}
