import { Stack, usePathname, useRouter, useSegments } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Image, Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { CartProvider } from '../src/context/CartContext';
import { NotificationProvider, useNotifications } from '../src/context/NotificationContext';
import { BUILD_NUMBER, COLORS, RELEASES_API_URL, RELEASES_LATEST_URL } from '../src/config/appConfig';
import { connectRealtime, disconnectRealtime } from '../src/services/realtime';
import { resolveImageUrl } from '../src/utils/images';

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
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    const route = segments[0];
    const isAuth = route === 'auth' || route === 'splash';
    const isPublicGuestRoute = route === 'home' || route === 'item-details' || route === 'todays-menu' || route === 'search';
    if (!token && !isAuth && !isPublicGuestRoute && pathname !== '/auth/login') {
      router.replace('/auth/login');
      return;
    }
    if (token && isAuth) {
      if (user?.role === 'ADMIN' && pathname !== '/admin/dashboard') {
        router.replace('/admin/dashboard');
        return;
      }
      if (user?.role === 'DELIVERY_PARTNER' && pathname !== '/delivery/dashboard') {
        router.replace('/delivery/dashboard');
        return;
      }
      if (pathname !== '/home') {
        router.replace('/home');
      }
    }
  }, [ready, token, segments, pathname, router, user]);

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

const APP_ROUTES_WITH_SHELL = new Set([
  '/home',
  '/orders',
  '/todays-menu',
  '/order-history',
  '/order-tracking',
  '/profile',
  '/cart',
  '/checkout',
  '/payment',
  '/item-details',
  '/notifications',
  '/delivery-partner-registration',
  '/admin/dashboard',
  '/admin/menu-scheduler',
  '/admin/carousel-management',
  '/admin/orders-management',
  '/admin/users-list',
  '/admin/delivery-approvals',
  '/admin/reports',
  '/delivery/dashboard',
  '/delivery/deliveries',
  '/delivery/map-view',
  '/delivery/earnings',
  '/search',
]);

const routeTitle = (pathname: string) => {
  if (pathname === '/home') return "Krishva's Kitchen";
  if (pathname === '/todays-menu') return "Today's Menu";
  if (pathname === '/orders' || pathname === '/order-history') return 'Orders';
  if (pathname === '/profile') return 'Profile';
  if (pathname === '/notifications') return 'Notifications';
  if (pathname.startsWith('/admin/')) return 'Admin Panel';
  if (pathname.startsWith('/delivery/')) return 'Delivery Partner';
  if (pathname === '/search') return 'Search';
  return 'Krishva';
};

const AppShell = ({ children }: { children: React.ReactNode }) => {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  const showShell = APP_ROUTES_WITH_SHELL.has(pathname || '');
  const profileUri = resolveImageUrl(user?.profileImageUrl);
  const topHeight = insets.top + 56;
  const bottomHeight = insets.bottom + 62;

  return (
    <View style={styles.shellContainer}>
      <View style={{ flex: 1, paddingTop: showShell ? topHeight : 0, paddingBottom: showShell ? bottomHeight : 0 }}>{children}</View>

      {showShell ? (
        <View style={[styles.headerBar, { paddingTop: insets.top }]}>
          <Pressable style={styles.headerIcon} onPress={() => router.push('/search')}>
            <Text style={styles.headerIconText}>Search</Text>
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>{routeTitle(pathname || '')}</Text>
          <Pressable style={styles.headerIcon} onPress={() => router.push('/profile')}>
            <Image source={profileUri ? { uri: profileUri } : require('../assets/images/mutton.jpg')} style={styles.headerAvatar} />
          </Pressable>
        </View>
      ) : null}

      {showShell ? (
        <View style={[styles.bottomNav, { paddingBottom: insets.bottom }]}>
          <Pressable style={styles.navItem} onPress={() => router.push('/home')}>
            <Text style={[styles.navText, pathname === '/home' && styles.navTextActive]}>Home</Text>
          </Pressable>
          <Pressable style={styles.navItem} onPress={() => router.push('/todays-menu')}>
            <Text style={[styles.navText, pathname === '/todays-menu' && styles.navTextActive]}>Today</Text>
          </Pressable>
          <Pressable style={styles.navItem} onPress={() => router.push('/orders')}>
            <Text style={[styles.navText, (pathname === '/orders' || pathname === '/order-history') && styles.navTextActive]}>Orders</Text>
          </Pressable>
          <Pressable style={styles.navItem} onPress={() => router.push('/profile')}>
            <Text style={[styles.navText, pathname === '/profile' && styles.navTextActive]}>Profile</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
};

export default function RootLayout() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <CartProvider>
          <AuthGate>
            <StatusBar style="light" backgroundColor={COLORS.accent} translucent={false} />
            <AppShell>
              <UpdatePrompt />
              <Stack screenOptions={{ headerShown: false }} initialRouteName="splash">
                <Stack.Screen name="splash" />
                <Stack.Screen name="index" />
                <Stack.Screen name="home" />
                <Stack.Screen name="todays-menu" />
                <Stack.Screen name="orders" />
                <Stack.Screen name="search" />
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
                <Stack.Screen name="admin/carousel-management" />
                <Stack.Screen name="admin/orders-management" />
                <Stack.Screen name="admin/users-list" />
                <Stack.Screen name="admin/delivery-approvals" />
                <Stack.Screen name="admin/reports" />
                <Stack.Screen name="delivery/dashboard" />
                <Stack.Screen name="delivery/deliveries" />
                <Stack.Screen name="delivery/map-view" />
                <Stack.Screen name="delivery/earnings" />
              </Stack>
            </AppShell>
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
  shellContainer: { flex: 1, backgroundColor: COLORS.bg },
  headerBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: COLORS.accent,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  headerIcon: {
    width: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  headerTitle: { color: '#fff', fontWeight: '800', fontSize: 18, maxWidth: '55%', textAlign: 'center' },
  headerAvatar: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, borderColor: '#fff' },
  bottomNav: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  navItem: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 12 },
  navText: { color: COLORS.muted, fontWeight: '700' },
  navTextActive: { color: COLORS.accent },
});
