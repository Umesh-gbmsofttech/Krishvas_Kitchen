import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../src/services/api';
import { COLORS } from '../src/config/appConfig';
import { useDebouncedValue } from '../src/hooks/useDebouncedValue';
import { hasMore, paginate } from '../src/utils/pagination';
import { useAuth } from '../src/context/AuthContext';
import { AppTextInput as TextInput } from '../src/components/AppTextInput';
import { Skeleton } from '../src/components/Skeleton';
import { formatCurrency } from '../src/utils/format';

export default function OrderHistoryScreen() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const debouncedQuery = useDebouncedValue(query, 350);
  const { token } = useAuth();
  const router = useRouter();

  const loadHistory = useCallback(async (asRefresh = false) => {
    if (!token) {
      setOrders([]);
      setLoading(false);
      return;
    }
    if (asRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await api.myOrders();
      setOrders(res || []);
    } finally {
      if (asRefresh) setRefreshing(false);
      else setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadHistory(false).catch(() => setLoading(false));
  }, [loadHistory]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery]);

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) => String(o.orderId || '').toLowerCase().includes(q) || String(o.status || '').toLowerCase().includes(q));
  }, [orders, debouncedQuery]);
  const visible = useMemo(() => paginate(filtered, page), [filtered, page]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadHistory(true)} />}
    >
      <Text style={styles.title}>Order History</Text>
      <TextInput value={query} onChangeText={setQuery} placeholder="Search order history" style={styles.search} />
      {loading
        ? Array.from({ length: 4 }).map((_, idx) => (
            <View key={`history-skeleton-${idx}`} style={styles.card}>
              <Skeleton style={styles.skelTitle} />
              <Skeleton style={styles.skelLine} />
              <Skeleton style={styles.skelAmount} />
            </View>
          ))
        : null}
      {visible.map((order) => (
        <Pressable key={order.id} style={styles.card} onPress={() => router.push({ pathname: '/order-tracking', params: { orderId: order.orderId } })}>
          <Text style={styles.id}>{order.orderId}</Text>
          <Text>{order.status}</Text>
          <Text style={styles.amount}>{formatCurrency(Number(order.totalAmount || 0))}</Text>
        </Pressable>
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
  id: { fontWeight: '800' },
  amount: { marginTop: 5, color: COLORS.accent, fontWeight: '700' },
  skelTitle: { height: 16, borderRadius: 8, width: '55%' },
  skelLine: { height: 12, borderRadius: 8, width: '38%', marginTop: 8 },
  skelAmount: { height: 12, borderRadius: 8, width: '28%', marginTop: 8 },
  more: { marginTop: 12, backgroundColor: '#fff', borderRadius: 10, alignItems: 'center', paddingVertical: 10 },
  moreText: { fontWeight: '700', color: COLORS.text },
});

