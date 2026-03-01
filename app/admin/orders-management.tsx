import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../../src/services/api';
import { COLORS } from '../../src/config/appConfig';

const statuses = ['CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED'];

export default function OrdersManagementScreen() {
  const [orders, setOrders] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);

  const load = async () => {
    const [orderList, pending] = await Promise.all([api.allOrders(), api.pendingDeliveries().catch(() => [])]);
    setOrders(orderList);
    setPartners(pending);
  };

  useEffect(() => {
    load().catch(() => {});
  }, []);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>Orders Management</Text>
      {orders.map((order) => (
        <View key={order.id} style={styles.card}>
          <Text style={styles.bold}>{order.orderId}</Text>
          <Text>Status: {order.status}</Text>
          <Text>Amount: Rs {order.totalAmount}</Text>
          <View style={styles.row}>
            {statuses.map((s) => (
              <Pressable key={s} style={styles.chip} onPress={async () => { await api.updateOrderStatus(order.orderId, { status: s }); load(); }}>
                <Text style={styles.chipText}>{s}</Text>
              </Pressable>
            ))}
          </View>
          {partners[0]?.id ? (
            <Pressable style={styles.assign} onPress={async () => { await api.assignDelivery(order.orderId, partners[0].id); load(); }}>
              <Text style={{ color: '#fff' }}>Assign First Pending Partner</Text>
            </Pressable>
          ) : null}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  title: { fontSize: 24, fontWeight: '900' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 10, marginTop: 8 },
  bold: { fontWeight: '800' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  chip: { backgroundColor: COLORS.chip, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  chipText: { fontSize: 11 },
  assign: { marginTop: 8, backgroundColor: COLORS.text, borderRadius: 8, alignItems: 'center', paddingVertical: 8 },
});
