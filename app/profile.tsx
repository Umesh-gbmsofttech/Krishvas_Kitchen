import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../src/context/AuthContext';
import { COLORS } from '../src/config/appConfig';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>Profile</Text>
      <View style={styles.card}>
        <Text style={styles.name}>{user?.fullName}</Text>
        <Text>{user?.email}</Text>
        <Text style={styles.role}>Role: {user?.role}</Text>
        {user?.role === 'DELIVERY_PARTNER' || user?.deliveryBadge ? <Text style={styles.badge}>Delivery Partner Approved</Text> : null}
      </View>

      <Pressable style={styles.link} onPress={() => router.push('/order-history')}><Text>Order History</Text></Pressable>
      <Pressable style={styles.link} onPress={() => router.push('/delivery-partner-registration')}><Text>Become a Delivery Partner</Text></Pressable>
      <Pressable style={styles.link} onPress={() => router.push('/home')}><Text>Back to Home</Text></Pressable>

      <Pressable style={styles.logout} onPress={async () => { await logout(); router.replace('/auth/login'); }}>
        <Text style={{ color: '#fff', fontWeight: '800' }}>Logout</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  title: { fontSize: 24, fontWeight: '900' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginTop: 10 },
  name: { fontSize: 20, fontWeight: '800' },
  role: { marginTop: 4, color: COLORS.muted },
  badge: { marginTop: 8, color: COLORS.success, fontWeight: '700' },
  link: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginTop: 8 },
  logout: { marginTop: 20, backgroundColor: COLORS.danger, borderRadius: 12, padding: 12, alignItems: 'center' },
});
