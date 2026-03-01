import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../../src/services/api';
import { COLORS } from '../../src/config/appConfig';

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>({});
  const router = useRouter();

  useEffect(() => {
    api.adminDashboard().then(setStats).catch(() => {});
  }, []);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>Admin Dashboard</Text>
      <View style={styles.row}>
        <View style={styles.card}><Text style={styles.value}>{stats.totalOrders || 0}</Text><Text>Orders</Text></View>
        <View style={styles.card}><Text style={styles.value}>{stats.totalUsers || 0}</Text><Text>Users</Text></View>
      </View>
      <View style={styles.cardWide}><Text style={styles.value}>{stats.pendingDeliveryPartners || 0}</Text><Text>Pending Delivery Partners</Text></View>

      <Pressable style={styles.nav} onPress={() => router.push('/admin/menu-scheduler')}><Text>Menu Scheduler</Text></Pressable>
      <Pressable style={styles.nav} onPress={() => router.push('/admin/orders-management')}><Text>Orders Management</Text></Pressable>
      <Pressable style={styles.nav} onPress={() => router.push('/admin/users-list')}><Text>Users List</Text></Pressable>
      <Pressable style={styles.nav} onPress={() => router.push('/admin/delivery-approvals')}><Text>Delivery Approvals</Text></Pressable>
      <Pressable style={styles.nav} onPress={() => router.push('/admin/reports')}><Text>Reports</Text></Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  title: { fontSize: 24, fontWeight: '900' },
  row: { flexDirection: 'row', gap: 10, marginTop: 12 },
  card: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12 },
  cardWide: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginTop: 10 },
  value: { fontSize: 28, fontWeight: '900', color: COLORS.accent },
  nav: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginTop: 8 },
});
