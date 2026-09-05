import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  findNodeHandle,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
  type ScrollView,
} from 'react-native';

import { useAuth } from '../contexts/AuthContext';
import { useRecallionTheme } from '../contexts/ThemeContext';
import {
  deleteAccount,
  emailsMatchForDeletion,
  fetchDeletionPreview,
  type AccountDeletionPreview,
} from '../lib/accountDeletion';
import type { RecallionColors } from '../lib/recallionTheme';

type Props = {
  /** Parent Settings ScrollView — keep confirm field + delete button above the keyboard. */
  scrollRef?: React.RefObject<ScrollView | null>;
};

export function DeleteAccountPanel({ scrollRef }: Props) {
  const { session, signOut } = useAuth();
  const { colors, resolved } = useRecallionTheme();
  const styles = useMemo(() => createStyles(colors, resolved), [colors, resolved]);
  const [preview, setPreview] = useState<AccountDeletionPreview | null>(null);
  const [accountEmail, setAccountEmail] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [open, setOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [churchAck, setChurchAck] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const formRef = useRef<View>(null);

  const loadPreview = useCallback(async () => {
    if (!session?.access_token) return;
    setLoadingPreview(true);
    setError(null);
    const { preview: p, email, error: err } = await fetchDeletionPreview();
    setPreview(p);
    setAccountEmail(email ?? session.user.email ?? '');
    if (err) setError(err);
    setLoadingPreview(false);
  }, [session?.access_token, session?.user.email]);

  useEffect(() => {
    if (!open) return;
    void loadPreview();
  }, [open, loadPreview]);

  function scrollFormIntoView() {
    const parent = scrollRef?.current;
    const child = formRef.current;
    if (!parent || !child) {
      parent?.scrollToEnd({ animated: true });
      return;
    }
    const childNode = findNodeHandle(child);
    const parentNode = findNodeHandle(parent);
    if (!childNode || !parentNode) {
      parent.scrollToEnd({ animated: true });
      return;
    }
    UIManager.measureLayout(
      childNode,
      parentNode,
      () => parent.scrollToEnd({ animated: true }),
      (_x, y) => {
        parent.scrollTo({ y: Math.max(0, y - 16), animated: true });
      },
    );
  }

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
    const { error: err } = await deleteAccount(
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
    <View style={styles.wrap} ref={formRef} collapsable={false}>
      <Text style={styles.title}>Delete account</Text>
      <Text style={styles.hint}>
        Permanently remove your profile, progress, and sign-in.
      </Text>

      {!open ? (
        <Pressable
          style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}
          onPress={() => setOpen(true)}
          accessibilityRole="button"
        >
          <Text style={styles.linkLabel}>Delete account →</Text>
        </Pressable>
      ) : (
        <View style={styles.form}>
          {loadingPreview ? (
            <ActivityIndicator color={colors.blue} />
          ) : null}

          {error && !preview && !loadingPreview ? (
            <Pressable onPress={() => void loadPreview()} style={styles.linkRow}>
              <Text style={styles.retryLabel}>Couldn’t load details. Tap to retry.</Text>
            </Pressable>
          ) : null}

          {preview?.will_delete_church ? (
            <View style={styles.warnBox}>
              <Text style={styles.warnTitle}>Church will be removed</Text>
              <Text style={styles.warnText}>
                You are the only pastor for {preview.church_name ?? 'your church'}. Deleting your
                account removes the church from Sermon Recall, including sermons and devotionals.
                {preview.other_member_count > 0
                  ? ` ${preview.other_member_count} member(s) will need to join another church.`
                  : ''}
              </Text>
            </View>
          ) : null}

          {preview?.will_delete_church ? (
            <Pressable style={styles.checkRow} onPress={() => setChurchAck((v) => !v)}>
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
            returnKeyType="done"
            submitBehavior="submit"
            onFocus={() => {
              setTimeout(scrollFormIntoView, 100);
              setTimeout(scrollFormIntoView, 350);
            }}
            onSubmitEditing={() => void onDelete()}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={({ pressed }) => [styles.dangerBtn, pressed && styles.pressed]}
            onPress={() => void onDelete()}
            disabled={pending || loadingPreview}
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

function createStyles(c: RecallionColors, resolved: 'light' | 'dark') {
  const light = resolved === 'light';
  return StyleSheet.create({
    wrap: {
      paddingVertical: 4,
      marginBottom: 8,
    },
    title: {
      fontSize: 17,
      fontWeight: '600',
      color: c.navy,
    },
    hint: {
      marginTop: 6,
      fontSize: 14,
      color: c.muted,
      lineHeight: 21,
    },
    linkRow: { marginTop: 12, alignSelf: 'flex-start', paddingVertical: 4 },
    linkLabel: {
      color: light ? '#b91c1c' : '#f87171',
      fontSize: 15,
      fontWeight: '600',
    },
    retryLabel: {
      color: c.blue,
      fontSize: 14,
      fontWeight: '600',
    },
    form: { marginTop: 14, gap: 12 },
    warnBox: {
      padding: 12,
      borderRadius: c.radiusMd,
      backgroundColor: light ? '#fffbeb' : 'rgba(120, 53, 15, 0.22)',
    },
    warnTitle: {
      fontWeight: '700',
      color: light ? '#92400e' : '#fde68a',
      fontSize: 15,
    },
    warnText: {
      marginTop: 8,
      fontSize: 14,
      color: light ? '#78350f' : '#fef3c7',
      lineHeight: 20,
    },
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
    inputLabel: { fontSize: 14, color: c.muted, fontWeight: '600' },
    input: {
      borderWidth: 1,
      borderColor: c.borderInput,
      borderRadius: c.radiusMd,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 16,
      color: c.navy,
      backgroundColor: c.bgWash,
    },
    error: { color: light ? '#b91c1c' : '#fca5a5', fontSize: 14, fontWeight: '600' },
    dangerBtn: {
      backgroundColor: '#b91c1c',
      paddingVertical: 14,
      borderRadius: 50,
      alignItems: 'center',
    },
    dangerLabel: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
    cancel: { textAlign: 'center', color: c.muted, fontSize: 16, paddingVertical: 8 },
    pressed: { opacity: 0.88 },
  });
}
