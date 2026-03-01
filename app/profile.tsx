import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';
import { useAuth } from '../src/context/AuthContext';
import { COLORS } from '../src/config/appConfig';
import { api } from '../src/services/api';
import { resolveImageUrl } from '../src/utils/images';

export default function ProfileScreen() {
  const { user, logout, refreshProfile } = useAuth();
  const router = useRouter();
  const [pendingImageUri, setPendingImageUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

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
    setPendingImageUri(result.assets[0].uri);
  };

  const saveProfileImage = async () => {
    if (!pendingImageUri || uploading) return;
    try {
      setUploading(true);
      await api.uploadProfileImage({
        uri: pendingImageUri,
        name: `profile-${Date.now()}.jpg`,
        type: 'image/jpeg',
      });
      await refreshProfile();
      setPendingImageUri(null);
    } finally {
      setUploading(false);
    }
  };

  const profileUri = pendingImageUri || resolveImageUrl(user?.profileImageUrl);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 16 }}>
      <View style={styles.card}>
        <Pressable onPress={pickProfileImage} style={styles.avatarWrap}>
          <Image source={profileUri ? { uri: profileUri } : require('../assets/images/mutton.jpg')} style={styles.avatar} />
          <Text style={styles.avatarText}>Change</Text>
        </Pressable>
        <Text style={styles.name}>{user?.fullName}</Text>
        <Text>{user?.email}</Text>
        <Text style={styles.role}>Role: {user?.role}</Text>
        {user?.role === 'DELIVERY_PARTNER' || user?.deliveryBadge ? <Text style={styles.badge}>Delivery Partner Approved</Text> : null}
        {pendingImageUri ? (
          <View style={styles.previewActions}>
            <Pressable style={styles.previewSave} onPress={saveProfileImage} disabled={uploading}>
              <Text style={styles.previewSaveText}>{uploading ? 'Uploading...' : 'Save Photo'}</Text>
            </Pressable>
            <Pressable style={styles.previewCancel} onPress={() => setPendingImageUri(null)} disabled={uploading}>
              <Text style={styles.previewCancelText}>Cancel</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
      {user?.role === 'ADMIN' ? (
        <>
          <Pressable style={styles.link} onPress={() => router.push('/admin/dashboard')}><Text>Admin Dashboard</Text></Pressable>
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

      <Pressable style={styles.logout} onPress={async () => { await logout(); router.replace('/auth/login'); }}>
        <Text style={{ color: '#fff', fontWeight: '800' }}>Logout</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginTop: 10, alignItems: 'center' },
  avatarWrap: { alignItems: 'center', marginBottom: 8 },
  avatar: { width: 84, height: 84, borderRadius: 42 },
  avatarText: { color: COLORS.accent, fontWeight: '700', marginTop: 6 },
  name: { fontSize: 20, fontWeight: '800' },
  role: { marginTop: 4, color: COLORS.muted },
  badge: { marginTop: 8, color: COLORS.success, fontWeight: '700' },
  previewActions: { marginTop: 10, width: '100%', alignItems: 'center' },
  previewSave: { backgroundColor: COLORS.accent, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14, minWidth: 120, alignItems: 'center' },
  previewSaveText: { color: '#fff', fontWeight: '800' },
  previewCancel: { marginTop: 8, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14, backgroundColor: '#f2f2f2' },
  previewCancelText: { color: COLORS.text, fontWeight: '700' },
  link: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginTop: 8 },
  logout: { marginTop: 20, backgroundColor: COLORS.danger, borderRadius: 12, padding: 12, alignItems: 'center' },
});
