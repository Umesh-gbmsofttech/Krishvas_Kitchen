import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../../src/services/api';
import { COLORS } from '../../src/config/appConfig';
import { useDebouncedValue } from '../../src/hooks/useDebouncedValue';
import { hasMore, paginate } from '../../src/utils/pagination';
import { AppTextInput as TextInput } from '../../src/components/AppTextInput';
import { Skeleton } from '../../src/components/Skeleton';

const statuses = ['CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED'];

export default function OrdersManagementScreen() {
  const [orders, setOrders] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submittingOrderId, setSubmittingOrderId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const debouncedQuery = useDebouncedValue(query, 350);

  const load = useCallback(async () => {
    const [orderList, pending] = await Promise.all([api.allOrders(), api.pendingDeliveries().catch(() => [])]);
    setOrders(orderList);
    setPartners(pending);
  }, []);

  useEffect(() => {
    load().catch(() => {}).finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery]);

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) => String(o.orderId || '').toLowerCase().includes(q) || String(o.status || '').toLowerCase().includes(q));
  }, [orders, debouncedQuery]);
  const visible = useMemo(() => paginate(filtered, page), [filtered, page]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.title}>Orders Management</Text>
      <TextInput value={query} onChangeText={setQuery} placeholder="Search orders" style={styles.search} />
      {loading
        ? Array.from({ length: 4 }).map((_, idx) => (
            <View key={`admin-orders-skeleton-${idx}`} style={styles.card}>
              <Skeleton style={styles.skelTitle} />
              <Skeleton style={styles.skelLine} />
              <Skeleton style={styles.skelLine} />
              <View style={styles.row}>
                <Skeleton style={styles.skelChip} />
                <Skeleton style={styles.skelChip} />
                <Skeleton style={styles.skelChip} />
              </View>
            </View>
          ))
        : null}
      {visible.map((order) => (
        <View key={order.id} style={styles.card}>
          <Text style={styles.bold}>{order.orderId}</Text>
          <Text>Status: {order.status}</Text>
          <Text>Amount: Rs {order.totalAmount}</Text>
          <View style={styles.row}>
            {statuses.map((s) => (
              <Pressable
                key={s}
                style={styles.chip}
                disabled={submittingOrderId === order.orderId}
                onPress={async () => {
                  if (submittingOrderId) return;
                  setSubmittingOrderId(order.orderId);
                  try {
                    await api.updateOrderStatus(order.orderId, { status: s });
                    await load();
                  } finally {
                    setSubmittingOrderId(null);
                  }
                }}
              >
                <Text style={styles.chipText}>{s}</Text>
              </Pressable>
            ))}
          </View>
          {partners[0]?.id ? (
            <Pressable
              style={styles.assign}
              disabled={submittingOrderId === order.orderId}
              onPress={async () => {
                if (submittingOrderId) return;
                setSubmittingOrderId(order.orderId);
                try {
                  await api.assignDelivery(order.orderId, partners[0].id);
                  await load();
                } finally {
                  setSubmittingOrderId(null);
                }
              }}
            >
              <Text style={{ color: '#fff' }}>{submittingOrderId === order.orderId ? 'Sending...' : 'Assign First Pending Partner'}</Text>
            </Pressable>
          ) : null}
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
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 10, marginTop: 8 },
  bold: { fontWeight: '800' },
  skelTitle: { height: 14, borderRadius: 8, width: '46%' },
  skelLine: { height: 12, borderRadius: 8, width: '36%', marginTop: 8 },
  skelChip: { height: 28, borderRadius: 999, width: 90 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  chip: { backgroundColor: COLORS.chip, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  chipText: { fontSize: 11 },
  assign: { marginTop: 8, backgroundColor: COLORS.text, borderRadius: 8, alignItems: 'center', paddingVertical: 8 },
  more: { marginTop: 12, backgroundColor: '#fff', borderRadius: 10, alignItems: 'center', paddingVertical: 10 },
  moreText: { fontWeight: '700', color: COLORS.text },
});

