import { Ionicons } from '@expo/vector-icons';
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

import { FadeInView } from '../../../components/FadeInView';
import { JourneyProgressBar } from '../../../components/JourneyProgressBar';
import { ScreenBackdrop } from '../../../components/ScreenBackdrop';
import { SermonRecallScreenHeader } from '../../../components/SermonRecallScreenHeader';
import { useAuth } from '../../../contexts/AuthContext';
import { useI18n } from '../../../contexts/I18nContext';
import { useRecallionTheme } from '../../../contexts/ThemeContext';
import { typeScale } from '../../../lib/designTokens';
import { devotionalDayHeading } from '../../../lib/devotionalDayTopics';
import {
  accessibleDevotionalIds,
  buildUnlockContext,
  daysUntilCalendarUnlock,
  nextUnlockedIncompleteDevotional,
} from '../../../lib/devotionalUnlock';
import { pressedOpacity } from '../../../lib/motion';
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
    return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
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
  const { t } = useI18n();
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
      setError('load');
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

  const currentDayNumber = !allDone && nextDevotional ? nextDevotional.day_number : null;

  const preachedDate = sermon ? formatPreachedDate(sermon.sermon_date) : null;
  const titleDisplay = sermon ? displaySermonTitle(sermon.title, sermon.sermon_date) : '';

  function unlockDaysFor(dayNumber: number): number {
    if (!unlockCtx) return 0;
    return daysUntilCalendarUnlock(dayNumber, unlockCtx.anchorYmd, unlockCtx.todayYmd);
  }

  function unlockLabel(daysUntil: number): string {
    if (daysUntil <= 0) return t('sermon.unlocksSoon');
    if (daysUntil === 1) return t('sermon.unlocksTomorrow');
    return t('sermon.unlocksInDays', { days: daysUntil });
  }

  function ctaConfig(): { label: string; disabled: boolean; onPress?: () => void } {
    if (allDone) {
      return { label: t('sermon.allDaysComplete'), disabled: true };
    }
    if (nextDevotional) {
      return {
        label: `${t(completedCount > 0 ? 'home.continueDay' : 'home.beginDay', {
          day: nextDevotional.day_number,
        })} →`,
        disabled: false,
        onPress: () => router.push(`/devotional/${nextDevotional.id}`),
      };
    }
    if (nextLockedDevotional) {
      const daysUntil = unlockDaysFor(nextLockedDevotional.day_number);
      return {
        label: t('sermon.dayUnlocks', {
          day: nextLockedDevotional.day_number,
          when: unlockLabel(daysUntil),
        }),
        disabled: true,
      };
    }
    return { label: t('sermon.journey'), disabled: true };
  }

  const cta = ctaConfig();

  return (
    <ScreenBackdrop>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <SermonRecallScreenHeader />

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.blue} />
          </View>
        ) : error || !sermon ? (
          <View style={styles.center}>
            <Ionicons name="cloud-offline-outline" size={32} color={colors.muted} />
            <Text style={styles.err}>{t('sermon.loadError')}</Text>
            <Pressable
              onPress={() => void load()}
              style={({ pressed }) => [styles.retryBtn, pressed && styles.rowPressed]}
              accessibilityRole="button"
            >
              <Text style={styles.retryLabel}>{t('common.retry')}</Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollOuter}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.blue} />
            }
          >
            <FadeInView>
              <Text style={styles.title} accessibilityRole="header">
                {titleDisplay}
              </Text>
              {sermon.pastor_name || preachedDate ? (
                <Text style={styles.meta}>
                  {[sermon.pastor_name, preachedDate ? t('sermon.preached', { date: preachedDate }) : null]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              ) : null}

              {totalDays > 0 ? (
                <View style={styles.progressBlock}>
                  <View style={styles.progressHeader}>
                    <Text style={styles.progressTitle}>{t('sermon.yourProgress')}</Text>
                    <Text style={styles.progressCount}>
                      {allDone
                        ? t('sermon.allComplete', { total: totalDays })
                        : t('home.ofComplete', { done: completedCount, total: totalDays })}
                    </Text>
                  </View>
                  <JourneyProgressBar
                    totalDays={totalDays}
                    completedCount={completedCount}
                    currentDayNumber={currentDayNumber}
                  />
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
                  accessibilityRole="button"
                  accessibilityState={{ disabled: cta.disabled }}
                >
                  <Text style={[styles.heroCtaLabel, cta.disabled && styles.heroCtaLabelDisabled]}>
                    {cta.label}
                  </Text>
                </Pressable>
              ) : null}

              <Text style={styles.section}>{t('sermon.journey')}</Text>
              {devotionals.length === 0 ? (
                <Text style={styles.muted}>{t('sermon.emptyDays')}</Text>
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
                        accessibilityRole="button"
                        accessibilityState={{ disabled: !unlocked && !done }}
                      >
                        <View style={styles.rowMain}>
                          <View
                            style={[
                              styles.rowBadge,
                              done && styles.rowBadgeDone,
                              isNext && styles.rowBadgeCurrent,
                            ]}
                          >
                            {done ? (
                              <Ionicons name="checkmark" size={16} color={colors.onGold} />
                            ) : !unlocked ? (
                              <Ionicons name="lock-closed" size={13} color={colors.muted} />
                            ) : (
                              <Text style={[styles.rowBadgeText, isNext && styles.rowBadgeTextCurrent]}>
                                {d.day_number}
                              </Text>
                            )}
                          </View>
                          <View style={styles.rowTextCol}>
                            <Text
                              style={[styles.dayHeading, !unlocked && !done && styles.dayMuted]}
                              numberOfLines={2}
                            >
                              {devotionalDayHeading(d.day_number, d.title)}
                            </Text>
                            {done ? (
                              <>
                                <Text style={styles.completedMeta}>
                                  {completedLabel
                                    ? t('sermon.completedOn', { date: completedLabel })
                                    : t('home.completed')}
                                </Text>
                                {commitment ? (
                                  <Text style={styles.commitmentSnippet} numberOfLines={1}>
                                    “{commitment}”
                                  </Text>
                                ) : null}
                              </>
                            ) : unlocked ? (
                              <Text style={[styles.rowSub, isNext && styles.rowSubCurrent]}>
                                {isNext ? `${t('sermon.current')} · ` : ''}
                                {t('sermon.minRead', { min: d.estimated_minutes })}
                              </Text>
                            ) : (
                              <Text style={styles.rowUnlock}>{unlockLabel(daysUntil)}</Text>
                            )}
                          </View>
                          {done || unlocked ? (
                            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                          ) : null}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </FadeInView>
          </ScrollView>
        )}
      </SafeAreaView>
    </ScreenBackdrop>
  );
}

