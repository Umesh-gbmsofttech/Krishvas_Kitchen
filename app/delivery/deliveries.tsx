import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../../src/services/api';
import { COLORS } from '../../src/config/appConfig';

export default function DeliveryListScreen() {
  const [orders, setOrders] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    api.deliveryDashboard().then((d) => setOrders(d.deliveries || [])).catch(() => {});
  }, []);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>Delivery List</Text>
      {orders.map((o) => (
        <View style={styles.card} key={o.id}>
          <Text style={styles.bold}>{o.orderId}</Text>
          <Text>{o.addressLine}</Text>
          <Pressable style={styles.track} onPress={() => router.push({ pathname: '/delivery/map-view', params: { orderId: o.orderId } })}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Open Map</Text>
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  title: { fontSize: 24, fontWeight: '900' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginTop: 8 },
  bold: { fontWeight: '800' },
  track: { marginTop: 8, backgroundColor: COLORS.accent, borderRadius: 8, alignItems: 'center', paddingVertical: 8 },
});
