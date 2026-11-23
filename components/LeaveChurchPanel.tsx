import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { useRecallionTheme } from '../contexts/ThemeContext';
import type { RecallionColors } from '../lib/recallionTheme';

export function LeaveChurchPanel() {
  const { profile, leaveChurch } = useAuth();
  const { t } = useI18n();
  const { colors } = useRecallionTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [pending, setPending] = useState(false);

  const canLeave = Boolean(profile?.church_id && profile.role === 'member');
  if (!canLeave) return null;

  function onLeavePress() {
    Alert.alert(
      t('leave.alertTitle'),
      t('leave.alertBody'),
      [
        { text: t('settings.cancel'), style: 'cancel' },
        {
          text: t('leave.title'),
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setPending(true);
              const { error } = await leaveChurch();
              setPending(false);
              if (error) {
                Alert.alert(t('leave.errorTitle'), error);
                return;
              }
              router.replace('/join-church');
            })();
          },
        },
      ],
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{t('leave.title')}</Text>
      <Text style={styles.hint}>{t('leave.hint')}</Text>
      <Pressable
        style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}
        onPress={onLeavePress}
        disabled={pending}
        accessibilityRole="button"
      >
        {pending ? (
          <ActivityIndicator color={colors.blue} />
        ) : (
          <Text style={styles.linkLabel}>{t('leave.link')}</Text>
        )}
      </Pressable>
    </View>
  );
}

function createStyles(c: RecallionColors) {
  return StyleSheet.create({
    wrap: {
      paddingVertical: 4,
      marginBottom: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.borderSubtle,
      paddingBottom: 18,
    },
    title: { fontSize: 17, fontWeight: '600', color: c.navy },
    hint: { marginTop: 6, fontSize: 14, color: c.muted, lineHeight: 21 },
    linkRow: { marginTop: 8, alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
    pressed: { opacity: 0.86 },
    linkLabel: { fontSize: 15, fontWeight: '600', color: c.blue },
  });
}
