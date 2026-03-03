import { useEffect, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../../src/services/api';
import { COLORS } from '../../src/config/appConfig';
import { AppTextInput as TextInput } from '../../src/components/AppTextInput';
import { LoadingButton } from '../../src/components/LoadingButton';
import { resolveImageUrl } from '../../src/utils/images';

const salaryTypes = [
  { label: 'Fixed Daily (£)', value: 'FIXED_DAILY' },
  { label: 'Fixed Monthly (£)', value: 'FIXED_MONTHLY' },
  { label: 'By Kilometers (£/km)', value: 'PER_KM' },
];

export default function DeliveryApprovalsScreen() {
  const [pending, setPending] = useState<any[]>([]);
  const [activeDrivers, setActiveDrivers] = useState<any[]>([]);
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [showPending, setShowPending] = useState(false);
  const [showActiveDrivers, setShowActiveDrivers] = useState(false);
  const [submittingId, setSubmittingId] = useState<number | null>(null);
  const [draftById, setDraftById] = useState<Record<number, any>>({});
  const [errorById, setErrorById] = useState<Record<number, string>>({});

  const load = async () => {
    const [pendingData, approvedData, ordersData] = await Promise.all([
      api.pendingDeliveries(),
      api.approvedDeliveryPartners().catch(() => []),
      api.allOrders().catch(() => []),
    ]);
    setPending(pendingData || []);
    setActiveDrivers(approvedData || []);
    setAllOrders(ordersData || []);
  };

  useEffect(() => {
    load().catch(() => {});
  }, []);

  const updateDraft = (id: number, patch: any) => {
    setErrorById((prev) => ({ ...prev, [id]: '' }));
    setDraftById((prev) => ({
      ...prev,
      [id]: {
        vehicleType: prev[id]?.vehicleType ?? '',
        vehicleNumber: prev[id]?.vehicleNumber ?? '',
        salaryType: prev[id]?.salaryType ?? 'FIXED_DAILY',
        salaryAmount: prev[id]?.salaryAmount ?? '',
        ...patch,
      },
    }));
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>Delivery Partner Approvals</Text>
      <Pressable style={styles.foldCard} onPress={() => setShowPending((prev) => !prev)}>
        <Text style={styles.foldTitle}>Pending Delivery Partner Requests ({pending.length})</Text>
        <Text style={styles.foldSub}>{showPending ? 'Tap to collapse' : 'Tap to expand'}</Text>
      </Pressable>

      <Pressable style={styles.foldCard} onPress={() => setShowActiveDrivers((prev) => !prev)}>
        <Text style={styles.foldTitle}>Active Drivers ({activeDrivers.length})</Text>
        <Text style={styles.foldSub}>{showActiveDrivers ? 'Tap to collapse' : 'Tap to expand'}</Text>
      </Pressable>

      {showPending
        ? pending.map((p) => {
        const draft = draftById[p.id] || {
          vehicleType: p.vehicleType || '',
          vehicleNumber: p.vehicleNumber || '',
          salaryType: p.salaryType || 'FIXED_DAILY',
          salaryAmount: p.salaryAmount ? String(p.salaryAmount) : '',
        };
        const isSubmitting = submittingId === p.id;
          return (
            <View key={p.id} style={styles.card}>
            <Text style={styles.bold}>{p.user.fullName}</Text>
            <Text>{p.user.email}</Text>
            <TextInput
              style={styles.input}
              value={draft.vehicleType}
              onChangeText={(v) => updateDraft(p.id, { vehicleType: v })}
              placeholder="Vehicle Type"
            />
            <TextInput
              style={styles.input}
              value={draft.vehicleNumber}
              onChangeText={(v) => updateDraft(p.id, { vehicleNumber: v })}
              placeholder="Vehicle Number"
            />
            <View style={styles.row}>
              {salaryTypes.map((type) => (
                <Pressable
                  key={type.value}
                  style={[styles.chip, draft.salaryType === type.value && styles.chipActive]}
                  onPress={() => updateDraft(p.id, { salaryType: type.value })}
                >
                  <Text style={[styles.chipText, draft.salaryType === type.value && styles.chipTextActive]}>{type.label}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              style={styles.input}
              value={draft.salaryAmount}
              onChangeText={(v) => updateDraft(p.id, { salaryAmount: v })}
              keyboardType="numeric"
              placeholder="Salary amount in £"
            />
            {!!errorById[p.id] ? <Text style={styles.errorText}>{errorById[p.id]}</Text> : null}

            <View style={styles.buttonRow}>
              <LoadingButton
                title="Save Edit"
                loadingTitle="Submitting"
                loading={isSubmitting}
                style={styles.smallBtn}
                onPress={async () => {
                  if (isSubmitting) return;
                  setSubmittingId(p.id);
                  try {
                    await api.updateDeliveryPartner(p.id, {
                      vehicleType: draft.vehicleType,
                      vehicleNumber: draft.vehicleNumber,
                      salaryType: draft.salaryType,
                      salaryAmount: Number(draft.salaryAmount || 0),
                    });
                    await load();
                  } finally {
                    setSubmittingId(null);
                  }
                }}
              />
              <LoadingButton
                title="Approve"
                loadingTitle="Submitting"
                loading={isSubmitting}
                style={styles.smallBtn}
                onPress={async () => {
                  if (isSubmitting) return;
                  const salaryAmount = Number(draft.salaryAmount);
                  if (!draft.salaryType || !Number.isFinite(salaryAmount) || salaryAmount <= 0) {
                    setErrorById((prev) => ({ ...prev, [p.id]: 'Select salary type and enter valid salary amount (> 0).' }));
                    return;
                  }
                  setSubmittingId(p.id);
                  try {
                    await api.decideDelivery(p.id, {
                      approve: true,
                      vehicleType: draft.vehicleType,
                      vehicleNumber: draft.vehicleNumber,
                      salaryType: draft.salaryType,
                      salaryAmount,
                    });
                    await load();
                    setErrorById((prev) => ({ ...prev, [p.id]: '' }));
                  } catch (e: any) {
                    setErrorById((prev) => ({
                      ...prev,
                      [p.id]: e?.response?.data?.message || 'Unable to approve. Check salary details and try again.',
                    }));
                  } finally {
                    setSubmittingId(null);
                  }
                }}
              />
              <LoadingButton
                title="Reject"
                loadingTitle="Submitting"
                loading={isSubmitting}
                style={styles.smallBtn}
                onPress={async () => {
                  if (isSubmitting) return;
                  setSubmittingId(p.id);
                  try {
                    await api.decideDelivery(p.id, {
                      approve: false,
                      vehicleType: draft.vehicleType,
                      vehicleNumber: draft.vehicleNumber,
                      salaryType: draft.salaryType,
                      salaryAmount: Number(draft.salaryAmount || 0),
                    });
                    await load();
                    setErrorById((prev) => ({ ...prev, [p.id]: '' }));
                  } catch (e: any) {
                    setErrorById((prev) => ({ ...prev, [p.id]: e?.response?.data?.message || 'Unable to reject request.' }));
                  } finally {
                    setSubmittingId(null);
                  }
                }}
              />
            </View>
            </View>
          );
        })
        : null}

      {showActiveDrivers
        ? activeDrivers.map((driver) => {
          const assignedOrders = allOrders.filter((order) => Number(order?.deliveryPartner?.id) === Number(driver.id));
          const activeOrder = assignedOrders.find((order) =>
            ['PLACED', 'PREPARING', 'CONFIRMED', 'OUT_FOR_DELIVERY'].includes(String(order?.status || ''))
          );
          const deliveryStatus = activeOrder ? `On Delivery (${activeOrder.orderId})` : 'Available';
          const imageUri = resolveImageUrl(driver?.user?.profileImageUrl || (driver?.user?.profileImageId ? `/api/images/${driver.user.profileImageId}` : null));
          return (
            <View key={`active-driver-${driver.id}`} style={styles.activeDriverCard}>
              <Image source={imageUri ? { uri: imageUri } : require('../../assets/images/mutton.jpg')} style={styles.avatar} />
              <View style={{ flex: 1 }}>
                <Text style={styles.bold}>{driver?.user?.fullName || 'Driver'}</Text>
                <Text style={styles.meta}>{driver?.user?.email || '-'}</Text>
                <Text style={styles.meta}>{deliveryStatus}</Text>
              </View>
              <Pressable
                style={styles.callBtn}
                onPress={() => {
                  const phone = String(driver?.user?.phone || '').trim();
                  if (!phone) return;
                  Linking.openURL(`tel:${phone}`);
                }}
              >
                <Text style={styles.callBtnText}>Call</Text>
              </Pressable>
            </View>
          );
        })
        : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  title: { fontSize: 24, fontWeight: '900', textAlign: 'center' },
  foldCard: { backgroundColor: '#fff', borderRadius: 12, padding: 10, marginTop: 8, borderWidth: 1, borderColor: '#EFEFEF' },
  foldTitle: { fontWeight: '900', color: COLORS.text },
  foldSub: { marginTop: 2, color: COLORS.muted, fontSize: 12 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 10, marginTop: 8 },
  bold: { fontWeight: '800' },
  meta: { color: COLORS.muted, fontSize: 12, marginTop: 1 },
  input: { backgroundColor: '#f8f8f8', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9, marginTop: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  chip: { backgroundColor: COLORS.chip, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  chipActive: { backgroundColor: COLORS.accentSoft },
  chipText: { color: COLORS.text, fontSize: 11, fontWeight: '700' },
  chipTextActive: { color: COLORS.accent },
  buttonRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  smallBtn: { flex: 1 },
  errorText: { color: COLORS.danger, marginTop: 6, fontWeight: '600' },
  activeDriverCard: { backgroundColor: '#fff', borderRadius: 12, padding: 10, marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  callBtn: { backgroundColor: COLORS.accent, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  callBtnText: { color: '#fff', fontWeight: '800' },
});
