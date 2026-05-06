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
import { useCallback, useEffect, useState } from 'react';
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
import { accessibleDevotionalIds } from '../../../lib/devotionalUnlock';
import { supabase } from '../../../lib/supabase';
import { createVoicePlaybackUrl, uploadVoiceCommitment } from '../../../lib/voiceCommitment';

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

type SermonTiny = { title: string };

export default function DevotionalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const [row, setRow] = useState<DevotionalDetail | null>(null);
  const [progress, setProgress] = useState<ProgressRow | null>(null);
  const [sermonTitle, setSermonTitle] = useState<string | null>(null);
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

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recordState = useAudioRecorderState(recorder, 400);
  const voicePlayer = useAudioPlayer(null);
  const voicePlayerStatus = useAudioPlayerStatus(voicePlayer);

  const completed = Boolean(progress?.completed_at);

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
      supabase.from('sermons').select('title').eq('id', sermonId).maybeSingle(),
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

    setSermonTitle((s as SermonTiny | null)?.title ?? null);
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
    setGateDraft('');
    setCommitmentDraft(progRow?.application_commitment?.trim() ?? '');

    const unlocked =
      siblingList.length > 0 ? accessibleDevotionalIds(siblingList, completedIds) : new Set(id);
    const allowed = unlocked.has(id);
    setAccessDenied(!allowed);

    if (!allowed && siblingList.length > 0) {
      const sorted = [...siblingList].sort((a, b) => a.day_number - b.day_number);
      const nextUp = sorted.find((r) => !completedIds.has(r.id));
      setNextDayHint(nextUp?.day_number ?? null);
    } else {
      setNextDayHint(null);
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
      const up = await uploadVoiceCommitment({
        supabase,
        localUri: uri,
        userId: session.user.id,
        devotionalId: row.id,
      });
      if ('error' in up) {
        setError(up.error);
      } else {
        setSessionVoicePath(up.path);
      }
      await recorder.prepareToRecordAsync();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Recording failed.');
    }
    setVoiceBusy(false);
  }

  async function toggleVoicePlayback() {
    if (!supabase || !effectiveVoicePath) return;
    setError(null);
    try {
      if (voicePlayerStatus.playing) {
        voicePlayer.pause();
        return;
      }
      setVoiceBusy(true);
      const url = await createVoicePlaybackUrl(supabase, effectiveVoicePath);
      if (!url) {
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
      voicePlayer.replace(url);
      voicePlayer.play();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Playback failed.');
    }
    setVoiceBusy(false);
  }

  const needsGate =
    Boolean(row?.pre_prompt?.trim()) && !progress?.pre_prompt_response?.trim() && !completed;

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
        pre_prompt_response: row.pre_prompt?.trim()
          ? progress?.pre_prompt_response ?? null
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
          <ActivityIndicator size="large" color="#1d4ed8" />
        </View>
      ) : error && !row ? (
        <View style={styles.pad}>
          <Text style={styles.err}>{error}</Text>
        </View>
      ) : !row ? (
        <View style={styles.pad}>
          <Text style={styles.err}>Not found.</Text>
        </View>
      ) : accessDenied ? (
        <ScrollView contentContainerStyle={styles.pad} showsVerticalScrollIndicator={false}>
          {sermonTitle ? <Text style={styles.series}>{sermonTitle}</Text> : null}
          <Text style={styles.lockTitle}>This day is locked</Text>
          <Text style={styles.lockBody}>
            Days unlock in order. Finish each day before the next one opens.
          </Text>
          {nextDayHint != null ? (
            <Text style={styles.lockHint}>Continue with Day {nextDayHint} first.</Text>
          ) : null}
          <Pressable
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
            onPress={() => router.back()}
          >
            <Text style={styles.primaryBtnLabel}>Back to sermon</Text>
          </Pressable>
        </ScrollView>
      ) : needsGate ? (
        <ScrollView
          contentContainerStyle={styles.pad}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1d4ed8" />
          }
        >
          {sermonTitle ? <Text style={styles.series}>{sermonTitle}</Text> : null}
          <Text style={styles.gateKicker}>Recall</Text>
          <Text style={styles.gatePrompt}>{row.pre_prompt?.trim()}</Text>
          <Text style={styles.gateHint}>
            Answer from memory before reading today&apos;s content — that strengthens retention.
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Your answer"
            placeholderTextColor="#94a3b8"
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
            <Text style={styles.primaryBtnLabel}>{saving ? 'Saving…' : 'Continue to devotional'}</Text>
          </Pressable>
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={styles.pad}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1d4ed8" />
          }
        >
          {sermonTitle ? <Text style={styles.series}>{sermonTitle}</Text> : null}
          <Text style={styles.dayOf}>
            Day {row.day_number} of {totalDays || '—'}
          </Text>
          <Text style={styles.title}>
            {row.title ? row.title : `Day ${row.day_number}`}
          </Text>
          <Text style={styles.min}>~{row.estimated_minutes} min</Text>

          {completed ? (
            <View style={styles.doneBanner}>
              <Text style={styles.doneText}>You completed this day.</Text>
            </View>
          ) : null}

          {row.pre_prompt?.trim() && progress?.pre_prompt_response?.trim() ? (
            <View style={styles.recallBox}>
              <Text style={styles.recallLabel}>Your recall answer</Text>
              <Text style={styles.recallBody}>{progress.pre_prompt_response}</Text>
            </View>
          ) : null}

          {row.scripture_reference ? (
            <Text style={styles.scriptureRef}>{row.scripture_reference}</Text>
          ) : null}
          {row.scripture_text ? <Text style={styles.scriptureBody}>{row.scripture_text}</Text> : null}

          {row.main_content ? <Text style={styles.body}>{row.main_content}</Text> : null}

          {row.reflection_question ? (
            <View style={styles.reflectBox}>
              <Text style={styles.reflectLabel}>Reflection</Text>
              <Text style={styles.reflect}>{row.reflection_question}</Text>
            </View>
          ) : null}

          <View style={styles.commitmentBox}>
            <Text style={styles.commitmentLabel}>Application commitment</Text>
            <Text style={styles.commitmentHint}>
              Write a concrete step and/or record a short voice note — at least one is required to
              finish the day.
            </Text>
            {!completed && session?.user ? (
              <View style={styles.voiceRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.voiceBtn,
                    recordState.isRecording && styles.voiceBtnDanger,
                    pressed && styles.primaryBtnPressed,
                  ]}
                  onPress={() =>
                    void (recordState.isRecording ? stopVoiceUpload() : startVoice())
                  }
                  disabled={voiceBusy || saving}
                >
                  <Text style={styles.voiceBtnLabel}>
                    {voiceBusy && !recordState.isRecording
                      ? 'Saving…'
                      : recordState.isRecording
                        ? 'Stop & upload'
                        : 'Record voice note'}
                  </Text>
                </Pressable>
                {effectiveVoicePath ? (
                  <Pressable
                    style={({ pressed }) => [styles.voiceBtnSecondary, pressed && styles.primaryBtnPressed]}
                    onPress={() => void toggleVoicePlayback()}
                    disabled={voiceBusy}
                  >
                    <Text style={styles.voiceBtnSecondaryLabel}>
                      {voicePlayerStatus.playing ? 'Stop playback' : 'Play recording'}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
            {completed && effectiveVoicePath ? (
              <Pressable
                style={({ pressed }) => [styles.voiceBtnSecondary, pressed && styles.primaryBtnPressed]}
                onPress={() => void toggleVoicePlayback()}
                disabled={voiceBusy}
              >
                <Text style={styles.voiceBtnSecondaryLabel}>
                  {voicePlayerStatus.playing ? 'Stop playback' : 'Play voice commitment'}
                </Text>
              </Pressable>
            ) : null}
            <TextInput
              style={[styles.input, completed && styles.inputDisabled]}
              placeholder="e.g. I will apologize to ___ this week."
              placeholderTextColor="#94a3b8"
              value={completed ? progress?.application_commitment ?? '' : commitmentDraft}
              onChangeText={setCommitmentDraft}
              multiline
              editable={!completed && !saving && Boolean(session?.user)}
              textAlignVertical="top"
            />
          </View>

          {error ? <Text style={styles.inlineErr}>{error}</Text> : null}

          {!completed ? (
            <Pressable
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
              onPress={() => void markComplete()}
              disabled={saving || !session?.user}
            >
              <Text style={styles.primaryBtnLabel}>
                {saving ? 'Saving…' : 'Mark day complete'}
              </Text>
            </Pressable>
          ) : null}
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
  safe: { flex: 1, backgroundColor: '#f8f6f3' },
  flex: { flex: 1 },
  topBar: { paddingHorizontal: 16, paddingBottom: 8 },
  back: { fontSize: 17, color: '#1d4ed8', fontWeight: '600' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  pad: { padding: 20, paddingBottom: 48 },
  err: { color: '#b91c1c', fontSize: 16 },
  inlineErr: { color: '#b91c1c', fontSize: 14, marginBottom: 12 },
  lockTitle: { fontSize: 22, fontWeight: '700', color: '#0f172a', marginBottom: 10 },
  lockBody: { fontSize: 16, lineHeight: 24, color: '#475569', marginBottom: 12 },
  lockHint: { fontSize: 16, fontWeight: '600', color: '#1d4ed8', marginBottom: 20 },
  gateKicker: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  gatePrompt: { fontSize: 20, fontWeight: '700', color: '#0f172a', lineHeight: 28, marginBottom: 10 },
  gateHint: { fontSize: 14, color: '#64748b', lineHeight: 20, marginBottom: 16 },
  series: { fontSize: 14, fontWeight: '600', color: '#64748b', marginBottom: 6 },
  dayOf: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1d4ed8',
    marginBottom: 4,
  },
  title: { fontSize: 24, fontWeight: '700', color: '#0f172a', lineHeight: 30 },
  min: { marginTop: 8, fontSize: 15, color: '#64748b' },
  doneBanner: {
    marginTop: 16,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#86efac',
  },
  doneText: { fontSize: 15, fontWeight: '600', color: '#166534' },
  recallBox: {
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  recallLabel: { fontSize: 12, fontWeight: '700', color: '#1e40af', marginBottom: 6 },
  recallBody: { fontSize: 16, lineHeight: 24, color: '#1e293b' },
  primaryBtn: {
    marginTop: 16,
    backgroundColor: '#1d4ed8',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryBtnPressed: { opacity: 0.9 },
  primaryBtnLabel: { color: '#fff', fontSize: 17, fontWeight: '600' },
  scriptureRef: { marginTop: 20, fontSize: 16, fontWeight: '700', color: '#1e40af' },
  scriptureBody: { marginTop: 8, fontSize: 16, lineHeight: 24, color: '#334155', fontStyle: 'italic' },
  body: { marginTop: 20, fontSize: 17, lineHeight: 26, color: '#1e293b' },
  reflectBox: {
    marginTop: 28,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  reflectLabel: { fontSize: 13, fontWeight: '700', color: '#64748b', marginBottom: 8 },
  reflect: { fontSize: 17, lineHeight: 26, color: '#0f172a' },
  commitmentBox: { marginTop: 28 },
  commitmentLabel: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 6 },
  commitmentHint: { fontSize: 14, color: '#64748b', lineHeight: 20, marginBottom: 10 },
  input: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    lineHeight: 22,
    color: '#0f172a',
    backgroundColor: '#fff',
  },
  inputDisabled: { backgroundColor: '#f1f5f9', color: '#475569' },
  voiceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
    alignItems: 'center',
  },
  voiceBtn: {
    backgroundColor: '#1d4ed8',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  voiceBtnDanger: {
    backgroundColor: '#b91c1c',
  },
  voiceBtnLabel: { color: '#fff', fontSize: 15, fontWeight: '600' },
  voiceBtnSecondary: {
    borderWidth: 1,
    borderColor: '#1d4ed8',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  voiceBtnSecondaryLabel: { color: '#1d4ed8', fontSize: 15, fontWeight: '600' },
});
