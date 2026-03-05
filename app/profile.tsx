import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import { COLORS, CURRENCY_SYMBOL } from '../src/config/appConfig';
import { api } from '../src/services/api';
import { resolveImageUrl } from '../src/utils/images';
import { AnimatedLogoutButton } from '../src/components/AnimatedLogoutButton';
import { AppTextInput as TextInput } from '../src/components/AppTextInput';

export default function ProfileScreen() {
  const { user, logout, refreshProfile } = useAuth();
  const router = useRouter();

  const isAdmin = user?.role === 'ADMIN';
  const isDeliveryPartnerApproved = user?.role === 'DELIVERY_PARTNER' || user?.deliveryBadge;
  const isDeliveryModeActive = Boolean(user?.deliveryModeActive ?? true);
  const [adminStats, setAdminStats] = useState<any>({});
  const [adminSettings, setAdminSettings] = useState<{ kitchenActive: boolean; darkMode: boolean }>({
    kitchenActive: true,
    darkMode: false,
  });
  const [updatingAdminSettings, setUpdatingAdminSettings] = useState(false);
  const [updatingDeliveryMode, setUpdatingDeliveryMode] = useState(false);

  const [editVisible, setEditVisible] = useState(false);
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);

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
  const adminQuickActions = [
    { label: 'Manage Menu', icon: 'restaurant-outline' as const, route: '/admin/menu-scheduler' },
    { label: 'Driver (Delivery partner)', icon: 'bicycle-outline' as const, route: '/admin/delivery-approvals' },
    { label: 'View Orders', icon: 'receipt-outline' as const, route: '/admin/orders-management' },
    { label: 'Users', icon: 'people-outline' as const, route: '/admin/users-list' },
    { label: 'Manage Carousel', icon: 'images-outline' as const, route: '/admin/carousel-management' },
    { label: 'Reports', icon: 'bar-chart-outline' as const, route: '/admin/reports' },
  ];

  useEffect(() => {
    if (!isAdmin) return;
    api.adminDashboard().then(setAdminStats).catch(() => {});
    api.adminSettings().then((s) => {
      setAdminSettings({
        kitchenActive: Boolean(s?.kitchenActive),
        darkMode: Boolean(s?.darkMode),
      });
    }).catch(() => {});
  }, [isAdmin]);

  const toggleDeliveryMode = async () => {
    if (!isDeliveryPartnerApproved || updatingDeliveryMode) return;
    try {
      setUpdatingDeliveryMode(true);
      await api.updateDeliveryMode(!isDeliveryModeActive);
      await refreshProfile();
    } finally {
      setUpdatingDeliveryMode(false);
    }
  };

  const updateAdminSettings = async (patch: Partial<{ kitchenActive: boolean; darkMode: boolean }>) => {
    if (updatingAdminSettings) return;
    const previous = adminSettings;
    const optimistic = { ...adminSettings, ...patch };
    setAdminSettings(optimistic);
    try {
      setUpdatingAdminSettings(true);
      const saved = await api.updateAdminSettings(patch);
      setAdminSettings({
        kitchenActive: Boolean(saved?.kitchenActive),
        darkMode: Boolean(saved?.darkMode),
      });
      const dashboard = await api.adminDashboard();
      setAdminStats(dashboard || {});
    } catch {
      setAdminSettings(previous);
    } finally {
      setUpdatingAdminSettings(false);
    }
  };

  return (
    <>
      <ScrollView style={styles.screen} contentContainerStyle={{ padding: 16 }}>
        <View style={styles.card}>
          <Image source={profileUri ? { uri: profileUri } : require('../assets/images/mutton.jpg')} style={styles.avatar} />
          <Text style={styles.name}>{user?.fullName}</Text>
          <Text>{user?.email}</Text>
          <Text style={styles.role}>Role: {user?.role}</Text>
          {isDeliveryPartnerApproved ? <Text style={styles.badge}>Delivery Partner Approved</Text> : null}
          {isDeliveryPartnerApproved ? (
            <View style={styles.modeRow}>
              <Text style={styles.modeLabel}>Customer</Text>
              <Pressable
                style={[styles.togglePill, isDeliveryModeActive && styles.togglePillActive]}
                onPress={toggleDeliveryMode}
                disabled={updatingDeliveryMode}
              >
                <View style={[styles.toggleKnob, isDeliveryModeActive && styles.toggleKnobActive]} />
              </Pressable>
              <Text style={styles.modeLabel}>Delivery Partner</Text>
            </View>
          ) : null}

          {!isAdmin ? (
            <Pressable style={styles.editBtn} onPress={openEdit}>
              <Text style={styles.editBtnText}>Edit Profile</Text>
            </Pressable>
          ) : null}
        </View>

        {isAdmin ? (
          <>
            <View style={styles.infoCard}>
              <Text style={styles.infoCardTitle}>Kitchen Status</Text>
              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <Ionicons name="storefront-outline" size={18} color={COLORS.muted} />
                  <View>
                    <Text style={styles.settingTitle}>{adminSettings.kitchenActive ? 'Active - Accepting Orders' : 'Inactive - Not Accepting Orders'}</Text>
                  </View>
                </View>
                <Pressable
                  style={[styles.togglePill, adminSettings.kitchenActive && styles.togglePillActive]}
                  onPress={() => updateAdminSettings({ kitchenActive: !adminSettings.kitchenActive })}
                  disabled={updatingAdminSettings}
                >
                  <View style={[styles.toggleKnob, adminSettings.kitchenActive && styles.toggleKnobActive]} />
                </Pressable>
              </View>
            </View>
            <View style={styles.row}>
              <Pressable style={styles.statCard} onPress={() => router.push('/admin/reports')}>
                <Text style={styles.statLabel}>Today Earnings</Text>
                <Text style={styles.statValue}>{CURRENCY_SYMBOL}{Number(adminStats.todayEarnings || 0).toFixed(2)}</Text>
              </Pressable>
              <Pressable style={styles.statCard} onPress={() => router.push('/admin/orders-management')}>
                <Text style={styles.statLabel}>Total Orders</Text>
                <Text style={styles.statValue}>{adminStats.totalOrders || 0}</Text>
              </Pressable>
            </View>
            <View style={styles.quickSection}>
              <Text style={styles.infoCardTitle}>Quick Actions</Text>
              <View style={styles.adminGrid}>
                {adminQuickActions.map((action) => (
                  <Pressable key={action.route} style={styles.adminActionCard} onPress={() => router.push(action.route as any)}>
                    <View style={styles.adminActionIconWrap}>
                      <Ionicons name={action.icon} size={22} color={COLORS.accent} />
                    </View>
                    <Text style={styles.adminActionText}>{action.label}</Text>
                  </Pressable>
                ))}
                <View style={styles.adminActionCard}>
                  <View style={styles.adminActionIconWrap}>
                    <Ionicons name="person-outline" size={22} color={COLORS.accent} />
                  </View>
                  <Text style={styles.adminActionText}>Active Drivers: {adminStats.activeDrivers || 0}</Text>
                </View>
              </View>
            </View>
            <View style={styles.infoCard}>
              <Text style={styles.infoCardTitle}>Settings</Text>
              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <Ionicons name="moon-outline" size={18} color={COLORS.muted} />
                  <View>
                    <Text style={styles.settingTitle}>Dark Mode</Text>
                  </View>
                </View>
                <Pressable
                  style={[styles.togglePill, adminSettings.darkMode && styles.togglePillActive]}
                  onPress={() => updateAdminSettings({ darkMode: !adminSettings.darkMode })}
                  disabled={updatingAdminSettings}
                >
                  <View style={[styles.toggleKnob, adminSettings.darkMode && styles.toggleKnobActive]} />
                </Pressable>
              </View>
            </View>
          </>
        ) : (
          <>
            <View style={styles.infoCard}>
              <Text style={styles.infoCardTitle}>Account Information</Text>
              <View style={styles.infoRow}>
                <Ionicons name="mail-outline" size={18} color={COLORS.muted} />
                <View style={styles.infoRowTextWrap}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={styles.infoValue}>{user?.email || '-'}</Text>
                </View>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Ionicons name="call-outline" size={18} color={COLORS.muted} />
                <View style={styles.infoRowTextWrap}>
                  <Text style={styles.infoLabel}>Phone</Text>
                  <Text style={styles.infoValue}>{user?.phone || '-'}</Text>
                </View>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={18} color={COLORS.muted} />
                <View style={styles.infoRowTextWrap}>
                  <Text style={styles.infoLabel}>Address</Text>
                  <Text style={styles.infoValue}>{user?.addressLine || 'Address not added'}</Text>
                </View>
              </View>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.infoCardTitle}>Settings</Text>
              <Pressable style={styles.settingRow} onPress={() => router.push('/notifications')}>
                <View style={styles.settingLeft}>
                  <Ionicons name="notifications-outline" size={18} color={COLORS.muted} />
                  <View>
                    <Text style={styles.settingTitle}>Notifications</Text>
                    <Text style={styles.settingSubtitle}>Manage notification preferences</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color={COLORS.muted} />
              </Pressable>
              <View style={styles.infoDivider} />
              <Pressable style={styles.settingRow} onPress={() => router.push('/order-history')}>
                <View style={styles.settingLeft}>
                  <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.muted} />
                  <View>
                    <Text style={styles.settingTitle}>Privacy</Text>
                    <Text style={styles.settingSubtitle}>Privacy and security settings</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color={COLORS.muted} />
              </Pressable>
              <View style={styles.infoDivider} />
              <Pressable style={styles.settingRow} onPress={() => router.push('/home')}>
                <View style={styles.settingLeft}>
                  <Ionicons name="help-circle-outline" size={18} color={COLORS.muted} />
                  <View>
                    <Text style={styles.settingTitle}>Help & Support</Text>
                    <Text style={styles.settingSubtitle}>Get help or contact us</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color={COLORS.muted} />
              </Pressable>
            </View>
          </>
        )}

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
  modeRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  modeLabel: { color: COLORS.text, fontWeight: '700', fontSize: 12 },
  editBtn: { marginTop: 12, backgroundColor: COLORS.accent, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  editBtnText: { color: '#fff', fontWeight: '800' },
  row: { flexDirection: 'row', gap: 10, marginTop: 8 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#EFEFEF' },
  statLabel: { color: COLORS.text, fontWeight: '700', marginBottom: 4 },
  statValue: { fontSize: 26, fontWeight: '900', color: COLORS.accent },
  quickSection: { marginTop: 10 },
  adminGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 10, columnGap: 10, justifyContent: 'space-between', marginTop: 8 },
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
  infoCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginTop: 10 },
  infoCardTitle: { fontWeight: '800', color: COLORS.text, marginBottom: 8, fontSize: 18 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  infoRowTextWrap: { flex: 1 },
  infoLabel: { color: COLORS.text, fontWeight: '700' },
  infoValue: { color: COLORS.muted, marginTop: 1 },
  infoDivider: { height: 1, backgroundColor: '#EFEFEF', marginVertical: 6 },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  settingTitle: { color: COLORS.text, fontWeight: '700' },
  settingSubtitle: { color: COLORS.muted, marginTop: 1, fontSize: 12 },
  togglePill: {
    width: 42,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  togglePillActive: {
    backgroundColor: COLORS.accentSoft,
  },
  toggleKnob: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#8A8A8A',
  },
  toggleKnobActive: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.accent,
  },

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
