import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../src/services/api';
import { COLORS } from '../src/config/appConfig';
import { useCart } from '../src/context/CartContext';
import { resolveImageUrl } from '../src/utils/images';
import { useAuth } from '../src/context/AuthContext';
import { useDebouncedValue } from '../src/hooks/useDebouncedValue';
import { hasMore, paginate } from '../src/utils/pagination';
import { BannerCarousel } from '../src/components/BannerCarousel';
import { AnimatedHeading } from '../src/components/AnimatedHeading';
import { AppTextInput as TextInput } from '../src/components/AppTextInput';
import { Skeleton } from '../src/components/Skeleton';
import { formatCurrency } from '../src/utils/format';
import { WeekDateStrip } from '../src/components/WeekDateStrip';
import { todayLocalDate } from '../src/utils/date';

const mergeMenusForDate = (menus: any[], date: string) => {
  const valid = (menus || []).filter((m) => Array.isArray(m?.items) && m.items.length);
  if (!valid.length) return null;
  if (valid.length === 1) return valid[0];

  const slotSet = new Set<string>();
  valid.forEach((m: any) =>
    String(m?.mealSlots || 'ALL')
      .split(',')
      .map((s: string) => s.trim().toUpperCase())
      .filter(Boolean)
      .forEach((s: string) => slotSet.add(s))
  );
  if (!slotSet.size) slotSet.add('ALL');

  return {
    id: `merged-${date}`,
    title: "Today's Menu",
    description: `Total menus: ${valid.length}`,
    scheduleDate: date,
    mealSlots: slotSet.has('ALL') ? 'ALL' : Array.from(slotSet).join(','),
    items: valid.flatMap((m: any) => (Array.isArray(m?.items) ? m.items : [])),
  };
};

