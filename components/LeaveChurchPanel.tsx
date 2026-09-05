import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../contexts/AuthContext';
import { useRecallionTheme } from '../contexts/ThemeContext';
import type { RecallionColors } from '../lib/recallionTheme';

export function LeaveChurchPanel() {
  const { profile, leaveChurch } = useAuth();
  const { colors, resolved } = useRecallionTheme();
  const styles = useMemo(() => createStyles(colors, resolved), [colors, resolved]);
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
      <Text style={styles.title}>Church membership</Text>
      <Text style={styles.hint}>
        Leave your current church if you need to join a different one. You can rejoin anytime with a
        new church code.
      </Text>
      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        onPress={onLeavePress}
        disabled={pending}
      >
        {pending ? (
          <ActivityIndicator color={resolved === 'light' ? '#b91c1c' : '#f87171'} />
        ) : (
          <Text style={styles.buttonLabel}>Leave church</Text>
        )}
      </Pressable>
    </View>
  );
}

function createStyles(c: RecallionColors, resolved: 'light' | 'dark') {
  const light = resolved === 'light';
  return StyleSheet.create({
    wrap: { marginTop: 28 },
    title: { fontSize: 18, fontWeight: '700', color: c.navy },
    hint: { marginTop: 6, fontSize: 15, color: c.muted, lineHeight: 22 },
    button: {
      marginTop: 14,
      paddingVertical: 14,
      borderRadius: 50,
      borderWidth: 1.5,
      borderColor: light ? '#b91c1c' : 'rgba(248, 113, 113, 0.55)',
      backgroundColor: light ? '#ffffff' : 'transparent',
      alignItems: 'center',
    },
    pressed: { opacity: 0.85 },
    buttonLabel: {
      fontSize: 16,
      fontWeight: '700',
      color: light ? '#b91c1c' : '#fca5a5',
    },
  });
}
