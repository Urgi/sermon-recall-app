import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export default function GateScreen() {
  const { session, profile, loading } = useAuth();

  if (!supabase) {
    return (
      <View style={styles.center}>
        <Text style={styles.err}>Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (!profile?.church_id) {
    return <Redirect href="/join-church" />;
  }

  return <Redirect href="/home" />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f8f6f3',
  },
  err: {
    color: '#b91c1c',
    textAlign: 'center',
    fontSize: 15,
  },
});
