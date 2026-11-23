import { Ionicons } from '@expo/vector-icons';
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
import { useI18n } from '../contexts/I18nContext';
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
  const { t } = useI18n();
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
      setError(t('delete.enterEmail'));
      return;
    }
    if (preview?.will_delete_church && !churchAck) {
      setError(t('delete.confirmImpact'));
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
      <Text style={styles.title}>{t('delete.title')}</Text>
      <Text style={styles.hint}>{t('delete.hint')}</Text>

      {!open ? (
        <Pressable
          style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}
          onPress={() => setOpen(true)}
          accessibilityRole="button"
        >
          <Text style={styles.linkLabel}>{t('delete.link')}</Text>
        </Pressable>
      ) : (
        <View style={styles.form}>
          {loadingPreview ? (
            <ActivityIndicator color={colors.blue} />
          ) : null}

          {error && !preview && !loadingPreview ? (
            <Pressable onPress={() => void loadPreview()} style={styles.linkRow}>
              <Text style={styles.retryLabel}>{t('delete.loadRetry')}</Text>
            </Pressable>
          ) : null}

          {preview?.will_delete_church ? (
            <View style={styles.warnBox}>
              <Text style={styles.warnTitle}>{t('delete.churchWarnTitle')}</Text>
              <Text style={styles.warnText}>
                {t('delete.churchWarnBody', {
                  church: preview.church_name ?? t('delete.yourChurch'),
                })}
                {preview.other_member_count > 0
                  ? ` ${t('delete.churchWarnMembers', { count: preview.other_member_count })}`
                  : ''}
              </Text>
            </View>
          ) : null}

          {preview?.will_delete_church ? (
            <Pressable
              style={styles.checkRow}
              onPress={() => setChurchAck((v) => !v)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: churchAck }}
            >
              <View style={[styles.checkbox, churchAck && styles.checkboxOn]}>
                {churchAck ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
              </View>
              <Text style={styles.checkLabel}>{t('delete.ack')}</Text>
            </Pressable>
          ) : null}

          <Text style={styles.inputLabel}>{t('delete.emailLabel')}</Text>
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
              <Text style={styles.dangerLabel}>{t('delete.confirmButton')}</Text>
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
            <Text style={styles.cancel}>{t('settings.cancel')}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function createStyles(c: RecallionColors, resolved: 'light' | 'dark') {
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
    linkRow: { marginTop: 8, alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
    linkLabel: {
      color: c.danger,
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
      backgroundColor: c.warningSoft,
      borderWidth: 1,
      borderColor: c.warningBorder,
    },
    warnTitle: {
      fontWeight: '700',
      color: c.warning,
      fontSize: 15,
    },
    warnText: {
      marginTop: 8,
      fontSize: 14,
      color: c.navyMid,
      lineHeight: 20,
    },
    checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, minHeight: 44 },
    checkbox: {
      marginTop: 2,
      width: 20,
      height: 20,
      borderRadius: 4,
      borderWidth: 2,
      borderColor: c.muted,
      alignItems: 'center',
      justifyContent: 'center',
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
    error: { color: c.danger, fontSize: 14, fontWeight: '600', lineHeight: 20 },
    dangerBtn: {
      backgroundColor: '#b91c1c',
      minHeight: 52,
      justifyContent: 'center',
      borderRadius: 50,
      alignItems: 'center',
    },
    dangerLabel: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
    cancel: { textAlign: 'center', color: c.muted, fontSize: 16, fontWeight: '600', paddingVertical: 12 },
    pressed: { opacity: 0.86 },
  });
}
