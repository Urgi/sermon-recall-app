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
import {
  accessibleDevotionalIds,
  buildUnlockContext,
  nextUnlockedIncompleteDevotional,
} from '../../../lib/devotionalUnlock';
import { recallion } from '../../../lib/recallionTheme';
import { supabase } from '../../../lib/supabase';

type SermonRow = {
  id: string;
  title: string;
  sermon_date: string | null;
  pastor_name: string | null;
  status: string;
  created_at: string;
  churches: { timezone: string } | { timezone: string }[] | null;
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
      .select('id, title, sermon_date, pastor_name, status, created_at, churches(timezone)')
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

  const allDone =
    devotionals.length > 0 && devotionals.every((d) => completedIds.has(d.id));
  const totalDays = devotionals.length;

  const churchTzRow = sermon?.churches;
  const churchTz = Array.isArray(churchTzRow)
    ? churchTzRow[0]?.timezone
    : churchTzRow?.timezone;
  const unlockCtx =
    sermon?.created_at != null
      ? buildUnlockContext({
          sermonDateYmd: sermon.sermon_date,
          sermonCreatedAtIso: sermon.created_at,
          churchTimeZone: churchTz ?? 'America/New_York',
        })
      : null;

  const unlockedIds =
    devotionals.length > 0
      ? accessibleDevotionalIds(devotionals, completedIds, unlockCtx)
      : new Set<string>();

  const nextDevotional = nextUnlockedIncompleteDevotional(
    devotionals,
    completedIds,
    unlockedIds,
  );

  const sermonStatusBadge = sermon ? statusBadge(sermon.status) : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={recallion.blue} />
        </View>
      ) : error || !sermon ? (
        <View style={styles.padBare}>
          <Text style={styles.err}>{error ?? 'Not found.'}</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollOuter}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={recallion.blue} />
          }
        >
          <View style={styles.contentCard}>
            <View style={styles.cardHero}>
              <Text style={styles.title}>{sermon.title}</Text>
              <Text style={styles.meta}>
                {[sermon.pastor_name, sermon.sermon_date].filter(Boolean).join(' · ') || '—'}
              </Text>
              {sermonStatusBadge ? (
                <View style={[styles.badge, sermonStatusBadge.wrap]}>
                  <Text style={[styles.badgeText, { color: sermonStatusBadge.text }]}>
                    {sermon.status}
                  </Text>
                </View>
              ) : null}
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

            <View style={styles.journeySection}>
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
                          <Text style={[styles.day, !unlocked && styles.dayMuted]}>
                            Day {d.day_number}
                          </Text>
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
                            <Text style={styles.rowSub}>{d.estimated_minutes} min read</Text>
                          </>
                        ) : (
                          <>
                            <Text style={styles.rowTitleMuted}>Not open yet on the calendar.</Text>
                            <Text style={styles.rowSubMuted}>
                              Each day unlocks on its day of the six-day week, or open everything after
                              that week ends.
                            </Text>
                          </>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function statusBadge(status: string): { wrap: object; text: string } {
  if (status === 'ready') {
    return { wrap: { backgroundColor: 'rgba(34,197,94,0.18)' }, text: '#86efac' };
  }
  if (status === 'failed') {
    return { wrap: { backgroundColor: 'rgba(248,113,113,0.15)' }, text: '#fca5a5' };
  }
  return { wrap: { backgroundColor: 'rgba(250,204,21,0.12)' }, text: '#fde047' };
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: recallion.bgPage },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 8,
  },
  back: { fontSize: 14, color: recallion.blue, fontWeight: '500' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  padBare: { padding: 20, paddingBottom: 40 },
  scrollOuter: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 40 },
  contentCard: {
    backgroundColor: recallion.bgCard,
    borderRadius: recallion.radiusCard,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: recallion.borderSubtle,
    overflow: 'hidden',
  },
  cardHero: { paddingHorizontal: 22, paddingTop: 18, paddingBottom: 8 },
  err: { color: '#b91c1c', fontSize: 16 },
  title: { fontSize: 24, fontWeight: '500', color: recallion.navy, letterSpacing: -0.2 },
  meta: { marginTop: 8, fontSize: 14, color: recallion.navyMid },
  badge: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: { fontSize: 13, fontWeight: '500', textTransform: 'capitalize' },
  progressBanner: {
    marginHorizontal: 22,
    marginBottom: 8,
    padding: 16,
    borderRadius: recallion.radiusMd,
    backgroundColor: recallion.bgWash,
    borderLeftWidth: 3,
    borderLeftColor: recallion.blue,
  },
  progressTitle: {
    fontSize: 11,
    fontWeight: '500',
    color: recallion.blue,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  progressBody: { fontSize: 16, color: recallion.navyMid, lineHeight: 22 },
  progressHint: { marginTop: 10, fontSize: 13, color: recallion.muted, lineHeight: 18 },
  journeySection: { paddingHorizontal: 22, paddingBottom: 24 },
  section: {
    marginTop: 12,
    marginBottom: 12,
    fontSize: 16,
    fontWeight: '500',
    color: recallion.navy,
  },
  muted: { fontSize: 15, color: recallion.muted, lineHeight: 22 },
  list: { gap: 10 },
  row: {
    backgroundColor: recallion.bgCard,
    borderRadius: recallion.radiusMd,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: recallion.borderSubtle,
  },
  rowCurrent: {
    borderColor: recallion.blue,
    borderWidth: 1,
    backgroundColor: recallion.bgWash,
  },
  rowLocked: {
    opacity: 0.72,
    backgroundColor: recallion.bgWash,
  },
  rowPressed: { opacity: 0.92 },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  day: { fontSize: 11, fontWeight: '500', letterSpacing: 0.8, textTransform: 'uppercase', color: recallion.blue },
  dayMuted: { color: recallion.muted },
  pillDone: {
    backgroundColor: 'rgba(34,197,94,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pillDoneText: { fontSize: 12, fontWeight: '600', color: '#86efac' },
  pillNext: {
    backgroundColor: recallion.bgWash,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: recallion.blue,
  },
  pillNextText: { fontSize: 12, fontWeight: '600', color: recallion.blue },
  pillLocked: {
    backgroundColor: recallion.progressRest,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pillLockedText: { fontSize: 12, fontWeight: '600', color: recallion.navyMid },
  rowTitle: { fontSize: 16, fontWeight: '500', color: recallion.navy },
  rowTitleMuted: { fontSize: 15, fontWeight: '500', color: recallion.muted },
  rowSub: { marginTop: 6, fontSize: 13, color: recallion.muted },
  rowSubMuted: { marginTop: 6, fontSize: 13, color: recallion.muted, fontStyle: 'italic' },
});
