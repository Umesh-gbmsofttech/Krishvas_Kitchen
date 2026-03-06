import { useEffect, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../../src/services/api';
import { COLORS, CURRENCY_SYMBOL } from '../../src/config/appConfig';
import { AppTextInput as TextInput } from '../../src/components/AppTextInput';
import { LoadingButton } from '../../src/components/LoadingButton';
import { resolveImageUrl } from '../../src/utils/images';

const salaryTypes = [
  { label: `Fixed Daily (${CURRENCY_SYMBOL})`, value: 'FIXED_DAILY' },
  { label: `Fixed Monthly (${CURRENCY_SYMBOL})`, value: 'FIXED_MONTHLY' },
  { label: `By Kilometers (${CURRENCY_SYMBOL}/km)`, value: 'PER_KM' },
];

export default function DeliveryApprovalsScreen() {
  const [activeDrivers, setActiveDrivers] = useState<any[]>([]);
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [showActiveDrivers, setShowActiveDrivers] = useState(false);
  const [createDraft, setCreateDraft] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    vehicleType: '',
    vehicleNumber: '',
    salaryType: 'FIXED_DAILY',
    salaryAmount: '',
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(true);
  const [creatingDriver, setCreatingDriver] = useState(false);
  const [createError, setCreateError] = useState('');

  const load = async () => {
    const [approvedData, ordersData] = await Promise.all([
      api.approvedDeliveryPartners().catch(() => []),
      api.allOrders().catch(() => []),
    ]);
    setActiveDrivers(approvedData || []);
    setAllOrders(ordersData || []);
  };

  useEffect(() => {
    load().catch(() => {});
  }, []);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>Add Delivery Partner</Text>
      <View style={styles.card}>
        <Text style={styles.bold}>Admin creates delivery partner account</Text>
        <Text style={styles.meta}>Email and password below are used by delivery partner to login and accept deliveries.</Text>

        <TextInput style={styles.input} value={createDraft.fullName} onChangeText={(v) => setCreateDraft((p) => ({ ...p, fullName: v }))} placeholder="Full name" />
        <TextInput style={styles.input} value={createDraft.email} onChangeText={(v) => setCreateDraft((p) => ({ ...p, email: v }))} placeholder="Email" autoCapitalize="none" />
        <View style={styles.passwordRow}>
          <TextInput
            style={styles.passwordInput}
            value={createDraft.password}
            onChangeText={(v) => setCreateDraft((p) => ({ ...p, password: v }))}
            placeholder="Login password"
            secureTextEntry={!showPassword}
          />
          <Pressable style={styles.toggleBtn} onPress={() => setShowPassword((v) => !v)}>
            <Text style={styles.toggleBtnText}>{showPassword ? 'Hide' : 'Show'}</Text>
          </Pressable>
        </View>
        <TextInput
          style={styles.input}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Confirm password"
          secureTextEntry={!showPassword}
        />
        <TextInput style={styles.input} value={createDraft.phone} onChangeText={(v) => setCreateDraft((p) => ({ ...p, phone: v }))} placeholder="Phone" />
        <TextInput style={styles.input} value={createDraft.vehicleType} onChangeText={(v) => setCreateDraft((p) => ({ ...p, vehicleType: v }))} placeholder="Vehicle type (optional)" />
        <TextInput style={styles.input} value={createDraft.vehicleNumber} onChangeText={(v) => setCreateDraft((p) => ({ ...p, vehicleNumber: v }))} placeholder="Vehicle number (optional)" />

        <View style={styles.row}>
          {salaryTypes.map((type) => (
            <Pressable
              key={`create-${type.value}`}
              style={[styles.chip, createDraft.salaryType === type.value && styles.chipActive]}
              onPress={() => setCreateDraft((p) => ({ ...p, salaryType: type.value }))}
            >
              <Text style={[styles.chipText, createDraft.salaryType === type.value && styles.chipTextActive]}>{type.label}</Text>
            </Pressable>
          ))}
        </View>

        <TextInput
          style={styles.input}
          value={createDraft.salaryAmount}
          onChangeText={(v) => setCreateDraft((p) => ({ ...p, salaryAmount: v }))}
          placeholder="Salary amount (optional)"
          keyboardType="numeric"
        />

        {!!createError ? <Text style={styles.errorText}>{createError}</Text> : null}

        <LoadingButton
          title="Add Delivery Partner"
          loadingTitle="Submitting"
          loading={creatingDriver}
          onPress={async () => {
            if (creatingDriver) return;
            setCreateError('');
            if (createDraft.password !== confirmPassword) {
              setCreateError('Password and confirm password must match.');
              return;
            }
            setCreatingDriver(true);
            try {
              await api.adminCreateDeliveryPartner({
                ...createDraft,
                vehicleType: createDraft.vehicleType.trim() || null,
                vehicleNumber: createDraft.vehicleNumber.trim() || null,
                salaryAmount: createDraft.salaryAmount.trim() ? Number(createDraft.salaryAmount) : null,
                salaryType: createDraft.salaryAmount.trim() ? createDraft.salaryType : null,
              });
              setCreateDraft({
                fullName: '',
                email: '',
                password: '',
                phone: '',
                vehicleType: '',
                vehicleNumber: '',
                salaryType: 'FIXED_DAILY',
                salaryAmount: '',
              });
              setConfirmPassword('');
              await load();
            } catch (e: any) {
              setCreateError(e?.response?.data?.message || 'Unable to add delivery partner');
            } finally {
              setCreatingDriver(false);
            }
          }}
        />
      </View>

      <Pressable style={styles.foldCard} onPress={() => setShowActiveDrivers((prev) => !prev)}>
        <Text style={styles.foldTitle}>Active Drivers ({activeDrivers.length})</Text>
        <Text style={styles.foldSub}>{showActiveDrivers ? 'Tap to collapse' : 'Tap to expand'}</Text>
      </Pressable>

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
                <Image source={imageUri ? { uri: imageUri } : require('../../assets/images/KrishvasKitchen_transparent.png')} style={styles.avatar} />
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
  passwordRow: {
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  passwordInput: { flex: 1, paddingVertical: 9, paddingHorizontal: 2 },
  toggleBtn: { backgroundColor: '#EDEDED', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  toggleBtnText: { color: COLORS.text, fontWeight: '700', fontSize: 12 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  chip: { backgroundColor: COLORS.chip, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  chipActive: { backgroundColor: COLORS.accentSoft },
  chipText: { color: COLORS.text, fontSize: 11, fontWeight: '700' },
  chipTextActive: { color: COLORS.accent },
  errorText: { color: COLORS.danger, marginTop: 6, fontWeight: '600' },
  activeDriverCard: { backgroundColor: '#fff', borderRadius: 12, padding: 10, marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  callBtn: { backgroundColor: COLORS.accent, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  callBtnText: { color: '#fff', fontWeight: '800' },
});
