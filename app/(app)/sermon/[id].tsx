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

import { JourneyProgressBar } from '../../../components/JourneyProgressBar';
import { ScreenBackdrop } from '../../../components/ScreenBackdrop';
import { SermonRecallScreenHeader } from '../../../components/SermonRecallScreenHeader';
import { useAuth } from '../../../contexts/AuthContext';
import { useRecallionTheme } from '../../../contexts/ThemeContext';
import { typeScale } from '../../../lib/designTokens';
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
import { displaySermonTitle } from '../../../lib/sermonHomeStatus';
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
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return null;
  }
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
  const currentDayNumber = !allDone && nextDevotional ? nextDevotional.day_number : null;

  const preachedLabel = sermon ? formatPreachedDate(sermon.sermon_date) : null;
  const titleDisplay = sermon
    ? displaySermonTitle(sermon.title, sermon.sermon_date)
    : 'Sermon';

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
        label: `Continue Day ${nextDevotional.day_number} →`,
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
    <ScreenBackdrop>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <SermonRecallScreenHeader backLabel="Back" />

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
            <Text style={styles.title}>{titleDisplay}</Text>
            {sermon.pastor_name ? <Text style={styles.meta}>{sermon.pastor_name}</Text> : null}
            {preachedLabel ? <Text style={styles.preached}>{preachedLabel}</Text> : null}

            {totalDays > 0 ? (
              <View style={styles.progressBlock}>
                <Text style={styles.progressTitle}>Your progress</Text>
                <JourneyProgressBar
                  totalDays={totalDays}
                  completedCount={completedCount}
                  currentDayNumber={currentDayNumber}
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
                        done && styles.rowDone,
                        unlocked && isNext && styles.rowCurrent,
                        !unlocked && !done && styles.rowLocked,
                        pressed && (unlocked || done) && styles.rowPressed,
                      ]}
                      onPress={() => (unlocked || done) && router.push(`/devotional/${d.id}`)}
                    >
                      <View style={styles.rowMain}>
                        <View style={styles.rowTextCol}>
                          <Text style={[styles.dayHeading, !unlocked && !done && styles.dayMuted]}>
                            {done ? '✓ ' : ''}
                            {devotionalDayHeading(d.day_number, d.title)}
                          </Text>
                          {done ? (
                            <>
                              <Text style={styles.completedMeta}>
                                Completed{completedLabel ? ` ${completedLabel}` : ''}
                              </Text>
                              {commitment ? (
                                <Text style={styles.commitmentSnippet} numberOfLines={1}>
                                  “{commitment}”
                                </Text>
                              ) : null}
                            </>
                          ) : unlocked ? (
                            <Text style={styles.rowSub}>
                              {isNext ? 'Current · ' : ''}
                              {d.estimated_minutes} min read
                            </Text>
                          ) : (
                            <Text style={styles.rowUnlock}>{formatUnlockLabel(daysUntil)}</Text>
                          )}
                        </View>
                        {done || unlocked ? (
                          <Text style={styles.rowChevron}>{done ? 'Review' : 'Open'} →</Text>
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </ScreenBackdrop>
  );
}

function createStyles(c: RecallionColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bgPage },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    padBare: { padding: 20, paddingBottom: 40 },
    scrollOuter: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 40 },
    err: { color: '#b91c1c', fontSize: 16 },
    title: { ...typeScale.dayTitle, color: c.navy },
    meta: { marginTop: 8, fontSize: 15, color: c.navyMid },
    preached: { marginTop: 4, fontSize: 14, color: c.muted },
    progressBlock: {
      marginTop: 22,
      marginBottom: 8,
      gap: 12,
    },
    progressTitle: {
      ...typeScale.kicker,
      color: c.muted,
    },
    nextUp: {
      fontSize: 15,
      color: c.navyMid,
      lineHeight: 22,
    },
    heroCta: {
      marginTop: 12,
      marginBottom: 8,
      backgroundColor: c.ctaSolid,
      borderRadius: 50,
      paddingVertical: 15,
      alignItems: 'center',
    },
    heroCtaDisabled: {
      backgroundColor: c.bgWash,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.borderSubtle,
    },
    heroCtaPressed: { opacity: 0.92 },
    heroCtaLabel: {
      fontSize: 16,
      fontWeight: '700',
      color: '#ffffff',
    },
    heroCtaLabelDisabled: {
      color: c.muted,
      fontWeight: '500',
    },
    section: {
      marginTop: 24,
      marginBottom: 12,
      ...typeScale.kicker,
      color: c.muted,
    },
    muted: { fontSize: 15, color: c.muted, lineHeight: 22 },
    list: { gap: 8 },
    row: {
      borderRadius: c.radiusMd,
      paddingVertical: 12,
      paddingHorizontal: 14,
      backgroundColor: c.bgCard,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.borderSubtle,
    },
    rowDone: {
      paddingVertical: 10,
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.borderSubtle,
      borderRadius: 0,
      paddingHorizontal: 2,
    },
    rowCurrent: {
      borderColor: c.blue,
      borderWidth: 1.5,
      backgroundColor: c.accentSoft,
    },
    rowLocked: {
      opacity: 0.65,
      backgroundColor: 'transparent',
    },
    rowPressed: { opacity: 0.92 },
    rowMain: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    rowTextCol: { flex: 1, minWidth: 0 },
    dayHeading: {
      fontSize: 15,
      fontWeight: '600',
      color: c.navy,
      lineHeight: 20,
    },
    dayMuted: { color: c.muted },
    rowSub: { marginTop: 3, fontSize: 13, color: c.muted },
    rowUnlock: { marginTop: 3, fontSize: 13, color: c.muted, fontWeight: '500' },
    completedMeta: {
      marginTop: 2,
      fontSize: 12,
      color: c.muted,
      fontWeight: '500',
    },
    commitmentSnippet: {
      marginTop: 3,
      fontSize: 13,
      color: c.navyMid,
      lineHeight: 18,
      fontStyle: 'italic',
    },
    rowChevron: {
      fontSize: 13,
      fontWeight: '600',
      color: c.blue,
      flexShrink: 0,
    },
  });
}
