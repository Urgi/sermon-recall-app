import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useRecallionTheme } from '../../contexts/ThemeContext';
import { USE_CODE_NOT_LINK_MESSAGE } from '../../lib/authToastMessages';
import { queuePendingToast } from '../../lib/pendingToast';
import type { RecallionColors } from '../../lib/recallionTheme';
import { requireSupabase } from '../../lib/supabase';

function param(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

/** Email OTP sign-in uses in-app codes; legacy email links land here and are rejected. */
export default function AuthCallbackScreen() {
  const params = useLocalSearchParams<{
    code?: string | string[];
    token_hash?: string | string[];
    type?: string | string[];
    next?: string | string[];
  }>();
  const { colors } = useRecallionTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [message, setMessage] = useState('Redirecting…');

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const supabase = requireSupabase();
      const type = param(params.type);
      const code = param(params.code);
      const tokenHash = param(params.token_hash);
      const initialUrl = await Linking.getInitialURL();
      const hash = new URLSearchParams(initialUrl?.split('#')[1] ?? '');
      const hasImplicitTokens = Boolean(hash.get('access_token') && hash.get('refresh_token'));
      const hasLinkParams =
        Boolean(code || tokenHash || hasImplicitTokens) ||
        type === 'signup' ||
        type === 'email' ||
        type === 'recovery' ||
        type === 'magiclink';

      if (hasLinkParams) {
        await supabase.auth.signOut();
        if (cancelled) return;
        setMessage('Use your email code');
        await queuePendingToast({
          variant: 'error',
          message: USE_CODE_NOT_LINK_MESSAGE,
        });
        router.replace('/login?error=use_code');
        return;
      }

      if (!cancelled) {
        router.replace('/login');
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
