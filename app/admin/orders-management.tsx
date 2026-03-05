import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../../src/services/api';
import { COLORS } from '../../src/config/appConfig';
import { useDebouncedValue } from '../../src/hooks/useDebouncedValue';
import { hasMore, paginate } from '../../src/utils/pagination';
import { AppTextInput as TextInput } from '../../src/components/AppTextInput';
import { Skeleton } from '../../src/components/Skeleton';
import { resolveImageUrl } from '../../src/utils/images';
import { formatCurrency } from '../../src/utils/format';
import { WeekDateStrip } from '../../src/components/WeekDateStrip';

const statusFilters = [
  { key: 'ALL', label: 'All', values: [] as string[] },
  { key: 'PENDING', label: 'Pending', values: ['PLACED'] },
  { key: 'PREPARING', label: 'Preparing', values: ['PREPARING'] },
  { key: 'READY', label: 'Ready', values: ['CONFIRMED'] },
  { key: 'ON_WAY', label: 'Out for Delivery', values: ['OUT_FOR_DELIVERY'] },
  { key: 'DELIVERED', label: 'Delivered', values: ['DELIVERED'] },
];
const statusUpdateOptions = ['PLACED', 'PREPARING', 'CONFIRMED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];

const formatLocalDate = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function OrdersManagementScreen() {
  const [orders, setOrders] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [selectedPartnerByOrder, setSelectedPartnerByOrder] = useState<Record<string, number>>({});
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [bulkPartnerId, setBulkPartnerId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submittingOrderId, setSubmittingOrderId] = useState<string | null>(null);
  const [pickerOrderId, setPickerOrderId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(formatLocalDate(new Date()));
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const debouncedQuery = useDebouncedValue(query, 350);

  const load = useCallback(async () => {
    setError('');
    const [orderList, approvedPartners] = await Promise.all([api.allOrders(), api.approvedDeliveryPartners().catch(() => [])]);
    setOrders(orderList || []);
    setPartners(approvedPartners || []);
  }, []);

  useEffect(() => {
    load()
      .catch((e: any) => setError(e?.response?.data?.message || `Unable to load orders (${e?.response?.status || 'NO_STATUS'})`))
      .finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    const timer = setInterval(() => {
      load().catch(() => {});
    }, 3000);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, selectedDate, selectedStatus]);

  useEffect(() => {
    setSelectedOrderIds([]);
  }, [selectedDate, selectedStatus, debouncedQuery]);

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    const filterObj = statusFilters.find((f) => f.key === selectedStatus) || statusFilters[0];
    return orders
      .filter((order) => {
        if (order?.orderDate) return String(order.orderDate) === selectedDate;
        const createdAt = order?.createdAt ? new Date(order.createdAt) : null;
        if (!createdAt || Number.isNaN(createdAt.getTime())) return false;
        return formatLocalDate(createdAt) === selectedDate;
      })
      .filter((order) => (filterObj.values.length ? filterObj.values.includes(String(order?.status || '')) : true))
      .filter((order) => {
        if (!q) return true;
        return String(order?.orderId || '').toLowerCase().includes(q) || String(order?.status || '').toLowerCase().includes(q);
      });
  }, [orders, debouncedQuery, selectedDate, selectedStatus]);
  const visible = useMemo(() => paginate(filtered, page), [filtered, page]);
  const selectedOrderPartner = useCallback(
    (orderId: string) => partners.find((p) => p.id === selectedPartnerByOrder[orderId]),
    [partners, selectedPartnerByOrder]
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message || `Unable to refresh orders (${e?.response?.status || 'NO_STATUS'})`);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <WeekDateStrip value={selectedDate} onChange={setSelectedDate} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {statusFilters.map((status) => (
          <Pressable
            key={status.key}
            style={[styles.filterChip, selectedStatus === status.key && styles.filterChipActive]}
            onPress={() => setSelectedStatus(status.key)}
          >
            <Text style={[styles.filterChipText, selectedStatus === status.key && styles.filterChipTextActive]}>{status.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <Text style={styles.countText}>{filtered.length} Orders</Text>
      <View style={styles.bulkRow}>
        <Text style={styles.bulkMeta}>Selected: {selectedOrderIds.length}</Text>
        <Pressable style={styles.bulkBtn} onPress={() => setPickerOrderId('__bulk__')}>
          <Text style={styles.bulkBtnTxt}>{bulkPartnerId ? 'Change Bulk Partner' : 'Select Bulk Partner'}</Text>
        </Pressable>
        <Pressable
          style={[styles.bulkBtnDark, (selectedOrderIds.length === 0 || !bulkPartnerId) && styles.bulkBtnDisabled]}
          disabled={selectedOrderIds.length === 0 || !bulkPartnerId}
          onPress={async () => {
            const limited = selectedOrderIds.slice(0, 50);
            await api.assignDeliveryBulk(bulkPartnerId!, limited);
            await load();
            setSelectedOrderIds([]);
          }}
        >
          <Text style={styles.bulkBtnTxtWhite}>Assign up to 50</Text>
        </Pressable>
      </View>
      <TextInput value={query} onChangeText={setQuery} placeholder="Search orders" style={styles.search} />
      {!!error ? <Text style={styles.error}>{error}</Text> : null}
      {loading
        ? Array.from({ length: 4 }).map((_, idx) => (
            <View key={`admin-orders-skeleton-${idx}`} style={styles.card}>
              <Skeleton style={styles.skelTitle} />
              <Skeleton style={styles.skelLine} />
              <Skeleton style={styles.skelLine} />
              <View style={styles.row}>
                <Skeleton style={styles.skelChip} />
                <Skeleton style={styles.skelChip} />
                <Skeleton style={styles.skelChip} />
              </View>
            </View>
          ))
        : null}
      {visible.map((order) => (
        <View key={order.orderId || order.id} style={styles.card}>
          {!['DELIVERED', 'CANCELLED'].includes(String(order.status || '')) ? (
            <Pressable
              style={styles.bulkPickRow}
              onPress={() => {
                setSelectedOrderIds((prev) =>
                  prev.includes(order.orderId)
                    ? prev.filter((id) => id !== order.orderId)
                    : [...prev, order.orderId].slice(0, 50)
                );
              }}
            >
              <View style={[styles.bulkBox, selectedOrderIds.includes(order.orderId) && styles.bulkBoxActive]} />
              <Text style={styles.bulkMeta}>Select for bulk assign</Text>
            </Pressable>
          ) : null}
          {(() => {
            const statusText = String(order.status || '').toUpperCase();
            const isDelivered = statusText === 'DELIVERED';
            const isClosed = ['DELIVERED', 'CANCELLED', 'FAILED'].includes(statusText);
            return (
              <>
          <Text style={styles.bold}>{order.orderId}</Text>
          <View style={styles.statusRow}>
            <Text>Status:</Text>
            <Text
              style={[
                styles.statusBadge,
                statusText === 'DELIVERED' && styles.statusDelivered,
                statusText === 'OUT_FOR_DELIVERY' && styles.statusOnWay,
                statusText === 'PREPARING' && styles.statusPreparing,
                statusText === 'PLACED' && styles.statusPending,
              ]}
            >
              {statusText}
            </Text>
          </View>
          <Text>Order Date: {order.orderDate || '-'}</Text>
          <Text>Slot: {order.orderSlot || 'ALL'}</Text>
          <Text>Amount: {formatCurrency(Number(order.totalAmount || 0))}</Text>
          {!isClosed ? (
            <View style={styles.row}>
              {statusUpdateOptions.map((s) => (
                <Pressable
                  key={s}
                  style={styles.chip}
                  disabled={submittingOrderId === order.orderId}
                  onPress={async () => {
                    if (submittingOrderId) return;
                    setSubmittingOrderId(order.orderId);
                    try {
                      await api.updateOrderStatus(order.orderId, { status: s });
                      await load();
                    } finally {
                      setSubmittingOrderId(null);
                    }
                  }}
                >
                  <Text style={styles.chipText}>{s}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          {partners.length ? (
            <>
              {!isDelivered ? (
                <Pressable style={styles.selectBtn} onPress={() => setPickerOrderId(order.orderId)}>
                  <Text style={styles.selectBtnTxt}>
                    {selectedPartnerByOrder[order.orderId] || order?.deliveryPartner?.id ? 'Change Delivery Partner' : 'Select Delivery Partner'}
                  </Text>
                </Pressable>
              ) : null}

              {(selectedOrderPartner(order.orderId) || order?.deliveryPartner) ? (
                <View style={styles.partnerCard}>
                  <Image
                    source={
                      resolveImageUrl(
                        selectedOrderPartner(order.orderId)?.user?.profileImageUrl ||
                          (selectedOrderPartner(order.orderId)?.user?.profileImageId
                            ? `/api/images/${selectedOrderPartner(order.orderId)?.user?.profileImageId}`
                            : null) ||
                          order?.deliveryPartner?.user?.profileImageUrl ||
                          (order?.deliveryPartner?.user?.profileImageId
                            ? `/api/images/${order?.deliveryPartner?.user?.profileImageId}`
                            : null)
                      )
                        ? {
                            uri: resolveImageUrl(
                              selectedOrderPartner(order.orderId)?.user?.profileImageUrl ||
                                (selectedOrderPartner(order.orderId)?.user?.profileImageId
                                  ? `/api/images/${selectedOrderPartner(order.orderId)?.user?.profileImageId}`
                                  : null) ||
                                order?.deliveryPartner?.user?.profileImageUrl ||
                                (order?.deliveryPartner?.user?.profileImageId
                                  ? `/api/images/${order?.deliveryPartner?.user?.profileImageId}`
                                  : null)
                            )!,
                          }
                        : require('../../assets/images/mutton.jpg')
                    }
                    style={styles.partnerAvatar}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.partnerName}>
                      {selectedOrderPartner(order.orderId)?.user?.fullName || order?.deliveryPartner?.user?.fullName || 'Delivery Partner'}
                    </Text>
                    <Text style={styles.partnerMeta}>
                      {selectedOrderPartner(order.orderId)?.user?.email || order?.deliveryPartner?.user?.email || 'No email'}
                    </Text>
                    <Text style={styles.partnerMeta}>
                      {selectedOrderPartner(order.orderId)?.vehicleType || order?.deliveryPartner?.vehicleType || '-'} |{' '}
                      {selectedOrderPartner(order.orderId)?.vehicleNumber || order?.deliveryPartner?.vehicleNumber || '-'}
                    </Text>
                    <Text style={styles.partnerMeta}>
                      Delivery Acceptance: {order?.deliveryAccepted ? 'Accepted' : 'Pending'}
                    </Text>
                  </View>
                </View>
              ) : null}

              {!isDelivered ? (
                <Pressable
                  style={styles.assign}
                  disabled={submittingOrderId === order.orderId || String(order.orderDate || '') !== formatLocalDate(new Date())}
                  onPress={async () => {
                    if (submittingOrderId) return;
                    const selectedId = selectedPartnerByOrder[order.orderId];
                    if (!selectedId) return;
                    setSubmittingOrderId(order.orderId);
                    try {
                      await api.assignDelivery(order.orderId, selectedId);
                      await load();
                    } finally {
                      setSubmittingOrderId(null);
                    }
                  }}
                >
                  <Text style={{ color: '#fff' }}>{submittingOrderId === order.orderId ? 'Sending...' : 'Assign Delivery Partner'}</Text>
                </Pressable>
              ) : null}
              {!isDelivered && String(order.orderDate || '') !== formatLocalDate(new Date()) ? (
                <Text style={styles.futureNote}>Delivery assignment allowed only for today orders.</Text>
              ) : null}
            </>
          ) : null}
              </>
            );
          })()}
        </View>
      ))}
      <Modal visible={!!pickerOrderId} transparent animationType="fade" onRequestClose={() => setPickerOrderId(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select Delivery Partner</Text>
            <ScrollView style={{ maxHeight: 380 }}>
              {partners.map((partner) => {
                const imageUri = resolveImageUrl(
                  partner.user?.profileImageUrl || (partner.user?.profileImageId ? `/api/images/${partner.user.profileImageId}` : null)
                );
                const active = pickerOrderId === '__bulk__'
                  ? bulkPartnerId === partner.id
                  : pickerOrderId
                    ? selectedPartnerByOrder[pickerOrderId] === partner.id
                    : false;
                return (
                  <Pressable
                    key={`partner-pick-${partner.id}`}
                    style={[styles.partnerPickRow, active && styles.partnerPickRowActive]}
                    onPress={() => {
                      if (!pickerOrderId) return;
                      if (pickerOrderId === '__bulk__') {
                        setBulkPartnerId(partner.id);
                      } else {
                        setSelectedPartnerByOrder((prev) => ({ ...prev, [pickerOrderId]: partner.id }));
                      }
                      setPickerOrderId(null);
                    }}
                  >
                    <Image source={imageUri ? { uri: imageUri } : require('../../assets/images/mutton.jpg')} style={styles.partnerPickAvatar} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.partnerPickName}>{partner.user?.fullName || `Partner #${partner.id}`}</Text>
                      <Text style={styles.partnerPickMeta}>{partner.user?.email || 'No email'}</Text>
                      <Text style={styles.partnerPickMeta}>
                        {partner.vehicleType || '-'} | {partner.vehicleNumber || '-'}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable style={styles.modalClose} onPress={() => setPickerOrderId(null)}>
              <Text style={styles.modalCloseTxt}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      {!loading && hasMore(filtered, page) ? (
        <Pressable style={styles.more} onPress={() => setPage((p) => p + 1)}>
          <Text style={styles.moreText}>Load More</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  search: { marginTop: 10, marginBottom: 4, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  error: { color: COLORS.danger, marginTop: 6 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 10, marginTop: 8 },
  bold: { fontWeight: '800' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, fontWeight: '800', fontSize: 11, color: '#fff', backgroundColor: COLORS.muted },
  statusPending: { backgroundColor: '#C4554F' },
  statusPreparing: { backgroundColor: '#D08B3A' },
  statusOnWay: { backgroundColor: '#3A8AD0' },
  statusDelivered: { backgroundColor: '#2E9B57' },
  skelTitle: { height: 14, borderRadius: 8, width: '46%' },
  skelLine: { height: 12, borderRadius: 8, width: '36%', marginTop: 8 },
  skelChip: { height: 28, borderRadius: 999, width: 90 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  filterRow: { gap: 8, paddingTop: 4, paddingBottom: 4 },
  filterChip: { backgroundColor: COLORS.chip, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  filterChipActive: { backgroundColor: COLORS.accent },
  filterChipText: { color: COLORS.text, fontWeight: '700', fontSize: 12 },
  filterChipTextActive: { color: '#fff' },
  countText: { marginTop: 4, color: COLORS.text, fontWeight: '700' },
  bulkRow: { marginTop: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  bulkMeta: { color: COLORS.text, fontWeight: '700', fontSize: 12 },
  bulkBtn: { backgroundColor: COLORS.chip, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  bulkBtnDark: { backgroundColor: COLORS.text, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  bulkBtnDisabled: { opacity: 0.45 },
  bulkBtnTxt: { color: COLORS.text, fontWeight: '700', fontSize: 12 },
  bulkBtnTxtWhite: { color: '#fff', fontWeight: '800', fontSize: 12 },
  bulkPickRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  bulkBox: { width: 16, height: 16, borderRadius: 4, borderWidth: 1.4, borderColor: COLORS.muted, backgroundColor: '#fff' },
  bulkBoxActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  chip: { backgroundColor: COLORS.chip, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  chipActive: { backgroundColor: COLORS.accentSoft },
  chipText: { fontSize: 11 },
  selectBtn: { marginTop: 8, backgroundColor: COLORS.chip, borderRadius: 8, alignItems: 'center', paddingVertical: 8 },
  selectBtnTxt: { color: COLORS.text, fontWeight: '700' },
  partnerCard: { marginTop: 8, borderRadius: 10, borderWidth: 1, borderColor: '#EEE', padding: 8, flexDirection: 'row', gap: 8, alignItems: 'center' },
  partnerAvatar: { width: 42, height: 42, borderRadius: 21 },
  partnerName: { fontWeight: '800', color: COLORS.text },
  partnerMeta: { color: COLORS.muted, fontSize: 12 },
  assign: { marginTop: 8, backgroundColor: COLORS.text, borderRadius: 8, alignItems: 'center', paddingVertical: 8 },
  futureNote: { color: COLORS.muted, marginTop: 6, fontSize: 12 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 16 },
  modalCard: { backgroundColor: '#fff', borderRadius: 14, padding: 12 },
  modalTitle: { fontSize: 18, fontWeight: '900', textAlign: 'center', marginBottom: 8 },
  partnerPickRow: { flexDirection: 'row', gap: 10, alignItems: 'center', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#EEE', marginBottom: 8 },
  partnerPickRowActive: { borderColor: COLORS.accent, backgroundColor: COLORS.accentSoft },
  partnerPickAvatar: { width: 44, height: 44, borderRadius: 22 },
  partnerPickName: { fontWeight: '800', color: COLORS.text },
  partnerPickMeta: { color: COLORS.muted, fontSize: 12 },
  modalClose: { marginTop: 6, backgroundColor: COLORS.text, borderRadius: 10, alignItems: 'center', paddingVertical: 10 },
  modalCloseTxt: { color: '#fff', fontWeight: '800' },
  more: { marginTop: 12, backgroundColor: '#fff', borderRadius: 10, alignItems: 'center', paddingVertical: 10 },
  moreText: { fontWeight: '700', color: COLORS.text },
});

