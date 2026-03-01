import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { CartProvider } from '../src/context/CartContext';
import { NotificationProvider, useNotifications } from '../src/context/NotificationContext';
import { BUILD_NUMBER, COLORS, RELEASES_API_URL, RELEASES_LATEST_URL } from '../src/config/appConfig';
import { connectRealtime, disconnectRealtime } from '../src/services/realtime';

const extractRunNumber = (value?: string | null) => {
  if (!value) return null;
  const match = String(value).trim().replace(/^v/i, '').match(/(\d+)/);
  if (!match) return null;
  const parsed = parseInt(match[1], 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const UpdatePrompt = () => {
  const [visible, setVisible] = useState(false);
  const [latestTag, setLatestTag] = useState('');
  const currentRun = useMemo(() => extractRunNumber(BUILD_NUMBER), []);

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      try {
        const res = await fetch(RELEASES_API_URL, { headers: { Accept: 'application/vnd.github+json' } });
        if (!res.ok) return;
        const data = await res.json();
        const latest = extractRunNumber(data?.tag_name);
        if (!mounted || !latest || !currentRun) return;
        if (latest > currentRun) {
          setLatestTag(`v${latest}`);
          setVisible(true);
        }
      } catch {
        // silent
      }
    };
    check();
    return () => {
      mounted = false;
    };
  }, [currentRun]);

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={() => setVisible(false)}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>New update available</Text>
          <Text style={styles.subtitle}>A new version ({latestTag}) is available.</Text>
          <View style={styles.actions}>
            <Pressable style={[styles.btn, styles.light]} onPress={() => setVisible(false)}>
              <Text style={styles.lightText}>Later</Text>
            </Pressable>
            <Pressable style={[styles.btn, styles.dark]} onPress={() => Linking.openURL(RELEASES_LATEST_URL)}>
              <Text style={styles.darkText}>Download</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const AuthGate = ({ children }: { children: React.ReactNode }) => {
  const { user, token, ready } = useAuth();
  const { pushLocal } = useNotifications();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    const isAuth = segments[0] === 'auth' || segments[0] === 'splash';
    if (!token && !isAuth) {
      router.replace('/auth/login');
      return;
    }
    if (token && isAuth) {
      router.replace('/');
    }
  }, [ready, token, segments, router]);

  useEffect(() => {
    if (!token || !user) return;
    const topics = [`/topic/notifications/user/${user.userId || user.id}`];
    if (user.role === 'ADMIN') topics.push('/topic/notifications/admin');
    if (user.role === 'DELIVERY_PARTNER') topics.push('/topic/notifications/delivery');

    connectRealtime(
      token,
      topics.map((topic) => ({
        topic,
        onMessage: async (payload) => {
          await pushLocal(payload?.title || 'Krishva\'s Kitchen', payload?.message || 'New update');
        },
      }))
    );

    return () => disconnectRealtime();
  }, [token, user, pushLocal]);

  return <>{children}</>;
};

export default function RootLayout() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <CartProvider>
          <AuthGate>
            <UpdatePrompt />
            <Stack screenOptions={{ headerShown: false }} initialRouteName="splash">
              <Stack.Screen name="splash" />
              <Stack.Screen name="index" />
              <Stack.Screen name="home" />
              <Stack.Screen name="item-details" />
              <Stack.Screen name="cart" />
              <Stack.Screen name="checkout" />
              <Stack.Screen name="payment" />
              <Stack.Screen name="order-tracking" />
              <Stack.Screen name="order-history" />
              <Stack.Screen name="profile" />
              <Stack.Screen name="delivery-partner-registration" />
              <Stack.Screen name="notifications" />
              <Stack.Screen name="auth/login" />
              <Stack.Screen name="auth/signup" />
              <Stack.Screen name="admin/login" />
              <Stack.Screen name="admin/dashboard" />
              <Stack.Screen name="admin/menu-scheduler" />
              <Stack.Screen name="admin/orders-management" />
              <Stack.Screen name="admin/users-list" />
              <Stack.Screen name="admin/delivery-approvals" />
              <Stack.Screen name="admin/reports" />
              <Stack.Screen name="delivery/dashboard" />
              <Stack.Screen name="delivery/deliveries" />
              <Stack.Screen name="delivery/map-view" />
              <Stack.Screen name="delivery/earnings" />
            </Stack>
          </AuthGate>
        </CartProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.45)', padding: 24 },
  card: { width: '100%', backgroundColor: COLORS.card, borderRadius: 18, padding: 20, maxWidth: 380 },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  subtitle: { marginTop: 6, color: COLORS.muted, marginBottom: 16 },
  actions: { flexDirection: 'row', gap: 12 },
  btn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  light: { backgroundColor: '#ECECEC' },
  dark: { backgroundColor: COLORS.accent },
  lightText: { color: COLORS.text, fontWeight: '700' },
  darkText: { color: '#fff', fontWeight: '700' },
});
