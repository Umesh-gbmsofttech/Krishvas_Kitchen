import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { api } from '../src/services/api';
import { COLORS } from '../src/config/appConfig';

export default function OrderHistoryScreen() {
  const [orders, setOrders] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    api.myOrders().then(setOrders).catch(() => {});
  }, []);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>Order History</Text>
      {orders.map((order) => (
        <Pressable key={order.id} style={styles.card} onPress={() => router.push({ pathname: '/order-tracking', params: { orderId: order.orderId } })}>
          <Text style={styles.id}>{order.orderId}</Text>
          <Text>{order.status}</Text>
          <Text style={styles.amount}>Rs {order.totalAmount}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  title: { fontSize: 24, fontWeight: '900' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginTop: 10 },
  id: { fontWeight: '800' },
  amount: { marginTop: 5, color: COLORS.accent, fontWeight: '700' },
});
