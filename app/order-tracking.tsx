import { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../src/services/api';
import { COLORS } from '../src/config/appConfig';
import { connectRealtime, disconnectRealtime } from '../src/services/realtime';
import { useAuth } from '../src/context/AuthContext';
import { LoadingText } from '../src/components/LoadingText';

export default function OrderTrackingScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { token, user } = useAuth();
  const [order, setOrder] = useState<any>(null);
  const [points, setPoints] = useState<any[]>([]);

  useEffect(() => {
    if (!orderId) return;
    const load = async () => {
      const [o, history] = await Promise.all([api.orderById(orderId), api.trackingHistory(orderId)]);
      setOrder(o);
      setPoints(history || []);
    };
    load().catch(() => {});
  }, [orderId]);

  useEffect(() => {
    if (!token || !orderId) return;
    connectRealtime(token, [
      {
        topic: `/topic/orders/${orderId}`,
        onMessage: (payload) => {
          if (payload?.event === 'LOCATION_UPDATE') {
            setPoints((prev) => [...prev, payload]);
          }
        },
      },
    ]);

    return () => disconnectRealtime();
  }, [token, orderId]);

  const canViewMap = user?.role !== 'USER';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>Track Order #{orderId}</Text>
      <Text style={styles.status}>Status: {order?.status || 'Loading...'}</Text>
      {order?.status === 'OUT_FOR_DELIVERY' ? <LoadingText base="Your order is on the way" style={styles.onWay} /> : null}
      {order?.deliveryOtp ? <Text style={styles.otp}>Delivery OTP: {order.deliveryOtp}</Text> : null}

      {canViewMap ? <Text style={styles.mapHint}>Map view is available only in Delivery Partner map screen.</Text> : null}

      <Text style={styles.section}>Updates</Text>
      {(points || []).map((p: any, i: number) => (
        <View style={styles.update} key={`${p.timestamp || i}`}>
          <Text style={styles.updateTitle}>{p.statusNote || p.note || 'Location updated'}</Text>
          <Text style={styles.updateMeta}>{new Date(p.timestamp).toLocaleString()}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  title: { fontSize: 24, fontWeight: '900' , textAlign: 'center'},
  status: { marginTop: 4, color: COLORS.accent, fontWeight: '700' },
  onWay: { marginTop: 6, color: COLORS.accent, fontWeight: '800' },
  otp: { marginTop: 6, color: COLORS.text, fontWeight: '800' },
  mapHint: { marginTop: 12, color: COLORS.muted, fontWeight: '600' },
  section: { marginTop: 14, fontSize: 18, fontWeight: '800' },
  update: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginTop: 8 },
  updateTitle: { fontWeight: '700' },
  updateMeta: { color: COLORS.muted, marginTop: 4, fontSize: 12 },
});

