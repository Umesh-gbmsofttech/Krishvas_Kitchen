import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { api } from '../src/services/api';
import { COLORS } from '../src/config/appConfig';
import { useDebouncedValue } from '../src/hooks/useDebouncedValue';
import { hasMore, paginate } from '../src/utils/pagination';
import { LoadingText } from '../src/components/LoadingText';
import { useAuth } from '../src/context/AuthContext';

export default function OrderHistoryScreen() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const debouncedQuery = useDebouncedValue(query, 350);
  const { token } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!token) {
      setOrders([]);
      setLoading(false);
      return;
    }
    api.myOrders().then((res) => setOrders(res || [])).catch(() => {}).finally(() => setLoading(false));
  }, [token]);

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
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>Order History</Text>
      <TextInput value={query} onChangeText={setQuery} placeholder="Search order history" style={styles.search} />
      {loading ? <LoadingText base="Loading" style={styles.loading} /> : null}
      {visible.map((order) => (
        <Pressable key={order.id} style={styles.card} onPress={() => router.push({ pathname: '/order-tracking', params: { orderId: order.orderId } })}>
          <Text style={styles.id}>{order.orderId}</Text>
          <Text>{order.status}</Text>
          <Text style={styles.amount}>Rs {order.totalAmount}</Text>
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
  loading: { marginTop: 10, color: COLORS.muted, fontWeight: '700' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginTop: 10 },
  id: { fontWeight: '800' },
  amount: { marginTop: 5, color: COLORS.accent, fontWeight: '700' },
  more: { marginTop: 12, backgroundColor: '#fff', borderRadius: 10, alignItems: 'center', paddingVertical: 10 },
  moreText: { fontWeight: '700', color: COLORS.text },
});

