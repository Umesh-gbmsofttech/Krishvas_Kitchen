import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../src/config/appConfig';
import { api } from '../../src/services/api';

const isExpoGo = Constants.appOwnership === 'expo';
let MapLibreGL: any = null;
if (!isExpoGo) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    MapLibreGL = require('@maplibre/maplibre-react-native').default;
  } catch {
    MapLibreGL = null;
  }
}

const OSM_FALLBACK_STYLE = {
  version: 8,
  name: 'OSM Raster',
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
    },
  },
  layers: [{ id: 'osm-layer', type: 'raster', source: 'osm' }],
};

const buildRasterStyle = (tileUrlTemplate: string) => ({
  version: 8,
  name: 'MapTiler Raster',
  sources: {
    maptiler: { type: 'raster', tiles: [tileUrlTemplate], tileSize: 256 },
  },
  layers: [{ id: 'maptiler-raster-layer', type: 'raster', source: 'maptiler' }],
});

type Stop = {
  orderId: string;
  latitude: number;
  longitude: number;
  status?: string;
  customerName?: string;
  addressLine?: string;
};

const ACTIVE_DELIVERY_STATUSES = ['CONFIRMED', 'OUT_FOR_DELIVERY', 'PREPARING', 'PLACED'];
const CLOSED_STATUSES = ['DELIVERED', 'CANCELLED', 'FAILED'];

