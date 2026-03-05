import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../src/config/appConfig';
import { useDebouncedValue } from '../src/hooks/useDebouncedValue';
import { api } from '../src/services/api';
import { hasMore, paginate } from '../src/utils/pagination';
import { useAuth } from '../src/context/AuthContext';
import { AppTextInput as TextInput } from '../src/components/AppTextInput';
import { Skeleton } from '../src/components/Skeleton';
import { formatCurrency } from '../src/utils/format';

export default function OrdersScreen() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [verifyingOrderId, setVerifyingOrderId] = useState<string | null>(null);
  const [expandedByOrder, setExpandedByOrder] = useState<Record<string, boolean>>({});
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [detailsOrder, setDetailsOrder] = useState<any | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search, 350);
  const { token, user } = useAuth();
  const router = useRouter();
  const isDeliveryPartner = user?.role === 'DELIVERY_PARTNER' && (user?.deliveryModeActive ?? true);

  const loadOrders = useCallback(async (asRefresh = false) => {
    if (!token) {
      setOrders([]);
      setLoading(false);
      return;
    }
    if (asRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      setError('');
      const list = isDeliveryPartner ? await api.myAssignedOrders() : await api.myOrders();
      setOrders(list || []);
    } catch (e: any) {
      setOrders([]);
      setError(e?.response?.data?.message || `Unable to load orders (${e?.response?.status || 'NO_STATUS'})`);
    } finally {
      if (asRefresh) setRefreshing(false);
      else setLoading(false);
    }
  }, [token, isDeliveryPartner]);

  useEffect(() => {
    loadOrders(false).catch(() => setLoading(false));
  }, [loadOrders]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter(
      (o) =>
        String(o.orderId || '').toLowerCase().includes(q) ||
        String(o.status || '').toLowerCase().includes(q) ||
        String(o.customerName || '').toLowerCase().includes(q) ||
        String(o.addressLine || '').toLowerCase().includes(q)
    );
  }, [orders, debouncedSearch]);

  const visible = useMemo(() => paginate(filtered, page), [filtered, page]);
  const isClosedStatus = useCallback((status: string | undefined) => ['DELIVERED', 'CANCELLED', 'FAILED'].includes(String(status || '')), []);

  const openOrderDetails = async (orderId: string) => {
    setDetailsVisible(true);
    setDetailsLoading(true);
    setDetailsOrder(null);
    try {
      const data = await api.orderById(orderId);
      setDetailsOrder(data || null);
    } catch (e: any) {
      setError(e?.response?.data?.message || `Unable to load order details (${e?.response?.status || 'NO_STATUS'})`);
      setDetailsVisible(false);
    } finally {
      setDetailsLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadOrders(true)} />}
    >
      <Text style={styles.title}>{isDeliveryPartner ? 'Driver Orders' : 'My Orders'}</Text>
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder={isDeliveryPartner ? 'Search by order id, status, user, address' : 'Search by order id or status'}
        style={styles.search}
      />
      {!!error ? <Text style={styles.error}>{error}</Text> : null}
      {loading
        ? Array.from({ length: 4 }).map((_, idx) => (
            <View key={`orders-skeleton-${idx}`} style={styles.card}>
              <Skeleton style={styles.skelTitle} />
              <Skeleton style={styles.skelLine} />
              <Skeleton style={styles.skelAmount} />
            </View>
          ))
        : null}
      {!loading && isDeliveryPartner ? (
        <View style={styles.driverSummaryRow}>
          <View style={[styles.driverSummaryCard, styles.driverSummaryCardPrimary]}>
            <Text style={styles.driverSummaryLabel}>Today&apos;s Earnings</Text>
            <Text style={styles.driverSummaryValue}>
              {formatCurrency(
                filtered
                  .filter((o) => String(o.status || '').toUpperCase() === 'DELIVERED')
                  .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0)
              )}
            </Text>
          </View>
          <View style={[styles.driverSummaryCard, styles.driverSummaryCardSecondary]}>
            <Text style={styles.driverSummaryLabelDark}>Completed</Text>
            <Text style={styles.driverSummaryValueDark}>
              {filtered.filter((o) => String(o.status || '').toUpperCase() === 'DELIVERED').length}
            </Text>
          </View>
        </View>
      ) : null}
      {!loading && isDeliveryPartner ? (
        <Pressable style={styles.openMapBtn} onPress={() => router.push('/delivery/map-view')}>
          <Text style={styles.openMapBtnTxt}>Open Delivery Map</Text>
        </Pressable>
      ) : null}
      {!loading && isDeliveryPartner ? <Text style={styles.assignedHeading}>Assigned Orders</Text> : null}
      {!loading && !filtered.length ? <Text style={styles.empty}>{isDeliveryPartner ? 'No assigned orders found.' : 'No orders found.'}</Text> : null}
      {visible.map((order) => {
        const orderKey = order.orderId || String(order.id);
        const closed = isClosedStatus(order.status);
        const expanded = !!expandedByOrder[orderKey];

        if (closed && !expanded) {
          return (
            <Pressable key={orderKey} style={styles.cardMin} onPress={() => setExpandedByOrder((prev) => ({ ...prev, [orderKey]: true }))}>
              <View style={styles.cardTop}>
                <Text style={styles.id}>{order.orderId}</Text>
                <Text style={styles.statusPill}>{order.status}</Text>
              </View>
              <Text style={styles.amount}>{formatCurrency(Number(order.totalAmount || 0))}</Text>
              <Text style={styles.minHint}>Tap to view</Text>
            </Pressable>
          );
        }

        return (
          <View key={orderKey} style={styles.card}>
          <View style={styles.cardTop}>
            <Text style={styles.id}>{order.orderId}</Text>
            <Text style={styles.statusPill}>{order.status}</Text>
          </View>
          <Text style={styles.amount}>{formatCurrency(Number(order.totalAmount || 0))}</Text>
          {isDeliveryPartner ? (
            <>
              <Text style={styles.meta}><Text style={styles.metaLabel}>Customer:</Text> {order.customerName || 'N/A'}</Text>
              <Text style={styles.meta}><Text style={styles.metaLabel}>Delivery:</Text> {order.addressLine || 'N/A'}</Text>
              <Text style={styles.meta}><Text style={styles.metaLabel}>Distance:</Text> {Number(order.distanceKm || 0).toFixed(1)} km</Text>
              {!closed ? (
                <>
                  {order.status === 'CONFIRMED' && !order.deliveryAccepted ? (
                    <Pressable
                      style={[styles.verifyBtn, verifyingOrderId === order.orderId && styles.disabledBtn]}
                      disabled={verifyingOrderId === order.orderId}
                      onPress={async () => {
                        setVerifyingOrderId(order.orderId);
                        try {
                          await api.acceptAssignedOrder(order.orderId);
                          await loadOrders(true);
                          router.push({ pathname: '/delivery/map-view', params: { orderId: order.orderId } });
                        } catch (e: any) {
                          setError(e?.response?.data?.message || `Unable to accept delivery (${e?.response?.status || 'NO_STATUS'})`);
                        } finally {
                          setVerifyingOrderId(null);
                        }
                      }}
                    >
                      <Text style={styles.verifyText}>{verifyingOrderId === order.orderId ? 'Accepting...' : 'Accept Delivery Request'}</Text>
                    </Pressable>
                  ) : (
                    <>
                      <Text style={styles.minHint}>Use single Delivery Map screen for route, calling customer and OTP completion.</Text>
                      <Pressable style={styles.openMapInlineBtn} onPress={() => router.push({ pathname: '/delivery/map-view', params: { orderId: order.orderId } })}>
                        <Text style={styles.openMapInlineBtnTxt}>Open Delivery Map</Text>
                      </Pressable>
                    </>
                  )}
                </>
              ) : (
                <Pressable style={styles.detailsBtn} onPress={() => openOrderDetails(order.orderId)}>
                  <Text style={styles.detailsText}>View Details</Text>
                </Pressable>
              )}
            </>
          ) : (
            closed ? (
              <Pressable style={styles.detailsBtn} onPress={() => openOrderDetails(order.orderId)}>
                <Text style={styles.detailsText}>Order Details</Text>
              </Pressable>
            ) : (
              <Pressable style={styles.trackBtn} onPress={() => router.push({ pathname: '/order-tracking', params: { orderId: order.orderId } })}>
                <Text style={styles.trackText}>Track Order</Text>
              </Pressable>
            )
          )}
          {closed ? (
            <Pressable style={styles.minimizeBtn} onPress={() => setExpandedByOrder((prev) => ({ ...prev, [orderKey]: false }))}>
              <Text style={styles.minimizeTxt}>Minimize</Text>
            </Pressable>
          ) : null}
        </View>
        );
      })}
      {!loading && hasMore(filtered, page) ? (
        <Pressable style={styles.more} onPress={() => setPage((p) => p + 1)}>
          <Text style={styles.moreText}>Load More</Text>
        </Pressable>
      ) : null}

      <Modal visible={detailsVisible} transparent animationType="fade" onRequestClose={() => setDetailsVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Order Details</Text>
            {detailsLoading ? <Text style={styles.modalMeta}>Loading...</Text> : null}
            {detailsOrder ? (
              <ScrollView style={{ maxHeight: 380 }}>
                <Text style={styles.modalMeta}><Text style={styles.modalLabel}>Order ID:</Text> {detailsOrder.orderId}</Text>
                <Text style={styles.modalMeta}><Text style={styles.modalLabel}>Status:</Text> {detailsOrder.status}</Text>
                <Text style={styles.modalMeta}><Text style={styles.modalLabel}>Amount:</Text> {formatCurrency(Number(detailsOrder.totalAmount || 0))}</Text>
                <Text style={styles.modalMeta}><Text style={styles.modalLabel}>Address:</Text> {detailsOrder.addressLine}</Text>
                <Text style={styles.modalMeta}><Text style={styles.modalLabel}>Flat/Society:</Text> {detailsOrder.flatNumber}, {detailsOrder.apartmentOrSociety}</Text>
                {(detailsOrder.items || []).length ? (
                  <>
                    <Text style={styles.modalItemsTitle}>Items</Text>
                    {(detailsOrder.items || []).map((it: any, idx: number) => (
                      <Text key={`it-${idx}`} style={styles.modalMeta}>
                        {idx + 1}. {it.itemName} x{it.quantity} - {formatCurrency(Number(it.totalPrice || 0))}
                      </Text>
                    ))}
                  </>
                ) : null}
              </ScrollView>
            ) : null}
            <Pressable style={styles.modalClose} onPress={() => setDetailsVisible(false)}>
              <Text style={styles.modalCloseTxt}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, paddingBottom: 26 },
  title: { fontSize: 24, fontWeight: '900' , textAlign: 'center'},
  driverSummaryRow: { flexDirection: 'row', gap: 10, marginTop: 10, marginBottom: 8 },
  driverSummaryCard: { flex: 1, borderRadius: 14, padding: 12 },
  driverSummaryCardPrimary: { backgroundColor: '#7E5A51' },
  driverSummaryCardSecondary: { backgroundColor: '#F3D5C9' },
  driverSummaryLabel: { color: '#F6E8E2', fontWeight: '700', marginBottom: 8 },
  driverSummaryValue: { color: '#fff', fontSize: 23, fontWeight: '900' },
  driverSummaryLabelDark: { color: '#8C5A4E', fontWeight: '700', marginBottom: 8 },
  driverSummaryValueDark: { color: '#5B2222', fontSize: 32, fontWeight: '900' },
  assignedHeading: { fontSize: 35, fontWeight: '800', color: COLORS.text, marginTop: 2, marginBottom: 2 },
  openMapBtn: { marginTop: 8, backgroundColor: COLORS.accent, borderRadius: 12, alignItems: 'center', paddingVertical: 11 },
  openMapBtnTxt: { color: '#fff', fontWeight: '800' },
  search: { marginTop: 10, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11 },
  empty: { color: COLORS.muted, marginTop: 12 },
  error: { color: COLORS.danger, marginTop: 8 },
  cardMin: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginTop: 10 },
  minHint: { marginTop: 4, color: COLORS.muted, fontSize: 12 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginTop: 10 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  id: { fontWeight: '800' },
  statusPill: { backgroundColor: COLORS.accentSoft, color: COLORS.accent, fontWeight: '800', fontSize: 11, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  amount: { marginTop: 5, color: COLORS.accent, fontWeight: '700' },
  meta: { marginTop: 4, color: COLORS.text },
  metaLabel: { fontWeight: '700' },
  verifyBtn: { marginTop: 8, backgroundColor: COLORS.text, borderRadius: 10, alignItems: 'center', paddingVertical: 10 },
  verifyText: { color: '#fff', fontWeight: '700' },
  openMapInlineBtn: { marginTop: 8, backgroundColor: COLORS.accent, borderRadius: 10, alignItems: 'center', paddingVertical: 10 },
  openMapInlineBtnTxt: { color: '#fff', fontWeight: '700' },
  detailsBtn: { marginTop: 8, backgroundColor: COLORS.text, borderRadius: 10, alignItems: 'center', paddingVertical: 10 },
  detailsText: { color: '#fff', fontWeight: '700' },
  minimizeBtn: { marginTop: 8, alignSelf: 'flex-end', paddingHorizontal: 8, paddingVertical: 4 },
  minimizeTxt: { color: COLORS.muted, fontSize: 12, fontWeight: '700' },
  disabledBtn: { opacity: 0.5 },
  trackBtn: { marginTop: 8, backgroundColor: COLORS.text, borderRadius: 10, alignItems: 'center', paddingVertical: 10 },
  trackText: { color: '#fff', fontWeight: '700' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 16 },
  modalCard: { backgroundColor: '#fff', borderRadius: 14, padding: 12 },
  modalTitle: { fontSize: 18, fontWeight: '900', textAlign: 'center', marginBottom: 8 },
  modalLabel: { fontWeight: '800', color: COLORS.text },
  modalMeta: { color: COLORS.text, marginTop: 4 },
  modalItemsTitle: { marginTop: 8, fontWeight: '900', color: COLORS.text },
  modalClose: { marginTop: 10, backgroundColor: COLORS.text, borderRadius: 10, alignItems: 'center', paddingVertical: 10 },
  modalCloseTxt: { color: '#fff', fontWeight: '800' },
  skelTitle: { height: 16, borderRadius: 8, width: '55%' },
  skelLine: { height: 12, borderRadius: 8, width: '38%', marginTop: 8 },
  skelAmount: { height: 12, borderRadius: 8, width: '28%', marginTop: 8 },
  more: { marginTop: 12, backgroundColor: '#fff', borderRadius: 10, alignItems: 'center', paddingVertical: 10 },
  moreText: { fontWeight: '700', color: COLORS.text },
});

