import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../../src/services/api';
import { COLORS } from '../../src/config/appConfig';
import { useDebouncedValue } from '../../src/hooks/useDebouncedValue';
import { hasMore, paginate } from '../../src/utils/pagination';
import { LoadingText } from '../../src/components/LoadingText';
import { AppTextInput as TextInput } from '../../src/components/AppTextInput';

export default function DeliveryListScreen() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const debouncedQuery = useDebouncedValue(query, 350);
  const router = useRouter();

  useEffect(() => {
    api.deliveryDashboard().then((d) => setOrders(d.deliveries || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery]);

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) => String(o?.orderId || '').toLowerCase().includes(q) || String(o?.addressLine || '').toLowerCase().includes(q));
  }, [orders, debouncedQuery]);
  const visible = useMemo(() => paginate(filtered, page), [filtered, page]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>Delivery List</Text>
      <TextInput value={query} onChangeText={setQuery} placeholder="Search deliveries" style={styles.search} />
      {loading ? <LoadingText base="Loading" style={styles.loading} /> : null}
      {visible.map((o) => (
        <View style={styles.card} key={o.id}>
          <Text style={styles.bold}>{o.orderId}</Text>
          <Text>{o.addressLine}</Text>
          <Pressable style={styles.track} onPress={() => router.push({ pathname: '/delivery/map-view', params: { orderId: o.orderId } })}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Open Map</Text>
          </Pressable>
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
  loading: { marginTop: 10, color: COLORS.muted, fontWeight: '700' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginTop: 8 },
  bold: { fontWeight: '800' },
  track: { marginTop: 8, backgroundColor: COLORS.accent, borderRadius: 8, alignItems: 'center', paddingVertical: 8 },
  more: { marginTop: 12, backgroundColor: '#fff', borderRadius: 10, alignItems: 'center', paddingVertical: 10 },
  moreText: { fontWeight: '700', color: COLORS.text },
});

