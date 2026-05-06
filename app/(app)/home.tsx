import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

type SermonListItem = {
  id: string;
  title: string;
  sermon_date: string | null;
  pastor_name: string | null;
  status: string;
  created_at: string;
};

export default function HomeScreen() {
  const { session, profile, signOut, loading } = useAuth();
  const [sermons, setSermons] = useState<SermonListItem[]>([]);
  const [loadingSermons, setLoadingSermons] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSermons = useCallback(async () => {
    if (!supabase || !profile?.church_id) {
      setSermons([]);
      setLoadingSermons(false);
      return;
    }

    const { data, error } = await supabase
      .from('sermons')
      .select('id, title, sermon_date, pastor_name, status, created_at')
      .eq('church_id', profile.church_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[home] sermons', error.message);
      setSermons([]);
    } else {
      setSermons((data as SermonListItem[]) ?? []);
    }
    setLoadingSermons(false);
  }, [profile?.church_id]);

  useEffect(() => {
    if (!loading && !session) {
      router.replace('/login');
    }
  }, [loading, session]);

  useEffect(() => {
    if (profile?.church_id) {
      setLoadingSermons(true);
      void loadSermons();
    }
  }, [profile?.church_id, loadSermons]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadSermons();
    setRefreshing(false);
  }, [loadSermons]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>Sermon Recall</Text>
          <Text style={styles.sub}>
            {profile?.full_name?.trim() || session?.user?.email?.split('@')[0]}
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.signOutSm, pressed && styles.pressed]}
          onPress={async () => {
            await signOut();
            router.replace('/login');
          }}
        >
          <Text style={styles.signOutSmLabel}>Sign out</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>Sermons</Text>
      <Text style={styles.sectionHint}>From your church — open one to see the six-day journey.</Text>

      {loadingSermons ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1d4ed8" />
        </View>
      ) : (
        <FlatList
          style={styles.list}
          data={sermons}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1d4ed8" />
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No sermons yet</Text>
              <Text style={styles.emptyBody}>
                When your pastor adds sermons in the admin portal, they will show up here.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              onPress={() => router.push(`/sermon/${item.id}`)}
            >
              <Text style={styles.cardTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={styles.cardMeta}>
                {[item.pastor_name, formatDate(item.sermon_date)].filter(Boolean).join(' · ') ||
                  '—'}
              </Text>
              <View style={[styles.badge, statusBg(item.status)]}>
                <Text style={styles.badgeText}>{item.status}</Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  try {
    const d = new Date(`${iso}T12:00:00`);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
}

function statusBg(status: string) {
  if (status === 'ready') return { backgroundColor: '#dcfce7' };
  if (status === 'failed') return { backgroundColor: '#fee2e2' };
  return { backgroundColor: '#fef3c7' };
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8f6f3' },
  list: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  brand: { fontSize: 26, fontWeight: '700', color: '#0f172a' },
  sub: { marginTop: 4, fontSize: 15, color: '#64748b' },
  signOutSm: { paddingVertical: 8, paddingHorizontal: 12 },
  signOutSmLabel: { fontSize: 16, color: '#1d4ed8', fontWeight: '600' },
  pressed: { opacity: 0.75 },
  sectionTitle: {
    paddingHorizontal: 20,
    marginTop: 8,
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  sectionHint: {
    paddingHorizontal: 20,
    marginTop: 6,
    marginBottom: 12,
    fontSize: 15,
    color: '#64748b',
    lineHeight: 21,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 48 },
  listContent: { paddingHorizontal: 20, paddingBottom: 32, gap: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e7e5e0',
  },
  cardPressed: { opacity: 0.95 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  cardMeta: { marginTop: 8, fontSize: 15, color: '#475569' },
  badge: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  badgeText: { fontSize: 12, fontWeight: '700', color: '#0f172a', textTransform: 'capitalize' },
  empty: { paddingVertical: 40, paddingHorizontal: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#334155', textAlign: 'center' },
  emptyBody: {
    marginTop: 10,
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
  },
});
