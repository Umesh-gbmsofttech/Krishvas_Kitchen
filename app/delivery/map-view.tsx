import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { api } from '../../src/services/api';
import { COLORS } from '../../src/config/appConfig';

const pickup = { latitude: 19.0728, longitude: 72.8826 };

export default function DeliveryMapViewScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const [region, setRegion] = useState({ latitude: 19.076, longitude: 72.8777, latitudeDelta: 0.06, longitudeDelta: 0.06 });

  useEffect(() => {
    const init = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const current = await Location.getCurrentPositionAsync({});
        setRegion((r) => ({ ...r, latitude: current.coords.latitude, longitude: current.coords.longitude }));
      } catch {
        // fallback
      }
    };
    init();
  }, []);

  const pushLocation = async () => {
    if (!orderId) return;
    await api.pushTracking(orderId, {
      latitude: region.latitude,
      longitude: region.longitude,
      distanceKm: 1.2,
      statusNote: 'Partner moving on route',
    });
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Delivery Map View {orderId ? `- ${orderId}` : ''}</Text>
      <MapView style={styles.map} region={region} onRegionChangeComplete={setRegion}>
        <Marker coordinate={pickup} title="Pickup" />
        <Marker coordinate={{ latitude: region.latitude, longitude: region.longitude }} title="Partner" />
        <Polyline coordinates={[pickup, { latitude: region.latitude, longitude: region.longitude }]} strokeWidth={3} strokeColor={COLORS.accent} />
      </MapView>
      <Pressable style={styles.btn} onPress={pushLocation}><Text style={styles.btnText}>Push Live Location</Text></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg, padding: 16 },
  title: { fontSize: 20, fontWeight: '900', marginBottom: 8 , textAlign: 'center'},
  map: { flex: 1, borderRadius: 14 },
  btn: { marginTop: 10, backgroundColor: COLORS.accent, borderRadius: 12, alignItems: 'center', paddingVertical: 12 },
  btnText: { color: '#fff', fontWeight: '800' },
});

