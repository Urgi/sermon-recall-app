import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../../../contexts/AuthContext';
import { accessibleDevotionalIds } from '../../../lib/devotionalUnlock';
import { supabase } from '../../../lib/supabase';

type SermonRow = {
  id: string;
  title: string;
  sermon_date: string | null;
  pastor_name: string | null;
  status: string;
};

type DevotionalRow = {
  id: string;
  day_number: number;
  title: string | null;
  estimated_minutes: number;
};

export default function SermonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const [sermon, setSermon] = useState<SermonRow | null>(null);
  const [devotionals, setDevotionals] = useState<DevotionalRow[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = Boolean(opts?.silent);
    if (!supabase || !id) return;
    if (!silent) setLoading(true);
    setError(null);

    const { data: s, error: e1 } = await supabase
      .from('sermons')
      .select('id, title, sermon_date, pastor_name, status')
      .eq('id', id)
      .maybeSingle();

    if (e1 || !s) {
      setError('Could not load this sermon.');
      setSermon(null);
      setDevotionals([]);
      setCompletedIds(new Set());
      if (!silent) setLoading(false);
      return;
    }

    setSermon(s as SermonRow);

    const { data: days } = await supabase
      .from('devotionals')
      .select('id, day_number, title, estimated_minutes')
      .eq('sermon_id', id)
      .order('day_number', { ascending: true });

    const list = (days as DevotionalRow[]) ?? [];
    setDevotionals(list);

    if (session?.user && list.length > 0) {
      const ids = list.map((d) => d.id);
      const { data: prog } = await supabase
        .from('user_progress')
        .select('devotional_id, completed_at')
        .in('devotional_id', ids);

      const done = new Set<string>();
      for (const p of prog ?? []) {
        if (p.completed_at) done.add(p.devotional_id as string);
      }
      setCompletedIds(done);
    } else {
      setCompletedIds(new Set());
    }

    if (!silent) setLoading(false);
  }, [id, session?.user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load({ silent: true });
    setRefreshing(false);
  }, [load]);

  const nextDevotional = devotionals.find((d) => !completedIds.has(d.id));
  const allDone =
    devotionals.length > 0 && devotionals.every((d) => completedIds.has(d.id));
  const totalDays = devotionals.length;

  const unlockedIds =
    devotionals.length > 0 ? accessibleDevotionalIds(devotionals, completedIds) : new Set<string>();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1d4ed8" />
        </View>
      ) : error || !sermon ? (
        <View style={styles.pad}>
          <Text style={styles.err}>{error ?? 'Not found.'}</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.pad}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1d4ed8" />
          }
        >
          <Text style={styles.title}>{sermon.title}</Text>
          <Text style={styles.meta}>
            {[sermon.pastor_name, sermon.sermon_date].filter(Boolean).join(' · ') || '—'}
          </Text>
          <View style={[styles.badge, statusStyle(sermon.status)]}>
            <Text style={styles.badgeText}>{sermon.status}</Text>
          </View>

          {totalDays > 0 ? (
            <View style={styles.progressBanner}>
              <Text style={styles.progressTitle}>Your progress</Text>
              {allDone ? (
                <Text style={styles.progressBody}>
                  You finished all {totalDays} days. Come back for the next sermon.
                </Text>
              ) : nextDevotional ? (
                <Text style={styles.progressBody}>
                  Day {nextDevotional.day_number} of {totalDays} — tap below to continue.
                </Text>
              ) : (
                <Text style={styles.progressBody}>
                  {completedIds.size} of {totalDays} days marked complete.
                </Text>
              )}
              <Text style={styles.progressHint}>
                Progress saves when you tap “Mark day complete” on each devotional.
              </Text>
            </View>
          ) : null}

          <Text style={styles.section}>Six-day journey</Text>
          {devotionals.length === 0 ? (
            <Text style={styles.muted}>
              Daily devotionals will appear here once they are published for this sermon.
            </Text>
          ) : (
            <View style={styles.list}>
              {devotionals.map((d) => {
                const done = completedIds.has(d.id);
                const unlocked = unlockedIds.has(d.id);
                const isNext = unlocked && !done && nextDevotional?.id === d.id;
                return (
                  <Pressable
                    key={d.id}
                    disabled={!unlocked}
                    style={({ pressed }) => [
                      styles.row,
                      unlocked && isNext && styles.rowCurrent,
                      !unlocked && styles.rowLocked,
                      pressed && unlocked && styles.rowPressed,
                    ]}
                    onPress={() => unlocked && router.push(`/devotional/${d.id}`)}
                  >
                    <View style={styles.rowTop}>
                      <Text style={[styles.day, !unlocked && styles.dayMuted]}>Day {d.day_number}</Text>
                      {done ? (
                        <View style={styles.pillDone}>
                          <Text style={styles.pillDoneText}>Done</Text>
                        </View>
                      ) : isNext ? (
                        <View style={styles.pillNext}>
                          <Text style={styles.pillNextText}>Current</Text>
                        </View>
                      ) : !unlocked ? (
                        <View style={styles.pillLocked}>
                          <Text style={styles.pillLockedText}>Locked</Text>
                        </View>
                      ) : null}
                    </View>
                    {unlocked ? (
                      <>
                        <Text style={styles.rowTitle} numberOfLines={2}>
                          {d.title?.trim() || 'Daily devotional'}
                        </Text>
                        <Text style={styles.rowSub}>~{d.estimated_minutes} min</Text>
                      </>
                    ) : (
                      <>
                        <Text style={styles.rowTitleMuted}>Finish earlier days to unlock.</Text>
                        <Text style={styles.rowSubMuted}>Day content stays hidden until then.</Text>
                      </>
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function statusStyle(status: string) {
  if (status === 'ready') return { backgroundColor: '#dcfce7' };
  if (status === 'failed') return { backgroundColor: '#fee2e2' };
  return { backgroundColor: '#fef3c7' };
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8f6f3' },
  topBar: { paddingHorizontal: 16, paddingBottom: 8 },
  back: { fontSize: 17, color: '#1d4ed8', fontWeight: '600' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  pad: { padding: 20, paddingBottom: 40 },
  err: { color: '#b91c1c', fontSize: 16 },
  title: { fontSize: 26, fontWeight: '700', color: '#0f172a' },
  meta: { marginTop: 8, fontSize: 16, color: '#475569' },
  badge: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: { fontSize: 13, fontWeight: '600', color: '#0f172a', textTransform: 'capitalize' },
  progressBanner: {
    marginTop: 20,
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  progressTitle: { fontSize: 14, fontWeight: '700', color: '#1e40af', marginBottom: 6 },
  progressBody: { fontSize: 16, color: '#1e293b', lineHeight: 22 },
  progressHint: { marginTop: 10, fontSize: 13, color: '#64748b', lineHeight: 18 },
  section: { marginTop: 28, marginBottom: 12, fontSize: 18, fontWeight: '700', color: '#0f172a' },
  muted: { fontSize: 15, color: '#64748b', lineHeight: 22 },
  list: { gap: 10 },
  row: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  rowCurrent: {
    borderColor: '#1d4ed8',
    borderWidth: 2,
    backgroundColor: '#f8fafc',
  },
  rowLocked: {
    opacity: 0.72,
    backgroundColor: '#f1f5f9',
  },
  rowPressed: { opacity: 0.92 },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  day: { fontSize: 13, fontWeight: '700', color: '#1d4ed8' },
  dayMuted: { color: '#64748b' },
  pillDone: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pillDoneText: { fontSize: 12, fontWeight: '700', color: '#166534' },
  pillNext: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pillNextText: { fontSize: 12, fontWeight: '700', color: '#1d4ed8' },
  pillLocked: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pillLockedText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  rowTitle: { fontSize: 17, fontWeight: '600', color: '#0f172a' },
  rowTitleMuted: { fontSize: 16, fontWeight: '600', color: '#64748b' },
  rowSub: { marginTop: 6, fontSize: 14, color: '#64748b' },
  rowSubMuted: { marginTop: 6, fontSize: 13, color: '#94a3b8', fontStyle: 'italic' },
});
