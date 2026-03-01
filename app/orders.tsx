import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { COLORS } from '../src/config/appConfig';
import { LoadingText } from '../src/components/LoadingText';
import { useDebouncedValue } from '../src/hooks/useDebouncedValue';
import { api } from '../src/services/api';
import { hasMore, paginate } from '../src/utils/pagination';
import { useAuth } from '../src/context/AuthContext';
import { AppTextInput as TextInput } from '../src/components/AppTextInput';

export default function OrdersScreen() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search, 350);
  const { token } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!token) {
      setOrders([]);
      setLoading(false);
      return;
    }
    const load = async () => {
      setLoading(true);
      try {
        const list = await api.myOrders();
        setOrders(list || []);
      } finally {
        setLoading(false);
      }
    };
    load().catch(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) => String(o.orderId || '').toLowerCase().includes(q) || String(o.status || '').toLowerCase().includes(q));
  }, [orders, debouncedSearch]);

  const visible = useMemo(() => paginate(filtered, page), [filtered, page]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Orders</Text>
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search by order id or status"
        style={styles.search}
      />
      {loading ? <LoadingText base="Loading" style={styles.loading} /> : null}
      {!loading && !filtered.length ? <Text style={styles.empty}>No orders found.</Text> : null}
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
  content: { padding: 16, paddingBottom: 26 },
  title: { fontSize: 24, fontWeight: '900' , textAlign: 'center'},
  search: { marginTop: 10, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11 },
  loading: { color: COLORS.muted, marginTop: 12, fontWeight: '700' },
  empty: { color: COLORS.muted, marginTop: 12 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginTop: 10 },
  id: { fontWeight: '800' },
  amount: { marginTop: 5, color: COLORS.accent, fontWeight: '700' },
  more: { marginTop: 12, backgroundColor: '#fff', borderRadius: 10, alignItems: 'center', paddingVertical: 10 },
  moreText: { fontWeight: '700', color: COLORS.text },
});

