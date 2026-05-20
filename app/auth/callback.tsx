import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useRecallionTheme } from '../../contexts/ThemeContext';
import {
  getAdminPortalUrl,
  isLikelyCrossClientAuthError,
  PASTOR_CONFIRM_IN_BROWSER_MESSAGE,
} from '../../lib/auth/adminPortalUrl';
import { ensurePublicUserProfile } from '../../lib/auth/ensurePublicProfile';
import { CONFIRMED_TOAST } from '../../lib/authToastMessages';
import { queuePendingToast } from '../../lib/pendingToast';
import type { RecallionColors } from '../../lib/recallionTheme';
import { requireSupabase } from '../../lib/supabase';

function param(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function pastorWrongAppMessage(): string {
  return `${PASTOR_CONFIRM_IN_BROWSER_MESSAGE} ${getAdminPortalUrl()}`;
}

export default function AuthCallbackScreen() {
  const params = useLocalSearchParams<{
    code?: string | string[];
    token_hash?: string | string[];
    type?: string | string[];
    next?: string | string[];
  }>();
  const { colors } = useRecallionTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [message, setMessage] = useState('Finishing sign-in…');

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const supabase = requireSupabase();
      const next = param(params.next);
      const code = param(params.code);
      const tokenHash = param(params.token_hash);
      const type = param(params.type);

      let exchangeError: string | null = null;

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) exchangeError = error.message;
      } else if (tokenHash && type) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as 'signup' | 'email' | 'recovery' | 'email_change',
        });
        if (error) exchangeError = error.message;
      } else {
        const initialUrl = await Linking.getInitialURL();
        const hash = new URLSearchParams(initialUrl?.split('#')[1] ?? '');
        const accessToken = hash.get('access_token');
        const refreshToken = hash.get('refresh_token');
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) exchangeError = error.message;
        } else {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (!session) {
            if (!cancelled) {
              await queuePendingToast({
                variant: 'error',
                message: pastorWrongAppMessage(),
              });
              router.replace('/login?error=missing_auth_code');
            }
            return;
          }
        }
      }

      if (cancelled) return;

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (exchangeError) {
        const crossClient = isLikelyCrossClientAuthError(exchangeError);
        if (session && !crossClient) {
          if (next === 'reset-password') {
            router.replace('/reset-password');
            return;
          }
          await queuePendingToast({ variant: 'success', message: CONFIRMED_TOAST });
          router.replace('/');
          return;
        }
        if (crossClient || !session) {
          if (!cancelled) {
            setMessage('Open the link in your browser');
            await queuePendingToast({
              variant: 'error',
              message: pastorWrongAppMessage(),
            });
            router.replace('/login?error=wrong_client');
          }
          return;
        }
      }

      if (!session?.user) {
        if (!cancelled) {
          await queuePendingToast({
            variant: 'error',
            message: pastorWrongAppMessage(),
          });
          router.replace('/login?error=confirmation_failed');
        }
        return;
      }

      if (next === 'reset-password') {
        router.replace('/reset-password');
        return;
      }

      await ensurePublicUserProfile(supabase, session.user);

      await queuePendingToast({
        variant: 'success',
        message: CONFIRMED_TOAST,
      });
      router.replace('/');
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [params.code, params.token_hash, params.type, params.next]);

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
