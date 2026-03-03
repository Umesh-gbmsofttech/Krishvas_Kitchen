import { Stack, usePathname, useRouter, useSegments } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Animated, AppState, Image, Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { CartProvider, useCart } from '../src/context/CartContext';
import { NotificationProvider, useNotifications } from '../src/context/NotificationContext';
import { APP_NAME, BUILD_NUMBER, COLORS, RELEASES_API_URL, RELEASES_LATEST_URL } from '../src/config/appConfig';
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
  const currentRun = useMemo(() => {
    const fromNativeBuild = extractRunNumber(String(Constants.nativeBuildVersion || ''));
    const fromNativeVersion = extractRunNumber(String(Constants.nativeApplicationVersion || ''));
    const fromExtraBuild = extractRunNumber(BUILD_NUMBER);
    return fromNativeBuild ?? fromNativeVersion ?? fromExtraBuild;
  }, []);

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      try {
        const res = await fetch(RELEASES_API_URL, { headers: { Accept: 'application/vnd.github+json' } });
        if (!res.ok) return;
        const data = await res.json();
        const releaseText = `${data?.name || ''} ${data?.tag_name || ''}`.toLowerCase();
        if (!releaseText.includes(APP_NAME.toLowerCase())) return;
        const latest = extractRunNumber(data?.tag_name) ?? extractRunNumber(data?.name);
        if (!mounted || !latest || !currentRun) return;
        if (latest > currentRun) {
          const latestLabel = String(data?.tag_name || data?.name || `v${latest}`).trim();
          setLatestTag(latestLabel);
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

const AuthGate = ({ children }: { children: ReactNode }) => {
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
      if (user?.role === 'ADMIN' && pathname !== '/profile') {
        router.replace('/profile');
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
  if (pathname === '/cart') return 'Cart';
  if (pathname === '/checkout') return 'Checkout';
  if (pathname === '/payment') return 'Payment';
  if (pathname === '/item-details') return 'Weekend Specials';
  if (pathname === '/todays-menu') return "Today's Menu";
  if (pathname === '/orders' || pathname === '/order-history') return 'Orders';
  if (pathname === '/order-tracking') return 'Order Tracking';
  if (pathname === '/profile') return 'Profile';
  if (pathname === '/notifications') return 'Notifications';
  if (pathname === '/admin/menu-scheduler') return 'Menu Scheduler';
  if (pathname === '/admin/carousel-management') return 'Manage Carousel Images';
  if (pathname === '/admin/orders-management') return 'Orders Management';
  if (pathname === '/admin/users-list') return 'Users List';
  if (pathname === '/admin/delivery-approvals') return 'Delivery Approvals';
  if (pathname === '/admin/reports') return 'Reports';
  if (pathname === '/delivery/dashboard') return 'Delivery Dashboard';
  if (pathname === '/delivery/deliveries') return 'Delivery List';
  if (pathname === '/delivery/map-view') return 'Map View';
  if (pathname === '/delivery/earnings') return 'Earnings';
  if (pathname === '/search') return 'Search';
  return 'Krishva';
};

const AppShell = ({ children }: { children: ReactNode }) => {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { items } = useCart();

  const showShell = APP_ROUTES_WITH_SHELL.has(pathname || '');
  const headerBottomGap = 12;
  const profileUri = resolveImageUrl(user?.profileImageUrl);
  const cartCount = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);
  const cartScale = useRef(new Animated.Value(1)).current;
  const topHeight = insets.top + 50 + headerBottomGap;
  const bottomHeight = insets.bottom + 62;

  useEffect(() => {
    if (!showShell) return;
    Animated.sequence([
      Animated.timing(cartScale, { toValue: 1.18, duration: 120, useNativeDriver: true }),
      Animated.timing(cartScale, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
  }, [cartCount, cartScale, showShell]);

  return (
    <View style={styles.shellContainer}>
      <View style={{ flex: 1, paddingTop: showShell ? topHeight : 0, paddingBottom: showShell ? bottomHeight : 0 }}>{children}</View>

      {showShell ? (
        <View style={[styles.headerBar, { paddingTop: insets.top }]}>
          <View style={styles.headerLeftRow}>
            <Pressable style={styles.headerBackBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={18} color="#fff" />
            </Pressable>
            <Pressable style={styles.headerSearchBtn} onPress={() => router.push('/search')}>
              <Ionicons name="search" size={18} color="#fff" />
            </Pressable>
          </View>
          <View pointerEvents="none" style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle} numberOfLines={1}>{routeTitle(pathname || '')}</Text>
          </View>
          <View style={styles.headerRightGroup}>
            <Animated.View style={{ transform: [{ scale: cartScale }] }}>
              <Pressable style={styles.headerMiniIcon} onPress={() => router.push('/cart')}>
                <Ionicons name="cart-outline" size={34} color="#fff" />
                {cartCount > 0 ? <View style={styles.headerBadge}><Text style={styles.headerBadgeTxt}>{cartCount}</Text></View> : null}
              </Pressable>
            </Animated.View>
            <Pressable style={styles.headerMiniIcon} onPress={() => router.push('/profile')}>
              <Image source={profileUri ? { uri: profileUri } : require('../assets/images/mutton.jpg')} style={styles.headerAvatar} />
            </Pressable>
          </View>
        </View>
      ) : null}

      {showShell ? (
        <View style={[styles.bottomNav, { bottom: 10 + insets.bottom }]}>
          <Pressable style={styles.navItem} onPress={() => router.push('/home')}>
            <Text style={[styles.navText, pathname === '/home' && styles.navTextActive]}>Home</Text>
          </Pressable>
          <Pressable style={styles.navItem} onPress={() => router.push('/todays-menu')}>
            <Text style={[styles.navText, pathname === '/todays-menu' && styles.navTextActive]}>Today</Text>
          </Pressable>
          <Pressable
            style={styles.navItem}
            onPress={() => router.push((user?.role === 'ADMIN' ? '/admin/orders-management' : '/orders') as any)}
          >
            <Text
              style={[
                styles.navText,
                (pathname === '/orders' || pathname === '/order-history' || pathname === '/admin/orders-management') &&
                  styles.navTextActive,
              ]}
            >
              Orders
            </Text>
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
  const [statusBarHidden, setStatusBarHidden] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const startHideTimer = () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      setStatusBarHidden(false);
      hideTimerRef.current = setTimeout(() => {
        setStatusBarHidden(true);
      }, 10000);
    };

    startHideTimer();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') startHideTimer();
      else {
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        setStatusBarHidden(false);
      }
    });

    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      sub.remove();
    };
  }, []);

  return (
    <AuthProvider>
      <NotificationProvider>
        <CartProvider>
          <AuthGate>
            <StatusBar style="light" backgroundColor={COLORS.accent} translucent={false} hidden={statusBarHidden} />
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
  title: { fontSize: 20, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
  subtitle: { marginTop: 6, color: COLORS.muted, marginBottom: 16, textAlign: 'center' },
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  headerLeftRow: {
    position: 'absolute',
    left: 12,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerRightGroup: {
    position: 'absolute',
    right: 8,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  headerMiniIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBackBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  headerSearchBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  headerTitleWrap: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontWeight: '800', fontSize: 18, textAlign: 'center' },
  headerAvatar: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, borderColor: '#fff' },
  headerBadge: {
    position: 'absolute',
    top: 5,
    right: 4,
    backgroundColor: '#fff',
    borderRadius: 9,
    minWidth: 16,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  headerBadgeTxt: { color: COLORS.accent, fontSize: 10, fontWeight: '800' },
  bottomNav: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
    backgroundColor: '#fff',
    borderRadius: 18,
    minHeight: 54,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  navItem: { minWidth: 72, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 12, alignItems: 'center' },
  navText: { color: COLORS.muted, fontWeight: '700' },
  navTextActive: { color: COLORS.accent },
});
