import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNotifications } from '../src/context/NotificationContext';
import { COLORS } from '../src/config/appConfig';
import { useDebouncedValue } from '../src/hooks/useDebouncedValue';
import { hasMore, paginate } from '../src/utils/pagination';
import { AppTextInput as TextInput } from '../src/components/AppTextInput';
import { Skeleton } from '../src/components/Skeleton';

export default function NotificationsScreen() {
  const { items, refresh } = useNotifications();
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const debouncedQuery = useDebouncedValue(query, 350);

  const loadNotifications = useCallback(async (asRefresh = false) => {
    if (asRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      await refresh();
    } finally {
      if (asRefresh) setRefreshing(false);
      else setLoading(false);
    }
  }, [refresh]);

  useEffect(() => {
    loadNotifications(false).catch(() => setLoading(false));
  }, [loadNotifications]);

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
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadNotifications(true)} />}
    >
      <Text style={styles.title}>Notifications</Text>
      <TextInput value={query} onChangeText={setQuery} placeholder="Search notifications" style={styles.search} />
      {loading
        ? Array.from({ length: 4 }).map((_, idx) => (
            <View key={`notif-skeleton-${idx}`} style={styles.card}>
              <Skeleton style={styles.skelTitle} />
              <Skeleton style={styles.skelLine} />
            </View>
          ))
        : null}
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
  title: { fontSize: 24, fontWeight: '900' , textAlign: 'center'},
  search: { marginTop: 10, marginBottom: 4, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginTop: 10 },
  nTitle: { fontWeight: '800' },
  message: { color: COLORS.muted, marginTop: 4 },
  skelTitle: { height: 14, borderRadius: 8, width: '55%' },
  skelLine: { height: 12, borderRadius: 8, width: '88%', marginTop: 8 },
  more: { marginTop: 12, backgroundColor: '#fff', borderRadius: 10, alignItems: 'center', paddingVertical: 10 },
  moreText: { fontWeight: '700', color: COLORS.text },
});

