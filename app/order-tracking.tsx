import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { api } from '../src/services/api';
import { COLORS } from '../src/config/appConfig';
import { connectRealtime, disconnectRealtime } from '../src/services/realtime';
import { useAuth } from '../src/context/AuthContext';

const pickup = { latitude: 19.0728, longitude: 72.8826 };

export default function OrderTrackingScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { token } = useAuth();
  const [order, setOrder] = useState<any>(null);
  const [points, setPoints] = useState<any[]>([]);

  const dest = useMemo(
    () => ({ latitude: Number(order?.latitude || 19.076), longitude: Number(order?.longitude || 72.8777) }),
    [order]
  );

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

  const latest = points.length ? points[points.length - 1] : null;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>Track Order #{orderId}</Text>
      <Text style={styles.status}>Status: {order?.status || 'Loading...'}</Text>

      <MapView
        style={styles.map}
        initialRegion={{ latitude: dest.latitude, longitude: dest.longitude, latitudeDelta: 0.06, longitudeDelta: 0.06 }}
      >
        <Marker coordinate={pickup} title="Pickup" />
        <Marker coordinate={dest} title="Delivery" pinColor="green" />
        {latest ? <Marker coordinate={{ latitude: Number(latest.latitude), longitude: Number(latest.longitude) }} title="Partner" pinColor="orange" /> : null}
        <Polyline coordinates={[pickup, dest]} strokeWidth={3} strokeColor="#FF6A2B" />
      </MapView>

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
  map: { height: 260, borderRadius: 16, marginTop: 12 },
  section: { marginTop: 14, fontSize: 18, fontWeight: '800' },
  update: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginTop: 8 },
  updateTitle: { fontWeight: '700' },
  updateMeta: { color: COLORS.muted, marginTop: 4, fontSize: 12 },
});

