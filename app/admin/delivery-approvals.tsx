import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../../src/services/api';
import { COLORS } from '../../src/config/appConfig';

export default function DeliveryApprovalsScreen() {
  const [pending, setPending] = useState<any[]>([]);

  const load = async () => {
    const data = await api.pendingDeliveries();
    setPending(data || []);
  };

  useEffect(() => {
    load().catch(() => {});
  }, []);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>Delivery Partner Approvals</Text>
      {pending.map((p) => (
        <View key={p.id} style={styles.card}>
          <Text style={styles.bold}>{p.user.fullName}</Text>
          <Text>{p.vehicleType} - {p.vehicleNumber}</Text>
          <View style={styles.row}>
            <Pressable style={styles.approve} onPress={async () => { await api.decideDelivery(p.id, true); load(); }}><Text style={styles.white}>Approve</Text></Pressable>
            <Pressable style={styles.reject} onPress={async () => { await api.decideDelivery(p.id, false); load(); }}><Text style={styles.white}>Reject</Text></Pressable>
          </View>
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
  row: { flexDirection: 'row', gap: 8, marginTop: 8 },
  approve: { backgroundColor: COLORS.success, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  reject: { backgroundColor: COLORS.danger, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  white: { color: '#fff', fontWeight: '700' },
});
