import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useRecallionTheme } from '../../contexts/ThemeContext';
import { CONFIRMED_TOAST } from '../../lib/authToastMessages';
import { queuePendingToast } from '../../lib/pendingToast';
import type { RecallionColors } from '../../lib/recallionTheme';
import { requireSupabase } from '../../lib/supabase';

function param(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default function AuthCallbackScreen() {
  const params = useLocalSearchParams<{ code?: string | string[]; next?: string | string[] }>();
  const { colors } = useRecallionTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [message, setMessage] = useState('Finishing sign-in…');

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const code = param(params.code);
      const next = param(params.next);
      if (!code) {
        if (!cancelled) {
          setMessage('Invalid link.');
          router.replace('/login?error=missing_auth_code');
        }
        return;
      }

      try {
        const supabase = requireSupabase();
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;
        if (error) {
          const {
            data: { session: existing },
          } = await supabase.auth.getSession();
          if (existing) {
            if (next === 'reset-password') {
              router.replace('/reset-password');
              return;
            }
            await queuePendingToast({ variant: 'success', message: CONFIRMED_TOAST });
            router.replace('/login?confirmed=1');
            return;
          }
          await queuePendingToast({
            variant: 'error',
            message:
              'This link is invalid or has expired. Try signing in or request a new email.',
          });
          router.replace('/login?error=confirmation_failed');
          return;
        }

        if (next === 'reset-password') {
          router.replace('/reset-password');
          return;
        }

        await queuePendingToast({
          variant: 'success',
          message: CONFIRMED_TOAST,
        });
        router.replace('/login?confirmed=1');
      } catch {
        if (!cancelled) {
          router.replace('/login?error=confirmation_failed');
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [params.code, params.next]);

  return (
    <View style={styles.screen}>
      <ActivityIndicator size="large" color={colors.blue} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

function createStyles(c: RecallionColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 16,
      padding: 24,
      backgroundColor: c.bgPage,
    },
    text: {
      fontSize: 16,
      color: c.muted,
      textAlign: 'center',
    },
  });
}
