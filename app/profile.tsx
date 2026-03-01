import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
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
  const [adminStats, setAdminStats] = useState<any>({});

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

  useEffect(() => {
    if (!isAdmin) return;
    api.adminDashboard().then(setAdminStats).catch(() => {});
  }, [isAdmin]);

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
            <Pressable style={styles.link} onPress={() => router.push('/admin/menu-scheduler')}><Text>Menu Scheduler</Text></Pressable>
            <Pressable style={styles.link} onPress={() => router.push('/admin/carousel-management')}><Text>Manage Carousel Images</Text></Pressable>
            <Pressable style={styles.link} onPress={() => router.push('/admin/orders-management')}><Text>Orders Management</Text></Pressable>
            <Pressable style={styles.link} onPress={() => router.push('/admin/users-list')}><Text>Users List</Text></Pressable>
            <Pressable style={styles.link} onPress={() => router.push('/admin/delivery-approvals')}><Text>Delivery Approvals</Text></Pressable>
            <Pressable style={styles.link} onPress={() => router.push('/admin/reports')}><Text>Reports</Text></Pressable>
          </>
        ) : (
          <>
            <Pressable style={styles.link} onPress={() => router.push('/order-history')}><Text>Order History</Text></Pressable>
            {user?.role === 'DELIVERY_PARTNER' || user?.deliveryBadge ? (
              <Pressable style={styles.link} onPress={() => router.push('/delivery/dashboard')}><Text>Delivery Dashboard</Text></Pressable>
            ) : (
              <Pressable style={styles.link} onPress={() => router.push('/delivery-partner-registration')}><Text>Become a Delivery Partner</Text></Pressable>
            )}
          </>
        )}

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