export default function HomeScreen() {
  const [menu, setMenu] = useState<any>(null);
  const [banners, setBanners] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [selectedDate, setSelectedDate] = useState(todayLocalDate());
  const [selectedMealSlot, setSelectedMealSlot] = useState<'ALL' | 'BREAKFAST' | 'LUNCH' | 'DINNER'>('ALL');
  const [dateOverlayVisible, setDateOverlayVisible] = useState(false);
  const [next7Menus, setNext7Menus] = useState<any[]>([]);
  const [justAddedById, setJustAddedById] = useState<Record<string, boolean>>({});
  const debouncedQuery = useDebouncedValue(query, 350);
  const { addItem, setBooking } = useCart();
  const { user } = useAuth();
  const router = useRouter();

  const load = useCallback(async (asRefresh = false) => {
    if (asRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [dailyRes, bannersRes, next7Res] = await Promise.allSettled([api.dailyMenu(), api.banners(), api.next7Menus()]);
      if (dailyRes.status === 'fulfilled') {
        const dailyMenu = dailyRes.value || null;
        if (next7Res.status === 'fulfilled') {
          const upcoming = Array.isArray(next7Res.value) ? next7Res.value : [];
          const sameDateMenus = upcoming.filter(
            (m: any) => String(m?.scheduleDate || '') === selectedDate && Array.isArray(m?.items) && m.items.length
          );
          const mergedSameDate = mergeMenusForDate(sameDateMenus, selectedDate);
          if (mergedSameDate) {
            setMenu(mergedSameDate);
          } else {
          const exactSelected = upcoming.find((m: any) => m?.scheduleDate === selectedDate && Array.isArray(m?.items) && m.items.length);
          const firstWithItems = upcoming.find((m: any) => Array.isArray(m?.items) && m.items.length);
          if (exactSelected) {
            setMenu(exactSelected);
          } else if (dailyMenu && Array.isArray(dailyMenu.items) && dailyMenu.items.length) {
            setMenu(dailyMenu);
          } else {
            setMenu(firstWithItems || dailyMenu);
            if (firstWithItems?.scheduleDate && !asRefresh) setSelectedDate(firstWithItems.scheduleDate);
          }
          }
        } else {
          setMenu(dailyMenu && Array.isArray(dailyMenu.items) && dailyMenu.items.length ? dailyMenu : null);
        }
      } else {
        setMenu(null);
      }
      if (bannersRes.status === 'fulfilled') {
        setBanners(Array.isArray(bannersRes.value) ? bannersRes.value : []);
      } else {
        setBanners([]);
      }
      if (next7Res.status === 'fulfilled') {
        setNext7Menus(Array.isArray(next7Res.value) ? next7Res.value : []);
      } else {
        setNext7Menus([]);
      }
    } finally {
      if (asRefresh) setRefreshing(false);
      else setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    load(false).catch(() => setLoading(false));
  }, [load]);

  const filters = useMemo<string[]>(
    () => ['ALL', ...Array.from(new Set<string>((menu?.items || []).map((i: any) => String(i.category))))],
    [menu]
  );

  useEffect(() => {
    if (!filters.includes(activeFilter)) {
      setActiveFilter('ALL');
    }
  }, [filters, activeFilter]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, activeFilter]);

  const filteredItems = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    const menuSlots = String(menu?.mealSlots || 'ALL')
      .split(',')
      .map((s: string) => s.trim().toUpperCase())
      .filter(Boolean);
    const slotAllowed = selectedMealSlot === 'ALL' || menuSlots.includes('ALL') || menuSlots.includes(selectedMealSlot);
    if (!slotAllowed) return [];
    return (menu?.items || []).filter((i: any) => {
      const filterOk = activeFilter === 'ALL' || i.category === activeFilter;
      const name = String(i?.name || '').toLowerCase();
      const searchOk = !q || name.includes(q);
      return filterOk && searchOk;
    });
  }, [menu, debouncedQuery, activeFilter, selectedMealSlot]);

  const visibleItems = useMemo(() => paginate(filteredItems, page), [filteredItems, page]);
  const mealCards = [
    {
      key: 'breakfast',
      title: 'Breakfast',
      subtitle: 'Start your day fresh',
      time: '7:00 AM - 10:00 AM',
      bg: '#E84B1E',
      icon: 'cafe-outline' as const,
    },
    {
      key: 'lunch',
      title: 'Lunch',
      subtitle: 'Delicious midday meals',
      time: '12:00 PM - 3:00 PM',
      bg: '#7B5B51',
      icon: 'restaurant-outline' as const,
    },
    {
      key: 'dinner',
      title: 'Dinner',
      subtitle: 'End your day right',
      time: '7:00 PM - 10:00 PM',
      bg: '#7A6A2C',
      icon: 'moon-outline' as const,
    },
  ];
  const profileUri = resolveImageUrl(user?.profileImageUrl);
  const onAdd = (item: any) => {
    setBooking(selectedDate, selectedMealSlot);
    addItem({
      menuItemId: item.id,
      itemName: item.name,
      quantity: 1,
      unitPrice: Number(item.price),
      category: item.category,
      imageUrl: item.imageUrl,
    });
    const key = String(item.id);
    setJustAddedById((prev) => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setJustAddedById((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }, 1800);
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
    >
      {loading ? (
        <View style={styles.carouselSkelWrap}>
          <Skeleton style={styles.carouselSkel} />
        </View>
      ) : (
        <BannerCarousel banners={banners} />
      )}
      <View style={styles.topRow}>
        <Pressable style={styles.avatarButton} onPress={() => router.push('/profile')}>
          <Image source={profileUri ? { uri: profileUri } : require('../assets/images/mutton.jpg')} style={styles.avatar} />
        </Pressable>
        <TextInput value={query} onChangeText={setQuery} placeholder="Search" style={styles.searchBelow} />
        <Pressable style={styles.searchBtn} onPress={() => router.push('/search')}>
          <Ionicons name="search" size={19} color={COLORS.text} />
        </Pressable>
      </View>

      <View style={styles.slotRow}>
        {(['ALL', 'BREAKFAST', 'LUNCH', 'DINNER'] as const).map((slot) => (
          <Pressable
            key={slot}
            style={[styles.slotChip, selectedMealSlot === slot && styles.slotChipActive]}
            onPress={() => setSelectedMealSlot(slot)}
          >
            <Text style={[styles.slotChipTxt, selectedMealSlot === slot && styles.slotChipTxtActive]}>{slot}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.todayCard}>
        <View>
          <Text style={styles.todayTitle}>Today</Text>
          <Text style={styles.todaySub}>
            {new Date(`${selectedDate}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })}
          </Text>
        </View>
        <Pressable style={styles.todayChangeBtn} onPress={() => setDateOverlayVisible(true)}>
          <Text style={styles.todayChangeTxt}>Change</Text>
        </Pressable>
      </View>

      <Text style={styles.mealHeading}>What would you like to order?</Text>
      <Text style={styles.mealSub}>Choose a meal type for today</Text>
      {mealCards.map((meal) => (
        <Pressable
          key={meal.key}
          style={[styles.mealCard, { backgroundColor: meal.bg }]}
          onPress={() =>
            router.push({
              pathname: '/todays-menu',
              params: { slot: meal.key.toUpperCase(), date: selectedDate },
            })
          }
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.mealTitle}>{meal.title}</Text>
            <Text style={styles.mealDesc}>{meal.subtitle}</Text>
            <Text style={styles.mealTime}>{meal.time}</Text>
          </View>
          <View style={styles.mealIconWrap}>
            <Ionicons name={meal.icon} size={22} color="#fff" />
          </View>
          <Ionicons name="chevron-forward" size={18} color="#fff" />
        </Pressable>
      ))}

      <View style={styles.infoBanner}>
        <Text style={styles.infoText}>Fresh, homemade meals prepared with love. You can order meals up to 7 days in advance.</Text>
      </View>

      <View style={styles.menuHeadingRow}>
        <AnimatedHeading text={menu?.title || 'Today Menu'} />
        <Text style={styles.menuSlotTag}>({selectedMealSlot})</Text>
      </View>
      {loading
        ? Array.from({ length: 4 }).map((_, idx) => (
            <View key={`home-skeleton-${idx}`} style={styles.itemCard}>
              <Skeleton style={styles.itemImage} />
              <View style={{ flex: 1 }}>
                <Skeleton style={styles.skelTitle} />
                <Skeleton style={styles.skelLine} />
                <Skeleton style={styles.skelPrice} />
              </View>
              <Skeleton style={styles.skelBtn} />
            </View>
          ))
        : null}
      {visibleItems.map((item: any) => (
        <Pressable key={item.id} style={styles.itemCard} onPress={() => router.push({ pathname: '/item-details', params: { item: JSON.stringify(item) } })}>
          <Image
            source={resolveImageUrl(item.imageUrl) ? { uri: resolveImageUrl(item.imageUrl)! } : require('../assets/images/mutton.jpg')}
            style={styles.itemImage}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemDesc} numberOfLines={2}>{item.description}</Text>
            <Text style={styles.itemPrice}>{formatCurrency(Number(item.price || 0))}</Text>
          </View>
          <Pressable
            onPress={() => onAdd(item)}
            style={styles.addBtn}
          >
            {justAddedById[String(item.id)] ? (
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
            ) : (
              <Text style={{ color: '#fff', fontWeight: '700' }}>Add</Text>
            )}
          </Pressable>
        </Pressable>
      ))}

      {!loading && hasMore(filteredItems, page) ? (
        <Pressable style={styles.more} onPress={() => setPage((p) => p + 1)}>
          <Text style={styles.moreText}>Load More</Text>
        </Pressable>
      ) : null}

      <Modal visible={dateOverlayVisible} transparent animationType="fade" onRequestClose={() => setDateOverlayVisible(false)}>
        <View style={styles.overlayBackdrop}>
          <View style={styles.overlayCard}>
            <Text style={styles.overlayTitle}>Select Date (up to 7 days)</Text>
            <WeekDateStrip value={selectedDate} onChange={setSelectedDate} />
            <ScrollView style={{ maxHeight: 240, marginTop: 8 }}>
              {next7Menus.map((m) => (
                <Pressable
                  key={`menu-day-${m.id}`}
                  style={[styles.dayMenuCard, m.scheduleDate === selectedDate && styles.dayMenuCardActive]}
                  onPress={() => setSelectedDate(m.scheduleDate)}
                >
                  <Text style={styles.dayMenuTitle}>{m.title}</Text>
                  <Text style={styles.dayMenuMeta}>{m.scheduleDate} | {m.mealSlots || 'ALL'}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable style={styles.overlayBtn} onPress={() => setDateOverlayVisible(false)}>
              <Text style={styles.overlayBtnTxt}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, paddingBottom: 40 },
  topRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'center' },
  avatarButton: { marginRight: 8 },
  avatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: '#fff' },
  searchBelow: { flex: 1, backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11 },
  searchBtn: {
    width: 50,
    marginLeft: 8,
    borderRadius: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
  },
  chip: { backgroundColor: COLORS.chip, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8 },
  chipActive: { backgroundColor: COLORS.accentSoft },
  chipText: { fontWeight: '600', color: COLORS.text },
  chipTextActive: { color: COLORS.accent },
  slotRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  slotChip: { backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  slotChipActive: { backgroundColor: COLORS.accent },
  slotChipTxt: { color: COLORS.text, fontWeight: '700', fontSize: 12 },
  slotChipTxtActive: { color: '#fff' },
  todayCard: {
    backgroundColor: '#F5DCD0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  todayTitle: { color: COLORS.text, fontSize: 20, fontWeight: '800' },
  todaySub: { color: COLORS.muted, marginTop: 2, fontWeight: '600' },
  todayChangeBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  todayChangeTxt: { color: '#fff', fontWeight: '700' },
  mealHeading: { fontSize: 40, fontWeight: '900', color: COLORS.text, marginBottom: 4 },
  mealSub: { color: COLORS.muted, marginBottom: 12, fontWeight: '600' },
  mealCard: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mealTitle: { color: '#fff', fontSize: 34, fontWeight: '900' },
  mealDesc: { color: '#fff', opacity: 0.95, marginTop: 2 },
  mealTime: { color: '#fff', opacity: 0.95, marginTop: 6, fontWeight: '700' },
  mealIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginRight: 2,
  },
  infoBanner: { backgroundColor: '#F5DCD0', borderRadius: 12, padding: 12, marginBottom: 12 },
  infoText: { color: '#6F5750', fontWeight: '600' },
  menuHeadingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  menuSlotTag: { color: COLORS.muted, fontWeight: '700' },
  heading: { fontSize: 24, fontWeight: '900', marginVertical: 10, color: COLORS.text, textAlign: 'center' },
  itemCard: { backgroundColor: '#fff', borderRadius: 16, padding: 10, marginBottom: 12, flexDirection: 'row', alignItems: 'center' },
  itemImage: { width: 88, height: 88, borderRadius: 12, marginRight: 10 },
  itemName: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  itemDesc: { color: COLORS.muted, fontSize: 12, marginVertical: 3 },
  itemPrice: { fontWeight: '800', color: COLORS.accent },
  addBtn: { backgroundColor: COLORS.accent, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  carouselSkelWrap: { marginBottom: 16, borderRadius: 18, overflow: 'hidden', backgroundColor: '#fff' },
  carouselSkel: { width: '100%', height: 220 },
  skelTitle: { height: 16, borderRadius: 8, width: '62%', marginTop: 2 },
  skelLine: { height: 12, borderRadius: 8, width: '90%', marginTop: 8 },
  skelPrice: { height: 12, borderRadius: 8, width: '40%', marginTop: 8 },
  skelBtn: { width: 52, height: 32, borderRadius: 10 },
  more: { backgroundColor: '#fff', borderRadius: 10, alignItems: 'center', paddingVertical: 10, marginBottom: 10 },
  moreText: { color: COLORS.text, fontWeight: '700' },
  overlayBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.38)', justifyContent: 'center', padding: 14 },
  overlayCard: { backgroundColor: '#fff', borderRadius: 14, padding: 12 },
  overlayTitle: { fontWeight: '900', color: COLORS.text, textAlign: 'center', marginBottom: 6 },
  dayMenuCard: { borderRadius: 10, borderWidth: 1, borderColor: '#EEE', padding: 10, marginBottom: 8 },
  dayMenuCardActive: { borderColor: COLORS.accent, backgroundColor: COLORS.accentSoft },
  dayMenuTitle: { fontWeight: '800', color: COLORS.text },
  dayMenuMeta: { color: COLORS.muted, marginTop: 2, fontSize: 12 },
  overlayBtn: { marginTop: 8, borderRadius: 10, backgroundColor: COLORS.accent, alignItems: 'center', paddingVertical: 10 },
  overlayBtnTxt: { color: '#fff', fontWeight: '800' },
});
