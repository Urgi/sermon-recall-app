import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useRecallionTheme } from '../../contexts/ThemeContext';
import { ensurePublicUserProfile } from '../../lib/auth/ensurePublicProfile';
import { USE_CODE_NOT_LINK_MESSAGE } from '../../lib/authToastMessages';
import { queuePendingToast } from '../../lib/pendingToast';
import type { RecallionColors } from '../../lib/recallionTheme';
import { requireSupabase } from '../../lib/supabase';

function param(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

/** Only password reset may complete via email link; signup uses in-app code. */
function isPasswordResetFlow(next: string | undefined, type: string | undefined): boolean {
  return next === 'reset-password' || type === 'recovery';
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

    async function rejectEmailConfirmationLink() {
      const supabase = requireSupabase();
      await supabase.auth.signOut();
      if (!cancelled) {
        setMessage('Use your confirmation code');
        await queuePendingToast({
          variant: 'error',
          message: USE_CODE_NOT_LINK_MESSAGE,
        });
        router.replace('/verify-email?error=use_code');
      }
    }

    async function run() {
      const supabase = requireSupabase();
      const next = param(params.next);
      const type = param(params.type);
      const code = param(params.code);
      const tokenHash = param(params.token_hash);

      if (!isPasswordResetFlow(next, type)) {
        const initialUrl = await Linking.getInitialURL();
        const hash = new URLSearchParams(initialUrl?.split('#')[1] ?? '');
        const hasImplicitTokens = Boolean(hash.get('access_token') && hash.get('refresh_token'));
        if (code || tokenHash || hasImplicitTokens) {
          await rejectEmailConfirmationLink();
          return;
        }
        if (!cancelled) {
          router.replace('/verify-email');
        }
        return;
      }

      let exchangeError: string | null = null;

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) exchangeError = error.message;
      } else if (tokenHash && type) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as 'recovery' | 'email_change',
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
              router.replace('/forgot-password');
            }
            return;
          }
        }
      }

      if (cancelled) return;

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (exchangeError || !session?.user) {
        if (!cancelled) {
          await queuePendingToast({
            variant: 'error',
            message: 'This password reset link is invalid or expired. Request a new one.',
          });
          router.replace('/forgot-password');
        }
        return;
      }

      await ensurePublicUserProfile(supabase, session.user);
      if (!cancelled) {
        setMessage('Continue to set a new password…');
        router.replace('/reset-password');
      }
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
