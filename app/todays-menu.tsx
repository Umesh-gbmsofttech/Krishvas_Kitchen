import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS } from '../src/config/appConfig';
import { useDebouncedValue } from '../src/hooks/useDebouncedValue';
import { api } from '../src/services/api';
import { hasMore, paginate } from '../src/utils/pagination';
import { resolveImageUrl } from '../src/utils/images';
import { AppTextInput as TextInput } from '../src/components/AppTextInput';
import { Skeleton } from '../src/components/Skeleton';
import { formatCurrency } from '../src/utils/format';

const mergeMenusForDate = (menus: any[], date?: string) => {
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
    id: `merged-${date || 'today'}`,
    title: "Today's Menu",
    scheduleDate: date,
    mealSlots: slotSet.has('ALL') ? 'ALL' : Array.from(slotSet).join(','),
    items: valid.flatMap((m: any) => (Array.isArray(m?.items) ? m.items : [])),
  };
};

export default function TodaysMenuScreen() {
  const params = useLocalSearchParams<{ slot?: string; date?: string }>();
  const [menu, setMenu] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search, 350);
  const router = useRouter();
  const selectedSlot = String(params.slot || 'ALL').toUpperCase();
  const selectedDate = params.date ? String(params.date) : undefined;

  const load = useCallback(async (asRefresh = false) => {
    if (asRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [dailyByDate, dailyDefault, next7] = await Promise.all([
        selectedDate ? api.dailyMenu(selectedDate).catch(() => null) : Promise.resolve(null),
        api.dailyMenu().catch(() => null),
        api.next7Menus().catch(() => []),
      ]);
      const datePreferred = dailyByDate || dailyDefault;
      const primary = datePreferred || null;
      const upcoming = Array.isArray(next7) ? next7 : [];
      const dateKey = selectedDate || String(primary?.scheduleDate || '');
      const sameDateMenus = dateKey
        ? upcoming.filter((m: any) => String(m?.scheduleDate || '') === dateKey && Array.isArray(m?.items) && m.items.length)
        : [];
      const mergedSameDate = mergeMenusForDate(sameDateMenus, dateKey);
      if (mergedSameDate) {
        setMenu(mergedSameDate);
        return;
      }

      if (primary && Array.isArray(primary.items) && primary.items.length) {
        setMenu(primary);
        return;
      }

      const firstWithItems = upcoming.find((m: any) => Array.isArray(m?.items) && m.items.length);
      setMenu(firstWithItems || primary);
    } finally {
      if (asRefresh) setRefreshing(false);
      else setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    load(false).catch(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const filteredItems = useMemo(() => {
    const list = menu?.items || [];
    const q = debouncedSearch.trim().toLowerCase();
    const menuSlots = String(menu?.mealSlots || 'ALL')
      .split(',')
      .map((s: string) => s.trim().toUpperCase())
      .filter(Boolean);
    const slotAllowed = selectedSlot === 'ALL' || menuSlots.includes('ALL') || menuSlots.includes(selectedSlot);
    if (!slotAllowed) return [];

    const slotFiltered = list;
    if (!q) return slotFiltered;
    return slotFiltered.filter((i: any) => {
      const name = String(i?.name || '').toLowerCase();
      const category = String(i?.category || '').toLowerCase();
      return name.includes(q) || category.includes(q);
    });
  }, [menu, debouncedSearch, selectedSlot]);

  const visibleItems = useMemo(() => paginate(filteredItems, page), [filteredItems, page]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
    >
      <Text style={styles.title}>
        {menu?.title || "Today's Menu"} <Text style={styles.titleMeta}>({selectedSlot})</Text>
      </Text>
      <TextInput value={search} onChangeText={setSearch} placeholder="Search menu items" style={styles.search} />
      {loading
        ? Array.from({ length: 4 }).map((_, idx) => (
            <View key={`today-skeleton-${idx}`} style={styles.card}>
              <Skeleton style={styles.image} />
              <View style={{ flex: 1 }}>
                <Skeleton style={styles.skelTitle} />
                <Skeleton style={styles.skelLine} />
                <Skeleton style={styles.skelPrice} />
              </View>
            </View>
          ))
        : null}
      {!loading && !filteredItems.length ? <Text style={styles.empty}>No menu items available.</Text> : null}
      {visibleItems.map((item: any) => (
        <Pressable key={item.id} style={styles.card} onPress={() => router.push({ pathname: '/item-details', params: { item: JSON.stringify(item) } })}>
          <Image
            source={resolveImageUrl(item.imageUrl) ? { uri: resolveImageUrl(item.imageUrl)! } : require('../assets/images/mutton.jpg')}
            style={styles.image}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>{item.category}</Text>
            <Text style={styles.price}>{formatCurrency(Number(item.price || 0))}</Text>
          </View>
        </Pressable>
      ))}
      {!loading && hasMore(filteredItems, page) ? (
        <Pressable style={styles.more} onPress={() => setPage((p) => p + 1)}>
          <Text style={styles.moreText}>Load More</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, paddingBottom: 26 },
  title: { fontSize: 24, fontWeight: '900' , textAlign: 'center'},
  titleMeta: { fontSize: 13, color: COLORS.muted, fontWeight: '700' },
  search: { marginTop: 10, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11 },
  empty: { color: COLORS.muted, marginTop: 12 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 10, marginTop: 10, flexDirection: 'row', alignItems: 'center' },
  image: { width: 76, height: 76, borderRadius: 10, marginRight: 10 },
  name: { fontWeight: '800', fontSize: 15 },
  meta: { color: COLORS.muted, marginTop: 2 },
  price: { color: COLORS.accent, marginTop: 4, fontWeight: '700' },
  skelTitle: { height: 16, borderRadius: 8, width: '62%', marginTop: 2 },
  skelLine: { height: 12, borderRadius: 8, width: '84%', marginTop: 8 },
  skelPrice: { height: 12, borderRadius: 8, width: '40%', marginTop: 8 },
  more: { marginTop: 12, backgroundColor: '#fff', borderRadius: 10, alignItems: 'center', paddingVertical: 10 },
  moreText: { fontWeight: '700', color: COLORS.text },
});


