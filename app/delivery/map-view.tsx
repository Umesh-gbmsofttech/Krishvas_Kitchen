import * as Location from 'expo-location';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { api } from '../../src/services/api';
import { COLORS } from '../../src/config/appConfig';

const pickup = { latitude: 19.0728, longitude: 72.8826 };
const OSRM_ROUTE_BASE_URL = 'https://router.project-osrm.org/route/v1/driving';

export default function DeliveryMapViewScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const [activeOrderId, setActiveOrderId] = useState<string | null>(orderId || null);
  const [order, setOrder] = useState<any>(null);
  const [partnerLocation, setPartnerLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [pushing, setPushing] = useState(false);
  const [routing, setRouting] = useState(false);
  const [routeError, setRouteError] = useState('');
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const [routeSteps, setRouteSteps] = useState<{ instruction: string; distanceMeters: number; durationSeconds: number }[]>([]);
  const mapRef = useRef<MapView | null>(null);
  const previousPartnerRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const lastRouteAtRef = useRef<number>(0);

  useEffect(() => {
    let watchSub: Location.LocationSubscription | null = null;

    const init = async () => {
      try {
        let selectedOrderId = orderId || null;
        if (!selectedOrderId) {
          const assigned = await api.myAssignedOrders().catch(() => []);
          const active = (assigned || []).find((o: any) => o.status === 'OUT_FOR_DELIVERY') || assigned?.[0];
          selectedOrderId = active?.orderId || null;
        }
        setActiveOrderId(selectedOrderId);
        if (selectedOrderId) {
          const found = await api.orderById(selectedOrderId);
          setOrder(found || null);
        }

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const current = await Location.getCurrentPositionAsync({});
        setPartnerLocation({ latitude: current.coords.latitude, longitude: current.coords.longitude });

        watchSub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 2500,
            distanceInterval: 5,
          },
          (update) => {
            const next = { latitude: update.coords.latitude, longitude: update.coords.longitude };
            setPartnerLocation(next);
            previousPartnerRef.current = next;
          }
        );
      } catch {
        // fallback
      }
    };
    init();

    return () => {
      watchSub?.remove();
    };
  }, [orderId]);

  const destination = {
    latitude: Number(order?.latitude || 19.076),
    longitude: Number(order?.longitude || 72.8777),
  };

  const region = useMemo(
    () => ({
      latitude: partnerLocation?.latitude ?? destination.latitude,
      longitude: partnerLocation?.longitude ?? destination.longitude,
      latitudeDelta: 0.06,
      longitudeDelta: 0.06,
    }),
    [partnerLocation, destination.latitude, destination.longitude]
  );

  const toInstruction = (step: any) => {
    const maneuver = step?.maneuver || {};
    const type = String(maneuver.type || '').replace(/_/g, ' ').trim();
    const modifier = String(maneuver.modifier || '').replace(/_/g, ' ').trim();
    const road = String(step?.name || '').trim();
    const base = [type, modifier].filter(Boolean).join(' ');
    if (road) return `${base || 'Continue'} on ${road}`;
    return base || 'Continue';
  };

  const fetchRoute = async () => {
    if (!partnerLocation) return;
    setRouting(true);
    setRouteError('');
    try {
      const from = `${partnerLocation.longitude},${partnerLocation.latitude}`;
      const to = `${destination.longitude},${destination.latitude}`;
      const url = `${OSRM_ROUTE_BASE_URL}/${from};${to}?overview=full&geometries=geojson&steps=true`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Route API ${res.status}`);
      const data = await res.json();
      const route = data?.routes?.[0];
      const coords = route?.geometry?.coordinates || [];
      if (!Array.isArray(coords) || coords.length < 2) {
        throw new Error('No route geometry');
      }

      const mapped = coords
        .map((c: any) => ({ latitude: Number(c[1]), longitude: Number(c[0]) }))
        .filter((p: any) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude));
      setRouteCoords(mapped);
      const steps = (route?.legs || [])
        .flatMap((leg: any) => leg?.steps || [])
        .map((s: any) => ({
          instruction: toInstruction(s),
          distanceMeters: Number(s?.distance || 0),
          durationSeconds: Number(s?.duration || 0),
        }));
      setRouteSteps(steps);
      lastRouteAtRef.current = Date.now();

      if (mapRef.current && mapped.length > 1) {
        mapRef.current.fitToCoordinates(mapped, {
          edgePadding: { top: 80, right: 80, bottom: 80, left: 80 },
          animated: true,
        });
      }
    } catch (e: any) {
      setRouteError(e?.message || 'Unable to fetch route');
      setRouteCoords([]);
      setRouteSteps([]);
    } finally {
      setRouting(false);
    }
  };

  useEffect(() => {
    if (!partnerLocation) return;
    mapRef.current?.animateCamera(
      {
        center: {
          latitude: partnerLocation.latitude,
          longitude: partnerLocation.longitude,
        },
        pitch: 50,
        zoom: 16,
        heading: 0,
      },
      { duration: 800 }
    );
  }, [partnerLocation]);

  useEffect(() => {
    if (!partnerLocation) return;
    const elapsed = Date.now() - lastRouteAtRef.current;
    const needsRefresh = elapsed > 15000 || routeCoords.length < 2;
    if (needsRefresh) fetchRoute();
  }, [partnerLocation]); // eslint-disable-line react-hooks/exhaustive-deps

  const pushLocation = async () => {
    if (!activeOrderId || !partnerLocation || pushing) return;
    setPushing(true);
    try {
      const dx = destination.latitude - partnerLocation.latitude;
      const dy = destination.longitude - partnerLocation.longitude;
      const roughDistanceKm = Math.sqrt(dx * dx + dy * dy) * 111;
      await api.pushTracking(activeOrderId, {
        latitude: partnerLocation.latitude,
        longitude: partnerLocation.longitude,
        distanceKm: Number.isFinite(roughDistanceKm) ? Number(roughDistanceKm.toFixed(3)) : 0,
        statusNote: 'Partner moving on route',
      });
    } finally {
      setPushing(false);
    }
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Delivery Map View {activeOrderId ? `- ${activeOrderId}` : ''}</Text>
      <MapView ref={mapRef} style={styles.map} initialRegion={region}>
        <Marker coordinate={pickup} title="Pickup" />
        <Marker coordinate={destination} title="Delivery" pinColor="green" />
        {partnerLocation ? <Marker coordinate={partnerLocation} title="Partner" pinColor="orange" /> : null}
        {routeCoords.length > 1 ? (
          <Polyline coordinates={routeCoords} strokeWidth={5} strokeColor={COLORS.accent} />
        ) : (
          <>
            <Polyline coordinates={[pickup, destination]} strokeWidth={3} strokeColor={COLORS.accent} />
            {partnerLocation ? <Polyline coordinates={[partnerLocation, destination]} strokeWidth={3} strokeColor={COLORS.success} /> : null}
          </>
        )}
      </MapView>
      <View style={styles.row}>
        <Pressable style={[styles.btn, styles.flex]} onPress={fetchRoute} disabled={routing || !partnerLocation}>
          <Text style={styles.btnText}>{routing ? 'Routing...' : 'Refresh Route'}</Text>
        </Pressable>
        <Pressable style={[styles.btn, styles.flex]} onPress={pushLocation} disabled={pushing || !partnerLocation || !activeOrderId}>
          <Text style={styles.btnText}>{pushing ? 'Sending...' : 'Push Live Location'}</Text>
        </Pressable>
      </View>
      {!!routeError ? <Text style={styles.error}>{routeError}</Text> : null}
      {routeSteps.length ? (
        <View style={styles.stepsCard}>
          <Text style={styles.stepsTitle}>Turns & Steps</Text>
          <ScrollView style={styles.stepsList} nestedScrollEnabled>
            {routeSteps.map((step, idx) => (
              <View key={`step-${idx}`} style={styles.stepRow}>
                <Text style={styles.stepText}>{idx + 1}. {step.instruction}</Text>
                <Text style={styles.stepMeta}>
                  {(step.distanceMeters / 1000).toFixed(2)} km | {Math.round(step.durationSeconds)} sec
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg, padding: 16 },
  title: { fontSize: 20, fontWeight: '900', marginBottom: 8 , textAlign: 'center'},
  map: { flex: 1, borderRadius: 14, minHeight: 280 },
  row: { flexDirection: 'row', gap: 8, marginTop: 10 },
  flex: { flex: 1 },
  btn: { marginTop: 10, backgroundColor: COLORS.accent, borderRadius: 12, alignItems: 'center', paddingVertical: 12 },
  btnText: { color: '#fff', fontWeight: '800' },
  error: { color: COLORS.danger, marginTop: 8, fontWeight: '600' },
  stepsCard: { marginTop: 10, backgroundColor: '#fff', borderRadius: 12, padding: 10, maxHeight: 200 },
  stepsTitle: { fontWeight: '800', color: COLORS.text, marginBottom: 6 },
  stepsList: { flexGrow: 0 },
  stepRow: { paddingVertical: 6, borderBottomColor: '#EEE', borderBottomWidth: 1 },
  stepText: { color: COLORS.text, fontWeight: '600', fontSize: 12 },
  stepMeta: { color: COLORS.muted, fontSize: 11, marginTop: 2 },
});

