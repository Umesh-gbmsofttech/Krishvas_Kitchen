import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../../src/services/api';
import { COLORS } from '../../src/config/appConfig';

export default function EarningsScreen() {
  const [data, setData] = useState<any>({});

  useEffect(() => {
    api.deliveryDashboard().then(setData).catch(() => {});
  }, []);

  const earnings = Number(data.last30DaysDeliveries || 0) * 45;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>Earnings / Distance Stats</Text>
      <View style={styles.card}><Text style={styles.value}>Rs {earnings.toFixed(2)}</Text><Text>Estimated earnings (30d)</Text></View>
      <View style={styles.card}><Text style={styles.value}>{Number(data.distanceKm || 0).toFixed(2)} KM</Text><Text>Total distance covered</Text></View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  title: { fontSize: 24, fontWeight: '900' , textAlign: 'center'},
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginTop: 10 },
  value: { fontSize: 28, fontWeight: '900', color: COLORS.accent },
});