function createStyles(c: RecallionColors) {
  return StyleSheet.create({
    safe: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 },
    scrollOuter: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 40 },
    err: { color: c.navyMid, fontSize: 16, lineHeight: 22, textAlign: 'center' },
    retryBtn: {
      marginTop: 4,
      minHeight: 44,
      paddingHorizontal: 24,
      borderRadius: 50,
      borderWidth: 1,
      borderColor: c.blue,
      backgroundColor: c.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    retryLabel: { fontSize: 15, fontWeight: '700', color: c.blue },
    title: { ...typeScale.dayTitle, color: c.navy },
    meta: { marginTop: 8, fontSize: 15, lineHeight: 21, color: c.muted },
    progressBlock: {
      marginTop: 24,
      marginBottom: 8,
      gap: 10,
    },
    progressHeader: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: 12,
    },
    progressTitle: {
      ...typeScale.kicker,
      color: c.muted,
    },
    progressCount: { fontSize: 13, fontWeight: '600', color: c.navyMid },
    heroCta: {
      marginTop: 12,
      marginBottom: 8,
      backgroundColor: c.ctaSolid,
      borderRadius: 50,
      paddingVertical: 15,
      minHeight: 52,
      justifyContent: 'center',
      alignItems: 'center',
    },
    heroCtaDisabled: {
      backgroundColor: c.bgWash,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.borderSubtle,
    },
    heroCtaPressed: { opacity: pressedOpacity },
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
      paddingHorizontal: 12,
      minHeight: 60,
      justifyContent: 'center',
      backgroundColor: c.bgCard,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.borderSubtle,
    },
    rowDone: {
      backgroundColor: 'transparent',
    },
    rowCurrent: {
      borderColor: c.blue,
      borderWidth: 1.5,
      backgroundColor: c.accentSoft,
    },
    rowLocked: {
      backgroundColor: 'transparent',
      borderStyle: 'dashed',
    },
    rowPressed: { opacity: pressedOpacity },
    rowMain: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    rowBadge: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.bgWash,
    },
    rowBadgeDone: { backgroundColor: c.gold },
    rowBadgeCurrent: { backgroundColor: c.bgCard, borderWidth: 1.5, borderColor: c.blue },
    rowBadgeText: { fontSize: 13, fontWeight: '700', color: c.navyMid },
    rowBadgeTextCurrent: { color: c.blue },
    rowTextCol: { flex: 1, minWidth: 0 },
    dayHeading: {
      fontSize: 15,
      fontWeight: '600',
      color: c.navy,
      lineHeight: 20,
    },
    dayMuted: { color: c.muted },
    rowSub: { marginTop: 3, fontSize: 13, color: c.muted },
    rowSubCurrent: { color: c.blue, fontWeight: '600' },
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
  });
}
