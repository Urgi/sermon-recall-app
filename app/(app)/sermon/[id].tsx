import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
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

import { SermonRecallScreenHeader } from '../../../components/SermonRecallScreenHeader';
import { useAuth } from '../../../contexts/AuthContext';
import { useRecallionTheme } from '../../../contexts/ThemeContext';
import { devotionalDayHeading, devotionalTopic } from '../../../lib/devotionalDayTopics';
import {
  accessibleDevotionalIds,
  buildUnlockContext,
  daysUntilCalendarUnlock,
  formatUnlockLabel,
  formatUnlockRelative,
  nextUnlockedIncompleteDevotional,
} from '../../../lib/devotionalUnlock';
import type { RecallionColors } from '../../../lib/recallionTheme';
import { supabase } from '../../../lib/supabase';

type SermonRow = {
  id: string;
  title: string;
  sermon_date: string | null;
  pastor_name: string | null;
  created_at: string;
  church_id: string;
  churches: { timezone: string } | { timezone: string }[] | null;
};

type DevotionalRow = {
  id: string;
  day_number: number;
  title: string | null;
  estimated_minutes: number;
};

type ProgressRow = {
  devotional_id: string;
  completed_at: string | null;
  application_commitment: string | null;
};

function churchTimeZone(churches: SermonRow['churches']): string {
  if (Array.isArray(churches)) return churches[0]?.timezone ?? 'America/New_York';
  return churches?.timezone ?? 'America/New_York';
}

function formatPreachedDate(iso: string | null): string | null {
  if (!iso) return null;
  try {
    const d = new Date(`${iso}T12:00:00`);
    return `Preached ${d.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}`;
  } catch {
    return null;
  }
}

function formatCompletedDate(iso: string | null): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
  } catch {
    return null;
  }
}

function ProgressDots({
  totalDays,
  completedCount,
  styles,
}: {
  totalDays: number;
  completedCount: number;
  styles: ReturnType<typeof createStyles>;
}) {
  const segments = Math.max(totalDays, 1);
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: segments }).map((_, i) => (
        <View
          key={i}
          style={[styles.dot, i < completedCount ? styles.dotDone : styles.dotRest]}
        />
      ))}
    </View>
  );
}

