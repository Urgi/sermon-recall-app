import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../../../contexts/AuthContext';
import { accessibleDevotionalIds, buildUnlockContext, nextUnlockedIncompleteDevotional } from '../../../lib/devotionalUnlock';
import { recallion } from '../../../lib/recallionTheme';
import { supabase } from '../../../lib/supabase';
import { touchDevotionalOpen } from '../../../lib/touchDevotionalOpen';
import { createVoicePlaybackUrl, uploadVoiceCommitment } from '../../../lib/voiceCommitment';

/** When the row has no AI `pre_prompt`, we still gate reading with a generic retrieval question. */
const DEFAULT_PRE_SESSION_PROMPT =
  'Before you read: in a sentence or two, what do you remember from the sermon that connects to today’s theme?';

type DevotionalDetail = {
  id: string;
  day_number: number;
  title: string | null;
  main_content: string | null;
  scripture_reference: string | null;
  scripture_text: string | null;
  reflection_question: string | null;
  estimated_minutes: number;
  sermon_id: string;
  pre_prompt: string | null;
};

type ProgressRow = {
  pre_prompt_response: string | null;
  application_commitment: string | null;
  voice_recording_url: string | null;
  completed_at: string | null;
};

type SermonTiny = {
  title: string;
  sermon_date: string | null;
  created_at: string;
  churches: { timezone: string } | { timezone: string }[] | null;
};

function formatSermonKicker(iso: string | null): string | null {
  if (!iso) return null;
  try {
    const d = new Date(`${iso}T12:00:00`);
    return d.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return null;
  }
}

