import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '../contexts/AuthContext';
import { useRecallionTheme } from '../contexts/ThemeContext';
import {
  deleteAccountViaSiteApi,
  emailsMatchForDeletion,
  fetchDeletionPreview,
  type AccountDeletionPreview,
} from '../lib/accountDeletion';
import type { RecallionColors } from '../lib/recallionTheme';

export function DeleteAccountPanel() {
  const { session, signOut } = useAuth();
  const { colors } = useRecallionTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [preview, setPreview] = useState<AccountDeletionPreview | null>(null);
  const [accountEmail, setAccountEmail] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [open, setOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [churchAck, setChurchAck] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const loadPreview = useCallback(async () => {
    if (!session?.access_token) return;
    setLoadingPreview(true);
    setError(null);
    const { preview: p, email, error: err } = await fetchDeletionPreview(session.access_token);
    setPreview(p);
    setAccountEmail(email ?? session.user.email ?? '');
    if (err) setError(err);
    setLoadingPreview(false);
  }, [session?.access_token]);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  async function onDelete() {
    if (!session) return;
    setError(null);
    const expectedEmail = accountEmail || session.user.email || '';
    if (!expectedEmail || !emailsMatchForDeletion(confirmEmail, expectedEmail)) {
      setError('Enter your account email to confirm deletion.');
      return;
    }
    if (preview?.will_delete_church && !churchAck) {
      setError('Confirm that you understand the impact on your church.');
      return;
    }
    setPending(true);
    const { error: err } = await deleteAccountViaSiteApi(
      session,
      preview?.will_delete_church === true,
      confirmEmail.trim(),
    );
    setPending(false);
    if (err) {
      setError(err);
      return;
    }
    await signOut();
    router.replace('/login');
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Delete account</Text>
      <Text style={styles.hint}>
        Permanently remove your profile, progress, and sign-in. This cannot be undone.
      </Text>

      {!open ? (
        <Pressable
          style={({ pressed }) => [styles.outlineBtn, pressed && styles.pressed]}
          onPress={() => setOpen(true)}
          disabled={loadingPreview}
        >
          <Text style={styles.outlineLabel}>
            {loadingPreview ? 'Loading…' : 'Delete my account'}
          </Text>
        </Pressable>
      ) : (
        <View style={styles.form}>
          {preview?.will_delete_church ? (
            <View style={styles.warnBox}>
              <Text style={styles.warnTitle}>Church will be removed</Text>
              <Text style={styles.warnText}>
                You are the only pastor for {preview.church_name ?? 'your church'}. Deleting your
                account removes the church from Sermon Recall, including sermons and devotionals.
                {preview.other_member_count > 0
                  ? ` ${preview.other_member_count} member(s) will need to join another church. They will be told that ${preview.church_name ?? 'their church'} has ended its use of Sermon Recall on this platform.`
                  : ''}
              </Text>
            </View>
          ) : null}

          {preview?.will_delete_church ? (
            <Pressable
              style={styles.checkRow}
              onPress={() => setChurchAck((v) => !v)}
            >
              <View style={[styles.checkbox, churchAck && styles.checkboxOn]} />
              <Text style={styles.checkLabel}>
                I understand members will lose access to this church on Sermon Recall.
              </Text>
            </Pressable>
          ) : null}

          <Text style={styles.inputLabel}>Re-enter your email to confirm</Text>
          <TextInput
            style={styles.input}
            value={confirmEmail}
            onChangeText={setConfirmEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            placeholder={accountEmail || 'you@example.com'}
            placeholderTextColor={colors.muted}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={({ pressed }) => [styles.dangerBtn, pressed && styles.pressed]}
            onPress={() => void onDelete()}
            disabled={pending}
          >
            {pending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.dangerLabel}>Permanently delete account</Text>
            )}
          </Pressable>
          <Pressable
            onPress={() => {
              setOpen(false);
              setConfirmEmail('');
              setChurchAck(false);
              setError(null);
            }}
            disabled={pending}
          >
            <Text style={styles.cancel}>Cancel</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function createStyles(c: RecallionColors) {
  return StyleSheet.create({
    wrap: {
      marginTop: 28,
      padding: 16,
      borderRadius: c.radiusMd,
      borderWidth: 1,
      borderColor: 'rgba(248, 113, 113, 0.35)',
      backgroundColor: 'rgba(127, 29, 29, 0.15)',
    },
    title: { fontSize: 18, fontWeight: '600', color: '#fecaca' },
    hint: { marginTop: 8, fontSize: 14, color: c.muted, lineHeight: 20 },
    outlineBtn: {
      marginTop: 12,
      paddingVertical: 12,
      alignItems: 'center',
      borderRadius: c.radiusMd,
      borderWidth: 1,
      borderColor: 'rgba(248, 113, 113, 0.5)',
    },
    outlineLabel: { color: '#fca5a5', fontSize: 16, fontWeight: '600' },
    form: { marginTop: 12, gap: 12 },
    warnBox: {
      padding: 12,
      borderRadius: c.radiusMd,
      borderWidth: 1,
      borderColor: 'rgba(251, 191, 36, 0.4)',
      backgroundColor: 'rgba(120, 53, 15, 0.25)',
    },
    warnTitle: { fontWeight: '600', color: '#fde68a', fontSize: 15 },
    warnText: { marginTop: 8, fontSize: 14, color: '#fef3c7', lineHeight: 20 },
    checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    checkbox: {
      marginTop: 2,
      width: 20,
      height: 20,
      borderRadius: 4,
      borderWidth: 2,
      borderColor: c.muted,
    },
    checkboxOn: { backgroundColor: c.blue, borderColor: c.blue },
    checkLabel: { flex: 1, fontSize: 14, color: c.navy, lineHeight: 20 },
    inputLabel: { fontSize: 14, color: c.muted },
    input: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(248, 113, 113, 0.4)',
      borderRadius: c.radiusMd,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 16,
      color: c.navy,
      backgroundColor: c.bgCard,
    },
    error: { color: '#fca5a5', fontSize: 14 },
    dangerBtn: {
      backgroundColor: '#dc2626',
      paddingVertical: 14,
      borderRadius: c.radiusMd,
      alignItems: 'center',
    },
    dangerLabel: { color: '#fff', fontSize: 16, fontWeight: '600' },
    cancel: { textAlign: 'center', color: c.muted, fontSize: 16, paddingVertical: 8 },
    pressed: { opacity: 0.88 },
  });
}
