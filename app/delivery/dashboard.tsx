import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../../src/services/api';
import { COLORS } from '../../src/config/appConfig';

export default function DeliveryDashboardScreen() {
  const [data, setData] = useState<any>({});
  const router = useRouter();

  useEffect(() => {
    api.deliveryDashboard().then(setData).catch(() => {});
  }, []);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>Delivery Dashboard</Text>
      <View style={styles.row}>
        <View style={styles.card}><Text style={styles.value}>{data.todayDeliveries || 0}</Text><Text>Today</Text></View>
        <View style={styles.card}><Text style={styles.value}>{data.last7DaysDeliveries || 0}</Text><Text>Last 7 days</Text></View>
      </View>
      <View style={styles.row}>
        <View style={styles.card}><Text style={styles.value}>{data.last30DaysDeliveries || 0}</Text><Text>Last 30 days</Text></View>
        <View style={styles.card}><Text style={styles.value}>{Number(data.distanceKm || 0).toFixed(1)}</Text><Text>KM covered</Text></View>
      </View>
      <Pressable style={styles.nav} onPress={() => router.push('/delivery/deliveries')}><Text>{`Today's Deliveries`}</Text></Pressable>
      <Pressable style={styles.nav} onPress={() => router.push('/delivery/map-view')}><Text>Map View</Text></Pressable>
      <Pressable style={styles.nav} onPress={() => router.push('/delivery/earnings')}><Text>Earnings / Distance</Text></Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  title: { fontSize: 24, fontWeight: '900' },
  row: { flexDirection: 'row', gap: 10, marginTop: 10 },
  card: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12 },
  value: { fontSize: 24, fontWeight: '900', color: COLORS.accent },
  nav: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginTop: 8 },
});