export default function DevotionalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const [row, setRow] = useState<DevotionalDetail | null>(null);
  const [progress, setProgress] = useState<ProgressRow | null>(null);
  const [sermonTitle, setSermonTitle] = useState<string | null>(null);
  const [sermonDate, setSermonDate] = useState<string | null>(null);
  const [totalDays, setTotalDays] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [nextDayHint, setNextDayHint] = useState<number | null>(null);

  const [gateDraft, setGateDraft] = useState('');
  const [commitmentDraft, setCommitmentDraft] = useState('');
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [sessionVoicePath, setSessionVoicePath] = useState<string | null>(null);
  /** Local file URI from the last stop — use for playback so we don’t wait on network right after recording. */
  const [localVoiceUri, setLocalVoiceUri] = useState<string | null>(null);
  const playAfterLoadRef = useRef(false);
  const playbackFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recordState = useAudioRecorderState(recorder, 400);
  const voicePlayer = useAudioPlayer(null, { downloadFirst: true });
  const voicePlayerStatus = useAudioPlayerStatus(voicePlayer);

  const completed = Boolean(progress?.completed_at);

  const gatePromptText =
    row?.pre_prompt?.trim() || DEFAULT_PRE_SESSION_PROMPT;

  /** Deliverables: answer the retrieval question before any devotional body is shown. */
  const needsPreSessionGate =
    !completed && !String(progress?.pre_prompt_response ?? '').trim();

  const effectiveVoicePath =
    sessionVoicePath ?? (progress?.voice_recording_url?.trim() || null);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = Boolean(opts?.silent);
    if (!supabase || !id) return;
    if (!silent) setLoading(true);
    setError(null);
    setAccessDenied(false);
    setNextDayHint(null);

    const { data: d, error: e1 } = await supabase
      .from('devotionals')
      .select(
        'id, day_number, title, main_content, scripture_reference, scripture_text, reflection_question, estimated_minutes, sermon_id, pre_prompt',
      )
      .eq('id', id)
      .maybeSingle();

    if (e1 || !d) {
      setError('Could not load this devotional.');
      setRow(null);
      setProgress(null);
      if (!silent) setLoading(false);
      return;
    }

    setRow(d as DevotionalDetail);

    const sermonId = (d as DevotionalDetail).sermon_id;

    const [{ data: s }, { data: sibs }, countRes] = await Promise.all([
      supabase
        .from('sermons')
        .select('title, sermon_date, created_at, churches(timezone)')
        .eq('id', sermonId)
        .maybeSingle(),
      supabase
        .from('devotionals')
        .select('id, day_number')
        .eq('sermon_id', sermonId)
        .order('day_number', { ascending: true }),
      supabase
        .from('devotionals')
        .select('id', { count: 'exact', head: true })
        .eq('sermon_id', sermonId),
    ]);

    const sm = s as SermonTiny | null;
    setSermonTitle(sm?.title ?? null);
    setSermonDate(sm?.sermon_date ?? null);
    setTotalDays(countRes.count ?? 0);

    const siblingList =
      (sibs as { id: string; day_number: number }[] | null)?.filter(Boolean) ?? [];
    const siblingIds = siblingList.map((x) => x.id);

    const completedIds = new Set<string>();
    let progRow: ProgressRow | null = null;

    if (session?.user && siblingIds.length > 0) {
      const { data: progAll } = await supabase
        .from('user_progress')
        .select('devotional_id, completed_at')
        .eq('user_id', session.user.id)
        .in('devotional_id', siblingIds);

      for (const p of progAll ?? []) {
        if (p.completed_at) completedIds.add(p.devotional_id as string);
      }

      const { data: mine } = await supabase
        .from('user_progress')
        .select('pre_prompt_response, application_commitment, voice_recording_url, completed_at')
        .eq('user_id', session.user.id)
        .eq('devotional_id', id)
        .maybeSingle();

      if (mine) {
        progRow = mine as ProgressRow;
      }
    }

    setProgress(progRow);
    setSessionVoicePath(null);
    setLocalVoiceUri(null);
    setGateDraft('');
    setCommitmentDraft(progRow?.application_commitment?.trim() ?? '');

    const churchTzRow = sm?.churches;
    const churchTz = Array.isArray(churchTzRow)
      ? churchTzRow[0]?.timezone
      : churchTzRow?.timezone;
    const unlockCtx =
      sm?.created_at != null
        ? buildUnlockContext({
            sermonDateYmd: sm.sermon_date,
            sermonCreatedAtIso: sm.created_at,
            churchTimeZone: churchTz ?? 'America/New_York',
          })
        : null;

    const unlocked =
      siblingList.length > 0
        ? accessibleDevotionalIds(siblingList, completedIds, unlockCtx)
        : new Set(id);
    const allowed = unlocked.has(id);
    setAccessDenied(!allowed);

    if (!allowed && siblingList.length > 0) {
      const nextUp = nextUnlockedIncompleteDevotional(siblingList, completedIds, unlocked);
      setNextDayHint(nextUp?.day_number ?? null);
    } else {
      setNextDayHint(null);
    }

    if (!silent) setLoading(false);
  }, [id, session?.user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Pastor analytics: member opened the devotional body (after pre-session gate when applicable). */
  useEffect(() => {
    if (loading || accessDenied || !row?.id || !session?.user?.id) return;
    if (needsPreSessionGate) return;
    void touchDevotionalOpen(row.id);
  }, [loading, accessDenied, needsPreSessionGate, row?.id, session?.user?.id]);

  /** `replace()` loads asynchronously — wait until `isLoaded` before `play()`. */
  useEffect(() => {
    if (!playAfterLoadRef.current || !voicePlayerStatus.isLoaded) return;
    if (playbackFallbackTimerRef.current) {
      clearTimeout(playbackFallbackTimerRef.current);
      playbackFallbackTimerRef.current = null;
    }
    playAfterLoadRef.current = false;
    try {
      void voicePlayer.seekTo(0);
      voicePlayer.play();
    } finally {
      setVoiceBusy(false);
    }
  }, [voicePlayer, voicePlayerStatus.isLoaded]);

  useEffect(() => {
    return () => {
      if (playbackFallbackTimerRef.current) {
        clearTimeout(playbackFallbackTimerRef.current);
      }
    };
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load({ silent: true });
    setRefreshing(false);
  }, [load]);

  async function startVoice() {
    if (!session?.user || !row) return;
    setError(null);
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        setError('Microphone access is needed to record.');
        return;
      }
      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
        interruptionMode: 'duckOthers',
        shouldPlayInBackground: false,
        shouldRouteThroughEarpiece: false,
      });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start recording.');
    }
  }

  async function stopVoiceUpload() {
    if (!supabase || !session?.user || !row) return;
    if (!recorder.isRecording) return;
    setVoiceBusy(true);
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) {
        setVoiceBusy(false);
        return;
      }
      setLocalVoiceUri(uri);

      const up = await uploadVoiceCommitment({
        supabase,
        localUri: uri,
        userId: session.user.id,
        devotionalId: row.id,
      });
      if ('error' in up) {
        setError(up.error);
        setLocalVoiceUri(null);
      } else {
        setSessionVoicePath(up.path);
      }
      /** Next `startVoice()` calls `prepareToRecordAsync()` — avoid preparing here so the temp file stays valid for playback. */
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Recording failed.');
    }
    setVoiceBusy(false);
  }

  async function toggleVoicePlayback() {
    if (!supabase || !effectiveVoicePath) return;
    setError(null);

    function tryPlayWhenReady() {
      if (!playAfterLoadRef.current) return;
      const ready = voicePlayer.currentStatus?.isLoaded ?? false;
      if (!ready) return;
      playAfterLoadRef.current = false;
      if (playbackFallbackTimerRef.current) {
        clearTimeout(playbackFallbackTimerRef.current);
        playbackFallbackTimerRef.current = null;
      }
      try {
        void voicePlayer.seekTo(0);
        voicePlayer.play();
      } finally {
        setVoiceBusy(false);
      }
    }

    try {
      if (voicePlayerStatus.playing) {
        voicePlayer.pause();
        return;
      }
      setVoiceBusy(true);

      const remoteUrl =
        localVoiceUri == null ? await createVoicePlaybackUrl(supabase, effectiveVoicePath) : null;
      const src = localVoiceUri ?? remoteUrl;
      if (!src) {
        setError('Could not prepare playback.');
        setVoiceBusy(false);
        return;
      }

      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: false,
        interruptionMode: 'duckOthers',
        shouldPlayInBackground: false,
        shouldRouteThroughEarpiece: false,
      });

      playAfterLoadRef.current = true;
      voicePlayer.replace(src);

      requestAnimationFrame(() => {
        tryPlayWhenReady();
        requestAnimationFrame(() => tryPlayWhenReady());
      });

      if (playbackFallbackTimerRef.current) {
        clearTimeout(playbackFallbackTimerRef.current);
      }
      playbackFallbackTimerRef.current = setTimeout(() => {
        playbackFallbackTimerRef.current = null;
        if (!playAfterLoadRef.current) return;
        playAfterLoadRef.current = false;
        setVoiceBusy(false);
        setError('Playback did not start. Check volume and try again.');
      }, 12000);
    } catch (e) {
      playAfterLoadRef.current = false;
      setError(e instanceof Error ? e.message : 'Playback failed.');
      setVoiceBusy(false);
    }
  }

  async function submitGate() {
    if (!supabase || !session?.user || !row) return;
    const text = gateDraft.trim();
    if (!text) {
      setError('Write a short answer to continue.');
      return;
    }
    setSaving(true);
    setError(null);
    const { error: upErr } = await supabase.from('user_progress').upsert(
      {
        user_id: session.user.id,
        devotional_id: row.id,
        pre_prompt_response: text,
      },
      { onConflict: 'user_id,devotional_id' },
    );
    setSaving(false);
    if (upErr) {
      setError(upErr.message);
      return;
    }
    setProgress((prev) => ({
      pre_prompt_response: text,
      application_commitment: prev?.application_commitment ?? null,
      voice_recording_url: prev?.voice_recording_url ?? null,
      completed_at: prev?.completed_at ?? null,
    }));
    setGateDraft('');
    await load({ silent: true });
  }

  async function markComplete() {
    if (!supabase || !session?.user || !row) return;
    const text = commitmentDraft.trim();
    const storedVoice = effectiveVoicePath;
    if (!text && !storedVoice) {
      setError('Add a written commitment or record a short voice commitment before completing.');
      return;
    }
    setSaving(true);
    setError(null);
    const { error: upErr } = await supabase.from('user_progress').upsert(
      {
        user_id: session.user.id,
        devotional_id: row.id,
        pre_prompt_response: progress?.pre_prompt_response?.trim()
          ? progress.pre_prompt_response
          : null,
        application_commitment: text || null,
        voice_recording_url: storedVoice,
        completed_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,devotional_id' },
    );
    setSaving(false);
    if (upErr) {
      setError(upErr.message);
      return;
    }
    await load({ silent: true });
  }

  const inner = (
    <>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={recallion.blue} />
        </View>
      ) : error && !row ? (
        <View style={styles.padBare}>
          <Text style={styles.err}>{error}</Text>
        </View>
      ) : !row ? (
        <View style={styles.padBare}>
          <Text style={styles.err}>Not found.</Text>
        </View>
      ) : accessDenied ? (
        <ScrollView contentContainerStyle={styles.scrollOuter} showsVerticalScrollIndicator={false}>
          <View style={styles.contentCard}>
            {sermonTitle ? (
              <View style={styles.sermonHeaderRow}>
                <View style={styles.sermonMark}>
                  <Text style={styles.sermonMarkText}>SR</Text>
                </View>
                <View style={styles.sermonHeaderText}>
                  <Text style={styles.sermonKicker} numberOfLines={1}>
                    {formatSermonKicker(sermonDate) ?? 'Sermon'}
                  </Text>
                  <Text style={styles.sermonTitleLine} numberOfLines={2}>
                    {sermonTitle}
                  </Text>
                </View>
              </View>
            ) : null}
            <View style={styles.cardSection}>
              <Text style={styles.lockTitle}>This day is locked</Text>
              <Text style={styles.lockBody}>
                During the six-day window after the sermon date, each day opens on its matching
                calendar day (your church&apos;s time zone). After those six days, every day unlocks
                so you can catch up in any order.
              </Text>
              {nextDayHint != null ? (
                <Text style={styles.lockHint}>
                  Open Day {nextDayHint} from this sermon first — you can still do earlier days if
                  they are open for you.
                </Text>
              ) : (
                <Text style={styles.lockHint}>
                  Go back to the sermon list to open a day that is available today.
                </Text>
              )}
              <Pressable
                style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
                onPress={() => router.back()}
              >
                <Text style={styles.primaryBtnLabel}>Back to sermon</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      ) : needsPreSessionGate ? (
        <ScrollView
          contentContainerStyle={styles.scrollOuter}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={recallion.blue} />
          }
        >
          <View style={styles.contentCard}>
            {sermonTitle ? (
              <View style={styles.sermonHeaderRow}>
                <View style={styles.sermonMark}>
                  <Text style={styles.sermonMarkText}>SR</Text>
                </View>
                <View style={styles.sermonHeaderText}>
                  <Text style={styles.sermonKicker} numberOfLines={1}>
                    {formatSermonKicker(sermonDate) ?? 'Sermon'}
                  </Text>
                  <Text style={styles.sermonTitleLine} numberOfLines={2}>
                    {sermonTitle}
                  </Text>
                </View>
              </View>
            ) : null}
            <View style={styles.cardHero}>
              <View style={styles.dayProgressRow}>
                <Text style={styles.dayOfCaps}>
                  Day {row.day_number} of {totalDays || '—'}
                </Text>
                <View style={styles.segmentRow}>
                  {Array.from({ length: Math.max(totalDays, 1) }).map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.segment,
                        i < row.day_number ? styles.segmentActive : styles.segmentIdle,
                      ]}
                    />
                  ))}
                </View>
              </View>
              <Text style={styles.gateKicker}>Pre-session retrieval</Text>
              <Text style={styles.gatePrompt}>{gatePromptText}</Text>
              <Text style={styles.gateHint}>
                Answer from memory first — then today&apos;s reading, reflection, and commitment will
                unlock below.
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Your answer"
                placeholderTextColor={recallion.muted}
                value={gateDraft}
                onChangeText={setGateDraft}
                multiline
                editable={!saving && Boolean(session?.user)}
                textAlignVertical="top"
              />
              {error ? <Text style={styles.inlineErr}>{error}</Text> : null}
              <Pressable
                style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
                onPress={() => void submitGate()}
                disabled={saving || !session?.user}
              >
                <Text style={styles.primaryBtnLabel}>
                  {saving ? 'Saving…' : 'Submit answer & open devotional'}
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollOuter}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={recallion.blue} />
          }
        >
          <View style={styles.contentCard}>
            {sermonTitle ? (
              <View style={styles.sermonHeaderRow}>
                <View style={styles.sermonMark}>
                  <Text style={styles.sermonMarkText}>SR</Text>
                </View>
                <View style={styles.sermonHeaderText}>
                  <Text style={styles.sermonKicker} numberOfLines={1}>
                    {formatSermonKicker(sermonDate) ?? 'Sermon'}
                  </Text>
                  <Text style={styles.sermonTitleLine} numberOfLines={2}>
                    {sermonTitle}
                  </Text>
                </View>
              </View>
            ) : null}

            <View style={styles.cardHero}>
              <View style={styles.dayProgressRow}>
                <Text style={styles.dayOfCaps}>
                  Day {row.day_number} of {totalDays || '—'}
                </Text>
                <View style={styles.segmentRow}>
                  {Array.from({ length: Math.max(totalDays, 1) }).map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.segment,
                        i < row.day_number ? styles.segmentActive : styles.segmentIdle,
                      ]}
                    />
                  ))}
                </View>
              </View>
              <Text style={styles.title}>
                {row.title ? row.title : `Day ${row.day_number}`}
              </Text>
              <View style={styles.readTimeRow}>
                <Ionicons name="time-outline" size={14} color={recallion.muted} />
                <Text style={styles.min}>{row.estimated_minutes} min read</Text>
              </View>

              {completed ? (
                <View style={styles.doneBanner}>
                  <Text style={styles.doneText}>You completed this day.</Text>
                </View>
              ) : null}

              {progress?.pre_prompt_response?.trim() ? (
                <View style={styles.recallBox}>
                  <Text style={styles.recallLabel}>Your recall answer</Text>
                  <Text style={styles.recallBody}>{progress.pre_prompt_response}</Text>
                </View>
              ) : null}
            </View>

            {row.scripture_reference || row.scripture_text ? (
              <View style={styles.scriptureSection}>
                <View style={styles.scriptureBlock}>
                  {row.scripture_reference ? (
                    <Text style={styles.scriptureRef}>{row.scripture_reference}</Text>
                  ) : null}
                  {row.scripture_text ? (
                    <Text style={styles.scriptureBody}>{row.scripture_text}</Text>
                  ) : null}
                </View>
              </View>
            ) : null}

            {row.main_content ? (
              <View style={styles.bodySection}>
                <Text style={styles.body}>{row.main_content}</Text>
              </View>
            ) : null}

            {row.reflection_question ? (
              <View style={styles.reflectSection}>
                <View style={styles.reflectHeader}>
                  <Ionicons name="bulb-outline" size={16} color={recallion.blue} />
                  <Text style={styles.reflectLabel}>Reflection</Text>
                </View>
                <Text style={styles.reflect}>{row.reflection_question}</Text>
              </View>
            ) : null}

            <View style={styles.commitmentSection}>
              <View style={styles.commitmentHeader}>
                <Ionicons name="flag-outline" size={18} color={recallion.blue} />
                <Text style={styles.commitmentTitle}>Application commitment</Text>
              </View>
              <Text style={styles.commitmentPrompt}>
                What&apos;s one concrete step you&apos;re doing or plan to do this week—something
                specific in real life that connects today&apos;s reading to how you&apos;ll actually
                live?
              </Text>
              <Text style={styles.commitmentHint}>
                Type below or record a short voice note answering that question. At least one is
                required to finish the day.
              </Text>
              <TextInput
                style={[styles.input, completed && styles.inputDisabled]}
                placeholder="e.g. This week I will ___ (who / what / when)."
                placeholderTextColor={recallion.muted}
                value={completed ? progress?.application_commitment ?? '' : commitmentDraft}
                onChangeText={setCommitmentDraft}
                multiline
                editable={!completed && !saving && Boolean(session?.user)}
                textAlignVertical="top"
              />
              {!completed && session?.user ? (
                <View style={[styles.voiceRow, styles.voiceRowAfterInput]}>
                  <Text style={styles.voiceSectionLabel}>Or record your answer</Text>
                  <View style={styles.voiceButtonsRow}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.voiceBtnOutline,
                        recordState.isRecording && styles.voiceBtnDanger,
                        pressed && styles.primaryBtnPressed,
                      ]}
                      onPress={() =>
                        void (recordState.isRecording ? stopVoiceUpload() : startVoice())
                      }
                      disabled={voiceBusy || saving}
                    >
                      <View style={styles.voiceBtnInner}>
                        {!recordState.isRecording ? (
                          <View style={styles.recDot} />
                        ) : null}
                        <Ionicons
                          name="mic-outline"
                          size={16}
                          color={recordState.isRecording ? '#fff' : recallion.navyMid}
                        />
                        <Text
                          style={[
                            styles.voiceBtnOutlineLabel,
                            recordState.isRecording && styles.voiceBtnDangerLabel,
                          ]}
                        >
                          {voiceBusy && !recordState.isRecording
                            ? 'Saving…'
                            : recordState.isRecording
                              ? 'Stop & upload'
                              : 'Record voice note'}
                        </Text>
                      </View>
                    </Pressable>
                    {effectiveVoicePath ? (
                      <Pressable
                        style={({ pressed }) => [
                          styles.voiceBtnOutline,
                          pressed && styles.primaryBtnPressed,
                        ]}
                        onPress={() => void toggleVoicePlayback()}
                        disabled={voiceBusy}
                      >
                        <Text style={styles.voiceBtnOutlineLabel}>
                          {voicePlayerStatus.playing ? 'Stop playback' : 'Play recording'}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              ) : null}
              {completed && effectiveVoicePath ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.voiceBtnOutline,
                    styles.voicePlaybackCompleted,
                    pressed && styles.primaryBtnPressed,
                  ]}
                  onPress={() => void toggleVoicePlayback()}
                  disabled={voiceBusy}
                >
                  <Text style={styles.voiceBtnOutlineLabel}>
                    {voicePlayerStatus.playing ? 'Stop playback' : 'Play voice commitment'}
                  </Text>
                </Pressable>
              ) : null}
            </View>

            <View style={styles.ctaSection}>
              {error ? <Text style={styles.inlineErr}>{error}</Text> : null}

              {!completed ? (
                <Pressable
                  style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
                  onPress={() => void markComplete()}
                  disabled={saving || !session?.user}
                >
                  <View style={styles.primaryBtnInner}>
                    <Ionicons name="checkmark" size={18} color="#fff" />
                    <Text style={styles.primaryBtnLabel}>
                      {saving ? 'Saving…' : 'Mark day complete'}
                    </Text>
                  </View>
                </Pressable>
              ) : null}
            </View>
          </View>
        </ScrollView>
      )}
    </>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        {inner}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: recallion.bgPage },
  flex: { flex: 1 },
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
  padBare: { padding: 20, paddingBottom: 48 },
  scrollOuter: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 48 },
  contentCard: {
    backgroundColor: recallion.bgCard,
    borderRadius: recallion.radiusCard,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: recallion.borderSubtle,
    overflow: 'hidden',
  },
  sermonHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: recallion.borderSubtle,
  },
  sermonMark: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: recallion.brandMarkBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sermonMarkText: {
    fontSize: 13,
    fontWeight: '500',
    color: recallion.brandMarkText,
    letterSpacing: -0.3,
  },
  sermonHeaderText: { flex: 1, minWidth: 0 },
  sermonKicker: {
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: recallion.muted,
    fontWeight: '500',
  },
  sermonTitleLine: {
    fontSize: 15,
    color: recallion.navy,
    fontWeight: '500',
    marginTop: 2,
  },
  cardSection: { paddingHorizontal: 22, paddingTop: 18, paddingBottom: 24 },
  cardHero: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 8 },
  dayProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  dayOfCaps: {
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: recallion.blue,
    fontWeight: '500',
  },
  segmentRow: { flex: 1, flexDirection: 'row', gap: 4 },
  segment: { height: 3, flex: 1, borderRadius: 2 },
  segmentActive: { backgroundColor: recallion.blue },
  segmentIdle: { backgroundColor: recallion.progressRest },
  err: { color: '#b91c1c', fontSize: 16 },
  inlineErr: { color: '#b91c1c', fontSize: 14, marginBottom: 12 },
  lockTitle: { fontSize: 22, fontWeight: '600', color: recallion.navy, marginBottom: 10 },
  lockBody: { fontSize: 16, lineHeight: 24, color: recallion.navyMid, marginBottom: 12 },
  lockHint: { fontSize: 16, fontWeight: '600', color: recallion.blue, marginBottom: 20 },
  gateKicker: {
    fontSize: 11,
    fontWeight: '500',
    color: recallion.blue,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  gatePrompt: {
    fontSize: 18,
    fontWeight: '600',
    color: recallion.navy,
    lineHeight: 26,
    marginBottom: 10,
  },
  gateHint: { fontSize: 14, color: recallion.muted, lineHeight: 21, marginBottom: 16 },
  title: {
    fontSize: 24,
    fontWeight: '500',
    color: recallion.navy,
    lineHeight: 30,
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  readTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  min: { fontSize: 13, color: recallion.muted },
  doneBanner: {
    marginTop: 16,
    padding: 12,
    borderRadius: recallion.radiusSm,
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(34,197,94,0.35)',
  },
  doneText: { fontSize: 15, fontWeight: '600', color: '#86efac' },
  recallBox: {
    marginTop: 16,
    padding: 16,
    borderRadius: recallion.radiusMd,
    backgroundColor: recallion.bgWash,
    borderLeftWidth: 3,
    borderLeftColor: recallion.blue,
  },
  recallLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: recallion.blue,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  recallBody: { fontSize: 15, lineHeight: 24, color: recallion.navyMid },
  scriptureSection: { paddingHorizontal: 22, paddingVertical: 10 },
  scriptureBlock: {
    padding: 16,
    paddingHorizontal: 18,
    backgroundColor: recallion.bgWash,
    borderRadius: recallion.radiusMd,
    borderLeftWidth: 3,
    borderLeftColor: recallion.blue,
  },
  scriptureRef: {
    fontSize: 11,
    fontWeight: '500',
    color: recallion.blue,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  scriptureBody: {
    fontSize: 15,
    lineHeight: 24,
    color: recallion.navyMid,
    fontStyle: 'italic',
  },
  bodySection: { paddingHorizontal: 22, paddingTop: 4, paddingBottom: 20 },
  body: { fontSize: 16, lineHeight: 27, color: recallion.navyMid },
  reflectSection: {
    marginHorizontal: 22,
    marginBottom: 22,
    padding: 18,
    backgroundColor: recallion.bgWash,
    borderRadius: recallion.radiusMd,
  },
  reflectHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  reflectLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: recallion.blue,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  reflect: { fontSize: 16, lineHeight: 25, color: recallion.navy },
  commitmentSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: recallion.borderSubtle,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 8,
  },
  commitmentHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  commitmentTitle: { fontSize: 18, color: recallion.navy, fontWeight: '500' },
  commitmentPrompt: {
    fontSize: 14,
    lineHeight: 22,
    color: recallion.navyMid,
    marginBottom: 6,
  },
  commitmentHint: {
    fontSize: 13,
    lineHeight: 20,
    color: recallion.muted,
    marginBottom: 14,
  },
  ctaSection: { paddingHorizontal: 22, paddingBottom: 24 },
  primaryBtn: {
    marginTop: 16,
    backgroundColor: recallion.ctaSolid,
    paddingVertical: 15,
    borderRadius: recallion.radiusMd,
    alignItems: 'center',
  },
  primaryBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
  },
  primaryBtnPressed: { opacity: 0.9 },
  primaryBtnLabel: { color: '#fff', fontSize: 15, fontWeight: '500' },
  input: {
    minHeight: 100,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: recallion.borderInput,
    borderRadius: recallion.radiusSm,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    lineHeight: 21,
    color: recallion.navy,
    backgroundColor: recallion.bgCard,
  },
  inputDisabled: { backgroundColor: recallion.bgWash, color: recallion.navyMid },
  voiceRow: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 12,
  },
  voiceSectionLabel: {
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: recallion.muted,
    fontWeight: '500',
  },
  voiceButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    alignItems: 'center',
  },
  voiceRowAfterInput: {
    marginTop: 14,
    marginBottom: 0,
  },
  voicePlaybackCompleted: {
    alignSelf: 'flex-start',
    marginTop: 14,
  },
  voiceBtnOutline: {
    backgroundColor: recallion.bgCard,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: recallion.borderInput,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: recallion.radiusSm,
  },
  voiceBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  recDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: recallion.ctaSolid,
  },
  voiceBtnOutlineLabel: {
    color: recallion.navyMid,
    fontSize: 14,
    fontWeight: '500',
  },
  voiceBtnDanger: {
    backgroundColor: '#b91c1c',
    borderColor: '#b91c1c',
  },
  voiceBtnDangerLabel: { color: '#fff' },
});
