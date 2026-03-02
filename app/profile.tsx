import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Animated, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import { COLORS } from '../src/config/appConfig';
import { api } from '../src/services/api';
import { resolveImageUrl } from '../src/utils/images';
import { AnimatedLogoutButton } from '../src/components/AnimatedLogoutButton';
import { AppTextInput as TextInput } from '../src/components/AppTextInput';

export default function ProfileScreen() {
  const { user, logout, refreshProfile } = useAuth();
  const router = useRouter();

  const isAdmin = user?.role === 'ADMIN';
  const isDeliveryPartner = user?.role === 'DELIVERY_PARTNER' || user?.deliveryBadge;
  const [adminStats, setAdminStats] = useState<any>({});
  const [deliveryData, setDeliveryData] = useState<any>({});

  const [editVisible, setEditVisible] = useState(false);
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const goOrdersAnim = useRef(new Animated.Value(1)).current;

  const openEdit = () => {
    setError('');
    setFullName(user?.fullName || '');
    setPhone(user?.phone || '');
    setSelectedImageUri(null);
    setEditVisible(true);
  };

  const pickProfileImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;
    setSelectedImageUri(result.assets[0].uri);
  };

  const hasChanges = useMemo(() => {
    const nameChanged = (fullName || '').trim() !== (user?.fullName || '').trim();
    const phoneChanged = (phone || '').trim() !== (user?.phone || '').trim();
    const imageChanged = !!selectedImageUri;
    return nameChanged || phoneChanged || imageChanged;
  }, [fullName, phone, selectedImageUri, user?.fullName, user?.phone]);

  const saveProfile = async () => {
    if (!hasChanges || saving) return;
    setError('');
    setSaving(true);
    try {
      if (selectedImageUri) {
        await api.uploadProfileImage({
          uri: selectedImageUri,
          name: `profile-${Date.now()}.jpg`,
          type: 'image/jpeg',
        });
      }

      await api.updateProfile({ fullName: fullName.trim(), phone: phone.trim() });
      await refreshProfile();
      setEditVisible(false);
      setSelectedImageUri(null);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Unable to save profile');
    } finally {
      setSaving(false);
    }
  };

  const profileUri = resolveImageUrl(user?.profileImageUrl);
  const previewUri = selectedImageUri || profileUri;
  const adminActions = [
    { label: 'Menu Scheduler', icon: 'calendar-outline' as const, route: '/admin/menu-scheduler' },
    { label: 'Carousel Images', icon: 'images-outline' as const, route: '/admin/carousel-management' },
    { label: 'Orders', icon: 'receipt-outline' as const, route: '/admin/orders-management' },
    { label: 'Users', icon: 'people-outline' as const, route: '/admin/users-list' },
    { label: 'Approvals', icon: 'checkmark-done-outline' as const, route: '/admin/delivery-approvals' },
    { label: 'Reports', icon: 'bar-chart-outline' as const, route: '/admin/reports' },
  ];

  useEffect(() => {
    if (!isAdmin) return;
    api.adminDashboard().then(setAdminStats).catch(() => {});
  }, [isAdmin]);

  useEffect(() => {
    if (!isDeliveryPartner) return;
    api.deliveryDashboard().then(setDeliveryData).catch(() => {});
  }, [isDeliveryPartner]);

  const activeAssignedOrdersCount = useMemo(
    () =>
      (deliveryData.deliveries || []).filter((o: any) =>
        ['PLACED', 'CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY'].includes(String(o?.status || ''))
      ).length,
    [deliveryData.deliveries]
  );

  useEffect(() => {
    if (!isDeliveryPartner || activeAssignedOrdersCount <= 0) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(goOrdersAnim, { toValue: 1.06, duration: 550, useNativeDriver: true }),
        Animated.timing(goOrdersAnim, { toValue: 1, duration: 550, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => {
      loop.stop();
      goOrdersAnim.setValue(1);
    };
  }, [isDeliveryPartner, activeAssignedOrdersCount, goOrdersAnim]);

  return (
    <>
      <ScrollView style={styles.screen} contentContainerStyle={{ padding: 16 }}>
        <View style={styles.card}>
          <Image source={profileUri ? { uri: profileUri } : require('../assets/images/mutton.jpg')} style={styles.avatar} />
          <Text style={styles.name}>{user?.fullName}</Text>
          <Text>{user?.email}</Text>
          <Text style={styles.role}>Role: {user?.role}</Text>
          {user?.role === 'DELIVERY_PARTNER' || user?.deliveryBadge ? <Text style={styles.badge}>Delivery Partner Approved</Text> : null}

          {!isAdmin ? (
            <Pressable style={styles.editBtn} onPress={openEdit}>
              <Text style={styles.editBtnText}>Edit Profile</Text>
            </Pressable>
          ) : null}
        </View>

        {isAdmin ? (
          <>
            <View style={styles.row}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{adminStats.totalOrders || 0}</Text>
                <Text>Orders</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{adminStats.totalUsers || 0}</Text>
                <Text>Users</Text>
              </View>
            </View>
            <View style={styles.statWideCard}>
              <Text style={styles.statValue}>{adminStats.pendingDeliveryPartners || 0}</Text>
              <Text>Pending Delivery Partners</Text>
            </View>
            <View style={styles.adminGrid}>
              {adminActions.map((action) => (
                <Pressable key={action.route} style={styles.adminActionCard} onPress={() => router.push(action.route as any)}>
                  <View style={styles.adminActionIconWrap}>
                    <Ionicons name={action.icon} size={20} color={COLORS.accent} />
                  </View>
                  <Text style={styles.adminActionText}>{action.label}</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : (
          <>
            <Pressable style={styles.link} onPress={() => router.push('/order-history')}><Text>Order History</Text></Pressable>
            {!isDeliveryPartner ? (
              <Pressable style={styles.link} onPress={() => router.push('/delivery-partner-registration')}><Text>Become a Delivery Partner</Text></Pressable>
            ) : null}
          </>
        )}

        {isDeliveryPartner ? (
          <>
            <View style={styles.row}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{deliveryData.todayDeliveries || 0}</Text>
                <Text>Today</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{deliveryData.last7DaysDeliveries || 0}</Text>
                <Text>Last 7 Days</Text>
              </View>
            </View>
            <View style={styles.row}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{Number(deliveryData.distanceKm || 0).toFixed(1)}</Text>
                <Text>KM</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>Rs {Number(deliveryData.estimatedEarnings || 0).toFixed(0)}</Text>
                <Text>Earnings</Text>
              </View>
            </View>
            {activeAssignedOrdersCount > 0 ? (
              <View style={styles.orderCard}>
                <Text style={styles.orderAvailableHeading}>Order Available</Text>
                <Text style={styles.mutedCentered}>New assigned orders: {activeAssignedOrdersCount}</Text>
                <Animated.View style={{ transform: [{ scale: goOrdersAnim }] }}>
                  <Pressable style={styles.mapBtn} onPress={() => router.push('/orders')}>
                    <Text style={styles.mapBtnTxt}>Go to Orders</Text>
                  </Pressable>
                </Animated.View>
              </View>
            ) : null}
          </>
        ) : null}

        <Pressable style={styles.link} onPress={() => router.push('/home')}><Text>Back to Home</Text></Pressable>

        <AnimatedLogoutButton onPress={() => setLogoutVisible(true)} />
      </ScrollView>

      <Modal visible={editVisible} transparent animationType="fade" onRequestClose={() => setEditVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <Pressable onPress={pickProfileImage} style={styles.imagePicker}>
              <Image source={previewUri ? { uri: previewUri } : require('../assets/images/mutton.jpg')} style={styles.previewImage} />
              <Text style={styles.imagePickerText}>{selectedImageUri ? 'Change selected image' : 'Select profile image'}</Text>
            </Pressable>
            <TextInput value={fullName} onChangeText={setFullName} placeholder="Full Name" style={styles.input} />
            <TextInput value={phone} onChangeText={setPhone} placeholder="Phone" keyboardType="phone-pad" style={styles.input} />
            {!!error ? <Text style={styles.error}>{error}</Text> : null}
            <View style={styles.modalRow}>
              <Pressable style={styles.cancelBtn} onPress={() => setEditVisible(false)} disabled={saving}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.saveBtn, (!hasChanges || saving) && styles.saveBtnDisabled]} onPress={saveProfile} disabled={!hasChanges || saving}>
                <Text style={styles.saveText}>{saving ? 'Saving...' : 'Save'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={logoutVisible} transparent animationType="fade" onRequestClose={() => setLogoutVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Confirm Logout</Text>
            <Text style={styles.confirmText}>Are you sure you want to logout?</Text>
            <View style={styles.modalRow}>
              <Pressable style={styles.cancelBtn} onPress={() => setLogoutVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.saveBtn}
                onPress={async () => {
                  setLogoutVisible(false);
                  await logout();
                  router.replace('/auth/login');
                }}
              >
                <Text style={styles.saveText}>Confirm</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginTop: 10, alignItems: 'center' },
  avatar: { width: 84, height: 84, borderRadius: 42 },
  name: { fontSize: 20, fontWeight: '800', marginTop: 8 },
  role: { marginTop: 4, color: COLORS.muted },
  badge: { marginTop: 8, color: COLORS.success, fontWeight: '700' },
  editBtn: { marginTop: 12, backgroundColor: COLORS.accent, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  editBtnText: { color: '#fff', fontWeight: '800' },
  row: { flexDirection: 'row', gap: 10, marginTop: 8 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12 },
  statWideCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginTop: 8 },
  statValue: { fontSize: 26, fontWeight: '900', color: COLORS.accent },
  link: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginTop: 8 },
  adminGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  adminActionCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  adminActionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accentSoft,
    marginBottom: 6,
  },
  adminActionText: { color: COLORS.text, fontWeight: '700', textAlign: 'center', fontSize: 12 },
  orderCard: { backgroundColor: '#fff', borderRadius: 12, padding: 10, marginTop: 8 },
  orderAvailableHeading: { textAlign: 'center', fontWeight: '900', fontSize: 18, color: COLORS.text },
  mapBtn: { marginTop: 8, backgroundColor: COLORS.card, borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  mapBtnTxt: { color: COLORS.text, fontWeight: '700' },
  mutedCentered: { marginTop: 4, color: COLORS.muted, textAlign: 'center' },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 18,
  },
  modalCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14 },
  modalTitle: { fontSize: 20, fontWeight: '900', textAlign: 'center', marginBottom: 10 },
  imagePicker: { alignItems: 'center', marginBottom: 10 },
  previewImage: { width: 90, height: 90, borderRadius: 45 },
  imagePickerText: { marginTop: 6, color: COLORS.accent, fontWeight: '700' },
  input: { backgroundColor: '#f9f9f9', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8 },
  error: { color: COLORS.danger, marginBottom: 8 },
  modalRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, borderRadius: 10, backgroundColor: '#efefef', paddingVertical: 10, alignItems: 'center' },
  cancelText: { color: COLORS.text, fontWeight: '700' },
  saveBtn: { flex: 1, borderRadius: 10, backgroundColor: COLORS.accent, paddingVertical: 10, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.45 },
  saveText: { color: '#fff', fontWeight: '800' },
  confirmText: { color: COLORS.muted, textAlign: 'center', marginBottom: 12 },
});