export default function SermonDetailScreen() {
  const { colors } = useRecallionTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const [sermon, setSermon] = useState<SermonRow | null>(null);
  const [devotionals, setDevotionals] = useState<DevotionalRow[]>([]);
  const [progressByDevotional, setProgressByDevotional] = useState<Map<string, ProgressRow>>(
    new Map(),
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCurrentSermon, setIsCurrentSermon] = useState(true);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = Boolean(opts?.silent);
    if (!supabase || !id) return;
    if (!silent) setLoading(true);
    setError(null);

    const { data: s, error: e1 } = await supabase
      .from('sermons')
      .select('id, title, sermon_date, pastor_name, created_at, church_id, churches(timezone)')
      .eq('id', id)
      .maybeSingle();

    if (e1 || !s) {
      setError('Could not load this sermon.');
      setSermon(null);
      setDevotionals([]);
      setProgressByDevotional(new Map());
      setIsCurrentSermon(true);
      if (!silent) setLoading(false);
      return;
    }

    setSermon(s as SermonRow);

    const { data: latestSermon } = await supabase
      .from('sermons')
      .select('id')
      .eq('church_id', (s as SermonRow).church_id)
      .eq('workflow_status', 'published')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    setIsCurrentSermon(latestSermon?.id === s.id);

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
        .select('devotional_id, completed_at, application_commitment')
        .eq('user_id', session.user.id)
        .in('devotional_id', ids);

      const map = new Map<string, ProgressRow>();
      for (const row of prog ?? []) {
        map.set(row.devotional_id as string, row as ProgressRow);
      }
      setProgressByDevotional(map);
    } else {
      setProgressByDevotional(new Map());
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

  const completedIds = useMemo(() => {
    const done = new Set<string>();
    for (const [devId, row] of progressByDevotional) {
      if (row.completed_at) done.add(devId);
    }
    return done;
  }, [progressByDevotional]);

  const totalDays = devotionals.length;
  const completedCount = devotionals.filter((d) => completedIds.has(d.id)).length;
  const allDone = totalDays > 0 && completedCount === totalDays;

  const unlockCtx =
    sermon?.created_at != null
      ? buildUnlockContext({
          sermonDateYmd: sermon.sermon_date,
          sermonCreatedAtIso: sermon.created_at,
          churchTimeZone: churchTimeZone(sermon.churches),
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

  const nextLockedDevotional = devotionals.find(
    (d) => !completedIds.has(d.id) && !unlockedIds.has(d.id),
  );

  const nextUpDevotional = nextDevotional ?? nextLockedDevotional;

  const preachedLabel = sermon ? formatPreachedDate(sermon.sermon_date) : null;

  function unlockDaysFor(dayNumber: number): number {
    if (!unlockCtx) return 0;
    return daysUntilCalendarUnlock(dayNumber, unlockCtx.anchorYmd, unlockCtx.todayYmd);
  }

  function ctaConfig(): { label: string; disabled: boolean; onPress?: () => void } {
    if (allDone) {
      return { label: 'All days complete', disabled: true };
    }
    if (nextDevotional) {
      return {
        label: isCurrentSermon ? "Continue today's day →" : 'Continue devotionals →',
        disabled: false,
        onPress: () => router.push(`/devotional/${nextDevotional.id}`),
      };
    }
    if (nextLockedDevotional) {
      const daysUntil = unlockDaysFor(nextLockedDevotional.day_number);
      return {
        label: `Day ${nextLockedDevotional.day_number} unlocks ${formatUnlockRelative(daysUntil)}`,
        disabled: true,
      };
    }
    return { label: 'View journey', disabled: true };
  }

  const cta = ctaConfig();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <SermonRecallScreenHeader />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.blue} />
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
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.blue} />
          }
        >
          <View style={styles.contentCard}>
            <View style={styles.cardHero}>
              <Text style={styles.title}>{sermon.title}</Text>
              {sermon.pastor_name ? <Text style={styles.meta}>{sermon.pastor_name}</Text> : null}
              {preachedLabel ? <Text style={styles.preached}>{preachedLabel}</Text> : null}
            </View>

            {totalDays > 0 ? (
              <View style={styles.progressBanner}>
                <Text style={styles.progressTitle}>Your progress</Text>
                <ProgressDots
                  totalDays={totalDays}
                  completedCount={completedCount}
                  styles={styles}
                />
                {nextUpDevotional ? (
                  <Text style={styles.nextUp}>
                    {allDone
                      ? `All ${totalDays} days complete`
                      : (() => {
                          const row = devotionals.find((item) => item.id === nextUpDevotional.id);
                          return `Next up: Day ${nextUpDevotional.day_number} — ${devotionalTopic(nextUpDevotional.day_number, row?.title)}`;
                        })()}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {totalDays > 0 ? (
              <Pressable
                style={({ pressed }) => [
                  styles.heroCta,
                  cta.disabled && styles.heroCtaDisabled,
                  pressed && !cta.disabled && styles.heroCtaPressed,
                ]}
                disabled={cta.disabled}
                onPress={cta.onPress}
              >
                <Text style={[styles.heroCtaLabel, cta.disabled && styles.heroCtaLabelDisabled]}>
                  {cta.label}
                </Text>
              </Pressable>
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
                    const progress = progressByDevotional.get(d.id);
                    const commitment = progress?.application_commitment?.trim();
                    const completedLabel = formatCompletedDate(progress?.completed_at ?? null);
                    const daysUntil = unlockDaysFor(d.day_number);

                    return (
                      <Pressable
                        key={d.id}
                        disabled={!unlocked && !done}
                        style={({ pressed }) => [
                          styles.row,
                          unlocked && isNext && styles.rowCurrent,
                          !unlocked && !done && styles.rowLocked,
                          pressed && (unlocked || done) && styles.rowPressed,
                        ]}
                        onPress={() => (unlocked || done) && router.push(`/devotional/${d.id}`)}
                      >
                        <View style={styles.rowTop}>
                          <Text style={[styles.dayHeading, !unlocked && !done && styles.dayMuted]}>
                            {devotionalDayHeading(d.day_number, d.title)}
                          </Text>
                          {isNext ? (
                            <View style={styles.pillNext}>
                              <Text style={styles.pillNextText}>Current</Text>
                            </View>
                          ) : null}
                        </View>

                        {done ? (
                          <>
                            {completedLabel ? (
                              <Text style={styles.completedMeta}>Completed {completedLabel}</Text>
                            ) : (
                              <Text style={styles.completedMeta}>Completed</Text>
                            )}
                            {commitment ? (
                              <Text style={styles.commitmentSnippet} numberOfLines={2}>
                                You committed: “{commitment}”
                              </Text>
                            ) : null}
                            <Text style={styles.reviewLink}>Review →</Text>
                          </>
                        ) : unlocked ? (
                          <Text style={styles.rowSub}>{d.estimated_minutes} min read</Text>
                        ) : (
                          <Text style={styles.rowUnlock}>{formatUnlockLabel(daysUntil)}</Text>
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

function createStyles(c: RecallionColors) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bgPage },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    padBare: { padding: 20, paddingBottom: 40 },
    scrollOuter: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 40 },
    contentCard: {
      backgroundColor: c.bgCard,
      borderRadius: c.radiusCard,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.borderSubtle,
      overflow: 'hidden',
    },
    cardHero: { paddingHorizontal: 22, paddingTop: 18, paddingBottom: 8 },
    err: { color: '#b91c1c', fontSize: 16 },
    title: { fontSize: 24, fontWeight: '500', color: c.navy, letterSpacing: -0.2 },
    meta: { marginTop: 8, fontSize: 14, color: c.navyMid },
    preached: { marginTop: 4, fontSize: 14, color: c.muted },
    progressBanner: {
      marginHorizontal: 22,
      marginBottom: 12,
      padding: 16,
      borderRadius: c.radiusMd,
      backgroundColor: c.bgWash,
      borderLeftWidth: 3,
      borderLeftColor: c.blue,
    },
    progressTitle: {
      fontSize: 11,
      fontWeight: '500',
      color: c.blue,
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginBottom: 12,
    },
    dotsRow: {
      flexDirection: 'row',
      gap: 6,
    },
    dot: {
      flex: 1,
      height: 8,
      borderRadius: 999,
    },
    dotDone: { backgroundColor: c.blue },
    dotRest: { backgroundColor: c.progressRest },
    nextUp: {
      marginTop: 14,
      fontSize: 15,
      color: c.navyMid,
      lineHeight: 22,
    },
    heroCta: {
      marginHorizontal: 22,
      marginBottom: 8,
      backgroundColor: c.blue,
      borderRadius: c.radiusMd,
      paddingVertical: 15,
      alignItems: 'center',
    },
    heroCtaDisabled: {
      backgroundColor: c.bgWash,
      borderWidth: 1,
      borderColor: c.borderInput,
    },
    heroCtaPressed: { opacity: 0.92 },
    heroCtaLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: '#05070a',
    },
    heroCtaLabelDisabled: {
      color: c.muted,
      fontWeight: '500',
    },
    journeySection: { paddingHorizontal: 22, paddingBottom: 24, paddingTop: 8 },
    section: {
      marginTop: 8,
      marginBottom: 12,
      fontSize: 16,
      fontWeight: '500',
      color: c.navy,
    },
    muted: { fontSize: 15, color: c.muted, lineHeight: 22 },
    list: { gap: 10 },
    row: {
      backgroundColor: c.bgCard,
      borderRadius: c.radiusMd,
      padding: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.borderSubtle,
    },
    rowCurrent: {
      borderColor: c.blue,
      borderWidth: 1,
      backgroundColor: c.bgWash,
    },
    rowLocked: {
      opacity: 0.72,
      backgroundColor: c.bgWash,
    },
    rowPressed: { opacity: 0.92 },
    rowTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 10,
    },
    dayHeading: {
      flex: 1,
      fontSize: 15,
      fontWeight: '600',
      color: c.navy,
      lineHeight: 21,
    },
    dayMuted: { color: c.muted },
    pillNext: {
      backgroundColor: c.bgWash,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.blue,
    },
    pillNextText: { fontSize: 12, fontWeight: '600', color: c.blue },
    rowSub: { marginTop: 8, fontSize: 13, color: c.muted },
    rowUnlock: { marginTop: 8, fontSize: 13, color: c.muted, fontWeight: '500' },
    completedMeta: {
      marginTop: 8,
      fontSize: 13,
      color: c.muted,
      fontWeight: '500',
    },
    commitmentSnippet: {
      marginTop: 6,
      fontSize: 14,
      color: c.navyMid,
      lineHeight: 20,
      fontStyle: 'italic',
    },
    reviewLink: {
      marginTop: 10,
      fontSize: 15,
      fontWeight: '600',
      color: c.blue,
      alignSelf: 'flex-start',
    },
  });
}
