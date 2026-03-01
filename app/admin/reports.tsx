import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../../src/services/api';
import { COLORS } from '../../src/config/appConfig';

export default function ReportsScreen() {
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    api.allOrders().then(setOrders).catch(() => {});
  }, []);

  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>Reports</Text>
      <View style={styles.card}><Text style={styles.value}>Rs {totalRevenue.toFixed(2)}</Text><Text>Total Revenue</Text></View>
      <View style={styles.card}><Text style={styles.value}>{orders.length}</Text><Text>Total Orders</Text></View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  title: { fontSize: 24, fontWeight: '900' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginTop: 10 },
  value: { fontSize: 28, fontWeight: '900', color: COLORS.accent },
});
