import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../contexts/AuthContext';
import { useRecallionTheme } from '../contexts/ThemeContext';
import type { RecallionColors } from '../lib/recallionTheme';

export function LeaveChurchPanel() {
  const { profile, leaveChurch } = useAuth();
  const { colors } = useRecallionTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [pending, setPending] = useState(false);

  const canLeave = Boolean(profile?.church_id && profile.role === 'member');
  if (!canLeave) return null;

  function onLeavePress() {
    Alert.alert(
      'Leave church?',
      'You will lose access to this church’s sermons and devotionals until you join again with a church code. Your past progress stays on your account.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave church',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setPending(true);
              const { error } = await leaveChurch();
              setPending(false);
              if (error) {
                Alert.alert('Could not leave church', error);
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
      <Text style={styles.title}>Leave church</Text>
      <Text style={styles.hint}>
        Join another church using a new code. Your past progress stays on your account.
      </Text>
      <Pressable
        style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}
        onPress={onLeavePress}
        disabled={pending}
        accessibilityRole="button"
      >
        {pending ? (
          <ActivityIndicator color={colors.blue} />
        ) : (
          <Text style={styles.linkLabel}>Leave church →</Text>
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
    linkRow: { marginTop: 12, alignSelf: 'flex-start', paddingVertical: 4 },
    pressed: { opacity: 0.75 },
    linkLabel: { fontSize: 15, fontWeight: '600', color: c.blue },
  });
}
