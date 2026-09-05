import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DevotionalNotifyPrompt } from '../../../components/DevotionalNotifyPrompt';
import { HomeStreakBadge } from '../../../components/HomeStreakBadge';
import { StreakCalendarModal } from '../../../components/StreakCalendarModal';
import { StreakCelebration } from '../../../components/StreakCelebration';
import { useAuth } from '../../../contexts/AuthContext';
import { useRecallionTheme } from '../../../contexts/ThemeContext';
import type { RecallionColors } from '../../../lib/recallionTheme';
import {
  claimStreakCelebrationForToday,
  fetchChurchTimeZone,
  fetchDevotionalStreakStatus,
  type DevotionalStreakStatus,
} from '../../../lib/devotionalStreak';
import {
  type DevotionalHomeRow,
  devotionalDisplayTitle,
  displaySermonTitle,
  churchDisplayName,
  formatSermonDate,
  greetingFirstName,
  heroStatusLabel,
  pastSermonProgressLabel,
  pickHeroAndPastSummaries,
  type SermonHomeRow,
  type SermonHomeSummary,
  summarizeSermonForHome,
  timeOfDayGreeting,
} from '../../../lib/sermonHomeStatus';
import { supabase } from '../../../lib/supabase';

export default function HomeScreen() {
  const { session, profile, loading, refreshProfile } = useAuth();
  const { colors } = useRecallionTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [summaries, setSummaries] = useState<SermonHomeSummary[]>([]);
  const [loadingSermons, setLoadingSermons] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [streakStatus, setStreakStatus] = useState<DevotionalStreakStatus | null>(null);
  const [streakLoading, setStreakLoading] = useState(true);
  const [showStreakCelebration, setShowStreakCelebration] = useState(false);
  const [showStreakCalendar, setShowStreakCalendar] = useState(false);
  const [churchTimeZone, setChurchTimeZone] = useState('America/New_York');
  const streakCelebrationClaimedRef = useRef(false);

  const showNotifyPrompt = Boolean(
    profile?.church_id && profile.devotional_notify_prompt_done === false,
  );

  const greeting = useMemo(() => {
    const name = greetingFirstName(profile?.full_name, session?.user?.email);
    return `${timeOfDayGreeting()}, ${name}`;
  }, [profile?.full_name, session?.user?.email]);

  const { hero, past } = useMemo(() => pickHeroAndPastSummaries(summaries), [summaries]);

  const loadSermons = useCallback(async () => {
    if (!supabase || !profile?.church_id) {
      setSummaries([]);
      setLoadingSermons(false);
      return;
    }

    const { data: sermonRows, error } = await supabase
      .from('sermons')
      .select('id, title, sermon_date, created_at, churches(name, timezone)')
      .eq('church_id', profile.church_id)
      .eq('workflow_status', 'published')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[home] sermons', error.message);
      setSummaries([]);
      setLoadingSermons(false);
      return;
    }

    const sermons = (sermonRows as SermonHomeRow[]) ?? [];
    if (sermons.length > 0) {
      const tzRow = sermons[0].churches;
      const tz = Array.isArray(tzRow) ? tzRow[0]?.timezone : tzRow?.timezone;
      if (tz) setChurchTimeZone(tz);
    }
    if (sermons.length === 0) {
      setSummaries([]);
      setLoadingSermons(false);
      return;
    }

    const sermonIds = sermons.map((s) => s.id);
    const { data: devotionalRows } = await supabase
      .from('devotionals')
      .select('id, day_number, sermon_id, title')
      .in('sermon_id', sermonIds)
      .order('day_number', { ascending: true });

    const devotionals = (devotionalRows as DevotionalHomeRow[]) ?? [];
    const devotionalsBySermon = new Map<string, DevotionalHomeRow[]>();
    for (const d of devotionals) {
      const list = devotionalsBySermon.get(d.sermon_id) ?? [];
      list.push(d);
      devotionalsBySermon.set(d.sermon_id, list);
    }

    const completedByDevotional = new Set<string>();
    if (session?.user && devotionals.length > 0) {
      const { data: prog } = await supabase
        .from('user_progress')
        .select('devotional_id, completed_at')
        .eq('user_id', session.user.id)
        .in(
          'devotional_id',
          devotionals.map((d) => d.id),
        );

      for (const row of prog ?? []) {
        if (row.completed_at) completedByDevotional.add(row.devotional_id as string);
      }
    }

    const nextSummaries = sermons.map((sermon) => {
      const sermonDevs = devotionalsBySermon.get(sermon.id) ?? [];
      const completedIds = new Set<string>();
      for (const d of sermonDevs) {
        if (completedByDevotional.has(d.id)) completedIds.add(d.id);
      }
      return summarizeSermonForHome(sermon, sermonDevs, completedIds);
    });

    setSummaries(nextSummaries);
    setLoadingSermons(false);
  }, [profile?.church_id, session?.user?.id]);

  useEffect(() => {
    if (!loading && !session) {
      router.replace('/login');
    }
  }, [loading, session]);

  useEffect(() => {
    if (profile?.church_id) {
      setLoadingSermons(true);
      void loadSermons();
    }
  }, [profile?.church_id, loadSermons]);

  const loadStreak = useCallback(async (opts?: { checkCelebration?: boolean }) => {
    if (!profile?.church_id || !session?.user?.id) {
      setStreakStatus(null);
      setStreakLoading(false);
      return;
    }
    setStreakLoading(true);
    const timeZone = await fetchChurchTimeZone(profile.church_id);
    setChurchTimeZone(timeZone);
    const status = await fetchDevotionalStreakStatus();
    setStreakStatus(status);
    setStreakLoading(false);
    if (
      opts?.checkCelebration &&
      status &&
      !streakCelebrationClaimedRef.current
    ) {
      const show = await claimStreakCelebrationForToday(status, timeZone);
      if (show) {
        streakCelebrationClaimedRef.current = true;
        setShowStreakCelebration(true);
      }
    }
  }, [profile?.church_id, session?.user?.id]);

  useFocusEffect(
    useCallback(() => {
      // Reload sermons + progress when returning from a completed day.
      void loadSermons();
      void loadStreak({ checkCelebration: true });
    }, [loadSermons, loadStreak]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadSermons();
    await loadStreak();
    setRefreshing(false);
  }, [loadSermons, loadStreak]);

  function dismissStreakCelebration() {
    setShowStreakCelebration(false);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {profile?.id && showNotifyPrompt ? (
        <DevotionalNotifyPrompt
          visible
          userId={profile.id}
          onComplete={() => void refreshProfile()}
        />
      ) : null}
      {streakStatus?.isActive && streakStatus.streakCount > 0 ? (
        <StreakCelebration
          visible={showStreakCelebration}
          streakCount={streakStatus.streakCount}
          completedToday={streakStatus.completedToday}
          onContinue={dismissStreakCelebration}
        />
      ) : null}
      {profile?.id ? (
        <StreakCalendarModal
          visible={showStreakCalendar}
          userId={profile.id}
          timeZone={churchTimeZone}
          streakStatus={streakStatus}
          onClose={() => setShowStreakCalendar(false)}
        />
      ) : null}

      <View style={styles.header}>
        <Image
          source={require('../../../assets/logo.png')}
          style={styles.brandMark}
          accessibilityLabel="Sermon Recall"
        />
        <View style={styles.headerRight}>
          <HomeStreakBadge
            status={streakStatus}
            loading={streakLoading}
            onPress={() => setShowStreakCalendar(true)}
          />
        </View>
      </View>

      {loadingSermons ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.blue} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.blue} />
          }
        >
          <Text style={styles.greeting}>{greeting}</Text>

          {hero ? (
            <HeroSermonCard summary={hero} styles={styles} />
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No sermons yet</Text>
              <Text style={styles.emptyBody}>
                When your pastor adds sermons in the admin portal, they will show up here.
              </Text>
            </View>
          )}

          {past.length > 0 ? (
            <>
              <Text style={styles.pastSectionTitle}>Past sermons</Text>
              <View style={styles.pastList}>
                {past.map((item) => (
                  <PastSermonCard key={item.sermon.id} summary={item} styles={styles} />
                ))}
              </View>
            </>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
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

function HeroSermonCard({
  summary,
  styles,
}: {
  summary: SermonHomeSummary;
  styles: ReturnType<typeof createStyles>;
}) {
  const {
    sermon,
    devotionals,
    totalDays,
    completedCount,
    nextDevotional,
    nextIncomplete,
    allDone,
  } = summary;
  const focusDay = nextDevotional ?? nextIncomplete;
  const dayLabel =
    totalDays > 0 && focusDay ? `Day ${focusDay.day_number} of ${totalDays}` : null;
  const readingTitle = devotionalDisplayTitle(focusDay);
  const { label: statusLabel, tone: statusTone } = heroStatusLabel(summary);

  const meta =
    [churchDisplayName(sermon.churches), formatSermonDate(sermon.sermon_date)]
      .filter(Boolean)
      .join(' · ') || '—';

  const lastDevotional = devotionals[devotionals.length - 1];
  const showReadingPrimary = Boolean(nextDevotional);

  const dayNum = nextDevotional?.day_number;
  const readingLabel =
    completedCount > 0
      ? dayNum
        ? `Continue Day ${dayNum} →`
        : "Continue today's reading →"
      : dayNum
        ? `Begin Day ${dayNum} →`
        : "Begin today's reading →";
  const readingOnPress = nextDevotional
    ? () => router.push(`/devotional/${nextDevotional.id}`)
    : undefined;

  return (
    <View style={styles.heroCard}>
      <Text style={styles.heroTitle} numberOfLines={3}>
        {displaySermonTitle(sermon.title)}
      </Text>
      <Text style={styles.heroMeta}>{meta}</Text>

      {dayLabel ? <Text style={styles.heroDayLabel}>{dayLabel}</Text> : null}
      {readingTitle ? (
        <Text style={styles.heroReadingTitle} numberOfLines={2}>
          {readingTitle}
        </Text>
      ) : null}

      {totalDays > 0 ? (
        <ProgressDots totalDays={totalDays} completedCount={completedCount} styles={styles} />
      ) : null}

      {/* Skip redundant status when the primary CTA already says continue/begin. */}
      {!showReadingPrimary ? (
        <Text
          style={[
            styles.statusLabel,
            statusTone === 'action' ? styles.statusAction : styles.statusMuted,
          ]}
        >
          {statusLabel}
        </Text>
      ) : null}

      <View style={styles.heroActions}>
        {showReadingPrimary ? (
          <Pressable
            style={({ pressed }) => [styles.heroCtaPrimary, pressed && styles.heroCtaPressed]}
            onPress={readingOnPress}
          >
            <Text style={styles.heroCtaPrimaryLabel}>{readingLabel}</Text>
          </Pressable>
        ) : null}

        <Pressable
          style={({ pressed }) => [
            showReadingPrimary ? styles.heroCtaSecondary : styles.heroCtaPrimary,
            pressed && styles.heroCtaPressed,
          ]}
          onPress={() => router.push(`/sermon/${sermon.id}`)}
        >
          <Text
            style={
              showReadingPrimary ? styles.heroCtaSecondaryLabel : styles.heroCtaPrimaryLabel
            }
          >
            View six-day journey →
          </Text>
        </Pressable>

        {!showReadingPrimary && allDone && lastDevotional ? (
          <Pressable
            style={({ pressed }) => [styles.heroCtaSecondary, pressed && styles.heroCtaPressed]}
            onPress={() => router.push(`/devotional/${lastDevotional.id}`)}
          >
            <Text style={styles.heroCtaSecondaryLabel}>Review last day →</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function PastSermonCard({
  summary,
  styles,
}: {
  summary: SermonHomeSummary;
  styles: ReturnType<typeof createStyles>;
}) {
  const { sermon } = summary;
  const progressLabel = pastSermonProgressLabel(summary);
  const meta =
    [churchDisplayName(sermon.churches), formatSermonDate(sermon.sermon_date)]
      .filter(Boolean)
      .join(' · ') || '—';

  return (
    <Pressable
      style={({ pressed }) => [styles.pastCard, pressed && styles.pastCardPressed]}
      onPress={() => router.push(`/sermon/${sermon.id}`)}
    >
      <Text style={styles.pastTitle} numberOfLines={2}>
        {displaySermonTitle(sermon.title)}
      </Text>
      <Text style={styles.pastMeta}>{meta}</Text>
      <Text style={[styles.statusLabel, styles.statusMuted]}>{progressLabel}</Text>
    </Pressable>
  );
}

function createStyles(c: RecallionColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bgPage },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 24 },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingBottom: 8,
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    brandMark: { width: 44, height: 44, borderRadius: 10 },
    greeting: {
      fontSize: 28,
      fontWeight: '700',
      color: c.navy,
      letterSpacing: -0.3,
      marginBottom: 20,
    },
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: 48,
      backgroundColor: c.bgPage,
    },
    heroCard: {
      backgroundColor: c.bgCard,
      borderRadius: c.radiusCard,
      padding: 22,
      borderWidth: 1,
      borderColor: c.blue,
    },
    heroTitle: {
      fontSize: 24,
      fontWeight: '600',
      color: c.navy,
      lineHeight: 30,
      letterSpacing: -0.2,
    },
    heroMeta: {
      marginTop: 8,
      fontSize: 14,
      color: c.muted,
    },
    heroDayLabel: {
      marginTop: 16,
      fontSize: 13,
      fontWeight: '600',
      color: c.blue,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    heroReadingTitle: {
      marginTop: 8,
      fontSize: 18,
      fontWeight: '500',
      color: c.navy,
      lineHeight: 24,
    },
    dotsRow: {
      flexDirection: 'row',
      gap: 6,
      marginTop: 12,
    },
    dot: {
      flex: 1,
      height: 6,
      borderRadius: 999,
    },
    dotDone: { backgroundColor: c.blue },
    dotRest: { backgroundColor: c.progressRest },
    statusLabel: {
      marginTop: 14,
      fontSize: 15,
      fontWeight: '600',
    },
    statusAction: { color: c.blue },
    statusMuted: { color: c.muted },
    heroActions: {
      marginTop: 18,
      gap: 10,
    },
    heroCtaPrimary: {
      backgroundColor: c.ctaSolid,
      borderRadius: 50,
      paddingVertical: 15,
      alignItems: 'center',
    },
    heroCtaSecondary: {
      borderRadius: 50,
      paddingVertical: 14,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.borderSubtle,
      backgroundColor: 'transparent',
    },
    heroCtaDisabled: { opacity: 0.55 },
    heroCtaPressed: { opacity: 0.92 },
    heroCtaPrimaryLabel: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '700',
    },
    heroCtaPrimaryLabelDisabled: {
      color: '#0f172a',
    },
    heroCtaSecondaryLabel: {
      color: c.navy,
      fontSize: 15,
      fontWeight: '600',
    },
    pastSectionTitle: {
      marginTop: 28,
      marginBottom: 12,
      fontSize: 18,
      fontWeight: '600',
      color: c.navy,
    },
    pastList: { gap: 12 },
    pastCard: {
      backgroundColor: c.bgCard,
      borderRadius: c.radiusCard,
      padding: 18,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.borderSubtle,
    },
    pastCardPressed: { opacity: 0.95 },
    pastTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: c.navy,
      lineHeight: 26,
    },
    pastMeta: {
      marginTop: 6,
      fontSize: 14,
      color: c.muted,
    },
    empty: { paddingVertical: 40, paddingHorizontal: 8 },
    emptyTitle: { fontSize: 18, fontWeight: '600', color: c.navyMid, textAlign: 'center' },
    emptyBody: {
      marginTop: 10,
      fontSize: 15,
      color: c.muted,
      textAlign: 'center',
      lineHeight: 22,
    },
  });
}