const haversineMeters = (a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) => {
  const R = 6371000;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

const toNum = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const reorderByNearest = (origin: { latitude: number; longitude: number }, stops: Stop[]) => {
  const remaining = [...stops];
  const ordered: Stop[] = [];
  let current = origin;
  while (remaining.length) {
    let bestIndex = 0;
    let bestDist = Number.POSITIVE_INFINITY;
    for (let i = 0; i < remaining.length; i += 1) {
      const dist = haversineMeters(current, remaining[i]);
      if (dist < bestDist) {
        bestDist = dist;
        bestIndex = i;
      }
    }
    const [picked] = remaining.splice(bestIndex, 1);
    ordered.push(picked);
    current = picked;
  }
  return ordered;
};

export default function DeliveryMapViewScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const cameraRef = useRef<any>(null);
  const fullCameraRef = useRef<any>(null);
  const watchRef = useRef<Location.LocationSubscription | null>(null);

  const [activeOrderId, setActiveOrderId] = useState<string | null>(orderId || null);
  const [assignedStops, setAssignedStops] = useState<Stop[]>([]);
  const [orderedStops, setOrderedStops] = useState<Stop[]>([]);
  const [partnerLocation, setPartnerLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [routeCoords, setRouteCoords] = useState<number[][]>([]);
  const [routeSteps, setRouteSteps] = useState<any[]>([]);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null);
  const [routing, setRouting] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [routeError, setRouteError] = useState('');
  const [mapStyle, setMapStyle] = useState<any>(null);
  const [fullScreen, setFullScreen] = useState(false);

  const riderCoordinate = partnerLocation ? [partnerLocation.longitude, partnerLocation.latitude] : null;
  const mapCenter = partnerLocation || orderedStops[0] || null;
  const routeFeature = useMemo(
    () => ({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: routeCoords },
      properties: {},
    }),
    [routeCoords]
  );

  const fitMapBounds = useCallback((targetRef: any, coordinates: number[][]) => {
    if (!targetRef?.current || coordinates.length < 2) return;
    const lngs = coordinates.map((c) => c[0]);
    const lats = coordinates.map((c) => c[1]);
    const ne: [number, number] = [Math.max(...lngs), Math.max(...lats)];
    const sw: [number, number] = [Math.min(...lngs), Math.min(...lats)];
    targetRef.current.fitBounds(ne, sw, [90, 90, 90, 90], 900);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const cfg = await api.mapsConfig();
        const template = cfg?.tileUrlTemplate;
        if (!cancelled && typeof template === 'string' && template.trim()) {
          setMapStyle(buildRasterStyle(template.trim()));
          return;
        }
      } catch {
        // fallback below
      }
      if (!cancelled) setMapStyle(OSM_FALLBACK_STYLE);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const init = async () => {
      try {
        const assigned = await api.myAssignedOrders().catch(() => []);
        const activeAssigned = (assigned || []).filter((o: any) => {
          const lat = toNum(o?.latitude);
          const lng = toNum(o?.longitude);
          const status = String(o?.status || '').toUpperCase();
          return lat !== null && lng !== null && ACTIVE_DELIVERY_STATUSES.includes(status) && !CLOSED_STATUSES.includes(status);
        });
        const stops: Stop[] = activeAssigned.map((o: any) => ({
          orderId: String(o.orderId),
          latitude: Number(o.latitude),
          longitude: Number(o.longitude),
          status: String(o.status || ''),
          customerName: o.customerName || '',
          addressLine: o.addressLine || '',
        }));
        if (!active) return;
        setAssignedStops(stops);

        let selectedOrderId = orderId || null;
        if (!selectedOrderId) {
          const outForDelivery = activeAssigned.find((o: any) => String(o.status || '').toUpperCase() === 'OUT_FOR_DELIVERY');
          selectedOrderId = outForDelivery?.orderId || activeAssigned?.[0]?.orderId || null;
        }
        setActiveOrderId(selectedOrderId);

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || !active) return;
        const current = await Location.getCurrentPositionAsync({});
        if (active) {
          setPartnerLocation({ latitude: current.coords.latitude, longitude: current.coords.longitude });
        }
        watchRef.current = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 2500, distanceInterval: 5 },
          (position) => {
            setPartnerLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
          }
        );
      } catch {
        // ignore
      }
    };

    init();
    return () => {
      active = false;
      watchRef.current?.remove();
    };
  }, [orderId]);

  const fetchRoute = useCallback(async () => {
    if (!partnerLocation) return;
    const rawStops = [...assignedStops];
    if (!rawStops.length) {
      setOrderedStops([]);
      setRouteCoords([]);
      setRouteSteps([]);
      setDistanceKm(null);
      setDurationMinutes(null);
      return;
    }

    setRouting(true);
    setRouteError('');
    try {
      const prioritized = activeOrderId
        ? [
            ...rawStops.filter((s) => s.orderId === activeOrderId),
            ...rawStops.filter((s) => s.orderId !== activeOrderId),
          ]
        : rawStops;

      const first = prioritized[0];
      const rest = prioritized.slice(1);
      const nearestRest = reorderByNearest(first, rest);
      const ordered = [first, ...nearestRest];
      setOrderedStops(ordered);

      let from = { ...partnerLocation };
      let merged: number[][] = [];
      let mergedSteps: any[] = [];
      let totalDistanceMeters = 0;
      let totalDurationSeconds = 0;

      for (let i = 0; i < ordered.length; i += 1) {
        const stop = ordered[i];
        const data = await api.mapsDirections({
          originLat: from.latitude,
          originLng: from.longitude,
          destinationLat: stop.latitude,
          destinationLng: stop.longitude,
        });
        const segment = Array.isArray(data?.geometry)
          ? data.geometry
              .map((c: any) => [Number(c?.[0]), Number(c?.[1])])
              .filter((c: any) => Number.isFinite(c[0]) && Number.isFinite(c[1]))
          : [];
        if (segment.length > 1) {
          merged = merged.length ? merged.concat(segment.slice(1)) : segment;
        }
        const steps = Array.isArray(data?.steps) ? data.steps : [];
        mergedSteps = mergedSteps.concat(
          steps.map((step: any) => ({
            ...step,
            orderId: stop.orderId,
            stopIndex: i + 1,
          }))
        );
        totalDistanceMeters += Number(data?.distanceMeters || 0);
        totalDurationSeconds += Number(data?.durationSeconds || 0);
        from = { latitude: stop.latitude, longitude: stop.longitude };
      }

      setRouteCoords(merged);
      setRouteSteps(mergedSteps);
      setDistanceKm(totalDistanceMeters / 1000);
      setDurationMinutes(totalDurationSeconds / 60);

      const fitCoordinates = merged.length
        ? merged
        : [
            [partnerLocation.longitude, partnerLocation.latitude],
            ...ordered.map((s) => [s.longitude, s.latitude]),
          ];
      fitMapBounds(cameraRef, fitCoordinates);
      if (fullScreen) setTimeout(() => fitMapBounds(fullCameraRef, fitCoordinates), 180);
    } catch (e: any) {
      setRouteError(e?.message || 'Failed to fetch route');
      setRouteCoords([]);
      setRouteSteps([]);
    } finally {
      setRouting(false);
    }
  }, [activeOrderId, assignedStops, fitMapBounds, fullScreen, partnerLocation]);

  useEffect(() => {
    if (!partnerLocation || !assignedStops.length) return;
    fetchRoute();
  }, [fetchRoute, partnerLocation, assignedStops.length]);

  useEffect(() => {
    if (!partnerLocation || routeCoords.length > 1) return;
    cameraRef.current?.setCamera({
      centerCoordinate: [partnerLocation.longitude, partnerLocation.latitude],
      zoomLevel: 15,
      animationDuration: 700,
    });
  }, [partnerLocation, routeCoords.length]);

  const primaryOrderId = orderedStops[0]?.orderId || activeOrderId;

  const pushLocation = async () => {
    if (!primaryOrderId || !partnerLocation || pushing) return;
    const firstStop = orderedStops[0];
    setPushing(true);
    try {
      const roughDistanceKm =
        firstStop ? haversineMeters(partnerLocation, firstStop) / 1000 : 0;
      await api.pushTracking(primaryOrderId, {
        latitude: partnerLocation.latitude,
        longitude: partnerLocation.longitude,
        distanceKm: Number.isFinite(roughDistanceKm) ? Number(roughDistanceKm.toFixed(3)) : 0,
        statusNote: 'Partner moving on optimized route',
      });
    } finally {
      setPushing(false);
    }
  };

  const renderMap = (ref: any, sourceId: string, lineId: string) => (
    <MapLibreGL.MapView style={styles.map} mapStyle={mapStyle} logoEnabled={false} attributionEnabled={false}>
      {mapCenter ? (
        <MapLibreGL.Camera
          ref={ref}
          centerCoordinate={[mapCenter.longitude, mapCenter.latitude]}
          zoomLevel={14}
        />
      ) : null}

      {routeCoords.length > 1 ? (
        <MapLibreGL.ShapeSource id={sourceId} shape={routeFeature}>
          <MapLibreGL.LineLayer
            id={lineId}
            sourceID={sourceId}
            style={{ lineColor: COLORS.accent, lineWidth: 5, lineCap: 'round', lineJoin: 'round' }}
          />
        </MapLibreGL.ShapeSource>
      ) : null}

      {riderCoordinate ? (
        <MapLibreGL.PointAnnotation id={`${sourceId}-rider`} coordinate={riderCoordinate}>
          <View style={[styles.dot, { backgroundColor: COLORS.success }]} />
        </MapLibreGL.PointAnnotation>
      ) : null}

      {orderedStops.map((stop, idx) => (
        <MapLibreGL.PointAnnotation
          id={`${sourceId}-stop-${stop.orderId}-${idx}`}
          key={`${sourceId}-stop-${stop.orderId}-${idx}`}
          coordinate={[stop.longitude, stop.latitude]}
        >
          <View style={styles.stopPin}>
            <Text style={styles.stopPinTxt}>{idx + 1}</Text>
          </View>
        </MapLibreGL.PointAnnotation>
      ))}
    </MapLibreGL.MapView>
  );

  if (!MapLibreGL) {
    return (
      <View style={styles.screen}>
        <Text style={styles.title}>Delivery Route</Text>
        <View style={styles.card}>
          <Text style={styles.empty}>Map is unavailable in Expo Go. Use APK/dev build.</Text>
        </View>
      </View>
    );
  }

  if (!mapStyle) {
    return (
      <View style={styles.screen}>
        <Text style={styles.title}>Delivery Route</Text>
        <View style={styles.card}>
          <ActivityIndicator color={COLORS.accent} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Delivery Route {orderedStops.length ? `- ${orderedStops.length} stop(s)` : ''}</Text>

      <View style={styles.mapWrap}>
        {renderMap(cameraRef, 'main-route-source', 'main-route-line')}
        <View style={styles.overlay}>
          <Pressable style={styles.overlayBtn} onPress={() => setFullScreen(true)}>
            <Ionicons name="expand" size={18} color={COLORS.text} />
          </Pressable>
          <Pressable style={styles.overlayBtn} onPress={fetchRoute} disabled={routing || !partnerLocation || !assignedStops.length}>
            {routing ? <ActivityIndicator size="small" color={COLORS.accent} /> : <Ionicons name="navigate" size={18} color={COLORS.accent} />}
          </Pressable>
        </View>
      </View>

      <View style={styles.row}>
        <Pressable style={[styles.btn, styles.flex]} onPress={fetchRoute} disabled={routing || !partnerLocation || !assignedStops.length}>
          <Text style={styles.btnText}>{routing ? 'Routing...' : 'Refresh Route'}</Text>
        </Pressable>
        <Pressable style={[styles.btn, styles.flex]} onPress={pushLocation} disabled={pushing || !partnerLocation || !primaryOrderId}>
          <Text style={styles.btnText}>{pushing ? 'Sending...' : 'Push Live Location'}</Text>
        </Pressable>
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.metaText}>Distance: {distanceKm !== null ? `${distanceKm.toFixed(2)} km` : '--'}</Text>
        <Text style={styles.metaText}>ETA: {durationMinutes !== null ? `${Math.max(1, Math.round(durationMinutes))} min` : '--'}</Text>
      </View>

      {!!routeError ? <Text style={styles.error}>{routeError}</Text> : null}

      {orderedStops.length ? (
        <View style={styles.stopsCard}>
          <Text style={styles.stepsTitle}>Stop Sequence (Nearest First)</Text>
          <ScrollView style={styles.stepsList} nestedScrollEnabled>
            {orderedStops.map((stop, idx) => (
              <View key={`stop-${stop.orderId}-${idx}`} style={styles.stepRow}>
                <Text style={styles.stepText}>{idx + 1}. {stop.orderId}</Text>
                <Text style={styles.stepMeta}>{stop.status || ''}{stop.customerName ? ` | ${stop.customerName}` : ''}</Text>
                {!!stop.addressLine ? <Text style={styles.stepMeta}>{stop.addressLine}</Text> : null}
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {routeSteps.length ? (
        <View style={styles.stepsCard}>
          <Text style={styles.stepsTitle}>Turns & Steps</Text>
          <ScrollView style={styles.stepsList} nestedScrollEnabled>
            {routeSteps.map((step: any, idx: number) => (
              <View key={`step-${idx}`} style={styles.stepRow}>
                <Text style={styles.stepText}>
                  {idx + 1}. {step.instruction || 'Continue'}{step.orderId ? ` (${step.orderId})` : ''}
                </Text>
                <Text style={styles.stepMeta}>
                  {(Number(step.distanceMeters || 0) / 1000).toFixed(2)} km | {Math.round(Number(step.durationSeconds || 0))} sec
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <Modal visible={fullScreen} animationType="slide" onRequestClose={() => setFullScreen(false)}>
        <View style={styles.fullScreen}>
          {renderMap(fullCameraRef, 'full-route-source', 'full-route-line')}
          <Pressable style={styles.closeBtn} onPress={() => setFullScreen(false)}>
            <Ionicons name="close" size={20} color="#fff" />
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg, padding: 16 },
  title: { fontSize: 20, fontWeight: '900', marginBottom: 8, textAlign: 'center', color: COLORS.text },
  mapWrap: { flex: 1, borderRadius: 14, overflow: 'hidden', minHeight: 280 },
  map: { width: '100%', height: '100%' },
  overlay: {
    position: 'absolute',
    right: 12,
    top: 12,
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 12,
    padding: 6,
  },
  overlayBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  row: { flexDirection: 'row', gap: 8, marginTop: 10 },
  flex: { flex: 1 },
  btn: { backgroundColor: COLORS.accent, borderRadius: 12, alignItems: 'center', paddingVertical: 12 },
  btnText: { color: '#fff', fontWeight: '800' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  metaText: { color: COLORS.text, fontWeight: '700' },
  error: { color: COLORS.danger, marginTop: 8, fontWeight: '600' },
  stopsCard: { marginTop: 10, backgroundColor: '#fff', borderRadius: 12, padding: 10, maxHeight: 160 },
  stepsCard: { marginTop: 10, backgroundColor: '#fff', borderRadius: 12, padding: 10, maxHeight: 200 },
  stepsTitle: { fontWeight: '800', color: COLORS.text, marginBottom: 6 },
  stepsList: { flexGrow: 0 },
  stepRow: { paddingVertical: 6, borderBottomColor: '#EEE', borderBottomWidth: 1 },
  stepText: { color: COLORS.text, fontWeight: '600', fontSize: 12 },
  stepMeta: { color: COLORS.muted, fontSize: 11, marginTop: 2 },
  fullScreen: { flex: 1, backgroundColor: '#000' },
  closeBtn: {
    position: 'absolute',
    top: 40,
    left: 14,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#fff' },
  stopPin: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  stopPinTxt: { color: '#fff', fontWeight: '800', fontSize: 10 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16 },
  empty: { color: COLORS.muted, textAlign: 'center' },
});
