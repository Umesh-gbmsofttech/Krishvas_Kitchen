import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNotifications } from '../src/context/NotificationContext';
import { COLORS } from '../src/config/appConfig';
import { useDebouncedValue } from '../src/hooks/useDebouncedValue';
import { hasMore, paginate } from '../src/utils/pagination';
import { LoadingText } from '../src/components/LoadingText';

export default function NotificationsScreen() {
  const { items, refresh } = useNotifications();
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const debouncedQuery = useDebouncedValue(query, 350);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery]);

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter((n) => String(n?.title || '').toLowerCase().includes(q) || String(n?.message || '').toLowerCase().includes(q));
  }, [items, debouncedQuery]);
  const visible = useMemo(() => paginate(filtered, page), [filtered, page]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>Notifications</Text>
      <TextInput value={query} onChangeText={setQuery} placeholder="Search notifications" style={styles.search} />
      {loading ? <LoadingText base="Loading" style={styles.loading} /> : null}
      {visible.map((n) => (
        <View key={n.id} style={styles.card}>
          <Text style={styles.nTitle}>{n.title}</Text>
          <Text style={styles.message}>{n.message}</Text>
        </View>
      ))}
      {!loading && hasMore(filtered, page) ? (
        <Pressable style={styles.more} onPress={() => setPage((p) => p + 1)}>
          <Text style={styles.moreText}>Load More</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  title: { fontSize: 24, fontWeight: '900' },
  search: { marginTop: 10, marginBottom: 4, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  loading: { marginTop: 10, color: COLORS.muted, fontWeight: '700' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginTop: 10 },
  nTitle: { fontWeight: '800' },
  message: { color: COLORS.muted, marginTop: 4 },
  more: { marginTop: 12, backgroundColor: '#fff', borderRadius: 10, alignItems: 'center', paddingVertical: 10 },
  moreText: { fontWeight: '700', color: COLORS.text },
});
