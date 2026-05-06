import type { Session } from '@supabase/supabase-js';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { registerExpoPushTokenForCurrentUser } from '../lib/registerPushToken';
import { supabase } from '../lib/supabase';

export type UserProfile = {
  id: string;
  church_id: string | null;
  full_name: string | null;
  phone_number: string | null;
  role: string;
};

type AuthContextValue = {
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    fullName?: string,
  ) => Promise<{ error: string | null; needsEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  joinChurch: (code: string) => Promise<{ error: string | null }>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string) => {
    if (!supabase) return;
    const { data, error } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
    if (error) {
      console.warn('[auth] load profile', error.message);
      setProfile(null);
      return;
    }
    setProfile(data as UserProfile | null);
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth
      .getSession()
      .then(({ data: { session: s } }) => {
        setSession(s);
        if (s?.user) {
          return loadProfile(s.user.id);
        }
        setProfile(null);
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
      }
    });

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  useEffect(() => {
    if (!session?.user?.id || !supabase) return;
    void registerExpoPushTokenForCurrentUser(session.user.id);
  }, [session?.user?.id]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (!supabase) return { error: 'Supabase is not configured' };
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error?.message ?? null };
    },
    [],
  );

  const signUp = useCallback(
    async (email: string, password: string, fullName?: string) => {
      if (!supabase) return { error: 'Supabase is not configured', needsEmailConfirmation: false };
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) return { error: error.message, needsEmailConfirmation: false };
      const needsEmailConfirmation = Boolean(data.user && !data.session);
      return { error: null, needsEmailConfirmation };
    },
    [],
  );

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

  const value = useMemo(
    () => ({
      session,
      profile,
      loading,
      signIn,
      signUp,
      signOut,
      refreshProfile,
      joinChurch,
    }),
    [session, profile, loading, signIn, signUp, signOut, refreshProfile, joinChurch],
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
