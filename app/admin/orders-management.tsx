import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../../src/services/api';
import { COLORS } from '../../src/config/appConfig';
import { useDebouncedValue } from '../../src/hooks/useDebouncedValue';
import { hasMore, paginate } from '../../src/utils/pagination';
import { AppTextInput as TextInput } from '../../src/components/AppTextInput';
import { Skeleton } from '../../src/components/Skeleton';
import { resolveImageUrl } from '../../src/utils/images';

const statuses = ['CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED'];

export default function OrdersManagementScreen() {
  const [orders, setOrders] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [selectedPartnerByOrder, setSelectedPartnerByOrder] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submittingOrderId, setSubmittingOrderId] = useState<string | null>(null);
  const [pickerOrderId, setPickerOrderId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
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
    setPage(1);
  }, [debouncedQuery]);

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) => String(o.orderId || '').toLowerCase().includes(q) || String(o.status || '').toLowerCase().includes(q));
  }, [orders, debouncedQuery]);
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
      <Text style={styles.title}>Orders Management</Text>
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
          <Text style={styles.bold}>{order.orderId}</Text>
          <Text>Status: {order.status}</Text>
          <Text>Amount: Rs {order.totalAmount}</Text>
          <View style={styles.row}>
            {statuses.map((s) => (
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
          {partners.length ? (
            <>
              <Pressable style={styles.selectBtn} onPress={() => setPickerOrderId(order.orderId)}>
                <Text style={styles.selectBtnTxt}>
                  {selectedPartnerByOrder[order.orderId] ? 'Change Delivery Partner' : 'Select Delivery Partner'}
                </Text>
              </Pressable>

              {selectedOrderPartner(order.orderId) ? (
                <View style={styles.partnerCard}>
                  <Image
                    source={
                      resolveImageUrl(
                        selectedOrderPartner(order.orderId)?.user?.profileImageUrl ||
                          (selectedOrderPartner(order.orderId)?.user?.profileImageId
                            ? `/api/images/${selectedOrderPartner(order.orderId)?.user?.profileImageId}`
                            : null)
                      )
                        ? {
                            uri: resolveImageUrl(
                              selectedOrderPartner(order.orderId)?.user?.profileImageUrl ||
                                (selectedOrderPartner(order.orderId)?.user?.profileImageId
                                  ? `/api/images/${selectedOrderPartner(order.orderId)?.user?.profileImageId}`
                                  : null)
                            )!,
                          }
                        : require('../../assets/images/mutton.jpg')
                    }
                    style={styles.partnerAvatar}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.partnerName}>{selectedOrderPartner(order.orderId)?.user?.fullName || 'Delivery Partner'}</Text>
                    <Text style={styles.partnerMeta}>{selectedOrderPartner(order.orderId)?.user?.email || 'No email'}</Text>
                    <Text style={styles.partnerMeta}>
                      {selectedOrderPartner(order.orderId)?.vehicleType || '-'} | {selectedOrderPartner(order.orderId)?.vehicleNumber || '-'}
                    </Text>
                  </View>
                </View>
              ) : null}

              <Pressable
                style={styles.assign}
                disabled={submittingOrderId === order.orderId}
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
            </>
          ) : null}
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
                const active = pickerOrderId ? selectedPartnerByOrder[pickerOrderId] === partner.id : false;
                return (
                  <Pressable
                    key={`partner-pick-${partner.id}`}
                    style={[styles.partnerPickRow, active && styles.partnerPickRowActive]}
                    onPress={() => {
                      if (!pickerOrderId) return;
                      setSelectedPartnerByOrder((prev) => ({ ...prev, [pickerOrderId]: partner.id }));
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
  title: { fontSize: 24, fontWeight: '900' , textAlign: 'center'},
  search: { marginTop: 10, marginBottom: 4, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  error: { color: COLORS.danger, marginTop: 6 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 10, marginTop: 8 },
  bold: { fontWeight: '800' },
  skelTitle: { height: 14, borderRadius: 8, width: '46%' },
  skelLine: { height: 12, borderRadius: 8, width: '36%', marginTop: 8 },
  skelChip: { height: 28, borderRadius: 999, width: 90 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
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

