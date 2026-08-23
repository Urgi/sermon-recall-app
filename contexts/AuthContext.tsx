import type { Session } from '@supabase/supabase-js';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import {
  isAppReviewEmail,
  isAppReviewSignIn,
} from '../lib/appReviewSignIn';
import { mapAuthError } from '../lib/auth/mapAuthError';
import { registerExpoPushTokenForCurrentUser } from '../lib/registerPushToken';
import { supabase } from '../lib/supabase';

export type UserProfile = {
  id: string;
  church_id: string | null;
  full_name: string | null;
  phone_number: string | null;
  role: string;
  preferred_language?: string | null;
  church_dissolved_notice?: string | null;
  [key: string]: unknown;
};

type AuthContextValue = {
  session: Session | null;
  profile: UserProfile | null;
  /** True until the first session bootstrap finishes. */
  loading: boolean;
  /** True while a signed-in user's profile row is still loading. */
  profileLoading: boolean;
  /** Send a one-time sign-in / sign-up code to email (no password). */
  sendEmailOtp: (
    email: string,
    options?: {
      fullName?: string;
      preferredLanguage?: string;
      /** false = existing accounts only (sign-in). Default true for create-account. */
      createUser?: boolean;
    },
  ) => Promise<{ error: string | null }>;
  verifyEmailOtp: (email: string, token: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  joinChurch: (code: string) => Promise<{ error: string | null }>;
  leaveChurch: () => Promise<{ error: string | null }>;
  updatePreferredLanguage: (language: string) => Promise<{ error: string | null }>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  const loadProfile = useCallback(async (userId: string) => {
    if (!supabase) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }
    setProfileLoading(true);
    const { data, error } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
    if (error) {
      console.warn('[auth] load profile', error.message);
      setProfile(null);
    } else {
      setProfile(data as UserProfile | null);
    }
    setProfileLoading(false);
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth
      .getSession()
      .then(async ({ data: { session: s } }) => {
        setSession(s);
        if (s?.user) {
          await loadProfile(s.user.id);
        } else {
          setProfile(null);
          setProfileLoading(false);
        }
      })
      .finally(() => setLoading(false));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.user) {
        void loadProfile(s.user.id);
      } else {
        setProfile(null);
        setProfileLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  useEffect(() => {
    if (!session?.user?.id || !supabase) return;
    void registerExpoPushTokenForCurrentUser(session.user.id);
  }, [session?.user?.id]);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId || !supabase) return;

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void registerExpoPushTokenForCurrentUser(userId);
      }
    });
    return () => sub.remove();
  }, [session?.user?.id]);

  const sendEmailOtp = useCallback(
    async (
      email: string,
      options?: {
        fullName?: string;
        preferredLanguage?: string;
        createUser?: boolean;
      },
    ) => {
      if (!supabase) return { error: 'Supabase is not configured' };
      const trimmed = email.trim().toLowerCase();
      if (!trimmed) return { error: 'Enter your email address.' };

      if (isAppReviewEmail(trimmed)) {
        return { error: null };
      }

      const createUser = options?.createUser !== false;
      const lang =
        options?.preferredLanguage === 'es' ||
        options?.preferredLanguage === 'fr' ||
        options?.preferredLanguage === 'en'
          ? options.preferredLanguage
          : 'en';

      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          shouldCreateUser: createUser,
          data: createUser
            ? {
                full_name: options?.fullName?.trim() || undefined,
                preferred_language: lang,
              }
            : undefined,
        },
      });
      return { error: error ? mapAuthError(error.message) : null };
    },
    [],
  );

  const verifyEmailOtp = useCallback(async (email: string, token: string) => {
    if (!supabase) return { error: 'Supabase is not configured' };
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedToken = token.trim();

    if (isAppReviewSignIn(trimmedEmail, trimmedToken)) {
      const { error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: trimmedToken,
      });
      return { error: error ? mapAuthError(error.message) : null };
    }

    const { error } = await supabase.auth.verifyOtp({
      email: trimmedEmail,
      token: trimmedToken,
      type: 'email',
    });
    return { error: error ? mapAuthError(error.message) : null };
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user) await loadProfile(session.user.id);
  }, [session?.user, loadProfile]);

  const joinChurch = useCallback(
    async (code: string) => {
      if (!supabase) return { error: 'Supabase is not configured' };
      const { error } = await supabase.rpc('join_church', { p_code: code.trim() });
      if (error) {
        if (error.message.includes('invalid_church_code')) {
          return { error: 'That church code was not found.' };
        }
        return { error: error.message };
      }
      await refreshProfile();
      return { error: null };
    },
    [refreshProfile],
  );

  const leaveChurch = useCallback(async () => {
    if (!supabase) return { error: 'Supabase is not configured' };
    const { error } = await supabase.rpc('leave_church');
    if (error) {
      if (error.message.includes('not_in_church')) {
        return { error: 'You are not linked to a church.' };
      }
      if (error.message.includes('staff_cannot_leave')) {
        return {
          error:
            'Church staff cannot leave from the app. Ask another admin to remove you in the admin portal, or delete your account in Settings.',
        };
      }
      if (error.message.includes('owner_cannot_leave')) {
        return {
          error:
            'Church owners cannot leave from the app. Transfer ownership or delete the church in the admin portal first.',
        };
      }
      return { error: error.message };
    }
    await refreshProfile();
    return { error: null };
  }, [refreshProfile]);

  const updatePreferredLanguage = useCallback(
    async (language: string) => {
      if (!supabase) return { error: 'Supabase is not configured' };
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return { error: 'Sign in again to update language.' };
      const lang = language === 'es' || language === 'fr' || language === 'en' ? language : 'en';
      const { error } = await supabase
        .from('users')
        .update({ preferred_language: lang })
        .eq('id', user.id);
      if (error) return { error: error.message };
      await refreshProfile();
      return { error: null };
    },
    [refreshProfile],
  );

  const value = useMemo(
    () => ({
      session,
      profile,
      loading,
      profileLoading,
      sendEmailOtp,
      verifyEmailOtp,
      signOut,
      refreshProfile,
      joinChurch,
      leaveChurch,
      updatePreferredLanguage,
    }),
    [
      session,
      profile,
      loading,
      profileLoading,
      sendEmailOtp,
      verifyEmailOtp,
      signOut,
      refreshProfile,
      joinChurch,
      leaveChurch,
      updatePreferredLanguage,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
